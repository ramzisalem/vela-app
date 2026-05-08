/**
 * Service initialization (file 01).
 *
 * Order:
 *   1. RevenueCat (anonymous-first per file 08)
 *   2. Supabase session check (file 03)
 *   3. PostHog product analytics (file 25)
 *
 * NOT initialized here:
 *   - Singular (file 31 — must wait for ATT post-baseline).
 *   - WatermelonDB (file 02 — lazily constructed on first read/write).
 *   - Sentry (introduced post-launch; placeholder is preserved).
 */
import { AppState as RNAppState, type AppStateStatus } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { useAppState } from '@/stores/appStateStore';
import { initRevenueCat } from '@/services/revenuecat/init';
import { supabase, startSupabaseSessionRefresh } from '@/services/supabase';
import { Analytics } from '@/services/analytics';
import { useScanStore } from '@/stores/scanStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { useHairStore } from '@/stores/hairStore';
import { useTreatmentStore } from '@/stores/treatmentStore';
import { useProfileStore } from '@/stores/profileStore';

let foregroundListener: { remove: () => void } | null = null;
let authListenerStarted = false;

function startPendingSyncRetryLoop() {
  if (foregroundListener) return;
  foregroundListener = RNAppState.addEventListener('change', (status: AppStateStatus) => {
    if (status === 'active') {
      void useScanStore.getState().retryPendingSync().catch(() => {});
    }
  });
}

/** Cold-start / post-login: hydrate local-first stores and reconcile flow + analytics. */
export async function hydrateStoresForUserSession(session: Session): Promise<void> {
  const userId = session.user.id;
  const appState = useAppState.getState();
  appState.setUser({ id: userId, email: session.user.email });
  appState.completeOnboarding();

  try {
    await Promise.all([
      useScanStore.getState().loadSessions(userId),
      useDiaryStore.getState().loadFromLocal(userId),
      useHairStore.getState().bootstrap(userId),
      useTreatmentStore.getState().bootstrap(userId),
      useProfileStore.getState().loadProfile(userId),
    ]);
  } catch (e) {
    console.warn('[session] local-first hydrate failed', e);
  }

  const sessions = useScanStore.getState().sessions;
  if (sessions.some((s) => s.isBaseline)) {
    appState.completeBaseline();
  }

  await appState.checkSubscription();

  void useScanStore.getState().retryPendingSync().catch(() => {});
  startPendingSyncRetryLoop();
  appState.updateFlow();
  try {
    Analytics.identify(userId);
  } catch {
    /* optional */
  }
}

function startAuthStateListener() {
  if (authListenerStarted) return;
  authListenerStarted = true;

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') {
      return;
    }

    const appState = useAppState.getState();

    if (event === 'SIGNED_OUT') {
      void appState.signOut();
      return;
    }

    if (!session?.user) {
      return;
    }

    if (event === 'TOKEN_REFRESHED') {
      appState.setUser({ id: session.user.id, email: session.user.email });
      return;
    }

    if (event === 'USER_UPDATED') {
      appState.setUser({ id: session.user.id, email: session.user.email });
      void useProfileStore.getState().loadProfile(session.user.id).catch(() => {});
      appState.updateFlow();
      return;
    }

    if (event === 'SIGNED_IN') {
      void hydrateStoresForUserSession(session);
    }
  });
}

export async function initializeServices() {
  const appState = useAppState.getState();

  try {
    try {
      await initRevenueCat();
    } catch (e) {
      console.warn('[init] RevenueCat init failed', e);
    }

    try {
      startSupabaseSessionRefresh();
      startAuthStateListener();
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await hydrateStoresForUserSession(data.session);
      }
    } catch (e) {
      console.warn('[init] Supabase session fetch failed', e);
    }

    try {
      await Analytics.initialize();
      const user = appState.user;
      if (user?.id) Analytics.identify(user.id);
    } catch (e) {
      console.warn('[init] Analytics init failed', e);
    }

    appState.updateFlow();
  } catch {
    appState.setFlow('onboarding');
  } finally {
    appState.setLoading(false);
  }
}
