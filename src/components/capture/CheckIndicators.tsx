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
  /** Yaw, pitch, roll vs camera (native). */
  alignmentOk: boolean;
  /** Blend-shape neutrality (native). */
  expressionOk: boolean;
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
        paddingHorizontal: Spacing.xs,
        paddingVertical: Spacing.xxs,
        borderRadius: Radii.pill,
        backgroundColor: ok ? colors.accent.background : 'rgba(0,0,0,0.22)',
        borderWidth: ok ? 1 : 0,
        borderColor: ok ? colors.border.accent : 'transparent',
        marginHorizontal: 2,
      }}
      accessibilityLabel={`${label}: ${ok ? 'good' : 'adjust'}`}
    >
      <Caption tone={ok ? 'accent' : 'inverse'}>{label}</Caption>
    </View>
  );
}

export function CheckIndicators({ distanceOk, lightOk, alignmentOk, expressionOk }: CheckIndicatorsProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Pill label="Distance" ok={distanceOk} />
      <Pill label="Light" ok={lightOk} />
      <Pill label="Pose" ok={alignmentOk} />
      <Pill label="Calm" ok={expressionOk} />
    </View>
  );
}
