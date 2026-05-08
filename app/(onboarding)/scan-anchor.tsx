/**
 * Scan-anchor onboarding screen (file 42).
 *
 * Optional. Sits between baseline reveal and paywall (per file 07 placement).
 * The emoji exception in file 21 applies to this single screen — soft glyphs
 * cue life moments. No other emoji exceptions in onboarding.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Body, HeadlineSerif } from '@/components/ui/Text';
import { useColors } from '@/theme';
import { ANCHOR_PRESETS } from '@/types/anchor';
import { useAnchorStore } from '@/stores/anchorStore';

export default function ScanAnchorScreen() {
  const router = useRouter();
  const colors = useColors();
  const setKind = useAnchorStore((s) => s.setKind);

  return (
    <Screen style={{ paddingHorizontal: 20, paddingTop: 24 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <HeadlineSerif>When does your week tend to slow down?</HeadlineSerif>
        <Body tone="secondary" style={styles.subtitle}>
          We’ll bring you back for your next scan around then. You can change this anytime.
        </Body>
        <View style={[styles.list, { borderColor: colors.border.subtle }]}>
          {ANCHOR_PRESETS.map((opt, idx) => (
            <Pressable
              key={opt.kind}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              onPress={() => {
                setKind(opt.kind, {
                  dayOfWeek: opt.defaultDayOfWeek,
                  hour: opt.defaultHour,
                });
                router.replace('/paywall');
              }}
              style={[
                styles.row,
                idx === ANCHOR_PRESETS.length - 1 ? null : { borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
              ]}
            >
              <Body style={styles.glyph}>{opt.glyph}</Body>
              <Body>{opt.label}</Body>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: 8, marginBottom: 24 },
  list: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  glyph: { width: 28 },
});
