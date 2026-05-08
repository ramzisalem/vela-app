/**
 * On-this-day card (file 45).
 *
 * Surfaces a single past scan from N years ago. Calm tone. No
 * comparison pressure — just a small marker that you were here, doing
 * this work, a year ago.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useColors } from '@/theme';
import { Body, Caption, Title } from '@/components/ui/Text';
import { Spacing } from '@/theme/spacing';
import type { OnThisDayCard as OnThisDayCardData } from '@/types/longTerm';

interface Props {
  card: OnThisDayCardData;
  onPress?: () => void;
}

export function OnThisDayCard({ card, onPress }: Props) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`On this day, ${card.yearsAgo} year${card.yearsAgo === 1 ? '' : 's'} ago`}
      style={[
        styles.card,
        { backgroundColor: colors.surface.raised, borderColor: colors.border.subtle },
      ]}
    >
      <Caption tone="tertiary">On this day · {card.yearsAgo}y ago</Caption>
      <Title>{formatPretty(card.remembrance)}</Title>
      {card.note ? <Body tone="secondary">{card.note}</Body> : null}
      <View
        style={[styles.divider, { backgroundColor: colors.border.subtle }]}
      />
      <Caption tone="accent">View that scan</Caption>
    </Pressable>
  );
}

function formatPretty(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.xxs },
});
