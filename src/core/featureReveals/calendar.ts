/**
 * Drip-feed feature reveals — calendar (file 43).
 *
 * Reveals are *contextual* opportunities, not promotional badges. Each row's
 * `eligible` predicate runs on the live EligibilityContext; the evaluator
 * picks the first eligible row that is also valid against the user's
 * current reveal history and active life-stage modes.
 */
import type {
  EligibilityContext,
  RevealDefinition,
} from '@/types/featureReveal';

const hint = (ctx: EligibilityContext, ...needles: string[]): boolean =>
  ctx.onboardingHints.some((hint) =>
    needles.some((n) => hint.toLowerCase().includes(n)),
  ) ||
  ctx.diaryTags.some((tag) =>
    needles.some((n) => tag.toLowerCase().includes(n)),
  );

/** Minimum account age (days) for `doctor-friendly-export` eligibility; keep in sync with that reveal row. */
export const DOCTOR_EXPORT_MIN_DAYS_SINCE_SIGNUP = 12 * 7;

export const REVEAL_CALENDAR: ReadonlyArray<RevealDefinition> = [
  {
    id: 'apple-health-vital',
    week: 2,
    suppressedDuringModes: [],
    ongoing: false,
    eligible: (ctx) => ctx.scansCount >= 1 && ctx.daysSinceSignup >= 7,
    copy: {
      headline: 'Now’s a good time: Apple Health.',
      body:
        'Want your Vela score to live alongside your sleep and heart rate in Apple Health? Just a number, written once a week.',
      cta: 'Add to Health',
    },
    cta: { route: '/(main)/settings?section=ios-surfaces' },
  },
  {
    id: 'home-screen-widget',
    week: 4,
    suppressedDuringModes: [],
    ongoing: false,
    eligible: (ctx) => ctx.scansCount >= 3 && ctx.iosVersionMajor >= 14,
    copy: {
      headline: 'Now’s a good time: a widget.',
      body:
        'You can put Vela on your Home Screen now. It shows your streak and your next scan day.',
      cta: 'See widget setup',
    },
    cta: { route: '/(main)/settings?section=ios-surfaces' },
  },
  {
    id: 'first-comparison',
    week: 5,
    suppressedDuringModes: [],
    ongoing: false,
    eligible: (ctx) => ctx.scansCount >= 2,
    copy: {
      headline: 'Now’s a good time: compare your scans.',
      body:
        'You have multiple scans now. Sliding between them shows you change in a way charts can’t.',
      cta: 'Try the comparison',
    },
    cta: { route: '/(main)/compare' },
  },
  {
    id: 'lock-screen-complication',
    week: 6,
    suppressedDuringModes: [],
    ongoing: false,
    eligible: (ctx) =>
      ctx.iosVersionMajor >= 16 && ctx.scansCount >= 3 && ctx.hasInstalledWidget,
    copy: {
      headline: 'Now’s a good time: lock screen.',
      body:
        'Add Vela to your lock screen. Your streak count, alongside the clock.',
      cta: 'See setup',
    },
    cta: { route: '/(main)/settings?section=ios-surfaces' },
  },
  {
    id: 'aging-band-overlay',
    week: 7,
    suppressedDuringModes: ['pregnancy', 'postpartum', 'cancer_recovery'],
    ongoing: false,
    eligible: (ctx) => ctx.scansCount >= 4,
    copy: {
      headline: 'Now’s a good time: context on your charts.',
      body:
        'Your charts can show what’s typical for someone your age, alongside your own line. We thought you might want the context.',
      cta: 'Take a look',
    },
    cta: { route: '/(main)/dashboard?openAgingBand=true' },
  },
  {
    id: 'apple-watch-companion',
    week: 8,
    suppressedDuringModes: [],
    ongoing: false,
    eligible: (ctx) => ctx.hasPairedAppleWatch,
    copy: {
      headline: 'Now’s a good time: Vela on the wrist.',
      body:
        'We noticed you have a Watch paired. Vela on the wrist is one tap to log your routine.',
      cta: 'Add the watch app',
    },
    cta: { route: '/(main)/settings?section=ios-surfaces' },
  },
  {
    id: 'diary-nudge',
    week: 9,
    suppressedDuringModes: [],
    ongoing: false,
    eligible: (ctx) => ctx.consecutiveRoutineDays >= 5,
    copy: {
      headline: 'Now’s a good time: a small note.',
      body:
        'A short diary entry can show patterns the scan can’t. Try it for a week and see what surfaces.',
      cta: 'Open the diary',
    },
    cta: { route: '/(main)/dashboard?openDiary=true' },
  },
  {
    id: 'siri-shortcuts',
    week: 10,
    suppressedDuringModes: [],
    ongoing: false,
    eligible: (ctx) => ctx.iosVersionMajor >= 16 && ctx.consecutiveRoutineDays >= 14,
    copy: {
      headline: 'Now’s a good time: Siri.',
      body:
        'Three quick voice shortcuts: log routine, add a note, ask for your latest score. Optional.',
      cta: 'Set them up',
    },
    cta: { route: '/(main)/settings?section=ios-surfaces' },
  },
  {
    id: 'treatment-tracking',
    week: 12,
    suppressedDuringModes: ['pregnancy', 'postpartum', 'cancer_recovery'],
    ongoing: false,
    eligible: (ctx) =>
      hint(ctx, 'tretinoin', 'retinoid', 'derm', 'treatment', 'serum'),
    copy: {
      headline: 'Now’s a good time: treatment tracking.',
      body:
        'You mentioned you might be starting something during onboarding. If you’re on it now, treatment tracking gives you a timeline that doesn’t lie.',
      cta: 'Start tracking',
    },
    cta: { route: '/(main)/settings' },
  },
  {
    id: 'experiment-mode',
    week: 14,
    suppressedDuringModes: ['pregnancy', 'postpartum', 'cancer_recovery'],
    ongoing: false,
    eligible: (ctx) => ctx.scansCount >= 8 && ctx.consecutiveRoutineDays >= 28,
    copy: {
      headline: 'Now’s a good time: experiment mode.',
      body:
        'You’ve kept a routine for a month. Want to test something — a single change, four weeks, see what your face does?',
      cta: 'Start an experiment',
    },
    cta: { route: '/(main)/settings' },
  },
  {
    id: 'patterns-deep-dive',
    week: 16,
    suppressedDuringModes: [],
    ongoing: false,
    eligible: (ctx) => ctx.hasHealthKitConnected && ctx.scansCount >= 6,
    copy: {
      headline: 'Now’s a good time: patterns.',
      body:
        'Six weeks of HealthKit and scan data lines up patterns we can talk about now.',
      cta: 'See what we noticed',
    },
    cta: { route: '/(main)/dashboard' },
  },
  {
    id: 'hair-tracking',
    week: 18,
    suppressedDuringModes: ['cancer_recovery'],
    ongoing: false,
    eligible: (ctx) => hint(ctx, 'hair', 'shedding', 'thinning', 'minoxidil'),
    copy: {
      headline: 'Now’s a good time: hair tracking.',
      body:
        'You mentioned hair earlier. Tracking density alongside your face gives a fuller picture.',
      cta: 'Add hair tracking',
    },
    cta: { route: '/(main)/settings' },
  },
  {
    id: 'doctor-friendly-export',
    week: 20,
    suppressedDuringModes: [],
    ongoing: false,
    eligible: (ctx) =>
      ctx.hasActiveTreatment && ctx.daysSinceSignup >= DOCTOR_EXPORT_MIN_DAYS_SINCE_SIGNUP,
    copy: {
      headline: 'Now’s a good time: a PDF for your derm.',
      body:
        'Twelve weeks of treatment data is a useful artifact. One tap exports a doctor-friendly PDF.',
      cta: 'Generate PDF',
    },
    cta: { route: '/(main)/settings' },
  },
  {
    id: 'on-this-day',
    week: 52,
    suppressedDuringModes: [],
    ongoing: true,
    eligible: (ctx) => ctx.yearsSinceFirstScan >= 1,
    copy: {
      headline: 'A year ago today.',
      body:
        'You scanned a year ago today. Here’s where your face was then, and where it is now.',
      cta: 'Open it',
    },
    cta: { route: '/(main)/compare' },
  },
];

export function getRevealDefinition(
  id: import('@/types/featureReveal').FeatureRevealId,
): RevealDefinition | undefined {
  return REVEAL_CALENDAR.find((r) => r.id === id);
}
