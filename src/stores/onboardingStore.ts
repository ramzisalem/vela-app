/**
 * Onboarding state (file 02 + 07 + 08).
 *
 * Lives ONLY in Zustand during onboarding. Sync to Supabase happens
 * post-paywall in completePostPaywallSignup (file 08 SPEC_REVIEW_3 race fix).
 *
 * Deferred answers (Q17–Q27) sync after signup via flushDeferredProfileToServer.
 * Phase + answers persist locally (AsyncStorage) across app restarts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { uuidv4 } from '@/utils/uuid';
import type { OnboardingQuestionPhase, QuestionId } from '@/core/onboarding/questions';
import type { Gender, ScoringFramework, UserProfile } from '@/types';
import { frameworkForGender } from '@/types';

type AnswerValue = string | number | string[] | { hour: number; minute: number };

/** How an answer was set — metrics hints never apply to ethnicity (Q3). */
export type AnswerProvenance = 'user' | 'metrics_hint';

export interface ComposeProfileOptions {
  /** Strip fields that only come from deferred (Q17–Q27) for first signup row. */
  omitDeferredAnswers?: boolean;
  preserveTimestampsFrom?: Pick<UserProfile, 'createdAt' | 'profileVersion'>;
}

interface OnboardingStore {
  answers: Partial<Record<QuestionId, AnswerValue>>;
  /** Index into the visible question list. */
  currentIndex: number;
  questionPhase: OnboardingQuestionPhase;
  answerSources: Partial<Record<QuestionId, AnswerProvenance>>;
  /**
   * Set after paywall signup to this device’s onboarding answers belong to `userId`.
   * Used to ignore stale phase when another account signs in.
   */
  persistedForUserId: string | null;
  /**
   * Stable local UUID stamped onto baseline scans / draft profiles created before
   * the user has signed up. Generated lazily by `ensureDraftUserId()`. After
   * paywall signup, `completePostPaywallSignup` rewrites any local scans with
   * this id to the real Supabase user id and clears the field.
   */
  draftUserId: string | null;
  startedAt?: string;

  setAnswer: (id: QuestionId, value: AnswerValue, source?: AnswerProvenance) => void;
  setIndex: (index: number) => void;
  setQuestionPhase: (phase: OnboardingQuestionPhase) => void;
  /** Call when the current Supabase user owns persisted onboarding answers. */
  bindPersistedOnboardingToUser: (userId: string) => void;
  /** Returns the existing draftUserId, or generates + persists a new one. */
  ensureDraftUserId: () => string;
  clearDraftUserId: () => void;
  reset: () => void;

  /** Compose into a UserProfile-shaped object (sans id/createdAt unless preserved). */
  composeProfile: (
    userId: string,
    email: string | undefined,
    options?: ComposeProfileOptions,
  ) => UserProfile;
}

const initialState = {
  answers: {} as Partial<Record<QuestionId, AnswerValue>>,
  currentIndex: 0,
  questionPhase: 'pre_scan' as OnboardingQuestionPhase,
  answerSources: {} as Partial<Record<QuestionId, AnswerProvenance>>,
  persistedForUserId: null as string | null,
  draftUserId: null as string | null,
  startedAt: undefined as string | undefined,
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAnswer: (id, value, source = 'user') => {
        // Ethnicity is always user-owned; never from metrics/AI heuristics.
        if (id === 'q3_ethnicity' && source === 'metrics_hint') {
          return;
        }
        const answers = { ...get().answers, [id]: value };
        const answerSources = { ...get().answerSources, [id]: source };
        if (id === 'q1_gender') {
          const fw = frameworkForGender(value as Gender);
          if (fw) {
            answers.q1b_framework = fw;
            answerSources.q1b_framework = 'user';
          } else {
            delete answers.q1b_framework;
            delete answerSources.q1b_framework;
          }
        }
        set({ answers, answerSources });
      },

      setIndex: (index) => set({ currentIndex: index }),

      setQuestionPhase: (questionPhase) => set({ questionPhase }),

      bindPersistedOnboardingToUser: (userId) => set({ persistedForUserId: userId }),

      ensureDraftUserId: () => {
        const existing = get().draftUserId;
        if (existing) return existing;
        const fresh = uuidv4();
        set({ draftUserId: fresh });
        return fresh;
      },

      clearDraftUserId: () => set({ draftUserId: null }),

      reset: () => set({ ...initialState }),

      composeProfile: (userId, email, options) => {
        const omitDef = options?.omitDeferredAnswers ?? false;
        const preserved = options?.preserveTimestampsFrom;
        const a = get().answers;
        const gender = (a.q1_gender as Gender) ?? 'prefer_not_to_say';
        const scoringFramework =
          (a.q1b_framework as ScoringFramework) ?? frameworkForGender(gender) ?? 'neutral';
        const time = a.q30_checkin as { hour: number; minute: number } | undefined;
        const checkinDay = (((new Date().getDay() + 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6) ??
          0) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
        const now = new Date().toISOString();
        const profile: UserProfile = {
          id: userId,
          email,
          createdAt: preserved?.createdAt ?? now,
          updatedAt: now,
          profileVersion: preserved?.profileVersion ?? 1,
          gender,
          scoringFramework,
          age: typeof a.q2_age === 'number' ? a.q2_age : undefined,
          ethnicity: a.q3_ethnicity as UserProfile['ethnicity'],
          skinType: a.q4_skin_type as UserProfile['skinType'],
          hairSituation: a.q5_hair as UserProfile['hairSituation'],
          facialHair: a.q6_facial_hair as UserProfile['facialHair'],
          faceShape: a.q7_face_shape as UserProfile['faceShape'],
          skinConditions: (a.q8_skin_conditions as string[] | undefined) as UserProfile['skinConditions'],
          selfPerceivedAge: typeof a.q9_self_perceived_age === 'number' ? a.q9_self_perceived_age : undefined,
          appearanceGoals: a.q10_appearance_goals as UserProfile['appearanceGoals'],
          primaryGoal: a.q11_primary_goal as UserProfile['primaryGoal'],
          idealOutcomes: a.q12_ideal_outcomes as UserProfile['idealOutcomes'],
          routineIntensity: a.q13_routine_intensity as UserProfile['routineIntensity'],
          timeAvailable: a.q14_time_available as UserProfile['timeAvailable'],
          budget: a.q15_budget as UserProfile['budget'],
          spfHabit: a.q16_spf_habit as UserProfile['spfHabit'],
          activeTreatments:
            omitDef || !a.q18_active_treatments
              ? undefined
              : (a.q18_active_treatments as string).split(',').map((s) => s.trim()).filter(Boolean),
          recentProcedures:
            omitDef ? undefined : (a.q19_recent_procedures as UserProfile['recentProcedures']),
          exerciseFrequency:
            omitDef ? undefined : (a.q20_exercise as UserProfile['exerciseFrequency']),
          diet: omitDef ? undefined : (a.q21_diet as UserProfile['diet']),
          waterIntake: omitDef ? undefined : (a.q22_water as UserProfile['waterIntake']),
          sleepHours: omitDef ? undefined : (a.q23_sleep as UserProfile['sleepHours']),
          stressLevel: omitDef ? undefined : (a.q24_stress as UserProfile['stressLevel']),
          substanceHabits: omitDef
            ? undefined
            : (a.q25_substances as UserProfile['substanceHabits']),
          hormonalFactors: omitDef ? undefined : (a.q26_hormonal as UserProfile['hormonalFactors']),
          selfPerceptionNotes:
            omitDef || typeof a.q27_self_perception !== 'string'
              ? undefined
              : a.q27_self_perception,
          focusRegions: a.q28_focus_regions as UserProfile['focusRegions'],
          notificationsEnabled: a.q29_notifications === 'enabled',
          checkinDay,
          checkinHour: time?.hour ?? 9,
          checkinMinute: ((time?.minute ?? 0) as 0 | 15 | 30 | 45),
        };
        return profile;
      },
    }),
    {
      name: 'vela-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        answers: s.answers,
        currentIndex: s.currentIndex,
        questionPhase: s.questionPhase,
        answerSources: s.answerSources,
        persistedForUserId: s.persistedForUserId,
        draftUserId: s.draftUserId,
      }),
    },
  ),
);
