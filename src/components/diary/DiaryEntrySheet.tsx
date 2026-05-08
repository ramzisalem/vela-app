/**
 * Diary entry sheet (file 37).
 *
 * Bottom sheet, opens from many entry points. Designed to take ≤8 seconds
 * for a one-line entry. "Add a note" — calm, direct.
 */
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useColors } from '@/theme';
import { Body, HeadlineSerif, Caption } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import type { DiaryAttachment, DiaryUserTag } from '@/types/diary';
import { useDiaryStore } from '@/stores/diaryStore';

interface Props {
  visible: boolean;
  attachedTo: DiaryAttachment;
  userId: string;
  onClose: () => void;
  onSaved?: () => void;
}

const QUICK_TAGS: ReadonlyArray<{ id: DiaryUserTag; label: string }> = [
  { id: 'slept-poorly', label: 'Slept poorly' },
  { id: 'slept-well', label: 'Slept well' },
  { id: 'stressed', label: 'Stressed' },
  { id: 'sick', label: 'Sick' },
  { id: 'period', label: 'Period' },
  { id: 'travel', label: 'Travel' },
  { id: 'sun', label: 'Sun' },
  { id: 'alcohol', label: 'Alcohol' },
  { id: 'haircut', label: 'Haircut' },
  { id: 'sunburn', label: 'Sunburn' },
  { id: 'breakout', label: 'Breakout' },
  { id: 'new-product', label: 'New product' },
  { id: 'good-day', label: 'Good day' },
  { id: 'rough-day', label: 'Rough day' },
];

export function DiaryEntrySheet({ visible, attachedTo, userId, onClose, onSaved }: Props) {
  const colors = useColors();
  const addEntry = useDiaryStore((s) => s.addEntry);
  const [body, setBody] = React.useState('');
  const [tags, setTags] = React.useState<DiaryUserTag[]>([]);

  const reset = React.useCallback(() => {
    setBody('');
    setTags([]);
  }, []);

  const dateLabel = React.useMemo(() => {
    if (attachedTo.kind === 'date') return formatDateLabel(attachedTo.date);
    return formatDateLabel(new Date().toISOString().slice(0, 10));
  }, [attachedTo]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface.raised }]}
          onPress={(e) => e.stopPropagation()}
        >
          <HeadlineSerif>{`Add a note · ${dateLabel}`}</HeadlineSerif>
          <TextInput
            placeholder="Type or tap the mic."
            placeholderTextColor={colors.text.tertiary}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={5}
            style={[
              styles.input,
              { color: colors.text.primary, borderColor: colors.border.default },
            ]}
            accessibilityLabel="Diary entry body"
            maxLength={5000}
          />
          <Caption tone="tertiary" style={styles.tagsLabel}>
            Tag this if you want
          </Caption>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
            {QUICK_TAGS.map((t) => {
              const on = tags.includes(t.id);
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() =>
                    setTags((s) =>
                      s.includes(t.id) ? s.filter((x) => x !== t.id) : [...s, t.id],
                    )
                  }
                  style={[
                    styles.tagChip,
                    {
                      borderColor: colors.border.default,
                      backgroundColor: on ? colors.text.primary : 'transparent',
                    },
                  ]}
                >
                  <Body
                    style={{
                      color: on ? colors.surface.raised : colors.text.primary,
                    }}
                  >
                    {t.label}
                  </Body>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.actions}>
            <Button
              variant="secondary"
              size="md"
              label="Cancel"
              onPress={() => {
                reset();
                onClose();
              }}
            />
            <Button
              variant="primary"
              size="md"
              label="Save"
              onPress={() => {
                if (!body.trim() && tags.length === 0) {
                  onClose();
                  return;
                }
                addEntry({ userId, body: body.trim(), userTags: tags, attachedTo });
                reset();
                onSaved?.();
                onClose();
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function formatDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(36,31,26,0.5)' },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  tagsLabel: { marginTop: 4 },
  tagsRow: { marginVertical: 4 },
  tagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
});
