import React from 'react';
import { Image, View } from 'react-native';
import { Caption } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { Spacing, Radii } from '@/theme/spacing';

export interface CompareSideBySideProps {
  fromUri: string;
  toUri: string;
  fromLabel: string;
  toLabel: string;
  height?: number;
}

export function CompareSideBySide({
  fromUri,
  toUri,
  fromLabel,
  toLabel,
  height = 420,
}: CompareSideBySideProps) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.sm, height }}>
      {[{ uri: fromUri, label: fromLabel }, { uri: toUri, label: toLabel }].map((p) => (
        <View
          key={p.label}
          style={{
            flex: 1,
            borderRadius: Radii.lg,
            overflow: 'hidden',
            backgroundColor: colors.background.tertiary,
          }}
        >
          <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} />
          <View style={{ position: 'absolute', top: Spacing.sm, left: Spacing.sm }}>
            <Caption tone="inverse">{p.label}</Caption>
          </View>
        </View>
      ))}
    </View>
  );
}
