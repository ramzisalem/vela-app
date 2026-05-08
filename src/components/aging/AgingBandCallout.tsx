/**
 * Aging-band callout chip (file 36).
 *
 * Sits below the trend chart when the user's latest scan falls outside the
 * band. Only one callout per chart per render. Forbidden words are caught
 * at lint-time (file 21 + the brand-voice script).
 */
import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Body, Caption } from '@/components/ui/Text';
import { useColors } from '@/theme';
import type { BandPosition, FaceMetric } from '@/types/aging';
import { calloutForPosition } from '@/core/aging/agingEngine';

interface Props {
  metric: FaceMetric;
  position: BandPosition;
  controllabilityHint: 'mostly-controllable' | 'partly-controllable' | 'mostly-natural';
  onWhatHelpsPress?: () => void;
}

export function AgingBandCallout({
  metric,
  position,
  controllabilityHint,
  onWhatHelpsPress,
}: Props) {
  const colors = useColors();
  const callout = calloutForPosition(metric, position, controllabilityHint);
  if (!callout) return null;

  return (
    <View
      accessibilityRole="text"
      accessible
      style={[
        styles.row,
        { backgroundColor: colors.surface.pressed, borderColor: colors.border.subtle },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: colors.text.tertiary, opacity: 0.6 }]} />
      <View style={{ flex: 1 }}>
        <Body tone="secondary">{callout.text}</Body>
        {callout.linkLabel && controllabilityHint !== 'mostly-natural' ? (
          <Pressable accessibilityRole="link" onPress={onWhatHelpsPress} style={styles.link}>
            <Caption tone="primary" style={{ textDecorationLine: 'underline' }}>
              {callout.linkLabel}
            </Caption>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
  link: { marginTop: 6 },
});
