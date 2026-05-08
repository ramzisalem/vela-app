/**
 * Daily-streak types (file 39).
 *
 * Vela's streak is "days of consistency", NOT a fire-emoji countdown. A day
 * counts when the user completes ≥80% of their scheduled tasks, AND at least
 * one task was completed (not all-skipped). Freezes are automatic and
 * generous — the user never has to claim them.
 *
 * Forbidden anywhere this surface is rendered (per file 21 voice rules):
 *   flames, the word "fire", red color, urgent loss-aversion phrasing,
 *   countdown timers, sad mascots, leaderboards, streak-as-paywall-pressure.
 */
import type { LifeStageModeId } from './lifeStage';

export type FreezeKind = 'none' | 'weekly-auto' | 'diary-tag' | 'holiday' | 'mode-auto';

/** Optional reason key — kept narrow so analytics never log free text. */
export type FreezeReason =
  | 'sick'
  | 'pregnant'
  | 'postpartum'
  | 'big-life-event'
  | 'travel'
  | 'holiday'
  | LifeStageModeId;

export interface StreakDayRecord {
  /** YYYY-MM-DD in the user's local timezone. */
  date: string;
  /** 0..100 — engaged (completed + skipped) / scheduled. */
  consistencyPct: number;
  /** Whether the day counts toward the streak. */
  consistent: boolean;
  freezeApplied: FreezeKind;
  freezeReason?: FreezeReason;
}

export interface StreakState {
  currentStreakDays: number;
  longestStreakDays: number;
  /** ISO date when longest ended; absent while current is the longest. */
  longestStreakEndedAt?: string;
  /** YYYY-MM-DD of the last day that counted. */
  lastConsistentDate?: string;
  /** Resets every Monday in user's local timezone. */
  weeklyFreezesUsedThisWeek: number;
  totalConsistentDays: number;
  totalFreezesUsed: number;
  /** ISO date when current streak started. */
  startedAt?: string;
  /** True for the 24h after a streak ends; lets the surface soften. */
  recentlyEnded: boolean;
}

export interface StreakSurfacePreferences {
  visibility: 'standard' | 'subtle' | 'hidden';
  showOnDashboard: boolean;
  notificationsEnabled: boolean;
  /** HH:MM in 24h, user's local timezone. */
  notificationTime: string;
  /** Holiday auto-freeze opt-in. */
  holidayFreezesEnabled: boolean;
}

export type StreakMilestone = 7 | 14 | 21 | 30 | 60 | 90 | 180 | 365;
export const STREAK_MILESTONES: ReadonlyArray<StreakMilestone> = [
  7, 14, 21, 30, 60, 90, 180, 365,
];
