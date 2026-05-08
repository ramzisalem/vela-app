/**
 * RevenueCat init (file 08 + file 31).
 *
 * Anonymous-first: we configure with no userId at app launch, so a user
 * can hit the paywall without being signed in. After successful sign-up
 * (post-paywall), call `Purchases.logIn(userId)` BEFORE inserting the
 * profile row — see file 08 SPEC_REVIEW_3.
 */
import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import type { SubscriptionStatus } from '@/types';

/** Single source of truth for RevenueCat dashboard entitlement id (file 08). */
export const VELA_ENTITLEMENT_ID = 'vela_premium';

let initialized = false;

export async function initRevenueCat(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  const apiKey = Platform.OS === 'ios' ? iosKey : androidKey;
  if (!apiKey) {
    console.warn('RevenueCat key missing for platform', Platform.OS);
    return;
  }

  // No appUserID — RC issues an anonymous identifier that we can later
  // alias via logIn().
  await Purchases.configure({ apiKey });
}

export async function identifyRevenueCatUser(userId: string): Promise<void> {
  await Purchases.logIn(userId);
}

/**
 * Returns the subscription status snapshot derived from the active
 * `vela_premium` entitlement. `isFamilyShare` is surfaced to the Family
 * Sharing service (file 45) once we recognize a member.
 */
export async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  if (!initialized) {
    return { isActive: false, isTrialing: false, willRenew: false };
  }
  try {
    const info = await Purchases.getCustomerInfo();
    return mapCustomerInfoToStatus(info);
  } catch {
    return { isActive: false, isTrialing: false, willRenew: false };
  }
}

export function mapCustomerInfoToStatus(info: CustomerInfo): SubscriptionStatus {
  const activeEnt = info.entitlements.active[VELA_ENTITLEMENT_ID];
  const ent = activeEnt ?? info.entitlements.all[VELA_ENTITLEMENT_ID];
  if (!ent) {
    return { isActive: false, isTrialing: false, willRenew: false };
  }
  const isActive = ent.isActive;
  const periodUpper = String(ent.periodType).toUpperCase();
  const isTrialing = isActive && (periodUpper === 'TRIAL' || periodUpper === 'INTRO');
  const status: SubscriptionStatus = {
    isActive,
    isTrialing,
    willRenew: isActive ? ent.willRenew : false,
    premiumPeriodType: String(ent.periodType),
  };
  if (ent.expirationDate) status.expirationDate = ent.expirationDate;
  if (ent.productIdentifier) status.productIdentifier = ent.productIdentifier;
  if (ent.originalPurchaseDate) status.originalPurchaseDate = ent.originalPurchaseDate;
  if ('isFamilyShare' in ent && typeof (ent as { isFamilyShare?: boolean }).isFamilyShare === 'boolean') {
    status.isFamilyShare = (ent as { isFamilyShare?: boolean }).isFamilyShare;
  }
  return status;
}

export function addCustomerInfoListener(handler: (info: CustomerInfo) => void): () => void {
  Purchases.addCustomerInfoUpdateListener(handler);
  return () => Purchases.removeCustomerInfoUpdateListener(handler);
}
