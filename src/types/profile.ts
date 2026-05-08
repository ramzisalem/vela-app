/**
 * UserProfile and all enums (file 02).
 *
 * CANONICAL: scoringFramework is set ONCE (at onboarding) and read directly
 * thereafter. Do NOT re-derive from gender at scan/routine time. The only
 * legitimate consumer of `frameworkForGender` is onboarding (Q1 → Q1b for
 * non_binary / prefer_not_to_say) and Settings override (file 14).
 */

export type Gender = 'man' | 'woman' | 'non_binary' | 'prefer_not_to_say';

export type ScoringFramework = 'masculine' | 'feminine' | 'neutral';

/**
 * Maps gender to the default scoring framework. Onboarding Q1b is required
 * when gender is `non_binary` or `prefer_not_to_say` — for those cases this
 * function returns `undefined` so `canContinue` correctly waits.
 *
 * (File 07 SPEC_REVIEW_3 fix: GenderQuestion must NOT auto-fill via this
 * helper for non-binary / prefer-not-to-say users.)
 */
export function frameworkForGender(gender: Gender): ScoringFramework | undefined {
  switch (gender) {
    case 'man':
      return 'masculine';
    case 'woman':
      return 'feminine';
    case 'non_binary':
    case 'prefer_not_to_say':
      return undefined;
  }
}

export type FitzpatrickSkinType = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export type EthnicityOption =
  | 'east_asian'
  | 'southeast_asian'
  | 'south_asian'
  | 'middle_eastern'
  | 'african'
  | 'african_american'
  | 'caribbean'
  | 'latino_hispanic'
  | 'native_american'
  | 'pacific_islander'
  | 'white_european'
  | 'white_north_american'
  | 'mixed'
  | 'other'
  | 'prefer_not_to_say';

export type SkinCondition =
  | 'acne_active'
  | 'acne_scarring'
  | 'rosacea'
  | 'eczema'
  | 'sensitive'
  | 'hyperpigmentation'
  | 'melasma'
  | 'dryness'
  | 'oiliness'
  | 'large_pores'
  | 'fine_lines'
  | 'dark_circles'
  | 'puffiness'
  | 'redness'
  | 'none';

export type HairSituation =
  | 'thick_full'
  | 'average'
  | 'thinning_crown'
  | 'thinning_temple'
  | 'thinning_diffuse'
  | 'shedding_postpartum'
  | 'shedding_other'
  | 'shaved_choice'
  | 'shaved_loss'
  | 'gray_natural'
  | 'gray_dyed'
  | 'not_applicable';

export type FacialHairSituation =
  | 'clean_shaven'
  | 'stubble'
  | 'short_beard'
  | 'full_beard'
  | 'patchy'
  | 'mustache_only'
  | 'goatee'
  | 'not_applicable';

export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'oblong' | 'diamond' | 'unsure';

export type FaceRegion =
  | 'forehead'
  | 'eyes'
  | 'cheeks'
  | 'nose'
  | 'mouth'
  | 'jaw'
  | 'chin'
  | 'neck'
  | 'overall_skin'
  | 'overall_symmetry';

export type AppearanceGoal =
  | 'baseline_track'
  | 'address_skin'
  | 'optimize_routine'
  | 'monitor_treatment'
  | 'understand_aging'
  | 'objective_view';

export type IdealOutcome =
  | 'clearer_skin'
  | 'reduced_redness'
  | 'better_sleep_skin'
  | 'consistent_routine'
  | 'measurable_progress'
  | 'fewer_surprises'
  | 'evidence_based';

export type TimeAvailability = 'minimal' | 'moderate' | 'dedicated';

export type BudgetRange = 'frugal' | 'moderate' | 'invested';

export type RoutineIntensity = 'minimal' | 'standard' | 'intensive';

export type SPFHabit = 'daily' | 'when_remember' | 'rarely' | 'never';

export type ExerciseFrequency = 'sedentary' | 'light' | 'regular' | 'intense';

export type DietPattern =
  | 'omnivore_balanced'
  | 'omnivore_processed'
  | 'vegetarian'
  | 'vegan'
  | 'low_carb'
  | 'mediterranean'
  | 'other';

export type WaterIntake = 'low' | 'moderate' | 'high';

export type SleepHours = 'under_5' | '5_6' | '6_7' | '7_8' | '8_plus';

export type StressLevel = 'low' | 'moderate' | 'high' | 'severe';

export type SubstanceHabit =
  | 'none'
  | 'alcohol_occasional'
  | 'alcohol_regular'
  | 'smoke_occasional'
  | 'smoke_regular'
  | 'vape'
  | 'cannabis_occasional'
  | 'cannabis_regular';

export type HormonalFactor =
  | 'none'
  | 'menstrual_tracking'
  | 'pregnant'
  | 'postpartum'
  | 'menopausal'
  | 'perimenopausal'
  | 'hrt_estrogen'
  | 'hrt_testosterone'
  | 'birth_control'
  | 'pcos';

export type CosmeticProcedure =
  | 'none'
  | 'botox'
  | 'fillers'
  | 'laser'
  | 'microneedling'
  | 'chemical_peel'
  | 'transplant_hair'
  | 'rhinoplasty'
  | 'other_surgical'
  | 'considering';

export interface UserLocation {
  countryCode: string;
  region?: string;
  climate?: 'temperate' | 'tropical' | 'arid' | 'cold' | 'mediterranean';
}

export type ProductCategory =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'moisturizer'
  | 'sunscreen'
  | 'exfoliant'
  | 'mask'
  | 'eye_cream'
  | 'spot_treatment'
  | 'shampoo'
  | 'conditioner'
  | 'styling'
  | 'hair_growth'
  | 'beard_care'
  | 'supplement'
  | 'prescription'
  | 'other';

export interface UserProduct {
  id: string;
  name: string;
  brand?: string;
  category: ProductCategory;
  startedAt?: string; // ISO date
  notes?: string;
}

/**
 * The complete UserProfile. All fields except identity, gender, scoringFramework
 * are optional during onboarding (filled progressively).
 *
 * `flags.previewedRoutineTaskIds` is set when the pre-paywall preview locks in a
 * routine (file 40 SPEC_REVIEW_3) — must not regen between preview and post-paywall
 * dashboard.
 */
export interface UserProfile {
  // Identity
  id: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  profileVersion: number;

  // Q1 / Q1b
  gender: Gender;
  scoringFramework: ScoringFramework;

  // Demographics
  age?: number;
  ethnicity?: EthnicityOption;
  skinType?: FitzpatrickSkinType;
  location?: UserLocation;

  // Physical
  skinConditions?: SkinCondition[];
  hairSituation?: HairSituation;
  facialHair?: FacialHairSituation;
  faceShape?: FaceShape;
  selfPerceivedAge?: number;

  // Goals
  appearanceGoals?: AppearanceGoal[];
  primaryGoal?: AppearanceGoal;
  idealOutcomes?: IdealOutcome[];
  focusRegions?: FaceRegion[];

  // Routine
  routineIntensity?: RoutineIntensity;
  timeAvailable?: TimeAvailability;
  budget?: BudgetRange;
  spfHabit?: SPFHabit;
  currentProducts?: UserProduct[];
  activeTreatments?: string[]; // treatment IDs from file 34 library

  // Lifestyle
  exerciseFrequency?: ExerciseFrequency;
  diet?: DietPattern;
  waterIntake?: WaterIntake;
  sleepHours?: SleepHours;
  stressLevel?: StressLevel;
  substanceHabits?: SubstanceHabit[];
  hormonalFactors?: HormonalFactor[];

  // Self-perception
  selfPerceptionNotes?: string;
  recentProcedures?: CosmeticProcedure[];

  // Notifications
  notificationsEnabled?: boolean;
  checkinDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday (date-fns convention)
  checkinHour?: number; // 0–23
  checkinMinute?: 0 | 15 | 30 | 45;

  // Privacy / aging band (file 36)
  /** Stored per file 36 to drive aging band — distinct from `gender` for people on HRT etc. */
  sexAtBirthForBands?: 'female' | 'male' | 'unspecified';
  hideAgingBand?: boolean;

  // Life stage (file 48)
  activeLifeStageModes?: string[]; // LifeStageModeId

  // Flags
  flags?: {
    /** File 40: locked routine task IDs from pre-paywall preview. Don't regen until post-paywall session 1+. */
    previewedRoutineTaskIds?: string[];
    /** File 39: opted out of streak chip after 7-day reveal? */
    streaksHidden?: boolean;
    /** File 41: trial extension granted? */
    trialExtendedAt?: string;
    /** File 47: cancel-save offer used? */
    cancelSaveOfferUsed?: string;
  };
}
