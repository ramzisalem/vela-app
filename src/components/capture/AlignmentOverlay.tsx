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
  reduceMotion?: boolean;
}

export function AlignmentOverlay({ isReady, hasFace, reduceMotion }: AlignmentOverlayProps) {
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

  const stroke = isReady
    ? colors.accent.default
    : hasFace
      ? colors.warning.default
      : colors.text.tertiary;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.frame,
          animatedStyle,
          { borderColor: stroke, borderWidth: Layout.hairline + 1 },
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
