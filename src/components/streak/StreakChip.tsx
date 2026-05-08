/**
 * Streak chip (file 39).
 *
 * No flame, no fire, no red color. The "soft warm-pink dot" mark uses a
 * single hue from VelaPrimarySoft. The chip has no background — just text on
 * the cream surface.
 */
import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Body, HeadlineSerif, Caption } from '@/components/ui/Text';
import { useColors } from '@/theme';
import { useStreakStore } from '@/stores/streakStore';

interface Props {
  onPress?: () => void;
}

export function StreakChip({ onPress }: Props) {
  const colors = useColors();
  const { state, prefs } = useStreakStore();
  if (prefs.visibility === 'hidden') return null;
  if (prefs.visibility === 'subtle') return null;

  const ended = state.recentlyEnded && state.currentStreakDays === 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        ended
          ? 'New rhythm starts today. Double-tap for streak details.'
          : `Streak: ${state.currentStreakDays} days of consistency. Double-tap to see details.`
      }
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: colors.text.accent, opacity: 0.6 },
        ]}
      />
      {ended ? (
        <Body tone="secondary">New rhythm starts today.</Body>
      ) : (
        <View style={styles.text}>
          <HeadlineSerif>{state.currentStreakDays}</HeadlineSerif>
          <Caption tone="secondary"> days of consistency</Caption>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
    opacity: 0.6,
  },
  text: { flexDirection: 'row', alignItems: 'baseline' },
});
