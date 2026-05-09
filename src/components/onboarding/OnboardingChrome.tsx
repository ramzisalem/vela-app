/**
 * Shared visual chrome for onboarding editorial beats (file 07).
 * Keeps accent rule, entrance motion, and footer hairline consistent across screens.
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useColors } from '@/theme/ThemeContext';
import { AnimationDuration } from '@/theme/animations';
import { Layout, Radii, Spacing } from '@/theme/spacing';

export function OnboardingAccentRule({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          width: 40,
          height: 3,
          borderRadius: Radii.sm,
          backgroundColor: colors.accent.default,
          marginBottom: Spacing.xl,
        },
        style,
      ]}
    />
  );
}

export function OnboardingAnimatedEnter({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={FadeIn.duration(AnimationDuration.base)} style={style}>
      {children}
    </Animated.View>
  );
}

export function OnboardingFooter({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={{
        width: '100%',
        alignSelf: 'stretch',
        alignItems: 'stretch',
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.xl,
        borderTopWidth: Layout.hairline,
        borderTopColor: colors.border.subtle,
        backgroundColor: colors.background.secondary,
      }}
    >
      {children}
    </View>
  );
}
