/**
 * Vela Journal types (file 50, Part B).
 *
 * Editorial channel — long-form essays published in-app, on the web, and
 * via email. Shipping with v1 launch (first essay drops on or near v1
 * launch day per index).
 */

export type JournalCategory = 'on-faces' | 'science' | 'on-vela' | 'on-aging';

export interface JournalReference {
  citation: string;
  doi?: string;
  url?: string;
  paywalled: boolean;
}

export interface JournalEssay {
  slug: string;
  title: string;
  subtitle?: string;
  /** ISO date. */
  publishedAt: string;
  authorName: string;
  /** ≤120 chars; only for guest essays. */
  authorBio?: string;
  estimatedReadMinutes: number;
  /** Markdown content. */
  body: string;
  references?: JournalReference[];
  category: JournalCategory;
  /** Illustration only, never face data. */
  ogImageUrl?: string;
  /** ≤200 chars for previews. */
  excerpt: string;
  reviewedAt: string;
  reviewedBy: string[];
  status: 'draft' | 'in-review' | 'published' | 'archived';
}

export interface JournalSubscription {
  email: string;
  subscribedAt: string;
  source: 'in-app' | 'web' | 'cancel-flow' | 'external';
  unsubscribedAt?: string;
}
