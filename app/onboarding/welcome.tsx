import { router } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { initDatabase, setOnboardingCompleted } from '@/services/database';

export default function WelcomeScreen() {
  const handleGetStarted = () => {
    router.push('/onboarding/income');
  };

  const handleSkip = async () => {
    await initDatabase();
    await setOnboardingCompleted(true);
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1 bg-black justify-center items-center px-6">
      <View className="items-center mb-12">
        <Text className="text-white text-4xl font-bold mb-4">BudgetPilot</Text>
        <Text className="text-white text-lg text-center opacity-80">
          Know what you can spend today.
        </Text>
      </View>

      <View className="w-full gap-4">
        <TouchableOpacity
          onPress={handleGetStarted}
          className="bg-white rounded-2xl p-4 items-center"
        >
          <Text className="text-black text-lg font-bold">Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          className="bg-gray-800 rounded-2xl p-4 items-center"
        >
          <Text className="text-white text-lg font-bold">I'll set up later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
