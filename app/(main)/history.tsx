/**
 * History tab (file 02 + 39 + 37).
 *
 * Reverse chronological list of weekly scans with score, mode tag (if
 * active that week), and any diary notes attached. Tapping a row opens
 * the comparison drawer; the diary glyph opens the diary entry sheet.
 */
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Body, Caption, HeadlineSerif } from '@/components/ui/Text';
import { Spacing } from '@/theme/spacing';
import { useColors } from '@/theme';
import { useScanStore } from '@/stores/scanStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { DiaryAttachButton } from '@/components/diary/DiaryAttachButton';
import type { ScanSession } from '@/types';

export default function History() {
  const colors = useColors();
  const router = useRouter();
  const sessions = useScanStore((s) => s.sessions);
  const entries = useDiaryStore((s) => s.entries);

  const sorted = React.useMemo(
    () => [...sessions].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [sessions],
  );

  if (sorted.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="Every scan, in order."
          body="Once you have a couple of scans, they will line up here with their scores and any notes you attached."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ paddingTop: Spacing.lg }}>
        <HeadlineSerif>History</HeadlineSerif>
        <Caption tone="secondary" style={{ marginTop: Spacing.xs }}>
          Each row is a scan. The note glyph attaches a diary entry to a date.
        </Caption>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item }) => (
          <HistoryRow
            session={item}
            noteCount={entries.filter((e) => isAttached(e.attachedTo, item)).length}
            onPress={() => router.push('/(main)/compare')}
          />
        )}
        ListFooterComponent={() => (
          <View style={{ paddingVertical: Spacing.lg }}>
            <DiaryAttachButton
              attachedTo={{ kind: 'date', date: new Date().toISOString().slice(0, 10) }}
              label="Note for today"
            />
          </View>
        )}
      />
      <Caption tone="tertiary" style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }}>
        {sorted.length} scan{sorted.length === 1 ? '' : 's'} \u00b7 {entries.length} diary entr{entries.length === 1 ? 'y' : 'ies'}
      </Caption>
      {/* Reference colors so it isn't unused on light builds. */}
      <View accessibilityElementsHidden style={{ height: 0, backgroundColor: colors.background.primary }} />
    </Screen>
  );
}

function HistoryRow({
  session,
  noteCount,
  onPress,
}: {
  session: ScanSession;
  noteCount: number;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.row,
        {
          borderColor: colors.border.subtle,
          backgroundColor: colors.surface.raised,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Body>{prettyDate(session.createdAt)}</Body>
        <Caption tone="tertiary">
          Score {Math.round(session.scores.overall)}
          {session.isBaseline ? ' \u00b7 baseline' : ''}
        </Caption>
      </View>
      {noteCount > 0 ? (
        <Caption tone="accent">
          {noteCount} note{noteCount === 1 ? '' : 's'}
        </Caption>
      ) : null}
    </Pressable>
  );
}

function isAttached(
  attached: import('@/types/diary').DiaryAttachment,
  session: ScanSession,
): boolean {
  if (attached.kind === 'scan') return attached.sessionId === session.id;
  if (attached.kind === 'date') {
    return attached.date === session.createdAt.slice(0, 10);
  }
  return false;
}

function prettyDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
});
