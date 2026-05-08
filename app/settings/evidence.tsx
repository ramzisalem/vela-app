/**
 * Settings → Evidence index (file 50).
 *
 * Lists every shipped routine task with its evidence level, summary, and
 * citations. Lets the user filter by evidence level and tap into the help
 * topic for the longer treatment of the science behind each task.
 */
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { useColors } from '@/theme';
import { TASK_LIBRARY } from '@/core/routine/taskLibrary';
import type { EvidenceLevel } from '@/types';

const LEVEL_COPY: Record<EvidenceLevel, string> = {
  strong: 'Strong evidence \u2014 multiple RCTs in agreement.',
  moderate: 'Moderate \u2014 the trials we trust point the same way.',
  limited: 'Limited \u2014 small studies or observational data.',
  anecdotal: 'Anecdotal \u2014 we ship it because users find it useful.',
};

export default function EvidenceIndex() {
  const colors = useColors();
  const [filter, setFilter] = React.useState<EvidenceLevel | 'all'>('all');
  const filtered = React.useMemo(
    () =>
      filter === 'all'
        ? TASK_LIBRARY
        : TASK_LIBRARY.filter((t) => t.evidence.level === filter),
    [filter],
  );

  return (
    <Screen variant="secondary">
      <Stack.Screen options={{ title: 'Evidence' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl, paddingTop: Spacing.lg }}>
        <HeadlineSerif>Evidence</HeadlineSerif>
        <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
          Each task we suggest carries an honest evidence tag. Strong, moderate, limited, or anecdotal \u2014 we don\u2019t hide the difference.
        </Body>

        <View style={[styles.filterRow, { marginTop: Spacing.lg }]}>
          {(['all', 'strong', 'moderate', 'limited', 'anecdotal'] as const).map((level) => {
            const active = filter === level;
            return (
              <Pressable
                key={level}
                accessibilityRole="button"
                onPress={() => setFilter(level)}
                style={[
                  styles.chip,
                  {
                    borderColor: colors.border.default,
                    backgroundColor: active ? colors.text.primary : 'transparent',
                  },
                ]}
              >
                <Caption style={{ color: active ? colors.surface.raised : colors.text.primary }}>
                  {level === 'all' ? 'All' : level}
                </Caption>
              </Pressable>
            );
          })}
        </View>

        {filtered.map((task) => (
          <View
            key={task.id}
            style={[
              styles.row,
              { borderColor: colors.border.subtle, backgroundColor: colors.surface.raised },
            ]}
          >
            <Title>{task.title}</Title>
            <Caption tone="tertiary">{LEVEL_COPY[task.evidence.level]}</Caption>
            <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
              {task.evidence.summary}
            </Body>
            {task.evidence.citations.length > 0 ? (
              <View style={{ marginTop: Spacing.xs }}>
                {task.evidence.citations.map((c, i) => (
                  <Pressable
                    key={`${task.id}-${i}`}
                    accessibilityRole="link"
                    onPress={() =>
                      c.doi
                        ? Linking.openURL(`https://doi.org/${c.doi}`)
                        : c.url
                          ? Linking.openURL(c.url)
                          : undefined
                    }
                  >
                    <Caption tone="accent">
                      {c.title}
                      {c.year ? ` (${c.year})` : ''}
                    </Caption>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
      <View style={{ padding: Spacing.lg }}>
        <Button variant="secondary" label="Back" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.xxs,
    marginTop: Spacing.sm,
  },
});
