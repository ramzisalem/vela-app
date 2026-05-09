/**
 * One chart per surface — full specs from `delightContent` are sliced so
 * question steps and milestones each show a different visualization.
 */
import type { MilestoneAfterSection } from '@/core/onboarding/sectionCopy';
import type { DelightVizSpec } from '@/core/onboarding/delightTypes';
import type { QuestionId } from '@/core/onboarding/questions';

export type VizKind = 'ring' | 'sparkline' | 'heatStrip' | 'bars';

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

const KIND_ORDER: readonly VizKind[] = ['sparkline', 'ring', 'heatStrip', 'bars'] as const;

function pickKindFromSpec(kind: VizKind, spec: DelightVizSpec): DelightVizSpec {
  switch (kind) {
    case 'ring':
      return spec.ring ? { ring: spec.ring } : {};
    case 'sparkline':
      return spec.sparkline && spec.sparkline.length > 0 ? { sparkline: spec.sparkline } : {};
    case 'heatStrip':
      return spec.heatStrip && spec.heatStrip.length > 0 ? { heatStrip: spec.heatStrip } : {};
    case 'bars':
      return spec.bars && spec.bars.length > 0 ? { bars: spec.bars, barLabels: spec.barLabels } : {};
    default:
      return {};
  }
}

function firstAvailable(spec: DelightVizSpec, order: readonly VizKind[]): DelightVizSpec {
  for (const k of order) {
    const slice = pickKindFromSpec(k, spec);
    if (Object.keys(slice).length > 0) return slice;
  }
  return {};
}

/** One chart on the question step — rotates type by question so adjacent steps feel distinct. */
export function sliceVizForQuestion(full: DelightVizSpec, questionId: QuestionId): DelightVizSpec {
  const start = hashId(questionId) % KIND_ORDER.length;
  const rotated = [...KIND_ORDER.slice(start), ...KIND_ORDER.slice(0, start)] as VizKind[];
  return firstAvailable(full, rotated);
}

const MILESTONE_PRIMARY: Record<MilestoneAfterSection, VizKind> = {
  A: 'ring',
  B: 'sparkline',
  D: 'heatStrip',
  E: 'bars',
};

/** One chart on the section milestone — fixed mapping per section. */
export function sliceVizForMilestone(section: MilestoneAfterSection, full: DelightVizSpec): DelightVizSpec {
  const primary = MILESTONE_PRIMARY[section];
  const preferred = pickKindFromSpec(primary, full);
  if (Object.keys(preferred).length > 0) return preferred;

  const fallbackOrder: VizKind[] = [primary, ...KIND_ORDER.filter((k) => k !== primary)];
  return firstAvailable(full, fallbackOrder);
}
