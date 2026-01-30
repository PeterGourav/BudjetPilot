import { SettingsAccent } from "@/constants/theme";
import { useBudgetContext } from "@/hooks/BudgetContext";
import {
    getFixedExpenses,
    saveFixedExpenses,
    type FixedExpense,
} from "@/services/database";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Keyboard,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const DEFAULT_EXPENSES = [
  { name: "Rent / Mortgage", amountMonthly: 0, enabled: true },
  { name: "Utilities", amountMonthly: 0, enabled: true },
  { name: "Internet", amountMonthly: 0, enabled: true },
  { name: "Phone", amountMonthly: 0, enabled: true },
  { name: "Insurance", amountMonthly: 0, enabled: true },
  { name: "Transport", amountMonthly: 0, enabled: true },
  { name: "Groceries", amountMonthly: 0, enabled: true },
];

export default function FixedScreen() {
  const params = useLocalSearchParams();
  const isEditMode = params.mode === "edit";
  const [expenses, setExpenses] = useState<FixedExpense[]>(DEFAULT_EXPENSES);
  const { refresh } = useBudgetContext();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");

  useEffect(() => {
    if (isEditMode) {
      loadExistingData();
    }
  }, [isEditMode]);

  const loadExistingData = async () => {
    const existing = await getFixedExpenses();
    if (existing && existing.length > 0) {
      setExpenses(existing);
    }
  };

  const toggleExpense = (index: number) => {
    const updated = [...expenses];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    setExpenses(updated);
  };

  const addCustomExpense = () => {
    setExpenses([
      ...expenses,
      { name: "Custom Expense", amountMonthly: 0, enabled: true },
    ]);
  };

  const removeExpense = (index: number) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter((_, i) => i !== index));
    }
  };

  const handleContinue = async () => {
    await saveFixedExpenses(expenses);
    await refresh();
    if (isEditMode) {
      router.back();
    } else {
      router.push("/onboarding/subscriptions");
    }
  };

  const openAmountEditor = (index: number) => {
    setEditingIndex(index);
    const current = expenses[index]?.amountMonthly ?? 0;
    setEditAmount(current === 0 ? "" : current.toString());
  };

  const handleConfirmEdit = async () => {
    if (editingIndex === null) return;

    const cleaned = editAmount.replace(/[^0-9.]/g, "");
    const value = parseFloat(cleaned);

    const updated = [...expenses];
    updated[editingIndex] = {
      ...updated[editingIndex],
      amountMonthly: isNaN(value) ? 0 : value,
    };

    setExpenses(updated);
    setEditingIndex(null);
    setEditAmount("");
    Keyboard.dismiss();

    if (isEditMode) {
      await saveFixedExpenses(updated);
      await refresh();
    }
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 px-6 pt-12">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold mb-2">
              Fixed Essentials
            </Text>
            <Text className="text-white opacity-60">
              {isEditMode
                ? "Edit your fixed expenses"
                : "Add the expenses that must be paid every month."}
            </Text>
          </View>
          {isEditMode && (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View className="gap-3 mb-6">
          {expenses.map((expense, index) => (
            <View
              key={index}
              style={{
                borderRadius: 16,
                padding: 16,
                borderWidth: 2,
                borderColor: SettingsAccent,
                backgroundColor: "transparent",
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <TouchableOpacity
                    onPress={() => {
                      toggleExpense(index);
                      if (isEditMode) {
                        const u = [...expenses];
                        u[index] = { ...u[index], enabled: !u[index].enabled };
                        saveFixedExpenses(u).then(refresh);
                      }
                    }}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: expense.enabled ? SettingsAccent : "#9ca3af",
                      backgroundColor: expense.enabled
                        ? SettingsAccent
                        : "transparent",
                      marginRight: 12,
                    }}
                  >
                    {expense.enabled && (
                      <Ionicons name="checkmark" size={16} color="#000" />
                    )}
                  </TouchableOpacity>
                  <Text className="text-white font-semibold flex-1">
                    {expense.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    removeExpense(index);
                    if (isEditMode && expenses.length > 1) {
                      const u = expenses.filter((_, i) => i !== index);
                      saveFixedExpenses(u).then(refresh);
                    }
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => openAmountEditor(index)}
                activeOpacity={0.8}
                style={{
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 2,
                  borderColor: SettingsAccent,
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                }}
              >
                <Text className="text-white text-xs mb-1 opacity-80">
                  Amount / month
                </Text>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Text style={{ color: SettingsAccent, fontSize: 18 }}>
                      $
                    </Text>
                    <Text style={{ color: SettingsAccent, fontSize: 18 }}>
                      {expense.amountMonthly.toFixed(2)}
                    </Text>
                  </View>
                  <Ionicons name="pencil" size={18} color={SettingsAccent} />
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={addCustomExpense}
          style={{
            borderRadius: 16,
            padding: 16,
            alignItems: "center",
            marginBottom: 24,
            borderWidth: 2,
            borderColor: SettingsAccent,
            backgroundColor: "transparent",
          }}
        >
          <View className="flex-row items-center">
            <Ionicons name="add" size={24} color={SettingsAccent} />
            <Text
              style={{
                color: SettingsAccent,
                fontSize: 18,
                fontWeight: "600",
                marginLeft: 8,
              }}
            >
              Add another fixed expense
            </Text>
          </View>
        </TouchableOpacity>

        {!isEditMode && (
          <TouchableOpacity
            onPress={handleContinue}
            style={{
              backgroundColor: SettingsAccent,
              borderRadius: 16,
              padding: 16,
              alignItems: "center",
              marginBottom: 32,
            }}
          >
            <Text className="text-black text-lg font-bold">Continue</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={editingIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setEditingIndex(null);
          setEditAmount("");
          Keyboard.dismiss();
        }}
      >
        <View className="flex-1 bg-black/60 items-center justify-center">
          <View className="w-11/12 bg-white rounded-3xl p-6">
            {editingIndex !== null && (
              <>
                <Text className="text-black text-lg font-semibold mb-1">
                  {expenses[editingIndex]?.name}
                </Text>
                <Text className="text-black opacity-60 mb-4">
                  Set your monthly amount
                </Text>
              </>
            )}
            <View className="bg-gray-100 rounded-2xl px-4 py-3 mb-6 flex-row items-center">
              <Text className="text-black text-2xl mr-1">$</Text>
              <TextInput
                value={editAmount}
                onChangeText={setEditAmount}
                placeholder="0.00"
                keyboardType="numeric"
                style={{ color: "#000", fontSize: 24, flex: 1 }}
                placeholderTextColor="#9ca3af"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleConfirmEdit}
              />
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setEditingIndex(null);
                  setEditAmount("");
                  Keyboard.dismiss();
                }}
                className="flex-1 bg-gray-200 rounded-2xl p-4 items-center"
              >
                <Text className="text-black font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmEdit}
                style={{
                  flex: 1,
                  backgroundColor: SettingsAccent,
                  borderRadius: 16,
                  padding: 16,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="checkmark" size={20} color="#000" />
                <Text className="text-black font-semibold ml-2">Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
