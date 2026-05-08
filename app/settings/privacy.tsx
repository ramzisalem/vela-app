/**
 * Settings → Privacy details (file 06 + file 07).
 *
 * Shows what leaves the device, what stays on it, and the user's
 * concrete controls (export, delete, opt out of analytics). Plain
 * language, sourced from Docs/06_PROTECTION_MODEL.md.
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { useColors } from '@/theme';

const SECTIONS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'What stays on the device',
    body:
      'Every photo and 3D mesh from a scan stays on your phone. Vela never uploads them. The diary you write is local-first and only leaves the device if you explicitly export it.',
  },
  {
    title: 'What leaves the device',
    body:
      'Numeric metrics computed from each scan (symmetry score, redness, lighting band, etc.) leave the device when they sync to your account. AI insights run server-side on those numbers; the model never sees pictures of you.',
  },
  {
    title: 'HealthKit',
    body:
      'If you connect HealthKit, Vela reads daily summaries (steps, sleep, mindful minutes) on the device only. Aggregates flow into local correlation math; raw HealthKit data never leaves the phone.',
  },
  {
    title: 'Family Sharing',
    body:
      'Family Sharing only governs entitlement \u2014 it does not share data. Each family member has a separate, private account.',
  },
  {
    title: 'Analytics and crash reporting',
    body:
      'PostHog (EU host) and Sentry power product analytics and crash logs. We pseudonymize identifiers and never send the contents of your diary, scan photos, or face mesh.',
  },
  {
    title: 'Your controls',
    body:
      'You can export everything we hold and delete your account from Settings. Both options are unconditional \u2014 no save flow, no upsell.',
  },
];

export default function PrivacyDetails() {
  const colors = useColors();
  return (
    <Screen variant="secondary">
      <Stack.Screen options={{ title: 'Privacy details' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl, paddingTop: Spacing.lg }}>
        <HeadlineSerif>Privacy details</HeadlineSerif>
        <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
          The full version of what we say up front in the privacy primer. Same answers, longer. Nothing changes between summary and detail.
        </Body>
        {SECTIONS.map((s) => (
          <View
            key={s.title}
            style={[
              styles.section,
              { borderColor: colors.border.subtle, backgroundColor: colors.surface.raised },
            ]}
          >
            <Title>{s.title}</Title>
            <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
              {s.body}
            </Body>
          </View>
        ))}
        <Caption tone="tertiary" style={{ marginTop: Spacing.lg }}>
          Last updated April 30, 2026.
        </Caption>
      </ScrollView>
      <View style={{ padding: Spacing.lg }}>
        <Button variant="secondary" label="Back" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
});
