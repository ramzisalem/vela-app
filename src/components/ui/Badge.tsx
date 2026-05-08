import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { Radii, Spacing } from '@/theme/spacing';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'accent';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const colors = useColors();
  const fill =
    tone === 'success'
      ? colors.success.background
      : tone === 'warning'
        ? colors.warning.background
        : tone === 'error'
          ? colors.error.background
          : tone === 'accent'
            ? colors.accent.background
            : colors.surface.pressed;
  const fg =
    tone === 'success'
      ? colors.success.default
      : tone === 'warning'
        ? colors.warning.default
        : tone === 'error'
          ? colors.error.default
          : tone === 'accent'
            ? colors.text.accent
            : colors.text.secondary;
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingHorizontal: Spacing.sm,
          paddingVertical: Spacing.xxs,
          borderRadius: Radii.pill,
          backgroundColor: fill,
        },
        style,
      ]}
    >
      <Text variant="label" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}
