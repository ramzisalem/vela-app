/**
 * Ionicons names for onboarding select / multiselect rows (file 07).
 * Keys are `${questionId}:${optionValue}`. Fallback in UI when missing.
 * Returns null for questions where icons add noise (ethnicity, abstract scales, etc.).
 */
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { QuestionId } from '@/core/onboarding/questions';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** No option-row icons for these questions (age uses native Picker, not this map). */
const QUESTIONS_WITHOUT_OPTION_ICONS: ReadonlySet<QuestionId> = new Set([
  'q3_ethnicity',
  'q4_skin_type',
  'q7_face_shape',
  'q22_water',
]);

const MAP: Readonly<Record<string, string>> = {
  // Q1 gender
  'q1_gender:man': 'male-outline',
  'q1_gender:woman': 'female-outline',
  'q1_gender:non_binary': 'people-outline',
  'q1_gender:prefer_not_to_say': 'eye-off-outline',

  // Q1b framework
  'q1b_framework:masculine': 'barbell-outline',
  'q1b_framework:feminine': 'flower-outline',
  'q1b_framework:neutral': 'analytics-outline',

  // Q5 hair
  'q5_hair:thick_full': 'volume-high-outline',
  'q5_hair:average': 'remove-outline',
  'q5_hair:thinning_crown': 'trending-down-outline',
  'q5_hair:thinning_temple': 'trending-down-outline',
  'q5_hair:thinning_diffuse': 'pulse-outline',
  'q5_hair:shedding_postpartum': 'heart-outline',
  'q5_hair:shedding_other': 'medical-outline',
  'q5_hair:shaved_choice': 'cut-outline',
  'q5_hair:shaved_loss': 'cut-outline',
  'q5_hair:gray_natural': 'color-filter-outline',
  'q5_hair:gray_dyed': 'color-wand-outline',
  'q5_hair:not_applicable': 'remove-circle-outline',

  // Q6 facial hair
  'q6_facial_hair:clean_shaven': 'sparkles-outline',
  'q6_facial_hair:stubble': 'ellipse-outline',
  'q6_facial_hair:short_beard': 'triangle-outline',
  'q6_facial_hair:full_beard': 'square-outline',
  'q6_facial_hair:patchy': 'shuffle-outline',
  'q6_facial_hair:mustache_only': 'remove-outline',
  'q6_facial_hair:goatee': 'radio-button-on-outline',
  'q6_facial_hair:not_applicable': 'remove-circle-outline',

  // Q8 skin conditions
  'q8_skin_conditions:acne_active': 'bandage-outline',
  'q8_skin_conditions:acne_scarring': 'layers-outline',
  'q8_skin_conditions:rosacea': 'flame-outline',
  'q8_skin_conditions:eczema': 'water-outline',
  'q8_skin_conditions:sensitive': 'alert-circle-outline',
  'q8_skin_conditions:hyperpigmentation': 'contrast-outline',
  'q8_skin_conditions:melasma': 'partly-sunny-outline',
  'q8_skin_conditions:dryness': 'leaf-outline',
  'q8_skin_conditions:oiliness': 'water-outline',
  'q8_skin_conditions:large_pores': 'grid-outline',
  'q8_skin_conditions:fine_lines': 'remove-outline',
  'q8_skin_conditions:dark_circles': 'moon-outline',
  'q8_skin_conditions:puffiness': 'cloud-outline',
  'q8_skin_conditions:redness': 'color-palette-outline',
  'q8_skin_conditions:none': 'checkmark-done-outline',

  // Q10 / Q11 appearance goals
  'q10_appearance_goals:baseline_track': 'analytics-outline',
  'q10_appearance_goals:address_skin': 'medical-outline',
  'q10_appearance_goals:optimize_routine': 'clipboard-outline',
  'q10_appearance_goals:monitor_treatment': 'pulse-outline',
  'q10_appearance_goals:understand_aging': 'hourglass-outline',
  'q10_appearance_goals:objective_view': 'eye-outline',
  'q11_primary_goal:baseline_track': 'analytics-outline',
  'q11_primary_goal:address_skin': 'medical-outline',
  'q11_primary_goal:optimize_routine': 'clipboard-outline',
  'q11_primary_goal:monitor_treatment': 'pulse-outline',
  'q11_primary_goal:understand_aging': 'hourglass-outline',
  'q11_primary_goal:objective_view': 'eye-outline',

  // Q12 ideal outcomes
  'q12_ideal_outcomes:clearer_skin': 'sparkles-outline',
  'q12_ideal_outcomes:reduced_redness': 'color-filter-outline',
  'q12_ideal_outcomes:better_sleep_skin': 'moon-outline',
  'q12_ideal_outcomes:consistent_routine': 'calendar-outline',
  'q12_ideal_outcomes:measurable_progress': 'stats-chart-outline',
  'q12_ideal_outcomes:fewer_surprises': 'shield-checkmark-outline',
  'q12_ideal_outcomes:evidence_based': 'book-outline',

  // Q13 routine intensity
  'q13_routine_intensity:minimal': 'remove-outline',
  'q13_routine_intensity:standard': 'options-outline',
  'q13_routine_intensity:intensive': 'layers-outline',

  // Q14 time
  'q14_time_available:minimal': 'timer-outline',
  'q14_time_available:moderate': 'time-outline',
  'q14_time_available:dedicated': 'hourglass-outline',

  // Q15 budget
  'q15_budget:frugal': 'pricetag-outline',
  'q15_budget:moderate': 'card-outline',
  'q15_budget:invested': 'diamond-outline',

  // Q16 SPF
  'q16_spf_habit:daily': 'sunny-outline',
  'q16_spf_habit:when_remember': 'cloud-outline',
  'q16_spf_habit:rarely': 'partly-sunny-outline',
  'q16_spf_habit:never': 'close-circle-outline',

  // Q19 procedures
  'q19_recent_procedures:none': 'checkmark-done-outline',
  'q19_recent_procedures:botox': 'medical-outline',
  'q19_recent_procedures:fillers': 'color-filter-outline',
  'q19_recent_procedures:laser': 'flash-outline',
  'q19_recent_procedures:microneedling': 'git-commit-outline',
  'q19_recent_procedures:chemical_peel': 'flask-outline',
  'q19_recent_procedures:transplant_hair': 'cut-outline',
  'q19_recent_procedures:rhinoplasty': 'body-outline',
  'q19_recent_procedures:other_surgical': 'bandage-outline',
  'q19_recent_procedures:considering': 'bulb-outline',

  // Q20 exercise
  'q20_exercise:sedentary': 'desktop-outline',
  'q20_exercise:light': 'walk-outline',
  'q20_exercise:regular': 'fitness-outline',
  'q20_exercise:intense': 'barbell-outline',

  // Q21 diet
  'q21_diet:omnivore_balanced': 'restaurant-outline',
  'q21_diet:omnivore_processed': 'fast-food-outline',
  'q21_diet:vegetarian': 'leaf-outline',
  'q21_diet:vegan': 'flower-outline',
  'q21_diet:low_carb': 'egg-outline',
  'q21_diet:mediterranean': 'fish-outline',
  'q21_diet:other': 'restaurant-outline',

  // Q23 sleep
  'q23_sleep:under_5': 'moon-outline',
  'q23_sleep:5_6': 'bed-outline',
  'q23_sleep:6_7': 'moon-outline',
  'q23_sleep:7_8': 'sunny-outline',
  'q23_sleep:8_plus': 'happy-outline',

  // Q24 stress
  'q24_stress:low': 'leaf-outline',
  'q24_stress:moderate': 'pulse-outline',
  'q24_stress:high': 'flash-outline',
  'q24_stress:severe': 'warning-outline',

  // Q25 substances
  'q25_substances:none': 'checkmark-done-outline',
  'q25_substances:alcohol_occasional': 'wine-outline',
  'q25_substances:alcohol_regular': 'beer-outline',
  'q25_substances:smoke_occasional': 'cloud-outline',
  'q25_substances:smoke_regular': 'flame-outline',
  'q25_substances:vape': 'cloud-circle-outline',
  'q25_substances:cannabis_occasional': 'leaf-outline',
  'q25_substances:cannabis_regular': 'leaf',

  // Q26 hormonal
  'q26_hormonal:none': 'checkmark-done-outline',
  'q26_hormonal:menstrual_tracking': 'calendar-outline',
  'q26_hormonal:pregnant': 'heart-outline',
  'q26_hormonal:postpartum': 'heart-circle-outline',
  'q26_hormonal:perimenopausal': 'trending-up-outline',
  'q26_hormonal:menopausal': 'thermometer-outline',
  'q26_hormonal:hrt_estrogen': 'medical-outline',
  'q26_hormonal:hrt_testosterone': 'medical-outline',
  'q26_hormonal:birth_control': 'shield-outline',
  'q26_hormonal:pcos': 'pulse-outline',

  // Q28 focus regions
  'q28_focus_regions:forehead': 'scan-outline',
  'q28_focus_regions:eyes': 'eye-outline',
  'q28_focus_regions:cheeks': 'happy-outline',
  'q28_focus_regions:nose': 'triangle-outline',
  'q28_focus_regions:mouth': 'ellipse-outline',
  'q28_focus_regions:jaw': 'square-outline',
  'q28_focus_regions:chin': 'remove-outline',
  'q28_focus_regions:neck': 'body-outline',
  'q28_focus_regions:overall_skin': 'sparkles-outline',
  'q28_focus_regions:overall_symmetry': 'git-compare-outline',

  // Q29 notifications
  'q29_notifications:enabled': 'notifications-outline',
  'q29_notifications:declined': 'notifications-off-outline',
} as const;

export function onboardingOptionIcon(questionId: QuestionId, value: string): IoniconName | null {
  if (QUESTIONS_WITHOUT_OPTION_ICONS.has(questionId)) return null;
  const key = `${questionId}:${value}`;
  return (MAP[key] ?? 'ellipse-outline') as IoniconName;
}
