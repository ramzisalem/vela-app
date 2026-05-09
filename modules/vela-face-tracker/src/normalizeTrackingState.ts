import type { DistanceHint, FaceTrackingState } from './types';

const DISTANCE_HINTS: readonly DistanceHint[] = ['too_close', 'too_far', 'in_range', 'no_face'];

/** objc / bridge sometimes forwards BOOL as 0/1 — treat explicitly so Pose pills never stuck “off” falsely. */
function nativeBool(raw: unknown): boolean {
  return raw === true || raw === 1;
}

function coerceDistanceHint(raw: unknown): DistanceHint {
  if (typeof raw === 'string' && (DISTANCE_HINTS as readonly string[]).includes(raw)) {
    return raw as DistanceHint;
  }
  return 'in_range';
}

/**
 * Native events are loosely typed on the bridge. Normalize so UI metrics
 * (distance / light / pose / calm) always have defined booleans and each
 * emission is a fresh object (reliable React updates).
 */
export function normalizeTrackingState(raw: unknown): FaceTrackingState {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const align =
    o.alignment && typeof o.alignment === 'object' ? (o.alignment as Record<string, unknown>) : {};
  const rot =
    o.rotation && typeof o.rotation === 'object' ? (o.rotation as Record<string, unknown>) : {};

  const isFaceDetected = nativeBool(o.isFaceDetected);
  // Never trust distance / pose / ready when there is no face — avoids stuck pills if the bridge drops fields.
  const distanceHint: DistanceHint = isFaceDetected ? coerceDistanceHint(o.distanceHint) : 'no_face';
  const neutral = isFaceDetected && nativeBool(o.isNeutral);
  const ready = isFaceDetected && nativeBool(o.isReady);
  const holdRaw =
    typeof o.readyHoldProgress === 'number' && Number.isFinite(o.readyHoldProgress) ? o.readyHoldProgress : 0;
  const readyHoldProgress = isFaceDetected && !ready ? holdRaw : ready ? 1 : 0;

  return {
    isFaceDetected,
    isReady: ready,
    readyHoldProgress,
    distance: typeof o.distance === 'number' ? o.distance : 0,
    distanceHint,
    lightIntensity: typeof o.lightIntensity === 'number' ? o.lightIntensity : 0,
    isLightOk: nativeBool(o.isLightOk),
    isNeutral: neutral,
    alignment: isFaceDetected
      ? {
          yawOk: nativeBool(align.yawOk),
          pitchOk: nativeBool(align.pitchOk),
          rollOk: nativeBool(align.rollOk),
          yaw: typeof align.yaw === 'number' ? align.yaw : 0,
          pitch: typeof align.pitch === 'number' ? align.pitch : 0,
          roll: typeof align.roll === 'number' ? align.roll : 0,
        }
      : {
          yawOk: false,
          pitchOk: false,
          rollOk: false,
          yaw: 0,
          pitch: 0,
          roll: 0,
        },
    transform: Array.isArray(o.transform) ? [...(o.transform as number[])] : [],
    rotation: {
      yaw: typeof rot.yaw === 'number' ? rot.yaw : 0,
      pitch: typeof rot.pitch === 'number' ? rot.pitch : 0,
      roll: typeof rot.roll === 'number' ? rot.roll : 0,
    },
  };
}
