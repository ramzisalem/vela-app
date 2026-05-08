/**
 * Diary engine (file 37).
 *
 * Pure helpers: tag aggregation, week-key derivation, exclusion query for
 * downstream consumers (correlation engine, aging band).
 */
import type {
  DiaryEntry,
  DiaryInferredTag,
  DiaryUserTag,
  DiaryWeeklySummary,
} from '@/types/diary';

/**
 * ISO week key for a date — e.g. "2026-W18". Uses ISO 8601 (Mon-first).
 */
export function weekIso(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Aggregated tag counts for the entries in a window.
 */
export function aggregateThemes(
  entries: ReadonlyArray<DiaryEntry>,
): { tag: DiaryInferredTag; count: number }[] {
  const counts = new Map<DiaryInferredTag, number>();
  for (const e of entries) {
    for (const t of e.userTags) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (const t of e.inferredTags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
    (a, b) => b.count - a.count,
  );
}

/**
 * Returns the dates the user marked excludeFromAnalysis OR tagged with a
 * "noise" tag (sick, sunburn, hat-day, big-life-event, allergic-reaction).
 * Used by the correlation engine to drop those weeks from analysis.
 */
export function excludedDatesFromDiary(
  entries: ReadonlyArray<DiaryEntry>,
): ReadonlySet<string> {
  const NOISE_TAGS: ReadonlySet<DiaryUserTag> = new Set<DiaryUserTag>([
    'sick',
    'sunburn',
    'hat-day',
    'big-life-event',
    'allergic-reaction',
  ]);
  const out = new Set<string>();
  for (const e of entries) {
    const date = e.attachedTo.kind === 'date' ? e.attachedTo.date : e.createdAt.slice(0, 10);
    if (e.excludeFromAnalysis) out.add(date);
    else if (e.userTags.some((t) => NOISE_TAGS.has(t))) out.add(date);
  }
  return out;
}

/**
 * Build a deterministic weekly summary stub. The real call (file 06) replaces
 * `oneLineSummary` with AI-generated copy; this function provides the fallback
 * when AI fails or is opted out.
 */
export function buildWeeklySummaryFallback(
  userId: string,
  entries: ReadonlyArray<DiaryEntry>,
  reference: Date = new Date(),
): DiaryWeeklySummary {
  const themes = aggregateThemes(entries).slice(0, 5);
  let oneLine = 'A quiet week.';
  const top = themes[0];
  if (top) {
    oneLine = humanizeTagSummary(top.tag, top.count);
  }
  return {
    weekIso: weekIso(reference),
    userId,
    themes,
    oneLineSummary: oneLine,
    generatedAt: new Date().toISOString(),
  };
}

function humanizeTagSummary(tag: DiaryInferredTag, count: number): string {
  const plural = count === 1 ? '' : 's';
  switch (tag) {
    case 'slept-poorly':
      return `${count} rough night${plural} this week.`;
    case 'slept-well':
      return `${count} solid night${plural} of sleep.`;
    case 'stressed':
      return 'A heavier week than usual.';
    case 'sick':
      return 'A sick week. Worth giving the chart room.';
    case 'travel':
      return 'A travel week.';
    case 'good-day':
      return 'A few good days this week.';
    case 'rough-day':
      return 'A rougher stretch.';
    default:
      return 'A week with a few notes.';
  }
}
