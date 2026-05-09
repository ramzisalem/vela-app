/**
 * Returning-user sign-in from onboarding welcome (file 07 + 08).
 * Apple / Google only — same paths as subscription-required.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Body, HeadlineSerif } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { useColors } from '@/theme/ThemeContext';
import { Layout, Spacing } from '@/theme/spacing';
import { useAppState } from '@/stores/appStateStore';
import { signInWithAppleNative, signInWithGoogleOAuth } from '@/services/auth/socialSignIn';
import { toast } from '@/components/feedback/toastService';

export default function SignInScreen() {
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
    <Screen variant="secondary">
      <View style={{ flex: 1, paddingTop: Spacing.sm }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={16}
          style={{
            width: Layout.tapTarget,
            height: Layout.tapTarget,
            marginBottom: Spacing.lg,
            justifyContent: 'center',
            marginLeft: -Spacing.xs,
          }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </Pressable>
        <HeadlineSerif style={{ marginBottom: Spacing.md }}>Welcome back</HeadlineSerif>
        <Body tone="secondary" style={{ marginBottom: Spacing.xl }}>
          Sign in with the same Apple or Google account you used for Vela. We’ll take you to the
          right place in the app.
        </Body>
        <SocialAuthButtons busy={busy} onApple={handleApple} onGoogle={handleGoogle} />
        {busy ? (
          <ActivityIndicator color={colors.text.accent} style={{ marginTop: Spacing.xl }} />
        ) : null}
      </View>
    </Screen>
  );
}
