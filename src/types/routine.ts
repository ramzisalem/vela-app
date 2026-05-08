/**
 * Routine + task types (file 09 / file 02).
 *
 * Required fields per file 09 SPEC_REVIEW: `scoringFrameworkBias`,
 * `helpTopicId`, `complementsTreatments`, `contraindicatedInModes`, `evidence`
 * (the last is the file-50 trust requirement; CI fails on missing entries).
 */

import type { ScoringFramework, BudgetRange, Gender, ProductCategory } from './profile';

export type SubScore = 'skin' | 'symmetry' | 'grooming' | 'lighting' | 'contour';

export type TaskCategory =
  | 'cleansing'
  | 'sun'
  | 'moisturizing'
  | 'actives'
  | 'grooming'
  | 'lifestyle'
  | 'nutrition'
  | 'hair'
  | 'lashes'
  | 'sleep_hygiene'
  | 'expression';

export type TimeOfDay = 'morning' | 'evening' | 'anytime';

export type EvidenceLevel = 'strong' | 'moderate' | 'limited' | 'anecdotal';

export interface ProductRecommendation {
  category: ProductCategory;
  pricePoint: BudgetRange;
  exampleBrands?: string[];
}

/**
 * Evidence tag (file 50) — every shipped task must carry one.
 */
export interface RoutineTaskEvidence {
  /** Plain-English summary, AI-drafted, human-reviewed. */
  summary: string;
  /** Citation list (DOI-verified PubMed / Crossref). */
  citations: ReadonlyArray<{
    title: string;
    authors?: string;
    journal?: string;
    year?: number;
    doi?: string;
    url?: string;
  }>;
  level: EvidenceLevel;
  /** Confidence used by file 06 (cite in score explanations only when > 0.7). */
  confidenceInCitation: number;
  /** ISO timestamp of dermatologist sign-off. */
  reviewedAt?: string;
}

/**
 * Library task definition. The runtime DailyRoutine carries instances of these.
 */
export interface RoutineTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  timeOfDay: TimeOfDay;
  /** Estimated minutes. */
  estimatedMinutes: number;
  /** Which sub-score this primarily affects. */
  primarySubScore: SubScore;
  /** Bias toward a scoring framework. `neutral` tasks ship to all. */
  scoringFrameworkBias: ScoringFramework;
  /** Optional gender bias (rare; framework usually suffices). */
  genderBias?: Gender;
  /** ID for the `?` help sheet content (drives file 50 evidence display). */
  helpTopicId: string;
  /** Treatment IDs (file 34) this task complements (e.g. tretinoin → moisturizer pairing). */
  complementsTreatments: ReadonlyArray<string>;
  /** Life-stage modes (file 48) where this task is contraindicated. */
  contraindicatedInModes: ReadonlyArray<string>;
  /** File 50 trust scaffolding — required at v1. CI rejects empty. */
  evidence: RoutineTaskEvidence;
  /** Optional product hint. */
  product?: ProductRecommendation;
  /** Skin condition contraindications (e.g. rosacea + retinoid). */
  contraindicatedConditions?: ReadonlyArray<string>;
  /** Difficulty (1–3) — used by RoutineEngine to balance load. */
  difficulty?: 1 | 2 | 3;
}

export interface RoutineTaskInstance {
  taskId: string;
  /** Override title/description if AI personalized. */
  titleOverride?: string;
  descriptionOverride?: string;
  /** ISO date strings (YYYY-MM-DD). Daily check-offs (file 09 cadence rule). */
  completedDates: string[];
  /** Days the user explicitly skipped (counts as participation, not missed). */
  skippedDates: string[];
  addedAt: string;
}

export interface DailyRoutine {
  id: string;
  userId: string;
  weekNumber: number;
  generatedAt: string;
  /** Persona-aware ordered list. */
  tasks: RoutineTaskInstance[];
  /** Personalization note (AI-generated, file 06). */
  personalizationNote?: string;
  /** Inherited from previous routine — file 09. */
  streakState?: {
    currentDays: number;
    longestDays: number;
    lastCompletedDate?: string;
  };
}

export type { ProductCategory, BudgetRange, Gender };
