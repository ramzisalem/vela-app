/**
 * Streak engine (file 39).
 *
 * Pure functions only — the store is the single source of truth for state.
 * `computeEndOfDay` is what runs at local midnight (or first foreground after);
 * it returns the next StreakState + the day record.
 */
import type {
  FreezeKind,
  FreezeReason,
  StreakDayRecord,
  StreakState,
} from '@/types/streak';
import type { LifeStageModeId } from '@/types/lifeStage';

const MIN_CONSISTENCY_PCT = 80;

export interface ComputeEndOfDayInput {
  state: StreakState;
  date: string;
  scheduledTaskCount: number;
  completedCount: number;
  skippedCount: number;
  diaryFreeze?: FreezeReason;
  isHolidayFreeze: boolean;
  /** Active life-stage modes that auto-relax the streak rules. */
  activeModes: ReadonlyArray<LifeStageModeId>;
}

export interface EndOfDayResult {
  nextState: StreakState;
  record: StreakDayRecord;
  /** True if the day's record ended a previous streak (>= 1 day prior). */
  endedStreak: boolean;
  /** Milestone (7|14|21|30|60|90|180|365) reached today, if any. */
  milestoneReached: number | null;
}

const MILESTONES = [7, 14, 21, 30, 60, 90, 180, 365] as const;

/**
 * Build today's record + an updated streak state.
 *
 * Rules (per file 39):
 *  - day counts when (completed/scheduled) >= 80% AND completed > 0.
 *  - all-skipped days count toward "engagement floor" but never the streak;
 *    they fall through to freeze logic.
 *  - diary-tag freezes do NOT consume the weekly auto-freeze budget.
 *  - mode-auto freezes apply when an active mode (pregnancy / postpartum /
 *    cancer-recovery) has streak auto-pause enabled.
 */
export function computeEndOfDay(input: ComputeEndOfDayInput): EndOfDayResult {
  const {
    state,
    date,
    scheduledTaskCount,
    completedCount,
    skippedCount,
    diaryFreeze,
    isHolidayFreeze,
    activeModes,
  } = input;

  if (scheduledTaskCount === 0) {
    return {
      nextState: state,
      record: {
        date,
        consistencyPct: 0,
        consistent: true,
        freezeApplied: 'none',
      },
      endedStreak: false,
      milestoneReached: null,
    };
  }

  const engaged = completedCount + skippedCount;
  const consistencyPct = Math.round((engaged / scheduledTaskCount) * 100);
  const allSkipped = skippedCount === scheduledTaskCount;
  const sufficient = !allSkipped && completedCount > 0 && consistencyPct >= MIN_CONSISTENCY_PCT;

  if (sufficient) {
    return advance(state, {
      date,
      consistencyPct,
      consistent: true,
      freezeApplied: 'none',
    });
  }

  // Freeze application order: diary tag → holiday → mode-auto → weekly-auto.
  if (diaryFreeze) {
    return advance(state, {
      date,
      consistencyPct,
      consistent: true,
      freezeApplied: 'diary-tag',
      freezeReason: diaryFreeze,
    });
  }
  if (isHolidayFreeze) {
    return advance(state, {
      date,
      consistencyPct,
      consistent: true,
      freezeApplied: 'holiday',
      freezeReason: 'holiday',
    });
  }
  const modeFreeze = pickModeAutoFreeze(activeModes);
  if (modeFreeze) {
    return advance(state, {
      date,
      consistencyPct,
      consistent: true,
      freezeApplied: 'mode-auto',
      freezeReason: modeFreeze,
    });
  }
  if (state.weeklyFreezesUsedThisWeek === 0) {
    return advance({ ...state, weeklyFreezesUsedThisWeek: 1 }, {
      date,
      consistencyPct,
      consistent: true,
      freezeApplied: 'weekly-auto',
    });
  }

  // No freeze available — streak ends.
  const ended = state.currentStreakDays > 0;
  const longestEndedAt =
    ended && state.currentStreakDays >= state.longestStreakDays
      ? new Date().toISOString()
      : state.longestStreakEndedAt;
  return {
    nextState: {
      ...state,
      currentStreakDays: 0,
      lastConsistentDate: state.lastConsistentDate,
      recentlyEnded: ended,
      longestStreakEndedAt: longestEndedAt,
      startedAt: undefined,
    },
    record: {
      date,
      consistencyPct,
      consistent: false,
      freezeApplied: 'none',
    },
    endedStreak: ended,
    milestoneReached: null,
  };
}

function pickModeAutoFreeze(
  activeModes: ReadonlyArray<LifeStageModeId>,
): FreezeReason | undefined {
  if (activeModes.includes('cancer_recovery')) return 'cancer_recovery';
  if (activeModes.includes('pregnancy')) return 'pregnant';
  if (activeModes.includes('postpartum')) return 'postpartum';
  return undefined;
}

function advance(
  state: StreakState,
  record: StreakDayRecord,
): EndOfDayResult {
  const next = state.currentStreakDays + 1;
  const longest = Math.max(state.longestStreakDays, next);
  const milestone = (MILESTONES as ReadonlyArray<number>).includes(next) ? next : null;
  return {
    nextState: {
      ...state,
      currentStreakDays: next,
      longestStreakDays: longest,
      lastConsistentDate: record.date,
      totalConsistentDays: state.totalConsistentDays + 1,
      totalFreezesUsed:
        record.freezeApplied !== 'none'
          ? state.totalFreezesUsed + 1
          : state.totalFreezesUsed,
      startedAt: state.currentStreakDays === 0 ? record.date : state.startedAt,
      recentlyEnded: false,
    },
    record,
    endedStreak: false,
    milestoneReached: milestone,
  };
}

/** Reset the weekly freeze budget every Monday in user's local timezone. */
export function maybeResetWeeklyBudget(state: StreakState, today: Date): StreakState {
  if (today.getDay() !== 1) return state; // not Monday
  return { ...state, weeklyFreezesUsedThisWeek: 0 };
}
