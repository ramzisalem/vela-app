/**
 * Scan-anchor onboarding screen (file 42).
 *
 * Optional. Sits between baseline reveal and the pre-paywall reveal flow
 * (file 07 placement). The emoji exception in file 21 applies to this single
 * screen — soft glyphs cue life moments. No other emoji exceptions in
 * onboarding.
 *
 * LazyFit-inspired: centered headline with inline emphasis, soft InfoCard,
 * white shadow option cards, selected = accent fill + 2px accent border.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Body, Caption, Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { OnboardingScene } from '@/components/onboarding/OnboardingScene';
import { EmphasisHeadline } from '@/components/onboarding/EmphasisHeadline';
import { InfoCard } from '@/components/onboarding/InfoCard';
import { useColors, useThemeMode } from '@/theme/ThemeContext';
import { getShadow } from '@/theme/shadows';
import { ANCHOR_PRESETS } from '@/types/anchor';
import { Layout, Radii, Spacing } from '@/theme/spacing';
import { AnimationDuration } from '@/theme/animations';
import { useAnchorStore } from '@/stores/anchorStore';

export default function ScanAnchorScreen() {
  const router = useRouter();
  const colors = useColors();
  const mode = useThemeMode();
  const setKind = useAnchorStore((s) => s.setKind);
  const [pendingKind, setPendingKind] = useState<string | null>(null);

  const submit = () => {
    const opt = ANCHOR_PRESETS.find((o) => o.kind === pendingKind);
    if (opt) {
      setKind(opt.kind, { dayOfWeek: opt.defaultDayOfWeek, hour: opt.defaultHour });
    }
    router.replace('/(onboarding)/relate' as never);
  };

  return (
    <OnboardingScene
      footer={
        <View style={{ paddingBottom: Spacing.md }}>
          <Button
            label={pendingKind ? 'Set my reminder' : 'Pick a moment'}
            variant="dark"
            size="xl"
            fullWidth
            disabled={!pendingKind}
            onPress={submit}
          />
          <Pressable onPress={submit} hitSlop={12} accessibilityRole="button">
            <Caption tone="tertiary" style={{ textAlign: 'center', paddingVertical: Spacing.md }}>
              Skip — I&rsquo;ll choose later
            </Caption>
          </Pressable>
        </View>
      }
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: Spacing.lg, paddingBottom: Spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(AnimationDuration.base)} style={{ marginBottom: Spacing.lg }}>
          <EmphasisHeadline size={28}>When does your week **slow down**?</EmphasisHeadline>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(440).delay(120)} style={{ marginBottom: Spacing.xl }}>
          <InfoCard
            tone="warm"
            body="We'll bring you back **right around then** for your next scan. Change it anytime."
          />
        </Animated.View>

        <View style={{ gap: Spacing.sm }}>
          {ANCHOR_PRESETS.map((opt, i) => {
            const hasGlyph = Boolean(opt.glyph?.trim());
            const selected = pendingKind === opt.kind;
            return (
              <Animated.View
                key={opt.kind}
                entering={FadeInUp.duration(360).delay(180 + i * 60)}
              >
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={opt.label}
                  onPress={() => setPendingKind(opt.kind)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.md,
                    minHeight: Layout.tapTarget + Spacing.md,
                    paddingVertical: Spacing.md + 2,
                    paddingHorizontal: Spacing.lg,
                    borderRadius: Radii.lg,
                    borderWidth: selected ? 2 : 0,
                    borderColor: selected ? colors.accent.default : 'transparent',
                    backgroundColor: selected ? colors.accent.background : colors.surface.raised,
                    opacity: pressed ? 0.94 : 1,
                    ...(selected ? getShadow('none', mode) : getShadow('soft', mode)),
                  })}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {hasGlyph ? (
                      <Text style={{ fontSize: 20, lineHeight: 24 }}>{opt.glyph}</Text>
                    ) : (
                      <Ionicons name="ellipse-outline" size={16} color={colors.text.tertiary} />
                    )}
                  </View>
                  <Body
                    style={{
                      flex: 1,
                      flexShrink: 1,
                      fontSize: 17,
                      lineHeight: 22,
                      fontWeight: '600',
                    }}
                    tone={selected ? 'accent' : 'primary'}
                  >
                    {opt.label}
                  </Body>
                  {selected ? (
                    <Ionicons name="checkmark" size={20} color={colors.accent.default} />
                  ) : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </OnboardingScene>
  );
}
