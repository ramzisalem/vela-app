/**
 * Onboarding “wow” data visualization — illustrative only, brand-gradient forward.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, useThemeMode } from '@/theme/ThemeContext';
import { VelaPrimary, VelaPrimarySoft, gradientStopsForMode } from '@/theme/gradients';
import { Radii, Spacing } from '@/theme/spacing';
import { getShadow } from '@/theme/shadows';
import { Text } from '@/components/ui/Text';

const AnimatedPath = Animated.createAnimatedComponent(Path);

import type { DelightVizSpec } from '@/core/onboarding/delightTypes';

export type { DelightVizSpec };

function DelightGradientBars({
  values,
  labels,
  showTitle = true,
  compact = false,
}: {
  values: number[];
  labels?: string[];
  showTitle?: boolean;
  compact?: boolean;
}) {
  const colors = useColors();
  const mode = useThemeMode();
  const brand = gradientStopsForMode(VelaPrimary, mode);

  return (
    <View style={{ marginTop: compact ? 0 : Spacing.md, gap: Spacing.xs }}>
      {showTitle ? (
        <Text variant="caption" tone="tertiary" style={{ letterSpacing: 0.3 }}>
          Signal blend
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 6,
          height: 88,
        }}
      >
        {values.slice(0, 7).map((fraction, i) => (
          <DelightBarColumn
            key={i}
            fraction={fraction}
            delayMs={i * 55}
            gradientColors={brand.colors as unknown as string[]}
            locations={brand.locations as unknown as number[]}
            trackColor={colors.border.subtle}
          />
        ))}
      </View>
      {labels && labels.length > 0 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginTop: 2 }}>
          {labels.slice(0, values.length).map((lab, i) => (
            <Text
              key={i}
              variant="caption"
              tone="tertiary"
              numberOfLines={1}
              style={{ flex: 1, fontSize: 10, textAlign: 'center' }}
            >
              {lab}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DelightBarColumn({
  fraction,
  delayMs,
  gradientColors,
  locations,
  trackColor,
}: {
  fraction: number;
  delayMs: number;
  gradientColors: string[];
  locations: number[];
  trackColor: string;
}) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(
      delayMs,
      withSpring(Math.max(0.15, Math.min(1, fraction)), { damping: 14, stiffness: 180 }),
    );
  }, [delayMs, fraction, h]);

  return (
    <View style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
      <View
        style={{
          height: '100%',
          borderRadius: Radii.md,
          backgroundColor: trackColor,
          overflow: 'hidden',
          justifyContent: 'flex-end',
        }}
      >
        <AnimatedBarFill heightShared={h} colors={gradientColors} locations={locations} />
      </View>
    </View>
  );
}

function AnimatedBarFill({
  heightShared,
  colors,
  locations,
}: {
  heightShared: SharedValue<number>;
  colors: string[];
  locations: number[];
}) {
  const fillStyle = useAnimatedStyle(() => ({
    height: 12 + heightShared.value * 76,
  }));

  return (
    <Animated.View
      style={[{ width: '100%', overflow: 'hidden', borderBottomLeftRadius: Radii.md, borderBottomRightRadius: Radii.md }, fillStyle]}
    >
      <LinearGradient
        colors={colors as [string, string, string]}
        locations={locations as [number, number, number]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={{ minHeight: 88, width: '100%' }}
      />
    </Animated.View>
  );
}

function normalizeSeries(raw: number[]): number[] {
  if (raw.length < 2) return raw;
  const min = Math.min(...raw);
  const max = Math.max(...raw);
  const span = max - min || 1;
  return raw.map((v) => (v - min) / span);
}

function DelightSparkline({
  points,
  width,
  title = 'Momentum curve',
  gradientIdSuffix,
  tightTop,
}: {
  points: number[];
  width: number;
  title?: string;
  gradientIdSuffix: string;
  /** When beside the gauge, reduce top margin. */
  tightTop?: boolean;
}) {
  const colors = useColors();
  const mode = useThemeMode();
  const brand = gradientStopsForMode(VelaPrimary, mode);
  const h = 72;
  const padX = 4;
  const padY = 10;
  const norm = normalizeSeries(points);
  const w = Math.max(120, width);

  const { lineD, areaD } = useMemo(() => {
    const n = norm.length;
    let line = '';
    let area = '';
    norm.forEach((p, i) => {
      const x = padX + (i / Math.max(1, n - 1)) * (w - 2 * padX);
      const y = padY + (1 - p) * (h - 2 * padY);
      line += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    const lastX = padX + (w - 2 * padX);
    const baseY = h - padY;
    area = `${line} L ${lastX} ${baseY} L ${padX} ${baseY} Z`;
    return { lineD: line, areaD: area };
  }, [norm, w, h, padX, padY]);

  const prog = useSharedValue(0);
  useEffect(() => {
    prog.value = withTiming(1, { duration: 900 });
  }, [lineD, prog]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - prog.value) * 400,
  }));

  return (
    <View style={{ marginTop: tightTop ? Spacing.xs : Spacing.md }}>
      <Text variant="caption" tone="tertiary" style={{ marginBottom: Spacing.xs, letterSpacing: 0.3 }}>
        {title}
      </Text>
      <Svg width={w} height={h}>
        <Defs>
          <SvgLinearGradient id={`sparkLineGrad-${gradientIdSuffix}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={brand.colors[0] as string} stopOpacity={0.95} />
            <Stop offset="50%" stopColor={brand.colors[1] as string} stopOpacity={0.95} />
            <Stop offset="100%" stopColor={brand.colors[2] as string} stopOpacity={0.95} />
          </SvgLinearGradient>
          <SvgLinearGradient id={`sparkFillGrad-${gradientIdSuffix}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={brand.colors[1] as string} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={brand.colors[2] as string} stopOpacity={0.05} />
          </SvgLinearGradient>
        </Defs>
        <Path d={areaD} fill={`url(#sparkFillGrad-${gradientIdSuffix})`} />
        <AnimatedPath
          d={lineD}
          fill="none"
          stroke={`url(#sparkLineGrad-${gradientIdSuffix})`}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={400}
          animatedProps={lineProps}
        />
        {norm.map((p, i) => {
          const x = padX + (i / Math.max(1, norm.length - 1)) * (w - 2 * padX);
          const y = padY + (1 - p) * (h - 2 * padY);
          return (
            <Circle key={i} cx={x} cy={y} r={3.5} fill={colors.accent.muted} stroke={colors.surface.raised} strokeWidth={1} />
          );
        })}
      </Svg>
    </View>
  );
}

function DelightRadialGauge({
  fraction,
  caption,
  gradientIdSuffix,
}: {
  fraction: number;
  caption?: string;
  gradientIdSuffix: string;
}) {
  const colors = useColors();
  const mode = useThemeMode();
  const brand = gradientStopsForMode(VelaPrimary, mode);
  const size = 118;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const arcLen = Math.PI * r;
  const f = Math.max(0.08, Math.min(1, fraction));

  return (
    <View style={{ alignItems: 'center', width: size, marginTop: Spacing.sm }}>
      <Text variant="caption" tone="tertiary" style={{ marginBottom: Spacing.xs, letterSpacing: 0.3 }}>
        {caption ?? 'Fit'}
      </Text>
      <Svg width={size} height={size * 0.62}>
        <Defs>
          <SvgLinearGradient id={`gaugeGrad-${gradientIdSuffix}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={brand.colors[0] as string} />
            <Stop offset="50%" stopColor={brand.colors[1] as string} />
            <Stop offset="100%" stopColor={brand.colors[2] as string} />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          stroke={colors.border.subtle}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          stroke={`url(#gaugeGrad-${gradientIdSuffix})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${f * arcLen} ${arcLen}`}
        />
      </Svg>
      <Text variant="mono" tone="accent" style={{ marginTop: -Spacing.md, fontSize: 22 }}>
        {Math.round(f * 100)}%
      </Text>
    </View>
  );
}

function DelightHeatStrip({ values }: { values: number[] }) {
  const colors = useColors();
  const mode = useThemeMode();
  const brand = gradientStopsForMode(VelaPrimary, mode);

  return (
    <View style={{ marginTop: Spacing.md }}>
      <Text variant="caption" tone="tertiary" style={{ marginBottom: Spacing.sm, letterSpacing: 0.3 }}>
        Rhythm map
      </Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {values.slice(0, 7).map((v, i) => {
          const fillH = Math.max(10, Math.round(v * 56));
          return (
          <View
            key={i}
            style={{
              flex: 1,
              height: 56,
              borderRadius: Radii.sm,
              overflow: 'hidden',
              backgroundColor: colors.background.tertiary,
              justifyContent: 'flex-end',
            }}
          >
            <LinearGradient
              colors={brand.colors as [string, string, string]}
              locations={brand.locations as [number, number, number]}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={{
                height: fillH,
                width: '100%',
                opacity: 0.45 + v * 0.5,
              }}
            />
          </View>
          );
        })}
      </View>
    </View>
  );
}

export function DelightGlassFrame({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const mode = useThemeMode();
  const soft = gradientStopsForMode(VelaPrimarySoft, mode);

  return (
    <LinearGradient
      colors={soft.colors as unknown as string[]}
      locations={soft.locations as unknown as number[]}
      start={soft.start}
      end={soft.end}
      style={[
        {
          borderRadius: Radii.lg + 3,
          padding: 2,
        },
        getShadow('soft', mode),
      ]}
    >
      <View
        style={{
          borderRadius: Radii.lg + 1,
          backgroundColor: colors.background.secondary,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </LinearGradient>
  );
}

export function DelightDataViz({ spec, compact }: { spec: DelightVizSpec; compact?: boolean }) {
  const [rowW, setRowW] = useState(0);
  const svgId = React.useId().replace(/\:/g, '');
  const onLayout = (e: LayoutChangeEvent) => setRowW(e.nativeEvent.layout.width);

  const hasBars = !!(spec.bars && spec.bars.length > 0);
  const bars = hasBars ? spec.bars! : null;
  const showTop = !compact && !!(spec.ring || spec.sparkline);
  const sparkW = Math.max(108, rowW - (spec.ring ? 126 : 8));

  return (
    <View onLayout={onLayout}>
      {showTop ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }}>
          {spec.ring ? <DelightRadialGauge fraction={spec.ring.fraction} caption={spec.ring.caption} gradientIdSuffix={svgId} /> : null}
          {spec.sparkline && rowW > 48 ? (
            <View style={{ flex: 1, minWidth: 0 }}>
              <DelightSparkline
                points={spec.sparkline}
                width={spec.ring ? sparkW : Math.max(120, rowW - 8)}
                gradientIdSuffix={svgId}
                title="Trend pulse"
                tightTop={!!spec.ring}
              />
            </View>
          ) : null}
          {spec.ring && !spec.sparkline ? <View style={{ flex: 1 }} /> : null}
        </View>
      ) : null}

      {spec.heatStrip && spec.heatStrip.length > 0 ? <DelightHeatStrip values={spec.heatStrip} /> : null}

      {bars ? (
        <DelightGradientBars
          values={bars}
          labels={spec.barLabels}
          showTitle={!compact}
          compact={compact}
        />
      ) : null}
    </View>
  );
}

/** Back-compat: bars only (compact pillar chart). */
export function DelightMiniChart({ values }: { values: number[] }) {
  return <DelightDataViz spec={{ bars: values }} compact />;
}
