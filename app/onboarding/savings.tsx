import { SettingsAccent } from "@/constants/theme";
import { useBudgetContext } from "@/hooks/BudgetContext";
import {
    getSavingsGoal,
    saveSavingsGoal,
    type SavingsGoal,
} from "@/services/database";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

function buildSavingsData(
  enabled: boolean,
  savingsType: "Emergency" | "Goal" | "Both",
  savingsMode: "fixedAmount" | "percent",
  savingsValue: string,
  goalName: string,
): SavingsGoal {
  return {
    enabled,
    savingsType: enabled ? savingsType : undefined,
    savingsMode: enabled ? savingsMode : undefined,
    savingsValue: enabled ? parseFloat(savingsValue) : undefined,
    goalName: enabled && goalName ? goalName : undefined,
  };
}

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
      if (existing.savingsType) setSavingsType(existing.savingsType);
      if (existing.savingsMode) setSavingsMode(existing.savingsMode);
      if (existing.savingsValue) {
        setSavingsValue(existing.savingsValue.toString());
      }
      if (existing.goalName) setGoalName(existing.goalName);
    }
  };

  const saveAndRefresh = useCallback(
    async (data: SavingsGoal) => {
      await saveSavingsGoal(data);
      await refresh();
    },
    [refresh],
  );

  const applyChange = useCallback(
    (data: SavingsGoal) => {
      if (isEditMode) saveAndRefresh(data);
    },
    [isEditMode, saveAndRefresh],
  );

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
    const data = buildSavingsData(
      enabled,
      savingsType,
      savingsMode,
      savingsValue,
      goalName,
    );
    await saveSavingsGoal(data);
    await refresh();
    router.push("/onboarding/debt");
  };

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
            onPress={() => {
              setEnabled(true);
              applyChange(
                buildSavingsData(
                  true,
                  savingsType,
                  savingsMode,
                  savingsValue,
                  goalName,
                ),
              );
            }}
            style={{
              ...cardStyle,
              backgroundColor: enabled ? SettingsAccent : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: enabled ? "#000" : "#fff",
              }}
            >
              Yes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setEnabled(false);
              applyChange(
                buildSavingsData(
                  false,
                  savingsType,
                  savingsMode,
                  savingsValue,
                  goalName,
                ),
              );
            }}
            style={{
              ...cardStyle,
              backgroundColor: !enabled ? SettingsAccent : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: !enabled ? "#000" : "#fff",
              }}
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
                    onPress={() => {
                      setSavingsType(type);
                      applyChange(
                        buildSavingsData(
                          true,
                          type,
                          savingsMode,
                          savingsValue,
                          goalName,
                        ),
                      );
                    }}
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      padding: 12,
                      backgroundColor:
                        savingsType === type ? SettingsAccent : "transparent",
                      borderWidth: 2,
                      borderColor: SettingsAccent,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color: savingsType === type ? "#000" : "#fff",
                      }}
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
                    onPress={() => {
                      setSavingsMode(mode);
                      applyChange(
                        buildSavingsData(
                          true,
                          savingsType,
                          mode,
                          savingsValue,
                          goalName,
                        ),
                      );
                    }}
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      padding: 12,
                      backgroundColor:
                        savingsMode === mode ? SettingsAccent : "transparent",
                      borderWidth: 2,
                      borderColor: SettingsAccent,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color: savingsMode === mode ? "#000" : "#fff",
                      }}
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
              <View style={inputStyle}>
                <TextInput
                  value={savingsValue}
                  onChangeText={setSavingsValue}
                  onBlur={() =>
                    applyChange(
                      buildSavingsData(
                        true,
                        savingsType,
                        savingsMode,
                        savingsValue,
                        goalName,
                      ),
                    )
                  }
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{ color: "#fff", fontSize: 20 }}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
              </View>
            </View>

            <View>
              <Text className="text-white font-semibold mb-3">
                Goal Name (Optional)
              </Text>
              <View style={inputStyle}>
                <TextInput
                  value={goalName}
                  onChangeText={setGoalName}
                  onBlur={() =>
                    applyChange(
                      buildSavingsData(
                        true,
                        savingsType,
                        savingsMode,
                        savingsValue,
                        goalName,
                      ),
                    )
                  }
                  placeholder="Trip, Down payment, etc."
                  style={{ color: "#fff" }}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
              </View>
            </View>
          </View>
        )}

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
    </View>
  );
}
