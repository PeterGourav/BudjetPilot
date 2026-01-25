import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function CanSpendCard() {
  return (
    <View className="bg-white rounded-2xl p-4 w-full mt-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-bold text-black">Can Spend</Text>
        <TouchableOpacity className="w-6 h-6 items-center justify-center">
          <Ionicons name="arrow-up-outline" size={16} color="#000" />
        </TouchableOpacity>
      </View>
      <Text className="text-4xl font-extrabold text-green-600 mt-2">
        $17 Today
      </Text>
      <Text className="text-sm opacity-60 text-black mt-2">
        too meet the budget
      </Text>
    </View>
  );
}

