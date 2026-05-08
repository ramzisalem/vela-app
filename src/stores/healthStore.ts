/**
 * Health correlation store (file 33).
 *
 * Holds the local cache of HealthKit-derived correlations. The raw daily
 * snapshots are NEVER persisted server-side; only the rounded `Correlation`
 * entries (Pearson r + p-value + insight copy) sync.
 */
import { create } from 'zustand';
import type {
  Correlation,
  HealthPermissionState,
  HealthSnapshot,
} from '@/types/health';

interface HealthStore {
  permission: HealthPermissionState;
  snapshots: HealthSnapshot[];
  correlations: Correlation[];
  setPermission: (state: HealthPermissionState) => void;
  setSnapshots: (snapshots: HealthSnapshot[]) => void;
  setCorrelations: (correlations: Correlation[]) => void;
  markCorrelationShown: (id: string) => void;
  reset: () => void;
}

const initialPermission: HealthPermissionState = {
  granted: false,
  readTypes: [],
  updatedAt: new Date(0).toISOString(),
};

export const useHealthStore = create<HealthStore>((set) => ({
  permission: initialPermission,
  snapshots: [],
  correlations: [],
  setPermission: (state) => set({ permission: state }),
  setSnapshots: (snapshots) => set({ snapshots }),
  setCorrelations: (correlations) => set({ correlations }),
  markCorrelationShown: (id) =>
    set((s) => ({
      correlations: s.correlations.map((c) =>
        c.id === id ? { ...c, shownToUserAt: new Date().toISOString() } : c,
      ),
    })),
  reset: () =>
    set({ permission: initialPermission, snapshots: [], correlations: [] }),
}));
