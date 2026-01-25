import CanSpendCard from "@/components/CanSpendCard";
import Header from "@/components/Header";
import PaychequeCard from "@/components/PaychequeCard";
import SafeToSpendCard from "@/components/SafeToSpendCard";
import React from "react";
import { ScrollView, View } from "react-native";

export default function Dashboard() {
  return (
    <View className="flex-1 bg-black">
      <Header />
      <ScrollView className="flex-1 px-4">
        <View className="flex-row gap-4 mt-4">
          <PaychequeCard />
          <SafeToSpendCard />
        </View>
        <CanSpendCard />
      </ScrollView>
    </View>
  );
}
