/**
 * Monthly Wrapped types (file 38).
 *
 * Generated server-side via the `generate-monthly-wrapped` Edge Function.
 * Statistical cards render immediately; AI-written cards stream in.
 */
import type { FaceMetric } from './aging';

export type WrappedCardKind =
  | 'cover'
  | 'scans'
  | 'streak'
  | 'metric-up'
  | 'metric-steady'
  | 'metric-down'
  | 'pattern'
  | 'in-your-words'
  | 'treatment'
  | 'quiet-note'
  | 'outro';

export type WrappedCard =
  | { kind: 'cover'; month: string; tagline: string }
  | { kind: 'scans'; count: number; consistencyNote?: string }
  | { kind: 'streak'; days: number; calendarHeatmap: boolean[] }
  | { kind: 'metric-up'; metric: FaceMetric; deltaPoints: number; sparkline: number[] }
  | { kind: 'metric-steady'; metric: FaceMetric }
  | {
      kind: 'metric-down';
      metric: FaceMetric;
      deltaPoints: number;
      band: 'within' | 'outside';
    }
  | { kind: 'pattern'; faceMetric: FaceMetric; healthSignal: string; note: string }
  | { kind: 'in-your-words'; threeFragments: string[] }
  | { kind: 'treatment'; treatmentId: string; weeksIn: number; progressNote: string }
  | { kind: 'quiet-note'; body: string }
  | { kind: 'outro' };

export interface MonthlyWrapped {
  id: string;
  userId: string;
  /** YYYY-MM */
  month: string;
  generatedAt: string;
  cards: WrappedCard[];
  /** True when AI-dependent cards have resolved. */
  aiCardsReady: boolean;
  /** Deterministic color hue per month (xxhash32(userId|month)). */
  colorSeed?: string;
}
