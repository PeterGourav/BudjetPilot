import type { BudgetCalculation } from "@/services/budgetCalculator";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

type Props = {
  budget: BudgetCalculation | null;
  loading: boolean;
};

export default function CanSpendCard({ budget, loading }: Props) {
  if (loading) {
    return (
      <View className="bg-white rounded-2xl p-4 w-full mt-4 items-center justify-center min-h-[120px]">
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  if (!budget) {
    return (
      <View className="bg-white rounded-2xl p-4 w-full mt-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-base font-bold text-black">Can Spend</Text>
        </View>
        <Text className="text-2xl font-extrabold text-gray-400 mt-2">
          $0.00 Today
        </Text>
        <Text className="text-sm opacity-60 text-black mt-2">
          Complete onboarding to see your budget
        </Text>
      </View>
    );
  }

  const isPositive = budget.safeToSpendToday >= 0;
  const displayAmount = Math.abs(budget.safeToSpendToday);

  return (
    <View className="bg-white rounded-2xl p-4 w-full mt-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-bold text-black">Can Spend</Text>
        <TouchableOpacity className="w-6 h-6 items-center justify-center">
          <Ionicons name="arrow-up-outline" size={16} color="#000" />
        </TouchableOpacity>
      </View>
      <Text
        className={`text-4xl font-extrabold mt-2 ${
          isPositive ? "text-green-600" : "text-red-600"
        }`}
      >
        ${displayAmount.toFixed(2)} Today
      </Text>
      <Text className="text-sm opacity-60 text-black mt-2">
        {isPositive ? "to meet the budget" : "over budget"}
      </Text>
    </View>
  );
}
