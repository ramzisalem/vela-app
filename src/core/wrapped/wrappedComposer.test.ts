/**
 * Wrapped composer tests (file 38).
 */
import { composeWrappedCards } from './wrappedComposer';
import type { ScanSession } from '@/types/scan';
import type { DiaryEntry } from '@/types/diary';

const scan = (
  overall: number,
  week = 1,
  subScores: Partial<{
    skin: number;
    symmetry: number;
    grooming: number;
    lighting: number;
    contour: number;
  }> = {},
): ScanSession =>
  ({
    id: `s-${week}-${overall}`,
    userId: 'u',
    createdAt: `2026-05-${String(Math.min(28, week * 7)).padStart(2, '0')}T08:00:00Z`,
    weekNumber: week,
    isBaseline: false,
    capturedAngles: [],
    transforms: {},
    photoPaths: {},
    rawMetrics: {
      symmetryScore: 0.7,
      jawLineSharpness: 0.6,
      faceWidthHeightRatio: 0.74,
      underEyeAreaRatio: 0.18,
      redness: 0.2,
      blemishCount: 1,
      poreVisibility: 0.3,
    },
    scores: {
      skin: subScores.skin ?? 70,
      symmetry: subScores.symmetry ?? 70,
      grooming: subScores.grooming ?? 70,
      lighting: subScores.lighting ?? 70,
      contour: subScores.contour ?? 70,
      overall,
    },
    context: {},
    qualitativePending: false,
    syncStatus: 'synced',
  }) as unknown as ScanSession;

describe('composeWrappedCards', () => {
  it('always produces cover, scans, streak, and outro cards', () => {
    const cards = composeWrappedCards({
      month: '2026-05',
      scansThisMonth: [scan(70)],
      scansLastMonth: [scan(68)],
      consistentDaysThisMonth: 18,
      totalDaysInMonth: 31,
      correlations: [],
      diaryEntries: [],
      hasActiveTreatment: false,
    });
    const kinds = cards.map((c) => c.kind);
    expect(kinds).toContain('cover');
    expect(kinds).toContain('scans');
    expect(kinds).toContain('streak');
    expect(kinds[kinds.length - 1]).toBe('outro');
  });

  it('emits a metric-up card when the largest delta is ≥ 2', () => {
    const cards = composeWrappedCards({
      month: '2026-05',
      scansThisMonth: [scan(80, 1, { skin: 80 }), scan(82, 2, { skin: 82 })],
      scansLastMonth: [scan(70, 1, { skin: 70 })],
      consistentDaysThisMonth: 28,
      totalDaysInMonth: 31,
      correlations: [],
      diaryEntries: [],
      hasActiveTreatment: false,
    });
    expect(cards.some((c) => c.kind === 'metric-up')).toBe(true);
  });

  it('emits a quiet-note card when nothing is dramatic', () => {
    const cards = composeWrappedCards({
      month: '2026-05',
      scansThisMonth: [scan(70)],
      scansLastMonth: [scan(70)],
      consistentDaysThisMonth: 0,
      totalDaysInMonth: 31,
      correlations: [],
      diaryEntries: [],
      hasActiveTreatment: false,
    });
    expect(cards.some((c) => c.kind === 'quiet-note')).toBe(true);
  });

  it('emits an in-your-words card when ≥3 diary entries exist', () => {
    const e = (i: number, tag: 'good-day' | 'rough-day' | 'travel'): DiaryEntry => ({
      id: `e-${i}`,
      userId: 'u',
      attachedTo: { kind: 'date', date: `2026-05-${String(i).padStart(2, '0')}` },
      body: 'Today felt different.',
      userTags: [tag],
      inferredTags: [],
      excludeFromAnalysis: false,
      source: 'typed',
      createdAt: `2026-05-${String(i).padStart(2, '0')}T10:00:00Z`,
      updatedAt: `2026-05-${String(i).padStart(2, '0')}T10:00:00Z`,
    });
    const entries = [e(1, 'good-day'), e(2, 'travel'), e(3, 'rough-day')];
    const cards = composeWrappedCards({
      month: '2026-05',
      scansThisMonth: [scan(70)],
      scansLastMonth: [scan(70)],
      consistentDaysThisMonth: 0,
      totalDaysInMonth: 31,
      correlations: [],
      diaryEntries: entries,
      hasActiveTreatment: false,
    });
    expect(cards.some((c) => c.kind === 'in-your-words')).toBe(true);
  });

  it('emits a pattern card when correlations exist', () => {
    const cards = composeWrappedCards({
      month: '2026-05',
      scansThisMonth: [scan(70)],
      scansLastMonth: [scan(70)],
      consistentDaysThisMonth: 0,
      totalDaysInMonth: 31,
      correlations: [
        {
          id: 'c-1',
          faceMetric: 'overall',
          healthSignal: 'sleep',
          pearsonR: 0.85,
          pValue: 0.01,
          sampleSize: 8,
          insight: 'Sleep tracks with skin clarity for you.',
          generatedAt: new Date().toISOString(),
        },
      ],
      diaryEntries: [],
      hasActiveTreatment: false,
    });
    expect(cards.some((c) => c.kind === 'pattern')).toBe(true);
  });
});
