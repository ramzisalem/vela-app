/**
 * Cancel-save flow (file 47).
 *
 * Hard rules:
 *  - One save attempt, never two.
 *  - Selection logic is deterministic and auditable.
 *  - No "are you sure?" multi-step confirms.
 *  - No begging-tone copy anywhere (file 21 forbidden-phrase list).
 *  - Free-text exit-interview responses are PII-redacted at write time.
 */
import type { LifeStageModeId } from './lifeStage';

export interface CancelSaveContext {
  daysSinceFirstScan: number;
  weeksOfPaidSubscription: number;
  totalScans: number;
  scansLast30Days: number;
  totalRoutineDaysCompleted: number;
  routineDaysLast30Days: number;
  hasOpenedDiary: boolean;
  diaryEntriesTotal: number;
  hasActiveTreatment: boolean;
  hasCompletedAnyExperiment: boolean;
  hasMonthlyWrapped: boolean;
  isInTrial: boolean;
  hasEverExtendedTrial: boolean;
  hasReceivedAnniversaryCard: boolean;
  region: string;
  hasFamilySharing: boolean;
  hasActiveLifeStageMode: boolean;
  activeLifeStageModes: ReadonlyArray<LifeStageModeId>;
}

export type CancelSaveOfferKind =
  | 'extension-month-free'
  | 'price-match-yearly'
  | 'consolation-doctor-export'
  | 'no-offer-respectful-goodbye'
  | 'route-to-trial-extension';

export interface CancelSaveOffer {
  kind: CancelSaveOfferKind;
  /** Diagnostic key used in analytics; never a free-text reason. */
  reason:
    | 'in-trial'
    | 'sparse-user-needs-time'
    | 'engaged-treatment-user'
    | 'engaged-long-tenure-price-sensitive'
    | 'engaged-during-life-stage'
    | 'no-offer-fits';
  ctaText: string;
  bodyCopy: string;
}

export type CancelExitCategory =
  | 'too-expensive'
  | 'didnt-see-change'
  | 'not-the-right-time'
  | 'something-specific'
  | 'other';

export interface CancelExitResponse {
  category: CancelExitCategory;
  /** ≤500 chars, PII-stripped at write time. */
  freeText?: string;
  submittedAt: string;
}

export type SubscriptionLifecyclePhase =
  | 'active'
  | 'trial'
  | 'grace'
  | 'lapsed-readonly'
  | 'never-subscribed';
