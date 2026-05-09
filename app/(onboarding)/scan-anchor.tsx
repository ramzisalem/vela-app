/**
 * Scan-anchor onboarding screen (file 42).
 *
 * Optional. Sits between baseline reveal and paywall (per file 07 placement).
 * The emoji exception in file 21 applies to this single screen — soft glyphs
 * cue life moments. No other emoji exceptions in onboarding.
 */
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Body, Caption, HeadlineSerif, Text } from '@/components/ui/Text';
import {
  OnboardingAccentRule,
  OnboardingAnimatedEnter,
} from '@/components/onboarding/OnboardingChrome';
import { useColors, useThemeMode } from '@/theme/ThemeContext';
import { getShadow } from '@/theme/shadows';
import { ANCHOR_PRESETS } from '@/types/anchor';
import { Layout, Radii, Spacing } from '@/theme/spacing';
import { useAnchorStore } from '@/stores/anchorStore';

export default function ScanAnchorScreen() {
  const router = useRouter();
  const colors = useColors();
  const mode = useThemeMode();
  const setKind = useAnchorStore((s) => s.setKind);

  return (
    <Screen variant="secondary">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: Spacing.xl, paddingBottom: Spacing.huge }}
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingAnimatedEnter>
          <OnboardingAccentRule />
          <HeadlineSerif style={{ marginBottom: Spacing.md }}>
            When does your week tend to slow down?
          </HeadlineSerif>
          <Body tone="secondary" style={{ marginBottom: Spacing.xl }}>
            We’ll bring you back for your next scan around then. You can change this anytime.
          </Body>
          <View style={{ gap: Spacing.md }}>
            {ANCHOR_PRESETS.map((opt) => {
              const hasGlyph = Boolean(opt.glyph?.trim());
              return (
                <Pressable
                  key={opt.kind}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  onPress={() => {
                    setKind(opt.kind, {
                      dayOfWeek: opt.defaultDayOfWeek,
                      hour: opt.defaultHour,
                    });
                    router.replace('/paywall');
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.md,
                    minHeight: Layout.tapTarget + Spacing.sm,
                    paddingVertical: Spacing.md,
                    paddingHorizontal: Spacing.base,
                    borderRadius: Radii.lg,
                    borderWidth: Layout.hairline,
                    borderColor: colors.border.subtle,
                    backgroundColor: colors.background.tertiary,
                    opacity: pressed ? 0.94 : 1,
                    ...getShadow('soft', mode),
                  })}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: Radii.pill,
                      backgroundColor: colors.accent.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {hasGlyph ? (
                      <Text variant="body" tone="primary" style={{ fontSize: 22, lineHeight: 26 }}>
                        {opt.glyph}
                      </Text>
                    ) : (
                      <Caption tone="tertiary">—</Caption>
                    )}
                  </View>
                  <Body style={{ flex: 1, flexShrink: 1 }}>{opt.label}</Body>
                </Pressable>
              );
            })}
          </View>
        </OnboardingAnimatedEnter>
      </ScrollView>
    </Screen>
  );
}
