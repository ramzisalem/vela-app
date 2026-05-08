/**
 * Routine store (file 09).
 *
 * Daily check-offs are tracked via `completedDates` (YYYY-MM-DD strings).
 * Streak math comes from file 39 — the 80% rule is computed there, not here.
 */
import { create } from 'zustand';
import type { DailyRoutine } from '@/types';
import { todayISO } from '@/utils/dates';

interface RoutineStore {
  currentRoutine: DailyRoutine | null;

  setRoutine: (routine: DailyRoutine | null) => void;
  toggleTask: (taskId: string, dateISO?: string) => void;
  skipTask: (taskId: string, dateISO?: string) => void;
  getCompletedToday: () => number;
  /** Number / total. */
  getProgressToday: () => { completed: number; total: number };
}

export const useRoutineStore = create<RoutineStore>((set, get) => ({
  currentRoutine: null,

  setRoutine: (routine) => set({ currentRoutine: routine }),

  toggleTask: (taskId, dateISO = todayISO()) => {
    const routine = get().currentRoutine;
    if (!routine) return;
    const tasks = routine.tasks.map((task) => {
      if (task.taskId !== taskId) return task;
      const has = task.completedDates.includes(dateISO);
      const completedDates = has
        ? task.completedDates.filter((d) => d !== dateISO)
        : [...task.completedDates, dateISO];
      // Removing a skip when checked off.
      const skippedDates = task.skippedDates.filter((d) => d !== dateISO);
      return { ...task, completedDates, skippedDates };
    });
    set({ currentRoutine: { ...routine, tasks } });
  },

  skipTask: (taskId, dateISO = todayISO()) => {
    const routine = get().currentRoutine;
    if (!routine) return;
    const tasks = routine.tasks.map((task) => {
      if (task.taskId !== taskId) return task;
      const has = task.skippedDates.includes(dateISO);
      const skippedDates = has
        ? task.skippedDates.filter((d) => d !== dateISO)
        : [...task.skippedDates, dateISO];
      const completedDates = task.completedDates.filter((d) => d !== dateISO);
      return { ...task, skippedDates, completedDates };
    });
    set({ currentRoutine: { ...routine, tasks } });
  },

  getCompletedToday: () => {
    const today = todayISO();
    return (
      get().currentRoutine?.tasks.filter((t) => t.completedDates.includes(today)).length ?? 0
    );
  },

  getProgressToday: () => {
    const total = get().currentRoutine?.tasks.length ?? 0;
    return { completed: get().getCompletedToday(), total };
  },
}));
