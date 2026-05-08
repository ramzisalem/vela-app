/**
 * Treatment list screen (file 34).
 *
 * Shows active treatments first, then completed/abandoned. Tapping any row
 * opens the locked timeline at `/treatment/[id]`.
 */
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { useTreatmentStore } from '@/stores/treatmentStore';
import { getTreatmentDefinition } from '@/data/treatment-library';
import type { UserTreatment } from '@/types/treatment';

export default function TreatmentListScreen() {
  const colors = useColors();
  const treatments = useTreatmentStore((s) => s.treatments);
  const active = treatments.filter((t) => t.status === 'active' || t.status === 'planning');
  const past = treatments.filter((t) => t.status !== 'active' && t.status !== 'planning');

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <Stack.Screen options={{ title: 'Treatments', headerShown: false }} />
      <View style={styles.header}>
        <HeadlineSerif>Treatments</HeadlineSerif>
        <Caption tone="tertiary">Track a journey alongside your scans.</Caption>
      </View>
      <FlatList
        data={[...active, ...past]}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => <TreatmentRow treatment={item} />}
        ItemSeparatorComponent={() => (
          <View style={[styles.sep, { backgroundColor: colors.border.subtle }]} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Body tone="secondary" style={{ textAlign: 'center' }}>
              Nothing tracked yet. Add a treatment to start a locked timeline.
            </Body>
          </View>
        }
        contentContainerStyle={styles.list}
      />
      <View style={styles.footer}>
        <Button variant="secondary" label="Back" onPress={() => router.back()} />
        <Button variant="primary" label="Add a treatment" onPress={() => router.push('/treatment/new')} />
      </View>
    </View>
  );
}

function TreatmentRow({ treatment }: { treatment: UserTreatment }) {
  const colors = useColors();
  const def = getTreatmentDefinition(treatment.definitionId);
  const displayName = treatment.customName || def?.displayName || 'Treatment';
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(`/treatment/${treatment.id}`)}
      style={styles.row}
    >
      <Caption tone="tertiary">
        Started {prettyDate(treatment.startDate)} · {humanStatus(treatment.status)}
      </Caption>
      <Title>{displayName}</Title>
      {def?.educationCopy.shortDescription ? (
        <Body tone="secondary" numberOfLines={2}>
          {def.educationCopy.shortDescription}
        </Body>
      ) : null}
      <Caption tone="accent">View timeline</Caption>
      <View style={[styles.spacer, { backgroundColor: colors.border.subtle }]} />
    </Pressable>
  );
}

function humanStatus(status: UserTreatment['status']): string {
  switch (status) {
    case 'planning':
      return 'Planning';
    case 'active':
      return 'Active';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Completed';
    case 'abandoned':
      return 'Stopped';
  }
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.xxs,
  },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  row: { paddingVertical: Spacing.md, gap: Spacing.xxs },
  sep: { height: StyleSheet.hairlineWidth },
  spacer: { height: 0 },
  empty: { paddingTop: Spacing.xl },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
