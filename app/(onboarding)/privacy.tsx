/**
 * Privacy primer (file 07 + 16).
 *
 * Three pillars in plain English. Inserted automatically between section C
 * and section D of the question stepper.
 */
import React from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Caption, Headline, HeadlineSerif } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import {
  OnboardingAccentRule,
  OnboardingAnimatedEnter,
  OnboardingFooter,
} from '@/components/onboarding/OnboardingChrome';
import { Spacing } from '@/theme/spacing';
import { useOnboardingStore } from '@/stores/onboardingStore';

const PILLARS = [
  {
    title: 'Photos stay on your device.',
    body:
      'Your scan photos and depth data never leave your phone. Only numeric measurements are sent to compute your scores.',
  },
  {
    title: 'AI never sees your face.',
    body:
      'We send numbers, not pictures. Score explanations come from the metrics, not the imagery.',
  },
  {
    title: 'You own this data.',
    body:
      'Export at any time. Delete in two taps. We never sell anything you give us. Ever.',
  },
];

export default function Privacy() {
  const router = useRouter();
  const setIndex = useOnboardingStore((s) => s.setIndex);
  const currentIndex = useOnboardingStore((s) => s.currentIndex);

  return (
    <Screen variant="secondary">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: Spacing.xl, paddingBottom: Spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingAnimatedEnter>
          <OnboardingAccentRule />
          <Caption tone="tertiary">A short pause</Caption>
          <HeadlineSerif style={{ marginTop: Spacing.md, marginBottom: Spacing.xl }}>
            How we treat your data.
          </HeadlineSerif>
          {PILLARS.map((p) => (
            <Card key={p.title} shadow="lift" style={{ marginBottom: Spacing.md }}>
              <Headline>{p.title}</Headline>
              <Body tone="secondary" style={{ marginTop: Spacing.sm }}>
                {p.body}
              </Body>
            </Card>
          ))}
          <Body tone="secondary" style={{ marginTop: Spacing.lg }}>
            Next, optional questions about what you use day to day and how you live — skip anything you
            like. Your scan photos still stay on this device.
          </Body>
        </OnboardingAnimatedEnter>
      </ScrollView>
      <OnboardingFooter>
        <Button
          label="Continue"
          size="xl"
          fullWidth
          onPress={() => {
            setIndex(currentIndex + 1);
            router.replace('/(onboarding)/questions');
          }}
        />
      </OnboardingFooter>
    </Screen>
  );
}
