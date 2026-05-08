/**
 * Experiment detail screen (file 44).
 *
 * Shows the active hypothesis, daily compliance log, and (once the
 * duration window closes and at least three scans exist) the verdict
 * card. The verdict is computed by `verdictEngine` against the user's
 * scans; it never recommends the change.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { useExperimentStore } from '@/stores/experimentStore';
import { useScanStore } from '@/stores/scanStore';
import { computeVerdict } from '@/core/experiments/verdictEngine';
import { todayISO } from '@/utils/dates';
import { AIService } from '@/services/ai';
import type { ExperimentVerdict } from '@/types/experiment';

export default function ExperimentDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const experiment = useExperimentStore((s) => s.experiments.find((e) => e.id === id));
  const sessions = useScanStore((s) => s.sessions);
  const logCompliance = useExperimentStore((s) => s.logCompliance);
  const setVerdict = useExperimentStore((s) => s.setVerdict);
  const abortExperiment = useExperimentStore((s) => s.abortExperiment);
  const [computing, setComputing] = React.useState(false);

  if (!experiment) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.background.primary }]}>
        <Body tone="secondary">Experiment not found.</Body>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const today = todayISO();
  const todayLog = experiment.complianceLog.find((c) => c.date === today);
  const totalDays = Math.max(1, daysBetween(experiment.startDate, experiment.endDate));
  const compliedDays = experiment.complianceLog.filter((c) => c.complied).length;
  const complianceRate = compliedDays / totalDays;

  const isWindowClosed = Date.parse(`${experiment.endDate}T00:00:00`) <= Date.now();
  const eligibleForVerdict =
    isWindowClosed && experiment.status === 'active' && sessionsInWindow(sessions, experiment.startDate, experiment.endDate).length >= 3;

  const handleVerdict = React.useCallback(async () => {
    if (!eligibleForVerdict) return;
    setComputing(true);
    try {
      const inWindow = sessionsInWindow(sessions, experiment.startDate, experiment.endDate);
      const baselineSession =
        sessions
          .filter((s) => Date.parse(s.createdAt) <= Date.parse(`${experiment.startDate}T00:00:00`))
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? inWindow[0];
      const lastInWindow = inWindow[inWindow.length - 1];
      if (!baselineSession || !lastInWindow) return;
      const baselineMetric = readMetric(baselineSession, experiment.primaryMetric);
      const endMetric = readMetric(lastInWindow, experiment.primaryMetric);
      const verdict = computeVerdict({
        baselineMetric,
        endMetric,
        expectedDriftPoints: 0,
        scanCount: inWindow.length,
        complianceRate,
        confounders: [],
      });
      let copy = verdict.copy;
      try {
        const ai = await AIService.generateExperimentVerdictCopy({
          effectSize: verdict.effectSize,
          attributableDelta: Number(verdict.attributableDelta.toFixed(2)),
          complianceRate: Number(verdict.complianceRate.toFixed(2)),
          confounders: verdict.confounders.map((c) => c.kind),
          recommendation: verdict.recommendation,
        });
        if (ai && typeof ai === 'object' && 'copy' in ai) {
          copy = String((ai as { copy: unknown }).copy ?? copy);
        }
      } catch {
        /* fall back to local copy */
      }
      setVerdict(experiment.id, { ...verdict, copy });
    } finally {
      setComputing(false);
    }
  }, [eligibleForVerdict, experiment, sessions, setVerdict]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <Stack.Screen options={{ title: experiment.hypothesis.label, headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Caption tone="tertiary">
          {prettyDate(experiment.startDate)} \u2013 {prettyDate(experiment.endDate)}
        </Caption>
        <HeadlineSerif>{experiment.hypothesis.label}</HeadlineSerif>
        <Body tone="secondary">{experiment.hypothesis.dailyAction}</Body>

        {experiment.status === 'active' ? (
          <View style={styles.todayBlock}>
            <Title>Today</Title>
            <Body tone="secondary">Did you do it today?</Body>
            <View style={styles.todayActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => logCompliance(experiment.id, { date: today, complied: true })}
                style={[
                  styles.choice,
                  {
                    borderColor: colors.border.default,
                    backgroundColor:
                      todayLog?.complied === true ? colors.text.primary : 'transparent',
                  },
                ]}
              >
                <Body
                  style={{
                    color: todayLog?.complied === true ? colors.surface.raised : colors.text.primary,
                  }}
                >
                  Yes
                </Body>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => logCompliance(experiment.id, { date: today, complied: false })}
                style={[
                  styles.choice,
                  {
                    borderColor: colors.border.default,
                    backgroundColor:
                      todayLog?.complied === false ? colors.text.primary : 'transparent',
                  },
                ]}
              >
                <Body
                  style={{
                    color: todayLog?.complied === false ? colors.surface.raised : colors.text.primary,
                  }}
                >
                  Missed
                </Body>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.statsRow,
            { backgroundColor: colors.surface.raised, borderColor: colors.border.subtle },
          ]}
        >
          <Stat label="Logged days" value={experiment.complianceLog.length} />
          <Stat label="Complied" value={compliedDays} />
          <Stat
            label="Compliance"
            value={Math.round(complianceRate * 100)}
            suffix="%"
          />
        </View>

        {experiment.verdict ? (
          <VerdictCard verdict={experiment.verdict} />
        ) : eligibleForVerdict ? (
          <View style={styles.verdictPrompt}>
            <Title>The window has closed.</Title>
            <Body tone="secondary">
              We have enough scans to read it. Verdicts are honest about small samples.
            </Body>
            <Button
              label={computing ? 'Reading\u2026' : 'Read the verdict'}
              variant="primary"
              onPress={handleVerdict}
              disabled={computing}
            />
          </View>
        ) : experiment.status === 'active' ? (
          <Body tone="secondary">
            Verdict lands once the window closes and at least three scans land inside it.
          </Body>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button variant="secondary" label="Back" onPress={() => router.back()} />
        {experiment.status === 'active' ? (
          <Button
            variant="ghost"
            label="Stop early"
            onPress={() => {
              abortExperiment(experiment.id);
              router.back();
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

function VerdictCard({ verdict }: { verdict: ExperimentVerdict }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.verdictCard,
        { backgroundColor: colors.surface.raised, borderColor: colors.border.subtle },
      ]}
    >
      <Caption tone="tertiary">Verdict \u00b7 {verdict.effectSize.replace(/-/g, ' ')}</Caption>
      <Body>{verdict.copy}</Body>
      <Caption tone="secondary">
        Compliance {Math.round(verdict.complianceRate * 100)}% \u00b7
        {verdict.confounders.length
          ? ` ${verdict.confounders.length} confounder${verdict.confounders.length === 1 ? '' : 's'} noted`
          : ' no major confounders'}
      </Caption>
    </View>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <View style={styles.stat}>
      <Body>
        {value}
        {suffix ?? ''}
      </Body>
      <Caption tone="tertiary">{label}</Caption>
    </View>
  );
}

function prettyDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function daysBetween(startIso: string, endIso: string): number {
  const a = new Date(`${startIso}T00:00:00`).getTime();
  const b = new Date(`${endIso}T00:00:00`).getTime();
  return Math.max(1, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

function sessionsInWindow<T extends { createdAt: string }>(
  all: ReadonlyArray<T>,
  startIso: string,
  endIso: string,
): T[] {
  const start = Date.parse(`${startIso}T00:00:00`);
  const end = Date.parse(`${endIso}T23:59:59`);
  return all.filter((s) => {
    const t = Date.parse(s.createdAt);
    return t >= start && t <= end;
  });
}

function readMetric(
  session: import('@/types').ScanSession,
  metric: string,
): number {
  const scores = session.scores as unknown as Record<string, number | undefined>;
  const rawMetrics = session.rawMetrics as unknown as Record<string, number | undefined>;
  if (metric in scores) {
    const v = scores[metric];
    if (typeof v === 'number') return v;
  }
  if (metric in rawMetrics) {
    const v = rawMetrics[metric];
    if (typeof v === 'number') return v;
  }
  return scores['overall'] ?? 0;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 160 },
  todayBlock: { gap: Spacing.xs, marginTop: Spacing.md },
  todayActions: { flexDirection: 'row', gap: Spacing.sm },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.md,
  },
  stat: { gap: 2 },
  verdictPrompt: { gap: Spacing.sm, marginTop: Spacing.md },
  verdictCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
