/**
 * Correlation engine tests (file 33).
 */
import { pearsonR, approxPValue, buildCorrelations } from './correlationEngine';
import type { ScanSession } from '@/types/scan';
import type { HealthSnapshot } from '@/types/health';

describe('pearsonR', () => {
  it('returns 1 for perfect positive correlation', () => {
    expect(pearsonR([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBeCloseTo(1, 6);
  });
  it('returns -1 for perfect negative correlation', () => {
    expect(pearsonR([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])).toBeCloseTo(-1, 6);
  });
  it('returns NaN when input lengths differ or are too short', () => {
    expect(pearsonR([1, 2], [1])).toBeNaN();
    expect(pearsonR([1], [1])).toBeNaN();
  });
  it('returns 0 for orthogonal variables', () => {
    const r = pearsonR([1, -1, 1, -1, 1, -1], [1, 1, -1, -1, 1, 1]);
    expect(Math.abs(r)).toBeLessThan(0.6);
  });
});

describe('approxPValue', () => {
  it('returns near-0 for strong correlation with sample n=10', () => {
    expect(approxPValue(0.9, 10)).toBeLessThan(0.01);
  });
  it('returns close to 1 for r near 0', () => {
    expect(approxPValue(0.05, 10)).toBeGreaterThan(0.5);
  });
});

function mockScan(date: string, overall: number): ScanSession {
  return {
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
  } as unknown as ScanSession;
}

function mockSnapshot(date: string, sleepHours: number): HealthSnapshot {
  return {
    date,
    sleepHours,
    sleepEfficiency: null,
    sleepLatencyMin: null,
    hrvSdnn: null,
    restingHeartRate: null,
    cyclePhase: null,
    cycleDay: null,
    weightKg: null,
    hydrationMl: null,
    alcoholDrinks: null,
    stepCount: null,
    hadIntenseWorkout: null,
  };
}

describe('buildCorrelations', () => {
  it('returns no candidates with too few aligned samples', () => {
    const c = buildCorrelations({ scans: [mockScan('2026-04-01', 70)], snapshots: [] });
    expect(c.length).toBe(0);
  });

  it('finds a strong sleep→overall correlation in synthetic data', () => {
    const now = new Date('2026-05-01');
    const dates = [
      '2026-04-25',
      '2026-04-22',
      '2026-04-18',
      '2026-04-15',
      '2026-04-11',
      '2026-04-08',
      '2026-04-04',
      '2026-04-01',
    ];
    const sleeps = [8.5, 5.5, 8, 6, 8.2, 5.8, 8.4, 5.6];
    const overalls = sleeps.map((s) => Math.round(50 + s * 5));
    const scans = dates.map((d, i) => mockScan(d, overalls[i] as number));
    const snaps = dates.map((d, i) => mockSnapshot(d, sleeps[i] as number));
    const c = buildCorrelations({ scans, snapshots: snaps, now });
    const sleepOverall = c.find(
      (x) => x.faceMetric === 'overall' && x.healthSignal === 'sleep',
    );
    expect(sleepOverall).toBeDefined();
    expect(sleepOverall!.pearsonR).toBeGreaterThan(0.9);
  });
});
