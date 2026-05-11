/**
 * Confetti — falling colored shapes for the "Well Done" reward screen.
 *
 * Pure Reanimated + RN Views. No deps. Each particle drifts down with a
 * randomised x-wobble, rotates, and fades. Pointer-events disabled so taps
 * fall through to the underlying CTA.
 */
import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Palette } from '@/theme/palette';

const { width: WIN_W, height: WIN_H } = Dimensions.get('window');

const COLORS = [
  Palette.pink300,
  Palette.pink500,
  Palette.mauve500,
  Palette.blue300,
  Palette.blue400,
  Palette.warningLight,
  Palette.successLight,
] as const;

type Particle = {
  startX: number;
  driftX: number;
  size: number;
  rotateFrom: number;
  rotateTo: number;
  duration: number;
  delay: number;
  color: string;
  shape: 'square' | 'circle' | 'bar';
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    startX: rand(0, WIN_W),
    driftX: rand(-60, 60),
    size: rand(6, 12),
    rotateFrom: rand(0, 360),
    rotateTo: rand(360, 720),
    duration: rand(3200, 5200),
    delay: rand(0, 1500),
    color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    shape: (['square', 'circle', 'bar'] as const)[Math.floor(Math.random() * 3)]!,
  }));
}

function ParticleView({ p }: { p: Particle }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      p.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: p.duration, easing: Easing.linear }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(t);
  }, [p.delay, p.duration, t]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: p.startX + p.driftX * t.value },
      { translateY: -20 + (WIN_H + 40) * t.value },
      { rotate: `${p.rotateFrom + (p.rotateTo - p.rotateFrom) * t.value}deg` },
    ],
    opacity: t.value < 0.05 ? t.value * 20 : t.value > 0.92 ? (1 - t.value) * 12.5 : 1,
  }));

  const shape =
    p.shape === 'circle'
      ? { width: p.size, height: p.size, borderRadius: p.size / 2 }
      : p.shape === 'bar'
        ? { width: p.size * 0.5, height: p.size * 1.6, borderRadius: 1 }
        : { width: p.size, height: p.size, borderRadius: 2 };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: p.color,
        },
        shape,
        style,
      ]}
    />
  );
}

export function Confetti({ count = 60 }: { count?: number }) {
  const particles = useMemo(() => makeParticles(count), [count]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {particles.map((p, i) => (
        <ParticleView key={i} p={p} />
      ))}
    </View>
  );
}
