/**
 * Post-paywall signup orchestrator (file 08 SPEC_REVIEW_3 race fix).
 *
 * REQUIRED ORDER:
 *   1. Sign up via Supabase Auth
 *   2. Purchases.logIn(userId)
 *   3. Profile row INSERT (with the in-memory onboarding answers)
 *   4. Then — and only then — saveScanResult is allowed to run
 *
 * If any step fails partway, we DO NOT mark the profile complete; the user
 * sees a small "We're finishing setup" toast and the app retries on next
 * foreground.
 */
import { supabase } from '@/services/supabase';
import { upsertProfile } from '@/services/supabase/profileService';
import { signInWithAppleNative, signInWithGoogleOAuth } from '@/services/auth/socialSignIn';
import { identifyRevenueCatUser } from '@/services/revenuecat/init';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useProfileStore } from '@/stores/profileStore';
import { useAppState } from '@/stores/appStateStore';
import { SyncOrchestrator } from '@/services/sync/SyncOrchestrator';

export type SignupMethod = 'apple' | 'google' | 'email';

export interface SignupArgs {
  method: SignupMethod;
  email?: string;
  password?: string;
}

export interface SignupResult {
  ok: boolean;
  error?: string;
}

export async function completePostPaywallSignup(args: SignupArgs): Promise<SignupResult> {
  let userId: string | undefined;
  let email: string | undefined;

  // 1. Auth.
  if (args.method === 'apple') {
    const auth = await signInWithAppleNative();
    if (!auth.ok) {
      if (auth.cancelled) return { ok: false };
      return { ok: false, error: auth.error ?? 'Sign-in failed.' };
    }
    userId = auth.user.id;
    email = auth.email;
  } else if (args.method === 'google') {
    const auth = await signInWithGoogleOAuth();
    if (!auth.ok) {
      if (auth.cancelled) return { ok: false };
      return { ok: false, error: auth.error ?? 'Sign-in failed.' };
    }
    userId = auth.user.id;
    email = auth.email;
  } else {
    if (!args.email || !args.password) {
      return { ok: false, error: 'Email and password are required.' };
    }
    const { data, error } = await supabase.auth.signUp({
      email: args.email,
      password: args.password,
    });
    if (error || !data.user) {
      return { ok: false, error: error?.message ?? 'Sign-up failed.' };
    }
    userId = data.user.id;
    email = data.user.email ?? args.email;
  }

  if (!userId) return { ok: false, error: 'No user id resolved.' };

  // 2. Identify in RevenueCat BEFORE any database write — file 08.
  try {
    await identifyRevenueCatUser(userId);
  } catch (e) {
    return { ok: false, error: 'Subscription identity failed: ' + (e as Error).message };
  }

  // 3. Compose + insert profile.
  const profile = useOnboardingStore.getState().composeProfile(userId, email);
  try {
    await upsertProfile(profile);
  } catch (e) {
    return { ok: false, error: 'Profile insert failed: ' + (e as Error).message };
  }

  useProfileStore.getState().setProfile(profile);
  useAppState.getState().setUser({ id: userId, email });
  useAppState.getState().completeOnboarding();

  // 4. Now flush any pending scans.
  await SyncOrchestrator.flushPending();

  return { ok: true };
}
