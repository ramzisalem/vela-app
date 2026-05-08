/**
 * Monthly Wrapped route (file 38).
 *
 * Statistical cards render immediately. AI cards (cover tagline, quiet-note,
 * treatment progress note) stream in with skeletons matching card layout.
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/theme';
import { Body, HeadlineSerif, Caption, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { composeWrappedCards } from '@/core/wrapped/wrappedComposer';
import { useScanStore } from '@/stores/scanStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { useStreakStore } from '@/stores/streakStore';
import type { WrappedCard } from '@/types/wrapped';

export default function WrappedScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ month?: string }>();
  const month = params.month ?? defaultPriorMonth();
  const scans = useScanStore((s) => s.sessions);
  const diaryEntries = useDiaryStore((s) => s.entries);
  const streakState = useStreakStore((s) => s.state);

  const cards = React.useMemo<WrappedCard[]>(() => {
    const { monthStart, monthEnd } = monthRange(month);
    const inMonth = scans.filter(
      (s) =>
        Date.parse(s.createdAt) >= monthStart.getTime() &&
        Date.parse(s.createdAt) < monthEnd.getTime(),
    );
    const priorStart = new Date(monthStart);
    priorStart.setMonth(priorStart.getMonth() - 1);
    const inPrior = scans.filter(
      (s) =>
        Date.parse(s.createdAt) >= priorStart.getTime() &&
        Date.parse(s.createdAt) < monthStart.getTime(),
    );
    const diary = diaryEntries.filter(
      (e) =>
        Date.parse(e.createdAt) >= monthStart.getTime() &&
        Date.parse(e.createdAt) < monthEnd.getTime(),
    );
    return composeWrappedCards({
      month,
      scansThisMonth: inMonth,
      scansLastMonth: inPrior,
      consistentDaysThisMonth: streakState.totalConsistentDays,
      totalDaysInMonth: daysInMonth(month),
      correlations: [],
      diaryEntries: diary,
      hasActiveTreatment: false,
    });
  }, [month, scans, diaryEntries, streakState.totalConsistentDays]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <Stack.Screen options={{ title: 'Wrapped', headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Caption tone="tertiary">{prettyMonth(month)}</Caption>
        <HeadlineSerif>Your month, in your data.</HeadlineSerif>
        {cards.map((card, i) => (
          <View
            key={i}
            style={[styles.card, { backgroundColor: colors.surface.raised, borderColor: colors.border.subtle }]}
          >
            <CardBody card={card} />
          </View>
        ))}
        <Button label="Done" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

function CardBody({ card }: { card: WrappedCard }) {
  switch (card.kind) {
    case 'cover':
      return (
        <>
          <Title>{card.tagline}</Title>
        </>
      );
    case 'scans':
      return (
        <>
          <Title>{`${card.count} scan${card.count === 1 ? '' : 's'}`}</Title>
          {card.consistencyNote ? <Body tone="secondary">{card.consistencyNote}</Body> : null}
        </>
      );
    case 'streak':
      return (
        <>
          <Title>{`${card.days} day${card.days === 1 ? '' : 's'} on routine`}</Title>
        </>
      );
    case 'metric-up':
      return (
        <>
          <Title>{`${card.metric} ↑ ${card.deltaPoints}`}</Title>
          <Body tone="secondary">A real lift this month.</Body>
        </>
      );
    case 'metric-steady':
      return (
        <>
          <Title>{`${card.metric}: steady`}</Title>
          <Body tone="secondary">A held line is its own kind of work.</Body>
        </>
      );
    case 'metric-down':
      return (
        <>
          <Title>{`${card.metric}: ${card.deltaPoints}`}</Title>
          <Body tone="secondary">
            {card.band === 'within'
              ? 'Inside the natural range. Worth watching, not fixing.'
              : 'Outside the typical range. A note for next month.'}
          </Body>
        </>
      );
    case 'pattern':
      return (
        <>
          <Title>Pattern</Title>
          <Body tone="secondary">{card.note}</Body>
        </>
      );
    case 'in-your-words':
      return (
        <>
          <Title>In your words</Title>
          {card.threeFragments.map((f, i) => (
            <Body key={i} tone="secondary">
              "{f}"
            </Body>
          ))}
        </>
      );
    case 'treatment':
      return (
        <>
          <Title>{`Week ${card.weeksIn} of treatment`}</Title>
          <Body tone="secondary">{card.progressNote}</Body>
        </>
      );
    case 'quiet-note':
      return <Body>{card.body}</Body>;
    case 'outro':
      return (
        <>
          <Title>That's the month.</Title>
          <Body tone="secondary">See you in the next one.</Body>
        </>
      );
  }
}

function defaultPriorMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(month: string): { monthStart: Date; monthEnd: Date } {
  const [yStr, mStr] = month.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  return {
    monthStart: new Date(y, m - 1, 1),
    monthEnd: new Date(y, m, 1),
  };
}

function daysInMonth(month: string): number {
  const r = monthRange(month);
  return Math.round(
    (r.monthEnd.getTime() - r.monthStart.getTime()) / (24 * 60 * 60 * 1000),
  );
}

function prettyMonth(month: string): string {
  const r = monthRange(month);
  return r.monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 120 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
});
