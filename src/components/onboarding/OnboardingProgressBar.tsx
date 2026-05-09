/**
 * Thin overall progress for onboarding (instrument-style, not gamified).
 */
import React from 'react';
import { View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { Radii } from '@/theme/spacing';

export interface OnboardingProgressBarProps {
  step: number;
  total: number;
}

export function OnboardingProgressBar({ step, total }: OnboardingProgressBarProps) {
  const colors = useColors();
  const safeTotal = Math.max(1, total);
  const clamped = Math.min(Math.max(0, step), safeTotal);
  const ratio = clamped / safeTotal;
  /** First step still shows a sliver so the track never reads as empty. */
  const fillRatio = clamped > 0 ? Math.max(ratio, 1 / safeTotal) : 0;

  return (
    <View
      style={{
        height: 3,
        borderRadius: Radii.sm,
        backgroundColor: colors.border.subtle,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${fillRatio * 100}%`,
          height: '100%',
          borderRadius: Radii.sm,
          backgroundColor: colors.accent.default,
        }}
      />
    </View>
  );
}
