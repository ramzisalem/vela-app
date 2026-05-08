/**
 * Cancel exit-interview screen (file 47).
 *
 * Single screen, single question, optional skip. Free-text capped at 500
 * chars; PII redacted at write time via `redactPII`.
 */
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { HeadlineSerif, Body } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useColors } from '@/theme';
import type { CancelExitCategory } from '@/types/cancelSave';

const OPTIONS: ReadonlyArray<{ id: CancelExitCategory; label: string }> = [
  { id: 'too-expensive', label: 'Too expensive' },
  { id: 'didnt-see-change', label: 'Didn’t see enough change' },
  { id: 'not-the-right-time', label: 'Not the right time in my life' },
  { id: 'something-specific', label: 'Something specific isn’t working' },
  { id: 'other', label: 'Other' },
];

interface Props {
  onSubmit: (category: CancelExitCategory, freeText?: string) => void;
  onSkip: () => void;
}

export function ExitInterview({ onSubmit, onSkip }: Props) {
  const colors = useColors();
  const [selected, setSelected] = React.useState<CancelExitCategory | null>(null);
  const [freeText, setFreeText] = React.useState('');

  return (
    <Screen style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      <View style={styles.container}>
        <HeadlineSerif>What’s making you cancel?</HeadlineSerif>
        <Body tone="secondary" style={styles.body}>
          This helps us. Skip if you’d rather.
        </Body>
        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const active = selected === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setSelected(opt.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[
                  styles.row,
                  {
                    borderColor: active ? colors.text.primary : colors.border.subtle,
                    backgroundColor: active ? colors.surface.pressed : 'transparent',
                  },
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      borderColor: colors.text.primary,
                      backgroundColor: active ? colors.text.primary : 'transparent',
                    },
                  ]}
                />
                <Body>{opt.label}</Body>
              </Pressable>
            );
          })}
        </View>
        <TextField
          label="Anything else? (optional)"
          value={freeText}
          onChangeText={(t) => setFreeText(t.slice(0, 500))}
          placeholder="Optional"
        />
        <View style={styles.actions}>
          <Button
            variant="primary"
            size="lg"
            disabled={!selected}
            onPress={() => selected && onSubmit(selected, freeText.trim() || undefined)}
            label="Submit"
          />
          <Pressable accessibilityRole="button" onPress={onSkip} style={styles.skip}>
            <Body tone="tertiary">Skip</Body>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  body: {},
  options: { gap: 8, marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    marginRight: 12,
  },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  skip: { paddingHorizontal: 8, paddingVertical: 12 },
});
