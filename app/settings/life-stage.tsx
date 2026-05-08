/**
 * Settings → Life-stage mode (file 48).
 *
 * Lets the user enable / disable life-stage modes with the atomic
 * cascade. Each mode comes with a one-line description and a small
 * sensitivity statement explaining what changes about the experience.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { useColors } from '@/theme';
import { useLifeStageMode } from '@/hooks/useLifeStageMode';
import { toast } from '@/components/feedback/toastService';
import type { LifeStageMode, LifeStageModeId } from '@/types/lifeStage';

interface ModeOption {
  id: LifeStageModeId;
  label: string;
  description: string;
  sensitivity: string;
  v15: boolean;
}

const OPTIONS: ReadonlyArray<ModeOption> = [
  {
    id: 'pregnancy',
    label: 'Pregnancy',
    description: 'Routine adjusts to remove contraindicated actives. Gentle copy and no body language.',
    sensitivity: 'Vela does not provide medical advice during pregnancy.',
    v15: false,
  },
  {
    id: 'postpartum',
    label: 'Postpartum',
    description: 'Lower bar for streaks. Routine acknowledges sleep is an open variable.',
    sensitivity: 'Postpartum changes are normal. Streaks are paused, not lost.',
    v15: false,
  },
  {
    id: 'menopause',
    label: 'Menopause',
    description: 'Aging band recalibrates and dryness-aware tasks rise in priority.',
    sensitivity: 'We treat face changes during this stage as natural \u2014 not problems to solve.',
    v15: false,
  },
  {
    id: 'hrt_estrogen',
    label: 'HRT \u2014 estrogen',
    description: 'Routine and copy understand that hydration shifts on HRT. (v1.1)',
    sensitivity: 'Sensitivity reviewed. Vela never frames HRT as a cosmetic input.',
    v15: true,
  },
  {
    id: 'hrt_testosterone',
    label: 'HRT \u2014 testosterone',
    description: 'Sebum and growth pattern shifts are expected during transition; the routine adapts. (v1.1)',
    sensitivity: 'Vela honors transition timing and never makes claims about appearance change.',
    v15: true,
  },
  {
    id: 'cancer_recovery',
    label: 'Cancer recovery',
    description: 'Cosmetic narratives are off; only gentle, dermatologist-reviewed care is suggested. (v1.1)',
    sensitivity: 'We follow your oncology team, not the other way around.',
    v15: true,
  },
];

export default function LifeStageSettings() {
  const colors = useColors();
  const { active, applyMode, removeMode } = useLifeStageMode();
  const [busy, setBusy] = React.useState<LifeStageModeId | null>(null);
  const isActive = React.useCallback(
    (id: LifeStageModeId) => active.some((m) => m.id === id),
    [active],
  );

  const toggle = React.useCallback(
    async (opt: ModeOption) => {
      setBusy(opt.id);
      try {
        if (isActive(opt.id)) {
          await removeMode(opt.id);
          toast.info(`${opt.label} mode turned off.`);
        } else {
          const mode: LifeStageMode = {
            id: opt.id,
            enabledAt: new Date().toISOString(),
            aiOptIn: false,
            clinicOptIn: false,
          };
          await applyMode(mode);
          toast.success(`${opt.label} mode is on.`);
        }
      } catch {
        toast.warning('Could not switch modes. Try again in a moment.');
      } finally {
        setBusy(null);
      }
    },
    [applyMode, isActive, removeMode],
  );

  return (
    <Screen variant="secondary">
      <Stack.Screen options={{ title: 'Life-stage mode' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl, paddingTop: Spacing.lg }}>
        <HeadlineSerif>Life-stage mode</HeadlineSerif>
        <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
          Tell Vela what season you\u2019re in. We adjust copy, routine, and analysis with care.
        </Body>
        <Caption tone="tertiary" style={{ marginTop: Spacing.sm }}>
          You can have several at once. Switching is instant; the cascade preserves streaks.
        </Caption>

        {OPTIONS.map((opt) => {
          const on = isActive(opt.id);
          const loading = busy === opt.id;
          return (
            <Pressable
              key={opt.id}
              accessibilityRole="button"
              onPress={() => toggle(opt)}
              disabled={loading}
              style={[
                styles.row,
                {
                  borderColor: on ? colors.text.primary : colors.border.subtle,
                  backgroundColor: colors.surface.raised,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Title>{opt.label}</Title>
                <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
                  {opt.description}
                </Body>
                <Caption tone="tertiary" style={{ marginTop: Spacing.xs }}>
                  {opt.sensitivity}
                </Caption>
              </View>
              <Caption tone={on ? 'accent' : 'secondary'}>
                {loading ? 'Switching\u2026' : on ? 'On' : 'Off'}
              </Caption>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ padding: Spacing.lg }}>
        <Button variant="secondary" label="Back" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
});
