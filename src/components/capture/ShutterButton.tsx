/**
 * ShutterButton (file 05 + 23).
 *
 * Auto-shutter pattern: the ring fills linearly over 500ms once `isReady`
 * is true; capture fires when the ring completes. Long-press cancels the
 * auto-fire and triggers manual capture immediately. Reduce Motion (file 28)
 * replaces the ring with text states "Hold steady…" / "Ready" and uses the
 * same 500ms delay before capture (ring callback is not used when RM is on).
 * Tap when Ready captures immediately (VoiceOver / faster path).
 *
 * Volume-button shutter is explicitly v2 only (file 23) — not implemented.
 */
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  Easing,
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

const BUTTON = 88;
const STROKE = 4;

export function ShutterButton({ isReady, holdProgress = 0, onCapture, reduceMotion }: ShutterButtonProps) {
  const colors = useColors();
  const progress = useSharedValue(0);
  const reduceMotionAutoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReduceMotionAutoTimer = () => {
    if (reduceMotionAutoTimerRef.current) {
      clearTimeout(reduceMotionAutoTimerRef.current);
      reduceMotionAutoTimerRef.current = null;
    }
  };

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
          if (finished) {
            runOnJS(triggerCapture)();
          }
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

  // Reduce Motion: mirror the 500ms ring completion so capture still auto-fires (animated path is skipped).
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

  const ringStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 1 + 0.02 * progress.value }],
  }));

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
      <View style={[styles.outer, { borderColor: colors.text.inverse }]} />
      <Animated.View
        style={[
          styles.ring,
          ringStyle,
          { borderColor: colors.accent.default },
        ]}
      />
      <View style={[styles.inner, { backgroundColor: colors.text.inverse }]} />
      {reduceMotion ? (
        <Caption tone="inverse" style={{ position: 'absolute', bottom: -28 }}>
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
  outer: {
    position: 'absolute',
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    borderWidth: STROKE,
    opacity: 0.6,
  },
  ring: {
    position: 'absolute',
    width: BUTTON + 8,
    height: BUTTON + 8,
    borderRadius: (BUTTON + 8) / 2,
    borderWidth: STROKE,
  },
  inner: {
    width: BUTTON - 18,
    height: BUTTON - 18,
    borderRadius: (BUTTON - 18) / 2,
  },
});
