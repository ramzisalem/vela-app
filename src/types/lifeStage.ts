/**
 * Life-stage modes (file 48). The framework + 3 modes ship at v1; HRT and
 * cancer-recovery within first 6 weeks of launch after sensitivity review.
 *
 * CANONICAL: any file that imports `useLifeStageMode` MUST register its
 * surfaces in `MODE_AWARE_SURFACES`. CI fails otherwise (ESLint rule
 * `vela/mode-aware-must-register`).
 */

export type LifeStageModeId =
  | 'pregnancy'
  | 'postpartum'
  | 'menopause'
  | 'hrt_estrogen'
  | 'hrt_testosterone'
  | 'cancer_recovery';

export interface LifeStageMode {
  id: LifeStageModeId;
  /** ISO date when the user enabled the mode. */
  enabledAt: string;
  /** Optional ISO date — when the mode auto-disables. */
  expectedEndDate?: string;
  /** Whether the user has consented to AI being aware of this mode (sensitive). */
  aiOptIn: boolean;
  /** Whether the user has consented to share this mode with their clinic (file 49). */
  clinicOptIn: boolean;
}

/**
 * Higher-precedence modes win when overlapping. (Pregnancy + postpartum
 * cannot coexist by definition; cancer-recovery overrides cosmetic content
 * even when other modes are active.)
 */
export const PRECEDENCE_ORDER: ReadonlyArray<LifeStageModeId> = [
  'cancer_recovery',
  'pregnancy',
  'postpartum',
  'menopause',
  'hrt_estrogen',
  'hrt_testosterone',
];

/**
 * The mode-aware surface registry (file 48).
 *
 * Every consumer of `useLifeStageMode()` declares its surfaces here. CI uses
 * the contents of this constant to verify the ESLint rule.
 */
export interface ModeAwareSurface {
  /** Stable string id (also used by analytics). */
  id: string;
  /** Owning file ("file_NN"). */
  ownerFile: string;
  /** Human-readable description. */
  description: string;
  /** Modes that suppress / change the surface. */
  affectedBy: ReadonlyArray<LifeStageModeId>;
}

export const MODE_AWARE_SURFACES: ReadonlyArray<ModeAwareSurface> = [
  {
    id: 'aiPrompt.scoreExplanation',
    ownerFile: 'file_06',
    description: 'LIFE_STAGE_CONTEXT prepended to score explanations.',
    affectedBy: ['pregnancy', 'postpartum', 'menopause', 'hrt_estrogen', 'hrt_testosterone'],
  },
  {
    id: 'routine.contraindications',
    ownerFile: 'file_09',
    description: 'RoutineEngine excludes tasks contraindicated in mode.',
    affectedBy: ['pregnancy', 'postpartum', 'cancer_recovery'],
  },
  {
    id: 'dashboard.slot2.modeNarrative',
    ownerFile: 'file_10',
    description: 'Replaces certain slot-2 cards with mode-aware narrative.',
    affectedBy: ['pregnancy', 'postpartum', 'menopause', 'cancer_recovery'],
  },
  {
    id: 'notifications.tone',
    ownerFile: 'file_12',
    description: 'Notification copy register softens during sensitive modes.',
    affectedBy: ['pregnancy', 'postpartum', 'menopause', 'cancer_recovery'],
  },
  {
    id: 'agingBand.suppression',
    ownerFile: 'file_36',
    description: 'Aging band swapped/suppressed during pregnancy/postpartum/cancer recovery.',
    affectedBy: ['pregnancy', 'postpartum', 'cancer_recovery'],
  },
  {
    id: 'streaks.relaxed',
    ownerFile: 'file_39',
    description: 'Auto-freeze rules expand during sensitive modes.',
    affectedBy: ['pregnancy', 'postpartum', 'cancer_recovery'],
  },
  {
    id: 'trial.forecastSuppression',
    ownerFile: 'file_41',
    description: 'Day-7 forecast suppressed in pregnancy/cancer recovery.',
    affectedBy: ['pregnancy', 'cancer_recovery'],
  },
  {
    id: 'longTerm.yoyDisclosure',
    ownerFile: 'file_45',
    description: 'YoY overlay shows disclosure across mode windows, not silent suppression.',
    affectedBy: ['pregnancy', 'postpartum', 'menopause', 'hrt_estrogen', 'hrt_testosterone'],
  },
  {
    id: 'reactivation.emailDigest',
    ownerFile: 'file_46',
    description: 'Lapsed-user digest copy is mode-aware.',
    affectedBy: ['pregnancy', 'postpartum', 'menopause', 'cancer_recovery'],
  },
  {
    id: 'cancelSave.offerCopy',
    ownerFile: 'file_47',
    description: 'Save-flow copy includes bodyForMode and offer adjustment.',
    affectedBy: ['pregnancy', 'postpartum', 'menopause', 'cancer_recovery'],
  },
  {
    id: 'evidence.contraindicationBanner',
    ownerFile: 'file_50',
    description: 'Evidence sheet shows contraindication banner during applicable modes.',
    affectedBy: ['pregnancy', 'postpartum', 'cancer_recovery'],
  },
];
