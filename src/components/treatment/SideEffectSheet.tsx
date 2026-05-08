/**
 * Side-effect logging sheet (file 34).
 *
 * Picks a side-effect from the treatment definition's catalogue and
 * prompts for severity 1\u20135. Notes are optional. Severity 4 or 5 surfaces
 * a soft hint to mention it to a clinician on the next visit; we never
 * imply medical diagnosis.
 */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import type { TreatmentDefinition } from '@/types/treatment';
import { useTreatmentStore } from '@/stores/treatmentStore';

export interface SideEffectSheetProps {
  open: boolean;
  onClose: () => void;
  userTreatmentId: string;
  definition: TreatmentDefinition;
}

const SEVERITY_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Barely noticeable',
  2: 'Mild',
  3: 'Moderate',
  4: 'Strong',
  5: 'Severe',
};

export function SideEffectSheet({ open, onClose, userTreatmentId, definition }: SideEffectSheetProps) {
  const colors = useColors();
  const logSideEffect = useTreatmentStore((s) => s.logSideEffect);
  const [pickedId, setPickedId] = React.useState<string | null>(null);
  const [severity, setSeverity] = React.useState<1 | 2 | 3 | 4 | 5>(2);
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setPickedId(null);
      setSeverity(2);
      setNotes('');
      setSubmitting(false);
    }
  }, [open]);

  const ownerUserId = useTreatmentStore((s) => s.treatments.find((t) => t.id === userTreatmentId)?.userId);

  const submit = () => {
    if (!pickedId || !ownerUserId || submitting) return;
    setSubmitting(true);
    try {
      logSideEffect({
        userTreatmentId,
        userId: ownerUserId,
        sideEffectId: pickedId,
        severity,
        ...(notes.trim().length > 0 ? { notes: notes.trim() } : {}),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Caption tone="tertiary">Log a side effect</Caption>
          <HeadlineSerif>{definition.displayName}</HeadlineSerif>
          <Title>Pick the closest match</Title>
          <View style={styles.list}>
            {definition.commonSideEffects.map((s) => {
              const selected = pickedId === s.id;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  onPress={() => setPickedId(s.id)}
                  style={[
                    styles.row,
                    {
                      borderColor: selected ? colors.text.primary : colors.border.subtle,
                      backgroundColor: selected ? colors.surface.raised : 'transparent',
                    },
                  ]}
                >
                  <Body>{s.name}</Body>
                  <Caption tone="tertiary">{s.severity}</Caption>
                </Pressable>
              );
            })}
          </View>

          {pickedId ? (
            <>
              <Title>How strong?</Title>
              <View style={styles.severityRow}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const value = n as 1 | 2 | 3 | 4 | 5;
                  const selected = severity === value;
                  return (
                    <Pressable
                      key={n}
                      accessibilityRole="button"
                      onPress={() => setSeverity(value)}
                      style={[
                        styles.dot,
                        {
                          borderColor: colors.border.default,
                          backgroundColor: selected ? colors.text.primary : 'transparent',
                        },
                      ]}
                    >
                      <Body
                        style={{
                          color: selected ? colors.surface.raised : colors.text.primary,
                        }}
                      >
                        {n}
                      </Body>
                    </Pressable>
                  );
                })}
              </View>
              <Caption tone="secondary">{SEVERITY_LABELS[severity]}</Caption>
              {severity >= 4 ? (
                <Body tone="secondary">
                  Worth mentioning to your prescriber at your next visit. Vela can\u2019t replace clinical judgment.
                </Body>
              ) : null}
            </>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button variant="secondary" label="Cancel" onPress={onClose} />
          <Button
            variant="primary"
            label={submitting ? 'Saving\u2026' : 'Log it'}
            onPress={submit}
            disabled={!pickedId || !ownerUserId || submitting}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 160 },
  list: { gap: Spacing.xs },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityRow: { flexDirection: 'row', gap: Spacing.xs },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
