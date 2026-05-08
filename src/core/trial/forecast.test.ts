/**
 * Forecast tests (file 41).
 *
 * Hard rules:
 *   - Always show a band, never a single number.
 *   - Never project regression (lower must be ≥ baseline).
 */
import { buildForecast } from './forecast';
import type { ScanSession } from '@/types/scan';

const baseScan = (overall: number): ScanSession =>
  ({
    id: 'scan-1',
    userId: 'user-1',
    createdAt: new Date().toISOString(),
    weekNumber: 0,
    isBaseline: true,
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
      skin: 70,
      symmetry: 70,
      grooming: 70,
      lighting: 70,
      contour: 70,
      overall,
    },
    context: {},
    qualitativePending: false,
    syncStatus: 'synced',
  }) as unknown as ScanSession;

describe('buildForecast', () => {
  it('produces a band, never a single number', () => {
    const f = buildForecast({
      baselineScan: baseScan(70),
      framework: 'neutral',
      ageDecade: 30,
      hasHealthKit: false,
    });
    expect(f.scoreBand.lower).toBeLessThan(f.scoreBand.upper);
    expect(f.scoreBand.upper - f.scoreBand.lower).toBeGreaterThanOrEqual(1);
  });

  it('never projects regression', () => {
    const f = buildForecast({
      baselineScan: baseScan(70),
      framework: 'feminine',
      ageDecade: 50,
      hasHealthKit: false,
    });
    expect(f.scoreBand.lower).toBeGreaterThanOrEqual(70);
  });

  it('clamps the upper bound to 100', () => {
    const f = buildForecast({
      baselineScan: baseScan(99),
      framework: 'masculine',
      ageDecade: 20,
      hasHealthKit: false,
    });
    expect(f.scoreBand.upper).toBeLessThanOrEqual(100);
  });

  it('uses the no-HealthKit pattern when not connected', () => {
    const f = buildForecast({
      baselineScan: baseScan(70),
      framework: 'neutral',
      ageDecade: 30,
      hasHealthKit: false,
    });
    expect(f.patternHypothesis).toMatch(/Apple Health/i);
  });

  it('uses the connected pattern when HealthKit is on', () => {
    const f = buildForecast({
      baselineScan: baseScan(70),
      framework: 'neutral',
      ageDecade: 30,
      hasHealthKit: true,
    });
    expect(f.patternHypothesis).toMatch(/Sleep and skin clarity/);
  });

  it('flags isFallback when no AI copy provided', () => {
    const f = buildForecast({
      baselineScan: baseScan(70),
      framework: 'neutral',
      ageDecade: 30,
      hasHealthKit: false,
    });
    expect(f.isFallback).toBe(true);
  });

  it('uses AI copy when provided and reports isFallback=false', () => {
    const f = buildForecast({
      baselineScan: baseScan(70),
      framework: 'neutral',
      ageDecade: 30,
      hasHealthKit: false,
      aiCopy: {
        headerLine: 'A custom header.',
        patternHypothesis: 'A custom pattern.',
        footerActionLine: 'Continue',
      },
    });
    expect(f.isFallback).toBe(false);
    expect(f.headerLine).toBe('A custom header.');
  });

  it('includes deltas for all five sub-scores', () => {
    const f = buildForecast({
      baselineScan: baseScan(70),
      framework: 'neutral',
      ageDecade: 30,
      hasHealthKit: false,
    });
    expect(Object.keys(f.subScoreDeltas).sort()).toEqual([
      'contour',
      'grooming',
      'lighting',
      'skin',
      'symmetry',
    ]);
  });
});
