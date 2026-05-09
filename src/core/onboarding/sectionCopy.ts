/**
 * Section labels and milestone copy for onboarding (file 07).
 * Sentence case, no exclamation marks (file 21).
 */
import type { SectionId } from '@/core/onboarding/questions';

export interface SectionProgressMeta {
  /** Short chapter title shown above the question. */
  title: string;
  /** Why this block matters (one line). */
  promise: string;
}

export function sectionProgressMeta(section: SectionId): SectionProgressMeta {
  switch (section) {
    case 'A':
      return {
        title: 'About you',
        promise: 'This helps us score your first scan fairly.',
      };
    case 'B':
      return {
        title: 'Skin and goals',
        promise: 'We match what you want with what we measure.',
      };
    case 'C':
      return {
        title: 'Your routine',
        promise: 'Honest answers mean fewer generic tips.',
      };
    case 'D':
      return {
        title: 'Day to day',
        promise: 'Lifestyle context explains swings in your numbers.',
      };
    case 'E':
      return {
        title: 'Check-ins',
        promise: 'Almost done. Your baseline scan comes next.',
      };
  }
}

export type MilestoneAfterSection = 'A' | 'B' | 'D' | 'E';

export interface MilestoneCopy {
  kicker: string;
  headline: string;
  body: string;
}

export const MILESTONE_AFTER_SECTION: Record<MilestoneAfterSection, MilestoneCopy> = {
  A: {
    kicker: 'Section complete',
    headline: 'You’re on the map',
    body: 'We use what you shared to calibrate scores. Next, a few questions about your skin and what you want to track.',
  },
  B: {
    kicker: 'Section complete',
    headline: 'Goals noted',
    body: 'Your answers shape reminders and how we read trends. Next, we match a routine to the time you actually have.',
  },
  D: {
    kicker: 'Section complete',
    headline: 'Lifestyle captured',
    body: 'Last stretch: how you see yourself, where to focus, and when you’d like a gentle scan reminder.',
  },
  E: {
    kicker: 'Nice work',
    headline: 'Ready for your scan',
    body: 'Next we’ll ask for camera access. Your scan photos stay on this device.',
  },
};

export function isMilestoneAfterSection(v: string): v is MilestoneAfterSection {
  return v === 'A' || v === 'B' || v === 'D' || v === 'E';
}
