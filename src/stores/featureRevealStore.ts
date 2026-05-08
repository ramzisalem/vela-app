/**
 * Feature reveal store (file 43).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  EligibilityContext,
  FeatureReveal,
  FeatureRevealId,
  RevealDefinition,
} from '@/types/featureReveal';
import { evaluateNextReveal } from '@/core/featureReveals/evaluator';

interface Store {
  history: FeatureReveal[];
  /** Settings → "What's new in Vela" → reveal cards on dashboard toggle. */
  globallyEnabled: boolean;
  setGloballyEnabled: (enabled: boolean) => void;
  evaluate: (ctx: EligibilityContext) => RevealDefinition | null;
  recordShown: (id: FeatureRevealId) => void;
  recordEngaged: (id: FeatureRevealId) => void;
  recordDismissed: (id: FeatureRevealId) => void;
  resetRevealForTesting: (id: FeatureRevealId) => void;
  /** Clear persisted reveals when the signed-in user changes (see appStateStore.signOut). */
  resetForSignOut: () => void;
}

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

export const useFeatureRevealStore = create<Store>()(
  persist(
    (set, get) => ({
      history: [],
      globallyEnabled: true,
      setGloballyEnabled: (enabled) => set({ globallyEnabled: enabled }),
      evaluate: (ctx) => {
        const result = evaluateNextReveal(ctx, get().history, {
          globallyEnabled: get().globallyEnabled,
          nowIso: new Date().toISOString(),
        });
        return result.card;
      },
      recordShown: (id) =>
        set((s) => ({
          history: upsert(s.history, id, (prev) => ({
            ...(prev ?? {
              id,
              status: 'shown',
              lastEvaluatedAt: new Date().toISOString(),
            }),
            status: 'shown',
            shownAt: new Date().toISOString(),
          })),
        })),
      recordEngaged: (id) =>
        set((s) => ({
          history: upsert(s.history, id, (prev) => ({
            ...(prev ?? {
              id,
              status: 'engaged',
              lastEvaluatedAt: new Date().toISOString(),
            }),
            status: 'engaged',
            engagedAt: new Date().toISOString(),
          })),
        })),
      recordDismissed: (id) =>
        set((s) => {
          const prev = s.history.find((h) => h.id === id);
          const nextStatus =
            prev?.status === 'dismissed-once' ? 'dismissed-twice' : 'dismissed-once';
          const reShownAfter =
            nextStatus === 'dismissed-once'
              ? new Date(Date.now() + FOURTEEN_DAYS).toISOString()
              : undefined;
          return {
            history: upsert(s.history, id, (p) => ({
              ...(p ?? { id, status: nextStatus, lastEvaluatedAt: new Date().toISOString() }),
              status: nextStatus,
              dismissedAt: new Date().toISOString(),
              reShownAfter,
            })),
          };
        }),
      resetRevealForTesting: (id) =>
        set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
      resetForSignOut: () => set({ history: [], globallyEnabled: true }),
    }),
    {
      name: 'vela-feature-reveals',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ history: s.history, globallyEnabled: s.globallyEnabled }),
    },
  ),
);

function upsert(
  list: FeatureReveal[],
  id: FeatureRevealId,
  fn: (prev: FeatureReveal | undefined) => FeatureReveal,
): FeatureReveal[] {
  const idx = list.findIndex((h) => h.id === id);
  if (idx < 0) return [...list, fn(undefined)];
  const copy = [...list];
  copy[idx] = fn(list[idx]);
  return copy;
}
