/**
 * Correlation engine (file 33).
 *
 * Pearson r over a rolling 8-week window per (face_metric, signal) pair.
 * Filters by p < 0.1 and n ≥ 6. Returns the top 3 strongest pairs.
 *
 * All math is deterministic and on-device. The AI proxy receives only the
 * aggregated numbers (r, p, n) — never raw HealthKit values.
 */
import type {
  CorrelationCandidate,
  FaceMetricKey,
  HealthSignal,
  HealthSnapshot,
} from '@/types/health';
import type { ScanSession } from '@/types/scan';

const WINDOW_WEEKS = 8;
const MIN_N = 6;
const ALPHA = 0.1;

interface AlignedSample {
  date: string;
  face: number;
  signal: number;
}

export interface BuildCorrelationsInput {
  scans: ReadonlyArray<ScanSession>;
  snapshots: ReadonlyArray<HealthSnapshot>;
  /** Reference date (defaults to now). Window is the WINDOW_WEEKS prior. */
  now?: Date;
}

const FACE_METRIC_KEYS: ReadonlyArray<FaceMetricKey> = [
  'overall',
  'redness',
  'clarity',
  'eyeArea',
  'cheekVolume',
  'jawDefinition',
  'symmetry',
];

const HEALTH_SIGNALS: ReadonlyArray<HealthSignal> = [
  'sleep',
  'hrv',
  'cyclePhase',
  'weight',
  'hydration',
  'alcohol',
  'workout',
];

export function buildCorrelations(
  input: BuildCorrelationsInput,
): ReadonlyArray<CorrelationCandidate> {
  const { scans, snapshots, now = new Date() } = input;
  const windowEnd = now.getTime();
  const windowStart = windowEnd - WINDOW_WEEKS * 7 * 24 * 60 * 60 * 1000;
  const inWindow = scans
    .filter((s) => Date.parse(s.createdAt) >= windowStart)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  if (inWindow.length < MIN_N) return [];

  const candidates: CorrelationCandidate[] = [];
  for (const metric of FACE_METRIC_KEYS) {
    for (const signal of HEALTH_SIGNALS) {
      const aligned = alignSamples(inWindow, snapshots, metric, signal);
      if (aligned.length < MIN_N) continue;
      const face = aligned.map((a) => a.face);
      const sig = aligned.map((a) => a.signal);
      const r = pearsonR(face, sig);
      if (Number.isNaN(r)) continue;
      const p = approxPValue(r, aligned.length);
      if (p > ALPHA) continue;
      candidates.push({
        faceMetric: metric,
        healthSignal: signal,
        pearsonR: r,
        pValue: p,
        sampleSize: aligned.length,
        faceValues: face,
        signalValues: sig,
      });
    }
  }

  candidates.sort((a, b) => Math.abs(b.pearsonR) - Math.abs(a.pearsonR));
  return candidates.slice(0, 3);
}

function alignSamples(
  scans: ReadonlyArray<ScanSession>,
  snapshots: ReadonlyArray<HealthSnapshot>,
  metric: FaceMetricKey,
  signal: HealthSignal,
): ReadonlyArray<AlignedSample> {
  const byDate = new Map<string, HealthSnapshot>();
  for (const s of snapshots) byDate.set(s.date, s);
  const out: AlignedSample[] = [];
  for (const scan of scans) {
    const date = scan.createdAt.slice(0, 10);
    const snap = byDate.get(date);
    if (!snap) continue;
    const face = readFaceMetric(scan, metric);
    const sig = readSignal(snap, signal);
    if (face === null || sig === null) continue;
    out.push({ date, face, signal: sig });
  }
  return out;
}

function readFaceMetric(scan: ScanSession, metric: FaceMetricKey): number | null {
  const s = scan.scores;
  switch (metric) {
    case 'overall':
      return s.overall;
    case 'redness':
      return scan.rawMetrics.redness * 100;
    case 'clarity':
      return s.skin;
    case 'eyeArea':
      return scan.rawMetrics.underEyeAreaRatio * 100;
    case 'cheekVolume':
      return null;
    case 'jawDefinition':
      return s.contour;
    case 'symmetry':
      return s.symmetry;
  }
}

function readSignal(snap: HealthSnapshot, signal: HealthSignal): number | null {
  switch (signal) {
    case 'sleep':
      return snap.sleepHours;
    case 'hrv':
      return snap.hrvSdnn;
    case 'cyclePhase':
      return snap.cyclePhase ? cyclePhaseRank(snap.cyclePhase) : null;
    case 'weight':
      return snap.weightKg;
    case 'hydration':
      return snap.hydrationMl;
    case 'alcohol':
      return snap.alcoholDrinks;
    case 'workout':
      return snap.hadIntenseWorkout === null ? null : snap.hadIntenseWorkout ? 1 : 0;
  }
}

function cyclePhaseRank(phase: NonNullable<HealthSnapshot['cyclePhase']>): number {
  switch (phase) {
    case 'menstrual':
      return 0;
    case 'follicular':
      return 1;
    case 'ovulatory':
      return 2;
    case 'luteal':
      return 3;
  }
}

export function pearsonR(xs: ReadonlyArray<number>, ys: ReadonlyArray<number>): number {
  const n = xs.length;
  if (n !== ys.length || n < 2) return NaN;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i] as number;
    sumY += ys[i] as number;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - meanX;
    const dy = (ys[i] as number) - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return NaN;
  return num / Math.sqrt(denX * denY);
}

/**
 * Approximate two-sided p-value for Pearson r via t-distribution.
 * Uses a fast Abramowitz-Stegun normal approximation; good enough for the
 * "is this signal worth surfacing" gate (alpha=0.1, n≥6).
 */
export function approxPValue(r: number, n: number): number {
  if (Math.abs(r) >= 0.999999) return 0;
  if (n < 3) return 1;
  const t = (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r);
  // Two-sided p ≈ 2 * (1 - Φ(|t|)) using normal approximation (df ≥ 4).
  return 2 * (1 - normalCdf(Math.abs(t)));
}

function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * x);
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return 1 - p;
}
