import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import {
  getAllOnboardingData,
  getIncomeData,
  getFixedExpenses,
  getSubscriptions,
  getFlexibleSpending,
  getSavingsGoal,
  getDebts,
  setOnboardingCompleted,
} from '@/services/database';
import type { IncomeData } from '@/services/database';

export default function SummaryScreen() {
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
    const [incomeData, fixed, subs, flexible, savings, debts] = await Promise.all([
      getIncomeData(),
      getFixedExpenses(),
      getSubscriptions(),
      getFlexibleSpending(),
      getSavingsGoal(),
      getDebts(),
    ]);

    setIncome(incomeData);

    if (!incomeData) return;

    // Calculate monthly income
    let monthly = 0;
    switch (incomeData.payFrequency) {
      case 'weekly':
        monthly = incomeData.netPayAmount * 4.33;
        break;
      case 'biweekly':
        monthly = incomeData.netPayAmount * 2.17;
        break;
      case 'monthly':
        monthly = incomeData.netPayAmount;
        break;
    }
    if (incomeData.irregularIncomeEnabled && incomeData.irregularMonthlyAvg) {
      monthly += incomeData.irregularMonthlyAvg;
    }
    setMonthlyIncome(monthly);

    // Calculate totals
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
      if (savings.savingsMode === 'percent') {
        savingsTotal = (monthly * savings.savingsValue) / 100;
      } else {
        savingsTotal = savings.savingsValue;
      }
    }
    setTotalSavings(savingsTotal);

    const debtTotal = debts.reduce((sum, d) => sum + d.minPaymentMonthly, 0);
    setTotalDebt(debtTotal);

    // Check if over budget
    const totalExpenses = fixedTotal + subsTotal + flexibleTotal + savingsTotal + debtTotal;
    if (totalExpenses > monthly) {
      setIsOverBudget(true);
      setShortfall(totalExpenses - monthly);
    } else {
      setIsOverBudget(false);
    }

    // Calculate safe to spend
    const nextPay = new Date(incomeData.nextPayDate);
    setNextPayDate(nextPay);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilPay = Math.max(
      1,
      Math.ceil((nextPay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Calculate available after essentials (fixed, subscriptions, savings, debt)
    const essentialTotal = fixedTotal + subsTotal + savingsTotal + debtTotal;
    const availableForFlexible = monthly - essentialTotal;
    
    // Calculate daily budget (available flexible / days in month)
    const daysInMonth = 30.44; // Average days per month
    const dailyBudget = availableForFlexible / daysInMonth;
    
    // Total available for the remaining period
    const totalForPeriod = dailyBudget * daysUntilPay;
    
    // Safe to spend today (can be the daily budget or remaining for period, whichever is less)
    // For simplicity, show remaining for period as "today"
    setSafeToSpendToday(Math.max(0, totalForPeriod));
    setSafeToSpendPerDay(Math.max(0, dailyBudget));
  };

  const handleFinish = async () => {
    await setOnboardingCompleted(true);
    router.replace('/(tabs)');
  };

  const handleAdjust = (screen: string) => {
    router.push(`/onboarding/${screen}`);
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 px-6 pt-12">
        <Text className="text-white text-2xl font-bold mb-2">Summary</Text>
        <Text className="text-white opacity-60 mb-6">Review your setup</Text>

        {/* Income Summary */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-black font-semibold mb-2">Income per period</Text>
          <Text className="text-black text-2xl font-bold">
            ${income?.netPayAmount.toFixed(2) || '0.00'}
          </Text>
          <Text className="text-black opacity-60">
            {income?.payFrequency || 'monthly'} • ~${monthlyIncome.toFixed(2)}/month
          </Text>
        </View>

        {/* Expenses Breakdown */}
        <View className="gap-3 mb-4">
          <View className="bg-white rounded-2xl p-4">
            <Text className="text-black font-semibold">Total Fixed Monthly</Text>
            <Text className="text-black text-xl font-bold">${totalFixed.toFixed(2)}</Text>
          </View>

          <View className="bg-white rounded-2xl p-4">
            <Text className="text-black font-semibold">Subscriptions Monthly</Text>
            <Text className="text-black text-xl font-bold">${totalSubscriptions.toFixed(2)}</Text>
          </View>

          <View className="bg-white rounded-2xl p-4">
            <Text className="text-black font-semibold">Flexible Caps Monthly</Text>
            <Text className="text-black text-xl font-bold">${totalFlexible.toFixed(2)}</Text>
          </View>

          <View className="bg-white rounded-2xl p-4">
            <Text className="text-black font-semibold">Savings Monthly</Text>
            <Text className="text-black text-xl font-bold">${totalSavings.toFixed(2)}</Text>
          </View>

          <View className="bg-white rounded-2xl p-4">
            <Text className="text-black font-semibold">Debt Monthly</Text>
            <Text className="text-black text-xl font-bold">${totalDebt.toFixed(2)}</Text>
          </View>
        </View>

        {/* Over Budget Warning */}
        {isOverBudget && (
          <View className="bg-red-500 rounded-2xl p-4 mb-4">
            <Text className="text-white font-bold text-lg mb-2">
              You're short by ${shortfall.toFixed(2)}/month
            </Text>
            <View className="gap-2 mt-3">
              <TouchableOpacity
                onPress={() => handleAdjust('savings')}
                className="bg-white rounded-xl p-3"
              >
                <Text className="text-black font-semibold text-center">Reduce savings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAdjust('debt')}
                className="bg-white rounded-xl p-3"
              >
                <Text className="text-black font-semibold text-center">Adjust debt goal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAdjust('flexible')}
                className="bg-white rounded-xl p-3"
              >
                <Text className="text-black font-semibold text-center">Lower flexible caps</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Daily Number Cards */}
        <View className="mb-4">
          <Text className="text-white text-xl font-bold mb-3">Your Daily Number</Text>
          <View className="bg-white rounded-2xl p-4 mb-3">
            <Text className="text-black font-semibold mb-2">Safe to spend today</Text>
            <Text className="text-black text-4xl font-extrabold">
              ${safeToSpendToday.toFixed(2)}
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-3">
            <Text className="text-black font-semibold mb-2">Safe to spend per day until payday</Text>
            <Text className="text-black text-4xl font-extrabold">
              ${safeToSpendPerDay.toFixed(2)}/day
            </Text>
          </View>

          {nextPayDate && (
            <View className="bg-white rounded-2xl p-4">
              <Text className="text-black font-semibold">Next payday</Text>
              <Text className="text-black text-xl font-bold">
                {nextPayDate.toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row gap-3 mb-8">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-1 bg-gray-800 rounded-2xl p-4 items-center"
          >
            <Text className="text-white font-semibold">Edit later</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleFinish}
            className="flex-1 bg-white rounded-2xl p-4 items-center"
          >
            <Text className="text-black font-bold">Finish Setup</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
