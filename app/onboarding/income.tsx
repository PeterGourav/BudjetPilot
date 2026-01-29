import { useBudgetContext } from "@/hooks/BudgetContext";
import {
  getIncomeData,
  saveIncomeData,
  type IncomeData,
} from "@/services/database";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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

  const handleContinue = async () => {
    const amount = parseFloat(netPayAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid net pay amount");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const payDate = new Date(nextPayDate);
    payDate.setHours(0, 0, 0, 0);

    if (payDate < today) {
      alert("Next pay date must be today or later");
      return;
    }

    const data: IncomeData = {
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

    await saveIncomeData(data);
    await refresh();
    if (isEditMode) {
      router.back();
    } else {
      router.push("/onboarding/fixed");
    }
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 px-6 pt-12">
        <Text className="text-white text-2xl font-bold mb-2">Income Setup</Text>
        <Text className="text-white opacity-60 mb-6">
          Tell us about your income
        </Text>

        <View className="mb-6">
          <Text className="text-white font-semibold mb-3">Pay Frequency *</Text>
          <View className="flex-row gap-3">
            {(["weekly", "biweekly", "monthly"] as const).map((freq) => (
              <TouchableOpacity
                key={freq}
                onPress={() => setPayFrequency(freq)}
                className={`flex-1 rounded-xl p-4 ${
                  payFrequency === freq ? "bg-white" : "bg-gray-800"
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    payFrequency === freq ? "text-black" : "text-white"
                  }`}
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
          <View className="bg-white rounded-2xl p-4">
            <TextInput
              value={netPayAmount}
              onChangeText={setNetPayAmount}
              placeholder="0.00"
              keyboardType="numeric"
              style={{ color: "#000", fontSize: 20 }}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-white font-semibold mb-3">Next Pay Date *</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="bg-white rounded-2xl p-4"
          >
            <Text className="text-black text-xl">
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
                if (date) setNextPayDate(date);
              }}
            />
          )}
        </View>

        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-semibold">Irregular Income</Text>
            <TouchableOpacity
              onPress={() => setIrregularIncomeEnabled(!irregularIncomeEnabled)}
              className={`w-12 h-6 rounded-full ${
                irregularIncomeEnabled ? "bg-white" : "bg-gray-700"
              }`}
            >
              <View
                className={`w-5 h-5 rounded-full bg-black mt-0.5 ${
                  irregularIncomeEnabled ? "ml-6" : "ml-0.5"
                }`}
              />
            </TouchableOpacity>
          </View>

          {irregularIncomeEnabled && (
            <View className="mt-4 gap-4">
              <View>
                <Text className="text-white opacity-80 mb-2">
                  Monthly Average
                </Text>
                <View className="bg-white rounded-2xl p-4">
                  <TextInput
                    value={irregularMonthlyAvg}
                    onChangeText={setIrregularMonthlyAvg}
                    placeholder="0.00"
                    keyboardType="numeric"
                    style={{ color: "#000" }}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View>
                <Text className="text-white opacity-80 mb-2">Reliability</Text>
                <View className="flex-row gap-3">
                  {(["low", "medium", "high"] as const).map((rel) => (
                    <TouchableOpacity
                      key={rel}
                      onPress={() => setIrregularReliability(rel)}
                      className={`flex-1 rounded-xl p-3 ${
                        irregularReliability === rel
                          ? "bg-white"
                          : "bg-gray-800"
                      }`}
                    >
                      <Text
                        className={`text-center ${
                          irregularReliability === rel
                            ? "text-black"
                            : "text-white"
                        }`}
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
