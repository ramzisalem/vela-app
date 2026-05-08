/**
 * Treatment engine (file 34).
 *
 * Evaluates progression milestones against an active user treatment, and
 * unifies contraindications with the active life-stage modes (file 48).
 *
 * The engine never recommends a treatment, never grades the user's
 * choice, and never overrides a user-marked "not representative" week.
 */
import type {
  ProgressionMarker,
  TreatmentDefinition,
  UserTreatment,
} from '@/types/treatment';
import type { LifeStageModeId } from '@/types/lifeStage';

export type ContraindicationSeverity = 'block' | 'warn' | 'inform';

export interface ContraindicationFinding {
  treatmentId: string;
  modeId: LifeStageModeId;
  severity: ContraindicationSeverity;
  /** ≤120 chars; plain language, NOT medical advice. */
  copy: string;
}

const PREGNANCY_CONTRA: ReadonlyArray<string> = [
  'tretinoin',
  'retinol',
  'isotretinoin',
  'hydroquinone',
  'spironolactone',
  'finasteride',
  'dutasteride',
  'tranexamic-acid',
  'salicylic-acid',
  'minoxidil-oral',
  'minoxidil-topical',
  'botox',
  'filler-cheek',
  'filler-lip',
  'filler-jaw',
  'chemical-peel-medium',
  'laser-fractional',
];

const POSTPARTUM_CONTRA: ReadonlyArray<string> = [
  'isotretinoin',
  'finasteride',
  'dutasteride',
];

const CANCER_RECOVERY_INFORM: ReadonlyArray<string> = [
  'hrt-estrogen',
  'hrt-testosterone',
];

export function findContraindications(
  treatmentDefinitionId: string,
  activeModes: ReadonlyArray<LifeStageModeId>,
): ContraindicationFinding[] {
  const findings: ContraindicationFinding[] = [];
  const set = new Set(activeModes);
  if (set.has('pregnancy') && PREGNANCY_CONTRA.includes(treatmentDefinitionId)) {
    findings.push({
      treatmentId: treatmentDefinitionId,
      modeId: 'pregnancy',
      severity: 'block',
      copy:
        'This treatment is generally avoided during pregnancy. Talk with your prescriber.',
    });
  }
  if (set.has('postpartum') && POSTPARTUM_CONTRA.includes(treatmentDefinitionId)) {
    findings.push({
      treatmentId: treatmentDefinitionId,
      modeId: 'postpartum',
      severity: 'warn',
      copy:
        'Some prescribers wait until breastfeeding ends. Worth a conversation with your provider.',
    });
  }
  if (
    set.has('cancer_recovery') &&
    CANCER_RECOVERY_INFORM.includes(treatmentDefinitionId)
  ) {
    findings.push({
      treatmentId: treatmentDefinitionId,
      modeId: 'cancer_recovery',
      severity: 'inform',
      copy:
        'Hormone therapy decisions during recovery belong with your oncology team.',
    });
  }
  return findings;
}

export interface ProgressionContext {
  /** Current week index since startDate (0-indexed). */
  weeksIn: number;
  /** The marker at or just before the current week, if any. */
  currentMarker?: ProgressionMarker;
  /** The next upcoming marker, if any. */
  nextMarker?: ProgressionMarker;
}

export function computeProgression(
  definition: TreatmentDefinition,
  treatment: UserTreatment,
  now: Date = new Date(),
): ProgressionContext {
  const start = new Date(`${treatment.startDate}T00:00:00`);
  const ms = now.getTime() - start.getTime();
  const weeksIn = Math.max(0, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)));
  const sorted = [...definition.expectedProgression].sort(
    (a, b) => a.weekNumber - b.weekNumber,
  );
  let currentMarker: ProgressionMarker | undefined;
  let nextMarker: ProgressionMarker | undefined;
  for (const m of sorted) {
    if (m.weekNumber <= weeksIn) currentMarker = m;
    else if (!nextMarker) nextMarker = m;
  }
  const ctx: ProgressionContext = { weeksIn };
  if (currentMarker) ctx.currentMarker = currentMarker;
  if (nextMarker) ctx.nextMarker = nextMarker;
  return ctx;
}

/**
 * The first scan on or after `startDate` becomes the baseline. If the user
 * has scans both before and on/after startDate, we always use the on/after
 * one — pre-treatment scans are reference, not baseline.
 */
export function pickBaselineSessionId(
  treatment: UserTreatment,
  scanSessionDates: ReadonlyArray<{ id: string; createdAt: string }>,
): string | undefined {
  const startTs = Date.parse(`${treatment.startDate}T00:00:00`);
  const after = scanSessionDates
    .filter((s) => Date.parse(s.createdAt) >= startTs)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return after[0]?.id;
}
