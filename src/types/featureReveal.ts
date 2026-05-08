/**
 * Drip-feed feature reveals (file 43).
 *
 * The reveal calendar surfaces existing-but-not-yet-engaged features one at
 * a time, contextually. Hard rules:
 *  - Quiet, ignorable, recoverable. Never flashes "NEW".
 *  - At most one card on the dashboard at a time.
 *  - At most one reveal per session.
 *  - At most three reveals per 7-day window.
 *  - Dismiss-once → re-show after 14 days. Dismiss-twice → live in
 *    Settings → "What's new in Vela" only.
 */
import type { LifeStageModeId } from './lifeStage';

export type FeatureRevealId =
  | 'apple-health-vital'
  | 'home-screen-widget'
  | 'first-comparison'
  | 'lock-screen-complication'
  | 'aging-band-overlay'
  | 'apple-watch-companion'
  | 'diary-nudge'
  | 'siri-shortcuts'
  | 'treatment-tracking'
  | 'experiment-mode'
  | 'patterns-deep-dive'
  | 'hair-tracking'
  | 'doctor-friendly-export'
  | 'on-this-day';

export type FeatureRevealStatus =
  | 'pending'
  | 'shown'
  | 'engaged'
  | 'dismissed-once'
  | 'dismissed-twice';

export interface FeatureReveal {
  id: FeatureRevealId;
  status: FeatureRevealStatus;
  shownAt?: string;
  engagedAt?: string;
  dismissedAt?: string;
  /** ISO timestamp when the dismiss-once card may re-surface. */
  reShownAfter?: string;
  lastEvaluatedAt: string;
}

export interface EligibilityContext {
  daysSinceSignup: number;
  scansCount: number;
  consecutiveRoutineDays: number;
  hasHealthKitConnected: boolean;
  hasPairedAppleWatch: boolean;
  iosVersionMajor: number;
  hasInstalledWidget: boolean;
  hasOpenedDiary: boolean;
  hasActiveTreatment: boolean;
  yearsSinceFirstScan: number;
  diaryTags: ReadonlyArray<string>;
  activeLifeStageModes: ReadonlyArray<LifeStageModeId>;
  /** Free-text fields from onboarding (sanitized). */
  onboardingHints: ReadonlyArray<string>;
}

export interface RevealCardCopy {
  /** "Now's a good time:" headline (file 43). */
  headline: string;
  body: string;
  cta: string;
}

export interface RevealDefinition {
  id: FeatureRevealId;
  /** Calendar week the reveal becomes a candidate. */
  week: number;
  /** Mode IDs that suppress this reveal. */
  suppressedDuringModes: ReadonlyArray<LifeStageModeId>;
  /** True if this reveal is permanent (e.g. "On this day" annual). */
  ongoing: boolean;
  /** Eligibility predicate; must be deterministic and side-effect free. */
  eligible: (ctx: EligibilityContext) => boolean;
  copy: RevealCardCopy;
  /** Where the CTA navigates (route or settings deep link). */
  cta: { route: string };
}
