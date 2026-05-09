/**
 * Non-diagnostic hints from on-device scan metrics only (file 07).
 * - Never infers or writes ethnicity (Q3) or other sensitive self-ID.
 * - No imagery or landmarks; uses RawMetrics / sub-scores only.
 * - Hints are suggestions until the user confirms or edits (provenance in store).
 */
import type { QuestionId } from '@/core/onboarding/questions';
import { QUESTION_BANK } from '@/core/onboarding/questions';
import type { RawMetrics, ScanScores } from '@/types';

export interface ScanMetricHint {
  value: string | string[];
  /** Short label for the suggestion chip. */
  label: string;
}

const HINTABLE_POST_SCAN_IDS: QuestionId[] = [
  'q5_hair',
  'q6_facial_hair',
  'q7_face_shape',
  'q8_skin_conditions',
  'q28_focus_regions',
];

function optionLabel(questionId: QuestionId, value: string): string {
  const q = QUESTION_BANK.find((x) => x.id === questionId);
  if (q?.type === 'select' || q?.type === 'multiselect') {
    const opt = q.options.find((o) => o.value === value);
    if (opt) return opt.label;
  }
  return value;
}

/**
 * Conservative heuristics. Returns null when we prefer not to guess.
 */
export function getScanMetricHint(
  questionId: QuestionId,
  raw: RawMetrics,
  scores: ScanScores,
): ScanMetricHint | null {
  if (!HINTABLE_POST_SCAN_IDS.includes(questionId)) return null;

  switch (questionId) {
    case 'q7_face_shape': {
      const r = raw.faceWidthHeightRatio;
      if (!Number.isFinite(r)) return null;
      let value: string;
      if (r >= 0.88) value = 'round';
      else if (r <= 0.78) value = 'oblong';
      else value = 'oval';
      return { value, label: optionLabel(questionId, value) };
    }
    case 'q8_skin_conditions': {
      const out: string[] = [];
      if (raw.redness >= 0.42) out.push('redness');
      const blem = raw.blemishCount ?? 0;
      if (blem >= 4) out.push('acne_active');
      const pores = raw.poreVisibility ?? 0;
      if (pores >= 0.52) out.push('large_pores');
      if (out.length === 0) return null;
      const capped = out.slice(0, 3);
      const label = capped.map((v) => optionLabel(questionId, v)).join(', ');
      return { value: capped, label };
    }
    case 'q6_facial_hair': {
      const g = scores.grooming;
      if (!Number.isFinite(g)) return null;
      let value: string;
      if (g >= 71) value = 'clean_shaven';
      else if (g <= 52) value = 'short_beard';
      else return null;
      return { value, label: optionLabel(questionId, value) };
    }
    case 'q5_hair': {
      const c = scores.contour;
      if (!Number.isFinite(c)) return null;
      if (c >= 62) return { value: 'average', label: optionLabel(questionId, 'average') };
      return null;
    }
    case 'q28_focus_regions': {
      const regions: string[] = [];
      if (raw.underEyeAreaRatio >= 0.045) regions.push('eyes');
      if (raw.redness >= 0.38) regions.push('overall_skin');
      if (raw.jawLineSharpness <= 0.42) regions.push('jaw');
      if (regions.length === 0) return null;
      const label = regions.map((v) => optionLabel(questionId, v)).join(', ');
      return { value: regions, label };
    }
    default:
      return null;
  }
}
