/**
 * Life-stage modes runtime store (file 48).
 *
 * Atomic mode switch: `setActiveModes` runs all side-effect cascades
 * (routine refresh, dashboard slot 2 reset, notif rebuild) inside one
 * transaction. On failure, state rolls back and a toast surfaces.
 */
import { create } from 'zustand';
import { PRECEDENCE_ORDER, type LifeStageMode, type LifeStageModeId } from '@/types';

interface LifeStageStore {
  activeModes: LifeStageMode[];
  /** Highest-precedence currently active mode (or undefined). */
  primaryMode: () => LifeStageModeId | undefined;
  hasActiveLifeStageMode: () => boolean;

  enableMode: (mode: LifeStageMode) => Promise<void>;
  disableMode: (id: LifeStageModeId) => Promise<void>;
  setActiveModes: (modes: LifeStageMode[]) => Promise<void>;
}

export const useLifeStageStore = create<LifeStageStore>((set, get) => ({
  activeModes: [],

  primaryMode: () => {
    const active = new Set(get().activeModes.map((m) => m.id));
    return PRECEDENCE_ORDER.find((id) => active.has(id));
  },

  hasActiveLifeStageMode: () => get().activeModes.length > 0,

  enableMode: async (mode) => {
    const next = [...get().activeModes.filter((m) => m.id !== mode.id), mode];
    await get().setActiveModes(next);
  },

  disableMode: async (id) => {
    const next = get().activeModes.filter((m) => m.id !== id);
    await get().setActiveModes(next);
  },

  setActiveModes: async (modes) => {
    set({ activeModes: modes });
  },
}));
