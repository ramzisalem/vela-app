/**
 * Welcome (file 07). Editorial intro: serif headline + VelaPrimary CTA.
 * Sentence case throughout.
 */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Body, Caption, DisplaySerif } from '@/components/ui/Text';
import { Wordmark } from '@/components/brand';
import {
  OnboardingAccentRule,
  OnboardingAnimatedEnter,
  OnboardingFooter,
} from '@/components/onboarding/OnboardingChrome';
import { Spacing } from '@/theme/spacing';

const OUTCOMES = [
  'Same framing each week so changes are real',
  'Numbers first, opinions second',
  'Suggestions matched to the time you have',
] as const;

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen variant="secondary">
      <OnboardingAnimatedEnter style={{ flex: 1, justifyContent: 'center' }}>
        <Wordmark size="hero" variant="gradient" style={{ marginBottom: Spacing.xxxl }} />
        <OnboardingAccentRule />
        <DisplaySerif style={{ marginBottom: Spacing.lg }}>
          Track your face the way Oura tracks sleep.
        </DisplaySerif>
        <Body tone="secondary" style={{ marginBottom: Spacing.base }}>
          Weekly scans. Honest measurements. A routine that adapts to you.
        </Body>
        {OUTCOMES.map((line) => (
          <Body key={line} tone="secondary" style={{ marginBottom: Spacing.md }}>
            {'· '}
            {line}
          </Body>
        ))}
        <Caption tone="tertiary" style={{ marginTop: Spacing.lg }}>
          A short profile and goals, a baseline scan, then a fuller questionnaire after you see your
          scores. Optional depth unlocks after you save your account.
        </Caption>
      </OnboardingAnimatedEnter>
      <OnboardingFooter>
        <Button
          label="Begin"
          size="xl"
          fullWidth
          onPress={() => router.push('/(onboarding)/features-intro' as never)}
        />
        <Button
          label="I already have an account. Sign in."
          variant="ghost"
          fullWidth
          style={{ marginTop: Spacing.sm }}
          onPress={() => router.push('/sign-in')}
        />
      </OnboardingFooter>
    </Screen>
  );
}
