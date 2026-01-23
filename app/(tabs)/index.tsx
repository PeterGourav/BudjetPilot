import React from "react";
import { View, Text } from "react-native";

function PaychequeCard() {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 16,
        width: 220,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700" }}>Next Paycheque</Text>
      <Text style={{ fontSize: 36, fontWeight: "800", marginTop: 10 }}>
        2,000
      </Text>
      <Text style={{ fontSize: 13, opacity: 0.6, marginTop: 8 }}>
        on 30th March
      </Text>
    </View>
  );
}

export default function Dashboard() {
  return (
    <View style={{ flex: 1, backgroundColor: "#000", padding: 16 }}>
      <PaychequeCard />
    </View>
  );
}
