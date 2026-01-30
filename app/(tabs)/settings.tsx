import {
    getIncomeData
} from "@/services/database";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function SettingsScreen() {
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    checkData();
  }, []);

  const checkData = async () => {
    const income = await getIncomeData();
    setHasData(!!income);
  };

  const settingsItems = [
    {
      title: "Income",
      icon: "cash-outline",
      route: "/onboarding/income?mode=edit",
      description: "Edit your income details",
    },
    {
      title: "Fixed Expenses",
      icon: "home-outline",
      route: "/onboarding/fixed?mode=edit",
      description: "Rent, utilities, and bills",
    },
    {
      title: "Subscriptions",
      icon: "card-outline",
      route: "/onboarding/subscriptions?mode=edit",
      description: "Monthly subscriptions",
    },
    {
      title: "Flexible Spending",
      icon: "wallet-outline",
      route: "/onboarding/flexible?mode=edit",
      description: "Spending category caps",
    },
    {
      title: "Savings Goals",
      icon: "trending-up-outline",
      route: "/onboarding/savings?mode=edit",
      description: "Your savings plan",
    },
    {
      title: "Debt Management",
      icon: "card-outline",
      route: "/onboarding/debt?mode=edit",
      description: "Debts and payoff goals",
    },
  ];

  return (
    <View className="flex-1 bg-black">
      <View className="px-4 pt-12 pb-4">
        <Text className="text-white text-2xl font-bold">Settings</Text>
        <Text className="text-white opacity-60 mt-1">
          Edit your budget plan
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="gap-3 mt-4">
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => router.push(item.route as any)}
              className="bg-white rounded-2xl p-4"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mr-4">
                  <Ionicons name={item.icon as any} size={24} color="#000" />
                </View>
                <View className="flex-1">
                  <Text className="text-black font-bold text-lg">
                    {item.title}
                  </Text>
                  <Text className="text-black opacity-60 text-sm mt-1">
                    {item.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View className="mt-6 mb-8">
          <TouchableOpacity
            onPress={() => router.push("/onboarding/summary?from=settings")}
            className="bg-gray-800 rounded-2xl p-4 items-center"
          >
            <Text className="text-white font-semibold text-lg">
              View Budget Summary
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
