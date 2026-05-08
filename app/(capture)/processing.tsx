/**
 * Brief “reading your scan” beat after capture completes (file 05).
 * `capture.tsx` routes here before results-reveal so the UX is not a hard jump.
 */
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { useColors } from '@/theme/ThemeContext';
import { Spacing } from '@/theme/spacing';

export default function Processing() {
  const router = useRouter();
  const colors = useColors();
  useEffect(() => {
    const t = setTimeout(() => router.replace('/(capture)/results-reveal'), 1500);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.text.accent} />
        <Body tone="secondary" style={{ marginTop: Spacing.lg }}>
          Reading your scan
        </Body>
      </View>
    </Screen>
  );
}
