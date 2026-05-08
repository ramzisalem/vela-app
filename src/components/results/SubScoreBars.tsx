import React from 'react';
import { View } from 'react-native';
import { Body, Caption } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { Spacing, Radii } from '@/theme/spacing';
import type { ScanScores } from '@/types';
import type { SubScoreKey } from '@/theme';

const ROWS: ReadonlyArray<{ key: keyof ScanScores; label: string; subKey: SubScoreKey }> = [
  { key: 'skin', label: 'Skin', subKey: 'skin' },
  { key: 'symmetry', label: 'Symmetry', subKey: 'symmetry' },
  { key: 'grooming', label: 'Grooming', subKey: 'grooming' },
  { key: 'lighting', label: 'Lighting', subKey: 'vitality' },
  { key: 'contour', label: 'Contour', subKey: 'definition' },
];

export function SubScoreBars({ scores }: { scores: ScanScores }) {
  const colors = useColors();
  return (
    <View style={{ gap: Spacing.sm }}>
      {ROWS.map((row) => {
        const score = scores[row.key];
        const safe = typeof score === 'number' ? score : 0;
        const pct = Math.max(0, Math.min(100, safe));
        return (
          <View key={row.key}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: Spacing.xxs,
              }}
            >
              <Body>{row.label}</Body>
              <Body tone="secondary">{Math.round(safe)}</Body>
            </View>
            <View
              style={{
                height: 6,
                borderRadius: Radii.pill,
                backgroundColor: colors.border.subtle,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: Radii.pill,
                  backgroundColor: colors.subScore[row.subKey],
                }}
              />
            </View>
            {row.key === 'skin' ? (
              <Caption tone="secondary" style={{ marginTop: Spacing.xxs }}>
                Sub-score color is identifier-only — not a value judgment.
              </Caption>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
