/**
 * Journal essay reader (file 50, Part B).
 *
 * Calm reader: title, byline, body, references. The render here is plain
 * Markdown-as-text — paragraphs are split on blank lines. v1.1 ships
 * intentionally simple; rich Markdown rendering can come later.
 */
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { getJournalService } from '@/services/journal';
import type { JournalEssay } from '@/types/journal';

export default function JournalEssayScreen() {
  const colors = useColors();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [essay, setEssay] = React.useState<JournalEssay | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const e = slug ? await getJournalService().getBySlug(slug) : null;
        if (!cancelled) setEssay(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background.primary }]}>
        <ActivityIndicator color={colors.text.tertiary} />
      </View>
    );
  }

  if (!essay) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background.primary }]}>
        <Body tone="secondary">Essay not found.</Body>
        <Button label="Back to Journal" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <Stack.Screen options={{ title: 'Journal', headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Caption tone="tertiary">{prettyDate(essay.publishedAt)} · {essay.estimatedReadMinutes} min read</Caption>
        <HeadlineSerif>{essay.title}</HeadlineSerif>
        {essay.subtitle ? <Title>{essay.subtitle}</Title> : null}
        <Caption tone="secondary">By {essay.authorName}</Caption>
        <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
        {paragraphsOf(essay.body).map((para, i) => (
          <Body key={i} style={styles.paragraph}>
            {para}
          </Body>
        ))}
        {essay.references && essay.references.length > 0 ? (
          <View style={styles.references}>
            <Caption tone="tertiary">References</Caption>
            {essay.references.map((r, i) => (
              <Caption key={i} tone="secondary">
                {r.citation}
              </Caption>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    </View>
  );
}

function paragraphsOf(body: string): string[] {
  return body
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function prettyDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 120 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.sm },
  paragraph: { lineHeight: 26, marginBottom: Spacing.sm },
  references: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.xxs,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
