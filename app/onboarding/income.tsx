import { SettingsAccent } from "@/constants/theme";
import { useBudgetContext } from "@/hooks/BudgetContext";
import {
  getIncomeData,
  getNextPayDateFromIncome,
  saveIncomeData,
  type IncomeData,
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

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function clampDay(v: number): number {
  return Math.min(31, Math.max(1, v));
}

function buildIncomeData(
  payFrequency: "biweekly" | "monthly",
  netPayAmount: string,
  payDayOfMonth: number | undefined,
  biweeklyPayDay1: number | undefined,
  biweeklyPayDay2: number | undefined,
  irregularIncomeEnabled: boolean,
  irregularMonthlyAvg: string,
  irregularReliability: "low" | "medium" | "high",
): IncomeData | null {
  const amount = parseFloat(netPayAmount);
  if (isNaN(amount) || amount <= 0) return null;
  if (payFrequency === "monthly") {
    if (payDayOfMonth == null || payDayOfMonth < 1 || payDayOfMonth > 31)
      return null;
  } else {
    if (
      biweeklyPayDay1 == null ||
      biweeklyPayDay2 == null ||
      biweeklyPayDay1 < 1 ||
      biweeklyPayDay1 > 31 ||
      biweeklyPayDay2 < 1 ||
      biweeklyPayDay2 > 31
    )
      return null;
  }
  const stub: IncomeData = {
    payFrequency,
    netPayAmount: amount,
    nextPayDate: "",
    irregularIncomeEnabled,
    irregularMonthlyAvg:
      irregularIncomeEnabled && irregularMonthlyAvg
        ? parseFloat(irregularMonthlyAvg)
        : undefined,
    irregularReliability: irregularIncomeEnabled
      ? irregularReliability
      : undefined,
  };
  if (payFrequency === "monthly") {
    stub.payDayOfMonth = clampDay(payDayOfMonth!);
  } else {
    stub.biweeklyPayDay1 = clampDay(biweeklyPayDay1!);
    stub.biweeklyPayDay2 = clampDay(biweeklyPayDay2!);
  }
  stub.nextPayDate = getNextPayDateFromIncome(stub).toISOString();
  return stub;
}

export default function IncomeScreen() {
  const params = useLocalSearchParams();
  const isEditMode = params.mode === "edit";
  const { refresh } = useBudgetContext();
  const [payFrequency, setPayFrequency] = useState<"biweekly" | "monthly">(
    "monthly",
  );
  const [netPayAmount, setNetPayAmount] = useState("");
  const [payDayOfMonth, setPayDayOfMonth] = useState<string>("15");
  const [biweeklyPayDay1, setBiweeklyPayDay1] = useState<string>("1");
  const [biweeklyPayDay2, setBiweeklyPayDay2] = useState<string>("15");
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
      if (existing.payDayOfMonth != null) {
        setPayDayOfMonth(String(existing.payDayOfMonth));
      }
      if (existing.biweeklyPayDay1 != null) {
        setBiweeklyPayDay1(String(existing.biweeklyPayDay1));
      }
      if (existing.biweeklyPayDay2 != null) {
        setBiweeklyPayDay2(String(existing.biweeklyPayDay2));
      }
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
    const payDay = parseInt(payDayOfMonth, 10);
    const b1 = parseInt(biweeklyPayDay1, 10);
    const b2 = parseInt(biweeklyPayDay2, 10);
    const data = buildIncomeData(
      payFrequency,
      netPayAmount,
      payFrequency === "monthly" ? (isNaN(payDay) ? undefined : payDay) : undefined,
      payFrequency === "biweekly" ? (isNaN(b1) ? undefined : b1) : undefined,
      payFrequency === "biweekly" ? (isNaN(b2) ? undefined : b2) : undefined,
      irregularIncomeEnabled,
      irregularMonthlyAvg,
      irregularReliability,
    );
    if (!data) {
      if (parseFloat(netPayAmount) <= 0 || isNaN(parseFloat(netPayAmount))) {
        alert("Please enter a valid net pay amount");
      } else if (payFrequency === "monthly" && (isNaN(payDay) || payDay < 1 || payDay > 31)) {
        alert("Please enter a pay day (1–31) for monthly");
      } else if (
        payFrequency === "biweekly" &&
        (isNaN(b1) || isNaN(b2) || b1 < 1 || b1 > 31 || b2 < 1 || b2 > 31)
      ) {
        alert("Please enter both pay days (1–31) for biweekly");
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

  const payDayNum = parseInt(payDayOfMonth, 10);
  const b1Num = parseInt(biweeklyPayDay1, 10);
  const b2Num = parseInt(biweeklyPayDay2, 10);

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
            {(["biweekly", "monthly"] as const).map((freq) => (
              <TouchableOpacity
                key={freq}
                onPress={() => {
                  setPayFrequency(freq);
                  const data = buildIncomeData(
                    freq,
                    netPayAmount,
                    freq === "monthly" ? (isNaN(payDayNum) ? undefined : clampDay(payDayNum)) : undefined,
                    freq === "biweekly" ? (isNaN(b1Num) ? undefined : clampDay(b1Num)) : undefined,
                    freq === "biweekly" ? (isNaN(b2Num) ? undefined : clampDay(b2Num)) : undefined,
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
                  borderColor: SettingsAccent,
                  opacity: payFrequency === freq ? 1 : 0.6,
                }}
              >
                <Text
                  className="text-center font-semibold"
                  style={{
                    color: payFrequency === freq ? "#000" : "#fff",
                  }}
                >
                  {freq === "biweekly" ? "Biweekly" : "Monthly"}
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
              onChangeText={setNetPayAmount}
              onBlur={async () => {
                const data = buildIncomeData(
                  payFrequency,
                  netPayAmount,
                  payFrequency === "monthly" ? (isNaN(payDayNum) ? undefined : clampDay(payDayNum)) : undefined,
                  payFrequency === "biweekly" ? (isNaN(b1Num) ? undefined : clampDay(b1Num)) : undefined,
                  payFrequency === "biweekly" ? (isNaN(b2Num) ? undefined : clampDay(b2Num)) : undefined,
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

        {payFrequency === "monthly" && (
          <View className="mb-6">
            <Text className="text-white font-semibold mb-3">
              Pay day (day of month) *
            </Text>
            <Text className="text-white opacity-60 mb-2">
              One date each month (e.g. 15 = 15th). Dashboard will show the next pay date automatically.
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
                value={payDayOfMonth}
                onChangeText={(t) => {
                  const n = parseInt(t.replace(/\D/g, ""), 10);
                  if (t === "" || (!isNaN(n) && n >= 1 && n <= 31)) {
                    setPayDayOfMonth(t === "" ? "" : String(clampDay(n)));
                  }
                }}
                onBlur={async () => {
                  const n = parseInt(payDayOfMonth, 10);
                  if (!isNaN(n)) setPayDayOfMonth(String(clampDay(n)));
                  const data = buildIncomeData(
                    "monthly",
                    netPayAmount,
                    isNaN(payDayNum) ? undefined : clampDay(payDayNum),
                    undefined,
                    undefined,
                    irregularIncomeEnabled,
                    irregularMonthlyAvg,
                    irregularReliability,
                  );
                  await saveIfEdit(data ?? null);
                }}
                placeholder="1–31"
                keyboardType="number-pad"
                style={{ color: "#fff", fontSize: 20 }}
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
            </View>
          </View>
        )}

        {payFrequency === "biweekly" && (
          <View className="mb-6">
            <Text className="text-white font-semibold mb-3">
              Two pay days per month *
            </Text>
            <Text className="text-white opacity-60 mb-2">
              Enter the two days you get paid (e.g. 5 and 19). Dashboard will show the upcoming pay date and update each month.
            </Text>
            <View className="gap-3">
              <View>
                <Text className="text-white opacity-80 mb-1">First pay day</Text>
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
                    value={biweeklyPayDay1}
                    onChangeText={(t) => {
                      const n = parseInt(t.replace(/\D/g, ""), 10);
                      if (t === "" || (!isNaN(n) && n >= 1 && n <= 31)) {
                        setBiweeklyPayDay1(t === "" ? "" : String(clampDay(n)));
                      }
                    }}
                    onBlur={async () => {
                      const n = parseInt(biweeklyPayDay1, 10);
                      if (!isNaN(n)) setBiweeklyPayDay1(String(clampDay(n)));
                      const data = buildIncomeData(
                        "biweekly",
                        netPayAmount,
                        undefined,
                        isNaN(b1Num) ? undefined : clampDay(b1Num),
                        isNaN(b2Num) ? undefined : clampDay(b2Num),
                        irregularIncomeEnabled,
                        irregularMonthlyAvg,
                        irregularReliability,
                      );
                      await saveIfEdit(data ?? null);
                    }}
                    placeholder="1–31"
                    keyboardType="number-pad"
                    style={{ color: "#fff", fontSize: 18 }}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                  />
                </View>
              </View>
              <View>
                <Text className="text-white opacity-80 mb-1">Second pay day</Text>
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
                    value={biweeklyPayDay2}
                    onChangeText={(t) => {
                      const n = parseInt(t.replace(/\D/g, ""), 10);
                      if (t === "" || (!isNaN(n) && n >= 1 && n <= 31)) {
                        setBiweeklyPayDay2(t === "" ? "" : String(clampDay(n)));
                      }
                    }}
                    onBlur={async () => {
                      const n = parseInt(biweeklyPayDay2, 10);
                      if (!isNaN(n)) setBiweeklyPayDay2(String(clampDay(n)));
                      const data = buildIncomeData(
                        "biweekly",
                        netPayAmount,
                        undefined,
                        isNaN(b1Num) ? undefined : clampDay(b1Num),
                        isNaN(b2Num) ? undefined : clampDay(b2Num),
                        irregularIncomeEnabled,
                        irregularMonthlyAvg,
                        irregularReliability,
                      );
                      await saveIfEdit(data ?? null);
                    }}
                    placeholder="1–31"
                    keyboardType="number-pad"
                    style={{ color: "#fff", fontSize: 18 }}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-semibold">Irregular Income</Text>
            <TouchableOpacity
              onPress={() =>
                setIrregularIncomeEnabled(!irregularIncomeEnabled)
              }
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
                        payFrequency === "monthly" ? (isNaN(payDayNum) ? undefined : clampDay(payDayNum)) : undefined,
                        payFrequency === "biweekly" ? (isNaN(b1Num) ? undefined : clampDay(b1Num)) : undefined,
                        payFrequency === "biweekly" ? (isNaN(b2Num) ? undefined : clampDay(b2Num)) : undefined,
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
                          payFrequency === "monthly" ? (isNaN(payDayNum) ? undefined : clampDay(payDayNum)) : undefined,
                          payFrequency === "biweekly" ? (isNaN(b1Num) ? undefined : clampDay(b1Num)) : undefined,
                          payFrequency === "biweekly" ? (isNaN(b2Num) ? undefined : clampDay(b2Num)) : undefined,
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
                          color:
                            irregularReliability === rel ? "#000" : "#fff",
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
