/**
 * Experiment verdict engine (file 44).
 *
 * Honest middle ground: "there's a real-looking effect" / "it's hard to say"
 * / "probably nothing". The math is cautious; the copy is hedged.
 *
 * Inputs:
 *   - baseline metric value (week 0)
 *   - end metric value (final week of experiment)
 *   - expected drift over the same window from the aging band (file 36)
 *   - compliance rate
 *   - confounders detected (sleep / stress / cycle / travel / illness / etc.)
 *
 * Outputs:
 *   - effectSize bucket
 *   - attributableDelta (observed - expected drift)
 *   - confidence (function of n, compliance, confounder count)
 *   - recommendation
 */
import type {
  Confounder,
  ExperimentEffectSize,
  ExperimentVerdict,
} from '@/types/experiment';

export interface VerdictInput {
  baselineMetric: number;
  endMetric: number;
  expectedDriftPoints: number;
  scanCount: number;
  complianceRate: number;
  confounders: ReadonlyArray<Confounder>;
}

const MIN_COMPLIANCE_FOR_VERDICT = 0.7;
const MEANINGFUL_THRESHOLD = 4;
const SMALL_THRESHOLD = 2;
const INVERTED_THRESHOLD = -2;

export function computeVerdict(input: VerdictInput): ExperimentVerdict {
  const { baselineMetric, endMetric, expectedDriftPoints, scanCount, complianceRate, confounders } =
    input;

  const observedDelta = Math.round((endMetric - baselineMetric) * 10) / 10;
  const attributable = Math.round((observedDelta - expectedDriftPoints) * 10) / 10;

  // Effect-size bucket.
  let effectSize: ExperimentEffectSize;
  if (complianceRate < MIN_COMPLIANCE_FOR_VERDICT) {
    effectSize = 'unclear';
  } else if (attributable >= MEANINGFUL_THRESHOLD) {
    effectSize = 'meaningful';
  } else if (attributable >= SMALL_THRESHOLD) {
    effectSize = 'small';
  } else if (attributable <= INVERTED_THRESHOLD) {
    effectSize = 'inverted';
  } else if (Math.abs(attributable) < SMALL_THRESHOLD) {
    effectSize = 'none';
  } else {
    effectSize = 'unclear';
  }

  const baseConfidence = Math.min(1, scanCount / 8);
  const compliancePenalty = complianceRate < 0.7 ? 0.4 : complianceRate < 0.9 ? 0.15 : 0;
  const confounderPenalty = Math.min(0.4, confounders.length * 0.1);
  const confidence = Math.max(
    0,
    Math.round((baseConfidence - compliancePenalty - confounderPenalty) * 100) / 100,
  );

  const recommendation = recommend(effectSize);
  const copy = composeCopy(effectSize, attributable, complianceRate, confounders);

  return {
    effectSize,
    primaryMetricDelta: observedDelta,
    primaryMetricDeltaConfidence: confidence,
    expectedDriftFromBand: expectedDriftPoints,
    attributableDelta: attributable,
    confounders: [...confounders],
    copy,
    complianceRate,
    recommendation,
    generatedAt: new Date().toISOString(),
  };
}

function recommend(effect: ExperimentEffectSize): ExperimentVerdict['recommendation'] {
  switch (effect) {
    case 'meaningful':
    case 'small':
      return 'continue';
    case 'inverted':
      return 'stop';
    case 'none':
      return 'try-something-else';
    case 'unclear':
      return 'run-again';
  }
}

function composeCopy(
  effect: ExperimentEffectSize,
  attributable: number,
  compliance: number,
  confounders: ReadonlyArray<Confounder>,
): string {
  const parts: string[] = [];
  switch (effect) {
    case 'meaningful':
      parts.push(
        `Looks like a real effect: about ${signed(attributable)} points beyond what we’d expect from baseline drift.`,
      );
      break;
    case 'small':
      parts.push(
        `A small lift, around ${signed(attributable)} points beyond drift. Worth keeping going if it’s easy to maintain.`,
      );
      break;
    case 'none':
      parts.push('Probably nothing. The change you tested didn’t move the needle on its own.');
      break;
    case 'inverted':
      parts.push(
        `Things went the other way — about ${signed(attributable)} points off the baseline. Worth pausing and looking at why.`,
      );
      break;
    case 'unclear':
      parts.push('It’s hard to say. The signal isn’t clean enough to call.');
      break;
  }
  if (compliance < 0.9) {
    parts.push(
      `Compliance was ${Math.round(compliance * 100)}% — the picture sharpens when the change is daily.`,
    );
  }
  if (confounders.length > 0) {
    parts.push(
      `Other things moved this month too: ${confounders.map((c) => labelFor(c.kind)).join(', ')}.`,
    );
  }
  return parts.join(' ').slice(0, 600);
}

function signed(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1);
}

function labelFor(kind: Confounder['kind']): string {
  const map: Record<Confounder['kind'], string> = {
    'sleep-shift': 'sleep',
    'stress-shift': 'stress',
    'season-shift': 'seasonal shift',
    'cycle-shift': 'cycle phase',
    'weight-shift': 'weight',
    travel: 'travel',
    illness: 'illness',
    'big-life-event': 'a big life event',
  };
  return map[kind];
}
