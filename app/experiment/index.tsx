/**
 * Experiment list screen (file 44).
 *
 * Shows the active experiment (if any), past verdicts, and a CTA to start
 * a new one. Verdict copy is conservative by design — "unclear" is a valid
 * outcome and treated as such, not framed as failure.
 */
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { useExperimentStore } from '@/stores/experimentStore';
import type { Experiment } from '@/types/experiment';

export default function ExperimentScreen() {
  const colors = useColors();
  const experiments = useExperimentStore((s) => s.experiments);
  const active = experiments.find((e) => e.status === 'active');
  const past = experiments.filter((e) => e.status !== 'active');

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <Stack.Screen options={{ title: 'Experiments', headerShown: false }} />
      <View style={styles.header}>
        <HeadlineSerif>Experiments</HeadlineSerif>
        <Caption tone="tertiary">One change at a time. Hold the routine steady.</Caption>
      </View>
      {active ? (
        <View
          style={[
            styles.activeCard,
            { backgroundColor: colors.surface.raised, borderColor: colors.border.subtle },
          ]}
        >
          <Caption tone="accent">In progress</Caption>
          <Title>{active.hypothesis.label}</Title>
          <Body tone="secondary">{active.hypothesis.dailyAction}</Body>
          <Caption tone="tertiary">
            Through {formatDate(active.endDate)} · {active.complianceLog.filter((l) => l.complied).length} days logged
          </Caption>
        </View>
      ) : (
        <View style={styles.emptyActive}>
          <Body tone="secondary" style={{ textAlign: 'center' }}>
            No experiment running.
          </Body>
        </View>
      )}
      <View style={styles.startButton}>
        <Button
          variant="primary"
          label={active ? 'Abort and start new' : 'Start an experiment'}
          onPress={() => router.push('/experiment/new')}
        />
      </View>
      <Caption tone="tertiary" style={styles.pastLabel}>
        Past experiments
      </Caption>
      <FlatList
        data={past}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <PastExperimentRow experiment={item} />}
        ItemSeparatorComponent={() => (
          <View style={[styles.sep, { backgroundColor: colors.border.subtle }]} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Caption tone="tertiary" style={{ textAlign: 'center', marginTop: Spacing.lg }}>
            None yet.
          </Caption>
        }
      />
      <View style={styles.footer}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    </View>
  );
}

function PastExperimentRow({ experiment }: { experiment: Experiment }) {
  const colors = useColors();
  const verdict = experiment.verdict;
  return (
    <Pressable style={styles.row}>
      <Caption tone="tertiary">
        {formatDate(experiment.startDate)} – {formatDate(experiment.endDate)}
      </Caption>
      <Body style={{ color: colors.text.primary }}>{experiment.hypothesis.label}</Body>
      {verdict ? (
        <Caption tone="secondary">
          {verdictLabel(verdict.effectSize)} · {verdict.recommendation.replace(/-/g, ' ')}
        </Caption>
      ) : (
        <Caption tone="tertiary">Aborted</Caption>
      )}
    </Pressable>
  );
}

function verdictLabel(effect: NonNullable<Experiment['verdict']>['effectSize']): string {
  switch (effect) {
    case 'meaningful':
      return 'A real change';
    case 'small':
      return 'A small change';
    case 'unclear':
      return 'Unclear';
    case 'none':
      return 'No change';
    case 'inverted':
      return 'Moved the other way';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.xxs,
  },
  activeCard: {
    marginHorizontal: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.xxs,
  },
  emptyActive: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  startButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  pastLabel: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  row: { paddingVertical: Spacing.md, gap: Spacing.xxs },
  sep: { height: StyleSheet.hairlineWidth },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
