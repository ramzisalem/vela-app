/**
 * Subscription required (file 08).
 *
 * Hard dead-end after the user dismisses the paywall — there's no back gesture
 * and no skip. Paths out: subscribe, or sign in (Apple / Google) if they already
 * have an account, then re-check subscription + flow.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Headline } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Spacing } from '@/theme/spacing';
import { useColors } from '@/theme/ThemeContext';
import { useAppState } from '@/stores/appStateStore';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { signInWithAppleNative, signInWithGoogleOAuth } from '@/services/auth/socialSignIn';
import { toast } from '@/components/feedback/toastService';

export default function SubscriptionRequired() {
  const router = useRouter();
  const colors = useColors();
  const setUser = useAppState((s) => s.setUser);
  const checkSubscription = useAppState((s) => s.checkSubscription);
  const updateFlow = useAppState((s) => s.updateFlow);
  const [busy, setBusy] = useState(false);

  const afterSocialSignIn = useCallback(async () => {
    await checkSubscription();
    updateFlow();
    router.replace('/');
  }, [checkSubscription, updateFlow, router]);

  const handleApple = useCallback(async () => {
    setBusy(true);
    const r = await signInWithAppleNative();
    setBusy(false);
    if (!r.ok) {
      if (!r.cancelled && r.error) toast.error(r.error);
      return;
    }
    setUser({ id: r.user.id, email: r.email });
    await afterSocialSignIn();
  }, [afterSocialSignIn, setUser]);

  const handleGoogle = useCallback(async () => {
    setBusy(true);
    const r = await signInWithGoogleOAuth();
    setBusy(false);
    if (!r.ok) {
      if (!r.cancelled && r.error) toast.error(r.error);
      return;
    }
    setUser({ id: r.user.id, email: r.email });
    await afterSocialSignIn();
  }, [afterSocialSignIn, setUser]);

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Headline style={{ marginBottom: Spacing.lg }}>Vela is a subscription.</Headline>
        <Body tone="secondary" style={{ marginBottom: Spacing.xl }}>
          Your scan is saved. Subscribe whenever you’re ready to see your routine and your weekly
          comparisons.
        </Body>
        <Body tone="secondary" style={{ marginBottom: Spacing.md }}>
          Already have an account? Sign in — we’ll check your subscription and take you to the right
          place.
        </Body>
        <SocialAuthButtons busy={busy} onApple={handleApple} onGoogle={handleGoogle} />
        {busy ? (
          <ActivityIndicator color={colors.text.accent} style={{ marginTop: Spacing.xl }} />
        ) : null}
      </View>
      <Button label="View plan" fullWidth onPress={() => router.replace('/paywall')} />
    </Screen>
  );
}
