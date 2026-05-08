/**
 * Aging-band engine (file 36).
 *
 * Helpers used by the chart layer + AI proxy. The chart layer is responsible
 * for the visual treatment; this module decides:
 *   - what band to render (or whether to suppress, e.g. during pregnancy)
 *   - where the user's latest score sits (inside / above / below)
 *   - the controllability callout text
 */
import type {
  AgingBand,
  AgingContext,
  AgingDecade,
  BandPosition,
  FaceMetric,
} from '@/types/aging';
import type { LifeStageModeId } from '@/types/lifeStage';
import { getBand } from './bandDataset';

export function decadeForAge(age: number): AgingDecade {
  if (age < 20) return 20;
  if (age >= 70) return 70;
  return (Math.floor(age / 10) * 10) as AgingDecade;
}

/** Some life-stage modes suppress or replace the aging band. */
export function shouldSuppressAgingBand(
  activeModes: ReadonlyArray<LifeStageModeId>,
): { suppressed: boolean; reason?: LifeStageModeId } {
  if (activeModes.includes('pregnancy')) return { suppressed: true, reason: 'pregnancy' };
  if (activeModes.includes('postpartum')) return { suppressed: true, reason: 'postpartum' };
  if (activeModes.includes('cancer_recovery'))
    return { suppressed: true, reason: 'cancer_recovery' };
  return { suppressed: false };
}

/**
 * Compute where the user's latest score sits relative to the band, given
 * their baseline and the years elapsed.
 */
export function computeBandPosition(args: {
  band: AgingBand;
  baselineScore: number;
  latestScore: number;
  ctx: AgingContext;
}): BandPosition {
  const { band, baselineScore, latestScore, ctx } = args;
  if (baselineScore <= 0) return 'unknown';
  const years = Math.max(0.01, ctx.yearsSinceBaseline);
  const lower = baselineScore * Math.pow(1 + band.band.p10 / 100, years);
  const upper = baselineScore * Math.pow(1 + band.band.p90 / 100, years);
  if (latestScore < Math.min(lower, upper)) return 'below';
  if (latestScore > Math.max(lower, upper)) return 'above';
  return 'inside';
}

/**
 * Canonical callout text. Forbidden words enforced by the brand voice
 * lint; this function uses only the approved phrasings from file 36.
 */
export function calloutForPosition(
  metric: FaceMetric,
  position: BandPosition,
  controllabilityHint: AgingBand['controllabilityHint'],
): { text: string; linkLabel?: string } | null {
  if (position === 'inside') return null;
  if (position === 'unknown') return null;
  if (position === 'above') {
    return { text: 'You’re tracking ahead of typical for your age.' };
  }
  if (controllabilityHint === 'mostly-natural') {
    return {
      text:
        'This kind of change is mostly natural at any age. Tracking it gives you a record, not a target.',
    };
  }
  return {
    text:
      'This metric is partly within your control. Sun, sleep, stress and consistency all show up here over time.',
    linkLabel: 'What helps?',
  };
}
