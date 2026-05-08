/**
 * Diary attach button (file 37).
 *
 * Drop into any surface that should let the user add a diary note tied to
 * a specific date or scan. Opens the DiaryEntrySheet when tapped.
 */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useColors } from '@/theme';
import { Caption } from '@/components/ui/Text';
import { Spacing } from '@/theme/spacing';
import { DiaryEntrySheet } from './DiaryEntrySheet';
import { useProfileStore } from '@/stores/profileStore';
import type { DiaryAttachment } from '@/types/diary';

interface Props {
  attachedTo: DiaryAttachment;
  label?: string;
}

export function DiaryAttachButton({ attachedTo, label = 'Add a note' }: Props) {
  const colors = useColors();
  const userId = useProfileStore((s) => s.profile?.id ?? 'anon');
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.btn, { borderColor: colors.border.default }]}
      >
        <Caption tone="accent">{label}</Caption>
      </Pressable>
      <DiaryEntrySheet
        visible={open}
        attachedTo={attachedTo}
        userId={userId}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
});
