/**
 * Diary list screen (file 37).
 *
 * Reverse-chronological list of all entries. Tap to view, swipe to delete.
 * The "Add a note" button opens DiaryEntrySheet attached to today.
 */
import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useColors } from '@/theme';
import { Body, HeadlineSerif, Caption } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { useDiaryStore } from '@/stores/diaryStore';
import { useProfileStore } from '@/stores/profileStore';
import { DiaryEntrySheet } from '@/components/diary/DiaryEntrySheet';
import type { DiaryEntry } from '@/types/diary';

export default function DiaryScreen() {
  const colors = useColors();
  const entries = useDiaryStore((s) => s.entries);
  const profile = useProfileStore((s) => s.profile);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const sorted = React.useMemo(
    () => [...entries].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [entries],
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <Stack.Screen options={{ title: 'Diary', headerShown: false }} />
      <View style={styles.header}>
        <HeadlineSerif>Diary</HeadlineSerif>
        <Caption tone="tertiary">A small log. Just for you.</Caption>
      </View>
      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Body tone="secondary" style={{ textAlign: 'center' }}>
            No notes yet. The first one takes about 8 seconds.
          </Body>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <DiaryRow entry={item} />}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.border.subtle }]} />
          )}
        />
      )}
      <View style={styles.footer}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
        <Button label="Add a note" variant="primary" onPress={() => setSheetOpen(true)} />
      </View>
      <DiaryEntrySheet
        visible={sheetOpen}
        attachedTo={{ kind: 'date', date: today }}
        userId={profile?.id ?? 'anon'}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

function DiaryRow({ entry }: { entry: DiaryEntry }) {
  const colors = useColors();
  return (
    <Pressable style={styles.row}>
      <Caption tone="tertiary">{formatRowDate(entry.createdAt)}</Caption>
      {entry.body ? (
        <Body numberOfLines={3} style={{ color: colors.text.primary }}>
          {entry.body}
        </Body>
      ) : null}
      {entry.userTags.length ? (
        <Caption tone="secondary">{entry.userTags.join(' · ')}</Caption>
      ) : null}
    </Pressable>
  );
}

function formatRowDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.xxs,
  },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  row: { paddingVertical: Spacing.md, gap: Spacing.xxs },
  sep: { height: StyleSheet.hairlineWidth },
  empty: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
