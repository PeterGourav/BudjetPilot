import { useBudgetContext } from "@/hooks/BudgetContext";
import { getDebts, saveDebts, type Debt } from "@/services/database";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const DEBT_TYPES: Debt["debtType"][] = [
  "Credit Card",
  "Student Loan",
  "Car Loan",
  "Personal Loan",
  "Other",
];

const PAYOFF_GOALS: Debt["payoffGoal"][] = [
  "ASAP",
  "6mo",
  "12mo",
  "24mo",
  "customDate",
];

export default function DebtScreen() {
  const params = useLocalSearchParams();
  const isEditMode = params.mode === "edit";
  const [hasDebt, setHasDebt] = useState(false);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { refresh } = useBudgetContext();

  useEffect(() => {
    if (isEditMode) {
      loadExistingData();
    }
  }, [isEditMode]);

  const loadExistingData = async () => {
    const existing = await getDebts();
    if (existing && existing.length > 0) {
      setHasDebt(true);
      setDebts(existing);
    }
  };

  const [debtType, setDebtType] = useState<Debt["debtType"]>("Credit Card");
  const [balance, setBalance] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [payoffGoal, setPayoffGoal] = useState<Debt["payoffGoal"]>("ASAP");
  const [customPayoffDate, setCustomPayoffDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const resetForm = () => {
    setDebtType("Credit Card");
    setBalance("");
    setMinPayment("");
    setDueDay("");
    setPayoffGoal("ASAP");
    setCustomPayoffDate(new Date());
  };

  const handleAddDebt = () => {
    const debt: Debt = {
      debtType,
      balance: parseFloat(balance) || 0,
      minPaymentMonthly: parseFloat(minPayment) || 0,
      dueDayOfMonth: dueDay ? parseInt(dueDay) : undefined,
      payoffGoal,
      customPayoffDate:
        payoffGoal === "customDate"
          ? customPayoffDate.toISOString()
          : undefined,
    };

    if (editingIndex !== null) {
      const updated = [...debts];
      updated[editingIndex] = debt;
      setDebts(updated);
      setEditingIndex(null);
    } else {
      setDebts([...debts, debt]);
    }

    resetForm();
    setShowAddModal(false);
  };

  const handleEdit = (index: number) => {
    const debt = debts[index];
    setDebtType(debt.debtType);
    setBalance(debt.balance.toString());
    setMinPayment(debt.minPaymentMonthly.toString());
    setDueDay(debt.dueDayOfMonth?.toString() || "");
    setPayoffGoal(debt.payoffGoal || "ASAP");
    setCustomPayoffDate(
      debt.customPayoffDate ? new Date(debt.customPayoffDate) : new Date(),
    );
    setEditingIndex(index);
    setShowAddModal(true);
  };

  const handleRemove = (index: number) => {
    setDebts(debts.filter((_, i) => i !== index));
  };

  const handleContinue = async () => {
    if (hasDebt && debts.length === 0) {
      alert('Please add at least one debt or select "No"');
      return;
    }

    await saveDebts(hasDebt ? debts : []);
    await refresh();
    if (isEditMode) {
      router.back();
    } else {
      router.push("/onboarding/summary");
    }
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 px-6 pt-12">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold mb-2">
              Debt Setup
            </Text>
            <Text className="text-white opacity-60">
              {isEditMode
                ? "Edit your debt information"
                : "Do you have debt you want to pay down?"}
            </Text>
          </View>
          {isEditMode && (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View className="gap-4 mb-6">
          <TouchableOpacity
            onPress={() => {
              setHasDebt(true);
              if (debts.length === 0) {
                setShowAddModal(true);
              }
            }}
            className={`rounded-2xl p-4 ${hasDebt ? "bg-white" : "bg-gray-800"}`}
          >
            <Text
              className={`text-lg font-semibold ${hasDebt ? "text-black" : "text-white"}`}
            >
              Yes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setHasDebt(false);
              setDebts([]);
            }}
            className={`rounded-2xl p-4 ${!hasDebt ? "bg-white" : "bg-gray-800"}`}
          >
            <Text
              className={`text-lg font-semibold ${!hasDebt ? "text-black" : "text-white"}`}
            >
              No
            </Text>
          </TouchableOpacity>
        </View>

        {hasDebt && (
          <View className="mb-6">
            {debts.map((debt, index) => (
              <View key={index} className="bg-white rounded-2xl p-4 mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-black font-bold text-lg">
                    {debt.debtType}
                  </Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity onPress={() => handleEdit(index)}>
                      <Ionicons name="pencil" size={20} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRemove(index)}>
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text className="text-black opacity-60">
                  Balance: ${debt.balance.toFixed(2)}
                </Text>
                <Text className="text-black opacity-60">
                  Min Payment: ${debt.minPaymentMonthly.toFixed(2)}/month
                </Text>
                {debt.payoffGoal && (
                  <Text className="text-black opacity-60">
                    Goal: {debt.payoffGoal}
                  </Text>
                )}
              </View>
            ))}

            <TouchableOpacity
              onPress={() => {
                resetForm();
                setEditingIndex(null);
                setShowAddModal(true);
              }}
              className="bg-gray-800 rounded-2xl p-4 items-center"
            >
              <Text className="text-white text-lg font-semibold">Add Debt</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row gap-3 mb-8">
          <TouchableOpacity
            onPress={() => router.push("/onboarding/summary")}
            className="flex-1 bg-gray-800 rounded-2xl p-4 items-center"
          >
            <Text className="text-white text-lg font-semibold">Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleContinue}
            className="flex-1 bg-white rounded-2xl p-4 items-center"
          >
            <Text className="text-black text-lg font-bold">Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <ScrollView className="bg-black rounded-t-3xl p-6 max-h-[80%]">
            <Text className="text-white text-xl font-bold mb-4">
              {editingIndex !== null ? "Edit Debt" : "Add Debt"}
            </Text>

            <View className="mb-4">
              <Text className="text-white mb-2">Debt Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {DEBT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setDebtType(type)}
                      className={`rounded-xl px-4 py-2 ${
                        debtType === type ? "bg-white" : "bg-gray-800"
                      }`}
                    >
                      <Text
                        className={
                          debtType === type ? "text-black" : "text-white"
                        }
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View className="mb-4">
              <Text className="text-white mb-2">Balance *</Text>
              <View className="bg-white rounded-2xl p-4">
                <TextInput
                  value={balance}
                  onChangeText={setBalance}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{ color: "#000" }}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-white mb-2">Min Payment Monthly *</Text>
              <View className="bg-white rounded-2xl p-4">
                <TextInput
                  value={minPayment}
                  onChangeText={setMinPayment}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{ color: "#000" }}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-white mb-2">
                Due Day of Month (Optional)
              </Text>
              <View className="bg-white rounded-2xl p-4">
                <TextInput
                  value={dueDay}
                  onChangeText={setDueDay}
                  placeholder="1-28"
                  keyboardType="numeric"
                  style={{ color: "#000" }}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-white mb-2">Payoff Goal</Text>
              <View className="flex-row flex-wrap gap-2">
                {PAYOFF_GOALS.map((goal) => (
                  <TouchableOpacity
                    key={goal}
                    onPress={() => setPayoffGoal(goal)}
                    className={`rounded-xl px-4 py-2 ${
                      payoffGoal === goal ? "bg-white" : "bg-gray-800"
                    }`}
                  >
                    <Text
                      className={
                        payoffGoal === goal ? "text-black" : "text-white"
                      }
                    >
                      {goal === "customDate" ? "Custom Date" : goal}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {payoffGoal === "customDate" && (
              <View className="mb-4">
                <Text className="text-white mb-2">Custom Payoff Date</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="bg-white rounded-2xl p-4"
                >
                  <Text className="text-black">
                    {customPayoffDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={customPayoffDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      if (Platform.OS === "android") {
                        setShowDatePicker(false);
                      }
                      if (date) setCustomPayoffDate(date);
                    }}
                  />
                )}
              </View>
            )}

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="flex-1 bg-gray-800 rounded-2xl p-4 items-center"
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddDebt}
                className="flex-1 bg-white rounded-2xl p-4 items-center"
              >
                <Text className="text-black font-semibold">Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
