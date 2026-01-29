import { useBudgetContext } from "@/hooks/BudgetContext";
import {
  getFlexibleSpending,
  saveFlexibleSpending,
  type FlexibleSpending,
} from "@/services/database";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const CONSERVATIVE_DEFAULTS = {
  eatingOut: 200,
  entertainment: 100,
  shopping: 150,
  miscBuffer: 100,
};

export default function FlexibleScreen() {
  const params = useLocalSearchParams();
  const isEditMode = params.mode === "edit";
  const [spending, setSpending] = useState<FlexibleSpending>({
    eatingOut: 0,
    entertainment: 0,
    shopping: 0,
    miscBuffer: 0,
  });
  const { refresh } = useBudgetContext();

  useEffect(() => {
    if (isEditMode) {
      loadExistingData();
    }
  }, [isEditMode]);

  const loadExistingData = async () => {
    const existing = await getFlexibleSpending();
    if (existing) {
      setSpending(existing);
    }
  };

  const updateSpending = (key: keyof FlexibleSpending, value: string) => {
    setSpending({ ...spending, [key]: parseFloat(value) || 0 });
  };

  const applyDefaults = () => {
    setSpending(CONSERVATIVE_DEFAULTS);
  };

  const handleContinue = async () => {
    await saveFlexibleSpending(spending);
    await refresh();
    if (isEditMode) {
      router.back();
    } else {
      router.push("/onboarding/savings");
    }
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 px-6 pt-12">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold mb-2">
              Flexible Spending
            </Text>
            <Text className="text-white opacity-60">
              {isEditMode
                ? "Edit your flexible spending caps"
                : "These are 'nice-to-have' categories. Put a rough monthly cap."}
            </Text>
          </View>
          {isEditMode && (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={applyDefaults}
          className="bg-gray-800 rounded-2xl p-4 items-center mb-6"
        >
          <Text className="text-white text-lg font-semibold">I'm not sure</Text>
        </TouchableOpacity>

        <View className="gap-4 mb-6">
          {[
            { key: "eatingOut" as const, label: "Eating out" },
            { key: "entertainment" as const, label: "Entertainment" },
            { key: "shopping" as const, label: "Shopping" },
            { key: "miscBuffer" as const, label: "Misc buffer" },
          ].map(({ key, label }) => (
            <View key={key} className="bg-white rounded-2xl p-4">
              <Text className="text-black font-semibold mb-3">{label}</Text>
              <View className="bg-gray-100 rounded-xl p-3">
                <TextInput
                  value={spending[key].toString()}
                  onChangeText={(text) => updateSpending(key, text)}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{ color: "#000", fontSize: 18 }}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          ))}
        </View>

        <View className="flex-row gap-3 mb-8">
          <TouchableOpacity
            onPress={() => router.push("/onboarding/savings")}
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
    </View>
  );
}
