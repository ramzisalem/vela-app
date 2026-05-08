/**
 * Treatment tracking types (file 34).
 *
 * Treatments are journeys, not products. They have a start, an end, an
 * expected progression curve, and side effects. Vela never recommends a
 * treatment — only logs and observes one the user has chosen.
 *
 * Contraindications unify with `lifeStage` modes (file 48): a pregnancy
 * mode automatically marks `tretinoin`, `isotretinoin`, `hydroquinone`,
 * `spironolactone`, `finasteride`, etc. as contraindicated.
 */
import type { FaceMetric } from './aging';

export type TreatmentId =
  | 'tretinoin'
  | 'retinol'
  | 'azelaic-acid'
  | 'niacinamide'
  | 'salicylic-acid'
  | 'benzoyl-peroxide'
  | 'hydroquinone'
  | 'tranexamic-acid'
  | 'vitamin-c-serum'
  | 'isotretinoin'
  | 'spironolactone'
  | 'finasteride'
  | 'dutasteride'
  | 'minoxidil-oral'
  | 'minoxidil-topical'
  | 'botox'
  | 'filler-cheek'
  | 'filler-lip'
  | 'filler-jaw'
  | 'microneedling'
  | 'chemical-peel-light'
  | 'chemical-peel-medium'
  | 'laser-ipl'
  | 'laser-fractional'
  | 'laser-vascular'
  | 'hrt-estrogen'
  | 'hrt-testosterone'
  | 'other';

export type TreatmentCategory =
  | 'topical'
  | 'oral'
  | 'procedure'
  | 'hormonal'
  | 'lifestyle';

export type GenderRelevance = 'all' | 'men' | 'women' | 'cycle-relevant';

export interface ProgressionMarker {
  weekNumber: number;
  /** ≤140 chars. Plain-language milestone copy. */
  expected: string;
  visualCue?: 'getting-worse' | 'plateau' | 'getting-better';
}

export interface SideEffect {
  id: string;
  name: string;
  severity: 'common' | 'occasional' | 'rare';
  /** Optional caveat: "If it lasts past week N, talk to your doctor." */
  whenToWorry?: string;
}

export interface TreatmentCopy {
  /** 1-line summary for selection lists. */
  shortDescription: string;
  /** 80–150 words. */
  whatItIs: string;
  /** 80–150 words. Week-by-week framing. */
  whatToExpect: string;
  /** ≤30 words. Used in routine UI. */
  consistencyNote: string;
}

export interface TreatmentDefinition {
  id: TreatmentId;
  displayName: string;
  category: TreatmentCategory;
  evidenceLevel: 'strong' | 'moderate' | 'limited';
  /** Typical observable window. */
  expectedDurationWeeks: number;
  primaryFaceMetrics: ReadonlyArray<FaceMetric>;
  expectedProgression: ReadonlyArray<ProgressionMarker>;
  commonSideEffects: ReadonlyArray<SideEffect>;
  /** Plain-language, NOT medical. */
  contraindications: ReadonlyArray<string>;
  educationCopy: TreatmentCopy;
  requiresPrescription: boolean;
  genderRelevance: GenderRelevance;
}

export type UserTreatmentStatus =
  | 'planning'
  | 'active'
  | 'paused'
  | 'completed'
  | 'abandoned';

export interface UserTreatment {
  id: string;
  userId: string;
  definitionId: TreatmentId;
  /** User-supplied label when `definitionId === 'other'`. */
  customName?: string;
  /** ISO date. */
  startDate: string;
  /** ISO date; undefined while active. */
  endDate?: string;
  status: UserTreatmentStatus;
  /** User's prescriber, if any. ≤80 chars. PII; treat carefully. */
  prescriberLabel?: string;
  notes?: string;
  /** Photos taken outside the standard scan flow are stored locally only. */
  hasInformedConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserTreatmentSideEffect {
  id: string;
  userTreatmentId: string;
  sideEffectId: string;
  /** ISO date. */
  loggedOn: string;
  /** 1 (mild) – 5 (severe). */
  severity: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  resolved: boolean;
  resolvedOn?: string;
}

export interface DoctorExportRequest {
  userTreatmentId: string;
  /** ISO timestamps for the captured pages. */
  pagesGeneratedAt: string;
  /** Generated PDF URL (Supabase Storage signed URL, 7-day TTL). */
  pdfUrl: string;
  expiresAt: string;
}
