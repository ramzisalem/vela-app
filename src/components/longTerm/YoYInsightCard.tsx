/**
 * Year-over-year insight card (file 45).
 *
 * Surfaces only when `shouldShow` is true and the user is past the 365-day
 * eligibility window. Includes a disclosure for life-stage windows so YoY
 * isn't silently suppressed.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors } from '@/theme';
import { Body, Caption, Title } from '@/components/ui/Text';
import { Spacing } from '@/theme/spacing';
import type { YoYInsight } from '@/types/longTerm';
import type { FaceMetric } from '@/types/aging';

interface Props {
  insight: YoYInsight;
  inLifeStageWindow?: boolean;
}

export function YoYInsightCard({ insight, inLifeStageWindow }: Props) {
  const colors = useColors();
  if (!insight.shouldShow) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface.raised, borderColor: colors.border.subtle },
      ]}
    >
      <Caption tone="tertiary">A year of {readableMetric(insight.metric)}</Caption>
      <Title>{insight.insight}</Title>
      {inLifeStageWindow ? (
        <Caption tone="secondary">
          A life-stage window overlaps this year-over-year view. Consider it context, not a verdict.
        </Caption>
      ) : null}
    </View>
  );
}

function readableMetric(metric: FaceMetric): string {
  switch (metric) {
    case 'overall':
      return 'overall';
    case 'skinClarity':
      return 'clarity';
    case 'redness':
      return 'redness';
    case 'eyeArea':
      return 'eye area';
    case 'cheekVolume':
      return 'cheek volume';
    case 'jawDefinition':
      return 'jaw definition';
    case 'symmetry':
      return 'symmetry';
    case 'hairDensity':
      return 'hair density';
  }
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
});
