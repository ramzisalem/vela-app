/**
 * Dashboard 7-slot card-stack system (file 10).
 *
 * Each slot has a fixed PURPOSE. Cards declare their slot, eligibility, and
 * priority. The selector picks ONE card per slot. Empty slots render the
 * canonical "warm" empty state.
 *
 * Closed enum (CI guard):
 *   slot 1 — next-checkin-or-status        (priority over score for first 7 days)
 *   slot 2 — score / aging band / mode narrative
 *   slot 3 — daily streak (file 39, gated to 7+ scans)
 *   slot 4 — routine progress (today's check-offs)
 *   slot 5 — recent comparison (file 11, gated to 2+ scans)
 *   slot 6 — long-term trend (file 45, gated to month 3+)
 *   slot 7 — feature reveal / micro-payoff (file 38)
 */

import type { LifeStageModeId, ScanSession, UserProfile } from '@/types';

export type DashboardSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DashboardCardId =
  | 'card.nextCheckin'
  | 'card.weeklyReady'
  | 'card.scoreSummary'
  | 'card.agingBand'
  | 'card.modeNarrative'
  | 'card.streakChip'
  | 'card.hairTracking'
  | 'card.routineProgress'
  | 'card.recentComparison'
  | 'card.longTermTrend'
  | 'card.yoyInsight'
  | 'card.onThisDay'
  | 'card.anniversary'
  | 'card.wrappedReady'
  | 'card.featureReveal'
  | 'card.firstScanPill'
  | 'card.welcomeBack';

export interface DashboardContext {
  profile: UserProfile | undefined;
  scans: ReadonlyArray<ScanSession>;
  daysSinceLastScan: number;
  hasActiveLifeStageMode: boolean;
  primaryLifeStageMode?: LifeStageModeId;
  monthsSinceJoined: number;
  /** Today's completed routine tasks / total. */
  routineProgress: { completed: number; total: number };
  /** Long-term retention signals (file 45). */
  hasYoyInsight?: boolean;
  hasOnThisDayCard?: boolean;
  hasAnniversaryCard?: boolean;
  hasWrappedReady?: boolean;
  /** v1.5 hair tracking (file 35). */
  hairTrackingEnabled?: boolean;
}

export interface DashboardCardSpec {
  id: DashboardCardId;
  slot: DashboardSlot;
  /** Higher wins when multiple cards qualify for a slot. */
  priority: number;
  /** Returns true if this card should appear in this user's dashboard. */
  eligible(ctx: DashboardContext): boolean;
}

const REGISTRY: ReadonlyArray<DashboardCardSpec> = [
  // Slot 1
  {
    id: 'card.weeklyReady',
    slot: 1,
    priority: 100,
    eligible: (c) => c.daysSinceLastScan >= 7,
  },
  {
    id: 'card.nextCheckin',
    slot: 1,
    priority: 50,
    eligible: (c) => c.daysSinceLastScan < 7,
  },
  {
    id: 'card.firstScanPill',
    slot: 1,
    priority: 200,
    eligible: (c) => c.scans.length === 0,
  },

  // Slot 2
  {
    id: 'card.modeNarrative',
    slot: 2,
    priority: 200,
    eligible: (c) => c.hasActiveLifeStageMode,
  },
  {
    id: 'card.scoreSummary',
    slot: 2,
    priority: 100,
    eligible: (c) => c.scans.length >= 1,
  },
  {
    id: 'card.agingBand',
    slot: 2,
    priority: 50,
    eligible: (c) => c.scans.length >= 6 && !c.profile?.hideAgingBand,
  },

  // Slot 3
  {
    id: 'card.streakChip',
    slot: 3,
    priority: 100,
    eligible: (c) => c.scans.length >= 7 && !c.profile?.flags?.streaksHidden,
  },
  {
    id: 'card.hairTracking',
    slot: 3,
    priority: 50,
    eligible: (c) => c.hairTrackingEnabled === true && c.scans.length >= 1,
  },

  // Slot 4
  {
    id: 'card.routineProgress',
    slot: 4,
    priority: 100,
    eligible: (c) => c.routineProgress.total > 0,
  },

  // Slot 5
  {
    id: 'card.recentComparison',
    slot: 5,
    priority: 100,
    eligible: (c) => c.scans.length >= 2,
  },

  // Slot 6 — long-term retention slot. Higher-priority cards (anniversary,
  // YoY insight, on-this-day) override the generic long-term trend card
  // when they're eligible. Wrapped-ready beats them all in early month.
  {
    id: 'card.anniversary',
    slot: 6,
    priority: 250,
    eligible: (c) => c.hasAnniversaryCard === true,
  },
  {
    id: 'card.wrappedReady',
    slot: 6,
    priority: 200,
    eligible: (c) => c.hasWrappedReady === true,
  },
  {
    id: 'card.yoyInsight',
    slot: 6,
    priority: 175,
    eligible: (c) => c.hasYoyInsight === true,
  },
  {
    id: 'card.onThisDay',
    slot: 6,
    priority: 150,
    eligible: (c) => c.hasOnThisDayCard === true,
  },
  {
    id: 'card.longTermTrend',
    slot: 6,
    priority: 100,
    eligible: (c) => c.monthsSinceJoined >= 3 && c.scans.length >= 8,
  },

  // Slot 7
  {
    id: 'card.featureReveal',
    slot: 7,
    priority: 100,
    eligible: () => true,
  },
];

/**
 * Pick the highest-priority eligible card per slot. Returns slot → cardId.
 */
export function selectDashboardCards(
  ctx: DashboardContext,
): Partial<Record<DashboardSlot, DashboardCardId>> {
  const out: Partial<Record<DashboardSlot, DashboardCardId>> = {};
  const slots: DashboardSlot[] = [1, 2, 3, 4, 5, 6, 7];
  for (const slot of slots) {
    const candidates = REGISTRY.filter((c) => c.slot === slot && c.eligible(ctx));
    if (candidates.length === 0) continue;
    candidates.sort((a, b) => b.priority - a.priority);
    out[slot] = candidates[0]!.id;
  }
  return out;
}
