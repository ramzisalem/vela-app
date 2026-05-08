/**
 * Distance / lighting / alignment hint copy (file 04 + 05 + 28 a11y).
 *
 * Canonical vocabulary (file 28 capture audio-guidance table — 12 strings,
 * throttled 1/sec). Sentence case, no exclamation marks.
 */
import type { DistanceHint } from '../../../modules/vela-face-tracker/src/types';

export function distanceHintText(hint: DistanceHint): string {
  switch (hint) {
    case 'too_close':
      return 'Move a little further away';
    case 'too_far':
      return 'Move a little closer';
    case 'in_range':
      return '';
    case 'no_face':
      return 'Position your face inside the frame';
  }
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
