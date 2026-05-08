/**
 * Feature reveal evaluator (file 43).
 *
 * Selects the next reveal candidate, or null. Hard rules:
 *   - Only one reveal card visible at a time.
 *   - Skip if any reveal was shown in the past 7 days.
 *   - Re-show dismiss-once cards after 14 days; never re-show dismiss-twice.
 *   - Suppress reveals whose `suppressedDuringModes` intersects with the
 *     user's active life-stage modes.
 */
import type {
  EligibilityContext,
  FeatureReveal,
  RevealDefinition,
} from '@/types/featureReveal';
import { REVEAL_CALENDAR } from './calendar';

export interface EvaluateResult {
  card: RevealDefinition | null;
  /** Reason for skipping (diagnostic only). */
  skipReason?:
    | 'in-flight'
    | 'no-eligible'
    | 'cooldown-7d'
    | 'globally-disabled';
}

export function evaluateNextReveal(
  ctx: EligibilityContext,
  history: ReadonlyArray<FeatureReveal>,
  options: { globallyEnabled: boolean; nowIso: string } = {
    globallyEnabled: true,
    nowIso: new Date().toISOString(),
  },
): EvaluateResult {
  if (!options.globallyEnabled) return { card: null, skipReason: 'globally-disabled' };

  const inFlight = history.find((h) => h.status === 'shown');
  if (inFlight) return { card: null, skipReason: 'in-flight' };

  const now = Date.parse(options.nowIso);
  const past7 = history.find((h) => {
    if (!h.shownAt) return false;
    return now - Date.parse(h.shownAt) < 7 * 24 * 60 * 60 * 1000;
  });
  if (past7) return { card: null, skipReason: 'cooldown-7d' };

  for (const candidate of REVEAL_CALENDAR) {
    const past = history.find((h) => h.id === candidate.id);
    if (past?.status === 'engaged') continue;
    if (past?.status === 'dismissed-twice') continue;
    if (past?.status === 'dismissed-once' && past.reShownAfter) {
      if (Date.parse(past.reShownAfter) > now) continue;
    }
    if (
      ctx.activeLifeStageModes.some((m) =>
        candidate.suppressedDuringModes.includes(m),
      )
    )
      continue;
    if (!candidate.eligible(ctx)) continue;
    return { card: candidate };
  }
  return { card: null, skipReason: 'no-eligible' };
}
