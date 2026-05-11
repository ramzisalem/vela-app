/**
 * SegmentedProgress — replaces the plain bar with five chapter pips (sections
 * A–E). Each pip animates as a thin track that fills with the accent color
 * proportional to question progress within that section.
 *
 * Why: a thin sliver bar gives no narrative — users don't see chapters.
 * Segmented marks tell the story "you are in chapter 2 of 5" while still
 * reading as a quiet instrument, not a gamified bar.
 */
import React from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/theme/ThemeContext';
import { Radii, Spacing } from '@/theme/spacing';
import { AnimationDuration } from '@/theme/animations';

export interface SegmentedProgressProps {
  /** Section index (0-based). Out-of-range values clamp. */
  sectionIndex: number;
  /** Total sections (e.g. 5 for A..E). */
  sectionCount: number;
  /** Step number within the current section (1-based). */
  stepInSection: number;
  /** Total steps in the current section. */
  stepsInSection: number;
}

function Pip({
  state,
  fill,
}: {
  state: 'past' | 'current' | 'future';
  fill: number; // 0..1, only used when state === 'current'
}) {
  const colors = useColors();
  const w = useSharedValue(state === 'past' ? 1 : state === 'current' ? fill : 0);

  React.useEffect(() => {
    const target = state === 'past' ? 1 : state === 'current' ? fill : 0;
    w.value = withTiming(target, {
      duration: AnimationDuration.base,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [state, fill, w]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, w.value)) * 100}%`,
  }));

  return (
    <View
      style={{
        flex: 1,
        height: 3,
        borderRadius: Radii.sm,
        backgroundColor: colors.border.subtle,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            borderRadius: Radii.sm,
            backgroundColor: colors.accent.default,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

export function SegmentedProgress({
  sectionIndex,
  sectionCount,
  stepInSection,
  stepsInSection,
}: SegmentedProgressProps) {
  const idx = Math.max(0, Math.min(sectionCount - 1, sectionIndex));
  const inSec = Math.max(1, stepsInSection);
  const fill = Math.max(0, Math.min(1, stepInSection / inSec));
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.xs, width: '100%' }}>
      {Array.from({ length: sectionCount }).map((_, i) => (
        <Pip
          key={i}
          state={i < idx ? 'past' : i === idx ? 'current' : 'future'}
          fill={i === idx ? fill : 0}
        />
      ))}
    </View>
  );
}
