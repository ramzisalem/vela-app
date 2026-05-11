/**
 * OnboardingKicker — small label above editorial headlines.
 *
 * "01 — chapter title", uppercase mono numeral + sentence-case title separated
 * by an em-dash. Replaces plain `Caption` kickers across onboarding for a more
 * editorial feel. Sentence case throughout (file 21).
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { Spacing } from '@/theme/spacing';
import { Text } from '@/components/ui/Text';

export interface OnboardingKickerProps {
  /** Two-digit chapter numeral, e.g. "01". Optional. */
  numeral?: string;
  label: string;
  style?: StyleProp<ViewStyle>;
}

export function OnboardingKicker({ numeral, label, style }: OnboardingKickerProps) {
  const colors = useColors();
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
        style,
      ]}
    >
      {numeral ? (
        <Text variant="mono" tone="tertiary" style={{ letterSpacing: 1 }}>
          {numeral}
        </Text>
      ) : null}
      <View
        style={{
          flex: 0,
          height: 1,
          width: 18,
          backgroundColor: colors.border.strong,
        }}
      />
      <Text variant="label" tone="tertiary" style={{ letterSpacing: 1.6 }}>
        {label}
      </Text>
    </View>
  );
}
