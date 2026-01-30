import { SettingsAccent } from "@/constants/theme";
import { useBudgetContext } from "@/hooks/BudgetContext";
import { getDebts, saveDebts, type Debt } from "@/services/database";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

const cardStyle = {
  borderRadius: 16,
  padding: 16,
  borderWidth: 2,
  borderColor: SettingsAccent,
  backgroundColor: "transparent" as const,
};

const inputStyle = {
  borderRadius: 16,
  padding: 16,
  borderWidth: 2,
  borderColor: SettingsAccent,
  backgroundColor: "transparent" as const,
};

export default function DebtScreen() {
  const params = useLocalSearchParams();
  const isEditMode = params.mode === "edit";
  const [hasDebt, setHasDebt] = useState(false);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { refresh } = useBudgetContext();

  const [debtType, setDebtType] = useState<Debt["debtType"]>("Credit Card");
  const [balance, setBalance] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [payoffGoal, setPayoffGoal] = useState<Debt["payoffGoal"]>("ASAP");
  const [customPayoffDate, setCustomPayoffDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const saveAndRefresh = useCallback(
    async (list: Debt[]) => {
      await saveDebts(list);
      await refresh();
    },
    [refresh],
  );

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

    let next: Debt[];
    if (editingIndex !== null) {
      next = [...debts];
      next[editingIndex] = debt;
      setEditingIndex(null);
    } else {
      next = [...debts, debt];
    }
    setDebts(next);
    resetForm();
    setShowAddModal(false);
    if (isEditMode) {
      saveAndRefresh(next);
    }
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
    const next = debts.filter((_, i) => i !== index);
    setDebts(next);
    if (isEditMode) {
      saveAndRefresh(next);
    }
  };

  const handleContinue = async () => {
    if (hasDebt && debts.length === 0) {
      alert('Please add at least one debt or select "No"');
      return;
    }
    await saveDebts(hasDebt ? debts : []);
    await refresh();
    router.push("/onboarding/summary");
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
              if (debts.length === 0) setShowAddModal(true);
              if (isEditMode) saveAndRefresh(debts);
            }}
            style={{
              ...cardStyle,
              backgroundColor: hasDebt ? SettingsAccent : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: hasDebt ? "#000" : "#fff",
              }}
            >
              Yes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setHasDebt(false);
              setDebts([]);
              if (isEditMode) saveAndRefresh([]);
            }}
            style={{
              ...cardStyle,
              backgroundColor: !hasDebt ? SettingsAccent : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: !hasDebt ? "#000" : "#fff",
              }}
            >
              No
            </Text>
          </TouchableOpacity>
        </View>

        {hasDebt && (
          <View className="mb-6">
            {debts.map((debt, index) => (
              <View key={index} style={{ ...cardStyle, marginBottom: 12 }}>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-white font-bold text-lg">
                    {debt.debtType}
                  </Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity onPress={() => handleEdit(index)}>
                      <Ionicons
                        name="pencil"
                        size={20}
                        color={SettingsAccent}
                      />
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
                <Text style={{ color: SettingsAccent, opacity: 0.9 }}>
                  Balance: ${debt.balance.toFixed(2)}
                </Text>
                <Text style={{ color: SettingsAccent, opacity: 0.9 }}>
                  Min Payment: ${debt.minPaymentMonthly.toFixed(2)}/month
                </Text>
                {debt.payoffGoal && (
                  <Text style={{ color: SettingsAccent, opacity: 0.9 }}>
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
              style={{
                ...cardStyle,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: SettingsAccent,
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                Add Debt
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!isEditMode && (
          <View className="flex-row gap-3 mb-8">
            <TouchableOpacity
              onPress={() => router.push("/onboarding/summary")}
              style={{
                flex: 1,
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
                borderWidth: 2,
                borderColor: SettingsAccent,
                backgroundColor: "transparent",
              }}
            >
              <Text
                style={{
                  color: SettingsAccent,
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                Skip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleContinue}
              style={{
                flex: 1,
                backgroundColor: SettingsAccent,
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text className="text-black text-lg font-bold">Continue</Text>
            </TouchableOpacity>
          </View>
        )}
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
        <View className="flex-1 bg-black/60 justify-end">
          <ScrollView
            style={{
              backgroundColor: "#111",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: "80%",
              borderTopWidth: 2,
              borderColor: SettingsAccent,
            }}
          >
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
                      style={{
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        backgroundColor:
                          debtType === type ? SettingsAccent : "transparent",
                        borderWidth: 2,
                        borderColor: SettingsAccent,
                      }}
                    >
                      <Text
                        style={{
                          color: debtType === type ? "#000" : "#fff",
                        }}
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
              <View style={inputStyle}>
                <TextInput
                  value={balance}
                  onChangeText={setBalance}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{ color: "#fff" }}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-white mb-2">Min Payment Monthly *</Text>
              <View style={inputStyle}>
                <TextInput
                  value={minPayment}
                  onChangeText={setMinPayment}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{ color: "#fff" }}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-white mb-2">
                Due Day of Month (Optional)
              </Text>
              <View style={inputStyle}>
                <TextInput
                  value={dueDay}
                  onChangeText={setDueDay}
                  placeholder="1-28"
                  keyboardType="numeric"
                  style={{ color: "#fff" }}
                  placeholderTextColor="rgba(255,255,255,0.5)"
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
                    style={{
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      backgroundColor:
                        payoffGoal === goal ? SettingsAccent : "transparent",
                      borderWidth: 2,
                      borderColor: SettingsAccent,
                    }}
                  >
                    <Text
                      style={{
                        color: payoffGoal === goal ? "#000" : "#fff",
                      }}
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
                  style={inputStyle}
                >
                  <Text style={{ color: "#fff" }}>
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
                style={{
                  flex: 1,
                  borderRadius: 16,
                  padding: 16,
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: SettingsAccent,
                  backgroundColor: "transparent",
                }}
              >
                <Text style={{ color: SettingsAccent, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddDebt}
                style={{
                  flex: 1,
                  backgroundColor: SettingsAccent,
                  borderRadius: 16,
                  padding: 16,
                  alignItems: "center",
                }}
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
