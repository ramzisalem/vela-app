/**
 * Life-stage mode enable sheet (file 48).
 *
 * Modes are opt-in and reversible. The sheet's copy and surface adjustments
 * are mode-specific. HRT and cancer-recovery modes ship after the sensitivity
 * review in Sprint 6; the framework + the three v1 modes (pregnancy,
 * postpartum, menopause) are wired here.
 */
import React from 'react';
import { Modal, Pressable, View, StyleSheet } from 'react-native';
import { useColors } from '@/theme';
import { Body, HeadlineSerif, Caption } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import type { LifeStageModeId } from '@/types/lifeStage';

interface Props {
  visible: boolean;
  modeId: LifeStageModeId | null;
  onConfirm: (opts: { aiOptIn: boolean; pauseStreaks: boolean; expectedEnd?: string }) => void;
  onCancel: () => void;
}

const COPY: Record<
  LifeStageModeId,
  { title: string; body: string; aiCopy: string; pauseStreaksCopy: string }
> = {
  pregnancy: {
    title: 'Pregnancy mode',
    body:
      'We’ll suppress the aging-band overlay, pause anything contraindicated, and shift the tone. Your data stays where it is.',
    aiCopy: 'Let our AI know during this mode (private, opt-in).',
    pauseStreaksCopy: 'Auto-freeze my streak.',
  },
  postpartum: {
    title: 'Postpartum mode',
    body:
      'We’ll keep the aging band off for the first 12 months. Streak rules relax. Tone softens.',
    aiCopy: 'Let our AI know during this mode (private, opt-in).',
    pauseStreaksCopy: 'Auto-freeze my streak when life is wrecking sleep.',
  },
  menopause: {
    title: 'Menopause / perimenopause mode',
    body:
      'The aging band shifts to a peri/post-menopause overlay. Tone adjusts. Time-of-day reminders ease up.',
    aiCopy: 'Let our AI know during this mode (private, opt-in).',
    pauseStreaksCopy: 'Auto-freeze my streak on rough sleep nights.',
  },
  hrt_estrogen: {
    title: 'HRT (estrogen) mode',
    body:
      'The aging band is replaced by an HRT timeline overlay. Routine bias shifts toward gentler, hydrating actives.',
    aiCopy: 'Let our AI know during this mode (private, opt-in).',
    pauseStreaksCopy: 'Auto-freeze my streak.',
  },
  hrt_testosterone: {
    title: 'HRT (testosterone) mode',
    body:
      'The aging band is replaced by an HRT timeline overlay. Routine bias shifts toward stronger oil control.',
    aiCopy: 'Let our AI know during this mode (private, opt-in).',
    pauseStreaksCopy: 'Auto-freeze my streak.',
  },
  cancer_recovery: {
    title: 'Cancer recovery mode',
    body:
      'We’ll suppress the aging band, pause aggressive routine tasks, soften the tone, and never frame change as failure.',
    aiCopy: 'Let our AI know during this mode (private, opt-in).',
    pauseStreaksCopy: 'Auto-freeze my streak through recovery.',
  },
};

export function LifeStageEnableSheet({ visible, modeId, onConfirm, onCancel }: Props) {
  const colors = useColors();
  const [aiOptIn, setAiOptIn] = React.useState(false);
  const [pauseStreaks, setPauseStreaks] = React.useState(false);

  if (!modeId) return null;
  const copy = COPY[modeId];

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel}>
        <View style={[styles.sheet, { backgroundColor: colors.surface.raised }]}>
          <HeadlineSerif>{copy.title}</HeadlineSerif>
          <Body tone="secondary" style={styles.body}>
            {copy.body}
          </Body>
          <ToggleRow
            label={copy.aiCopy}
            value={aiOptIn}
            onChange={setAiOptIn}
            colors={colors}
          />
          <ToggleRow
            label={copy.pauseStreaksCopy}
            value={pauseStreaks}
            onChange={setPauseStreaks}
            colors={colors}
          />
          <Caption tone="tertiary" style={styles.fineprint}>
            You can turn this off anytime. Your data stays preserved.
          </Caption>
          <Button
            variant="primary"
            size="lg"
            label={`Turn ${copy.title.toLowerCase()} on`}
            onPress={() => onConfirm({ aiOptIn, pauseStreaks })}
          />
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelRow}>
            <Body tone="tertiary">Not now</Body>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.toggleRow}
    >
      <Body style={{ flex: 1 }}>{label}</Body>
      <View
        style={[
          styles.switch,
          { backgroundColor: value ? colors.text.primary : colors.border.default },
        ]}
      >
        <View
          style={[
            styles.knob,
            value ? styles.knobOn : styles.knobOff,
            { backgroundColor: colors.surface.raised },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(36,31,26,0.5)' },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 16,
  },
  body: { marginTop: 4, marginBottom: 4 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  switch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  knobOn: { alignSelf: 'flex-end' },
  knobOff: { alignSelf: 'flex-start' },
  fineprint: { marginTop: 4 },
  cancelRow: { alignItems: 'center', paddingVertical: 10 },
});
