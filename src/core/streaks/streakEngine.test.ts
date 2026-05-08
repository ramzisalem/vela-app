/**
 * Streak engine tests (file 39).
 */
import { computeEndOfDay, maybeResetWeeklyBudget } from './streakEngine';
import type { StreakState } from '@/types/streak';

const baseState: StreakState = {
  currentStreakDays: 0,
  longestStreakDays: 0,
  weeklyFreezesUsedThisWeek: 0,
  totalConsistentDays: 0,
  totalFreezesUsed: 0,
  recentlyEnded: false,
};

describe('computeEndOfDay', () => {
  it('counts the day when ≥80% of tasks are completed', () => {
    const r = computeEndOfDay({
      state: baseState,
      date: '2026-05-01',
      scheduledTaskCount: 5,
      completedCount: 4,
      skippedCount: 0,
      isHolidayFreeze: false,
      activeModes: [],
    });
    expect(r.nextState.currentStreakDays).toBe(1);
    expect(r.record.consistent).toBe(true);
    expect(r.record.freezeApplied).toBe('none');
  });

  it('does NOT count an all-skipped day', () => {
    const r = computeEndOfDay({
      state: { ...baseState, currentStreakDays: 5 },
      date: '2026-05-01',
      scheduledTaskCount: 3,
      completedCount: 0,
      skippedCount: 3,
      isHolidayFreeze: false,
      activeModes: [],
    });
    // First skipped-day burns the weekly auto-freeze (still consistent).
    expect(r.record.freezeApplied).toBe('weekly-auto');
    expect(r.nextState.currentStreakDays).toBe(6);
  });

  it('uses diary-tag freeze first when scheduled', () => {
    const r = computeEndOfDay({
      state: { ...baseState, currentStreakDays: 3 },
      date: '2026-05-01',
      scheduledTaskCount: 4,
      completedCount: 0,
      skippedCount: 0,
      diaryFreeze: 'sick',
      isHolidayFreeze: false,
      activeModes: [],
    });
    expect(r.record.freezeApplied).toBe('diary-tag');
    expect(r.record.freezeReason).toBe('sick');
    // diary-tag does NOT consume weekly budget
    expect(r.nextState.weeklyFreezesUsedThisWeek).toBe(0);
  });

  it('falls back to weekly auto-freeze when diary tag is absent', () => {
    const r = computeEndOfDay({
      state: { ...baseState, currentStreakDays: 7 },
      date: '2026-05-01',
      scheduledTaskCount: 4,
      completedCount: 1,
      skippedCount: 0,
      isHolidayFreeze: false,
      activeModes: [],
    });
    expect(r.record.freezeApplied).toBe('weekly-auto');
    expect(r.nextState.weeklyFreezesUsedThisWeek).toBe(1);
  });

  it('ends the streak when no freeze is available', () => {
    const r = computeEndOfDay({
      state: {
        ...baseState,
        currentStreakDays: 14,
        longestStreakDays: 14,
        weeklyFreezesUsedThisWeek: 1,
      },
      date: '2026-05-01',
      scheduledTaskCount: 4,
      completedCount: 0,
      skippedCount: 0,
      isHolidayFreeze: false,
      activeModes: [],
    });
    expect(r.endedStreak).toBe(true);
    expect(r.nextState.currentStreakDays).toBe(0);
    expect(r.nextState.recentlyEnded).toBe(true);
  });

  it('uses mode-auto freeze for cancer_recovery before weekly-auto', () => {
    const r = computeEndOfDay({
      state: { ...baseState, currentStreakDays: 5 },
      date: '2026-05-01',
      scheduledTaskCount: 4,
      completedCount: 0,
      skippedCount: 0,
      isHolidayFreeze: false,
      activeModes: ['cancer_recovery'],
    });
    expect(r.record.freezeApplied).toBe('mode-auto');
    expect(r.record.freezeReason).toBe('cancer_recovery');
    expect(r.nextState.weeklyFreezesUsedThisWeek).toBe(0);
  });

  it('flags the 7-day milestone exactly once', () => {
    const r = computeEndOfDay({
      state: { ...baseState, currentStreakDays: 6 },
      date: '2026-05-01',
      scheduledTaskCount: 5,
      completedCount: 5,
      skippedCount: 0,
      isHolidayFreeze: false,
      activeModes: [],
    });
    expect(r.milestoneReached).toBe(7);
  });
});

describe('maybeResetWeeklyBudget', () => {
  it('resets on Monday', () => {
    const monday = new Date('2026-05-04T08:00:00Z');
    expect(monday.getDay()).toBe(1);
    const next = maybeResetWeeklyBudget(
      { ...baseState, weeklyFreezesUsedThisWeek: 1 },
      monday,
    );
    expect(next.weeklyFreezesUsedThisWeek).toBe(0);
  });

  it('leaves the budget alone other days', () => {
    const tuesday = new Date('2026-05-05T08:00:00Z');
    const next = maybeResetWeeklyBudget(
      { ...baseState, weeklyFreezesUsedThisWeek: 1 },
      tuesday,
    );
    expect(next.weeklyFreezesUsedThisWeek).toBe(1);
  });
});
