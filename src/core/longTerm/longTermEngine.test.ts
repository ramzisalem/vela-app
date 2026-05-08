/**
 * Long-term engine tests (file 45).
 */
import {
  hasYoyEligibility,
  buildYoyPoints,
  findOnThisDayCard,
  computeCompoundEffort,
  eligibleAnniversaryCard,
} from './longTermEngine';
import type { ScanSession } from '@/types/scan';

const scan = (date: string, overall = 70): ScanSession =>
  ({
    id: `s-${date}`,
    userId: 'u',
    createdAt: `${date}T08:00:00Z`,
    weekNumber: 1,
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
    scores: { skin: 70, symmetry: 70, grooming: 70, lighting: 70, contour: 70, overall },
    context: {},
    qualitativePending: false,
    syncStatus: 'synced',
  }) as unknown as ScanSession;

describe('hasYoyEligibility', () => {
  it('false when no scans ≥ 365 days old', () => {
    expect(hasYoyEligibility([scan('2026-04-01')], new Date('2026-05-01'))).toBe(false);
  });
  it('true when at least one scan from a year ago', () => {
    expect(
      hasYoyEligibility(
        [scan('2025-04-15'), scan('2026-04-15')],
        new Date('2026-05-01'),
      ),
    ).toBe(true);
  });
});

describe('buildYoyPoints', () => {
  it('aligns scans within ±7 days from one year prior', () => {
    const scans = [
      scan('2025-04-25', 65),
      scan('2026-04-26', 70),
    ];
    const points = buildYoyPoints(scans, 'overall', new Date('2026-05-01'));
    const recent = points.find((p) => p.date === '2026-04-26');
    expect(recent?.thisYear).toBe(70);
    expect(recent?.lastYear).toBe(65);
  });
});

describe('findOnThisDayCard', () => {
  it('finds a 1-year-ago scan within ±2 days', () => {
    const card = findOnThisDayCard(
      [scan('2025-05-08', 65), scan('2026-05-01', 70)],
      new Date('2026-05-09'),
    );
    expect(card?.yearsAgo).toBe(1);
  });

  it('returns null when no past scans line up', () => {
    const card = findOnThisDayCard([scan('2026-05-01', 70)], new Date('2026-05-09'));
    expect(card).toBeNull();
  });
});

describe('computeCompoundEffort', () => {
  it('rolls up scans + routine completions into hours', () => {
    const stats = computeCompoundEffort(
      [scan('2026-04-01'), scan('2026-04-08'), scan('2026-04-15'), scan('2026-04-22')],
      120,
      90,
      '2026-01-01T00:00:00Z',
      new Date('2026-05-01'),
    );
    expect(stats.totalScans).toBe(4);
    expect(stats.totalRoutineCompletions).toBe(120);
    expect(stats.weeksTracked).toBeGreaterThan(15);
    expect(stats.totalHoursInvested).toBeGreaterThan(1);
  });
});

describe('eligibleAnniversaryCard', () => {
  it('returns one-year card within ±3 days of anniversary', () => {
    const card = eligibleAnniversaryCard(
      '2025-05-10T00:00:00Z',
      {
        totalScans: 40,
        totalRoutineCompletions: 200,
        totalConsistentDays: 180,
        totalHoursInvested: 4.5,
        weeksTracked: 52,
        startedAt: '2025-05-10T00:00:00Z',
      },
      'A year of showing up.',
      new Date('2026-05-09'),
    );
    expect(card?.kind).toBe('one-year');
  });

  it('returns null outside the anniversary window', () => {
    const card = eligibleAnniversaryCard(
      '2025-05-10T00:00:00Z',
      {
        totalScans: 40,
        totalRoutineCompletions: 200,
        totalConsistentDays: 180,
        totalHoursInvested: 4.5,
        weeksTracked: 52,
        startedAt: '2025-05-10T00:00:00Z',
      },
      'A year of showing up.',
      new Date('2026-04-01'),
    );
    expect(card).toBeNull();
  });
});
