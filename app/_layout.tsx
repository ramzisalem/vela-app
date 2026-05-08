/**
 * Root layout (file 01 + 31).
 *
 * INITIALIZATION ORDER (do not reorder):
 *   1. RevenueCat (no IDFA dependency — safe at launch)
 *   2. Supabase + WatermelonDB
 *   3. Sentry / PostHog
 *
 * SINGULAR (file 31) is intentionally NOT initialized here. It must wait
 * until ATT consent resolves, AFTER baseline scan reveal. See
 * `useSingularPostBaselineInit()`.
 */
import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeContext';
import { ThemedStatusBar } from '@/components/ui/ThemedStatusBar';
import { ToastHost } from '@/components/feedback/ToastHost';
import { initializeServices } from '@/services/initialize';
import { setDeepLinkRouter, startDeepLinkListener } from '@/services/deepLinks';
import { SyncOrchestrator } from '@/services/sync/SyncOrchestrator';
import { isTestBuild, testFlags } from '@/config/testMode';

export default function RootLayout() {
  const router = useRouter();
  useEffect(() => {
    if (__DEV__ && isTestBuild) {
      console.log('[Vela] EXPO_PUBLIC_TEST_BUILD: harness flags', {
        mockUserScenario: testFlags.mockUserScenario,
        useMockAR: testFlags.useMockAR,
        mockDateIso: testFlags.mockDateIso,
      });
    }
    void initializeServices();
    setDeepLinkRouter(router);
    startDeepLinkListener();
    void SyncOrchestrator.flushPending();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedStatusBar />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(capture)" />
            <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="subscription-required" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
            <Stack.Screen name="(main)" />
            <Stack.Screen name="share-comparison" options={{ presentation: 'modal' }} />
            <Stack.Screen name="wrapped" options={{ presentation: 'modal' }} />
            <Stack.Screen name="diary/index" />
            <Stack.Screen name="experiment/index" />
            <Stack.Screen name="experiment/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="experiment/[id]" />
            <Stack.Screen name="journal/index" />
            <Stack.Screen name="journal/[slug]" />
            <Stack.Screen name="health/index" />
            <Stack.Screen name="treatment/index" />
            <Stack.Screen name="treatment/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="treatment/[id]" />
            <Stack.Screen name="hair/index" />
            <Stack.Screen name="hair/capture" />
            <Stack.Screen name="settings/evidence" />
            <Stack.Screen name="settings/privacy" />
            <Stack.Screen name="settings/life-stage" />
          </Stack>
          <ToastHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
