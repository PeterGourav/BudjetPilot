import { useBudgetContext } from "@/hooks/BudgetContext";
import {
  getSubscriptions,
  saveSubscriptions,
  type Subscription,
} from "@/services/database";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const QUICK_PICKS = [
  { name: "Netflix", defaultAmount: 15.99 },
  { name: "Spotify/Apple Music", defaultAmount: 10.99 },
  { name: "Amazon Prime", defaultAmount: 14.99 },
  { name: "iCloud/Google Storage", defaultAmount: 2.99 },
  { name: "Gym", defaultAmount: 49.99 },
  { name: "Gaming subscription", defaultAmount: 9.99 },
  { name: "Other", defaultAmount: 0 },
];

export default function SubscriptionsScreen() {
  const params = useLocalSearchParams();
  const isEditMode = params.mode === "edit";
  const [selectedSubs, setSelectedSubs] = useState<Record<string, number>>({});
  const [customSubs, setCustomSubs] = useState<Subscription[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const { refresh } = useBudgetContext();

  useEffect(() => {
    if (isEditMode) {
      loadExistingData();
    }
  }, [isEditMode]);

  const loadExistingData = async () => {
    const existing = await getSubscriptions();
    if (existing && existing.length > 0) {
      // Load existing subscriptions
      const subsMap: Record<string, number> = {};
      const custom: Subscription[] = [];

      existing.forEach((sub) => {
        const quickPick = QUICK_PICKS.find((p) => p.name === sub.name);
        if (quickPick) {
          subsMap[sub.name] = sub.amountMonthly;
        } else {
          custom.push(sub);
        }
      });

      setSelectedSubs(subsMap);
      setCustomSubs(custom);
    }
  };

  const toggleSubscription = (name: string, defaultAmount: number) => {
    if (selectedSubs[name] !== undefined) {
      const updated = { ...selectedSubs };
      delete updated[name];
      setSelectedSubs(updated);
    } else {
      setSelectedSubs({ ...selectedSubs, [name]: defaultAmount });
    }
  };

  const updateAmount = (name: string, amount: number) => {
    setSelectedSubs({ ...selectedSubs, [name]: amount });
  };

  const addCustomSubscription = () => {
    if (customName && customAmount) {
      setCustomSubs([
        ...customSubs,
        { name: customName, amountMonthly: parseFloat(customAmount) || 0 },
      ]);
      setCustomName("");
      setCustomAmount("");
      setShowCustomModal(false);
    }
  };

  const handleContinue = async () => {
    const subscriptions: Subscription[] = [
      ...Object.entries(selectedSubs).map(([name, amount]) => ({
        name,
        amountMonthly: amount,
      })),
      ...customSubs,
    ];
    await saveSubscriptions(subscriptions);
    await refresh();
    if (isEditMode) {
      router.back();
    } else {
      router.push("/onboarding/flexible");
    }
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 px-6 pt-12">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold mb-2">
              Subscriptions
            </Text>
            <Text className="text-white opacity-60">
              {isEditMode
                ? "Edit your subscriptions"
                : "Select any subscriptions you pay monthly. Edit amounts anytime."}
            </Text>
          </View>
          {isEditMode && (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View className="gap-3 mb-6">
          {QUICK_PICKS.map((pick) => (
            <View key={pick.name} className="bg-white rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-black font-semibold">{pick.name}</Text>
                <TouchableOpacity
                  onPress={() =>
                    toggleSubscription(pick.name, pick.defaultAmount)
                  }
                  className={`w-6 h-6 rounded border-2 ${
                    selectedSubs[pick.name] !== undefined
                      ? "bg-black border-black"
                      : "border-gray-400"
                  }`}
                >
                  {selectedSubs[pick.name] !== undefined && (
                    <View className="w-full h-full items-center justify-center">
                      <Text className="text-white text-xs">✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {selectedSubs[pick.name] !== undefined && (
                <View className="bg-gray-100 rounded-xl p-3 mt-2">
                  <TextInput
                    value={selectedSubs[pick.name]?.toString() || ""}
                    onChangeText={(text) =>
                      updateAmount(pick.name, parseFloat(text) || 0)
                    }
                    placeholder="0.00"
                    keyboardType="numeric"
                    style={{ color: "#000", fontSize: 18 }}
                    placeholderTextColor="#999"
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {customSubs.length > 0 && (
          <View className="mb-6">
            <Text className="text-white font-semibold mb-3">
              Custom Subscriptions
            </Text>
            {customSubs.map((sub, index) => (
              <View key={index} className="bg-white rounded-2xl p-4 mb-3">
                <Text className="text-black font-semibold">{sub.name}</Text>
                <Text className="text-black opacity-60">
                  ${sub.amountMonthly.toFixed(2)}/month
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => setShowCustomModal(true)}
          className="bg-gray-800 rounded-2xl p-4 items-center mb-6"
        >
          <Text className="text-white text-lg font-semibold">
            Add subscription
          </Text>
        </TouchableOpacity>

        <View className="flex-row gap-3 mb-8">
          <TouchableOpacity
            onPress={() => router.push("/onboarding/flexible")}
            className="flex-1 bg-gray-800 rounded-2xl p-4 items-center"
          >
            <Text className="text-white text-lg font-semibold">Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleContinue}
            className="flex-1 bg-white rounded-2xl p-4 items-center"
          >
            <Text className="text-black text-lg font-bold">Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showCustomModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-black rounded-t-3xl p-6">
            <Text className="text-white text-xl font-bold mb-4">
              Add Subscription
            </Text>
            <View className="mb-4">
              <Text className="text-white mb-2">Name</Text>
              <View className="bg-white rounded-2xl p-4">
                <TextInput
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="Subscription name"
                  style={{ color: "#000" }}
                  placeholderTextColor="#999"
                  autoFocus
                />
              </View>
            </View>
            <View className="mb-4">
              <Text className="text-white mb-2">Monthly Amount</Text>
              <View className="bg-white rounded-2xl p-4">
                <TextInput
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{ color: "#000" }}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowCustomModal(false)}
                className="flex-1 bg-gray-800 rounded-2xl p-4 items-center"
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={addCustomSubscription}
                className="flex-1 bg-white rounded-2xl p-4 items-center"
              >
                <Text className="text-black font-semibold">Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
