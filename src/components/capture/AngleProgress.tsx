/**
 * AngleProgress (file 05). Three dots in a row showing which angles are
 * captured for the current session. Front, left turn, right turn.
 */
import React from 'react';
import { View } from 'react-native';
import { Caption } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { Radii, Spacing } from '@/theme/spacing';

const ORDER = ['front', 'left_turn', 'right_turn'] as const;
const LABELS: Record<(typeof ORDER)[number], string> = {
  front: 'Front',
  left_turn: 'Left turn',
  right_turn: 'Right turn',
};

export interface AngleProgressProps {
  current: (typeof ORDER)[number];
  captured: ReadonlyArray<(typeof ORDER)[number]>;
}

export function AngleProgress({ current, captured }: AngleProgressProps) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.lg,
        alignSelf: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radii.lg,
        backgroundColor: 'rgba(0,0,0,0.22)',
      }}
    >
      {ORDER.map((angle) => {
        const isDone = captured.includes(angle);
        const isCurrent = angle === current;
        const fill = isDone
          ? colors.accent.default
          : isCurrent
            ? colors.text.inverse
            : 'rgba(255,255,255,0.35)';
        return (
          <View key={angle} style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: fill,
                marginBottom: Spacing.xs,
              }}
            />
            <Caption tone="inverse">{LABELS[angle]}</Caption>
          </View>
        );
      })}
    </View>
  );
}
