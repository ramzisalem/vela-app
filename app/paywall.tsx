/**
 * Paywall (file 08).
 *
 * Flow:
 *   1. Wait ~1.2s after baseline reveal so the gradient settles (file 05 + 08)
 *   2. Present RevenueCat-hosted paywall
 *   3. On purchase: user signs in with **Apple or Google** on this screen, then
 *      `completePostPaywallSignup` (auth → RC logIn → profile insert)
 *   4. On cancel: hard dead-end at /subscription-required
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, DisplaySerif } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Spacing } from '@/theme/spacing';
import { useAppState } from '@/stores/appStateStore';
import { useColors } from '@/theme/ThemeContext';
import {
  presentPaywall,
  isEntitledFromInfo,
  type PaywallResult,
} from '@/services/revenuecat/paywall';
import { completePostPaywallSignup } from '@/services/auth/postPaywallSignup';
import { toast } from '@/components/feedback/toastService';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';

export default function Paywall() {
  const router = useRouter();
  const colors = useColors();
  const setSubscription = useAppState((s) => s.setSubscription);
  const updateFlow = useAppState((s) => s.updateFlow);
  const presented = useRef(false);
  const [busy, setBusy] = useState(false);
  const [postPurchase, setPostPurchase] = useState<PaywallResult | null>(null);
  const [finishingAccount, setFinishingAccount] = useState(false);

  const finishWithMethod = useCallback(
    async (method: 'apple' | 'google') => {
      if (
        !postPurchase ||
        (postPurchase.outcome !== 'purchased' && postPurchase.outcome !== 'restored')
      ) {
        return;
      }
      setFinishingAccount(true);
      const ent = postPurchase.customerInfo ? isEntitledFromInfo(postPurchase.customerInfo) : null;
      const signup = await completePostPaywallSignup({ method });
      setFinishingAccount(false);
      if (!signup.ok) {
        if (signup.error) toast.error(signup.error);
        return;
      }
      setSubscription({
        isActive: ent?.isActive ?? true,
        isTrialing: ent?.isTrialing ?? false,
        willRenew: ent?.willRenew ?? false,
        productId: ent?.productId,
        expiresAt: ent?.expiresAt,
      });
      setPostPurchase(null);
      updateFlow();
      router.replace('/(main)/dashboard');
    },
    [postPurchase, setSubscription, updateFlow, router],
  );

  const onPaywallClosed = useCallback(
    (result: PaywallResult) => {
      if (result.outcome === 'purchased' || result.outcome === 'restored') {
        setPostPurchase(result);
        setBusy(false);
        return;
      }
      if (result.outcome === 'cancelled') {
        router.replace('/subscription-required');
        return;
      }
      toast.error('We could not load the subscription right now.');
      setBusy(false);
    },
    [router],
  );

  useEffect(() => {
    if (presented.current) return;
    presented.current = true;
    const timer = setTimeout(async () => {
      setBusy(true);
      const result = await presentPaywall();
      onPaywallClosed(result);
    }, 1200);
    return () => clearTimeout(timer);
  }, [onPaywallClosed]);

  const authBusy = finishingAccount;

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {postPurchase ? (
          <>
            <DisplaySerif style={{ marginBottom: Spacing.lg }}>Save your account</DisplaySerif>
            <Body tone="secondary" style={{ marginBottom: Spacing.xl }}>
              Sign in with Apple or Google so your subscription and scans stay linked to you.
            </Body>
            <SocialAuthButtons
              busy={authBusy}
              onApple={() => finishWithMethod('apple')}
              onGoogle={() => finishWithMethod('google')}
            />
            {authBusy ? (
              <ActivityIndicator color={colors.text.accent} style={{ marginTop: Spacing.xl }} />
            ) : null}
          </>
        ) : (
          <>
            <DisplaySerif style={{ marginBottom: Spacing.lg }}>Two steps closer.</DisplaySerif>
            <Body tone="secondary">
              Your baseline is saved. Subscribe to unlock weekly comparisons, your routine, and your
              long-term trends.
            </Body>
            {busy ? (
              <ActivityIndicator color={colors.text.accent} style={{ marginTop: Spacing.xl }} />
            ) : null}
          </>
        )}
      </View>
      {!postPurchase ? (
        <Button
          label="See plans"
          fullWidth
          onPress={async () => {
            setBusy(true);
            const result = await presentPaywall();
            onPaywallClosed(result);
          }}
        />
      ) : null}
    </Screen>
  );
}
