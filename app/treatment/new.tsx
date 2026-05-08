/**
 * Add a treatment screen (file 34).
 *
 * Library picker + start date. Honest framing in the picker — every entry
 * shows its evidence level and `whatToExpect` snippet. We never recommend.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { TREATMENT_LIBRARY } from '@/data/treatment-library';
import { useTreatmentStore } from '@/stores/treatmentStore';
import { useAppState } from '@/stores/appStateStore';
import { useLifeStageStore } from '@/stores/lifeStageStore';
import { findContraindications } from '@/core/treatment/treatmentEngine';
import type { TreatmentId } from '@/types/treatment';

export default function NewTreatmentScreen() {
  const colors = useColors();
  const userId = useAppState((s) => s.user?.id ?? null);
  const startTreatment = useTreatmentStore((s) => s.startTreatment);
  const activeModes = useLifeStageStore((s) => s.activeModes.map((m) => m.id));

  const [selectedId, setSelectedId] = React.useState<TreatmentId | null>(null);
  const [customName, setCustomName] = React.useState('');
  const [startDate, setStartDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [prescriberLabel, setPrescriberLabel] = React.useState('');

  const selected = TREATMENT_LIBRARY.find((t) => t.id === selectedId);
  const contraindications = selected
    ? findContraindications(selected.id, activeModes)
    : [];
  const blocked = contraindications.some((c) => c.severity === 'block');

  const handleStart = () => {
    if (!selected || !userId) return;
    startTreatment({
      userId,
      definitionId: selected.id,
      ...(selected.id === 'other' && customName.trim()
        ? { customName: customName.trim() }
        : {}),
      startDate,
      ...(prescriberLabel.trim() ? { prescriberLabel: prescriberLabel.trim() } : {}),
    });
    router.replace('/treatment');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <Stack.Screen options={{ title: 'New treatment', headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <HeadlineSerif>Add a treatment</HeadlineSerif>
        <Caption tone="tertiary">We frame, never prescribe.</Caption>

        <Title>Pick from the library</Title>
        <View style={styles.list}>
          {TREATMENT_LIBRARY.map((t) => {
            const on = t.id === selectedId;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setSelectedId(t.id)}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: on ? colors.surface.raised : 'transparent',
                    borderColor: on ? colors.text.primary : colors.border.subtle,
                  },
                ]}
              >
                <Body>{t.displayName}</Body>
                <Caption tone="tertiary">
                  {t.evidenceLevel} evidence \u00b7 {t.expectedDurationWeeks} weeks
                </Caption>
                <Caption tone="secondary">{t.educationCopy.shortDescription}</Caption>
              </Pressable>
            );
          })}
        </View>

        {selected?.id === 'other' ? (
          <View style={styles.section}>
            <Body>Custom name</Body>
            <TextInput
              placeholder="What would you like to call it?"
              placeholderTextColor={colors.text.tertiary}
              value={customName}
              onChangeText={setCustomName}
              maxLength={80}
              style={[
                styles.input,
                { color: colors.text.primary, borderColor: colors.border.default },
              ]}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Body>Start date</Body>
          <TextInput
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.text.tertiary}
            value={startDate}
            onChangeText={setStartDate}
            autoCapitalize="none"
            style={[
              styles.input,
              { color: colors.text.primary, borderColor: colors.border.default },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Body>Prescriber (optional)</Body>
          <TextInput
            placeholder="Dr. \u2026"
            placeholderTextColor={colors.text.tertiary}
            value={prescriberLabel}
            onChangeText={setPrescriberLabel}
            maxLength={80}
            style={[
              styles.input,
              { color: colors.text.primary, borderColor: colors.border.default },
            ]}
          />
        </View>

        {contraindications.length > 0 ? (
          <View
            style={[
              styles.banner,
              { backgroundColor: colors.surface.raised, borderColor: colors.border.default },
            ]}
          >
            {contraindications.map((c) => (
              <Body key={c.modeId} tone="secondary">
                {c.copy}
              </Body>
            ))}
          </View>
        ) : null}

        {!userId ? (
          <Caption tone="secondary">Signing in is required to sync this treatment with your account.</Caption>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button variant="secondary" label="Cancel" onPress={() => router.back()} />
        <Button
          variant="primary"
          label="Start tracking"
          onPress={handleStart}
          disabled={!selected || blocked || !userId}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 160 },
  list: { gap: Spacing.xs },
  itemCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    gap: 2,
  },
  section: { gap: Spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xxs,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
