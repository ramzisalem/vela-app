/**
 * Cancel-save offer engine (file 47).
 *
 * Deterministic selection based on engagement signals. The flow:
 *   1. trial → route to file 41
 *   2. active life-stage mode + ≥4 scans → mode-aware extension-month-free
 *   3. sparse user (≤4 weeks paid, ≤2 scans, ≤7 routine days) → extension-month-free
 *   4. engaged + active treatment + ≥6 scans → consolation-doctor-export
 *   5. long-tenure (≥12 weeks) + ≥3 recent scans + ≥30 routine days → price-match-yearly
 *   6. fallback → no-offer-respectful-goodbye
 */
import type {
  CancelSaveContext,
  CancelSaveOffer,
  CancelSaveOfferKind,
} from '@/types/cancelSave';
import type { LifeStageModeId } from '@/types/lifeStage';

const COPY: Record<CancelSaveOfferKind, { ctaText: string; bodyCopy: string }> = {
  'extension-month-free': {
    ctaText: 'Stay free for a month',
    bodyCopy:
      'Skin moves slowly. We can give you a free month — same data, same routine, no charge — to see if Vela earns its keep.',
  },
  'price-match-yearly': {
    ctaText: 'Switch to yearly at $79',
    bodyCopy:
      'You’ve been on monthly for a while. If price is the issue, yearly works out to about $6.60 a month. Same Vela, just billed once.',
  },
  'consolation-doctor-export': {
    ctaText: 'Generate a doctor-friendly PDF first',
    bodyCopy:
      'Before you go, a one-tap export of your treatment timeline so far. Useful for your next derm appointment, on us.',
  },
  'no-offer-respectful-goodbye': {
    ctaText: 'Cancel my subscription',
    bodyCopy:
      'No big sales pitch. If Vela isn’t fitting your life right now, that’s fine. Your data is here whenever you want it back.',
  },
  'route-to-trial-extension': {
    ctaText: 'Give me two more weeks',
    bodyCopy:
      'Skin takes time. Most of the change Vela tracks shows up at three to six weeks. The trial ends before that.',
  },
};

export function bodyForMode(mode: LifeStageModeId): string {
  switch (mode) {
    case 'pregnancy':
    case 'postpartum':
      return 'Your face is moving a lot right now — that’s just what bodies do. We can give you a free month to keep tracking, no pressure.';
    case 'cancer_recovery':
      return 'Recovery’s its own timeline. We can give you a free month to keep your record going, no pressure.';
    case 'hrt_estrogen':
    case 'hrt_testosterone':
      return 'HRT plays out over months. We can give you a free month so the record stays continuous.';
    case 'menopause':
      return 'Skin shifts during this stretch are real and worth tracking. We can give you a free month to keep going.';
  }
}

export function selectSaveOffer(ctx: CancelSaveContext): CancelSaveOffer {
  if (ctx.isInTrial && !ctx.hasEverExtendedTrial) {
    return {
      kind: 'route-to-trial-extension',
      reason: 'in-trial',
      ...COPY['route-to-trial-extension'],
    };
  }

  if (ctx.hasActiveLifeStageMode && ctx.totalScans >= 4) {
    const primary = ctx.activeLifeStageModes[0];
    return {
      kind: 'extension-month-free',
      reason: 'engaged-during-life-stage',
      ctaText: 'Stay free for a month',
      bodyCopy: primary ? bodyForMode(primary) : COPY['extension-month-free'].bodyCopy,
    };
  }

  if (
    ctx.weeksOfPaidSubscription <= 4 &&
    ctx.scansLast30Days <= 2 &&
    ctx.totalRoutineDaysCompleted <= 7
  ) {
    return {
      kind: 'extension-month-free',
      reason: 'sparse-user-needs-time',
      ...COPY['extension-month-free'],
    };
  }

  if (ctx.hasActiveTreatment && ctx.totalScans >= 6) {
    return {
      kind: 'consolation-doctor-export',
      reason: 'engaged-treatment-user',
      ...COPY['consolation-doctor-export'],
    };
  }

  if (
    ctx.weeksOfPaidSubscription >= 12 &&
    ctx.scansLast30Days >= 3 &&
    ctx.totalRoutineDaysCompleted >= 30
  ) {
    return {
      kind: 'price-match-yearly',
      reason: 'engaged-long-tenure-price-sensitive',
      ...COPY['price-match-yearly'],
    };
  }

  return {
    kind: 'no-offer-respectful-goodbye',
    reason: 'no-offer-fits',
    ...COPY['no-offer-respectful-goodbye'],
  };
}

/** PII redaction for the optional free-text exit-interview field. */
export function redactPII(text: string): string {
  if (!text) return text;
  return text
    .replace(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, '[redacted-phone]')
    .slice(0, 500);
}
