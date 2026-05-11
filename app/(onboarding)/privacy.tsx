/**
 * Privacy primer (file 07 + 16).
 *
 * Three pillars in plain English. Inserted automatically between section C
 * and D of the question stepper.
 *
 * LazyFit-inspired layout: centered headline with inline emphasis on the
 * topic word, a soft InfoCard explaining *why* this matters, then three
 * stacked white pillar cards (shadow-floating, with accent number markers).
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Body, Caption, Headline, Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { OnboardingScene } from '@/components/onboarding/OnboardingScene';
import { EmphasisHeadline } from '@/components/onboarding/EmphasisHeadline';
import { InfoCard } from '@/components/onboarding/InfoCard';
import { PrivacyShieldMark } from '@/components/onboarding/PrivacyShieldMark';
import { Layout, Radii, Spacing } from '@/theme/spacing';
import { AnimationDuration } from '@/theme/animations';
import { useColors, useThemeMode } from '@/theme/ThemeContext';
import { getShadow } from '@/theme/shadows';
import { useOnboardingStore } from '@/stores/onboardingStore';

const PILLARS = [
  { n: '01', title: 'Photos stay on this device.', body: 'Numbers sync. Pictures never do.' },
  { n: '02', title: 'AI never sees your face.', body: 'Scores come from metrics, not images.' },
  { n: '03', title: 'You own this data.', body: 'Export anytime. Delete in two taps.' },
] as const;

function PillarCard({
  numeral,
  title,
  body,
  index,
}: {
  numeral: string;
  title: string;
  body: string;
  index: number;
}) {
  const colors = useColors();
  const mode = useThemeMode();
  return (
    <Animated.View
      entering={FadeInUp.duration(420).delay(220 + index * 110)}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          paddingVertical: Spacing.lg,
          paddingHorizontal: Spacing.lg,
          borderRadius: Radii.lg,
          backgroundColor: colors.surface.raised,
          marginBottom: Spacing.md,
        },
        getShadow('soft', mode),
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent.background,
        }}
      >
        <Text variant="bodyEmphasis" style={{ color: colors.accent.default, fontSize: 14 }}>
          {numeral}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Headline style={{ fontSize: 17, lineHeight: 22 }}>{title}</Headline>
        <Body tone="secondary" style={{ marginTop: 2, fontSize: 14, lineHeight: 20 }}>
          {body}
        </Body>
      </View>
    </Animated.View>
  );
}

export default function Privacy() {
  const router = useRouter();
  const colors = useColors();
  const setIndex = useOnboardingStore((s) => s.setIndex);
  const currentIndex = useOnboardingStore((s) => s.currentIndex);

  return (
    <OnboardingScene
      footer={
        <View style={{ paddingBottom: Spacing.md }}>
          <Button
            label="I understand"
            variant="dark"
            size="xl"
            fullWidth
            onPress={() => {
              setIndex(currentIndex + 1);
              router.replace('/(onboarding)/questions');
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.sm,
              alignSelf: 'center',
              marginTop: Spacing.md,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.success.default,
              }}
            />
            <Caption tone="tertiary">End-to-end on your device</Caption>
          </View>
        </View>
      }
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: Spacing.lg, paddingBottom: Spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeIn.duration(AnimationDuration.base)}
          style={{ alignItems: 'center', marginBottom: Spacing.lg }}
        >
          <PrivacyShieldMark size={64} />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(440).delay(120)} style={{ marginBottom: Spacing.lg }}>
          <EmphasisHeadline size={30}>
            Yours. **Only yours**.
          </EmphasisHeadline>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(440).delay(180)} style={{ marginBottom: Spacing.xl }}>
          <InfoCard
            tone="success"
            body="Vela was built **on-device first**. Your photos never leave this phone — only the numbers do."
          />
        </Animated.View>

        <View style={{ marginTop: Spacing.sm }}>
          {PILLARS.map((p, i) => (
            <PillarCard key={p.n} numeral={p.n} title={p.title} body={p.body} index={i} />
          ))}
        </View>
        {/* Silence unused-import warning for Layout */}
        <View style={{ height: Layout.hairline }} />
      </ScrollView>
    </OnboardingScene>
  );
}
