/**
 * App-state types (file 02 + file 20). The flow machine drives the entry-point
 * router in app/index.tsx.
 */

/**
 * Router flow for `app/index.tsx`.
 *
 * **`updateFlow`** sets: `loading` → `onboarding` | `capture` |
 * `subscription_required` | `lapsed_grace` | `lapsed_readonly` | `main`.
 * **`paywall`** is still set only from paywall / purchase flows, not from this
 * helper. The index router sends `lapsed_*` to the main stack so UI can branch
 * on `flow` until dedicated screens exist.
 */
export type AppFlow =
  | 'loading'
  | 'onboarding'
  | 'capture'
  | 'paywall'
  | 'main'
  | 'subscription_required'
  | 'lapsed_grace'
  | 'lapsed_readonly';

export type NotificationPreference = 'enabled' | 'disabled' | 'undetermined';

export interface SessionUser {
  id: string;
  email?: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  isTrialing: boolean;
  willRenew: boolean;
  productId?: string;
  expiresAt?: string;
  /** Anonymous RC alias (pre-signup). */
  rcAnonymousId?: string;
  /** Identified user id once `Purchases.logIn(userId)` runs. */
  rcUserId?: string;
  /** RevenueCat-reported expiration date (ISO 8601). */
  expirationDate?: string;
  /** Last RC `periodType` for `vela_premium` (active or expired snapshot). */
  premiumPeriodType?: string;
  /** RevenueCat product identifier (e.g. `vela_pro_yearly`). */
  productIdentifier?: string;
  /** Original purchase date for grace-period math (file 46). */
  originalPurchaseDate?: string;
  /** True when the active entitlement is a Family Sharing member (file 45). */
  isFamilyShare?: boolean;
}
