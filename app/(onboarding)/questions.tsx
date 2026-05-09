/**
 * Onboarding stepper. Reads from the canonical question bank and
 * onboardingStore, advances through visible questions (Q1b conditional
 * on Q1), phases (pre_scan → post_scan → deferred), and inserts the privacy
 * primer between sections C and D when applicable.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { QuestionScreen } from '@/components/onboarding/QuestionScreen';
import { visibleQuestions } from '@/core/onboarding/questions';
import { getScanMetricHint } from '@/core/onboarding/scanHints';
import { sectionProgressMeta } from '@/core/onboarding/sectionCopy';
import { Analytics } from '@/services/analytics';
import { flushDeferredProfileToServer } from '@/services/onboarding/deferredProfile';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useScanStore } from '@/stores/scanStore';

export default function QuestionsScreen() {
  const router = useRouter();
  const answers = useOnboardingStore((s) => s.answers);
  const questionPhase = useOnboardingStore((s) => s.questionPhase);
  const currentIndex = useOnboardingStore((s) => s.currentIndex);
  const setIndex = useOnboardingStore((s) => s.setIndex);
  const setAnswer = useOnboardingStore((s) => s.setAnswer);

  const visible = useMemo(() => visibleQuestions(answers, questionPhase), [answers, questionPhase]);
  const safeIndex = Math.min(currentIndex, Math.max(0, visible.length - 1));
  const question = visible[safeIndex];

  const baselineSession = useScanStore((s) => {
    for (let i = s.sessions.length - 1; i >= 0; i--) {
      const sess = s.sessions[i];
      if (sess?.isBaseline) return sess;
    }
    return undefined;
  });

  const scanSuggestion = useMemo(() => {
    if (!question) return undefined;
    if (questionPhase !== 'post_scan') return undefined;
    if (!baselineSession) return undefined;
    const hint = getScanMetricHint(question.id, baselineSession.rawMetrics, baselineSession.scores);
    if (!hint) return undefined;
    return {
      summary: `Use: ${hint.label}`,
      onApply: () => {
        useOnboardingStore.getState().setAnswer(question.id, hint.value as never, 'metrics_hint');
        Analytics.track('onboarding_scan_hint_applied', { questionId: question.id });
      },
    };
  }, [question, questionPhase, baselineSession]);

  useEffect(() => {
    if (questionPhase === 'complete') {
      router.replace('/(main)/dashboard');
    }
  }, [questionPhase, router]);

  useEffect(() => {
    Analytics.track('onboarding_phase_started', { phase: questionPhase });
  }, [questionPhase]);

  useEffect(() => {
    if (safeIndex !== currentIndex) setIndex(safeIndex);
  }, [safeIndex, currentIndex, setIndex]);

  /** Default age to 30 when landing on Q2 (file 07). Layout effect avoids a blank-selected frame. */
  useLayoutEffect(() => {
    if (question?.id === 'q2_age' && answers.q2_age === undefined) {
      setAnswer('q2_age', 30);
    }
  }, [question?.id, answers.q2_age, setAnswer]);

  const goNext = useCallback(() => {
    const { answers: latestAnswers, currentIndex: idx, questionPhase: phase } =
      useOnboardingStore.getState();
    const visibleNow = visibleQuestions(latestAnswers, phase);
    const bounded = Math.min(idx, Math.max(0, visibleNow.length - 1));
    const qNow = visibleNow[bounded];
    if (!qNow) return;

    if (bounded >= visibleNow.length - 1) {
      if (phase === 'post_scan') {
        router.replace('/(onboarding)/scan-anchor');
        return;
      }
      if (phase === 'deferred') {
        void flushDeferredProfileToServer().then((ok) => {
          if (ok) router.replace('/(main)/dashboard');
        });
        return;
      }
      router.push('/(onboarding)/section-milestone?after=E');
      return;
    }
    const next = visibleNow[bounded + 1];
    if (!next) {
      setIndex(bounded + 1);
      return;
    }
    if (qNow.section === 'C' && next.section === 'D') {
      router.push('/(onboarding)/privacy');
      return;
    }
    if (qNow.section !== next.section) {
      if (phase === 'pre_scan') {
        setIndex(bounded + 1);
        return;
      }
      router.push(`/(onboarding)/section-milestone?after=${qNow.section}`);
      return;
    }
    setIndex(bounded + 1);
  }, [router, setIndex]);

  const goBack = useCallback(() => {
    if (safeIndex === 0) {
      if (questionPhase === 'post_scan') {
        router.replace('/(capture)/results-reveal');
        return;
      }
      if (questionPhase === 'deferred') {
        router.replace('/(main)/dashboard');
        return;
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(onboarding)/welcome');
      }
      return;
    }
    setIndex(safeIndex - 1);
  }, [router, safeIndex, questionPhase, setIndex]);

  if (questionPhase === 'complete') {
    return null;
  }

  if (!question) {
    return null;
  }

  const sectionPeers = visible.filter((q) => q.section === question.section);
  const stepInSection = sectionPeers.findIndex((q) => q.id === question.id) + 1;
  const sectionMeta = sectionProgressMeta(question.section);

  return (
    <Screen variant="secondary">
      <QuestionScreen
        question={question}
        value={answers[question.id]}
        onChange={(v) => setAnswer(question.id, v as never, 'user')}
        onContinue={goNext}
        onBack={safeIndex === 0 && questionPhase === 'pre_scan' ? undefined : goBack}
        globalStep={safeIndex + 1}
        globalTotal={visible.length}
        sectionTitle={sectionMeta.title}
        sectionPromise={sectionMeta.promise}
        stepInSection={stepInSection}
        stepsInSection={sectionPeers.length}
        scanSuggestion={scanSuggestion}
      />
    </Screen>
  );
}
