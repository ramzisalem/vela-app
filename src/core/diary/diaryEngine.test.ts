/**
 * Diary engine tests (file 37).
 */
import {
  weekIso,
  aggregateThemes,
  excludedDatesFromDiary,
  buildWeeklySummaryFallback,
} from './diaryEngine';
import type { DiaryEntry } from '@/types/diary';

const entry = (over: Partial<DiaryEntry> = {}): DiaryEntry => ({
  id: 'e-1',
  userId: 'u',
  attachedTo: { kind: 'date', date: '2026-05-04' },
  body: 'A note.',
  userTags: [],
  inferredTags: [],
  excludeFromAnalysis: false,
  source: 'typed',
  createdAt: '2026-05-04T10:00:00Z',
  updatedAt: '2026-05-04T10:00:00Z',
  ...over,
});

describe('weekIso', () => {
  it('formats ISO week correctly for known dates', () => {
    expect(weekIso(new Date('2026-05-04'))).toBe('2026-W19');
    expect(weekIso(new Date('2026-01-01'))).toBe('2026-W01');
  });
});

describe('aggregateThemes', () => {
  it('counts user and inferred tags together, sorted desc', () => {
    const entries = [
      entry({ userTags: ['stressed'], inferredTags: ['slept-poorly'] }),
      entry({ userTags: ['stressed', 'travel'] }),
      entry({ userTags: ['slept-poorly'] }),
    ];
    const themes = aggregateThemes(entries);
    expect(themes[0]?.tag).toBe('stressed');
    expect(themes[0]?.count).toBe(2);
    expect(themes.find((t) => t.tag === 'slept-poorly')?.count).toBe(2);
  });
});

describe('excludedDatesFromDiary', () => {
  it('excludes dates marked excludeFromAnalysis', () => {
    const e = entry({
      attachedTo: { kind: 'date', date: '2026-05-04' },
      excludeFromAnalysis: true,
    });
    expect(excludedDatesFromDiary([e]).has('2026-05-04')).toBe(true);
  });

  it('excludes dates with noise tags (sick, sunburn, hat-day, ...)', () => {
    const e = entry({
      attachedTo: { kind: 'date', date: '2026-05-05' },
      userTags: ['sick'],
    });
    expect(excludedDatesFromDiary([e]).has('2026-05-05')).toBe(true);
  });

  it('does NOT exclude regular tagged days', () => {
    const e = entry({
      attachedTo: { kind: 'date', date: '2026-05-06' },
      userTags: ['good-day'],
    });
    expect(excludedDatesFromDiary([e]).has('2026-05-06')).toBe(false);
  });
});

describe('buildWeeklySummaryFallback', () => {
  it('produces a summary using the most common tag', () => {
    const e = [
      entry({ userTags: ['slept-poorly'] }),
      entry({ userTags: ['slept-poorly'] }),
      entry({ userTags: ['stressed'] }),
    ];
    const summary = buildWeeklySummaryFallback('u', e, new Date('2026-05-04'));
    expect(summary.themes[0]?.tag).toBe('slept-poorly');
    expect(summary.oneLineSummary).toMatch(/rough night/);
  });

  it('returns "A quiet week." when no tags', () => {
    const summary = buildWeeklySummaryFallback('u', [], new Date('2026-05-04'));
    expect(summary.oneLineSummary).toBe('A quiet week.');
  });
});
