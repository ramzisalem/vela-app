/**
 * Scan types (file 02 + file 32 for 3D additions).
 */

import type { Capture3D, CanonicalPose } from './capture3D';

export type CaptureAngle = 'front' | 'left_turn' | 'right_turn';

export type AlignmentQuality = 'good' | 'acceptable' | 'poor';

export interface FaceTransformData {
  /** 16 floats, row-major. */
  matrix: number[];
  /** Distance to camera, meters. */
  distance: number;
  /** Yaw, pitch, roll in radians. */
  rotation: { yaw: number; pitch: number; roll: number };
  /** Lighting estimate (lumens). */
  lightIntensity: number;
  alignmentQuality: AlignmentQuality;
}

/**
 * Per-region geometric metrics computed on-device. ONLY numeric metrics
 * leave the device (file 06 + 07 protection model) — never landmarks or mesh.
 */
export interface RawMetrics {
  symmetryScore: number; // 0..1
  jawLineSharpness: number;
  faceWidthHeightRatio: number;
  underEyeAreaRatio: number;
  redness: number; // 0..1
  blemishCount?: number;
  poreVisibility?: number; // 0..1
}

export interface ScanScores {
  overall: number; // 0..100 calibrated
  skin: number;
  symmetry: number;
  grooming: number;
  lighting: number;
  contour: number;
  /** File 32: optional 3D-only sub-scores once 3+ scans exist. */
  volumeChangeMm?: number;
  perceivedAge?: number;
}

export interface ScanContext {
  sleepHoursLastNight?: number;
  stressNote?: string;
  newProducts?: string[];
  newTreatments?: string[];
  /** Lighting band (file 32). */
  lightingBand?: 'in_band' | 'out_of_band_low' | 'out_of_band_high';
}

export interface ScanSession {
  id: string;
  userId: string;
  createdAt: string;
  weekNumber: number;
  isBaseline: boolean;
  capturedAngles: CaptureAngle[];
  /** Per-angle native data. */
  transforms: Partial<Record<CaptureAngle, FaceTransformData>>;
  /** On-device file paths to persisted scan photos. */
  photoPaths: Partial<Record<CaptureAngle, string>>;
  rawMetrics: RawMetrics;
  scores: ScanScores;
  context: ScanContext;
  /** File 32 — optional 3D capture data + canonical pose. */
  capture3D?: Capture3D;
  canonicalPose?: CanonicalPose;
  /** Free-text AI explanations (file 06). */
  scoreExplanation?: string;
  /** Whether the qualitative AI portions resolved successfully. */
  qualitativePending?: boolean;
  /** Cached share-card render path (file 13). */
  shareCardCached?: string;
  /** Sync state — `pending_sync` when profile preflight failed (file 03 + file 05). */
  syncStatus: 'synced' | 'pending_sync' | 'failed';
}

/**
 * Score delta utility. CANONICAL (file 02 + 10): if the result is `undefined`,
 * the dashboard MUST render a `<FirstScanPill />` rather than an empty space.
 */
export function getScoreDelta(
  current: ScanSession,
  previous: ScanSession | undefined,
): number | undefined {
  if (!previous) return undefined;
  return Math.round(current.scores.overall - previous.scores.overall);
}
