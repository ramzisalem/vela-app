/**
 * Diary types (file 37).
 *
 * Encrypted at rest, never used to train AI. The diary is optional; a user
 * who never opens it still gets the full app experience.
 */

export type DiaryUserTag =
  | 'slept-poorly'
  | 'slept-well'
  | 'stressed'
  | 'rested'
  | 'sick'
  | 'period'
  | 'pms'
  | 'pregnant'
  | 'postpartum'
  | 'menopause'
  | 'travel'
  | 'sun'
  | 'alcohol'
  | 'late-night'
  | 'workout-hard'
  | 'haircut'
  | 'hat-day'
  | 'hair-wet'
  | 'hair-styled'
  | 'sunburn'
  | 'breakout'
  | 'flare-up'
  | 'allergic-reaction'
  | 'new-product'
  | 'stopped-product'
  | 'changed-routine'
  | 'big-life-event'
  | 'good-day'
  | 'rough-day';

export type DiaryInferredTag = DiaryUserTag;

export type DiaryAttachment =
  | { kind: 'date'; date: string }
  | { kind: 'scan'; sessionId: string }
  | { kind: 'treatment'; treatmentId: string };

export interface DiaryEntry {
  id: string;
  userId: string;
  attachedTo: DiaryAttachment;
  /** Free text, 1..5000 chars. */
  body: string;
  /** User-chosen tags. */
  userTags: DiaryUserTag[];
  /** AI-inferred tags. Hidden in UI by default. */
  inferredTags: DiaryInferredTag[];
  /** Tells correlation engine + aging band to ignore the relevant week. */
  excludeFromAnalysis: boolean;
  source: 'typed' | 'voice';
  createdAt: string;
  updatedAt: string;
}

export interface DiaryWeeklySummary {
  /** ISO week, e.g. "2026-W18". */
  weekIso: string;
  userId: string;
  themes: { tag: DiaryInferredTag; count: number }[];
  /** ≤120 chars. */
  oneLineSummary: string;
  generatedAt: string;
}

/**
 * Closed list of diary entry points. Adding a new one requires a Settings
 * row + an analytics event registration.
 */
export type DiaryEntryPoint =
  | 'dashboard.add'
  | 'scan.afterReveal'
  | 'tab.diary'
  | 'notification.weekly'
  | 'treatment.detail'
  | 'compare.beforeAfter';
