/**
 * Onboarding state (file 02 + 07 + 08).
 *
 * Lives ONLY in Zustand during onboarding. Sync to Supabase happens
 * post-paywall in completePostPaywallSignup (file 08 SPEC_REVIEW_3 race fix).
 */
import { create } from 'zustand';
import type { QuestionId } from '@/core/onboarding/questions';
import type { Gender, ScoringFramework, UserProfile } from '@/types';
import { frameworkForGender } from '@/types';

type AnswerValue = string | number | string[] | { hour: number; minute: number };

interface OnboardingStore {
  answers: Partial<Record<QuestionId, AnswerValue>>;
  /** Index into the visible question list. */
  currentIndex: number;
  startedAt?: string;

  setAnswer: (id: QuestionId, value: AnswerValue) => void;
  setIndex: (index: number) => void;
  reset: () => void;

  /** Compose into a UserProfile-shaped object (sans id/createdAt). */
  composeProfile: (userId: string, email?: string) => UserProfile;
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  answers: {},
  currentIndex: 0,

  setAnswer: (id, value) => {
    const answers = { ...get().answers, [id]: value };
    // Q1 auto-fills scoringFramework for binary genders. For non-binary /
    // prefer-not-to-say it stays unset until Q1b is answered (file 07
    // SPEC_REVIEW_3).
    if (id === 'q1_gender') {
      const fw = frameworkForGender(value as Gender);
      if (fw) {
        answers.q1b_framework = fw;
      } else {
        delete answers.q1b_framework;
      }
    }
    set({ answers });
  },

  setIndex: (index) => set({ currentIndex: index }),

  reset: () => set({ answers: {}, currentIndex: 0, startedAt: undefined }),

  composeProfile: (userId, email) => {
    const a = get().answers;
    const gender = (a.q1_gender as Gender) ?? 'prefer_not_to_say';
    const scoringFramework =
      (a.q1b_framework as ScoringFramework) ?? frameworkForGender(gender) ?? 'neutral';
    const time = a.q30_checkin as { hour: number; minute: number } | undefined;
    const checkinDay = ((((new Date().getDay() + 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6) ?? 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    const profile: UserProfile = {
      id: userId,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profileVersion: 1,
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
      activeTreatments: a.q18_active_treatments
        ? (a.q18_active_treatments as string).split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      recentProcedures: a.q19_recent_procedures as UserProfile['recentProcedures'],
      exerciseFrequency: a.q20_exercise as UserProfile['exerciseFrequency'],
      diet: a.q21_diet as UserProfile['diet'],
      waterIntake: a.q22_water as UserProfile['waterIntake'],
      sleepHours: a.q23_sleep as UserProfile['sleepHours'],
      stressLevel: a.q24_stress as UserProfile['stressLevel'],
      substanceHabits: a.q25_substances as UserProfile['substanceHabits'],
      hormonalFactors: a.q26_hormonal as UserProfile['hormonalFactors'],
      selfPerceptionNotes: typeof a.q27_self_perception === 'string' ? a.q27_self_perception : undefined,
      focusRegions: a.q28_focus_regions as UserProfile['focusRegions'],
      notificationsEnabled: a.q29_notifications === 'enabled',
      checkinDay,
      checkinHour: time?.hour ?? 9,
      checkinMinute: ((time?.minute ?? 0) as 0 | 15 | 30 | 45),
    };
    return profile;
  },
}));
