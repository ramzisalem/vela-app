/**
 * Reactivation lifecycle (file 46).
 *
 * Phases:
 *   - active            → standard
 *   - trial             → standard, gated by trial end
 *   - grace (0-30d post-cancel) → full access continues; passive banner
 *   - lapsed-readonly (30+d post-cancel) → look-back mode; capture replaced
 *     by paywall, diary by soft "Resume to continue" card
 *
 * On resume from any phase: skip re-onboarding, all data restored, optional
 * welcome-back card on dashboard for 7 days.
 */
import type { SubscriptionLifecyclePhase } from '@/types/cancelSave';

export interface LifecycleSnapshot {
  phase: SubscriptionLifecyclePhase;
  /** Cancellation timestamp; undefined when never cancelled. */
  cancelledAt?: string;
  /** Date the user's paid period ends (Apple still delivers until then). */
  expiresAt?: string;
  /** Days remaining in grace window (0..30). undefined outside grace. */
  graceDaysRemaining?: number;
  /** Email digest opt-in for monthly lapsed digest. */
  emailDigestOptIn: boolean;
}

export function deriveLifecyclePhase(args: {
  isActive: boolean;
  isTrialing: boolean;
  willRenew: boolean;
  cancelledAt?: string;
  expiresAt?: string;
  now?: Date;
}): LifecycleSnapshot {
  const now = args.now ?? new Date();
  if (args.isTrialing) {
    return { phase: 'trial', expiresAt: args.expiresAt, emailDigestOptIn: false };
  }
  if (args.isActive && args.willRenew) {
    return { phase: 'active', expiresAt: args.expiresAt, emailDigestOptIn: false };
  }
  if (!args.cancelledAt) {
    return { phase: 'never-subscribed', emailDigestOptIn: false };
  }
  // Cancelled. Compute days since cancel.
  const cancelled = Date.parse(args.cancelledAt);
  const expires = args.expiresAt ? Date.parse(args.expiresAt) : cancelled;
  const graceStart = expires; // Apple delivers until expiresAt
  const elapsedSinceGrace = Math.max(0, now.getTime() - graceStart);
  const elapsedDays = Math.floor(elapsedSinceGrace / (24 * 60 * 60 * 1000));
  if (now.getTime() < graceStart) {
    return {
      phase: 'active',
      cancelledAt: args.cancelledAt,
      expiresAt: args.expiresAt,
      emailDigestOptIn: false,
    };
  }
  if (elapsedDays < 30) {
    return {
      phase: 'grace',
      cancelledAt: args.cancelledAt,
      expiresAt: args.expiresAt,
      graceDaysRemaining: 30 - elapsedDays,
      emailDigestOptIn: false,
    };
  }
  return {
    phase: 'lapsed-readonly',
    cancelledAt: args.cancelledAt,
    expiresAt: args.expiresAt,
    emailDigestOptIn: false,
  };
}

/** Look-back mode write-gate: returns true if the action is allowed. */
export function canWriteInPhase(
  phase: SubscriptionLifecyclePhase,
  action:
    | 'capture'
    | 'diary-entry'
    | 'routine-task'
    | 'experiment'
    | 'wrapped-generate',
): boolean {
  if (phase === 'active' || phase === 'trial') return true;
  if (phase === 'grace') return action !== 'experiment';
  return false;
}
