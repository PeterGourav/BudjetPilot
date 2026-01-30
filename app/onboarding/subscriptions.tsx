import { SettingsAccent } from "@/constants/theme";
import { useBudgetContext } from "@/hooks/BudgetContext";
import {
    getSubscriptions,
    saveSubscriptions,
    type Subscription,
} from "@/services/database";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

function buildSubsList(
  selectedSubs: Record<string, number>,
  customSubs: Subscription[],
): Subscription[] {
  return [
    ...Object.entries(selectedSubs).map(([name, amount]) => ({
      name,
      amountMonthly: amount,
    })),
    ...customSubs,
  ];
}

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

  const saveAndRefresh = useCallback(
    async (subs: Subscription[]) => {
      await saveSubscriptions(subs);
      await refresh();
    },
    [refresh],
  );

  const toggleSubscription = (name: string, defaultAmount: number) => {
    let updated: Record<string, number>;
    if (selectedSubs[name] !== undefined) {
      updated = { ...selectedSubs };
      delete updated[name];
    } else {
      updated = { ...selectedSubs, [name]: defaultAmount };
    }
    setSelectedSubs(updated);
    if (isEditMode) {
      const list = buildSubsList(updated, customSubs);
      saveAndRefresh(list);
    }
  };

  const updateAmount = (name: string, amount: number) => {
    const updated = { ...selectedSubs, [name]: amount };
    setSelectedSubs(updated);
    if (isEditMode) {
      const list = buildSubsList(updated, customSubs);
      saveAndRefresh(list);
    }
  };

  const addCustomSubscription = () => {
    if (customName && customAmount) {
      const newCustom = [
        ...customSubs,
        { name: customName, amountMonthly: parseFloat(customAmount) || 0 },
      ];
      setCustomSubs(newCustom);
      setCustomName("");
      setCustomAmount("");
      setShowCustomModal(false);
      if (isEditMode) {
        const list = buildSubsList(selectedSubs, newCustom);
        saveAndRefresh(list);
      }
    }
  };

  const handleContinue = async () => {
    const subscriptions = buildSubsList(selectedSubs, customSubs);
    await saveSubscriptions(subscriptions);
    await refresh();
    router.push("/onboarding/flexible");
  };

  const cardStyle = {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: SettingsAccent,
    backgroundColor: "transparent" as const,
  };

  const inputStyle = {
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: SettingsAccent,
    backgroundColor: "rgba(34, 197, 94, 0.1)" as const,
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
            <View key={pick.name} style={cardStyle}>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white font-semibold">{pick.name}</Text>
                <TouchableOpacity
                  onPress={() =>
                    toggleSubscription(pick.name, pick.defaultAmount)
                  }
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      selectedSubs[pick.name] !== undefined
                        ? SettingsAccent
                        : "rgba(255,255,255,0.4)",
                    backgroundColor:
                      selectedSubs[pick.name] !== undefined
                        ? SettingsAccent
                        : "transparent",
                  }}
                >
                  {selectedSubs[pick.name] !== undefined && (
                    <View className="w-full h-full items-center justify-center">
                      <Text className="text-black text-xs">✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {selectedSubs[pick.name] !== undefined && (
                <View style={inputStyle} className="mt-2">
                  <TextInput
                    value={selectedSubs[pick.name]?.toString() || ""}
                    onChangeText={(text) =>
                      updateAmount(pick.name, parseFloat(text) || 0)
                    }
                    placeholder="0.00"
                    keyboardType="numeric"
                    style={{ color: SettingsAccent, fontSize: 18 }}
                    placeholderTextColor="rgba(34, 197, 94, 0.5)"
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
              <View key={index} style={{ ...cardStyle, marginBottom: 12 }}>
                <Text className="text-white font-semibold">{sub.name}</Text>
                <Text style={{ color: SettingsAccent, opacity: 0.9 }}>
                  ${sub.amountMonthly.toFixed(2)}/month
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => setShowCustomModal(true)}
          style={{
            ...cardStyle,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Text
            style={{ color: SettingsAccent, fontSize: 18, fontWeight: "600" }}
          >
            Add subscription
          </Text>
        </TouchableOpacity>

        {!isEditMode && (
          <View className="flex-row gap-3 mb-8">
            <TouchableOpacity
              onPress={() => router.push("/onboarding/flexible")}
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
                style={{
                  color: SettingsAccent,
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                Skip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleContinue}
              style={{
                flex: 1,
                backgroundColor: SettingsAccent,
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text className="text-black text-lg font-bold">Continue</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showCustomModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View
            style={{
              backgroundColor: "#111",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              borderTopWidth: 2,
              borderColor: SettingsAccent,
            }}
          >
            <Text className="text-white text-xl font-bold mb-4">
              Add Subscription
            </Text>
            <View className="mb-4">
              <Text className="text-white mb-2">Name</Text>
              <View style={inputStyle}>
                <TextInput
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="Subscription name"
                  style={{ color: "#fff" }}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  autoFocus
                />
              </View>
            </View>
            <View className="mb-4">
              <Text className="text-white mb-2">Monthly Amount</Text>
              <View style={inputStyle}>
                <TextInput
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{ color: "#fff" }}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
              </View>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowCustomModal(false)}
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
                <Text style={{ color: SettingsAccent, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={addCustomSubscription}
                style={{
                  flex: 1,
                  backgroundColor: SettingsAccent,
                  borderRadius: 16,
                  padding: 16,
                  alignItems: "center",
                }}
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
