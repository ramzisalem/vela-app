/**
 * Wrapped composer (file 38).
 *
 * Decides which cards a month's recap contains. Pure function: takes the
 * month's signals and returns an ordered card list. The Edge Function fills
 * in AI-generated copy for cover.tagline, treatment.progressNote, and
 * quiet-note.body before persisting; on-device the diary "in-your-words"
 * fragments are filled in at view time (diary text is encrypted on-device).
 */
import type { Correlation } from '@/types/health';
import type { DiaryEntry } from '@/types/diary';
import type { ScanSession } from '@/types/scan';
import type { WrappedCard } from '@/types/wrapped';
import { aggregateThemes } from '@/core/diary/diaryEngine';

export interface ComposeWrappedInput {
  month: string;
  scansThisMonth: ReadonlyArray<ScanSession>;
  scansLastMonth: ReadonlyArray<ScanSession>;
  /** Routine consistency days for the month. */
  consistentDaysThisMonth: number;
  totalDaysInMonth: number;
  /** Top correlations active for the month. */
  correlations: ReadonlyArray<Correlation>;
  /** Diary entries for the month (already on-device). */
  diaryEntries: ReadonlyArray<DiaryEntry>;
  /** Whether the user has any active treatments. */
  hasActiveTreatment: boolean;
  /** When set, treatment-specific weeks-in counter for the primary treatment. */
  primaryTreatmentWeeksIn?: number;
  primaryTreatmentId?: string;
}

const SUB_METRICS: ReadonlyArray<keyof ScanSession['scores']> = [
  'skin',
  'symmetry',
  'grooming',
  'lighting',
  'contour',
];

export function composeWrappedCards(input: ComposeWrappedInput): WrappedCard[] {
  const cards: WrappedCard[] = [];

  cards.push({ kind: 'cover', month: input.month, tagline: 'A month of showing up.' });
  cards.push({
    kind: 'scans',
    count: input.scansThisMonth.length,
    consistencyNote: scansConsistencyNote(input.scansThisMonth.length),
  });

  const heatmap: boolean[] = Array.from({ length: input.totalDaysInMonth }, () => false);
  for (let i = 0; i < Math.min(input.consistentDaysThisMonth, heatmap.length); i++) {
    heatmap[i] = true;
  }
  cards.push({ kind: 'streak', days: input.consistentDaysThisMonth, calendarHeatmap: heatmap });

  // Metric movement cards: pick top up + biggest down.
  const deltas = computeSubScoreDeltas(input.scansThisMonth, input.scansLastMonth);
  const sortedAbs = [...deltas].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const top = sortedAbs[0];
  if (top) {
    if (top.delta >= 2) {
      cards.push({
        kind: 'metric-up',
        metric: top.metric as 'overall',
        deltaPoints: top.delta,
        sparkline: top.sparkline,
      });
    } else if (top.delta <= -2) {
      cards.push({
        kind: 'metric-down',
        metric: top.metric as 'overall',
        deltaPoints: top.delta,
        band: 'within',
      });
    } else {
      cards.push({ kind: 'metric-steady', metric: top.metric as 'overall' });
    }
  }

  // Pattern card: the strongest correlation (if any).
  const corr = input.correlations[0];
  if (corr) {
    cards.push({
      kind: 'pattern',
      faceMetric: corr.faceMetric as 'overall',
      healthSignal: corr.healthSignal,
      note: corr.insight,
    });
  }

  // Diary-in-your-words: pick three random fragments from this month's entries.
  if (input.diaryEntries.length >= 3) {
    const fragments = pickDiaryFragments(input.diaryEntries);
    cards.push({ kind: 'in-your-words', threeFragments: fragments });
  }

  if (input.hasActiveTreatment && input.primaryTreatmentId && input.primaryTreatmentWeeksIn) {
    cards.push({
      kind: 'treatment',
      treatmentId: input.primaryTreatmentId,
      weeksIn: input.primaryTreatmentWeeksIn,
      progressNote: 'Your record is doing the slow, useful work.',
    });
  }

  // Quiet-note: only when nothing else is dramatic. A streak only counts as
  // dramatic if the user crossed a milestone this month (≥7 consecutive days).
  const dramatic = cards.some((c) => {
    if (c.kind === 'metric-up') return true;
    if (c.kind === 'pattern') return true;
    if (c.kind === 'streak') return c.days >= 7;
    return false;
  });
  if (!dramatic) {
    cards.push({ kind: 'quiet-note', body: 'A steady month. That is the work.' });
  }

  cards.push({ kind: 'outro' });
  return cards;
}

function scansConsistencyNote(count: number): string | undefined {
  if (count >= 4) return 'Every week.';
  if (count >= 2) return 'Most weeks.';
  return undefined;
}

interface MetricDelta {
  metric: string;
  delta: number;
  sparkline: number[];
}

function computeSubScoreDeltas(
  current: ReadonlyArray<ScanSession>,
  prior: ReadonlyArray<ScanSession>,
): ReadonlyArray<MetricDelta> {
  const out: MetricDelta[] = [];
  for (const m of SUB_METRICS) {
    const curValues = current.map((s) => s.scores[m]).filter((v): v is number => typeof v === 'number');
    const prevValues = prior.map((s) => s.scores[m]).filter((v): v is number => typeof v === 'number');
    const cur = average(curValues);
    const prev = average(prevValues);
    if (cur === null || prev === null) continue;
    out.push({
      metric: m,
      delta: Math.round(cur - prev),
      sparkline: curValues,
    });
  }
  return out;
}

function average(values: ReadonlyArray<number>): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function pickDiaryFragments(entries: ReadonlyArray<DiaryEntry>): string[] {
  // Pull the first sentence of three diverse entries (by tag).
  const themed = aggregateThemes(entries).slice(0, 3);
  const out: string[] = [];
  for (const t of themed) {
    const e = entries.find((x) => x.userTags.includes(t.tag));
    if (e) out.push(firstSentence(e.body));
  }
  // Top up if fewer than 3 themes.
  let i = 0;
  while (out.length < 3 && i < entries.length) {
    const entry = entries[i];
    if (entry) {
      const f = firstSentence(entry.body);
      if (f && !out.includes(f)) out.push(f);
    }
    i += 1;
  }
  return out.slice(0, 3);
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^[^.!?]+[.!?]?/);
  const s = m ? m[0] : trimmed;
  return s.length > 80 ? s.slice(0, 78).trim() + '…' : s.trim();
}
