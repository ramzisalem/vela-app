/**
 * Canonical 30-question onboarding bank (file 07).
 *
 * RULE: questions are ordered, never reordered between sessions. Q1b is
 * conditional — only shown when Q1 answer is `non_binary` / `prefer_not_to_say`.
 *
 * Wording is sentence case, no exclamation marks, brand voice (file 21).
 * The verbatim copy below is canonical — change with a designer in the loop.
 */

import type {
  AppearanceGoal,
  BudgetRange,
  DietPattern,
  EthnicityOption,
  ExerciseFrequency,
  FaceShape,
  FacialHairSituation,
  FitzpatrickSkinType,
  Gender,
  HairSituation,
  HormonalFactor,
  IdealOutcome,
  RoutineIntensity,
  SPFHabit,
  ScoringFramework,
  SkinCondition,
  SleepHours,
  StressLevel,
  SubstanceHabit,
  TimeAvailability,
  WaterIntake,
  CosmeticProcedure,
} from '@/types';

export type QuestionId =
  | 'q1_gender'
  | 'q1b_framework'
  | 'q2_age'
  | 'q3_ethnicity'
  | 'q4_skin_type'
  | 'q5_hair'
  | 'q6_facial_hair'
  | 'q7_face_shape'
  | 'q8_skin_conditions'
  | 'q9_self_perceived_age'
  | 'q10_appearance_goals'
  | 'q11_primary_goal'
  | 'q12_ideal_outcomes'
  | 'q13_routine_intensity'
  | 'q14_time_available'
  | 'q15_budget'
  | 'q16_spf_habit'
  | 'q17_current_products'
  | 'q18_active_treatments'
  | 'q19_recent_procedures'
  | 'q20_exercise'
  | 'q21_diet'
  | 'q22_water'
  | 'q23_sleep'
  | 'q24_stress'
  | 'q25_substances'
  | 'q26_hormonal'
  | 'q27_self_perception'
  | 'q28_focus_regions'
  | 'q29_notifications'
  | 'q30_checkin';

type SectionId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface OptionDef<T extends string> {
  value: T;
  label: string;
  helper?: string;
}

export type QuestionType = 'select' | 'multiselect' | 'number' | 'text' | 'time';

interface BaseQuestion {
  id: QuestionId;
  type: QuestionType;
  title: string;
  subtitle?: string;
  required: boolean;
  section: SectionId;
}

interface SelectQuestion<T extends string> extends BaseQuestion {
  type: 'select';
  options: OptionDef<T>[];
}

interface MultiSelectQuestion<T extends string> extends BaseQuestion {
  type: 'multiselect';
  options: OptionDef<T>[];
  maxSelections?: number;
}

interface NumberQuestion extends BaseQuestion {
  type: 'number';
  min?: number;
  max?: number;
  units?: string;
}

interface TextQuestion extends BaseQuestion {
  type: 'text';
  multiline?: boolean;
  maxLength?: number;
}

interface TimeQuestion extends BaseQuestion {
  type: 'time';
}

export type Question =
  | SelectQuestion<string>
  | MultiSelectQuestion<string>
  | NumberQuestion
  | TextQuestion
  | TimeQuestion;

// ---------------------------------------------------------------------
// Section A — About you (Q1–Q7)
// ---------------------------------------------------------------------
const Q1: SelectQuestion<Gender> = {
  id: 'q1_gender',
  section: 'A',
  required: true,
  type: 'select',
  title: 'How do you describe your gender?',
  subtitle: 'This shapes how we score your scans.',
  options: [
    { value: 'man', label: 'Man' },
    { value: 'woman', label: 'Woman' },
    { value: 'non_binary', label: 'Non-binary' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ],
};

/**
 * Q1b — only shown when Q1 ∈ { non_binary, prefer_not_to_say }. (file 07
 * SPEC_REVIEW_3 fix.) Sets scoringFramework explicitly.
 */
const Q1B: SelectQuestion<ScoringFramework> = {
  id: 'q1b_framework',
  section: 'A',
  required: true,
  type: 'select',
  title: 'Which scoring framework feels right for you?',
  subtitle:
    'You can change this later in settings. We use it to weight different parts of your scan — there is no better or worse choice.',
  options: [
    { value: 'masculine', label: 'Masculine framework', helper: 'More weight on jaw, contour' },
    { value: 'feminine', label: 'Feminine framework', helper: 'More weight on skin, symmetry' },
    {
      value: 'neutral',
      label: 'Neutral framework',
      helper: 'Even weight across all sub-scores',
    },
  ],
};

const Q2: NumberQuestion = {
  id: 'q2_age',
  section: 'A',
  required: true,
  type: 'number',
  title: 'How old are you?',
  min: 13,
  max: 100,
  units: 'years',
};

const Q3: SelectQuestion<EthnicityOption> = {
  id: 'q3_ethnicity',
  section: 'A',
  required: false,
  type: 'select',
  title: 'How would you describe your background?',
  subtitle: 'We use this only to calibrate scores fairly across groups.',
  options: [
    { value: 'east_asian', label: 'East Asian' },
    { value: 'southeast_asian', label: 'Southeast Asian' },
    { value: 'south_asian', label: 'South Asian' },
    { value: 'middle_eastern', label: 'Middle Eastern' },
    { value: 'african', label: 'African' },
    { value: 'african_american', label: 'African American' },
    { value: 'caribbean', label: 'Caribbean' },
    { value: 'latino_hispanic', label: 'Latino or Hispanic' },
    { value: 'native_american', label: 'Native American' },
    { value: 'pacific_islander', label: 'Pacific Islander' },
    { value: 'white_european', label: 'White European' },
    { value: 'white_north_american', label: 'White North American' },
    { value: 'mixed', label: 'Mixed background' },
    { value: 'other', label: 'Another background' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ],
};

const Q4: SelectQuestion<FitzpatrickSkinType> = {
  id: 'q4_skin_type',
  section: 'A',
  required: false,
  type: 'select',
  title: 'How does your skin react to the sun?',
  subtitle: 'Use the closest match. No need to be exact.',
  options: [
    { value: 'I', label: 'Always burns, never tans' },
    { value: 'II', label: 'Usually burns, tans poorly' },
    { value: 'III', label: 'Sometimes burns, tans gradually' },
    { value: 'IV', label: 'Rarely burns, tans easily' },
    { value: 'V', label: 'Very rarely burns, tans deeply' },
    { value: 'VI', label: 'Never burns, deeply pigmented' },
  ],
};

const Q5: SelectQuestion<HairSituation> = {
  id: 'q5_hair',
  section: 'A',
  required: false,
  type: 'select',
  title: 'How would you describe your hair right now?',
  options: [
    { value: 'thick_full', label: 'Thick and full' },
    { value: 'average', label: 'Average' },
    { value: 'thinning_crown', label: 'Thinning at the crown' },
    { value: 'thinning_temple', label: 'Thinning at the temples' },
    { value: 'thinning_diffuse', label: 'Diffusely thinning' },
    { value: 'shedding_postpartum', label: 'Shedding (postpartum)' },
    { value: 'shedding_other', label: 'Shedding (other)' },
    { value: 'shaved_choice', label: 'Shaved by choice' },
    { value: 'shaved_loss', label: 'Shaved due to loss' },
    { value: 'gray_natural', label: 'Going gray naturally' },
    { value: 'gray_dyed', label: 'Dying my grays' },
    { value: 'not_applicable', label: 'Not applicable' },
  ],
};

const Q6: SelectQuestion<FacialHairSituation> = {
  id: 'q6_facial_hair',
  section: 'A',
  required: false,
  type: 'select',
  title: 'Facial hair?',
  options: [
    { value: 'clean_shaven', label: 'Clean shaven' },
    { value: 'stubble', label: 'Stubble' },
    { value: 'short_beard', label: 'Short beard' },
    { value: 'full_beard', label: 'Full beard' },
    { value: 'patchy', label: 'Patchy' },
    { value: 'mustache_only', label: 'Mustache only' },
    { value: 'goatee', label: 'Goatee' },
    { value: 'not_applicable', label: 'Not applicable' },
  ],
};

const Q7: SelectQuestion<FaceShape> = {
  id: 'q7_face_shape',
  section: 'A',
  required: false,
  type: 'select',
  title: 'Your face shape?',
  subtitle: "Take your best guess. We'll refine after your first scan.",
  options: [
    { value: 'oval', label: 'Oval' },
    { value: 'round', label: 'Round' },
    { value: 'square', label: 'Square' },
    { value: 'heart', label: 'Heart' },
    { value: 'oblong', label: 'Oblong' },
    { value: 'diamond', label: 'Diamond' },
    { value: 'unsure', label: 'Not sure' },
  ],
};

// ---------------------------------------------------------------------
// Section B — Skin & body context (Q8–Q12)
// ---------------------------------------------------------------------
const Q8: MultiSelectQuestion<SkinCondition> = {
  id: 'q8_skin_conditions',
  section: 'B',
  required: false,
  type: 'multiselect',
  title: 'Anything you’re working with on your skin?',
  subtitle: 'Pick any that apply.',
  options: [
    { value: 'acne_active', label: 'Active acne' },
    { value: 'acne_scarring', label: 'Acne scarring' },
    { value: 'rosacea', label: 'Rosacea' },
    { value: 'eczema', label: 'Eczema' },
    { value: 'sensitive', label: 'Sensitive skin' },
    { value: 'hyperpigmentation', label: 'Hyperpigmentation' },
    { value: 'melasma', label: 'Melasma' },
    { value: 'dryness', label: 'Dryness' },
    { value: 'oiliness', label: 'Oiliness' },
    { value: 'large_pores', label: 'Large pores' },
    { value: 'fine_lines', label: 'Fine lines' },
    { value: 'dark_circles', label: 'Dark circles' },
    { value: 'puffiness', label: 'Puffiness' },
    { value: 'redness', label: 'Redness' },
    { value: 'none', label: 'None of these' },
  ],
};

const Q9: NumberQuestion = {
  id: 'q9_self_perceived_age',
  section: 'B',
  required: false,
  type: 'number',
  title: 'How old do you feel you look right now?',
  subtitle: 'No wrong answer. We compare this to your scan’s perceived age over time.',
  min: 13,
  max: 100,
  units: 'years',
};

const Q10: MultiSelectQuestion<AppearanceGoal> = {
  id: 'q10_appearance_goals',
  section: 'B',
  required: true,
  type: 'multiselect',
  title: 'What brings you to Vela?',
  subtitle: 'Pick up to three.',
  maxSelections: 3,
  options: [
    { value: 'baseline_track', label: 'Track changes over time' },
    { value: 'address_skin', label: 'Address skin concerns' },
    { value: 'optimize_routine', label: 'Find a routine that works' },
    { value: 'monitor_treatment', label: 'Monitor a treatment' },
    { value: 'understand_aging', label: 'Understand how I’m aging' },
    { value: 'objective_view', label: 'Get an objective view' },
  ],
};

const Q11: SelectQuestion<AppearanceGoal> = {
  id: 'q11_primary_goal',
  section: 'B',
  required: true,
  type: 'select',
  title: 'If you had to pick one, which matters most?',
  subtitle: 'We use this to bias your routine and check-ins.',
  options: Q10.options,
};

const Q12: MultiSelectQuestion<IdealOutcome> = {
  id: 'q12_ideal_outcomes',
  section: 'B',
  required: false,
  type: 'multiselect',
  title: 'In a year, what would you want to be true?',
  subtitle: 'Pick up to three.',
  maxSelections: 3,
  options: [
    { value: 'clearer_skin', label: 'Clearer skin' },
    { value: 'reduced_redness', label: 'Less redness' },
    { value: 'better_sleep_skin', label: 'Skin that reflects better sleep' },
    { value: 'consistent_routine', label: 'A routine I actually keep' },
    { value: 'measurable_progress', label: 'Measurable progress I can see' },
    { value: 'fewer_surprises', label: 'Fewer skin surprises' },
    { value: 'evidence_based', label: 'Evidence behind what I do' },
  ],
};

// ---------------------------------------------------------------------
// Section C — Routine (Q13–Q19)
// ---------------------------------------------------------------------
const Q13: SelectQuestion<RoutineIntensity> = {
  id: 'q13_routine_intensity',
  section: 'C',
  required: true,
  type: 'select',
  title: 'How intensive should your routine be?',
  options: [
    { value: 'minimal', label: 'Minimal — 2 to 3 steps' },
    { value: 'standard', label: 'Standard — 4 to 6 steps' },
    { value: 'intensive', label: 'Intensive — 6+ steps' },
  ],
};

const Q14: SelectQuestion<TimeAvailability> = {
  id: 'q14_time_available',
  section: 'C',
  required: false,
  type: 'select',
  title: 'How much time do you actually have, mornings and evenings?',
  options: [
    { value: 'minimal', label: '5 minutes total' },
    { value: 'moderate', label: '10 to 15 minutes total' },
    { value: 'dedicated', label: '20+ minutes total' },
  ],
};

const Q15: SelectQuestion<BudgetRange> = {
  id: 'q15_budget',
  section: 'C',
  required: false,
  type: 'select',
  title: 'Comfortable budget for products?',
  subtitle: 'We never push you to buy. This shapes recommendations only.',
  options: [
    { value: 'frugal', label: 'Frugal — drugstore picks' },
    { value: 'moderate', label: 'Moderate — mid-range' },
    { value: 'invested', label: 'Invested — premium when worth it' },
  ],
};

const Q16: SelectQuestion<SPFHabit> = {
  id: 'q16_spf_habit',
  section: 'C',
  required: true,
  type: 'select',
  title: 'How do you wear SPF?',
  options: [
    { value: 'daily', label: 'Daily, rain or shine' },
    { value: 'when_remember', label: 'When I remember' },
    { value: 'rarely', label: 'Rarely' },
    { value: 'never', label: 'Never' },
  ],
};

const Q17: TextQuestion = {
  id: 'q17_current_products',
  section: 'C',
  required: false,
  type: 'text',
  title: 'What are you using on your skin right now?',
  subtitle: 'Comma-separated is fine. We’ll structure these later.',
  multiline: true,
  maxLength: 600,
};

const Q18: TextQuestion = {
  id: 'q18_active_treatments',
  section: 'C',
  required: false,
  type: 'text',
  title: 'Any active treatments?',
  subtitle: 'Tretinoin, finasteride, microneedling, etc. Optional.',
  multiline: true,
  maxLength: 400,
};

const Q19: MultiSelectQuestion<CosmeticProcedure> = {
  id: 'q19_recent_procedures',
  section: 'C',
  required: false,
  type: 'multiselect',
  title: 'Any cosmetic procedures in the last 12 months?',
  options: [
    { value: 'none', label: 'None' },
    { value: 'botox', label: 'Botox' },
    { value: 'fillers', label: 'Fillers' },
    { value: 'laser', label: 'Laser' },
    { value: 'microneedling', label: 'Microneedling' },
    { value: 'chemical_peel', label: 'Chemical peel' },
    { value: 'transplant_hair', label: 'Hair transplant' },
    { value: 'rhinoplasty', label: 'Rhinoplasty' },
    { value: 'other_surgical', label: 'Other surgical' },
    { value: 'considering', label: 'Considering one' },
  ],
};

// ---------------------------------------------------------------------
// Section D — Lifestyle (Q20–Q26)
// ---------------------------------------------------------------------
const Q20: SelectQuestion<ExerciseFrequency> = {
  id: 'q20_exercise',
  section: 'D',
  required: false,
  type: 'select',
  title: 'How often do you move?',
  options: [
    { value: 'sedentary', label: 'Sedentary' },
    { value: 'light', label: 'Lightly active' },
    { value: 'regular', label: 'Regular exercise' },
    { value: 'intense', label: 'Intense, frequent training' },
  ],
};

const Q21: SelectQuestion<DietPattern> = {
  id: 'q21_diet',
  section: 'D',
  required: false,
  type: 'select',
  title: 'How would you describe your diet?',
  options: [
    { value: 'omnivore_balanced', label: 'Balanced omnivore' },
    { value: 'omnivore_processed', label: 'Omnivore, processed-leaning' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'low_carb', label: 'Low-carb' },
    { value: 'mediterranean', label: 'Mediterranean' },
    { value: 'other', label: 'Something else' },
  ],
};

const Q22: SelectQuestion<WaterIntake> = {
  id: 'q22_water',
  section: 'D',
  required: false,
  type: 'select',
  title: 'Water intake on a typical day?',
  options: [
    { value: 'low', label: 'Low — under 1 litre' },
    { value: 'moderate', label: 'Moderate — 1 to 2 litres' },
    { value: 'high', label: 'High — 2+ litres' },
  ],
};

const Q23: SelectQuestion<SleepHours> = {
  id: 'q23_sleep',
  section: 'D',
  required: false,
  type: 'select',
  title: 'Average hours of sleep?',
  options: [
    { value: 'under_5', label: 'Under 5 hours' },
    { value: '5_6', label: '5 to 6 hours' },
    { value: '6_7', label: '6 to 7 hours' },
    { value: '7_8', label: '7 to 8 hours' },
    { value: '8_plus', label: '8 or more hours' },
  ],
};

const Q24: SelectQuestion<StressLevel> = {
  id: 'q24_stress',
  section: 'D',
  required: false,
  type: 'select',
  title: 'How would you describe your stress lately?',
  options: [
    { value: 'low', label: 'Low' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'high', label: 'High' },
    { value: 'severe', label: 'Severe — most days are heavy' },
  ],
};

const Q25: MultiSelectQuestion<SubstanceHabit> = {
  id: 'q25_substances',
  section: 'D',
  required: false,
  type: 'multiselect',
  title: 'Anything that affects your skin in the background?',
  subtitle: 'Optional. We use this only for context.',
  options: [
    { value: 'none', label: 'None of these' },
    { value: 'alcohol_occasional', label: 'Occasional alcohol' },
    { value: 'alcohol_regular', label: 'Regular alcohol' },
    { value: 'smoke_occasional', label: 'Occasional smoking' },
    { value: 'smoke_regular', label: 'Regular smoking' },
    { value: 'vape', label: 'Vaping' },
    { value: 'cannabis_occasional', label: 'Occasional cannabis' },
    { value: 'cannabis_regular', label: 'Regular cannabis' },
  ],
};

const Q26: MultiSelectQuestion<HormonalFactor> = {
  id: 'q26_hormonal',
  section: 'D',
  required: false,
  type: 'multiselect',
  title: 'Any hormonal context that might shape your skin?',
  subtitle:
    'We use this with care. None of this surfaces in the UI without your opt-in.',
  options: [
    { value: 'none', label: 'None or prefer not to say' },
    { value: 'menstrual_tracking', label: 'I track my cycle' },
    { value: 'pregnant', label: 'Pregnant' },
    { value: 'postpartum', label: 'Postpartum' },
    { value: 'perimenopausal', label: 'Perimenopausal' },
    { value: 'menopausal', label: 'Menopausal' },
    { value: 'hrt_estrogen', label: 'HRT — estrogen-based' },
    { value: 'hrt_testosterone', label: 'HRT — testosterone-based' },
    { value: 'birth_control', label: 'Hormonal birth control' },
    { value: 'pcos', label: 'PCOS' },
  ],
};

// ---------------------------------------------------------------------
// Section E — Self-perception, focus, notifications (Q27–Q30)
// ---------------------------------------------------------------------
const Q27: TextQuestion = {
  id: 'q27_self_perception',
  section: 'E',
  required: false,
  type: 'text',
  title: 'In your own words — what do you want to improve about how you look?',
  subtitle: 'Optional. We treat this gently. No judgment, ever.',
  multiline: true,
  maxLength: 500,
};

const Q28: MultiSelectQuestion<string> = {
  id: 'q28_focus_regions',
  section: 'E',
  required: false,
  type: 'multiselect',
  title: 'Which parts of your face matter most to you right now?',
  options: [
    { value: 'forehead', label: 'Forehead' },
    { value: 'eyes', label: 'Eyes' },
    { value: 'cheeks', label: 'Cheeks' },
    { value: 'nose', label: 'Nose' },
    { value: 'mouth', label: 'Mouth' },
    { value: 'jaw', label: 'Jaw' },
    { value: 'chin', label: 'Chin' },
    { value: 'neck', label: 'Neck' },
    { value: 'overall_skin', label: 'Overall skin' },
    { value: 'overall_symmetry', label: 'Overall symmetry' },
  ],
};

const Q29: SelectQuestion<'enabled' | 'declined'> = {
  id: 'q29_notifications',
  section: 'E',
  required: false,
  type: 'select',
  title: 'Want a quiet weekly nudge to scan?',
  subtitle: 'You pick the day and time. One scan per week, no streaks shaming.',
  options: [
    { value: 'enabled', label: 'Yes, remind me' },
    { value: 'declined', label: 'Not right now' },
  ],
};

const Q30: TimeQuestion = {
  id: 'q30_checkin',
  section: 'E',
  required: false,
  type: 'time',
  title: 'When works best for your weekly check-in?',
  subtitle: 'You can change this anytime in settings.',
};

export const QUESTION_BANK: ReadonlyArray<Question> = [
  Q1,
  Q1B,
  Q2,
  Q3,
  Q4,
  Q5,
  Q6,
  Q7,
  Q8,
  Q9,
  Q10,
  Q11,
  Q12,
  Q13,
  Q14,
  Q15,
  Q16,
  Q17,
  Q18,
  Q19,
  Q20,
  Q21,
  Q22,
  Q23,
  Q24,
  Q25,
  Q26,
  Q27,
  Q28,
  Q29,
  Q30,
] as const;

/**
 * Filters the question list given the current answers — i.e. resolves the
 * Q1 → Q1b conditional gate. Returns the questions in the order they
 * should appear in the stepper.
 */
export function visibleQuestions(answers: Partial<Record<QuestionId, unknown>>): Question[] {
  const gender = answers.q1_gender as Gender | undefined;
  return QUESTION_BANK.filter((q) => {
    if (q.id === 'q1b_framework') {
      return gender === 'non_binary' || gender === 'prefer_not_to_say';
    }
    return true;
  });
}
