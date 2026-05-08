/**
 * Welcome (file 07). Editorial intro: serif headline + cream background +
 * VelaPrimary CTA. Sentence case throughout.
 */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Body, DisplaySerif } from '@/components/ui/Text';
import { Wordmark } from '@/components/brand';
import { Spacing } from '@/theme/spacing';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Wordmark size="hero" variant="gradient" style={{ marginBottom: Spacing.xxl }} />
        <DisplaySerif style={{ marginBottom: Spacing.lg }}>
          Track your face the way Oura tracks sleep.
        </DisplaySerif>
        <Body tone="secondary">
          Weekly scans. Honest measurements. A routine that adapts to you.
        </Body>
      </View>
      <View style={{ paddingBottom: Spacing.xl }}>
        <Button
          label="Begin"
          fullWidth
          onPress={() => router.push('/(onboarding)/questions')}
        />
      </View>
    </Screen>
  );
}
