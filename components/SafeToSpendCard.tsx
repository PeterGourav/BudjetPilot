import type { BudgetCalculation } from "@/services/budgetCalculator";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

type Props = {
  budget: BudgetCalculation | null;
  loading: boolean;
};

export default function SafeToSpendCard({ budget, loading }: Props) {
  if (loading) {
    return (
      <View className="bg-white rounded-2xl p-4 w-[220px] items-center justify-center min-h-[120px]">
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  if (!budget) {
    return (
      <View className="bg-white rounded-2xl p-4 w-[220px]">
        <Text className="text-base font-bold text-black">Safe to spend</Text>
        <Text className="text-2xl font-extrabold text-black mt-2 opacity-60">
          $0
        </Text>
        <Text className="text-sm opacity-60 text-black mt-2">
          Complete onboarding
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-2xl p-4 w-[220px]">
      <Text className="text-base font-bold text-black">Safe to spend</Text>
      <Text className="text-4xl font-extrabold text-black mt-2">
        $
        {budget.safeToSpendUntilPayday.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}
      </Text>
      <Text className="text-sm opacity-60 text-black mt-2">
        till the next paycheque
      </Text>
    </View>
  );
}
