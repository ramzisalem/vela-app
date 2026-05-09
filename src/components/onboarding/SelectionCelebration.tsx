import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AnimationDuration } from '@/theme/animations';
import { useColors, useThemeMode } from '@/theme/ThemeContext';
import { VelaPrimary, gradientStopsForMode } from '@/theme/gradients';
import { Radii, Spacing } from '@/theme/spacing';
import { Body } from '@/components/ui/Text';

/** Short burst of copy before auto-advance on select. */
export function SelectionCelebration({ text }: { text: string }) {
  const colors = useColors();
  const mode = useThemeMode();
  const edge = gradientStopsForMode(VelaPrimary, mode);

  return (
    <Animated.View
      key={text}
      entering={FadeInUp.duration(AnimationDuration.fast)}
      style={{ marginBottom: Spacing.lg }}
    >
      <LinearGradient
        colors={edge.colors as unknown as string[]}
        locations={edge.locations as unknown as number[]}
        start={edge.start}
        end={edge.end}
        style={{ borderRadius: Radii.lg + 3, padding: 2 }}
      >
        <View
          style={{
            borderRadius: Radii.lg,
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.base,
            backgroundColor: colors.accent.background,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="sparkles" size={22} color={colors.text.accent} accessibilityIgnoresInvertColors />
            <Body tone="accent" style={{ flex: 1, fontSize: 15, lineHeight: 22 }}>
              {text}
            </Body>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
