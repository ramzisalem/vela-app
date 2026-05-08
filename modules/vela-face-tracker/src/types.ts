export type CaptureAngle = 'front' | 'left_turn' | 'right_turn';

export type DistanceHint = 'too_close' | 'too_far' | 'in_range' | 'no_face';

export interface FaceTransform {
  /** Row-major 16-float 4x4 transform matrix. */
  matrix: number[];
  /** Yaw, pitch, roll in radians. */
  rotation: { yaw: number; pitch: number; roll: number };
  /** Meters to camera. */
  distance: number;
}

export interface AlignmentChecks {
  yawOk: boolean;
  pitchOk: boolean;
  rollOk: boolean;
  yaw: number;
  pitch: number;
  roll: number;
}

export interface FaceTrackingState {
  isFaceDetected: boolean;
  isReady: boolean;
  /** Real-time distance to camera, meters. */
  distance: number;
  /** Reconciled per the plan — Swift now also emits this. */
  distanceHint: DistanceHint;
  /** Lumens. */
  lightIntensity: number;
  isLightOk: boolean;
  isNeutral: boolean;
  alignment: AlignmentChecks;
  transform: number[];
  rotation: { yaw: number; pitch: number; roll: number };
}

export interface CaptureResult {
  imageUri: string;
  transform: number[];
  rotation: { yaw: number; pitch: number; roll: number };
  distance: number;
  lightIntensity: number;
  alignmentQuality: 'good' | 'acceptable' | 'poor';
  capturedAt: string;
}

export interface AlignmentTarget {
  yawRange: [number, number];
  pitchRange: [number, number];
  rollRange: [number, number];
  minDistance: number;
  maxDistance: number;
  rotationToleranceRad: number;
  distanceToleranceM: number;
}

export interface FaceTrackingConfig {
  angle: CaptureAngle;
  alignmentTarget?: Partial<AlignmentTarget>;
  /** File 04 default 500 lumens. */
  minimumLightIntensity?: number;
}

export const DEFAULT_MIN_DISTANCE = 0.25;
export const DEFAULT_MAX_DISTANCE = 0.55;
export const DEFAULT_ROTATION_TOLERANCE_RAD = 0.08;
export const DEFAULT_DISTANCE_TOLERANCE_M = 0.05;
export const DEFAULT_MIN_LIGHT = 500;
