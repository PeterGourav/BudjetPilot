import CanSpendCard from "@/components/CanSpendCard";
import Header from "@/components/Header";
import PaychequeCard from "@/components/PaychequeCard";
import SafeToSpendCard from "@/components/SafeToSpendCard";
import { useBudgetContext } from "@/hooks/BudgetContext";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import { ScrollView, View } from "react-native";

export default function Dashboard() {
  // Use a single shared budget instance for the whole app via context
  const { budget, loading, refresh } = useBudgetContext();

  useFocusEffect(
    React.useCallback(() => {
      // Refresh data when screen is focused (e.g., returning from settings)
      refresh();
    }, [refresh]),
  );

  return (
    <View className="flex-1 bg-black">
      <Header />
      <ScrollView className="flex-1 px-4">
        <View className="flex-row gap-4 mt-4">
          <PaychequeCard budget={budget} loading={loading} />
          <SafeToSpendCard budget={budget} loading={loading} />
        </View>
        <CanSpendCard budget={budget} loading={loading} />
      </ScrollView>
    </View>
  );
}
