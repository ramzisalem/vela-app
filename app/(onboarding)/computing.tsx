/**
 * Computing — LazyFit's iconic loading-as-proof moment.
 *
 * A circular percent ring fills from 0 → 100, a list of personalisation
 * tasks ticks off one by one ("Calibrating your baseline" → ✓), and a soft
 * brand stat sits below ("500,000+ users have chosen Vela"). When the ring
 * reaches 100, auto-advance to the Well-Done confetti screen.
 *
 * No user interaction. Pure narrative. Should feel like the app is *doing*
 * real work for them — because it is (we read their answers + queue the
 * plan).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Body, Caption, Text } from '@/components/ui/Text';
import { OnboardingScene } from '@/components/onboarding/OnboardingScene';
import { EmphasisHeadline } from '@/components/onboarding/EmphasisHeadline';
import { useColors } from '@/theme/ThemeContext';
import { Radii, Spacing } from '@/theme/spacing';
import { Typography } from '@/theme/typography';
import { AnimationDuration } from '@/theme/animations';

const ACircle = Animated.createAnimatedComponent(Circle);

const TASKS = [
  'Calibrating your baseline',
  'Tuning to your goals',
  'Matching your time budget',
  'Locking your plan',
] as const;

const TOTAL_DURATION_MS = 5200;

function PercentRing({
  percent,
  size = 220,
  stroke = 10,
}: {
  percent: number; // 0..100
  size?: number;
  stroke?: number;
}) {
  const colors = useColors();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = useSharedValue(0);

  useEffect(() => {
    target.value = withTiming(percent / 100, {
      duration: TOTAL_DURATION_MS,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
  }, [percent, target]);

  const offset = useDerivedValue(() => c * (1 - target.value));
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border.subtle}
          strokeWidth={stroke}
          fill="none"
        />
        <ACircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.accent.default}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c}, ${c}`}
          animatedProps={ringProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <PercentText />
        <Caption tone="tertiary" style={{ marginTop: 4 }}>
          Building your plan
        </Caption>
      </View>
    </View>
  );
}

function PercentText() {
  const colors = useColors();
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const t = Math.max(0, Math.min(1, (Date.now() - start) / TOTAL_DURATION_MS));
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(100 * eased));
      if (Date.now() - start < TOTAL_DURATION_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <Text
      style={{
        ...Typography.scoreNumeric,
        fontSize: 56,
        lineHeight: 60,
        color: colors.text.primary,
      }}
    >
      {n}%
    </Text>
  );
}

function TaskRow({
  label,
  done,
  delay,
}: {
  label: string;
  done: boolean;
  delay: number;
}) {
  const colors = useColors();
  return (
    <Animated.View
      entering={FadeInUp.duration(360).delay(delay)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.sm,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done ? colors.accent.default : 'transparent',
          borderWidth: done ? 0 : 1.5,
          borderColor: colors.border.strong,
        }}
      >
        {done ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
      <Body
        tone={done ? 'primary' : 'tertiary'}
        style={{ fontSize: 15, lineHeight: 20, fontWeight: done ? '600' : '400' }}
      >
        {label}
      </Body>
    </Animated.View>
  );
}

export default function Computing() {
  const router = useRouter();
  const colors = useColors();
  const [doneIdx, setDoneIdx] = useState(-1);

  // Stagger task completion so the last task ticks just before 100%.
  useEffect(() => {
    const perTask = TOTAL_DURATION_MS / (TASKS.length + 1);
    const timers = TASKS.map((_, i) =>
      setTimeout(() => setDoneIdx(i), perTask * (i + 1)),
    );
    const advance = setTimeout(() => {
      router.replace('/(onboarding)/well-done' as never);
    }, TOTAL_DURATION_MS + 400);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(advance);
    };
  }, [router]);

  const taskDelays = useMemo(() => TASKS.map((_, i) => 120 + i * 220), []);

  return (
    <OnboardingScene>
      <View style={{ flex: 1, justifyContent: 'space-between', paddingTop: Spacing.xl, paddingBottom: Spacing.xxl }}>
        {/* Title */}
        <Animated.View entering={FadeIn.duration(AnimationDuration.base)}>
          <EmphasisHeadline size={26}>Creating your **personal plan**</EmphasisHeadline>
        </Animated.View>

        {/* Ring */}
        <Animated.View
          entering={FadeIn.duration(500).delay(160)}
          style={{ alignItems: 'center' }}
        >
          <PercentRing percent={100} />
        </Animated.View>

        {/* Task list */}
        <View>
          {TASKS.map((t, i) => (
            <TaskRow key={t} label={t} done={i <= doneIdx} delay={taskDelays[i]!} />
          ))}
        </View>

        {/* Soft brand stat at the bottom */}
        <Animated.View
          entering={FadeInUp.duration(440).delay(420)}
          style={{
            alignItems: 'center',
            paddingTop: Spacing.md,
            paddingBottom: Spacing.md,
            borderRadius: Radii.lg,
            backgroundColor: colors.surface.raised,
          }}
        >
          <Text variant="bodyEmphasis" tone="primary" style={{ fontSize: 16, fontWeight: '600' }}>
            500,000+
          </Text>
          <Caption tone="secondary" style={{ marginTop: 2 }}>
            users have built a plan with Vela
          </Caption>
        </Animated.View>
      </View>
    </OnboardingScene>
  );
}
