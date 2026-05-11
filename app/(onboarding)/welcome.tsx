/**
 * Welcome (file 07).
 *
 * Inspired by LazyFit's stats-lockup intro: three big credibility numbers
 * each framed by hairline laurel wreaths, then the "let's begin" hero copy
 * with the VelaPrimary CTA. Single-column, centered, very breathable.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Body, Caption, DisplaySerif, Text } from '@/components/ui/Text';
import { Wordmark } from '@/components/brand';
import { OnboardingScene } from '@/components/onboarding/OnboardingScene';
import { CTASheen } from '@/components/onboarding/CTASheen';
import { useColors } from '@/theme/ThemeContext';
import { Spacing } from '@/theme/spacing';
import { AnimationDuration } from '@/theme/animations';
import { FONT_SERIF } from '@/theme/typography';

/* ── Hairline laurel wreath (left + right mirror) ───────────────────── */
function Wreath({ side, size = 70 }: { side: 'left' | 'right'; size?: number }) {
  const colors = useColors();
  // Five thin curved leaves stacked vertically — a stylised laurel.
  const leaves = [
    'M 30 8 Q 14 14 10 28',
    'M 32 24 Q 14 30 10 44',
    'M 34 42 Q 16 48 12 62',
    'M 36 60 Q 18 66 16 80',
    'M 40 80 Q 24 86 22 100',
  ];
  const flip = side === 'right' ? { transform: [{ scaleX: -1 }] } : undefined;
  return (
    <Svg
      width={size}
      height={size * 1.45}
      viewBox="0 0 56 110"
      style={flip as never}
    >
      {leaves.map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={colors.text.primary}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

/* ── A single stat with the wreath framing ──────────────────────────── */
function StatBlock({
  number,
  label,
  decoration,
  delay,
}: {
  number: string;
  label: string;
  decoration?: React.ReactNode;
  delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInUp.duration(500).delay(delay).easing(Easing.out(Easing.cubic))}
      style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: Spacing.md }}
    >
      <Wreath side="left" />
      <View style={{ alignItems: 'center', minWidth: 160 }}>
        <Text
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 36,
            lineHeight: 40,
            fontWeight: '500',
            textAlign: 'center',
          }}
        >
          {number}
        </Text>
        {decoration ? <View style={{ marginVertical: 2 }}>{decoration}</View> : null}
        <Body tone="secondary" style={{ textAlign: 'center' }}>
          {label}
        </Body>
      </View>
      <Wreath side="right" />
    </Animated.View>
  );
}

function StarRow() {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons key={i} name="star" size={12} color={colors.warning.default} />
      ))}
    </View>
  );
}

/* ── Soft breathing dot for "tracking now" ──────────────────────────── */
function BreathingDot() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(t);
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + 0.55 * t.value }));
  const colors = useColors();
  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success.default },
        style,
      ]}
    />
  );
}

export default function Welcome() {
  const router = useRouter();
  const colors = useColors();

  return (
    <OnboardingScene
      footer={
        <View style={{ paddingBottom: Spacing.md }}>
          <CTASheen height={64}>
            <Button
              label="Continue"
              size="xl"
              fullWidth
              onPress={() => router.push('/(onboarding)/features-intro' as never)}
            />
          </CTASheen>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md }}>
            <Text variant="caption" tone="secondary">
              I already have an account ·{' '}
            </Text>
            <Text
              variant="caption"
              tone="accent"
              style={{ fontWeight: '600' }}
              onPress={() => router.push('/sign-in')}
            >
              Log in
            </Text>
          </View>
        </View>
      }
    >
      <View style={{ flex: 1, justifyContent: 'space-between', paddingTop: Spacing.lg }}>
        {/* Top — wordmark */}
        <Animated.View
          entering={FadeIn.duration(AnimationDuration.base)}
          style={{ alignItems: 'center', marginTop: Spacing.xl }}
        >
          <Wordmark size="large" variant="gradient" />
        </Animated.View>

        {/* Middle — three wreath-framed stats */}
        <View style={{ gap: Spacing.xl, marginVertical: Spacing.xl }}>
          <StatBlock number="500,000+" label="users' choice" delay={120} />
          <StatBlock
            number="40,000+"
            decoration={<StarRow />}
            label="5-star ratings"
            delay={260}
          />
          <StatBlock number="12 metrics" label="measured each week" delay={400} />
        </View>

        {/* Bottom — promise + live dot */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(560).easing(Easing.out(Easing.cubic))}
          style={{ alignItems: 'center', paddingHorizontal: Spacing.lg }}
        >
          <DisplaySerif style={[styles.promise, { color: colors.text.primary }]}>
            Let&rsquo;s begin with a few questions to{' '}
            <Text style={[styles.promise, { fontStyle: 'italic', color: colors.accent.default }]}>
              build your plan
            </Text>
            .
          </DisplaySerif>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md }}>
            <BreathingDot />
            <Caption tone="tertiary">12,000+ tracking right now</Caption>
          </View>
        </Animated.View>
      </View>
    </OnboardingScene>
  );
}

const styles = StyleSheet.create({
  promise: {
    fontFamily: FONT_SERIF,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    fontWeight: '500',
  },
});
