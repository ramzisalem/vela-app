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
import { useScanStore } from '@/stores/scanStore';
import { useAppState } from '@/stores/appStateStore';
import { persistScanSession } from '@/db/persistence';
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

  // 3. Compose + insert profile (deferred Q17–27 sync later; file 07).
  const profile = useOnboardingStore.getState().composeProfile(userId, email, {
    omitDeferredAnswers: true,
  });
  try {
    await upsertProfile(profile);
  } catch (e) {
    return { ok: false, error: 'Profile insert failed: ' + (e as Error).message };
  }

  useProfileStore.getState().setProfile(profile);
  useOnboardingStore.getState().setQuestionPhase('deferred');
  useOnboardingStore.getState().setIndex(0);
  useOnboardingStore.getState().bindPersistedOnboardingToUser(userId);
  useAppState.getState().setUser({ id: userId, email });
  useAppState.getState().completeOnboarding();

  // 3.5. Reconcile any baseline scans created pre-signup. Those carry the
  // draftUserId stamped at capture time (see `capture.tsx#finishSession`);
  // rewrite them to the real Supabase user id before the flush so the remote
  // row ends up under the right account.
  const draftUserId = useOnboardingStore.getState().draftUserId;
  if (draftUserId && draftUserId !== userId) {
    const scanState = useScanStore.getState();
    const rewritten = scanState.sessions.map((s) =>
      s.userId === draftUserId ? { ...s, userId } : s,
    );
    const touched = rewritten.filter((s, i) => s !== scanState.sessions[i]);
    if (touched.length > 0) {
      scanState.setSessions(rewritten);
      // Re-persist locally so cold-start hydration by userId returns these rows.
      await Promise.all(touched.map((s) => persistScanSession(s).catch(() => undefined)));
    }
    useOnboardingStore.getState().clearDraftUserId();
  }

  // 4. Now flush any pending scans.
  await SyncOrchestrator.flushPending();

  return { ok: true };
}
