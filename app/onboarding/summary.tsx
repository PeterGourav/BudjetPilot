import { SettingsAccent } from "@/constants/theme";
import type { IncomeData } from "@/services/database";
import {
  getDebts,
  getFixedExpenses,
  getFlexibleSpending,
  getIncomeData,
  getNextPayDateFromIncome,
  getSavingsGoal,
  getSubscriptions,
  setOnboardingCompleted,
} from "@/services/database";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const cardStyle = {
  borderRadius: 16,
  padding: 16,
  borderWidth: 2,
  borderColor: SettingsAccent,
  backgroundColor: "transparent" as const,
};

export default function SummaryScreen() {
  const params = useLocalSearchParams<{ from?: string }>();
  const fromSettings = params.from === "settings";

  const [income, setIncome] = useState<IncomeData | null>(null);
  const [totalFixed, setTotalFixed] = useState(0);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  const [totalFlexible, setTotalFlexible] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [safeToSpendToday, setSafeToSpendToday] = useState(0);
  const [safeToSpendPerDay, setSafeToSpendPerDay] = useState(0);
  const [nextPayDate, setNextPayDate] = useState<Date | null>(null);
  const [isOverBudget, setIsOverBudget] = useState(false);
  const [shortfall, setShortfall] = useState(0);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    const [incomeData, fixed, subs, flexible, savings, debts] =
      await Promise.all([
        getIncomeData(),
        getFixedExpenses(),
        getSubscriptions(),
        getFlexibleSpending(),
        getSavingsGoal(),
        getDebts(),
      ]);

    setIncome(incomeData);

    if (!incomeData) return;

    let monthly = 0;
    switch (incomeData.payFrequency) {
      case "biweekly":
        monthly = incomeData.netPayAmount * 2.17;
        break;
      case "monthly":
      default:
        monthly = incomeData.netPayAmount;
        break;
    }
    if (incomeData.irregularIncomeEnabled && incomeData.irregularMonthlyAvg) {
      monthly += incomeData.irregularMonthlyAvg;
    }
    setMonthlyIncome(monthly);

    const fixedTotal = fixed
      .filter((e) => e.enabled)
      .reduce((sum, e) => sum + e.amountMonthly, 0);
    setTotalFixed(fixedTotal);

    const subsTotal = subs.reduce((sum, s) => sum + s.amountMonthly, 0);
    setTotalSubscriptions(subsTotal);

    const flexibleData = flexible || {
      eatingOut: 0,
      entertainment: 0,
      shopping: 0,
      miscBuffer: 0,
    };
    const flexibleTotal =
      flexibleData.eatingOut +
      flexibleData.entertainment +
      flexibleData.shopping +
      flexibleData.miscBuffer;
    setTotalFlexible(flexibleTotal);

    let savingsTotal = 0;
    if (savings?.enabled && savings.savingsValue) {
      if (savings.savingsMode === "percent") {
        savingsTotal = (monthly * savings.savingsValue) / 100;
      } else {
        savingsTotal = savings.savingsValue;
      }
    }
    setTotalSavings(savingsTotal);

    const debtTotal = debts.reduce((sum, d) => sum + d.minPaymentMonthly, 0);
    setTotalDebt(debtTotal);

    const totalExpenses =
      fixedTotal + subsTotal + flexibleTotal + savingsTotal + debtTotal;
    if (totalExpenses > monthly) {
      setIsOverBudget(true);
      setShortfall(totalExpenses - monthly);
    } else {
      setIsOverBudget(false);
    }

    const nextPay = getNextPayDateFromIncome(incomeData);
    setNextPayDate(nextPay);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilPay = Math.max(
      1,
      Math.ceil((nextPay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const essentialTotal = fixedTotal + subsTotal + savingsTotal + debtTotal;
    const availableForFlexible = monthly - essentialTotal;
    const daysInMonth = 30.44;
    const dailyBudget = availableForFlexible / daysInMonth;
    const totalForPeriod = dailyBudget * daysUntilPay;
    setSafeToSpendToday(Math.max(0, totalForPeriod));
    setSafeToSpendPerDay(Math.max(0, dailyBudget));
  };

  const handleFinish = async () => {
    await setOnboardingCompleted(true);
    router.replace("/(tabs)");
  };

  const handleAdjust = (screen: string) => {
    router.push(`/onboarding/${screen}`);
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 px-6 pt-12">
        <Text className="text-white text-2xl font-bold mb-2">Summary</Text>
        <Text className="text-white opacity-60 mb-6">Review your setup</Text>

        <View style={{ ...cardStyle, marginBottom: 16 }}>
          <Text className="text-white font-semibold mb-1">
            Income per period
          </Text>
          <Text className="text-white opacity-60 mb-1">
            {income?.payFrequency || "monthly"} • ~$
            {monthlyIncome.toFixed(2)}/month
          </Text>
          <Text
            style={{ color: SettingsAccent, fontSize: 24, fontWeight: "bold" }}
          >
            ${income?.netPayAmount.toFixed(2) || "0.00"}
          </Text>
        </View>

        <View className="gap-3 mb-4">
          <View style={cardStyle}>
            <Text className="text-white font-semibold">
              Total Fixed Monthly
            </Text>
            <Text
              style={{
                color: SettingsAccent,
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              ${totalFixed.toFixed(2)}
            </Text>
          </View>

          <View style={cardStyle}>
            <Text className="text-white font-semibold">
              Subscription Monthly
            </Text>
            <Text
              style={{
                color: SettingsAccent,
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              ${totalSubscriptions.toFixed(2)}
            </Text>
          </View>

          <View style={cardStyle}>
            <Text className="text-white font-semibold">
              Flexible Caps Monthly
            </Text>
            <Text
              style={{
                color: SettingsAccent,
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              ${totalFlexible.toFixed(2)}
            </Text>
          </View>

          <View style={cardStyle}>
            <Text className="text-white font-semibold">Saving Monthly</Text>
            <Text
              style={{
                color: SettingsAccent,
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              ${totalSavings.toFixed(2)}
            </Text>
          </View>

          <View style={cardStyle}>
            <Text className="text-white font-semibold">Debt Monthly</Text>
            <Text
              style={{
                color: SettingsAccent,
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              ${totalDebt.toFixed(2)}
            </Text>
          </View>
        </View>

        {isOverBudget && (
          <View
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.2)",
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 2,
              borderColor: "#ef4444",
            }}
          >
            <Text className="text-white font-bold text-lg mb-2">
              You're short by ${shortfall.toFixed(2)}/month
            </Text>
            <View className="gap-2 mt-3">
              <TouchableOpacity
                onPress={() => handleAdjust("savings")}
                style={{
                  backgroundColor: SettingsAccent,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <Text className="text-black font-semibold text-center">
                  Reduce savings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAdjust("debt")}
                style={{
                  backgroundColor: SettingsAccent,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <Text className="text-black font-semibold text-center">
                  Adjust debt goal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAdjust("flexible")}
                style={{
                  backgroundColor: SettingsAccent,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <Text className="text-black font-semibold text-center">
                  Lower flexible caps
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View className="mb-4">
          <Text className="text-white text-xl font-bold mb-3">
            Your Daily Number
          </Text>
          <View style={{ ...cardStyle, marginBottom: 12 }}>
            <Text className="text-white font-semibold mb-2">
              Safe to spend today
            </Text>
            <Text
              style={{
                color: SettingsAccent,
                fontSize: 28,
                fontWeight: "bold",
              }}
            >
              ${safeToSpendToday.toFixed(2)}
            </Text>
          </View>

          <View style={{ ...cardStyle, marginBottom: 12 }}>
            <Text className="text-white font-semibold mb-2">
              Safe to spend per day until payday
            </Text>
            <Text
              style={{
                color: SettingsAccent,
                fontSize: 28,
                fontWeight: "bold",
              }}
            >
              ${safeToSpendPerDay.toFixed(2)}/day
            </Text>
          </View>

          {nextPayDate && (
            <View style={cardStyle}>
              <Text className="text-white font-semibold">Next payday</Text>
              <Text
                style={{
                  color: SettingsAccent,
                  fontSize: 20,
                  fontWeight: "bold",
                }}
              >
                {nextPayDate.toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row gap-3 mb-8">
          <TouchableOpacity
            onPress={() => router.back()}
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
              style={{ color: SettingsAccent, fontSize: 18, fontWeight: "600" }}
            >
              {fromSettings ? "Back" : "Edit later"}
            </Text>
          </TouchableOpacity>
          {!fromSettings && (
            <TouchableOpacity
              onPress={handleFinish}
              style={{
                flex: 1,
                backgroundColor: SettingsAccent,
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text className="text-black text-lg font-bold">Finish Setup</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
