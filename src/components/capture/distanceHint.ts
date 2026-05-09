/**
 * Distance / lighting / alignment hint copy (file 04 + 05 + 28 a11y).
 *
 * Canonical vocabulary (file 28 capture audio-guidance table — 12 strings,
 * throttled 1/sec). Sentence case, no exclamation marks.
 */
import type { CaptureAngle, DistanceHint, FaceTrackingState } from '../../../modules/vela-face-tracker/src/types';

/** Lookup avoids Hermes edge cases with sibling `export function` call sites in the same module. */
const DISTANCE_COACHING: Record<DistanceHint, string> = {
  too_close: 'Move a little further away',
  too_far: 'Move a little closer',
  in_range: '',
  no_face: 'Position your face inside the frame',
};

export function distanceHintText(hint: DistanceHint): string {
  return DISTANCE_COACHING[hint] ?? '';
}

export function lightHintText(isOk: boolean): string {
  return isOk ? '' : 'Find a brighter spot';
}

export function neutralHintText(isNeutral: boolean): string {
  return isNeutral ? '' : 'Soften your expression';
}

export function alignmentHintText(yawOk: boolean, pitchOk: boolean, rollOk: boolean): string {
  if (yawOk && pitchOk && rollOk) return '';
  if (!yawOk) return 'Turn your head so your nose points at the camera';
  if (!pitchOk) return 'Lift your chin slightly';
  if (!rollOk) return 'Straighten your head';
  return 'Adjust your alignment';
}

/** Pose coaching: native yaw/pitch/roll flags are geometric gates, not Euler rows — keep copy generic. */
export function alignmentHintForAngle(
  angle: CaptureAngle,
  yawOk: boolean,
  pitchOk: boolean,
  rollOk: boolean,
): string {
  if (yawOk && pitchOk && rollOk) return '';
  if (!yawOk) {
    if (angle === 'left_turn') return 'Turn slowly until your left cheek comes toward the camera';
    if (angle === 'right_turn') return 'Turn slowly until your right cheek comes toward the camera';
    return 'Face the camera straight on';
  }
  if (!pitchOk || !rollOk) return 'Straighten how you tilt your head with the preview';
  return '';
}

/**
 * Single primary coaching line for the capture scanner (priority: distance →
 * light → pose → expression → hold debounce).
 */
export function scannerInstruction(angle: CaptureAngle, state: FaceTrackingState | null): string {
  if (!state?.isFaceDetected) return 'Line up your face inside the oval';
  const d = DISTANCE_COACHING[state.distanceHint] ?? '';
  if (d) return d;
  if (!state.isLightOk) return lightHintText(false);
  const pose = alignmentHintForAngle(
    angle,
    !!state.alignment?.yawOk,
    !!state.alignment?.pitchOk,
    !!state.alignment?.rollOk,
  );
  if (pose) return pose;
  if (!state.isNeutral) return neutralHintText(false);
  const hold = state.readyHoldProgress ?? 0;
  if (!state.isReady && hold > 0 && hold < 1) return 'Hold steady for a moment';
  return '';
}
