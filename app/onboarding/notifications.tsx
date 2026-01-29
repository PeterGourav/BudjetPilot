import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { saveNotifications } from '@/services/database';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

export default function NotificationsScreen() {
  const [enabled, setEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Set default time to 9pm
  React.useEffect(() => {
    const defaultTime = new Date();
    defaultTime.setHours(21, 0, 0, 0);
    setNotificationTime(defaultTime);
  }, []);

  const handleGoToDashboard = async () => {
    if (enabled) {
      const timeString = `${notificationTime.getHours().toString().padStart(2, '0')}:${notificationTime.getMinutes().toString().padStart(2, '0')}`;
      await saveNotifications(true, timeString);
    } else {
      await saveNotifications(false);
    }
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 px-6 pt-12">
        <Text className="text-white text-2xl font-bold mb-2">Notifications</Text>
        <Text className="text-white opacity-60 mb-6">
          Want a daily reminder to log spending?
        </Text>

        <View className="gap-4 mb-6">
          <TouchableOpacity
            onPress={() => {
              setEnabled(true);
              setShowTimePicker(true);
            }}
            className={`rounded-2xl p-4 ${enabled ? 'bg-white' : 'bg-gray-800'}`}
          >
            <Text
              className={`text-lg font-semibold ${enabled ? 'text-black' : 'text-white'}`}
            >
              Enable reminders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setEnabled(false)}
            className={`rounded-2xl p-4 ${!enabled ? 'bg-white' : 'bg-gray-800'}`}
          >
            <Text
              className={`text-lg font-semibold ${!enabled ? 'text-black' : 'text-white'}`}
            >
              Not now
            </Text>
          </TouchableOpacity>
        </View>

        {enabled && (
          <View className="mb-6">
            <Text className="text-white font-semibold mb-3">Reminder Time</Text>
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              className="bg-white rounded-2xl p-4"
            >
              <Text className="text-black text-xl">
                {notificationTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={notificationTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') {
                    setShowTimePicker(false);
                  }
                  if (date) setNotificationTime(date);
                }}
              />
            )}
          </View>
        )}

        <TouchableOpacity
          onPress={handleGoToDashboard}
          className="bg-white rounded-2xl p-4 items-center mb-8"
        >
          <Text className="text-black text-lg font-bold">Go to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
