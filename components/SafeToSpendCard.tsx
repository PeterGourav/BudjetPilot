import React from "react";
import { Text, View } from "react-native";

export default function SafeToSpendCard() {
  return (
    <View className="bg-white rounded-2xl p-4 w-[220px]">
      <Text className="text-base font-bold text-black">Safe to spend</Text>
      <Text className="text-4xl font-extrabold text-black mt-2">
        $1000
      </Text>
      <Text className="text-sm opacity-60 text-black mt-2">
        till the next paycheque
      </Text>
    </View>
  );
}

