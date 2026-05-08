/**
 * Vela Journal index screen (file 50, Part B).
 *
 * Lists published essays, newest first. The most recent essay sits in a
 * featured card at the top; the rest read as a calm vertical list. No
 * social signals, no read counts, no author following.
 */
import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { getJournalService } from '@/services/journal';
import type { JournalEssay } from '@/types/journal';

export default function JournalIndexScreen() {
  const colors = useColors();
  const [essays, setEssays] = React.useState<JournalEssay[]>([]);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await getJournalService().listPublished();
      setEssays(list);
    } catch {
      setEssays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const featured = essays[0];
  const rest = essays.slice(1);

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <Stack.Screen options={{ title: 'Journal', headerShown: false }} />
      <FlatList
        data={rest}
        keyExtractor={(e) => e.slug}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Caption tone="tertiary">From Vela</Caption>
              <HeadlineSerif>Journal</HeadlineSerif>
              <Body tone="secondary">A monthly essay on faces, skin, and time.</Body>
            </View>
            {featured ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(`/journal/${featured.slug}`)}
                style={[
                  styles.featured,
                  { backgroundColor: colors.surface.raised, borderColor: colors.border.subtle },
                ]}
              >
                <Caption tone="tertiary">{prettyDate(featured.publishedAt)}</Caption>
                <Title>{featured.title}</Title>
                {featured.subtitle ? <Body tone="secondary">{featured.subtitle}</Body> : null}
                <Caption tone="tertiary">{featured.estimatedReadMinutes} min read</Caption>
              </Pressable>
            ) : (
              <View style={styles.empty}>
                <Body tone="secondary" style={{ textAlign: 'center' }}>
                  No essays yet. The first one is on its way.
                </Body>
              </View>
            )}
            {rest.length > 0 ? (
              <Caption tone="tertiary" style={styles.archiveLabel}>
                Archive
              </Caption>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(`/journal/${item.slug}`)}
            style={styles.row}
          >
            <Caption tone="tertiary">{prettyDate(item.publishedAt)}</Caption>
            <Body style={{ color: colors.text.primary }}>{item.title}</Body>
          </Pressable>
        )}
        ItemSeparatorComponent={() => (
          <View style={[styles.sep, { backgroundColor: colors.border.subtle }]} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={colors.text.tertiary}
          />
        }
        contentContainerStyle={styles.list}
      />
      <View style={styles.footer}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    </View>
  );
}

function prettyDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingBottom: 120 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.xxs,
  },
  featured: {
    marginHorizontal: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  archiveLabel: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  row: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xxs,
  },
  sep: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.lg },
  empty: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
