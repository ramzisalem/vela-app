/**
 * Treatment timeline (locked) screen (file 34).
 *
 * Milestone copy, contraindications vs life-stage modes, side-effect log,
 * and a doctor-export CTA that stays disabled until the
 * `doctor-friendly-export` feature reveal has been shown (see
 * `src/core/featureReveals/calendar.ts`).
 */
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { useTreatmentStore } from '@/stores/treatmentStore';
import { getTreatmentDefinition } from '@/data/treatment-library';
import {
  computeProgression,
  findContraindications,
} from '@/core/treatment/treatmentEngine';
import { useLifeStageStore } from '@/stores/lifeStageStore';
import { useFeatureRevealStore } from '@/stores/featureRevealStore';
import { SideEffectSheet } from '@/components/treatment/SideEffectSheet';
import { requestDoctorExport } from '@/services/treatment/doctorExport';
import { toast } from '@/components/feedback/toastService';
import { getRevealDefinition, DOCTOR_EXPORT_MIN_DAYS_SINCE_SIGNUP } from '@/core/featureReveals/calendar';

export default function TreatmentDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const treatment = useTreatmentStore((s) => s.treatments.find((t) => t.id === id));
  const activeModes = useLifeStageStore((s) => s.activeModes.map((m) => m.id));
  const sideEffects = useTreatmentStore((s) =>
    s.sideEffects.filter((e) => e.userTreatmentId === id),
  );
  const resolveSideEffect = useTreatmentStore((s) => s.resolveSideEffect);
  const doctorExportRevealed = useFeatureRevealStore((s) =>
    s.history.some(
      (h) =>
        h.id === 'doctor-friendly-export' &&
        (h.status === 'shown' || h.status === 'engaged'),
    ),
  );
  const recordEngaged = useFeatureRevealStore((s) => s.recordEngaged);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const doctorExportWeek = getRevealDefinition('doctor-friendly-export')?.week;
  const doctorExportMinWeeks = Math.round(DOCTOR_EXPORT_MIN_DAYS_SINCE_SIGNUP / 7);

  const onExport = React.useCallback(async () => {
    if (!id) return;
    setExporting(true);
    try {
      const res = await requestDoctorExport({ userTreatmentId: id });
      if (res.ok) {
        recordEngaged('doctor-friendly-export');
        toast.success('Export ready. Opening secure link\u2026');
        await Linking.openURL(res.url);
      } else {
        toast.error('Export failed. Try again in a moment.');
      }
    } finally {
      setExporting(false);
    }
  }, [id, recordEngaged]);

  if (!treatment) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.background.primary }]}>
        <Body tone="secondary">Treatment not found.</Body>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }
  const def = getTreatmentDefinition(treatment.definitionId);
  if (!def) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.background.primary }]}>
        <Body tone="secondary">Definition missing for this treatment.</Body>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const progression = computeProgression(def, treatment);
  const contraindications = findContraindications(def.id, activeModes);
  const displayName = treatment.customName || def.displayName;

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <Stack.Screen options={{ title: displayName, headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Caption tone="tertiary">
          Week {progression.weeksIn + 1} · started {prettyDate(treatment.startDate)}
        </Caption>
        <HeadlineSerif>{displayName}</HeadlineSerif>
        {contraindications.length > 0 ? (
          <View
            style={[
              styles.banner,
              {
                backgroundColor: colors.surface.raised,
                borderColor: colors.border.default,
              },
            ]}
          >
            {contraindications.map((c) => (
              <Body key={`${c.modeId}:${c.severity}`} tone="secondary">
                {c.copy}
              </Body>
            ))}
          </View>
        ) : null}
        <Section title="What\u2019s happening this week">
          {progression.currentMarker ? (
            <Body>{progression.currentMarker.expected}</Body>
          ) : (
            <Body tone="secondary">Early days. The first marker is up next.</Body>
          )}
          {progression.nextMarker ? (
            <Caption tone="tertiary">
              Next milestone: week {progression.nextMarker.weekNumber} \u00b7{' '}
              {progression.nextMarker.expected}
            </Caption>
          ) : null}
        </Section>
        <Section title="What it is">
          <Body tone="secondary">{def.educationCopy.whatItIs}</Body>
        </Section>
        <Section title="What to expect">
          <Body tone="secondary">{def.educationCopy.whatToExpect}</Body>
        </Section>
        <Section title="Consistency">
          <Body tone="secondary">{def.educationCopy.consistencyNote}</Body>
        </Section>
        <Section title="Common side effects">
          {def.commonSideEffects.length === 0 ? (
            <Caption tone="tertiary">None catalogued.</Caption>
          ) : (
            def.commonSideEffects.map((s) => (
              <Body key={s.id} tone="secondary">
                · {s.name} ({s.severity})
              </Body>
            ))
          )}
          <Button variant="ghost" label="Log a side effect" onPress={() => setSheetOpen(true)} />
        </Section>
        <Section title="Your log">
          {sideEffects.length === 0 ? (
            <Caption tone="tertiary">Nothing logged yet.</Caption>
          ) : (
            sideEffects.map((entry) => {
              const def2 = def.commonSideEffects.find((s) => s.id === entry.sideEffectId);
              const name = def2?.name ?? entry.sideEffectId;
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  onPress={() => {
                    if (!entry.resolved) resolveSideEffect(entry.id, treatment.userId);
                  }}
                  style={[
                    styles.logRow,
                    {
                      borderColor: colors.border.subtle,
                      backgroundColor: entry.resolved ? 'transparent' : colors.surface.raised,
                    },
                  ]}
                >
                  <Body>
                    {name} \u00b7 severity {entry.severity}
                    {entry.resolved ? ' \u00b7 resolved' : ''}
                  </Body>
                  <Caption tone="tertiary">
                    {prettyDate(entry.loggedOn)}
                    {entry.notes ? ` \u00b7 ${entry.notes}` : ''}
                  </Caption>
                </Pressable>
              );
            })
          )}
        </Section>
      </ScrollView>
      {!doctorExportRevealed ? (
        <View style={styles.exportHint}>
          <Caption tone="secondary">
            {doctorExportWeek != null
              ? `Doctor export unlocks after the in-app prompt, once you have had an account about ${doctorExportMinWeeks} weeks and an active treatment (your timeline often surfaces this around week ${doctorExportWeek}).`
              : `Doctor export unlocks after the in-app prompt, once you have had an account about ${doctorExportMinWeeks} weeks and an active treatment.`}
          </Caption>
        </View>
      ) : null}
      <View style={styles.footer}>
        <Button variant="secondary" label="Back" onPress={() => router.back()} />
        <Button
          variant="primary"
          label={exporting ? 'Generating\u2026' : 'Doctor export'}
          onPress={onExport}
          disabled={!doctorExportRevealed || exporting}
        />
      </View>
      <SideEffectSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        userTreatmentId={treatment.id}
        definition={def}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Title>{title}</Title>
      {children}
    </View>
  );
}

function prettyDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
  exportHint: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xs },
  section: { gap: Spacing.xs },
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xxs,
  },
  logRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.md,
    gap: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
