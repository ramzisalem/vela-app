/**
 * Hair tracking screen (file 35).
 *
 * Opt-in via toggle. Shows the density timeline once at least one hair
 * scan exists. Voice constraint: never the words "loss" or "balding" in
 * user-facing copy.
 */
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { useHairStore } from '@/stores/hairStore';
import { Sparkline } from '@/components/charts/Sparkline';

export default function HairScreen() {
  const colors = useColors();
  const enabled = useHairStore((s) => s.enabled);
  const setEnabled = useHairStore((s) => s.setEnabled);
  const scans = useHairStore((s) => s.scans);

  const scansChrono = useMemo(() => {
    if (scans.length < 2) return [] as typeof scans;
    return scans.slice().sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  }, [scans]);

  const trendOverall = useMemo(() => scansChrono.map((s) => s.densityScores.overall), [scansChrono]);
  const trendCrown = useMemo(() => scansChrono.map((s) => s.densityScores.crown), [scansChrono]);
  const trendHairline = useMemo(() => scansChrono.map((s) => s.densityScores.hairline), [scansChrono]);
  const trendTemples = useMemo(
    () =>
      scansChrono.map((s) =>
        Math.round((s.densityScores.templeLeft + s.densityScores.templeRight) / 2),
      ),
    [scansChrono],
  );

  const showTrends = scansChrono.length >= 3;

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <Stack.Screen options={{ title: 'Hair', headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Caption tone="tertiary">Health and lifestyle</Caption>
        <HeadlineSerif>Hair density</HeadlineSerif>
        <Body tone="secondary">
          Top-down and back-camera capture build a density timeline alongside
          your face scans. Photos stay on this device.
        </Body>
        {!enabled ? (
          <View style={styles.gate}>
            <Body>
              Hair tracking is opt-in. We compare density at the crown,
              hairline, and temples over time.
            </Body>
            <Button label="Turn on hair tracking" variant="primary" onPress={() => setEnabled(true)} />
          </View>
        ) : (
          <>
            <Title>Recent scans</Title>
            {showTrends ? (
              <View style={{ marginBottom: Spacing.sm, gap: Spacing.md }}>
                <View>
                  <Caption tone="secondary" style={{ marginBottom: Spacing.xs }}>
                    Overall density
                  </Caption>
                  <Sparkline
                    values={trendOverall}
                    height={56}
                    startLabel={`${trendOverall[0]}`}
                    endLabel={`${trendOverall[trendOverall.length - 1]}`}
                  />
                </View>
                <View>
                  <Caption tone="secondary" style={{ marginBottom: Spacing.xs }}>
                    Crown (top-down)
                  </Caption>
                  <Sparkline
                    values={trendCrown}
                    height={48}
                    startLabel={`${trendCrown[0]}`}
                    endLabel={`${trendCrown[trendCrown.length - 1]}`}
                  />
                </View>
                <View>
                  <Caption tone="secondary" style={{ marginBottom: Spacing.xs }}>
                    Hairline (front)
                  </Caption>
                  <Sparkline
                    values={trendHairline}
                    height={48}
                    startLabel={`${trendHairline[0]}`}
                    endLabel={`${trendHairline[trendHairline.length - 1]}`}
                  />
                </View>
                <View>
                  <Caption tone="secondary" style={{ marginBottom: Spacing.xs }}>
                    Temples (average left and right)
                  </Caption>
                  <Sparkline
                    values={trendTemples}
                    height={48}
                    startLabel={`${trendTemples[0]}`}
                    endLabel={`${trendTemples[trendTemples.length - 1]}`}
                  />
                </View>
              </View>
            ) : null}
            <Button
              label="New hair scan"
              variant="primary"
              onPress={() => router.push('/hair/capture')}
              style={{ marginBottom: Spacing.sm }}
            />
            {scans.length === 0 ? (
              <Body tone="secondary">
                Your first hair scan unlocks the timeline.
              </Body>
            ) : (
              scans
                .slice()
                .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))
                .map((s) => (
                  <View
                    key={s.id}
                    style={[
                      styles.row,
                      { backgroundColor: colors.surface.raised, borderColor: colors.border.subtle },
                    ]}
                  >
                    <Caption tone="tertiary">{prettyDate(s.capturedAt)}</Caption>
                    <Body>Density overall: {s.densityScores.overall}</Body>
                    <Caption tone="secondary">
                      Crown {s.densityScores.crown} \u00b7 Hairline {s.densityScores.hairline} \u00b7
                      Temple L {s.densityScores.templeLeft} \u00b7 Temple R {s.densityScores.templeRight}
                    </Caption>
                  </View>
                ))
            )}
            <Button label="Turn off" variant="ghost" onPress={() => setEnabled(false)} />
          </>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    </View>
  );
}

function prettyDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 120 },
  gate: { gap: Spacing.md, marginTop: Spacing.md },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xxs,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
