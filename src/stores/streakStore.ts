/**
 * Streak state store (file 39).
 *
 * Persists locally; sync target is Supabase `streak_states` +
 * `streak_day_records` tables (added in a follow-up migration).
 */
import { create } from 'zustand';
import type {
  StreakDayRecord,
  StreakState,
  StreakSurfacePreferences,
} from '@/types/streak';
import { computeEndOfDay, maybeResetWeeklyBudget } from '@/core/streaks/streakEngine';
import type { LifeStageModeId } from '@/types/lifeStage';

const initialState: StreakState = {
  currentStreakDays: 0,
  longestStreakDays: 0,
  weeklyFreezesUsedThisWeek: 0,
  totalConsistentDays: 0,
  totalFreezesUsed: 0,
  recentlyEnded: false,
};

const initialPrefs: StreakSurfacePreferences = {
  visibility: 'standard',
  showOnDashboard: true,
  notificationsEnabled: false,
  notificationTime: '20:00',
  holidayFreezesEnabled: true,
};

interface Store {
  state: StreakState;
  records: StreakDayRecord[];
  prefs: StreakSurfacePreferences;
  closeDay: (input: {
    date: string;
    scheduledTaskCount: number;
    completedCount: number;
    skippedCount: number;
    activeModes: ReadonlyArray<LifeStageModeId>;
    diaryFreezeReason?: import('@/types/streak').FreezeReason;
    isHolidayFreeze?: boolean;
  }) => {
    milestoneReached: number | null;
    endedStreak: boolean;
    record: StreakDayRecord;
  };
  setVisibility: (visibility: StreakSurfacePreferences['visibility']) => void;
  setNotificationPrefs: (
    enabled: boolean,
    time?: string,
  ) => void;
  setHolidayFreezesEnabled: (enabled: boolean) => void;
  reset: () => void;
}

export const useStreakStore = create<Store>((set, get) => ({
  state: initialState,
  records: [],
  prefs: initialPrefs,
  closeDay: (input) => {
    const todayDate = new Date(input.date);
    const stateAfterReset = maybeResetWeeklyBudget(get().state, todayDate);
    const result = computeEndOfDay({
      state: stateAfterReset,
      date: input.date,
      scheduledTaskCount: input.scheduledTaskCount,
      completedCount: input.completedCount,
      skippedCount: input.skippedCount,
      diaryFreeze: input.diaryFreezeReason,
      isHolidayFreeze: input.isHolidayFreeze ?? false,
      activeModes: input.activeModes,
    });
    set((s) => ({
      state: result.nextState,
      records: replaceRecord(s.records, result.record),
    }));
    return {
      milestoneReached: result.milestoneReached,
      endedStreak: result.endedStreak,
      record: result.record,
    };
  },
  setVisibility: (visibility) =>
    set((s) => ({
      prefs: {
        ...s.prefs,
        visibility,
        showOnDashboard: visibility !== 'hidden' && visibility !== 'subtle',
      },
    })),
  setNotificationPrefs: (enabled, time) =>
    set((s) => ({
      prefs: {
        ...s.prefs,
        notificationsEnabled: enabled,
        notificationTime: time ?? s.prefs.notificationTime,
      },
    })),
  setHolidayFreezesEnabled: (enabled) =>
    set((s) => ({ prefs: { ...s.prefs, holidayFreezesEnabled: enabled } })),
  reset: () => set({ state: initialState, records: [], prefs: initialPrefs }),
}));

function replaceRecord(
  list: StreakDayRecord[],
  next: StreakDayRecord,
): StreakDayRecord[] {
  const idx = list.findIndex((r) => r.date === next.date);
  if (idx < 0) return [...list, next];
  const copy = [...list];
  copy[idx] = next;
  return copy;
}
