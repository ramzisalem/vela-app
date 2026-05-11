/**
 * CheckIndicators (file 05).
 *
 * Four pills at the top — distance, lighting, pose, calm. Each pill must be
 * unambiguously readable on a dark camera preview: when the underlying check
 * passes the pill fills with the accent color and gains a checkmark; when it
 * fails it stays an outlined, low-key chip. Designed for one-second glances.
 *
 * The previous implementation used a pale accent.background fill on the OK
 * state, which on the camera viewfinder became less visible than the failing
 * state — defeating the indicator. This version inverts that contrast so a
 * passing pill *reads* as a clear positive signal at a glance.
 */
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: 5,
        borderRadius: Radii.pill,
        // OK: full copper fill, white text. Fail: outlined, white text on dark.
        backgroundColor: ok ? colors.accent.default : 'rgba(0,0,0,0.30)',
        borderWidth: ok ? 0 : 1,
        borderColor: ok ? 'transparent' : 'rgba(255,255,255,0.35)',
        marginHorizontal: 3,
      }}
      accessibilityLabel={`${label}: ${ok ? 'good' : 'adjust'}`}
    >
      {ok ? (
        <Ionicons name="checkmark" size={11} color={colors.text.inverse} />
      ) : null}
      <Text
        variant="caption"
        style={{
          color: colors.text.inverse,
          fontWeight: ok ? '600' : '500',
          fontSize: 12,
        }}
      >
        {label}
      </Text>
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
