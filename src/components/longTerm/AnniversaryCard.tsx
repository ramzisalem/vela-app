/**
 * Anniversary card (file 45).
 *
 * 1 / 2 / 3 / 5 year tribute. Stats first, then a single AI-generated
 * tribute line. No celebration confetti, no slang honorifics, no
 * exclamation marks.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif } from '@/components/ui/Text';
import { Spacing } from '@/theme/spacing';
import type { AnniversaryCard as AnniversaryCardData } from '@/types/longTerm';

interface Props {
  card: AnniversaryCardData;
}

export function AnniversaryCard({ card }: Props) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface.raised, borderColor: colors.border.subtle },
      ]}
    >
      <Caption tone="tertiary">{kindLabel(card.kind)}</Caption>
      <HeadlineSerif>{card.tribute}</HeadlineSerif>
      <View style={styles.statsRow}>
        <Stat label="Scans" value={card.stats.totalScans} />
        <Stat label="Routine days" value={card.stats.totalRoutineCompletions} />
        <Stat label="Consistent days" value={card.stats.totalConsistentDays} />
      </View>
      <Caption tone="secondary">
        Tracking since {prettyDate(card.stats.startedAt)}
      </Caption>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Body>{value}</Body>
      <Caption tone="tertiary">{label}</Caption>
    </View>
  );
}

function kindLabel(kind: AnniversaryCardData['kind']): string {
  switch (kind) {
    case 'one-year':
      return 'One year on Vela';
    case 'two-year':
      return 'Two years on Vela';
    case 'three-year':
      return 'Three years on Vela';
    case 'five-year':
      return 'Five years on Vela';
  }
}

function prettyDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  stat: { alignItems: 'flex-start', gap: 2 },
});
