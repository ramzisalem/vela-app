/**
 * OnboardingScene — full-bleed editorial scene used by hero onboarding screens.
 *
 * Provides:
 *   - Cream/charcoal canvas (matches Screen background.primary)
 *   - Optional drifting aurora atmosphere behind content
 *   - Safe-area-aware content slot with horizontal screen inset
 *   - Sticky footer slot with hairline divider (no fill — atmosphere reads through)
 */
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/theme/ThemeContext';
import { Layout, Spacing } from '@/theme/spacing';
import { OnboardingAurora } from './OnboardingAurora';

export interface OnboardingSceneProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  aurora?: boolean;
  auroraIntensity?: number;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function OnboardingScene({
  children,
  footer,
  aurora = false,
  auroraIntensity = 0.5,
  contentStyle,
  testID,
}: OnboardingSceneProps) {
  const colors = useColors();
  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {aurora ? <OnboardingAurora intensity={auroraIntensity} /> : null}
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View style={[styles.body, contentStyle]}>{children}</View>
        {footer ? (
          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border.subtle, borderTopWidth: Layout.hairline },
            ]}
          >
            {footer}
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: Layout.screenInset,
  },
  footer: {
    paddingHorizontal: Layout.screenInset,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
});
