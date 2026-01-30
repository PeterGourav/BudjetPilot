import { SettingsAccent } from "@/constants/theme";
import { useBudgetContext } from "@/hooks/BudgetContext";
import {
    getFlexibleSpending,
    saveFlexibleSpending,
    type FlexibleSpending,
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

  const saveAndRefresh = useCallback(
    async (data: FlexibleSpending) => {
      await saveFlexibleSpending(data);
      await refresh();
    },
    [refresh],
  );

  const updateSpending = (key: keyof FlexibleSpending, value: string) => {
    const next = { ...spending, [key]: parseFloat(value) || 0 };
    setSpending(next);
    if (isEditMode) {
      saveAndRefresh(next);
    }
  };

  const applyDefaults = () => {
    setSpending(CONSERVATIVE_DEFAULTS);
    if (isEditMode) {
      saveAndRefresh(CONSERVATIVE_DEFAULTS);
    }
  };

  const handleContinue = async () => {
    await saveFlexibleSpending(spending);
    await refresh();
    router.push("/onboarding/savings");
  };

  const cardStyle = {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: SettingsAccent,
    backgroundColor: "transparent" as const,
  };

  const inputStyle = {
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: SettingsAccent,
    backgroundColor: "rgba(34, 197, 94, 0.1)" as const,
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
          style={{
            ...cardStyle,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Text
            style={{ color: SettingsAccent, fontSize: 18, fontWeight: "600" }}
          >
            I'm not sure
          </Text>
        </TouchableOpacity>

        <View className="gap-4 mb-6">
          {[
            { key: "eatingOut" as const, label: "Eating out" },
            { key: "entertainment" as const, label: "Entertainment" },
            { key: "shopping" as const, label: "Shopping" },
            { key: "miscBuffer" as const, label: "Misc buffer" },
          ].map(({ key, label }) => (
            <View key={key} style={cardStyle}>
              <Text className="text-white font-semibold mb-3">{label}</Text>
              <View style={inputStyle}>
                <TextInput
                  value={spending[key].toString()}
                  onChangeText={(text) => updateSpending(key, text)}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{ color: SettingsAccent, fontSize: 18 }}
                  placeholderTextColor="rgba(34, 197, 94, 0.5)"
                />
              </View>
            </View>
          ))}
        </View>

        {!isEditMode && (
          <View className="flex-row gap-3 mb-8">
            <TouchableOpacity
              onPress={() => router.push("/onboarding/savings")}
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
    </View>
  );
}
