/**
 * 3D capture math (file 32).
 *
 * - Pose gating: <= 5° tolerance is "in_band"; 5°–12° is a "caveat";
 *   >= 12° offers a rescan.
 * - Lighting band: ±15% of canonical lux is "in_band"; > 40% out_of_band.
 * - Mesh / depth raw data NEVER persisted.
 */

import {
  conjugate,
  correctionFor,
  fromEuler,
  multiply,
  normalize,
  type Quaternion,
} from './quaternion';
import type { Capture3D, CanonicalPose } from '@/types';

export type { Quaternion };
export {
  fromEuler,
  conjugate,
  multiply,
  normalize,
  correctionFor,
} from './quaternion';

export function poseGateFromError(errorRad: number): Capture3D['poseGate'] {
  const fiveDeg = 0.0873;
  const twelveDeg = 0.2094;
  if (errorRad <= fiveDeg) return 'in_band';
  if (errorRad < twelveDeg) return 'caveat';
  return 'rescan_offered';
}

export function lightingBand(currentLux: number, canonicalLux: number): {
  band: 'in_band' | 'out_of_band_low' | 'out_of_band_high';
  deltaPct: number;
} {
  if (canonicalLux <= 0) return { band: 'in_band', deltaPct: 0 };
  const deltaPct = (currentLux - canonicalLux) / canonicalLux;
  const abs = Math.abs(deltaPct);
  if (abs <= 0.15) return { band: 'in_band', deltaPct };
  if (abs <= 0.4)
    return { band: deltaPct < 0 ? 'out_of_band_low' : 'out_of_band_high', deltaPct };
  return { band: deltaPct < 0 ? 'out_of_band_low' : 'out_of_band_high', deltaPct };
}

/**
 * Build a Capture3D record from a captured rotation + the user's canonical
 * pose. Volume change is measured separately when scene-depth is available.
 */
export function buildCapture3D(args: {
  captured: { yaw: number; pitch: number; roll: number; lightIntensity: number };
  canonical?: CanonicalPose;
  qualityFlags?: Capture3D['qualityFlags'];
  symmetry3D: number;
  volumeChangeMm?: number;
}): Capture3D {
  const capturedQ = fromEuler(args.captured.yaw, args.captured.pitch, args.captured.roll);
  const canonicalQ = args.canonical
    ? args.canonical.rotation
    : { w: 1, x: 0, y: 0, z: 0 };

  // q_correction = q_canonical * conjugate(q_captured)
  const correction = correctionFor(canonicalQ, capturedQ);
  // Pose error magnitude — angle of the correction quaternion.
  const poseErrorRad = 2 * Math.acos(Math.min(1, Math.max(-1, Math.abs(correction.w))));

  const canonicalLux = args.canonical?.distance ? 500 : 500; // placeholder, file 32 stores lux on canonical pose
  const { band, deltaPct } = lightingBand(args.captured.lightIntensity, canonicalLux);
  const qualityFlags = (args.qualityFlags ?? []).slice();
  if (band === 'out_of_band_low') qualityFlags.push('lighting_dim');
  if (band === 'out_of_band_high') qualityFlags.push('lighting_bright');
  if (poseErrorRad > 0.0873 && poseErrorRad < 0.2094) qualityFlags.push('pose_caveat');
  if (poseErrorRad >= 0.2094) qualityFlags.push('pose_rescan');

  return {
    poseErrorRad,
    poseGate: poseGateFromError(poseErrorRad),
    symmetry3D: args.symmetry3D,
    volumeChangeMm: args.volumeChangeMm,
    lightingDeltaPct: deltaPct,
    qualityFlags,
  };
}

/**
 * Decide whether to silently re-anchor the canonical pose. File 32: every
 * ~18 months, capture a fresh canonical pose so age-related geometry shift
 * doesn't accumulate against an outdated baseline.
 */
export function shouldReAnchor(canonical: CanonicalPose, now = new Date()): boolean {
  const captured = new Date(canonical.capturedAt);
  const monthsSince = (now.getTime() - captured.getTime()) / (1000 * 60 * 60 * 24 * 30);
  return monthsSince >= 18;
}
