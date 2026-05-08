/**
 * Streak detail sheet (file 39).
 *
 * Calendar heatmap of past 30 days. Cream squares = consistent days, ghosted
 * = freezes, blank = misses. The "Make streaks less prominent" link routes
 * to settings.
 */
import React from 'react';
import { Modal, Pressable, View, StyleSheet } from 'react-native';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif } from '@/components/ui/Text';
import { useStreakStore } from '@/stores/streakStore';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onMakeLessProminent: () => void;
}

export function StreakDetailSheet({ visible, onDismiss, onMakeLessProminent }: Props) {
  const colors = useColors();
  const { state, records } = useStreakStore();

  const last30 = recentRecords(records, 30);
  const usedThisWeek = state.totalFreezesUsed > 0;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onDismiss}>
      <Pressable style={styles.scrim} onPress={onDismiss}>
        <View style={[styles.sheet, { backgroundColor: colors.surface.raised }]}>
          <HeadlineSerif>{`${state.currentStreakDays} days of consistency`}</HeadlineSerif>
          {state.startedAt ? (
            <Caption tone="secondary">{`Started on ${formatDate(state.startedAt)}.`}</Caption>
          ) : null}

          <View style={styles.heatmap}>
            {last30.map((cell, i) => (
              <View
                key={`${cell.date}-${i}`}
                accessibilityLabel={cellLabel(cell)}
                style={[
                  styles.cell,
                  {
                    backgroundColor: cell.consistent
                      ? colors.surface.pressed
                      : 'transparent',
                    borderColor:
                      cell.freezeApplied !== 'none'
                        ? colors.border.subtle
                        : colors.border.default,
                    borderStyle: cell.freezeApplied !== 'none' ? 'dashed' : 'solid',
                    opacity: cell.consistent ? 1 : 0.35,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.section}>
            <Body tone="secondary">What counts as consistent</Body>
            <Caption tone="secondary" style={styles.bodyCopy}>
              A day where you completed most of your scheduled routine tasks. Vela gives you a
              freeze each week for the days life gets in the way — automatic, no need to claim it.
            </Caption>
          </View>

          <View style={styles.section}>
            <Body tone="secondary">Used this week</Body>
            <Caption tone="secondary" style={styles.bodyCopy}>
              {usedThisWeek ? `${state.totalFreezesUsed} auto-freeze used.` : 'None used.'}
            </Caption>
          </View>

          <Pressable accessibilityRole="button" onPress={onMakeLessProminent} style={styles.actionRow}>
            <Caption tone="secondary" style={{ textDecorationLine: 'underline' }}>
              Make streaks less prominent
            </Caption>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function recentRecords(
  records: ReadonlyArray<import('@/types/streak').StreakDayRecord>,
  count: number,
): ReadonlyArray<import('@/types/streak').StreakDayRecord> {
  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : -1));
  return sorted.slice(0, count).reverse();
}

function cellLabel(r: import('@/types/streak').StreakDayRecord): string {
  if (r.consistent && r.freezeApplied === 'none') return `${r.date}: consistent.`;
  if (r.consistent) return `${r.date}: paused (${r.freezeApplied}).`;
  return `${r.date}: missed.`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(36,31,26,0.5)' },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
  },
  heatmap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 12,
  },
  cell: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
  },
  section: { marginTop: 12 },
  bodyCopy: { marginTop: 4 },
  actionRow: { alignItems: 'flex-start', marginTop: 16 },
});
