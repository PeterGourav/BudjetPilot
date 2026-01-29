import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { initDatabase, getOnboardingStatus } from '@/services/database';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        await initDatabase();
        const completed = await getOnboardingStatus();
        
        if (completed) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding/welcome');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        router.replace('/onboarding/welcome');
      } finally {
        setIsLoading(false);
      }
    }

    checkOnboarding();
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return null;
}
