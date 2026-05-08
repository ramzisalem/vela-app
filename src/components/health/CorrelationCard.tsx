/**
 * Correlation card (file 33).
 *
 * Renders a single discovered correlation between a face metric and a
 * HealthKit signal. Copy is plain-language; the underlying r and p-value
 * are exposed only via an "Show details" disclosure for users who want
 * the math.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useColors } from '@/theme';
import { Body, Caption, Title } from '@/components/ui/Text';
import { Spacing } from '@/theme/spacing';
import type { Correlation } from '@/types/health';

interface Props {
  correlation: Correlation;
}

export function CorrelationCard({ correlation }: Props) {
  const colors = useColors();
  const [expanded, setExpanded] = React.useState(false);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface.raised, borderColor: colors.border.subtle },
      ]}
    >
      <Caption tone="tertiary">
        {readableSignal(correlation.healthSignal)} · {readableMetric(correlation.faceMetric)}
      </Caption>
      <Title>{correlation.insight}</Title>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide details' : 'Show details'}
        onPress={() => setExpanded((v) => !v)}
      >
        <Caption tone="accent" style={styles.toggle}>
          {expanded ? 'Hide details' : 'Show details'}
        </Caption>
      </Pressable>
      {expanded ? (
        <View style={styles.details}>
          <Body tone="secondary">
            r = {correlation.pearsonR.toFixed(2)} · p = {correlation.pValue.toFixed(3)} ·
            {' '}n = {correlation.sampleSize}
          </Body>
          <Caption tone="tertiary">
            Computed on this device. Raw HealthKit values never leave the phone.
          </Caption>
        </View>
      ) : null}
    </View>
  );
}

function readableMetric(key: Correlation['faceMetric']): string {
  switch (key) {
    case 'overall':
      return 'Overall';
    case 'redness':
      return 'Redness';
    case 'clarity':
      return 'Clarity';
    case 'eyeArea':
      return 'Eye area';
    case 'cheekVolume':
      return 'Cheek volume';
    case 'jawDefinition':
      return 'Jaw definition';
    case 'symmetry':
      return 'Symmetry';
  }
}

function readableSignal(key: Correlation['healthSignal']): string {
  switch (key) {
    case 'sleep':
      return 'Sleep';
    case 'hrv':
      return 'HRV';
    case 'cyclePhase':
      return 'Cycle';
    case 'weight':
      return 'Weight';
    case 'hydration':
      return 'Hydration';
    case 'alcohol':
      return 'Alcohol';
    case 'workout':
      return 'Workouts';
  }
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  toggle: { marginTop: Spacing.xxs },
  details: { gap: Spacing.xxs, marginTop: Spacing.xs },
});
