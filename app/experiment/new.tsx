/**
 * New experiment screen (file 44).
 *
 * One change at a time. Calm setup: hypothesis → daily action → primary
 * metric → duration → start. Confounder education sits in the bottom
 * margin, not as a wall.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { useExperimentStore } from '@/stores/experimentStore';
import { useProfileStore } from '@/stores/profileStore';
import { useRoutineStore } from '@/stores/routineStore';
import type { ExperimentHypothesis } from '@/types/experiment';
import type { FaceMetric } from '@/types/aging';

const KIND_OPTIONS: ReadonlyArray<{ id: ExperimentHypothesis['kind']; label: string }> = [
  { id: 'add-product', label: 'Add a product' },
  { id: 'remove-product', label: 'Remove a product' },
  { id: 'switch-product', label: 'Switch a product' },
  { id: 'lifestyle-change', label: 'Lifestyle change' },
  { id: 'frequency-change', label: 'Use something more / less often' },
  { id: 'custom', label: 'Custom' },
];

const METRIC_OPTIONS: ReadonlyArray<{ id: FaceMetric; label: string }> = [
  { id: 'overall', label: 'Overall' },
  { id: 'skinClarity', label: 'Clarity' },
  { id: 'redness', label: 'Redness' },
  { id: 'eyeArea', label: 'Eye area' },
];

const DURATIONS: ReadonlyArray<4 | 6 | 8> = [4, 6, 8];

export default function NewExperimentScreen() {
  const colors = useColors();
  const userId = useProfileStore((s) => s.profile?.id ?? 'anon');
  const routineTaskIds = useRoutineStore(
    (s) => s.currentRoutine?.tasks.map((t) => t.taskId) ?? [],
  );
  const startExperiment = useExperimentStore((s) => s.startExperiment);

  const [kind, setKind] = React.useState<ExperimentHypothesis['kind']>('add-product');
  const [label, setLabel] = React.useState('');
  const [dailyAction, setDailyAction] = React.useState('');
  const [primaryMetric, setPrimaryMetric] = React.useState<FaceMetric>('overall');
  const [durationWeeks, setDurationWeeks] = React.useState<4 | 6 | 8>(6);

  const canStart = label.trim().length > 0 && dailyAction.trim().length > 0;

  const handleStart = () => {
    startExperiment({
      userId,
      hypothesis: { kind, label: label.trim(), dailyAction: dailyAction.trim() },
      primaryMetric,
      durationWeeks,
      baselineTaskIds: routineTaskIds,
    });
    router.replace('/experiment');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <Stack.Screen options={{ title: 'New experiment', headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <HeadlineSerif>Set up an experiment</HeadlineSerif>
        <Caption tone="tertiary">Pick one change. Hold the rest steady.</Caption>

        <Section title="What kind of change?">
          <ChipRow
            options={KIND_OPTIONS}
            selectedId={kind}
            onSelect={(id) => setKind(id)}
          />
        </Section>

        <Section title="What is the change?">
          <TextInput
            placeholder="e.g. Niacinamide serum, mornings only"
            placeholderTextColor={colors.text.tertiary}
            value={label}
            onChangeText={setLabel}
            maxLength={80}
            style={[
              styles.input,
              { color: colors.text.primary, borderColor: colors.border.default },
            ]}
            accessibilityLabel="Experiment label"
          />
        </Section>

        <Section title="What is the daily action?">
          <TextInput
            placeholder="e.g. Apply 2 drops after cleansing each morning"
            placeholderTextColor={colors.text.tertiary}
            value={dailyAction}
            onChangeText={setDailyAction}
            maxLength={140}
            multiline
            style={[
              styles.input,
              styles.multiline,
              { color: colors.text.primary, borderColor: colors.border.default },
            ]}
            accessibilityLabel="Daily action"
          />
        </Section>

        <Section title="Primary metric">
          <ChipRow
            options={METRIC_OPTIONS}
            selectedId={primaryMetric}
            onSelect={(id) => setPrimaryMetric(id)}
          />
        </Section>

        <Section title="Duration">
          <ChipRow
            options={DURATIONS.map((d) => ({ id: d, label: `${d} weeks` }))}
            selectedId={durationWeeks}
            onSelect={(id) => setDurationWeeks(id)}
          />
        </Section>

        <View
          style={[
            styles.note,
            { backgroundColor: colors.surface.raised, borderColor: colors.border.subtle },
          ]}
        >
          <Caption tone="tertiary">
            We'll factor in season, sleep, and cycle phase when we read the result.
            Verdicts use at least three scans.
          </Caption>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button variant="secondary" label="Cancel" onPress={() => router.back()} />
        <Button variant="primary" label="Start" onPress={handleStart} disabled={!canStart} />
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Body>{title}</Body>
      {children}
    </View>
  );
}

interface ChipRowProps<T extends string | number> {
  options: ReadonlyArray<{ id: T; label: string }>;
  selectedId: T;
  onSelect: (id: T) => void;
}

function ChipRow<T extends string | number>({ options, selectedId, onSelect }: ChipRowProps<T>) {
  const colors = useColors();
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.id === selectedId;
        return (
          <Pressable
            key={String(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(o.id)}
            style={[
              styles.chip,
              {
                borderColor: colors.border.default,
                backgroundColor: on ? colors.text.primary : 'transparent',
              },
            ]}
          >
            <Body
              style={{ color: on ? colors.surface.raised : colors.text.primary }}
            >
              {o.label}
            </Body>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 160 },
  section: { gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  note: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
