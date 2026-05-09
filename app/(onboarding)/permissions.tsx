/**
 * Permissions (file 07).
 *
 * Camera permission requested here. Notifications permission deferred until
 * post-baseline reveal (file 12 canonical timing). Photos permission deferred
 * until first share (file 13 lazy-permission rule).
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { Body, HeadlineSerif } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import {
  OnboardingAccentRule,
  OnboardingAnimatedEnter,
  OnboardingFooter,
} from '@/components/onboarding/OnboardingChrome';
import { Spacing } from '@/theme/spacing';

export default function Permissions() {
  const router = useRouter();
  return (
    <Screen variant="secondary">
      <OnboardingAnimatedEnter style={{ flex: 1, justifyContent: 'center' }}>
        <OnboardingAccentRule />
        <HeadlineSerif style={{ marginBottom: Spacing.lg }}>Camera access</HeadlineSerif>
        <Body tone="secondary">
          Vela uses your camera to capture weekly face scans using AR alignment. Photos stay on
          your device.
        </Body>
      </OnboardingAnimatedEnter>
      <OnboardingFooter>
        <Button
          label="Allow camera"
          size="xl"
          fullWidth
          onPress={() => router.replace('/(capture)/capture?isBaseline=true')}
        />
      </OnboardingFooter>
    </Screen>
  );
}
