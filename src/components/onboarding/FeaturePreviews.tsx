/**
 * FeaturePreviews — animated hero previews used in the onboarding showcase.
 *
 * Each preview mirrors a real product surface (score ring, sub-score bars,
 * trend chart, routine card, privacy lockup) so users see the actual UI they
 * will get — not a generic icon. Animations are timed to feel cinematic but
 * resolve in under two seconds so the showcase stays brisk.
 *
 * All visuals paint from existing theme tokens (sub-score palette, accent,
 * surface tones). No new color literals.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Body, Caption, Text } from '@/components/ui/Text';
import { useColors, useThemeMode } from '@/theme/ThemeContext';
import { Layout, Radii, Spacing } from '@/theme/spacing';
import { Typography } from '@/theme/typography';
import { getShadow } from '@/theme/shadows';
import type { ComponentProps } from 'react';

const ACircle = Animated.createAnimatedComponent(Circle);
const APath = Animated.createAnimatedComponent(Path);
const ALine = Animated.createAnimatedComponent(Line);

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/* ───────────────────────────────────────────────────────────────────────── */
/* 1. CapturePreview — face mark resolves → score ring sweeps → number ticks  */
/* ───────────────────────────────────────────────────────────────────────── */

function CountUpNumber({
  to,
  duration = 1100,
  delay = 0,
  size = 64,
}: {
  to: number;
  duration?: number;
  delay?: number;
  size?: number;
}) {
  const colors = useColors();
  const [n, setN] = React.useState(0);
  useEffect(() => {
    const start = Date.now() + delay;
    let raf = 0;
    const tick = () => {
      const now = Date.now();
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(to * eased));
      if (now - start < duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, delay]);
  return (
    <Text
      style={{
        ...Typography.scoreNumeric,
        fontSize: size,
        lineHeight: size + 4,
        color: colors.text.primary,
      }}
    >
      {n}
    </Text>
  );
}

export function CapturePreview({ size = 240 }: { size?: number }) {
  const colors = useColors();
  // Phases:
  //   0..900ms   face mark draws + corners pulse
  //   900..1100  face mark fades out
  //   1100..2300 score ring sweeps in, number counts up
  const faceOpacity = useSharedValue(0);
  const faceDraw = useSharedValue(560);
  const ringSweep = useSharedValue(1); // 1 = empty, 0 = full

  useEffect(() => {
    faceOpacity.value = withTiming(1, { duration: 240 });
    faceDraw.value = withTiming(0, { duration: 900, easing: Easing.bezier(0.2, 0, 0, 1) });
    faceOpacity.value = withDelay(950, withTiming(0.18, { duration: 350 }));
    ringSweep.value = withDelay(
      1100,
      withTiming(1 - 0.84, { duration: 1200, easing: Easing.out(Easing.cubic) }),
    );
  }, [faceOpacity, faceDraw, ringSweep]);

  const faceProps = useAnimatedProps(() => ({
    strokeDashoffset: faceDraw.value,
  }));
  const faceLayer = useAnimatedStyle(() => ({ opacity: faceOpacity.value }));

  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringDerived = useDerivedValue(() => circumference * ringSweep.value);
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: ringDerived.value,
  }));

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      {/* Face mark, drawn then dimmed under the ring */}
      <Animated.View style={[StyleSheet.absoluteFill, faceLayer]}>
        <Svg width={size} height={size} viewBox="0 0 240 240">
          <Rect x={20} y={20} width={200} height={200} rx={28} stroke={colors.border.subtle} strokeWidth={0.6} fill="none" />
          <ACircle
            cx={120}
            cy={120}
            r={70}
            stroke={colors.border.strong}
            strokeWidth={1.2}
            strokeDasharray={560}
            animatedProps={faceProps}
            fill="none"
          />
          <G stroke={colors.accent.default} strokeWidth={1.4} strokeLinecap="round" fill="none">
            <Path d="M 46 66 L 46 46 L 66 46" />
            <Path d="M 194 66 L 194 46 L 174 46" />
            <Path d="M 46 174 L 46 194 L 66 194" />
            <Path d="M 194 174 L 194 194 L 174 194" />
          </G>
        </Svg>
      </Animated.View>

      {/* Score ring */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.border.subtle} strokeWidth={8} fill="none" />
        <ACircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.accent.default}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${circumference}, ${circumference}`}
          animatedProps={ringProps}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Number + label */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <CountUpNumber to={84} delay={1100} duration={1200} size={68} />
        <Text variant="label" tone="tertiary" style={{ letterSpacing: 1.6, marginTop: 2 }}>
          Vela score
        </Text>
      </View>
    </View>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */
/* 2. MetricsPreview — five sub-score bars fill in, real palette + labels     */
/* ───────────────────────────────────────────────────────────────────────── */

const METRIC_ROWS: ReadonlyArray<{
  label: string;
  value: number;
  subKey: 'skin' | 'symmetry' | 'grooming' | 'vitality' | 'definition';
}> = [
  { label: 'Skin',     value: 88, subKey: 'skin' },
  { label: 'Symmetry', value: 82, subKey: 'symmetry' },
  { label: 'Lighting', value: 79, subKey: 'vitality' },
  { label: 'Contour',  value: 86, subKey: 'definition' },
  { label: 'Grooming', value: 91, subKey: 'grooming' },
];

function MetricBar({
  row,
  delay,
}: {
  row: (typeof METRIC_ROWS)[number];
  delay: number;
}) {
  const colors = useColors();
  const fill = useSharedValue(0);
  const num = useSharedValue(0);
  const [n, setN] = React.useState(0);

  useEffect(() => {
    fill.value = withDelay(
      delay,
      withTiming(row.value / 100, { duration: 900, easing: Easing.bezier(0.2, 0, 0, 1) }),
    );
    num.value = withDelay(delay, withTiming(row.value, { duration: 900 }));
    const start = Date.now() + delay;
    let raf = 0;
    const tick = () => {
      const t = Math.max(0, Math.min(1, (Date.now() - start) / 900));
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(row.value * eased));
      if (Date.now() - start < 900) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [delay, fill, num, row.value]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, fill.value)) * 100}%`,
  }));

  return (
    <View style={{ marginBottom: Spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <Text variant="bodyEmphasis" tone="primary">
          {row.label}
        </Text>
        <Text variant="bodyEmphasis" tone="secondary">
          {n}
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: Radii.pill,
          backgroundColor: colors.border.subtle,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: Radii.pill,
              backgroundColor: colors.subScore[row.subKey],
            },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

export function MetricsPreview() {
  const colors = useColors();
  const mode = useThemeMode();
  return (
    <View
      style={[
        {
          width: '100%',
          padding: Spacing.lg,
          borderRadius: Radii.xl,
          backgroundColor: colors.surface.raised,
          borderWidth: Layout.hairline,
          borderColor: colors.border.subtle,
        },
        getShadow('lift', mode),
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: Spacing.md,
        }}
      >
        <Text variant="label" tone="tertiary" style={{ letterSpacing: 1.6 }}>
          This week
        </Text>
        <Text variant="caption" tone="tertiary">
          5 of 5
        </Text>
      </View>
      {METRIC_ROWS.map((row, i) => (
        <MetricBar key={row.label} row={row} delay={140 + i * 130} />
      ))}
    </View>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */
/* 3. TrendPreview — SVG path draws across 8 weeks; delta chip flies in       */
/* ───────────────────────────────────────────────────────────────────────── */

const TREND_VALUES = [62, 64, 67, 69, 73, 76, 78, 81] as const;

function buildPath(values: ReadonlyArray<number>, w: number, h: number): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = w / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * (h * 0.7) - h * 0.15;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export function TrendPreview() {
  const colors = useColors();
  const mode = useThemeMode();
  const W = 280;
  const H = 140;
  const draw = useSharedValue(900);
  const lastDot = useSharedValue(0);
  const chip = useSharedValue(0);

  const path = useMemo(() => buildPath(TREND_VALUES, W, H), []);
  const lastIdx = TREND_VALUES.length - 1;
  const stepX = W / (TREND_VALUES.length - 1);
  const min = Math.min(...TREND_VALUES);
  const max = Math.max(...TREND_VALUES);
  const range = Math.max(1, max - min);
  const lastY = H - ((TREND_VALUES[lastIdx]! - min) / range) * (H * 0.7) - H * 0.15;
  const lastX = lastIdx * stepX;

  useEffect(() => {
    draw.value = withTiming(0, { duration: 1400, easing: Easing.bezier(0.2, 0, 0, 1) });
    lastDot.value = withDelay(1400, withTiming(1, { duration: 320 }));
    chip.value = withDelay(1500, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [draw, lastDot, chip]);

  const pathProps = useAnimatedProps(() => ({
    strokeDashoffset: draw.value,
  }));
  const dotProps = useAnimatedProps(() => ({
    r: 5 * lastDot.value,
    opacity: lastDot.value,
  }));
  const chipStyle = useAnimatedStyle(() => ({
    opacity: chip.value,
    transform: [{ translateY: 12 * (1 - chip.value) }],
  }));

  return (
    <View
      style={[
        {
          width: '100%',
          padding: Spacing.lg,
          borderRadius: Radii.xl,
          backgroundColor: colors.surface.raised,
          borderWidth: Layout.hairline,
          borderColor: colors.border.subtle,
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
          Vela score · 8 weeks
        </Text>
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: Spacing.sm,
              paddingVertical: 4,
              borderRadius: Radii.pill,
              backgroundColor: colors.success.background,
            },
            chipStyle,
          ]}
        >
          <Ionicons name="trending-up" size={12} color={colors.success.default} />
          <Text variant="caption" style={{ color: colors.success.default, fontWeight: '500' }}>
            +19
          </Text>
        </Animated.View>
      </View>

      <Svg width={W} height={H}>
        {/* gridline */}
        <Line x1={0} y1={H * 0.5} x2={W} y2={H * 0.5} stroke={colors.border.subtle} strokeDasharray="2,4" strokeWidth={0.5} />
        {/* path */}
        <APath
          d={path}
          stroke={colors.accent.default}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={900}
          animatedProps={pathProps}
        />
        {/* end dot */}
        <ACircle cx={lastX} cy={lastY} fill={colors.accent.default} animatedProps={dotProps} />
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs }}>
        <Caption tone="tertiary">8 weeks ago</Caption>
        <Caption tone="tertiary">today</Caption>
      </View>
    </View>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */
/* 4. RoutinePreview — animated routine card; steps tick in one by one       */
/* ───────────────────────────────────────────────────────────────────────── */

const ROUTINE_STEPS: ReadonlyArray<{ icon: IoniconName; label: string; meta: string; done: boolean }> = [
  { icon: 'water-outline',         label: 'Cleanse',          meta: '60 sec', done: true },
  { icon: 'flask-outline',         label: 'Vitamin C serum',  meta: '4 drops', done: true },
  { icon: 'sunny-outline',         label: 'SPF 50',           meta: 'Two-finger',  done: true },
  { icon: 'moon-outline',          label: 'Retinoid · pm',    meta: '3× per week', done: false },
];

function RoutineRow({
  step,
  delay,
}: {
  step: (typeof ROUTINE_STEPS)[number];
  delay: number;
}) {
  const colors = useColors();
  const t = useSharedValue(0);
  const tick = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.bezier(0.2, 0, 0, 1) }));
    if (step.done) {
      tick.value = withDelay(delay + 320, withTiming(1, { duration: 280 }));
    }
  }, [delay, step.done, t, tick]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: 12 * (1 - t.value) }],
  }));
  const tickStyle = useAnimatedStyle(() => ({
    opacity: tick.value,
    transform: [{ scale: 0.6 + 0.4 * tick.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          paddingVertical: Spacing.sm,
        },
        rowStyle,
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: Radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background.tertiary,
          borderWidth: Layout.hairline,
          borderColor: colors.border.subtle,
        }}
      >
        <Ionicons name={step.icon} size={16} color={colors.text.secondary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Body>{step.label}</Body>
        <Caption tone="tertiary">{step.meta}</Caption>
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: Radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: step.done ? colors.success.default : colors.border.strong,
          backgroundColor: step.done ? colors.success.background : 'transparent',
        }}
      >
        <Animated.View style={tickStyle}>
          {step.done ? (
            <Ionicons name="checkmark" size={14} color={colors.success.default} />
          ) : null}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export function RoutinePreview() {
  const colors = useColors();
  const mode = useThemeMode();
  return (
    <View
      style={[
        {
          width: '100%',
          padding: Spacing.lg,
          borderRadius: Radii.xl,
          backgroundColor: colors.surface.raised,
          borderWidth: Layout.hairline,
          borderColor: colors.border.subtle,
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
        <Text variant="sectionMarker" tone="secondary">
          Morning · 12 min
        </Text>
        <Text variant="caption" tone="tertiary">
          Today
        </Text>
      </View>
      {ROUTINE_STEPS.map((s, i) => (
        <RoutineRow key={s.label} step={s} delay={120 + i * 200} />
      ))}
    </View>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */
/* 5. PrivacyPreview — phone with shield, orbiting on-device pip + lock       */
/* ───────────────────────────────────────────────────────────────────────── */

export function PrivacyPreview({ size = 240 }: { size?: number }) {
  const colors = useColors();
  const orbit = useSharedValue(0);
  const shield = useSharedValue(360);
  const check = useSharedValue(60);

  useEffect(() => {
    orbit.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.linear }),
      -1,
      false,
    );
    shield.value = withTiming(0, { duration: 1100, easing: Easing.bezier(0.2, 0, 0, 1) });
    check.value = withDelay(900, withTiming(0, { duration: 480 }));
    return () => {
      cancelAnimation(orbit);
      cancelAnimation(shield);
      cancelAnimation(check);
    };
  }, [orbit, shield, check]);

  const orbA = useAnimatedStyle(() => {
    const angle = orbit.value * Math.PI * 2;
    return {
      transform: [
        { translateX: 92 * Math.cos(angle) },
        { translateY: 92 * Math.sin(angle) },
      ],
    };
  });
  const orbB = useAnimatedStyle(() => {
    const angle = orbit.value * Math.PI * 2 + (Math.PI * 2) / 3;
    return {
      transform: [
        { translateX: 92 * Math.cos(angle) },
        { translateY: 92 * Math.sin(angle) },
      ],
    };
  });
  const orbC = useAnimatedStyle(() => {
    const angle = orbit.value * Math.PI * 2 + (Math.PI * 4) / 3;
    return {
      transform: [
        { translateX: 92 * Math.cos(angle) },
        { translateY: 92 * Math.sin(angle) },
      ],
    };
  });
  const shieldProps = useAnimatedProps(() => ({ strokeDashoffset: shield.value }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: check.value }));

  const orbitNode = (label: string, icon: IoniconName, style: StyleProp<ViewStyle>) => (
    <Animated.View
      style={[
        {
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: Radii.pill,
          backgroundColor: colors.surface.raised,
          borderWidth: Layout.hairline,
          borderColor: colors.border.subtle,
          alignItems: 'center',
          justifyContent: 'center',
          ...getShadow('soft', 'light'),
        }}
      >
        <Ionicons name={icon} size={14} color={colors.text.secondary} />
      </View>
      <Text variant="label" tone="tertiary" style={{ letterSpacing: 1.4 }}>
        {label}
      </Text>
    </Animated.View>
  );

  return (
    <View style={{ width: size, height: size, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      {/* Orbit ring */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 184,
          height: 184,
          borderRadius: 92,
          borderWidth: 0.5,
          borderColor: colors.border.subtle,
        }}
      />
      {/* Center shield */}
      <View
        style={{
          width: 110,
          height: 110,
          borderRadius: Radii.xl,
          backgroundColor: colors.surface.raised,
          borderWidth: Layout.hairline,
          borderColor: colors.border.subtle,
          alignItems: 'center',
          justifyContent: 'center',
          ...getShadow('lift', 'light'),
        }}
      >
        <Svg width={64} height={64} viewBox="0 0 96 96">
          <APath
            d="M 48 8 L 80 20 L 80 48 C 80 66 66 80 48 88 C 30 80 16 66 16 48 L 16 20 Z"
            stroke={colors.text.primary}
            strokeWidth={1.6}
            strokeLinejoin="round"
            strokeDasharray={360}
            animatedProps={shieldProps}
            fill="none"
          />
          <APath
            d="M 32 50 L 44 62 L 64 38"
            stroke={colors.accent.default}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={60}
            animatedProps={checkProps}
            fill="none"
          />
        </Svg>
      </View>
      {/* Orbiting pips */}
      {orbitNode('Photos',  'image-outline',         orbA)}
      {orbitNode('On device', 'phone-portrait-outline', orbB)}
      {orbitNode('Encrypted', 'lock-closed-outline',  orbC)}
    </View>
  );
}
