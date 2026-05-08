/**
 * Health correlations screen (file 33).
 *
 * Shown after the lazy permission ask (≥3 weeks of scans). Lists every
 * discovered correlation with a "Show details" disclosure. The list reads
 * conservatively — no causal language, no "boost" copy, no claims.
 */
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { useHealthStore } from '@/stores/healthStore';
import { CorrelationCard } from '@/components/health/CorrelationCard';
import { useCorrelationDiscovery } from '@/hooks/useCorrelationDiscovery';
import { getHealthService } from '@/services/health';

export default function HealthScreen() {
  const colors = useColors();
  const correlations = useHealthStore((s) => s.correlations);
  const permission = useHealthStore((s) => s.permission);
  const setPermission = useHealthStore((s) => s.setPermission);
  const { run, running, isEligible } = useCorrelationDiscovery();
  const eligible = isEligible();

  const requestPermission = React.useCallback(async () => {
    const state = await getHealthService().requestPermissions();
    setPermission(state);
  }, [setPermission]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <Stack.Screen options={{ title: 'Health', headerShown: false }} />
      <View style={styles.header}>
        <Caption tone="tertiary">Health</Caption>
        <HeadlineSerif>Patterns we see</HeadlineSerif>
        <Body tone="secondary">
          Computed on this device. Raw HealthKit values never leave the phone.
        </Body>
      </View>
      {!permission.granted ? (
        <View style={styles.gate}>
          <Body>
            We can find patterns between your face data and signals like sleep,
            HRV, and cycle phase. Read-only access. Always optional.
          </Body>
          <Button
            label="Connect Health"
            variant="primary"
            onPress={requestPermission}
          />
        </View>
      ) : !eligible ? (
        <View style={styles.gate}>
          <Body tone="secondary">
            Patterns become clearer at three weeks of scans. Keep going.
          </Body>
        </View>
      ) : (
        <>
          <View style={styles.actionRow}>
            <Button
              label={running ? 'Computing\u2026' : 'Refresh patterns'}
              variant="secondary"
              onPress={() => {
                void run();
              }}
              disabled={running}
            />
          </View>
          <FlatList
            data={correlations}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <View style={styles.cardWrap}>
                <CorrelationCard correlation={item} />
              </View>
            )}
            ListEmptyComponent={
              <Caption tone="tertiary" style={styles.empty}>
                No patterns yet. Tap "Refresh patterns" once you have a few weeks of data.
              </Caption>
            }
            contentContainerStyle={styles.list}
          />
        </>
      )}
      <View style={styles.footer}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.xxs,
  },
  gate: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  actionRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  cardWrap: { paddingVertical: Spacing.xs },
  empty: { textAlign: 'center', marginTop: Spacing.xl },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
