/**
 * User-treatment store (file 34).
 *
 * Local-first; syncs to `user_treatments` and `user_treatment_side_effects`
 * tables (v1.5 migration). Photos remain on-device (file 32).
 */
import { create } from 'zustand';
import { uuidv4 } from '@/utils/uuid';
import type {
  UserTreatment,
  UserTreatmentSideEffect,
  UserTreatmentStatus,
  TreatmentId,
} from '@/types/treatment';
import {
  fetchTreatmentsForUser,
  mergeTreatmentsByRecency,
  mergeSideEffects,
  syncUserTreatmentToSupabase,
  syncSideEffectToSupabase,
} from '@/services/treatment/treatmentSync';

interface TreatmentStore {
  treatments: UserTreatment[];
  sideEffects: UserTreatmentSideEffect[];
  bootstrap: (userId: string) => Promise<void>;
  startTreatment: (input: {
    userId: string;
    definitionId: TreatmentId;
    customName?: string;
    startDate: string;
    prescriberLabel?: string;
    notes?: string;
  }) => UserTreatment;
  setStatus: (id: string, status: UserTreatmentStatus) => void;
  setEndDate: (id: string, endDateIso: string) => void;
  logSideEffect: (input: {
    userTreatmentId: string;
    userId: string;
    sideEffectId: string;
    severity: 1 | 2 | 3 | 4 | 5;
    notes?: string;
  }) => UserTreatmentSideEffect;
  resolveSideEffect: (id: string, userId: string) => void;
  hydrate: (input: {
    treatments: UserTreatment[];
    sideEffects: UserTreatmentSideEffect[];
  }) => void;
  reset: () => void;
}

export const useTreatmentStore = create<TreatmentStore>((set, get) => ({
  treatments: [],
  sideEffects: [],

  bootstrap: async (userId) => {
    try {
      const { treatments, sideEffects } = await fetchTreatmentsForUser(userId);
      set((s) => ({
        treatments: mergeTreatmentsByRecency(s.treatments, treatments),
        sideEffects: mergeSideEffects(s.sideEffects, sideEffects),
      }));
    } catch (e) {
      console.warn('[treatment] bootstrap failed', e);
    }
  },

  startTreatment: (input) => {
    const now = new Date().toISOString();
    const treatment: UserTreatment = {
      id: uuidv4(),
      userId: input.userId,
      definitionId: input.definitionId,
      ...(input.customName ? { customName: input.customName } : {}),
      startDate: input.startDate,
      status: 'active',
      ...(input.prescriberLabel ? { prescriberLabel: input.prescriberLabel } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
      hasInformedConsent: true,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ treatments: [...s.treatments, treatment] }));
    void syncUserTreatmentToSupabase(treatment).catch((e) => {
      console.warn('[treatment] sync start failed', e);
    });
    return treatment;
  },

  setStatus: (id, status) => {
    set((s) => ({
      treatments: s.treatments.map((t) =>
        t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t,
      ),
    }));
    const t = get().treatments.find((x) => x.id === id);
    if (t) {
      void syncUserTreatmentToSupabase(t).catch((e) => console.warn('[treatment] sync status failed', e));
    }
  },

  setEndDate: (id, endDateIso) => {
    set((s) => ({
      treatments: s.treatments.map((t) =>
        t.id === id ? { ...t, endDate: endDateIso, updatedAt: new Date().toISOString() } : t,
      ),
    }));
    const t = get().treatments.find((x) => x.id === id);
    if (t) {
      void syncUserTreatmentToSupabase(t).catch((e) =>
        console.warn('[treatment] sync end date failed', e),
      );
    }
  },

  logSideEffect: (input) => {
    const now = new Date().toISOString();
    const entry: UserTreatmentSideEffect = {
      id: uuidv4(),
      userTreatmentId: input.userTreatmentId,
      sideEffectId: input.sideEffectId,
      loggedOn: now.slice(0, 10),
      severity: input.severity,
      ...(input.notes ? { notes: input.notes } : {}),
      resolved: false,
    };
    set((s) => ({ sideEffects: [...s.sideEffects, entry] }));
    void syncSideEffectToSupabase(entry, input.userId).catch((e) =>
      console.warn('[treatment] sync side effect failed', e),
    );
    return entry;
  },

  resolveSideEffect: (id, userId) => {
    const resolvedOn = new Date().toISOString().slice(0, 10);
    set((s) => ({
      sideEffects: s.sideEffects.map((e) =>
        e.id === id ? { ...e, resolved: true, resolvedOn } : e,
      ),
    }));
    const e = get().sideEffects.find((x) => x.id === id);
    if (e) {
      void syncSideEffectToSupabase(e, userId).catch((err) =>
        console.warn('[treatment] sync resolve failed', err),
      );
    }
  },

  hydrate: (input) =>
    set({ treatments: input.treatments, sideEffects: input.sideEffects }),

  reset: () => set({ treatments: [], sideEffects: [] }),
}));
