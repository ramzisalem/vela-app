/**
 * Permissions (file 07).
 *
 * Camera permission requested here. Notifications deferred until post-baseline
 * reveal (file 12). Photos deferred until first share (file 13).
 *
 * LazyFit-inspired: centered headline with inline emphasis, hero face mark,
 * single InfoCard explaining *why*, plus a short trust list of one-liners.
 */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Caption, Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { OnboardingScene } from '@/components/onboarding/OnboardingScene';
import { EmphasisHeadline } from '@/components/onboarding/EmphasisHeadline';
import { InfoCard } from '@/components/onboarding/InfoCard';
import { AnimatedFaceMark } from '@/components/onboarding/AnimatedFaceMark';
import { Radii, Spacing } from '@/theme/spacing';
import { AnimationDuration } from '@/theme/animations';
import { useColors } from '@/theme/ThemeContext';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TRUST_LINES: Array<{ icon: IoniconName; text: string }> = [
  { icon: 'phone-portrait-outline', text: 'Photos stay on this device.' },
  { icon: 'scan-outline', text: 'AR alignment matches each scan.' },
  { icon: 'time-outline', text: 'About 20 seconds per scan.' },
];

function TrustChip({ icon, text }: { icon: IoniconName; text: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: 6,
        paddingHorizontal: Spacing.md,
        borderRadius: Radii.pill,
        backgroundColor: colors.surface.raised,
      }}
    >
      <Ionicons name={icon} size={14} color={colors.text.primary} />
      <Text variant="caption" tone="primary" style={{ fontWeight: '500' }}>
        {text}
      </Text>
    </View>
  );
}

export default function Permissions() {
  const router = useRouter();

  return (
    <OnboardingScene
      footer={
        <View style={{ paddingBottom: Spacing.md }}>
          <Button
            label="Allow camera access"
            variant="dark"
            size="xl"
            fullWidth
            onPress={() => router.replace('/(capture)/capture?isBaseline=true')}
          />
          <Caption tone="tertiary" style={{ textAlign: 'center', marginTop: Spacing.md }}>
            You can revoke this anytime in Settings.
          </Caption>
        </View>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: Spacing.xl, gap: Spacing.lg }}>
        <Animated.View entering={FadeIn.duration(AnimationDuration.base)}>
          <EmphasisHeadline size={30}>Aim, and we&rsquo;ll **do the rest**.</EmphasisHeadline>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(440).delay(120)}>
          <InfoCard
            tone="warm"
            body="We need the camera to capture **AR-aligned** weekly scans. Same frame every time."
          />
        </Animated.View>

        <Animated.View entering={FadeIn.duration(560).delay(220)} style={{ alignItems: 'center' }}>
          <AnimatedFaceMark size={220} />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(440).delay(360)}
          style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.xs }}
        >
          {TRUST_LINES.map((t) => (
            <TrustChip key={t.text} icon={t.icon} text={t.text} />
          ))}
        </Animated.View>
      </View>
    </OnboardingScene>
  );
}
