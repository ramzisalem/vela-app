/**
 * Long-term retention types (file 45).
 *
 * YoY emergence, "On this day", compound-effort visualizations, anniversary
 * cards, Family Sharing — every long-term feature gives the user MORE from
 * what they have already done.
 */
import type { FaceMetric } from './aging';

export interface YoYDataPoint {
  date: string;
  thisYear: number | null;
  lastYear: number | null;
}

export interface YoYInsight {
  metric: FaceMetric;
  /** ≤32 words, AI-generated. */
  insight: string;
  /** Whether to surface the chip. */
  shouldShow: boolean;
  generatedAt: string;
}

export interface OnThisDayCard {
  /** YYYY-MM-DD; the date being remembered (today minus N years). */
  remembrance: string;
  yearsAgo: number;
  /** Optional copy from AI. */
  note?: string;
  /** Reference to a scan from that day. */
  scanId?: string;
}

export interface CompoundEffortStats {
  totalScans: number;
  totalRoutineCompletions: number;
  totalConsistentDays: number;
  /** Approximate hours invested (rough proxy: 30s per task average + scan time). */
  totalHoursInvested: number;
  weeksTracked: number;
  /** First scan date. */
  startedAt: string;
}

export type AnniversaryCardKind = 'one-year' | 'two-year' | 'three-year' | 'five-year';

export interface AnniversaryCard {
  kind: AnniversaryCardKind;
  hitOn: string;
  stats: CompoundEffortStats;
  /** AI-generated tribute line. */
  tribute: string;
}

export interface FamilySharingMember {
  userId: string;
  inviteAcceptedAt: string;
  shareDataWithOrganizer: boolean;
}

export interface FamilySharingState {
  enabled: boolean;
  organizerUserId: string;
  members: ReadonlyArray<FamilySharingMember>;
  enabledAt?: string;
}
