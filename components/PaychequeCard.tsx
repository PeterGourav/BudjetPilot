import type { BudgetCalculation } from "@/services/budgetCalculator";
import { getIncomeData } from "@/services/database";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

type Props = {
  budget: BudgetCalculation | null;
  loading: boolean;
};

export default function PaychequeCard({ budget, loading }: Props) {
  const [nextPayAmount, setNextPayAmount] = useState<number | null>(null);

  useEffect(() => {
    async function loadNextPay() {
      try {
        const income = await getIncomeData();
        if (income) {
          setNextPayAmount(income.netPayAmount);
        }
      } catch (error) {
        console.error("Error loading income data:", error);
      }
    }
    loadNextPay();
  }, [budget]); // Reload when budget changes

  if (loading) {
    return (
      <View className="bg-white rounded-2xl p-4 w-[220px] items-center justify-center min-h-[120px]">
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  if (!budget || nextPayAmount === null) {
    return (
      <View className="bg-white rounded-2xl p-4 w-[220px]">
        <Text className="text-base font-bold text-black">Next Paycheque</Text>
        <Text className="text-2xl font-extrabold text-black mt-2 opacity-60">
          Not set
        </Text>
        <Text className="text-sm opacity-60 text-black mt-2">
          Complete onboarding
        </Text>
      </View>
    );
  }

  const formattedDate = budget.nextPayDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <View className="bg-white rounded-2xl p-4 w-[220px]">
      <Text className="text-base font-bold text-black">Next Paycheque</Text>
      <Text className="text-4xl font-extrabold text-black mt-2">
        {nextPayAmount.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}
      </Text>
      <Text className="text-sm opacity-60 text-black mt-2">
        on {formattedDate}
      </Text>
    </View>
  );
}
