/**
 * Long-term retention engine (file 45).
 *
 * Pure helpers for YoY emergence, "On this day" surfacing, compound-effort
 * stats, and anniversary card eligibility.
 */
import type { ScanSession } from '@/types/scan';
import type {
  AnniversaryCard,
  AnniversaryCardKind,
  CompoundEffortStats,
  OnThisDayCard,
  YoYDataPoint,
} from '@/types/longTerm';

/**
 * True if the user has data ≥ 365 days ago for any scan.
 */
export function hasYoyEligibility(scans: ReadonlyArray<ScanSession>, now = new Date()): boolean {
  if (scans.length === 0) return false;
  const yearAgo = now.getTime() - 365 * 24 * 60 * 60 * 1000;
  return scans.some((s) => Date.parse(s.createdAt) <= yearAgo);
}

/**
 * Build YoY data points: for each scan in [now-8w, now], find the closest
 * scan ±7 days from one year prior. Returns a sparse, monotonically
 * increasing array.
 */
export function buildYoyPoints(
  scans: ReadonlyArray<ScanSession>,
  metric: keyof ScanSession['scores'],
  now = new Date(),
): ReadonlyArray<YoYDataPoint> {
  const eightWeeks = 8 * 7 * 24 * 60 * 60 * 1000;
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  const window = scans.filter(
    (s) => now.getTime() - Date.parse(s.createdAt) <= eightWeeks,
  );
  const out: YoYDataPoint[] = [];
  for (const s of window) {
    const ts = Date.parse(s.createdAt);
    const yearPrior = ts - oneYear;
    const sorted = scans
      .map((p) => ({ p, diff: Math.abs(Date.parse(p.createdAt) - yearPrior) }))
      .sort((a, b) => a.diff - b.diff);
    const closest = sorted[0];
    const lastYear =
      closest && closest.diff <= 7 * 24 * 60 * 60 * 1000 ? closest.p.scores[metric] : null;
    out.push({
      date: s.createdAt.slice(0, 10),
      thisYear: s.scores[metric] ?? null,
      lastYear: lastYear ?? null,
    });
  }
  return out;
}

/**
 * Surface an "on this day" card for years 1, 2, 3, 5 if a scan exists
 * within ±2 days of the same date in a prior year.
 */
export function findOnThisDayCard(
  scans: ReadonlyArray<ScanSession>,
  now = new Date(),
): OnThisDayCard | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const candidates: OnThisDayCard[] = [];
  for (const yearsAgo of [1, 2, 3, 5]) {
    const target = new Date(today);
    target.setFullYear(target.getFullYear() - yearsAgo);
    const targetTs = target.getTime();
    const tolerance = 2 * 24 * 60 * 60 * 1000;
    const scan = scans.find((s) => Math.abs(Date.parse(s.createdAt) - targetTs) <= tolerance);
    if (scan) {
      candidates.push({
        remembrance: scan.createdAt.slice(0, 10),
        yearsAgo,
        scanId: scan.id,
      });
    }
  }
  if (candidates.length === 0) return null;
  // Prefer the longest-ago memory.
  return candidates.sort((a, b) => b.yearsAgo - a.yearsAgo)[0] ?? null;
}

/**
 * Compute compound-effort stats for the anniversary card and the long-term
 * dashboard tile.
 */
export function computeCompoundEffort(
  scans: ReadonlyArray<ScanSession>,
  routineCompletions: number,
  consistentDays: number,
  startedAtIso: string,
  now = new Date(),
): CompoundEffortStats {
  const weeks = Math.max(
    1,
    Math.floor((now.getTime() - Date.parse(startedAtIso)) / (7 * 24 * 60 * 60 * 1000)),
  );
  const hoursPerScan = 5 / 60;
  const hoursPerTask = 0.5 / 60;
  const totalHours =
    Math.round((scans.length * hoursPerScan + routineCompletions * hoursPerTask) * 10) / 10;
  return {
    totalScans: scans.length,
    totalRoutineCompletions: routineCompletions,
    totalConsistentDays: consistentDays,
    totalHoursInvested: totalHours,
    weeksTracked: weeks,
    startedAt: startedAtIso,
  };
}

const ANNIVERSARY_THRESHOLDS: ReadonlyArray<{
  years: number;
  kind: AnniversaryCardKind;
}> = [
  { years: 5, kind: 'five-year' },
  { years: 3, kind: 'three-year' },
  { years: 2, kind: 'two-year' },
  { years: 1, kind: 'one-year' },
];

/**
 * Returns the highest-tier anniversary card the user qualifies for today,
 * or null. The window is ±3 days of the actual anniversary.
 */
export function eligibleAnniversaryCard(
  startedAtIso: string,
  stats: CompoundEffortStats,
  tribute: string,
  now = new Date(),
): AnniversaryCard | null {
  const startedAt = new Date(startedAtIso);
  for (const { years, kind } of ANNIVERSARY_THRESHOLDS) {
    const target = new Date(startedAt);
    target.setFullYear(target.getFullYear() + years);
    const diff = Math.abs(now.getTime() - target.getTime());
    if (diff <= 3 * 24 * 60 * 60 * 1000) {
      return { kind, hitOn: now.toISOString().slice(0, 10), stats, tribute };
    }
  }
  return null;
}
