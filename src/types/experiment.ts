/**
 * Experiment Mode types (file 44).
 *
 * One change at a time. Hold the routine steady. Be honest about small
 * samples. Never recommend the change. Bias-aware.
 */
import type { FaceMetric } from './aging';
import type { TreatmentId as TreatmentDefinitionId } from './treatment';

/** Reference into the treatment library (file 34). */
export type TreatmentReferenceId = TreatmentDefinitionId | string;

export interface RoutineSnapshot {
  taskIds: ReadonlyArray<string>;
  capturedAt: string;
}

export interface ExperimentHypothesis {
  kind:
    | 'add-product'
    | 'remove-product'
    | 'switch-product'
    | 'lifestyle-change'
    | 'frequency-change'
    | 'custom';
  /** Plain-language label, ≤80 chars. */
  label: string;
  referenceTreatmentId?: TreatmentReferenceId;
  /** ≤140 chars; the daily action the user has committed to. */
  dailyAction: string;
}

export type ExperimentStatus = 'planning' | 'active' | 'completed' | 'aborted';

export interface ComplianceLogEntry {
  date: string;
  complied: boolean;
}

export type ExperimentEffectSize =
  | 'meaningful'
  | 'small'
  | 'unclear'
  | 'none'
  | 'inverted';

export type ConfounderKind =
  | 'sleep-shift'
  | 'stress-shift'
  | 'season-shift'
  | 'cycle-shift'
  | 'weight-shift'
  | 'travel'
  | 'illness'
  | 'big-life-event';

export interface Confounder {
  kind: ConfounderKind;
  /** ≤80 chars. */
  evidence: string;
}

export interface ExperimentVerdict {
  effectSize: ExperimentEffectSize;
  primaryMetricDelta: number;
  primaryMetricDeltaConfidence: number;
  expectedDriftFromBand: number;
  attributableDelta: number;
  confounders: Confounder[];
  /** ≤120 words verdict copy. */
  copy: string;
  complianceRate: number;
  recommendation: 'continue' | 'stop' | 'run-again' | 'try-something-else';
  generatedAt: string;
}

export interface Experiment {
  id: string;
  userId: string;
  hypothesis: ExperimentHypothesis;
  primaryMetric: FaceMetric;
  secondaryMetrics?: FaceMetric[];
  durationWeeks: 4 | 6 | 8;
  startDate: string;
  endDate: string;
  status: ExperimentStatus;
  baselineRoutineSnapshot: RoutineSnapshot;
  userPrediction?: { direction: 'up' | 'down' | 'no-change'; confidence: 1 | 2 | 3 };
  complianceLog: ComplianceLogEntry[];
  verdict?: ExperimentVerdict;
  createdAt: string;
  updatedAt: string;
}
