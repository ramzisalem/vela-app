/**
 * QuestionScreen — renders a single onboarding question.
 *
 * Behavior:
 *   - Multi-select honors `maxSelections` (file 07 — Q10/Q12).
 *   - Required questions disable Continue until valid.
 *   - Forbidden words are intentionally absent in question wording.
 *   - All answers are saved to onboardingStore on every change.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Body, Headline, Caption } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Card } from '@/components/ui/Card';
import { useColors } from '@/theme/ThemeContext';
import { Radii, Spacing, Layout } from '@/theme/spacing';
import type { Question } from '@/core/onboarding/questions';

export interface QuestionScreenProps {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  onContinue: () => void;
  /** "3 of 30" indicator in the header. */
  progressLabel: string;
  onBack?: () => void;
}

function isAnswerValid(question: Question, value: unknown): boolean {
  if (!question.required) return true;
  switch (question.type) {
    case 'select':
      return typeof value === 'string' && value.length > 0;
    case 'multiselect':
      return Array.isArray(value) && value.length > 0;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'text':
      return typeof value === 'string' && value.trim().length > 0;
    case 'time':
      return typeof value === 'object' && value !== null;
  }
}

export function QuestionScreen({
  question,
  value,
  onChange,
  onContinue,
  progressLabel,
  onBack,
}: QuestionScreenProps) {
  const colors = useColors();
  const valid = useMemo(() => isAnswerValid(question, value), [question, value]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: Spacing.lg, paddingBottom: Spacing.base }}>
        <Caption tone="secondary">{progressLabel}</Caption>
        <Headline style={{ marginTop: Spacing.sm }}>{question.title}</Headline>
        {question.subtitle ? (
          <Body tone="secondary" style={{ marginTop: Spacing.sm }}>
            {question.subtitle}
          </Body>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        {question.type === 'select' ? (
          <SelectAnswers question={question} value={value as string} onChange={onChange} />
        ) : question.type === 'multiselect' ? (
          <MultiSelectAnswers
            question={question}
            value={(value as string[]) ?? []}
            onChange={onChange}
          />
        ) : question.type === 'number' ? (
          <NumberAnswer
            question={question}
            value={value as number | undefined}
            onChange={onChange}
          />
        ) : question.type === 'text' ? (
          <TextAnswer
            question={question}
            value={(value as string) ?? ''}
            onChange={onChange}
          />
        ) : (
          <TimeAnswer
            value={(value as { hour: number; minute: number }) ?? { hour: 9, minute: 0 }}
            onChange={onChange}
          />
        )}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: Spacing.sm, paddingBottom: Spacing.xl }}>
        {onBack ? <Button label="Back" variant="ghost" onPress={onBack} /> : null}
        <View style={{ flex: 1 }}>
          <Button
            label="Continue"
            fullWidth
            disabled={!valid}
            onPress={onContinue}
            accessibilityHint={
              valid ? 'Saves your answer and moves to the next question' : 'Pick an option to continue'
            }
          />
        </View>
      </View>
      {!valid && question.required ? (
        <Caption tone="secondary" style={{ marginBottom: Spacing.sm, color: colors.text.tertiary }}>
          This one is required.
        </Caption>
      ) : null}
    </View>
  );
}

function OptionRow({
  label,
  helper,
  selected,
  onPress,
}: {
  label: string;
  helper?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={{ marginBottom: Spacing.sm }}
    >
      <View
        style={{
          padding: Spacing.base,
          borderRadius: Radii.md,
          borderWidth: Layout.hairline,
          borderColor: selected ? colors.border.accent : colors.border.default,
          backgroundColor: selected ? colors.accent.background : colors.surface.raised,
        }}
      >
        <Body tone={selected ? 'accent' : 'primary'}>{label}</Body>
        {helper ? (
          <Caption tone="secondary" style={{ marginTop: Spacing.xxs }}>
            {helper}
          </Caption>
        ) : null}
      </View>
    </Pressable>
  );
}

function SelectAnswers({
  question,
  value,
  onChange,
}: {
  question: Extract<Question, { type: 'select' }>;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      {question.options.map((opt) => (
        <OptionRow
          key={opt.value}
          label={opt.label}
          helper={opt.helper}
          selected={value === opt.value}
          onPress={() => onChange(opt.value)}
        />
      ))}
    </>
  );
}

function MultiSelectAnswers({
  question,
  value,
  onChange,
}: {
  question: Extract<Question, { type: 'multiselect' }>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <>
      {question.options.map((opt) => {
        const selected = value.includes(opt.value);
        const max = question.maxSelections;
        const handle = () => {
          if (selected) {
            onChange(value.filter((v) => v !== opt.value));
          } else if (max && value.length >= max) {
            // Replace oldest selection.
            onChange([...value.slice(1), opt.value]);
          } else {
            onChange([...value, opt.value]);
          }
        };
        return (
          <OptionRow
            key={opt.value}
            label={opt.label}
            helper={opt.helper}
            selected={selected}
            onPress={handle}
          />
        );
      })}
      {question.maxSelections ? (
        <Caption tone="secondary" style={{ marginTop: Spacing.xs }}>
          {`Up to ${question.maxSelections}.`}
        </Caption>
      ) : null}
    </>
  );
}

function NumberAnswer({
  question,
  value,
  onChange,
}: {
  question: Extract<Question, { type: 'number' }>;
  value?: number;
  onChange: (n: number | undefined) => void;
}) {
  return (
    <Card>
      <TextField
        keyboardType="number-pad"
        placeholder={question.units ?? ''}
        value={typeof value === 'number' ? String(value) : ''}
        onChangeText={(t) => {
          const n = Number.parseInt(t.replace(/[^0-9]/g, ''), 10);
          if (Number.isFinite(n)) onChange(Math.min(question.max ?? n, Math.max(question.min ?? n, n)));
          else onChange(undefined);
        }}
      />
    </Card>
  );
}

function TextAnswer({
  question,
  value,
  onChange,
}: {
  question: Extract<Question, { type: 'text' }>;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <Card>
      <TextField
        multiline={question.multiline}
        maxLength={question.maxLength}
        value={value}
        onChangeText={onChange}
      />
    </Card>
  );
}

function TimeAnswer({
  value,
  onChange,
}: {
  value: { hour: number; minute: number };
  onChange: (v: { hour: number; minute: number }) => void;
}) {
  // Simple grid picker — full DateTimePicker hooked up later.
  const hours = [7, 8, 9, 10, 18, 19, 20, 21];
  const minutes: ReadonlyArray<0 | 15 | 30 | 45> = [0, 15, 30, 45];
  return (
    <View>
      <Caption>Hour</Caption>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
        {hours.map((h) => (
          <Button
            key={h}
            label={`${h}:00`}
            size="sm"
            variant={value.hour === h ? 'primary' : 'secondary'}
            onPress={() => onChange({ hour: h, minute: value.minute })}
          />
        ))}
      </View>
      <Caption style={{ marginTop: Spacing.base }}>Minutes</Caption>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
        {minutes.map((m) => (
          <Button
            key={m}
            label={`:${String(m).padStart(2, '0')}`}
            size="sm"
            variant={value.minute === m ? 'primary' : 'secondary'}
            onPress={() => onChange({ hour: value.hour, minute: m })}
          />
        ))}
      </View>
    </View>
  );
}
