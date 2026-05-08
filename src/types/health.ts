/**
 * HealthKit + correlation types (file 33).
 *
 * On-device first: snapshots and correlations stay on the phone. The AI
 * proxy only ever sees aggregated numbers (Pearson r + p-value), never raw
 * HealthKit values.
 */

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export interface HealthSnapshot {
  /** YYYY-MM-DD device-local. */
  date: string;
  sleepHours: number | null;
  sleepEfficiency: number | null;
  sleepLatencyMin: number | null;
  hrvSdnn: number | null;
  restingHeartRate: number | null;
  cyclePhase: CyclePhase | null;
  cycleDay: number | null;
  weightKg: number | null;
  hydrationMl: number | null;
  alcoholDrinks: number | null;
  stepCount: number | null;
  hadIntenseWorkout: boolean | null;
}

export type FaceMetricKey =
  | 'overall'
  | 'redness'
  | 'clarity'
  | 'eyeArea'
  | 'cheekVolume'
  | 'jawDefinition'
  | 'symmetry';

export type HealthSignal =
  | 'sleep'
  | 'hrv'
  | 'cyclePhase'
  | 'weight'
  | 'hydration'
  | 'alcohol'
  | 'workout';

export interface Correlation {
  id: string;
  faceMetric: FaceMetricKey;
  healthSignal: HealthSignal;
  pearsonR: number;
  pValue: number;
  sampleSize: number;
  insight: string;
  recentExample?: { date: string; faceDelta: number; signalValue: number };
  generatedAt: string;
  shownToUserAt?: string;
}

export interface CorrelationCandidate {
  faceMetric: FaceMetricKey;
  healthSignal: HealthSignal;
  pearsonR: number;
  pValue: number;
  sampleSize: number;
  faceValues: ReadonlyArray<number>;
  signalValues: ReadonlyArray<number>;
}

export interface HealthPermissionState {
  /** True if the user has granted any HealthKit permission. */
  granted: boolean;
  /** Identifiers the user has consented to read. */
  readTypes: ReadonlyArray<string>;
  /** Updated at ISO. */
  updatedAt: string;
}
