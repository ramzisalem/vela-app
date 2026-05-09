import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // File 23: onboarding is a forced linear stack — disable swipe-back gesture.
        gestureEnabled: false,
        animation: 'fade',
      }}
    />
  );
}
