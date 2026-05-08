/**
 * Difference overlay (file 11). The third compare mode — soft red where
 * scores worsened, soft green where they improved. We render a CSS-blend
 * approximation; a Skia shader pass will land at v1.5.
 */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Caption } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { Radii } from '@/theme/spacing';

export interface CompareDifferenceProps {
  fromUri: string;
  toUri: string;
  fromLabel: string;
  toLabel: string;
  height?: number;
  /** When >0, the overall score went up; when <0, it went down. */
  scoreDelta?: number;
}

export function CompareDifference({
  fromUri,
  toUri,
  fromLabel,
  toLabel,
  height = 420,
  scoreDelta = 0,
}: CompareDifferenceProps) {
  const colors = useColors();
  const tint =
    scoreDelta > 0 ? colors.success.background : scoreDelta < 0 ? colors.warning.background : 'transparent';
  return (
    <View
      style={{
        height,
        borderRadius: Radii.lg,
        overflow: 'hidden',
        backgroundColor: colors.background.tertiary,
      }}
    >
      <Image source={{ uri: toUri }} style={StyleSheet.absoluteFill} />
      <Image
        source={{ uri: fromUri }}
        style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.18 }]} />
      <View style={{ position: 'absolute', top: 12, left: 12 }}>
        <Caption tone="inverse">{`${fromLabel} → ${toLabel}`}</Caption>
      </View>
    </View>
  );
}
