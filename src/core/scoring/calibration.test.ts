/**
 * Calibration tests (file 05).
 *
 * Verifies the S-curve produces reasonable, framework-aware values without
 * pinning exact numbers (the curves can be tuned without breaking tests).
 */
import { calibrateScore } from './calibration';

describe('calibrateScore', () => {
  it('returns 0..100 integers', () => {
    for (const raw of [0, 0.25, 0.5, 0.75, 1]) {
      const v = calibrateScore(raw, 'neutral', 'skin');
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('is monotonic increasing in raw input', () => {
    const a = calibrateScore(0.2, 'neutral', 'skin');
    const b = calibrateScore(0.5, 'neutral', 'skin');
    const c = calibrateScore(0.8, 'neutral', 'skin');
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it('produces a median user near 70 with raw=0.7', () => {
    const v = calibrateScore(0.7, 'neutral', 'skin');
    expect(v).toBeGreaterThan(60);
    expect(v).toBeLessThan(85);
  });

  it('shifts mean per framework (masculine vs feminine)', () => {
    const m = calibrateScore(0.5, 'masculine', 'skin');
    const f = calibrateScore(0.5, 'feminine', 'skin');
    expect(m).toBeGreaterThan(f);
  });
});
