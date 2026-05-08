/**
 * Feature reveal evaluator tests (file 43).
 */
import { evaluateNextReveal } from './evaluator';
import type { EligibilityContext, FeatureReveal } from '@/types/featureReveal';

const ctx: EligibilityContext = {
  daysSinceSignup: 30,
  scansCount: 4,
  consecutiveRoutineDays: 7,
  hasHealthKitConnected: false,
  hasPairedAppleWatch: false,
  iosVersionMajor: 17,
  hasInstalledWidget: false,
  hasOpenedDiary: false,
  hasActiveTreatment: false,
  yearsSinceFirstScan: 0,
  diaryTags: [],
  activeLifeStageModes: [],
  onboardingHints: [],
};

describe('evaluateNextReveal', () => {
  it('returns null when globally disabled', () => {
    const r = evaluateNextReveal(ctx, [], {
      globallyEnabled: false,
      nowIso: new Date().toISOString(),
    });
    expect(r.card).toBeNull();
    expect(r.skipReason).toBe('globally-disabled');
  });

  it('respects the 7-day cooldown after a recent reveal', () => {
    const recentlyShown: FeatureReveal = {
      id: 'home-screen-widget',
      status: 'dismissed-once',
      shownAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastEvaluatedAt: new Date().toISOString(),
    };
    const r = evaluateNextReveal(ctx, [recentlyShown], {
      globallyEnabled: true,
      nowIso: new Date().toISOString(),
    });
    expect(r.card).toBeNull();
    expect(r.skipReason).toBe('cooldown-7d');
  });

  it('skips engaged reveals permanently', () => {
    const history: FeatureReveal[] = [
      {
        id: 'home-screen-widget',
        status: 'engaged',
        engagedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastEvaluatedAt: new Date().toISOString(),
      },
    ];
    const r = evaluateNextReveal(ctx, history, {
      globallyEnabled: true,
      nowIso: new Date().toISOString(),
    });
    expect(r.card?.id).not.toBe('home-screen-widget');
  });

  it('returns null when in-flight', () => {
    const inFlight: FeatureReveal = {
      id: 'home-screen-widget',
      status: 'shown',
      shownAt: new Date().toISOString(),
      lastEvaluatedAt: new Date().toISOString(),
    };
    const r = evaluateNextReveal(ctx, [inFlight], {
      globallyEnabled: true,
      nowIso: new Date().toISOString(),
    });
    expect(r.card).toBeNull();
    expect(r.skipReason).toBe('in-flight');
  });

  it('suppresses cards whose modes intersect active modes', () => {
    const r = evaluateNextReveal(
      { ...ctx, activeLifeStageModes: ['pregnancy'] },
      [],
      { globallyEnabled: true, nowIso: new Date().toISOString() },
    );
    if (r.card) {
      expect(r.card.suppressedDuringModes).not.toContain('pregnancy');
    }
  });
});
