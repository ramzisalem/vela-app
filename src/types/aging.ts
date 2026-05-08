/**
 * Aging band types (file 36).
 *
 * The natural-aging band is a *contextual* overlay drawn behind the user's
 * own line on a trend chart. It is data — not a target. The user is the
 * figure; the band is the ground.
 *
 * Hard rules:
 *  - We never display a "younger you" or "before/after" projection.
 *  - We never use words: reverse, fight, combat, defeat, restore (cosmetic),
 *    youthful, youth, anti-aging.
 *  - The user-facing toggle in the About sheet is the SAME source of truth
 *    as Settings; both read/write `UserBandPreferences.showOnTrendCharts`.
 *  - Sex-at-birth is captured ONCE at the very end of onboarding and is
 *    skippable; combined band is the silent fallback.
 */
export type FaceMetric =
  | 'overall'
  | 'skinClarity'
  | 'redness'
  | 'eyeArea'
  | 'cheekVolume'
  | 'jawDefinition'
  | 'symmetry'
  | 'hairDensity';

export type AgingDecade = 20 | 30 | 40 | 50 | 60 | 70;
export type SexAtBirth = 'female' | 'male' | 'combined';

export interface AgingBand {
  metric: FaceMetric;
  ageDecade: AgingDecade;
  sexAtBirth: SexAtBirth;
  /** Annual relative-change percentages. -8 means the metric typically
   *  declines by 8% per year (band lower edge). */
  band: { p10: number; p50: number; p90: number };
  controllabilityHint: 'mostly-controllable' | 'partly-controllable' | 'mostly-natural';
  /** Short citation string for the About sheet. */
  sourceCitation: string;
}

export interface UserBandPreferences {
  showOnTrendCharts: boolean;
  showControllabilityCallouts: boolean;
  /** ISO timestamp; set on the day the user toggles off (so we never
   *  re-prompt them). */
  optedOutAt?: string;
}

export interface AgingContext {
  ageDecade: AgingDecade;
  sexAtBirth: SexAtBirth | 'unknown';
  yearsSinceBaseline: number;
}

export type BandPosition = 'inside' | 'above' | 'below' | 'unknown';
