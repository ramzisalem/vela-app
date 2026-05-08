/**
 * Experiment verdict tests (file 44).
 */
import { computeVerdict } from './verdictEngine';

describe('computeVerdict', () => {
  it('reports meaningful when attributable ≥ 4 and compliance ≥ 0.7', () => {
    const v = computeVerdict({
      baselineMetric: 70,
      endMetric: 76,
      expectedDriftPoints: 1,
      scanCount: 8,
      complianceRate: 0.95,
      confounders: [],
    });
    expect(v.effectSize).toBe('meaningful');
    expect(v.attributableDelta).toBeCloseTo(5, 1);
    expect(v.recommendation).toBe('continue');
  });

  it('reports small when attributable ≥ 2 < 4', () => {
    const v = computeVerdict({
      baselineMetric: 70,
      endMetric: 73,
      expectedDriftPoints: 0,
      scanCount: 8,
      complianceRate: 0.95,
      confounders: [],
    });
    expect(v.effectSize).toBe('small');
  });

  it('reports inverted when attributable ≤ -2', () => {
    const v = computeVerdict({
      baselineMetric: 70,
      endMetric: 65,
      expectedDriftPoints: 0,
      scanCount: 8,
      complianceRate: 0.95,
      confounders: [],
    });
    expect(v.effectSize).toBe('inverted');
    expect(v.recommendation).toBe('stop');
  });

  it('reports none when attributable is near 0', () => {
    const v = computeVerdict({
      baselineMetric: 70,
      endMetric: 70,
      expectedDriftPoints: 0,
      scanCount: 8,
      complianceRate: 0.95,
      confounders: [],
    });
    expect(v.effectSize).toBe('none');
  });

  it('reports unclear when compliance below 70%', () => {
    const v = computeVerdict({
      baselineMetric: 70,
      endMetric: 76,
      expectedDriftPoints: 0,
      scanCount: 8,
      complianceRate: 0.5,
      confounders: [],
    });
    expect(v.effectSize).toBe('unclear');
    expect(v.recommendation).toBe('run-again');
  });

  it('penalizes confidence with confounders', () => {
    const clean = computeVerdict({
      baselineMetric: 70,
      endMetric: 76,
      expectedDriftPoints: 0,
      scanCount: 8,
      complianceRate: 0.95,
      confounders: [],
    });
    const noisy = computeVerdict({
      baselineMetric: 70,
      endMetric: 76,
      expectedDriftPoints: 0,
      scanCount: 8,
      complianceRate: 0.95,
      confounders: [
        { kind: 'sleep-shift', evidence: 'Slept under 6 hrs' },
        { kind: 'travel', evidence: 'Two trips this month' },
      ],
    });
    expect(noisy.primaryMetricDeltaConfidence).toBeLessThan(
      clean.primaryMetricDeltaConfidence,
    );
  });

  it('produces no exclamation marks in copy (brand voice)', () => {
    const v = computeVerdict({
      baselineMetric: 70,
      endMetric: 76,
      expectedDriftPoints: 1,
      scanCount: 8,
      complianceRate: 0.95,
      confounders: [],
    });
    expect(v.copy).not.toMatch(/!/);
  });
});
