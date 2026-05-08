import type { SubscriptionStatus } from '@/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Post-expiration grace window for paid (non-trial) lapses — see file 46. */
const LAPSED_GRACE_DAYS = 30;

export type InactivePremiumFlow = 'subscription_required' | 'lapsed_grace' | 'lapsed_readonly';

/**
 * When premium is inactive, maps RC snapshot → entry `AppFlow` segment.
 * Trial/intro expiry and never-subscribed users stay on `subscription_required`.
 */
export function inactiveSubscriptionFlow(sub: SubscriptionStatus): InactivePremiumFlow {
  const expRaw = sub.expirationDate;
  if (!expRaw) {
    return 'subscription_required';
  }
  const expMs = Date.parse(expRaw);
  if (!Number.isFinite(expMs)) {
    return 'subscription_required';
  }
  const daysPastExpiration = (Date.now() - expMs) / MS_PER_DAY;
  if (daysPastExpiration <= 0) {
    return 'subscription_required';
  }
  const pt = String(sub.premiumPeriodType ?? '').toUpperCase();
  if (pt === 'TRIAL' || pt === 'INTRO') {
    return 'subscription_required';
  }
  if (daysPastExpiration <= LAPSED_GRACE_DAYS) {
    return 'lapsed_grace';
  }
  return 'lapsed_readonly';
}
