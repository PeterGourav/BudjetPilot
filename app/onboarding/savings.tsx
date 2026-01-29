import { useBudgetContext } from "@/hooks/BudgetContext";
import {
  getSavingsGoal,
  saveSavingsGoal,
  type SavingsGoal,
} from "@/services/database";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function SavingsScreen() {
  const params = useLocalSearchParams();
  const isEditMode = params.mode === "edit";
  const [enabled, setEnabled] = useState(false);
  const [savingsType, setSavingsType] = useState<"Emergency" | "Goal" | "Both">(
    "Emergency",
  );
  const [savingsMode, setSavingsMode] = useState<"fixedAmount" | "percent">(
    "fixedAmount",
  );
  const [savingsValue, setSavingsValue] = useState("");
  const [goalName, setGoalName] = useState("");
  const { refresh } = useBudgetContext();

  useEffect(() => {
    if (isEditMode) {
      loadExistingData();
    }
  }, [isEditMode]);

  const loadExistingData = async () => {
    const existing = await getSavingsGoal();
    if (existing) {
      setEnabled(existing.enabled);
      if (existing.savingsType) {
        setSavingsType(existing.savingsType);
      }
      if (existing.savingsMode) {
        setSavingsMode(existing.savingsMode);
      }
      if (existing.savingsValue) {
        setSavingsValue(existing.savingsValue.toString());
      }
      if (existing.goalName) {
        setGoalName(existing.goalName);
      }
    }
  };

  const handleContinue = async () => {
    if (enabled) {
      const value = parseFloat(savingsValue);
      if (isNaN(value) || value < 0) {
        alert("Please enter a valid savings amount");
        return;
      }
      if (savingsMode === "percent" && (value < 0 || value > 50)) {
        alert("Percentage must be between 0 and 50");
        return;
      }
    }

    const data: SavingsGoal = {
      enabled,
      savingsType: enabled ? savingsType : undefined,
      savingsMode: enabled ? savingsMode : undefined,
      savingsValue: enabled ? parseFloat(savingsValue) : undefined,
      goalName: enabled && goalName ? goalName : undefined,
    };

    await saveSavingsGoal(data);
    await refresh();
    if (isEditMode) {
      router.back();
    } else {
      router.push("/onboarding/debt");
    }
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 px-6 pt-12">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold mb-2">
              Savings Goal
            </Text>
            <Text className="text-white opacity-60">
              {isEditMode
                ? "Edit your savings plan"
                : "Do you want to save automatically?"}
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
            onPress={() => setEnabled(true)}
            className={`rounded-2xl p-4 ${
              enabled ? "bg-white" : "bg-gray-800"
            }`}
          >
            <Text
              className={`text-lg font-semibold ${
                enabled ? "text-black" : "text-white"
              }`}
            >
              Yes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setEnabled(false)}
            className={`rounded-2xl p-4 ${
              !enabled ? "bg-white" : "bg-gray-800"
            }`}
          >
            <Text
              className={`text-lg font-semibold ${
                !enabled ? "text-black" : "text-white"
              }`}
            >
              Not right now
            </Text>
          </TouchableOpacity>
        </View>

        {enabled && (
          <View className="gap-4 mb-6">
            <View>
              <Text className="text-white font-semibold mb-3">
                Savings Type
              </Text>
              <View className="flex-row gap-3">
                {(["Emergency", "Goal", "Both"] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSavingsType(type)}
                    className={`flex-1 rounded-xl p-3 ${
                      savingsType === type ? "bg-white" : "bg-gray-800"
                    }`}
                  >
                    <Text
                      className={`text-center ${
                        savingsType === type ? "text-black" : "text-white"
                      }`}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-white font-semibold mb-3">
                Savings Mode
              </Text>
              <View className="flex-row gap-3">
                {(["fixedAmount", "percent"] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setSavingsMode(mode)}
                    className={`flex-1 rounded-xl p-3 ${
                      savingsMode === mode ? "bg-white" : "bg-gray-800"
                    }`}
                  >
                    <Text
                      className={`text-center ${
                        savingsMode === mode ? "text-black" : "text-white"
                      }`}
                    >
                      {mode === "fixedAmount" ? "Fixed Amount" : "Percentage"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-white font-semibold mb-3">
                {savingsMode === "fixedAmount"
                  ? "Amount"
                  : "Percentage (0-50%)"}
              </Text>
              <View className="bg-white rounded-2xl p-4">
                <TextInput
                  value={savingsValue}
                  onChangeText={setSavingsValue}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{ color: "#000", fontSize: 20 }}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View>
              <Text className="text-white font-semibold mb-3">
                Goal Name (Optional)
              </Text>
              <View className="bg-white rounded-2xl p-4">
                <TextInput
                  value={goalName}
                  onChangeText={setGoalName}
                  placeholder="Trip, Down payment, etc."
                  style={{ color: "#000" }}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={handleContinue}
          className="bg-white rounded-2xl p-4 items-center mb-8"
        >
          <Text className="text-black text-lg font-bold">Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
