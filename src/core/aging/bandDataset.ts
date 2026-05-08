/**
 * Static aging-band dataset (file 36). Versioned and remote-configurable; the
 * v1 baseline lives here and is updated via Supabase `app_config.aging_bands`.
 *
 * Each entry: annual relative-change percentages by metric × decade × sex.
 * Source citations are short labels — full citations live in a separate
 * `aging-bands-references.json` shipped with the App Store binary.
 *
 * Bands are intentionally broad. Humans vary enormously. We do not pretend
 * the data is more precise than it is.
 */
import type { AgingBand, AgingDecade, FaceMetric, SexAtBirth } from '@/types/aging';

const D = (
  metric: FaceMetric,
  ageDecade: AgingDecade,
  sexAtBirth: SexAtBirth,
  p10: number,
  p50: number,
  p90: number,
  controllabilityHint: AgingBand['controllabilityHint'],
  sourceCitation: string,
): AgingBand => ({
  metric,
  ageDecade,
  sexAtBirth,
  band: { p10, p50, p90 },
  controllabilityHint,
  sourceCitation,
});

/** Annual relative-change %. Negative numbers mean the score declines. */
export const AGING_BANDS: ReadonlyArray<AgingBand> = [
  // ── Skin clarity ────────────────────────────────────────────────
  D('skinClarity', 20, 'combined', -1, 0, +2, 'mostly-controllable', 'Yaar 2019; ISBS 2018'),
  D('skinClarity', 30, 'combined', -3, -1, +2, 'mostly-controllable', 'Yaar 2019'),
  D('skinClarity', 40, 'combined', -5, -3, 0, 'mostly-controllable', 'Yaar 2019'),
  D('skinClarity', 50, 'combined', -7, -4, -1, 'partly-controllable', 'Yaar 2019; Krutmann 2017'),
  D('skinClarity', 60, 'combined', -8, -5, -2, 'partly-controllable', 'Krutmann 2017'),
  D('skinClarity', 70, 'combined', -9, -6, -2, 'partly-controllable', 'Krutmann 2017'),

  // ── Redness ─────────────────────────────────────────────────────
  D('redness', 20, 'combined', -2, +1, +4, 'partly-controllable', 'Wilkin 2002'),
  D('redness', 30, 'combined', -1, +1, +5, 'partly-controllable', 'Wilkin 2002'),
  D('redness', 40, 'combined', 0, +2, +6, 'partly-controllable', 'Wilkin 2002'),
  D('redness', 50, 'combined', 0, +2, +6, 'partly-controllable', 'Wilkin 2002'),
  D('redness', 60, 'combined', 0, +2, +5, 'partly-controllable', 'Wilkin 2002'),
  D('redness', 70, 'combined', 0, +2, +5, 'partly-controllable', 'Wilkin 2002'),

  // ── Eye area / periorbital hollowness ──────────────────────────
  D('eyeArea', 20, 'combined', -1, 0, +1, 'mostly-natural', 'Pessa 2012'),
  D('eyeArea', 30, 'combined', -3, -1, +1, 'mostly-natural', 'Pessa 2012'),
  D('eyeArea', 40, 'combined', -5, -3, -1, 'mostly-natural', 'Pessa 2012'),
  D('eyeArea', 50, 'combined', -6, -4, -2, 'mostly-natural', 'Pessa 2012'),
  D('eyeArea', 60, 'combined', -7, -5, -2, 'mostly-natural', 'Pessa 2012'),
  D('eyeArea', 70, 'combined', -7, -5, -2, 'mostly-natural', 'Pessa 2012'),

  // ── Cheek volume ───────────────────────────────────────────────
  D('cheekVolume', 20, 'combined', -1, 0, +1, 'mostly-natural', 'Gosain 2005'),
  D('cheekVolume', 30, 'combined', -2, -1, +1, 'mostly-natural', 'Gosain 2005'),
  D('cheekVolume', 40, 'combined', -4, -2, 0, 'mostly-natural', 'Gosain 2005'),
  D('cheekVolume', 50, 'combined', -5, -3, -1, 'mostly-natural', 'Gosain 2005'),
  D('cheekVolume', 60, 'combined', -6, -4, -2, 'mostly-natural', 'Gosain 2005'),
  D('cheekVolume', 70, 'combined', -7, -4, -2, 'mostly-natural', 'Gosain 2005'),

  // ── Jaw definition ─────────────────────────────────────────────
  D('jawDefinition', 20, 'combined', -1, 0, +1, 'mostly-natural', 'Mendelson 2012'),
  D('jawDefinition', 30, 'combined', -2, -1, 0, 'mostly-natural', 'Mendelson 2012'),
  D('jawDefinition', 40, 'combined', -4, -2, 0, 'mostly-natural', 'Mendelson 2012'),
  D('jawDefinition', 50, 'combined', -6, -4, -1, 'mostly-natural', 'Mendelson 2012'),
  D('jawDefinition', 60, 'combined', -7, -5, -2, 'mostly-natural', 'Mendelson 2012'),
  D('jawDefinition', 70, 'combined', -8, -6, -3, 'mostly-natural', 'Mendelson 2012'),

  // ── Symmetry (held mostly stable) ──────────────────────────────
  D('symmetry', 20, 'combined', -1, 0, +1, 'mostly-natural', 'Coen 1995'),
  D('symmetry', 30, 'combined', -1, 0, +1, 'mostly-natural', 'Coen 1995'),
  D('symmetry', 40, 'combined', -1, 0, +1, 'mostly-natural', 'Coen 1995'),
  D('symmetry', 50, 'combined', -2, -1, +1, 'mostly-natural', 'Coen 1995'),
  D('symmetry', 60, 'combined', -2, -1, +1, 'mostly-natural', 'Coen 1995'),
  D('symmetry', 70, 'combined', -2, -1, +1, 'mostly-natural', 'Coen 1995'),

  // ── Hair density (sex-aware) ───────────────────────────────────
  D('hairDensity', 20, 'female', -1, 0, +1, 'partly-controllable', 'Olsen 1994'),
  D('hairDensity', 20, 'male', -2, -1, +1, 'partly-controllable', 'Olsen 1994'),
  D('hairDensity', 30, 'female', -1, 0, +1, 'partly-controllable', 'Olsen 1994'),
  D('hairDensity', 30, 'male', -3, -2, 0, 'partly-controllable', 'Olsen 1994'),
  D('hairDensity', 40, 'female', -2, -1, 0, 'partly-controllable', 'Olsen 1994'),
  D('hairDensity', 40, 'male', -4, -2, -1, 'partly-controllable', 'Olsen 1994'),
  D('hairDensity', 50, 'female', -3, -2, 0, 'partly-controllable', 'Olsen 1994'),
  D('hairDensity', 50, 'male', -5, -3, -1, 'partly-controllable', 'Olsen 1994'),
  D('hairDensity', 60, 'female', -4, -2, -1, 'partly-controllable', 'Olsen 1994'),
  D('hairDensity', 60, 'male', -5, -3, -1, 'partly-controllable', 'Olsen 1994'),
  D('hairDensity', 70, 'female', -5, -3, -1, 'partly-controllable', 'Olsen 1994'),
  D('hairDensity', 70, 'male', -5, -3, -1, 'partly-controllable', 'Olsen 1994'),

  // ── Overall (averaged composite for chart-level callouts) ──────
  D('overall', 20, 'combined', -1, 0, +1, 'partly-controllable', 'composite'),
  D('overall', 30, 'combined', -2, -1, +1, 'partly-controllable', 'composite'),
  D('overall', 40, 'combined', -3, -2, 0, 'partly-controllable', 'composite'),
  D('overall', 50, 'combined', -5, -3, -1, 'partly-controllable', 'composite'),
  D('overall', 60, 'combined', -6, -4, -2, 'partly-controllable', 'composite'),
  D('overall', 70, 'combined', -7, -5, -2, 'partly-controllable', 'composite'),
];

export function getBand(
  metric: FaceMetric,
  ageDecade: AgingDecade,
  sexAtBirth: SexAtBirth | 'unknown',
): AgingBand | null {
  const sex: SexAtBirth = sexAtBirth === 'unknown' ? 'combined' : sexAtBirth;
  let band = AGING_BANDS.find(
    (b) => b.metric === metric && b.ageDecade === ageDecade && b.sexAtBirth === sex,
  );
  if (!band && sex !== 'combined') {
    // Graceful fallback to combined band when sex-specific data missing.
    band = AGING_BANDS.find(
      (b) => b.metric === metric && b.ageDecade === ageDecade && b.sexAtBirth === 'combined',
    );
  }
  return band ?? null;
}

export const BAND_DATASET_VERSION = '2026-04-1';
