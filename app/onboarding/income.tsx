import { SettingsAccent } from "@/constants/theme";
import { useBudgetContext } from "@/hooks/BudgetContext";
import {
    getIncomeData,
    saveIncomeData,
    type IncomeData,
} from "@/services/database";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

function buildIncomeData(
  payFrequency: "weekly" | "biweekly" | "monthly",
  netPayAmount: string,
  nextPayDate: Date,
  irregularIncomeEnabled: boolean,
  irregularMonthlyAvg: string,
  irregularReliability: "low" | "medium" | "high",
): IncomeData | null {
  const amount = parseFloat(netPayAmount);
  if (isNaN(amount) || amount <= 0) return null;
  const payDate = new Date(nextPayDate);
  payDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (payDate < today) return null;
  return {
    payFrequency,
    netPayAmount: amount,
    nextPayDate: nextPayDate.toISOString(),
    irregularIncomeEnabled,
    irregularMonthlyAvg:
      irregularIncomeEnabled && irregularMonthlyAvg
        ? parseFloat(irregularMonthlyAvg)
        : undefined,
    irregularReliability: irregularIncomeEnabled
      ? irregularReliability
      : undefined,
  };
}

export default function IncomeScreen() {
  const params = useLocalSearchParams();
  const isEditMode = params.mode === "edit";
  const { refresh } = useBudgetContext();
  const [payFrequency, setPayFrequency] = useState<
    "weekly" | "biweekly" | "monthly"
  >("monthly");
  const [netPayAmount, setNetPayAmount] = useState("");
  const [nextPayDate, setNextPayDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [irregularIncomeEnabled, setIrregularIncomeEnabled] = useState(false);
  const [irregularMonthlyAvg, setIrregularMonthlyAvg] = useState("");
  const [irregularReliability, setIrregularReliability] = useState<
    "low" | "medium" | "high"
  >("medium");

  useEffect(() => {
    if (isEditMode) {
      loadExistingData();
    }
  }, [isEditMode]);

  const loadExistingData = async () => {
    const existing = await getIncomeData();
    if (existing) {
      setPayFrequency(existing.payFrequency);
      setNetPayAmount(existing.netPayAmount.toString());
      setNextPayDate(new Date(existing.nextPayDate));
      setIrregularIncomeEnabled(existing.irregularIncomeEnabled);
      if (existing.irregularMonthlyAvg) {
        setIrregularMonthlyAvg(existing.irregularMonthlyAvg.toString());
      }
      if (existing.irregularReliability) {
        setIrregularReliability(existing.irregularReliability);
      }
    }
  };

  const saveAndRefresh = useCallback(
    async (data: IncomeData) => {
      await saveIncomeData(data);
      await refresh();
    },
    [refresh],
  );

  const handleContinue = async () => {
    const data = buildIncomeData(
      payFrequency,
      netPayAmount,
      nextPayDate,
      irregularIncomeEnabled,
      irregularMonthlyAvg,
      irregularReliability,
    );
    if (!data) {
      if (parseFloat(netPayAmount) <= 0 || isNaN(parseFloat(netPayAmount))) {
        alert("Please enter a valid net pay amount");
      } else {
        alert("Next pay date must be today or later");
      }
      return;
    }
    await saveIncomeData(data);
    await refresh();
    router.push("/onboarding/fixed");
  };

  const saveIfEdit = useCallback(
    async (data: IncomeData | null) => {
      if (isEditMode && data) await saveAndRefresh(data);
    },
    [isEditMode, saveAndRefresh],
  );

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 px-6 pt-12">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold mb-2">
              Income Setup
            </Text>
            <Text className="text-white opacity-60">
              Tell us about your income
            </Text>
          </View>
          {isEditMode && (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View className="mb-6">
          <Text className="text-white font-semibold mb-3">Pay Frequency *</Text>
          <View className="flex-row gap-3">
            {(["weekly", "biweekly", "monthly"] as const).map((freq) => (
              <TouchableOpacity
                key={freq}
                onPress={() => {
                  setPayFrequency(freq);
                  const data = buildIncomeData(
                    freq,
                    netPayAmount,
                    nextPayDate,
                    irregularIncomeEnabled,
                    irregularMonthlyAvg,
                    irregularReliability,
                  );
                  saveIfEdit(data ?? null);
                }}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  padding: 16,
                  backgroundColor:
                    payFrequency === freq ? SettingsAccent : "transparent",
                  borderWidth: 2,
                  borderColor:
                    payFrequency === freq ? SettingsAccent : SettingsAccent,
                  opacity: payFrequency === freq ? 1 : 0.6,
                }}
              >
                <Text
                  className="text-center font-semibold"
                  style={{
                    color: payFrequency === freq ? "#000" : "#fff",
                  }}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-white font-semibold mb-3">
            Net Pay Amount *
          </Text>
          <View
            style={{
              borderRadius: 16,
              padding: 16,
              borderWidth: 2,
              borderColor: SettingsAccent,
              backgroundColor: "transparent",
            }}
          >
            <TextInput
              value={netPayAmount}
              onChangeText={(text) => setNetPayAmount(text)}
              onBlur={async () => {
                const data = buildIncomeData(
                  payFrequency,
                  netPayAmount,
                  nextPayDate,
                  irregularIncomeEnabled,
                  irregularMonthlyAvg,
                  irregularReliability,
                );
                await saveIfEdit(data ?? null);
              }}
              placeholder="$0"
              keyboardType="numeric"
              style={{ color: "#fff", fontSize: 20 }}
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-white font-semibold mb-3">Next Pay Date *</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{
              borderRadius: 16,
              padding: 16,
              borderWidth: 2,
              borderColor: SettingsAccent,
              backgroundColor: "transparent",
            }}
          >
            <Text className="text-white text-xl">
              {nextPayDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={nextPayDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={(event, date) => {
                if (Platform.OS === "android") {
                  setShowDatePicker(false);
                }
                if (date) {
                  setNextPayDate(date);
                  const data = buildIncomeData(
                    payFrequency,
                    netPayAmount,
                    date,
                    irregularIncomeEnabled,
                    irregularMonthlyAvg,
                    irregularReliability,
                  );
                  saveIfEdit(data ?? null);
                }
              }}
            />
          )}
        </View>

        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-semibold">Irregular Income</Text>
            <TouchableOpacity
              onPress={() => setIrregularIncomeEnabled(!irregularIncomeEnabled)}
              style={{
                width: 48,
                height: 24,
                borderRadius: 12,
                backgroundColor: irregularIncomeEnabled
                  ? SettingsAccent
                  : "#374151",
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#000",
                  marginTop: 2,
                  marginLeft: irregularIncomeEnabled ? 26 : 2,
                }}
              />
            </TouchableOpacity>
          </View>

          {irregularIncomeEnabled && (
            <View className="mt-4 gap-4">
              <View>
                <Text className="text-white opacity-80 mb-2">
                  Monthly Average
                </Text>
                <View
                  style={{
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 2,
                    borderColor: SettingsAccent,
                    backgroundColor: "transparent",
                  }}
                >
                  <TextInput
                    value={irregularMonthlyAvg}
                    onChangeText={setIrregularMonthlyAvg}
                    onBlur={async () => {
                      const data = buildIncomeData(
                        payFrequency,
                        netPayAmount,
                        nextPayDate,
                        true,
                        irregularMonthlyAvg,
                        irregularReliability,
                      );
                      await saveIfEdit(data ?? null);
                    }}
                    placeholder="0.00"
                    keyboardType="numeric"
                    style={{ color: "#fff" }}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                  />
                </View>
              </View>

              <View>
                <Text className="text-white opacity-80 mb-2">Reliability</Text>
                <View className="flex-row gap-3">
                  {(["low", "medium", "high"] as const).map((rel) => (
                    <TouchableOpacity
                      key={rel}
                      onPress={() => {
                        setIrregularReliability(rel);
                        const data = buildIncomeData(
                          payFrequency,
                          netPayAmount,
                          nextPayDate,
                          true,
                          irregularMonthlyAvg,
                          rel,
                        );
                        saveIfEdit(data ?? null);
                      }}
                      style={{
                        flex: 1,
                        borderRadius: 12,
                        padding: 12,
                        backgroundColor:
                          irregularReliability === rel
                            ? SettingsAccent
                            : "transparent",
                        borderWidth: 2,
                        borderColor: SettingsAccent,
                        opacity: irregularReliability === rel ? 1 : 0.6,
                      }}
                    >
                      <Text
                        className="text-center"
                        style={{
                          color: irregularReliability === rel ? "#000" : "#fff",
                        }}
                      >
                        {rel.charAt(0).toUpperCase() + rel.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

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
