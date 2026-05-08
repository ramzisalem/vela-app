/**
 * CheckIndicators (file 05).
 *
 * Three small pills at the top — distance, lighting, alignment. Each turns
 * accent-tinted when the underlying check passes. Designed to be glanceable
 * in 1 second on a moving camera UI.
 */
import React from 'react';
import { View } from 'react-native';
import { Caption } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { Radii, Spacing } from '@/theme/spacing';

export interface CheckIndicatorsProps {
  distanceOk: boolean;
  lightOk: boolean;
  alignmentOk: boolean;
}

interface PillProps {
  label: string;
  ok: boolean;
}

function Pill({ label, ok }: PillProps) {
  const colors = useColors();
  return (
    <View
      style={{
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xxs,
        borderRadius: Radii.pill,
        backgroundColor: ok ? colors.accent.background : 'rgba(0,0,0,0.18)',
        marginHorizontal: Spacing.xxs,
      }}
      accessibilityLabel={`${label}: ${ok ? 'good' : 'adjust'}`}
    >
      <Caption tone={ok ? 'accent' : 'inverse'}>{label}</Caption>
    </View>
  );
}

export function CheckIndicators({ distanceOk, lightOk, alignmentOk }: CheckIndicatorsProps) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
      <Pill label="Distance" ok={distanceOk} />
      <Pill label="Light" ok={lightOk} />
      <Pill label="Alignment" ok={alignmentOk} />
    </View>
  );
}
