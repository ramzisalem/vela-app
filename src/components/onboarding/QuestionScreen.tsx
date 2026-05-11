/**
 * QuestionScreen — renders a single onboarding question.
 *
 * Behavior:
 *   - Required single `select`: no Continue bar; choosing an option saves and advances.
 *   - Optional `select`: Continue remains so the step can be skipped without a choice.
 *   - Multi-select honors `maxSelections` (file 07 — Q10/Q12).
 *   - Required questions disable Continue until valid (non-select types).
 *   - Header fades down into the list; sticky footer fades up from the top into the list.
 *   - Each step re-keys header, body, and footer with staggered entrance (respects Reduce Motion).
 *   - Select / multiselect option rows enter one after another (staggered).
 *   - Live “delight” panel for some answers (age, multiselect, etc.) plus optional celebration line before auto-advance select.
 *   - Forbidden words are intentionally absent in question wording.
 *   - All answers are saved to onboardingStore on every change.
 */
import React, { useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type AccessibilityRole,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AnimationDuration } from '@/theme/animations';
import { Body, Caption, Text } from '@/components/ui/Text';
import { AgeScrollList } from '@/components/onboarding/AgeScrollList';
import { QuestionLiveDelight } from '@/components/onboarding/QuestionLiveDelight';
import { SelectionCelebration } from '@/components/onboarding/SelectionCelebration';
import { SegmentedProgress } from '@/components/onboarding/SegmentedProgress';
import { EmphasisHeadline } from '@/components/onboarding/EmphasisHeadline';
import { InfoCard } from '@/components/onboarding/InfoCard';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Card } from '@/components/ui/Card';
import { useColors, useThemeMode } from '@/theme/ThemeContext';
import { getShadow } from '@/theme/shadows';
import { Radii, Spacing, Layout } from '@/theme/spacing';
import type { Question } from '@/core/onboarding/questions';
import { onboardingOptionIcon } from '@/core/onboarding/optionIcons';
import { getSelectOptionCelebration } from '@/core/onboarding/delightContent';

/** Taller tap targets for select / multiselect options (file 07). */
const OPTION_ROW_MIN_HEIGHT = 68;

/**
 * Convert a plain question title into the LazyFit "**topic**?" pattern.
 *   Input  : "What's your skin type?"
 *   Output : "What's your **skin type**?"
 *
 * Heuristic: if the title already contains `**` we trust the author; otherwise
 * we bold the *last* noun phrase before terminal punctuation (everything after
 * the final occurrence of "your", "your ", "the", "a", "to", or — as a
 * fallback — the last 1–2 words before "?", ":", or end of string).
 */
function toEmphasisHeadline(title: string): string {
  if (title.includes('**')) return title;

  const trimmed = title.trim();
  const trailingPunct = /([?:.!])\s*$/.exec(trimmed);
  const punct = trailingPunct ? trailingPunct[1] : '';
  const body = trailingPunct ? trimmed.slice(0, trailingPunct.index).trimEnd() : trimmed;

  // Try to bold the phrase after the last "your", "the", or "a".
  const anchors = [' your ', ' the ', ' a ', ' how ', ' to '];
  let cut = -1;
  for (const a of anchors) {
    const idx = body.toLowerCase().lastIndexOf(a);
    if (idx > cut) cut = idx + a.length;
  }
  if (cut > 0 && cut < body.length) {
    return `${body.slice(0, cut)}**${body.slice(cut)}**${punct}`;
  }
  // Fallback: bold the last two words.
  const words = body.split(/\s+/);
  if (words.length >= 2) {
    const head = words.slice(0, -2).join(' ');
    const tail = words.slice(-2).join(' ');
    return `${head ? head + ' ' : ''}**${tail}**${punct}`;
  }
  return `**${body}**${punct}`;
}

type IoniconName = ComponentProps<typeof Ionicons>['name'];
/** Scroll padding so the last option clears the sticky Continue bar (`xl` height + chrome). */
const STICKY_FOOTER_SCROLL_PAD = 140;
/** Bottom padding when there is no sticky footer (single-select auto-advance). */
const SELECT_SCROLL_BOTTOM_PAD = Spacing.xxxl;
/** Height of fade from header surface into transparent so list content blends underneath. */
const HEADER_BOTTOM_FADE = Spacing.xxxl;
/** Footer: fade from transparent at top into surface (mirror of header). */
const FOOTER_TOP_FADE = HEADER_BOTTOM_FADE;
/** Space below the question block + above scroll content (tight to options). */
const QUESTION_TO_OPTIONS_GAP = Spacing.md;

function gradientFadeColors(surface: string): readonly [string, string] {
  if (surface.startsWith('#') && surface.length === 7) {
    return [surface, `${surface}00`] as const;
  }
  return [surface, 'transparent'] as const;
}

function gradientFadeColorsFromTop(surface: string): readonly [string, string] {
  if (surface.startsWith('#') && surface.length === 7) {
    return [`${surface}00`, surface] as const;
  }
  return ['transparent', surface] as const;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

const stepEnterDuration = AnimationDuration.base;
const bodyEnterDelay = 48;
const footerEnterDelay = 96;
/** Delay between each option row entrance (select / multiselect). */
const OPTION_STAGGER_MS = 52;
const OPTION_ROW_ENTER_DURATION = 280;

function optionStaggerEntering(index: number, reduceMotion: boolean) {
  if (reduceMotion) return undefined;
  return FadeInDown.duration(OPTION_ROW_ENTER_DURATION).delay(index * OPTION_STAGGER_MS);
}

export interface QuestionScreenProps {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  onContinue: () => void;
  globalStep: number;
  globalTotal: number;
  /** Section chapter title (file 07). */
  sectionTitle: string;
  /** One-line why this section matters. */
  sectionPromise: string;
  stepInSection: number;
  stepsInSection: number;
  /** Optional A..E letter — drives segmented chapter progress. */
  section?: 'A' | 'B' | 'C' | 'D' | 'E';
  onBack?: () => void;
  /**
   * Optional chip from scan metrics (non-diagnostic hint). Applying sets answer via parent.
   */
  scanSuggestion?: { summary: string; onApply: () => void };
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
  globalStep,
  globalTotal,
  sectionTitle,
  sectionPromise,
  stepInSection,
  stepsInSection,
  section,
  onBack,
  scanSuggestion,
}: QuestionScreenProps) {
  const SECTION_ORDER: ReadonlyArray<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
  const sectionIndex = section ? SECTION_ORDER.indexOf(section) : 0;
  const numeral = ['i', 'ii', 'iii', 'iv', 'v'][Math.max(0, sectionIndex)];
  const colors = useColors();
  const { width: windowWidth } = useWindowDimensions();
  const valid = useMemo(() => isAnswerValid(question, value), [question, value]);
  const useAgeScrollList = question.type === 'number' && question.id === 'q2_age';
  const showStickyContinue = question.type !== 'select' || !question.required;
  const scrollBottomPad = showStickyContinue
    ? STICKY_FOOTER_SCROLL_PAD + FOOTER_TOP_FADE
    : SELECT_SCROLL_BOTTOM_PAD;

  const fadeColors = gradientFadeColors(colors.background.secondary);
  const footerFadeColors = gradientFadeColorsFromTop(colors.background.secondary);
  const reduceMotion = usePrefersReducedMotion();
  const headerEntering = reduceMotion
    ? undefined
    : FadeInDown.duration(stepEnterDuration);
  const bodyEntering = reduceMotion
    ? undefined
    : FadeInDown.duration(stepEnterDuration).delay(bodyEnterDelay);
  const footerEntering = reduceMotion
    ? undefined
    : FadeIn.duration(stepEnterDuration).delay(footerEnterDelay);

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexShrink: 0,
          paddingTop: onBack ? Spacing.sm : Spacing.xl,
          backgroundColor: colors.background.secondary,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Animated.View
          key={`step-header-${question.id}`}
          entering={headerEntering}
          style={{ width: '100%' }}
        >
          {onBack ? (
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onBack();
              }}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={16}
              style={{
                width: Layout.tapTarget,
                height: Layout.tapTarget,
                marginBottom: Spacing.sm,
                justifyContent: 'center',
                marginLeft: -Spacing.xs,
              }}
            >
              <Ionicons name="chevron-back" size={30} color={colors.text.primary} />
            </Pressable>
          ) : null}
          <View style={{ paddingBottom: Spacing.sm }}>
            <SegmentedProgress
              sectionIndex={sectionIndex}
              sectionCount={5}
              stepInSection={stepInSection}
              stepsInSection={stepsInSection}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: Spacing.md,
                gap: Spacing.sm,
              }}
            >
              <Text variant="label" tone="tertiary" style={{ letterSpacing: 1.4 }}>
                {`Part ${numeral} · ${sectionTitle}`}
              </Text>
            </View>
            <View style={{ marginBottom: QUESTION_TO_OPTIONS_GAP, marginTop: Spacing.xl, paddingHorizontal: Spacing.xs }}>
              <EmphasisHeadline size={28}>{toEmphasisHeadline(question.title)}</EmphasisHeadline>
              {question.subtitle ? (
                <InfoCard
                  tone="warm"
                  body={question.subtitle}
                  style={{ marginTop: Spacing.lg }}
                />
              ) : null}
              {question.trustLine && !question.subtitle ? (
                <InfoCard
                  tone="accent"
                  body={question.trustLine}
                  style={{ marginTop: Spacing.lg }}
                />
              ) : null}
              {scanSuggestion ? (
                <View style={{ marginTop: Spacing.md, alignItems: 'center' }}>
                  <Caption tone="tertiary" style={{ marginBottom: Spacing.xs }}>
                    Suggested from your scan numbers
                  </Caption>
                  <Button
                    label={scanSuggestion.summary}
                    variant="secondary"
                    size="md"
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      scanSuggestion.onApply();
                    }}
                  />
                </View>
              ) : null}
            </View>
            <QuestionLiveDelight question={question} value={value} />
          </View>
        </Animated.View>
        <LinearGradient
          pointerEvents="none"
          colors={fadeColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: -HEADER_BOTTOM_FADE,
            height: HEADER_BOTTOM_FADE,
          }}
        />
      </View>

      <Animated.View
        key={`step-body-${question.id}`}
        entering={bodyEntering}
        style={{ flex: 1, minHeight: 0, marginTop: -HEADER_BOTTOM_FADE, zIndex: 0 }}
      >
        {useAgeScrollList ? (
          <AgeScrollList
            min={question.min ?? 13}
            max={question.max ?? 100}
            value={value as number | undefined}
            onChange={(n) => onChange(n)}
            bottomContentInset={scrollBottomPad}
            headerBottomFade={HEADER_BOTTOM_FADE}
          />
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingTop: QUESTION_TO_OPTIONS_GAP + HEADER_BOTTOM_FADE,
              paddingBottom: scrollBottomPad,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {question.type === 'select' ? (
              <SelectAnswers
                question={question}
                value={value as string}
                onChange={onChange}
                onPickComplete={onContinue}
                reduceMotion={reduceMotion}
              />
            ) : question.type === 'multiselect' ? (
              <MultiSelectAnswers
                question={question}
                value={(value as string[]) ?? []}
                onChange={onChange}
                reduceMotion={reduceMotion}
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
        )}
      </Animated.View>

      {showStickyContinue ? (
        <Animated.View
          key={`step-footer-${question.id}`}
          entering={footerEntering}
          style={{
            flexShrink: 0,
            /** Full window width + negative inset so the bar is not clipped or shifted inside padded `Screen`. */
            width: windowWidth,
            alignSelf: 'flex-start',
            marginStart: -Layout.screenInset,
            marginTop: -FOOTER_TOP_FADE,
            /** No solid fill on the shell — top gradient stays transparent over the list (same idea as the header). */
            backgroundColor: 'transparent',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={footerFadeColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: FOOTER_TOP_FADE,
            }}
          />
          <View
            style={{
              width: '100%',
              marginTop: FOOTER_TOP_FADE,
              paddingTop: Spacing.sm,
              paddingBottom: Spacing.sm,
              paddingHorizontal: Spacing.md,
              backgroundColor: colors.background.secondary,
            }}
          >
            <Button
              label="Next"
              variant="dark"
              size="xl"
              fullWidth
              disabled={!valid}
              onPress={onContinue}
              accessibilityHint={
                valid ? 'Saves your answer and moves to the next question' : 'Pick an option to continue'
              }
            />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function OptionRow({
  label,
  helper,
  selected,
  onPress,
  accessibilityRole,
  iconName,
}: {
  label: string;
  helper?: string;
  selected: boolean;
  onPress: () => void;
  accessibilityRole: AccessibilityRole;
  /** When null/undefined, the row is text-only (e.g. ethnicity, abstract scales). */
  iconName?: IoniconName | null;
}) {
  const colors = useColors();
  const mode = useThemeMode();
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ checked: selected, selected }}
      style={{ marginBottom: Spacing.md }}
    >
      <View
        style={{
          minHeight: OPTION_ROW_MIN_HEIGHT,
          paddingVertical: Spacing.md + 2,
          paddingHorizontal: Spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          borderRadius: Radii.lg,
          borderWidth: selected ? 2 : 0,
          borderColor: selected ? colors.accent.default : 'transparent',
          backgroundColor: selected ? colors.accent.background : colors.surface.raised,
          // LazyFit pattern: shadow on default state, no shadow when selected
          ...(selected ? getShadow('none', mode) : getShadow('soft', mode)),
        }}
      >
        {iconName ? (
          <Ionicons
            name={iconName}
            size={26}
            color={selected ? colors.accent.default : colors.text.primary}
          />
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Body
            tone={selected ? 'accent' : 'primary'}
            variant="bodyEmphasis"
            style={{ fontSize: 17, lineHeight: 22, fontWeight: '600' }}
          >
            {label}
          </Body>
          {helper ? (
            <Caption tone="secondary" style={{ marginTop: 2 }}>
              {helper}
            </Caption>
          ) : null}
        </View>
        {accessibilityRole === 'checkbox' ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.accent.default : 'transparent',
              borderWidth: selected ? 0 : 1.5,
              borderColor: colors.border.strong,
            }}
          >
            {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function SelectAnswers({
  question,
  value,
  onChange,
  onPickComplete,
  reduceMotion,
}: {
  question: Extract<Question, { type: 'select' }>;
  value?: string;
  onChange: (v: string) => void;
  onPickComplete: () => void;
  reduceMotion: boolean;
}) {
  const [celebration, setCelebration] = React.useState<string | null>(null);
  const advanceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    },
    [],
  );

  const scheduleAdvance = (line: string | null) => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (line && !reduceMotion) {
      setCelebration(line);
      advanceTimerRef.current = setTimeout(() => {
        advanceTimerRef.current = null;
        setCelebration(null);
        onPickComplete();
      }, 420);
    } else {
      setCelebration(null);
      onPickComplete();
    }
  };

  return (
    <>
      {celebration ? <SelectionCelebration text={celebration} /> : null}
      {question.options.map((opt, index) => (
        <Animated.View
          key={opt.value}
          entering={optionStaggerEntering(index, reduceMotion)}
          style={{ width: '100%' }}
        >
          <OptionRow
            label={opt.label}
            helper={opt.helper}
            selected={value === opt.value}
            onPress={() => {
              if (value === opt.value) return;
              onChange(opt.value);
              scheduleAdvance(getSelectOptionCelebration(question.id, opt.value));
            }}
            accessibilityRole="radio"
            iconName={onboardingOptionIcon(question.id, opt.value)}
          />
        </Animated.View>
      ))}
    </>
  );
}

function MultiSelectAnswers({
  question,
  value,
  onChange,
  reduceMotion,
}: {
  question: Extract<Question, { type: 'multiselect' }>;
  value: string[];
  onChange: (v: string[]) => void;
  reduceMotion: boolean;
}) {
  const n = question.options.length;
  return (
    <>
      {question.options.map((opt, index) => {
        const selected = value.includes(opt.value);
        const max = question.maxSelections;
        const handle = () => {
          if (selected) {
            onChange(value.filter((v) => v !== opt.value));
          } else if (max && value.length >= max) {
            onChange([...value.slice(1), opt.value]);
          } else {
            onChange([...value, opt.value]);
          }
        };
        return (
          <Animated.View
            key={opt.value}
            entering={optionStaggerEntering(index, reduceMotion)}
            style={{ width: '100%' }}
          >
            <OptionRow
              label={opt.label}
              helper={opt.helper}
              selected={selected}
              onPress={handle}
              accessibilityRole="checkbox"
              iconName={onboardingOptionIcon(question.id, opt.value)}
            />
          </Animated.View>
        );
      })}
      {question.maxSelections ? (
        <Animated.View
          entering={optionStaggerEntering(n, reduceMotion)}
          style={{ width: '100%' }}
        >
          <Caption tone="secondary" style={{ marginTop: Spacing.xs }}>
            {`Up to ${question.maxSelections}.`}
          </Caption>
        </Animated.View>
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
    <Card shadow="soft">
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
    <Card shadow="soft">
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
  const hours = [7, 8, 9, 10, 18, 19, 20, 21];
  const minutes: ReadonlyArray<0 | 15 | 30 | 45> = [0, 15, 30, 45];
  return (
    <View style={{ gap: Spacing.md }}>
      <Card shadow="soft" padding="base">
        <Caption tone="tertiary" style={{ marginBottom: Spacing.sm }}>
          hour
        </Caption>
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
      </Card>
      <Card shadow="soft" padding="base">
        <Caption tone="tertiary" style={{ marginBottom: Spacing.sm }}>
          minutes
        </Caption>
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
      </Card>
    </View>
  );
}
