import { densityScoresFromFileSizes } from './hairDensityEngine';

describe('hairDensityEngine', () => {
  it('returns clamped scores for all regions', () => {
    const scores = densityScoresFromFileSizes({
      'crown-top-down': 1_200_000,
      'hairline-front': 980_000,
      'temple-left': 1_100_000,
      'temple-right': 1_050_000,
    });
    expect(scores.overall).toBeGreaterThanOrEqual(0);
    expect(scores.overall).toBeLessThanOrEqual(100);
    expect(scores.crown).toBeGreaterThanOrEqual(0);
    expect(scores.hairline).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic for the same inputs', () => {
    const sizes = {
      'crown-top-down': 500_000,
      'hairline-front': 600_000,
      'temple-left': 550_000,
      'temple-right': 560_000,
    };
    expect(densityScoresFromFileSizes(sizes)).toEqual(densityScoresFromFileSizes(sizes));
  });
});
