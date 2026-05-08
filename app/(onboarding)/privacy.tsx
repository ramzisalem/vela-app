/**
 * Privacy primer (file 07 + 16).
 *
 * Three pillars in plain English. Inserted automatically between section C
 * and section D of the question stepper.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Caption, Headline, HeadlineSerif } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
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
    <Screen>
      <ScrollView contentContainerStyle={{ paddingTop: Spacing.lg, paddingBottom: Spacing.xxl }}>
        <Caption tone="secondary">A short pause</Caption>
        <HeadlineSerif style={{ marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
          How we treat your data.
        </HeadlineSerif>
        {PILLARS.map((p) => (
          <Card key={p.title} style={{ marginBottom: Spacing.base }}>
            <Headline>{p.title}</Headline>
            <Body tone="secondary" style={{ marginTop: Spacing.sm }}>
              {p.body}
            </Body>
          </Card>
        ))}
        <Body tone="secondary" style={{ marginTop: Spacing.base }}>
          A few more questions to make your routine fit you, and you’re ready for your baseline scan.
        </Body>
      </ScrollView>
      <View style={{ paddingBottom: Spacing.xl }}>
        <Button
          label="Continue"
          fullWidth
          onPress={() => {
            // Resume the stepper from where it was.
            setIndex(currentIndex + 1);
            router.replace('/(onboarding)/questions');
          }}
        />
      </View>
    </Screen>
  );
}
