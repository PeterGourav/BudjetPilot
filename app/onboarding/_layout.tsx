import { Stack } from 'expo-router';
import React from 'react';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="income" />
      <Stack.Screen name="fixed" />
      <Stack.Screen name="subscriptions" />
      <Stack.Screen name="flexible" />
      <Stack.Screen name="savings" />
      <Stack.Screen name="debt" />
      <Stack.Screen name="summary" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
