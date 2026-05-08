/**
 * App-state store — the flow machine that drives app/index.tsx routing
 * (file 02 + file 20).
 */
import { create } from 'zustand';
import type { AppFlow, SessionUser, SubscriptionStatus } from '@/types';
import { fetchSubscriptionStatus } from '@/services/revenuecat/init';
import { inactiveSubscriptionFlow } from '@/services/revenuecat/subscriptionFlow';
import { useFeatureRevealStore } from '@/stores/featureRevealStore';
import { useProfileStore } from '@/stores/profileStore';
import Purchases from 'react-native-purchases';

interface AppStateStore {
  flow: AppFlow;
  isLoading: boolean;
  user: SessionUser | null;
  subscription: SubscriptionStatus | null;
  hasCompletedOnboarding: boolean;
  hasCompletedBaseline: boolean;

  // Mutations
  setFlow: (flow: AppFlow) => void;
  setLoading: (loading: boolean) => void;
  setUser: (user: SessionUser | null) => void;
  setSubscription: (sub: SubscriptionStatus | null) => void;
  completeOnboarding: () => void;
  completeBaseline: () => void;

  // Higher-level
  checkSubscription: () => Promise<void>;
  updateFlow: () => void;
  signOut: () => Promise<void>;
}

export const useAppState = create<AppStateStore>((set, get) => ({
  flow: 'loading',
  isLoading: true,
  user: null,
  subscription: null,
  hasCompletedOnboarding: false,
  hasCompletedBaseline: false,

  setFlow: (flow) => set({ flow }),
  setLoading: (isLoading) => set({ isLoading }),
  setUser: (user) => set({ user }),
  setSubscription: (subscription) => set({ subscription }),
  completeOnboarding: () => set({ hasCompletedOnboarding: true }),
  completeBaseline: () => set({ hasCompletedBaseline: true }),

  checkSubscription: async () => {
    try {
      const next = await fetchSubscriptionStatus();
      set({ subscription: next });
    } catch {
      if (!get().subscription) {
        set({ subscription: { isActive: false, isTrialing: false, willRenew: false } });
      }
    }
  },

  updateFlow: () => {
    const { user, subscription, hasCompletedOnboarding, hasCompletedBaseline } = get();

    if (!user) {
      set({ flow: 'onboarding' });
      return;
    }
    if (!hasCompletedOnboarding) {
      set({ flow: 'onboarding' });
      return;
    }
    if (!hasCompletedBaseline) {
      set({ flow: 'capture' });
      return;
    }
    if (!subscription?.isActive) {
      if (!subscription) {
        set({ flow: 'subscription_required' });
        return;
      }
      set({ flow: inactiveSubscriptionFlow(subscription) });
      return;
    }
    set({ flow: 'main' });
  },

  signOut: async () => {
    if (!get().user) {
      return;
    }
    useFeatureRevealStore.getState().resetForSignOut();
    useProfileStore.getState().clear();
    try {
      await Purchases.logOut();
    } catch {
      // RevenueCat may be unconfigured in dev or tests.
    }
    set({
      flow: 'onboarding',
      user: null,
      subscription: null,
      hasCompletedOnboarding: false,
      hasCompletedBaseline: false,
    });
  },
}));
