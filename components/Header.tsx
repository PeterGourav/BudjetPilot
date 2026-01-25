import React from "react";
import { Image, Text, View } from "react-native";

export default function Header() {
  return (
    <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
      <Text className="text-white text-2xl font-bold">BudgetPilot</Text>
      <View className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden">
        <Image
          source={{ uri: "https://via.placeholder.com/40" }}
          className="w-full h-full"
        />
      </View>
    </View>
  );
}

