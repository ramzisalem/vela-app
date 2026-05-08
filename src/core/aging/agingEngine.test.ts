/**
 * Aging-band engine tests (file 36).
 */
import {
  decadeForAge,
  shouldSuppressAgingBand,
  computeBandPosition,
  calloutForPosition,
} from './agingEngine';
import type { AgingBand } from '@/types/aging';

describe('decadeForAge', () => {
  it.each([
    [15, 20],
    [20, 20],
    [29, 20],
    [30, 30],
    [44, 40],
    [69, 60],
    [70, 70],
    [85, 70],
  ])('age %d → decade %d', (age, expected) => {
    expect(decadeForAge(age)).toBe(expected);
  });
});

describe('shouldSuppressAgingBand', () => {
  it('suppresses for pregnancy', () => {
    expect(shouldSuppressAgingBand(['pregnancy']).suppressed).toBe(true);
  });
  it('suppresses for cancer_recovery', () => {
    expect(shouldSuppressAgingBand(['cancer_recovery']).reason).toBe('cancer_recovery');
  });
  it('does not suppress for menopause', () => {
    expect(shouldSuppressAgingBand(['menopause']).suppressed).toBe(false);
  });
});

describe('computeBandPosition', () => {
  // p10/p90 are stated as annual percent changes (negative = decline).
  const band: AgingBand = {
    metric: 'overall',
    ageDecade: 30,
    sexAtBirth: 'combined',
    band: { p10: -2, p50: -1, p90: 0 },
    controllabilityHint: 'partly-controllable',
    sourceCitation: 'test',
  };

  it('returns inside for latest scores within band', () => {
    const pos = computeBandPosition({
      band,
      baselineScore: 70,
      latestScore: 69,
      ctx: { ageDecade: 30, sexAtBirth: 'female', yearsSinceBaseline: 1 },
    });
    expect(pos).toBe('inside');
  });

  it('returns above for outperforming the band', () => {
    const pos = computeBandPosition({
      band,
      baselineScore: 70,
      latestScore: 75,
      ctx: { ageDecade: 30, sexAtBirth: 'female', yearsSinceBaseline: 1 },
    });
    expect(pos).toBe('above');
  });

  it('returns below for underperforming', () => {
    const pos = computeBandPosition({
      band,
      baselineScore: 70,
      latestScore: 60,
      ctx: { ageDecade: 30, sexAtBirth: 'female', yearsSinceBaseline: 1 },
    });
    expect(pos).toBe('below');
  });

  it('returns unknown for missing baseline', () => {
    const pos = computeBandPosition({
      band,
      baselineScore: 0,
      latestScore: 60,
      ctx: { ageDecade: 30, sexAtBirth: 'female', yearsSinceBaseline: 1 },
    });
    expect(pos).toBe('unknown');
  });
});

describe('calloutForPosition', () => {
  it('returns null when inside the band (no callout)', () => {
    expect(calloutForPosition('overall', 'inside', 'partly-controllable')).toBeNull();
  });

  it('returns the "ahead of typical" line for above', () => {
    const c = calloutForPosition('overall', 'above', 'partly-controllable');
    expect(c?.text).toMatch(/ahead of typical/);
  });

  it('returns acceptance phrasing for below + mostly-natural', () => {
    const c = calloutForPosition('overall', 'below', 'mostly-natural');
    expect(c?.text).toMatch(/mostly natural/);
    expect(c?.linkLabel).toBeUndefined();
  });

  it('returns controllable phrasing + link for below + partly-controllable', () => {
    const c = calloutForPosition('skinClarity', 'below', 'partly-controllable');
    expect(c?.text).toMatch(/within your control/);
    expect(c?.linkLabel).toBe('What helps?');
  });
});
