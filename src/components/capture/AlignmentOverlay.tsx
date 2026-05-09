/**
 * AlignmentOverlay (file 05).
 *
 * A subtle elliptical guide centered on the screen. Color tints toward the
 * accent when the face is in-band; toward warning when not. Reduce Motion
 * (file 28) replaces the pulse with a static state.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/theme/ThemeContext';
import { Layout } from '@/theme/spacing';

interface AlignmentOverlayProps {
  isReady: boolean;
  hasFace: boolean;
  /** 0…1 while checks pass but native debounce has not fired yet. */
  holdProgress?: number;
  reduceMotion?: boolean;
}

export function AlignmentOverlay({ isReady, hasFace, holdProgress = 0, reduceMotion }: AlignmentOverlayProps) {
  const colors = useColors();
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    if (reduceMotion || !hasFace) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(withTiming(1.04, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      true,
    );
  }, [pulse, reduceMotion, hasFace]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const hp = holdProgress;
  const stroke = isReady
    ? colors.accent.default
    : !hasFace
      ? colors.text.tertiary
      : hp >= 0.12
        ? colors.accent.muted
        : colors.warning.default;
  const ringWidth = Layout.hairline + 1 + (isReady ? 2 : hasFace ? Math.min(3, hp * 4) : 0);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.frame,
          animatedStyle,
          { borderColor: stroke, borderWidth: ringWidth },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    top: '14%',
    left: '14%',
    right: '14%',
    bottom: '20%',
    borderRadius: 999,
  },
});
