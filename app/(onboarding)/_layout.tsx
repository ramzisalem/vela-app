import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { DevSkipFAB } from '@/components/onboarding/DevSkipFAB';

export default function OnboardingLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          // File 23: onboarding is a forced linear stack — disable swipe-back gesture.
          gestureEnabled: false,
          animation: 'fade',
        }}
      />
      {/* Dev-only skip button overlays every onboarding screen. */}
      <DevSkipFAB />
    </View>
  );
}
