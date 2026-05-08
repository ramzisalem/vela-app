/**
 * Compare scrubber (file 11, pair picker).
 *
 * Two horizontal pickers — one for the `from` scan, one for the `to`
 * scan — laid out as compact week chips. The scrubber surfaces every
 * scan in the user's history so before/after comparisons are not
 * limited to oldest vs newest.
 *
 * The interaction is intentionally lightweight: tapping a chip moves
 * the corresponding pointer. We block invalid selections (`from`
 * after `to`) by snapping the other pointer one step away.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Caption } from '@/components/ui/Text';
import { Spacing } from '@/theme/spacing';
import { useColors } from '@/theme';
import type { ScanSession } from '@/types';

export interface CompareScrubberProps {
  sessions: ReadonlyArray<ScanSession>;
  fromIndex: number;
  toIndex: number;
  onChange: (next: { fromIndex: number; toIndex: number }) => void;
}

export function CompareScrubber({
  sessions,
  fromIndex,
  toIndex,
  onChange,
}: CompareScrubberProps) {
  const colors = useColors();

  if (sessions.length < 2) return null;

  const select = (kind: 'from' | 'to', idx: number) => {
    if (kind === 'from') {
      const safeTo = idx >= toIndex ? Math.min(idx + 1, sessions.length - 1) : toIndex;
      onChange({ fromIndex: idx, toIndex: safeTo });
    } else {
      const safeFrom = idx <= fromIndex ? Math.max(idx - 1, 0) : fromIndex;
      onChange({ fromIndex: safeFrom, toIndex: idx });
    }
  };

  return (
    <View style={{ gap: Spacing.xs }}>
      <Caption tone="secondary">From</Caption>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {sessions.map((s, idx) => {
          const selected = idx === fromIndex;
          return (
            <Pressable
              key={`from-${s.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Pick week ${s.weekNumber} as the start`}
              accessibilityState={{ selected }}
              onPress={() => select('from', idx)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.text.primary : colors.surface.raised,
                  borderColor: colors.border.subtle,
                },
              ]}
            >
              <Caption
                tone="secondary"
                style={[
                  styles.chipLabel,
                  { color: selected ? colors.background.primary : colors.text.secondary },
                ]}
              >
                {`Wk ${s.weekNumber}`}
              </Caption>
            </Pressable>
          );
        })}
      </ScrollView>
      <Caption tone="secondary">To</Caption>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {sessions.map((s, idx) => {
          const selected = idx === toIndex;
          return (
            <Pressable
              key={`to-${s.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Pick week ${s.weekNumber} as the end`}
              accessibilityState={{ selected }}
              onPress={() => select('to', idx)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.text.primary : colors.surface.raised,
                  borderColor: colors.border.subtle,
                },
              ]}
            >
              <Caption
                tone="secondary"
                style={[
                  styles.chipLabel,
                  { color: selected ? colors.background.primary : colors.text.secondary },
                ]}
              >
                {`Wk ${s.weekNumber}`}
              </Caption>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.xs, paddingVertical: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipLabel: { fontVariant: ['tabular-nums'] },
});
