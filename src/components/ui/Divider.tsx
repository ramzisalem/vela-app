import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { Layout, Spacing } from '@/theme/spacing';

export function Divider({
  style,
  inset = 0,
}: {
  style?: StyleProp<ViewStyle>;
  inset?: number;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          height: Layout.hairline,
          backgroundColor: colors.border.subtle,
          marginHorizontal: inset,
          marginVertical: Spacing.sm,
        },
        style,
      ]}
    />
  );
}
