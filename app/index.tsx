/**
 * Entry router — reads the AppState flow machine and redirects.
 */
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAppState } from '@/stores/appStateStore';
import { useColors } from '@/theme/ThemeContext';

export default function Index() {
  const { flow, isLoading } = useAppState();
  const colors = useColors();

  if (isLoading || flow === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.primary }}>
        <ActivityIndicator color={colors.text.accent} />
      </View>
    );
  }

  switch (flow) {
    case 'onboarding':
      return <Redirect href="/(onboarding)/welcome" />;
    case 'capture':
      return <Redirect href="/(capture)/capture" />;
    case 'paywall':
      return <Redirect href="/paywall" />;
    case 'subscription_required':
      return <Redirect href="/subscription-required" />;
    case 'lapsed_grace':
    case 'lapsed_readonly':
    case 'main':
    default:
      return <Redirect href="/(main)/dashboard" />;
  }
}
