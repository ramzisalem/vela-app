/**
 * ShutterButton (file 05 + 23 — redesigned).
 *
 * Auto-shutter pattern: the ring fills linearly over 500ms once `isReady`
 * is true; capture fires when the ring completes. Long-press cancels the
 * auto-fire and triggers manual capture immediately.
 *
 * Visual improvements over v1:
 *  • Inner circle colour cross-fades from white → copper (#C77F4A) when ready
 *  • Soft copper glow halo expands behind the button when ready
 *  • Outer ring cross-fades to copper when ready
 *
 * Reduce Motion (file 28): ring replaced with text states "Hold steady…" /
 * "Ready". The same 500ms delay triggers auto-capture; ring callback is skipped.
 * Tap when Ready captures immediately (VoiceOver / faster path).
 */
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Caption } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { Layout } from '@/theme/spacing';
import { AnimationDuration } from '@/theme/animations';

export interface ShutterButtonProps {
  isReady: boolean;
  /** 0…1 from native while pose/light/neutral hold before `isReady` flips true. */
  holdProgress?: number;
  onCapture: () => void;
  reduceMotion?: boolean;
}

const BUTTON   = 88;
const STROKE   = 4;
const GLOW_R   = BUTTON + 48; // glow halo diameter

export function ShutterButton({
  isReady,
  holdProgress = 0,
  onCapture,
  reduceMotion,
}: ShutterButtonProps) {
  const colors = useColors();

  // Fill-ring progress (0 → 1 as hold completes)
  const progress   = useSharedValue(0);
  // Cross-fade 0 = white, 1 = copper
  const readyAnim  = useSharedValue(0);

  const reduceMotionAutoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReduceMotionAutoTimer = () => {
    if (reduceMotionAutoTimerRef.current) {
      clearTimeout(reduceMotionAutoTimerRef.current);
      reduceMotionAutoTimerRef.current = null;
    }
  };

  // Cross-fade to copper when ready
  useEffect(() => {
    readyAnim.value = withTiming(isReady ? 1 : 0, {
      duration: 320,
      easing: Easing.out(Easing.quad),
    });
  }, [isReady, readyAnim]);

  // Fill-ring animation + auto-shutter
  useEffect(() => {
    if (reduceMotion) {
      progress.value = isReady ? 1 : Math.min(1, Math.max(0, holdProgress));
      return;
    }
    if (isReady) {
      progress.value = withTiming(
        1,
        { duration: AnimationDuration.shutterRing, easing: Easing.linear },
        (finished) => {
          if (finished) runOnJS(triggerCapture)();
        },
      );
    } else {
      cancelAnimation(progress);
      progress.value = withTiming(Math.min(1, Math.max(0, holdProgress)), {
        duration: AnimationDuration.micro,
        easing: Easing.out(Easing.cubic),
      });
    }
    function triggerCapture() {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      onCapture();
    }
    return () => cancelAnimation(progress);
  }, [isReady, holdProgress, reduceMotion, progress, onCapture]);

  // Reduce Motion: mirror the 500ms ring so capture still auto-fires
  useEffect(() => {
    if (!reduceMotion || !isReady) {
      clearReduceMotionAutoTimer();
      return;
    }
    clearReduceMotionAutoTimer();
    reduceMotionAutoTimerRef.current = setTimeout(() => {
      reduceMotionAutoTimerRef.current = null;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      onCapture();
    }, AnimationDuration.shutterRing);
    return clearReduceMotionAutoTimer;
  }, [reduceMotion, isReady, onCapture]);

  // ── Animated styles ────────────────────────────────────────────────────

  /** Copper fill-ring — fades in + tiny scale as ring fills */
  const ringStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 1 + 0.025 * progress.value }],
  }));

  /** Inner circle cross-fades white → copper */
  const innerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      readyAnim.value,
      [0, 1],
      ['rgba(255,255,255,0.96)', '#C77F4A'],
    ),
  }));

  /** Outer ring fades to copper */
  const outerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      readyAnim.value,
      [0, 1],
      ['rgba(255,255,255,0.55)', '#C77F4A'],
    ),
  }));

  /** Copper glow halo behind the button */
  const glowStyle = useAnimatedStyle(() => ({
    opacity: readyAnim.value * 0.25,
    transform: [{ scale: 0.85 + readyAnim.value * 0.15 }],
  }));

  // ── Tap handlers ───────────────────────────────────────────────────────

  const fireCapture = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onCapture();
  };

  const handleLongPress = () => {
    clearReduceMotionAutoTimer();
    fireCapture();
  };

  const handlePress = () => {
    if (!isReady) return;
    clearReduceMotionAutoTimer();
    if (!reduceMotion) {
      cancelAnimation(progress);
      progress.value = 1;
    }
    fireCapture();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={300}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel={isReady ? 'Capture scan' : 'Hold steady'}
      accessibilityHint="Tap when ready, or long-press to capture immediately"
      style={styles.container}
    >
      {/* Glow halo — sits furthest back */}
      <Animated.View
        style={[
          styles.glow,
          glowStyle,
          { backgroundColor: colors.accent.default },
        ]}
      />

      {/* Outer ring: white → copper */}
      <Animated.View style={[styles.outer, outerStyle]} />

      {/* Fill ring: copper, fades in as progress fills */}
      <Animated.View
        style={[styles.ring, ringStyle, { borderColor: colors.accent.default }]}
      />

      {/* Inner circle: white → copper */}
      <Animated.View style={[styles.inner, innerStyle]} />

      {reduceMotion ? (
        <Caption
          tone="inverse"
          style={{ position: 'absolute', bottom: -(BUTTON / 2 + 12) }}
        >
          {isReady ? 'Ready' : 'Hold steady'}
        </Caption>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: BUTTON,
    height: BUTTON,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Layout.tapTarget,
  },
  glow: {
    position: 'absolute',
    width: GLOW_R,
    height: GLOW_R,
    borderRadius: GLOW_R / 2,
  },
  outer: {
    position: 'absolute',
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    borderWidth: STROKE,
  },
  ring: {
    position: 'absolute',
    width: BUTTON + 10,
    height: BUTTON + 10,
    borderRadius: (BUTTON + 10) / 2,
    borderWidth: STROKE,
  },
  inner: {
    width: BUTTON - 18,
    height: BUTTON - 18,
    borderRadius: (BUTTON - 18) / 2,
  },
});
