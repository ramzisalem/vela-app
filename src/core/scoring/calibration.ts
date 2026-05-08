/**
 * Calibration helpers (file 05). Maps raw 0..1 measurements to calibrated
 * 0..100 scores using framework-aware S-curves so distributions feel right
 * across `masculine` / `feminine` / `neutral` users.
 */
import type { ScoringFramework } from '@/types';

export function calibrateScore(raw: number, framework: ScoringFramework, sub: string): number {
  // Sigmoid centered around a framework-aware mean. Means and steepness
  // are tuned so the median user lands near 70 (file 05 spec target).
  const m = mean(framework, sub);
  const k = steepness(framework, sub);
  const s = 1 / (1 + Math.exp(-k * (raw - m)));
  return Math.round(s * 100);
}

function mean(framework: ScoringFramework, sub: string): number {
  // Shifted by sub-score; deliberately not symmetric.
  const base =
    sub === 'symmetry' ? 0.55 : sub === 'skin' ? 0.5 : sub === 'grooming' ? 0.5 : 0.5;
  if (framework === 'masculine') return base - 0.02;
  if (framework === 'feminine') return base + 0.02;
  return base;
}

function steepness(framework: ScoringFramework, _sub: string): number {
  if (framework === 'neutral') return 6;
  return 7;
}
