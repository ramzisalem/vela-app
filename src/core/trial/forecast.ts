/**
 * Day 7 forecast pipeline (file 41).
 *
 * Inputs: baseline scan, optional day-7 scan, scoring framework, age decade,
 * HealthKit connection state.
 *
 * Outputs: a forecast for week 4 — score band, sub-score deltas as ranges,
 * and a single synthesized observation. We project the median expected
 * change with a deliberately wide lower/upper bound (we never project a
 * single number).
 *
 * The trajectory dataset is conservative on purpose. Hard rules:
 *   - Always show a band, never a single number.
 *   - Never project regression.
 *   - The "PREVIEW" watermark is mandatory in the rendering layer.
 */
import type { ScanSession } from '@/types/scan';
import type { ScoringFramework } from '@/types/profile';

export type ForecastSubKey = 'skin' | 'symmetry' | 'grooming' | 'lighting' | 'contour';

export interface Forecast {
  /** Projected overall band at week 4 (0..100 each, lower < upper). */
  scoreBand: { lower: number; upper: number };
  /** Projected sub-score deltas as inclusive ranges. */
  subScoreDeltas: Record<ForecastSubKey, { lower: number; upper: number }>;
  /** True if the projection is deterministic-fallback (AI/dataset failed). */
  isFallback: boolean;
  /** Generated header copy from AI; falls back to canonical line. */
  headerLine: string;
  patternHypothesis: string;
  footerActionLine: string;
}

const DEFAULT_HEADER = 'Your week four, if you stick around.';
const DEFAULT_PATTERN_NO_HK =
  'If you connect Apple Health later, we’ll start watching for sleep patterns soon.';
const DEFAULT_PATTERN_WITH_HK =
  'Sleep and skin clarity tend to track together — three weeks of data and the picture gets sharper.';
const DEFAULT_FOOTER = 'Continue with Vela';

/**
 * Conservative trajectory bands by framework × age decade. Numbers are
 * relative point changes at week 4 from baseline, lower/upper bounds.
 */
const TRAJECTORY_TABLE: Record<ScoringFramework, Record<number, [number, number]>> = {
  feminine: {
    20: [+1, +5],
    30: [+1, +4],
    40: [+1, +4],
    50: [0, +3],
    60: [0, +3],
    70: [0, +2],
  },
  masculine: {
    20: [+2, +6],
    30: [+1, +5],
    40: [+1, +4],
    50: [0, +3],
    60: [0, +3],
    70: [0, +2],
  },
  neutral: {
    20: [+1, +5],
    30: [+1, +4],
    40: [+1, +4],
    50: [0, +3],
    60: [0, +3],
    70: [0, +2],
  },
};

const SUB_SCORE_BASE_RANGE = 2; // ±2 points typical at week 4

export interface BuildForecastInput {
  baselineScan: ScanSession;
  daySevenScan?: ScanSession;
  framework: ScoringFramework;
  ageDecade: number;
  hasHealthKit: boolean;
  /** Optional AI copy override — if omitted, deterministic fallback is used. */
  aiCopy?: {
    headerLine?: string;
    patternHypothesis?: string;
    footerActionLine?: string;
  };
}

export function buildForecast(input: BuildForecastInput): Forecast {
  const { baselineScan, daySevenScan, framework, ageDecade, hasHealthKit, aiCopy } = input;
  const baseScore = baselineScan.scores.overall;

  const decade = clampDecade(ageDecade);
  const range = TRAJECTORY_TABLE[framework]?.[decade] ?? [0, +3];
  const lower = clampScore(baseScore + range[0]);
  const upper = clampScore(baseScore + range[1]);

  // If we have a day-7 scan, narrow the band by half and re-center on
  // observed delta (still a band).
  let scoreBand = { lower, upper };
  if (daySevenScan) {
    const observedDelta = daySevenScan.scores.overall - baselineScan.scores.overall;
    const center = clampScore(baseScore + Math.max(0, observedDelta + range[0] / 2));
    const span = Math.max(2, Math.round((upper - lower) / 2));
    scoreBand = { lower: clampScore(center - span), upper: clampScore(center + span) };
  }

  const widen = daySevenScan ? 1 : 2;
  const subScoreDeltas: Forecast['subScoreDeltas'] = {
    skin: { lower: 1, upper: SUB_SCORE_BASE_RANGE + widen },
    symmetry: { lower: 0, upper: 1 },
    grooming: { lower: 1, upper: SUB_SCORE_BASE_RANGE + widen },
    lighting: { lower: 0, upper: 1 },
    contour: { lower: 0, upper: 2 },
  };

  return {
    scoreBand,
    subScoreDeltas,
    isFallback: !aiCopy,
    headerLine: aiCopy?.headerLine ?? DEFAULT_HEADER,
    patternHypothesis:
      aiCopy?.patternHypothesis ??
      (hasHealthKit ? DEFAULT_PATTERN_WITH_HK : DEFAULT_PATTERN_NO_HK),
    footerActionLine: aiCopy?.footerActionLine ?? DEFAULT_FOOTER,
  };
}

function clampScore(s: number): number {
  return Math.max(0, Math.min(100, Math.round(s)));
}

function clampDecade(age: number): number {
  if (age < 20) return 20;
  if (age >= 70) return 70;
  return Math.floor(age / 10) * 10;
}
