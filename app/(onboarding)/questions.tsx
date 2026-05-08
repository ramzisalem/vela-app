/**
 * Onboarding stepper. Reads from the canonical question bank and
 * onboardingStore, advances through visible questions (Q1b conditional
 * on Q1), and inserts the privacy primer between sections C and D.
 */
import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { QuestionScreen } from '@/components/onboarding/QuestionScreen';
import { visibleQuestions } from '@/core/onboarding/questions';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function QuestionsScreen() {
  const router = useRouter();
  const answers = useOnboardingStore((s) => s.answers);
  const currentIndex = useOnboardingStore((s) => s.currentIndex);
  const setIndex = useOnboardingStore((s) => s.setIndex);
  const setAnswer = useOnboardingStore((s) => s.setAnswer);

  const visible = useMemo(() => visibleQuestions(answers), [answers]);
  const safeIndex = Math.min(currentIndex, visible.length - 1);
  const question = visible[safeIndex];

  useEffect(() => {
    if (safeIndex !== currentIndex) setIndex(safeIndex);
  }, [safeIndex, currentIndex, setIndex]);

  if (!question) {
    return null;
  }

  const goNext = () => {
    if (safeIndex >= visible.length - 1) {
      router.push('/(onboarding)/permissions');
      return;
    }
    // Insert privacy primer once, between section C and D.
    const next = visible[safeIndex + 1];
    if (next && question.section === 'C' && next.section === 'D') {
      router.push('/(onboarding)/privacy');
      return;
    }
    setIndex(safeIndex + 1);
  };

  const goBack = () => {
    if (safeIndex === 0) {
      router.back();
      return;
    }
    setIndex(safeIndex - 1);
  };

  return (
    <Screen>
      <QuestionScreen
        question={question}
        value={answers[question.id]}
        onChange={(v) => setAnswer(question.id, v as never)}
        onContinue={goNext}
        onBack={safeIndex === 0 ? undefined : goBack}
        progressLabel={`${safeIndex + 1} of ${visible.length}`}
      />
    </Screen>
  );
}
