import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useColors } from '@/theme/ThemeContext';
import { Layout } from '@/theme/spacing';

export interface ScreenProps {
  children: React.ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  inset?: boolean;
  /** Use the secondary surface (cream100 / charcoal900) for grouped lists, etc. */
  variant?: 'primary' | 'secondary';
  testID?: string;
}

export function Screen({
  children,
  edges = ['top', 'bottom'],
  style,
  inset = true,
  variant = 'primary',
  testID,
}: ScreenProps) {
  const colors = useColors();
  return (
    <SafeAreaView
      edges={edges}
      style={[
        {
          flex: 1,
          backgroundColor:
            variant === 'secondary' ? colors.background.secondary : colors.background.primary,
        },
      ]}
    >
      <View
        testID={testID}
        style={[{ flex: 1, paddingHorizontal: inset ? Layout.screenInset : 0 }, style]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
