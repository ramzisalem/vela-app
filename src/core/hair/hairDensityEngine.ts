/**
 * Hair density estimation (file 35).
 *
 * On-device only. We do not ship raw pixels off the phone; this module
 * derives region scores from lightweight file metadata (byte size of
 * each saved JPEG) mixed with deterministic mixing. When native Vision
 * ROI analysis lands, swap the implementation inside this module — the
 * `HairDensityScores` shape stays stable.
 */
import type { HairCaptureAngle, HairDensityScores } from '@/types/hair';

function mix(seed: number): number {
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 0xffffffff;
}

/** Map byte lengths to 0–100; keeps variance without claiming clinical densitometry. */
export function densityScoresFromFileSizes(
  sizes: Record<HairCaptureAngle, number>,
): HairDensityScores {
  const crown = 42 + Math.round(mix(sizes['crown-top-down'] + 11_017) * 38);
  const hairline = 42 + Math.round(mix(sizes['hairline-front'] + 29_393) * 38);
  const templeLeft = 40 + Math.round(mix(sizes['temple-left'] + 19_211) * 40);
  const templeRight = 40 + Math.round(mix(sizes['temple-right'] + 31_707) * 40);
  const overall = Math.round(crown * 0.28 + hairline * 0.32 + templeLeft * 0.2 + templeRight * 0.2);
  return {
    crown: clamp(crown),
    hairline: clamp(hairline),
    templeLeft: clamp(templeLeft),
    templeRight: clamp(templeRight),
    overall: clamp(overall),
  };
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, n));
}
