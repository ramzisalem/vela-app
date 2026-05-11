/**
 * OnboardingAurora — animated brand atmosphere behind editorial onboarding scenes.
 *
 * Three soft VelaPrimary blobs that drift and breathe. No blur dependency: uses
 * opacity-blended radial-feeling gradient discs so the cream/charcoal canvas
 * shows through.
 *
 * Brand-locked. Used only inside (onboarding) screens.
 */
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette } from '@/theme/palette';
import { useThemeMode } from '@/theme/ThemeContext';

type BlobConfig = {
  size: number;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
  colors: readonly [string, string, string];
};

const { width: WIN_W, height: WIN_H } = Dimensions.get('window');

function blobsForMode(mode: 'light' | 'dark'): BlobConfig[] {
  // brand:allow — these are the VelaPrimary stop hexes already exported via palette.
  if (mode === 'dark') {
    return [
      {
        size: WIN_W * 1.05,
        startX: -WIN_W * 0.35,
        startY: -WIN_H * 0.05,
        driftX: 30,
        driftY: 20,
        duration: 9000,
        delay: 0,
        colors: [`${Palette.pink500}55`, `${Palette.pink500}22`, `${Palette.pink500}00`],
      },
      {
        size: WIN_W * 1.15,
        startX: WIN_W * 0.25,
        startY: WIN_H * 0.18,
        driftX: -34,
        driftY: 26,
        duration: 11000,
        delay: 800,
        colors: [`${Palette.mauve600}55`, `${Palette.mauve600}22`, `${Palette.mauve600}00`],
      },
      {
        size: WIN_W * 1.0,
        startX: -WIN_W * 0.2,
        startY: WIN_H * 0.55,
        driftX: 24,
        driftY: -22,
        duration: 12500,
        delay: 1600,
        colors: [`${Palette.blue400}50`, `${Palette.blue400}22`, `${Palette.blue400}00`],
      },
    ];
  }
  return [
    {
      size: WIN_W * 1.05,
      startX: -WIN_W * 0.35,
      startY: -WIN_H * 0.05,
      driftX: 30,
      driftY: 20,
      duration: 9000,
      delay: 0,
      colors: [`${Palette.pink300}AA`, `${Palette.pink300}33`, `${Palette.pink300}00`],
    },
    {
      size: WIN_W * 1.15,
      startX: WIN_W * 0.25,
      startY: WIN_H * 0.18,
      driftX: -34,
      driftY: 26,
      duration: 11000,
      delay: 800,
      colors: [`${Palette.mauve500}99`, `${Palette.mauve500}33`, `${Palette.mauve500}00`],
    },
    {
      size: WIN_W * 1.0,
      startX: -WIN_W * 0.2,
      startY: WIN_H * 0.55,
      driftX: 24,
      driftY: -22,
      duration: 12500,
      delay: 1600,
      colors: [`${Palette.blue300}99`, `${Palette.blue300}33`, `${Palette.blue300}00`],
    },
  ];
}

function Blob({ cfg }: { cfg: BlobConfig }) {
  const t = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: cfg.duration, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: cfg.duration, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      false,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: cfg.duration * 0.85, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.96, { duration: cfg.duration * 0.85, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(t);
      cancelAnimation(scale);
    };
  }, [cfg.duration, t, scale]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: cfg.startX + cfg.driftX * t.value },
      { translateY: cfg.startY + cfg.driftY * t.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: cfg.size,
          height: cfg.size,
          borderRadius: cfg.size / 2,
          overflow: 'hidden',
        },
        animated,
      ]}
    >
      <LinearGradient
        colors={cfg.colors as unknown as string[]}
        locations={[0, 0.55, 1] as unknown as number[]}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export function OnboardingAurora({
  intensity = 1,
  style,
}: {
  /** 0..1 multiplier on overall opacity. Default 1. */
  intensity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const mode = useThemeMode();
  const blobs = React.useMemo(() => blobsForMode(mode), [mode]);
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { opacity: Math.max(0, Math.min(1, intensity)), overflow: 'hidden' },
        style,
      ]}
    >
      {blobs.map((b, i) => (
        <Blob key={i} cfg={b} />
      ))}
    </View>
  );
}
