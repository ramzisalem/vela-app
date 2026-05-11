/**
 * Profile-ready — pre-paywall plan reveal.
 *
 * Inspired by LazyFit's projection-chart screen ("We predict you'll be
 * 58.9kg by 1 Aug"). For Vela this becomes: "By [date 8 weeks out] your
 * score is projected to be **84**" with an animated curve, a date pill
 * floating at the end of the line, and below it a personalisation chip
 * cluster + plan preview (one item locked to set up the paywall).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Body, Caption, Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { OnboardingScene } from '@/components/onboarding/OnboardingScene';
import { EmphasisHeadline } from '@/components/onboarding/EmphasisHeadline';
import { InfoCard } from '@/components/onboarding/InfoCard';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useColors, useThemeMode } from '@/theme/ThemeContext';
import { Layout, Radii, Spacing } from '@/theme/spacing';
import { Typography } from '@/theme/typography';
import { getShadow } from '@/theme/shadows';
import { AnimationDuration } from '@/theme/animations';
import type { ComponentProps } from 'react';

const ACircle = Animated.createAnimatedComponent(Circle);
const APath = Animated.createAnimatedComponent(Path);
type IoniconName = ComponentProps<typeof Ionicons>['name'];

/* ─ Projection chart ──────────────────────────────────────────────────── */

const PROJ_VALUES = [60, 62, 65, 67, 70, 74, 78, 84] as const;

function buildPath(
  values: ReadonlyArray<number>,
  w: number,
  h: number,
  padTop = 24,
  padBottom = 24,
): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = w / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = padTop + (1 - (v - min) / range) * (h - padTop - padBottom);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function inEightWeeks(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7 * 8);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ProjectionChart() {
  const colors = useColors();
  const mode = useThemeMode();
  const W = 300;
  const H = 180;
  const draw = useSharedValue(900);
  const dot = useSharedValue(0);
  const bubble = useSharedValue(0);

  const path = useMemo(() => buildPath(PROJ_VALUES, W, H), []);
  const lastIdx = PROJ_VALUES.length - 1;
  const stepX = W / (PROJ_VALUES.length - 1);
  const min = Math.min(...PROJ_VALUES);
  const max = Math.max(...PROJ_VALUES);
  const range = Math.max(1, max - min);
  const lastY = 24 + (1 - (PROJ_VALUES[lastIdx]! - min) / range) * (H - 48);
  const lastX = lastIdx * stepX;

  useEffect(() => {
    draw.value = withTiming(0, { duration: 1700, easing: Easing.bezier(0.2, 0, 0, 1) });
    dot.value = withDelay(1700, withTiming(1, { duration: 320 }));
    bubble.value = withDelay(1900, withTiming(1, { duration: 440, easing: Easing.out(Easing.cubic) }));
  }, [draw, dot, bubble]);

  const pathProps = useAnimatedProps(() => ({ strokeDashoffset: draw.value }));
  const dotProps = useAnimatedProps(() => ({
    r: 6 * dot.value,
    opacity: dot.value,
  }));
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubble.value,
    transform: [{ translateY: -10 * (1 - bubble.value) }],
  }));

  return (
    <View
      style={[
        {
          width: '100%',
          padding: Spacing.lg,
          borderRadius: Radii.xl,
          backgroundColor: colors.surface.raised,
        },
        getShadow('lift', mode),
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: Spacing.sm,
        }}
      >
        <Text variant="label" tone="tertiary" style={{ letterSpacing: 1.6 }}>
          Projected Vela score
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: Spacing.sm,
            paddingVertical: 4,
            borderRadius: Radii.pill,
            backgroundColor: colors.success.background,
          }}
        >
          <Ionicons name="trending-up" size={12} color={colors.success.default} />
          <Text variant="caption" style={{ color: colors.success.default, fontWeight: '600' }}>
            +24
          </Text>
        </View>
      </View>

      <View style={{ position: 'relative' }}>
        <Svg width={W} height={H}>
          <Line
            x1={0}
            y1={H / 2}
            x2={W}
            y2={H / 2}
            stroke={colors.border.subtle}
            strokeDasharray="2,4"
            strokeWidth={0.5}
          />
          <APath
            d={path}
            stroke={colors.accent.default}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={900}
            animatedProps={pathProps}
          />
          <ACircle cx={lastX} cy={lastY} fill={colors.accent.default} animatedProps={dotProps} />
        </Svg>
        {/* Date bubble */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: lastX - 36,
              top: lastY - 56,
              paddingHorizontal: Spacing.sm + 2,
              paddingVertical: 6,
              borderRadius: Radii.md,
              backgroundColor: colors.text.primary,
            },
            bubbleStyle,
          ]}
        >
          <Text
            style={{
              ...Typography.caption,
              color: '#fff',
              fontWeight: '600',
            }}
          >
            84 by {inEightWeeks()}
          </Text>
        </Animated.View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs }}>
        <Caption tone="tertiary">today</Caption>
        <Caption tone="tertiary">8 weeks</Caption>
      </View>
    </View>
  );
}

/* ─ Personalisation chips ─────────────────────────────────────────────── */

function chipsForAnswers(answers: Record<string, unknown>): Array<{ icon: IoniconName; label: string }> {
  const out: Array<{ icon: IoniconName; label: string }> = [];
  const gender = answers['q1_gender'];
  if (gender === 'man') out.push({ icon: 'male-outline', label: 'Masculine framework' });
  else if (gender === 'woman') out.push({ icon: 'female-outline', label: 'Feminine framework' });
  else out.push({ icon: 'people-outline', label: 'Neutral framework' });

  const age = answers['q2_age'];
  if (typeof age === 'number') out.push({ icon: 'calendar-outline', label: `Age ${age}` });
  const skin = answers['q4_skin_type'];
  if (typeof skin === 'string') out.push({ icon: 'color-palette-outline', label: `Skin type ${skin}` });
  const goals = answers['q9_goals'];
  if (Array.isArray(goals) && goals.length > 0) {
    out.push({ icon: 'flag-outline', label: `${goals.length} goals` });
  }
  out.push({ icon: 'phone-portrait-outline', label: 'On-device' });
  return out.slice(0, 5);
}

function Chip({
  icon,
  label,
  delay,
}: {
  icon: IoniconName;
  label: string;
  delay: number;
}) {
  const colors = useColors();
  return (
    <Animated.View
      entering={FadeInUp.duration(360).delay(delay).easing(Easing.out(Easing.cubic))}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: Spacing.sm + 2,
        borderRadius: Radii.pill,
        backgroundColor: colors.surface.raised,
      }}
    >
      <Ionicons name={icon} size={13} color={colors.accent.default} />
      <Text variant="caption" tone="primary" style={{ fontWeight: '500' }}>
        {label}
      </Text>
    </Animated.View>
  );
}

/* ─ Plan preview rows ─────────────────────────────────────────────────── */

function PlanRow({
  icon,
  title,
  meta,
  locked,
  delay,
}: {
  icon: IoniconName;
  title: string;
  meta: string;
  locked?: boolean;
  delay: number;
}) {
  const colors = useColors();
  const mode = useThemeMode();
  return (
    <Animated.View
      entering={FadeInUp.duration(420).delay(delay)}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.base,
          borderRadius: Radii.lg,
          backgroundColor: colors.surface.raised,
          marginBottom: Spacing.sm,
        },
        getShadow('soft', mode),
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: Radii.pill,
          backgroundColor: locked ? colors.background.tertiary : colors.accent.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={icon}
          size={18}
          color={locked ? colors.text.tertiary : colors.accent.default}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Body
          tone={locked ? 'tertiary' : 'primary'}
          variant="bodyEmphasis"
          style={{ fontSize: 15, fontWeight: '600' }}
        >
          {title}
        </Body>
        <Caption tone="tertiary">{meta}</Caption>
      </View>
      {locked ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: Spacing.sm,
            paddingVertical: 4,
            borderRadius: Radii.pill,
            backgroundColor: colors.background.tertiary,
          }}
        >
          <Ionicons name="lock-closed" size={11} color={colors.text.tertiary} />
          <Text variant="label" tone="tertiary" style={{ letterSpacing: 1.2 }}>
            Unlock
          </Text>
        </View>
      ) : (
        <Ionicons name="checkmark" size={18} color={colors.success.default} />
      )}
    </Animated.View>
  );
}

/* ─ Screen ────────────────────────────────────────────────────────────── */

export default function ProfileReady() {
  const router = useRouter();
  const answers = useOnboardingStore((s) => s.answers);
  const chips = useMemo(() => chipsForAnswers(answers), [answers]);
  // Use a deterministic prediction copy
  const [eta] = useState(() => inEightWeeks());

  return (
    <OnboardingScene
      footer={
        <View style={{ paddingBottom: Spacing.md }}>
          <Button
            label="Unlock my plan"
            size="xl"
            fullWidth
            onPress={() => router.replace('/paywall')}
          />
          <Caption tone="tertiary" style={{ textAlign: 'center', marginTop: Spacing.sm }}>
            No charge yet · 7-day free trial
          </Caption>
        </View>
      }
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: Spacing.lg, paddingBottom: Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Animated.View
          entering={FadeIn.duration(AnimationDuration.base)}
          style={{ marginBottom: Spacing.lg }}
        >
          <EmphasisHeadline size={30}>{`Your face by **${eta}**.`}</EmphasisHeadline>
        </Animated.View>

        {/* Projection chart hero */}
        <Animated.View
          entering={FadeIn.duration(500).delay(120)}
          style={{ marginBottom: Spacing.lg }}
        >
          <ProjectionChart />
        </Animated.View>

        {/* Personalised explanation */}
        <Animated.View
          entering={FadeInUp.duration(440).delay(220)}
          style={{ marginBottom: Spacing.lg }}
        >
          <InfoCard
            tone="success"
            eyebrow="Predicted from your answers"
            body="If you follow your plan, your Vela score is on track for **84** in eight weeks."
          />
        </Animated.View>

        {/* Chip cluster */}
        <Animated.View
          entering={FadeIn.duration(360).delay(380)}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: Spacing.xs + 2,
            justifyContent: 'center',
            marginBottom: Spacing.xl,
          }}
        >
          {chips.map((c, i) => (
            <Chip key={c.label} icon={c.icon} label={c.label} delay={440 + i * 100} />
          ))}
        </Animated.View>

        {/* Plan preview */}
        <View style={{ marginTop: Spacing.sm }}>
          <Animated.View entering={FadeInUp.duration(360).delay(820)}>
            <Text
              variant="label"
              tone="tertiary"
              style={{ letterSpacing: 1.6, marginBottom: Spacing.sm }}
            >
              Your weekly plan
            </Text>
          </Animated.View>
          <PlanRow
            icon="scan-outline"
            title="Sunday baseline scan"
            meta="20 sec · same frame, same time"
            delay={920}
          />
          <PlanRow
            icon="sparkles-outline"
            title="12-minute morning routine"
            meta="Tuned to your goals"
            delay={1040}
          />
          <PlanRow
            icon="trending-up-outline"
            title="8-week score forecast"
            meta="Where your scores are headed"
            locked
            delay={1180}
          />
        </View>
        {/* Silence Layout unused */}
        <View style={{ height: Layout.hairline }} />
      </ScrollView>
    </OnboardingScene>
  );
}
