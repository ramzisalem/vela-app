/**
 * Scoring framework override sheet (file 14).
 *
 * The default framework is locked during onboarding (Q1 → Q1b for
 * non-binary / prefer-not-to-say), and most users never need to revisit
 * it. This sheet lets them switch between `masculine`, `feminine`, and
 * `neutral` without re-running onboarding. Confirmation required because
 * the routine and grooming sub-score recalibrate downstream.
 */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import type { ScoringFramework } from '@/types/profile';

export interface ScoringFrameworkSheetProps {
  open: boolean;
  current: ScoringFramework | undefined;
  onClose: () => void;
  onConfirm: (next: ScoringFramework) => void;
}

const OPTIONS: ReadonlyArray<{ id: ScoringFramework; label: string; body: string }> = [
  {
    id: 'masculine',
    label: 'Masculine',
    body: 'Grooming weights skew toward beard line and brow neatness. Symmetry and contour stay equal.',
  },
  {
    id: 'feminine',
    label: 'Feminine',
    body: 'Grooming weights skew toward brow shape and lash care. Skin clarity gets a small priority bump.',
  },
  {
    id: 'neutral',
    label: 'Neutral',
    body: 'Grooming, skin, and contour weighted equally. The default for non-binary and prefer-not-to-say.',
  },
];

export function ScoringFrameworkSheet({
  open,
  current,
  onClose,
  onConfirm,
}: ScoringFrameworkSheetProps) {
  const colors = useColors();
  const [picked, setPicked] = React.useState<ScoringFramework | undefined>(current);

  React.useEffect(() => {
    if (open) setPicked(current);
  }, [open, current]);

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Caption tone="tertiary">Scoring framework</Caption>
          <HeadlineSerif>Pick the lens that fits you.</HeadlineSerif>
          <Body tone="secondary">
            This shapes how grooming and contour are weighed. It does not change your photos or
            your scan history \u2014 only the way scores are read.
          </Body>
          <View style={styles.list}>
            {OPTIONS.map((opt) => {
              const selected = picked === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setPicked(opt.id)}
                  style={[
                    styles.row,
                    {
                      borderColor: selected ? colors.text.primary : colors.border.subtle,
                      backgroundColor: colors.surface.raised,
                    },
                  ]}
                >
                  <Title>{opt.label}</Title>
                  <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
                    {opt.body}
                  </Body>
                  {current === opt.id ? (
                    <Caption tone="tertiary" style={{ marginTop: Spacing.xs }}>
                      Currently active
                    </Caption>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <Caption tone="tertiary" style={{ marginTop: Spacing.md }}>
            Switching takes effect on your next scan. Past scans are not re-scored.
          </Caption>
        </ScrollView>
        <View style={styles.footer}>
          <Button variant="secondary" label="Cancel" onPress={onClose} />
          <Button
            variant="primary"
            label="Save"
            disabled={!picked || picked === current}
            onPress={() => {
              if (picked) onConfirm(picked);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 160 },
  list: { gap: Spacing.sm, marginTop: Spacing.md },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
