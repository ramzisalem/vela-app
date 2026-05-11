/**
 * AnimatedFaceMark — drawn AR alignment mark used on the camera-permissions
 * screen. A thin face oval sits inside a faint grid; corner reticles pulse
 * inward, then a hairline crosshair sweeps. Pure SVG + reanimated, no Lottie.
 *
 * Visual logic mirrors the capture viewfinder so users see the same
 * vocabulary before they grant camera access.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { useColors } from '@/theme/ThemeContext';

const ACircle = Animated.createAnimatedComponent(Circle);
const APath = Animated.createAnimatedComponent(Path);
const ALine = Animated.createAnimatedComponent(Line);

export function AnimatedFaceMark({ size = 220 }: { size?: number }) {
  const colors = useColors();
  const ringDash = useSharedValue(560);
  const reticle = useSharedValue(0); // 0..1, 1 = pulled in
  const sweep = useSharedValue(0); // 0..1 vertical scan

  useEffect(() => {
    ringDash.value = withTiming(0, { duration: 1400, easing: Easing.bezier(0.2, 0, 0, 1) });
    reticle.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }),
          withTiming(0.85, { duration: 1100, easing: Easing.inOut(Easing.cubic) }),
        ),
        -1,
        true,
      ),
    );
    sweep.value = withDelay(
      1400,
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
  }, [ringDash, reticle, sweep]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: ringDash.value,
  }));
  const sweepProps = useAnimatedProps(() => ({
    y1: 60 + sweep.value * 100,
    y2: 60 + sweep.value * 100,
  }));

  const accent = colors.accent.default;
  const stroke = colors.border.strong;
  const faint = colors.border.subtle;

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 220 220">
        {/* Faint frame & grid */}
        <Rect x={6} y={6} width={208} height={208} rx={28} stroke={faint} strokeWidth={0.8} fill="none" />
        <Line x1={56} y1={6} x2={56} y2={214} stroke={faint} strokeWidth={0.5} />
        <Line x1={164} y1={6} x2={164} y2={214} stroke={faint} strokeWidth={0.5} />
        <Line x1={6} y1={56} x2={214} y2={56} stroke={faint} strokeWidth={0.5} />
        <Line x1={6} y1={164} x2={214} y2={164} stroke={faint} strokeWidth={0.5} />

        {/* Face oval — thin, drawn in */}
        <ACircle
          cx={110}
          cy={110}
          r={70}
          stroke={stroke}
          strokeWidth={1.2}
          strokeDasharray={560}
          animatedProps={ringProps}
          fill="none"
        />

        {/* Corner reticles */}
        <G stroke={accent} strokeWidth={1.4} strokeLinecap="round" fill="none">
          <APath d="M 36 56 L 36 38 L 54 38" />
          <APath d="M 184 56 L 184 38 L 166 38" />
          <APath d="M 36 164 L 36 182 L 54 182" />
          <APath d="M 184 164 L 184 182 L 166 182" />
        </G>

        {/* Center cross */}
        <Line x1={104} y1={110} x2={116} y2={110} stroke={accent} strokeWidth={1} />
        <Line x1={110} y1={104} x2={110} y2={116} stroke={accent} strokeWidth={1} />

        {/* Sweep line */}
        <ALine
          x1={42}
          x2={178}
          stroke={accent}
          strokeWidth={0.8}
          strokeOpacity={0.55}
          animatedProps={sweepProps}
        />
      </Svg>
    </View>
  );
}
