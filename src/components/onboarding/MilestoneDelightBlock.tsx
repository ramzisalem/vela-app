import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { MilestoneAfterSection } from '@/core/onboarding/sectionCopy';
import { getMilestoneDelight, type AnswerMap } from '@/core/onboarding/delightContent';
import { sliceVizForMilestone } from '@/core/onboarding/delightVizSlice';
import { AnimationDuration } from '@/theme/animations';
import { useColors, useThemeMode } from '@/theme/ThemeContext';
import { VelaPrimarySoft, gradientStopsForMode } from '@/theme/gradients';
import { Radii, Spacing } from '@/theme/spacing';
import { Body, Text } from '@/components/ui/Text';
import { DelightDataViz } from '@/components/onboarding/DelightDataViz';

export function MilestoneDelightBlock({ section, answers }: { section: MilestoneAfterSection; answers: AnswerMap }) {
  const colors = useColors();
  const mode = useThemeMode();
  const soft = gradientStopsForMode(VelaPrimarySoft, mode);
  const d = getMilestoneDelight(section, answers);
  if (!d) return null;

  return (
    <Animated.View entering={FadeIn.duration(AnimationDuration.base).delay(120)} style={{ marginTop: Spacing.xl }}>
      <Text variant="sectionMarker" tone="secondary" style={{ marginBottom: Spacing.sm }}>
        Your snapshot
      </Text>
      {d.facts.map((fact, i) => (
        <Animated.View
          key={i}
          entering={FadeInUp.duration(AnimationDuration.fast).delay(80 + i * 70)}
          style={{ marginBottom: Spacing.sm }}
        >
          <LinearGradient
            colors={soft.colors as unknown as string[]}
            locations={soft.locations as unknown as number[]}
            start={soft.start}
            end={soft.end}
            style={{ borderRadius: Radii.md + 2, padding: 1.5 }}
          >
            <View
              style={{
                borderRadius: Radii.md,
                paddingVertical: Spacing.sm,
                paddingHorizontal: Spacing.base,
                backgroundColor: colors.background.tertiary,
              }}
            >
              <Body tone="secondary" style={{ fontSize: 15, lineHeight: 22 }}>
                {fact}
              </Body>
            </View>
          </LinearGradient>
        </Animated.View>
      ))}
      <View style={{ marginTop: Spacing.md }}>
        <DelightDataViz spec={sliceVizForMilestone(section, d.viz)} />
      </View>
    </Animated.View>
  );
}
