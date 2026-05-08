import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors, useThemeMode } from '@/theme/ThemeContext';
import { Radii, Spacing, Layout } from '@/theme/spacing';
import { getShadow, type ShadowLevel } from '@/theme/shadows';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof Spacing | number;
  radius?: keyof typeof Radii | number;
  border?: boolean;
  shadow?: ShadowLevel;
  testID?: string;
}

export function Card({
  children,
  style,
  padding = 'lg',
  radius = 'lg',
  border = true,
  shadow = 'soft',
  testID,
}: CardProps) {
  const colors = useColors();
  const mode = useThemeMode();
  const padValue = typeof padding === 'number' ? padding : Spacing[padding];
  const radiusValue = typeof radius === 'number' ? radius : Radii[radius];
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: colors.surface.raised,
          borderRadius: radiusValue,
          padding: padValue,
          borderWidth: border ? Layout.hairline : 0,
          borderColor: colors.border.default,
        },
        getShadow(shadow, mode),
        style,
      ]}
    >
      {children}
    </View>
  );
}
