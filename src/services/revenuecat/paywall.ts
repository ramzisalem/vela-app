/**
 * Paywall presentation (file 08).
 *
 * Vela does NOT own paywall UI. We present RevenueCat's hosted paywall
 * (`RevenueCatUI.presentPaywall`) and react to the result. The Edge
 * Function `record-subscription` is the source of truth for entitlement.
 */
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
} from 'react-native-purchases';
import { VELA_ENTITLEMENT_ID } from './init';

export type PaywallOutcome = 'purchased' | 'restored' | 'cancelled' | 'error';

export interface PaywallResult {
  outcome: PaywallOutcome;
  customerInfo?: CustomerInfo;
  productId?: string;
}

export async function loadOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (e) {
    console.warn('[paywall] loadOfferings failed', e);
    return null;
  }
}

export function isEntitledFromInfo(info: CustomerInfo): {
  isActive: boolean;
  isTrialing: boolean;
  willRenew: boolean;
  productId?: string;
  expiresAt?: string;
} {
  const ent = info.entitlements.active[VELA_ENTITLEMENT_ID];
  if (!ent) return { isActive: false, isTrialing: false, willRenew: false };
  return {
    isActive: true,
    isTrialing: ent.periodType === 'trial' || ent.periodType === 'TRIAL',
    willRenew: ent.willRenew,
    productId: ent.productIdentifier,
    expiresAt: ent.expirationDate ?? undefined,
  };
}

export async function presentPaywall(): Promise<PaywallResult> {
  try {
    const result = await RevenueCatUI.presentPaywall();
    if (result === PAYWALL_RESULT.PURCHASED) {
      const info = await Purchases.getCustomerInfo();
      const ent = isEntitledFromInfo(info);
      return { outcome: 'purchased', customerInfo: info, productId: ent.productId };
    }
    if (result === PAYWALL_RESULT.RESTORED) {
      const info = await Purchases.getCustomerInfo();
      return { outcome: 'restored', customerInfo: info };
    }
    if (result === PAYWALL_RESULT.CANCELLED) return { outcome: 'cancelled' };
  } catch (e) {
    console.warn('[paywall] presentPaywall threw', e);
  }
  return { outcome: 'error' };
}

/**
 * Switch the user from monthly to yearly (file 47, cancel-save offer).
 *
 * Looks up the yearly package on the current offering and calls
 * `purchasePackage`. RevenueCat handles the StoreKit prorated upgrade.
 * Returns `purchased` on success, `cancelled` if the user backed out, or
 * `error` if the offering / package isn't configured.
 */
export async function switchToYearly(): Promise<PaywallResult> {
  try {
    const offering = await loadOfferings();
    if (!offering) return { outcome: 'error' };
    const yearly =
      offering.annual ??
      offering.availablePackages.find((p) =>
        ['$rc_annual', 'vela_pro_yearly'].includes(p.identifier),
      );
    if (!yearly) return { outcome: 'error' };
    try {
      const purchase = await Purchases.purchasePackage(yearly);
      const ent = isEntitledFromInfo(purchase.customerInfo);
      return {
        outcome: 'purchased',
        customerInfo: purchase.customerInfo,
        productId: ent.productId,
      };
    } catch (e) {
      const err = e as { userCancelled?: boolean; code?: string };
      if (err.userCancelled) return { outcome: 'cancelled' };
      console.warn('[paywall] switchToYearly purchase failed', e);
      return { outcome: 'error' };
    }
  } catch (e) {
    console.warn('[paywall] switchToYearly threw', e);
    return { outcome: 'error' };
  }
}
