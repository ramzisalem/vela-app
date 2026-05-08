/**
 * Cancel-save engine snapshot tests (file 47).
 */
import { selectSaveOffer, redactPII } from './saveEngine';
import type { CancelSaveContext } from '@/types/cancelSave';

const baseCtx: CancelSaveContext = {
  daysSinceFirstScan: 30,
  weeksOfPaidSubscription: 0,
  totalScans: 0,
  scansLast30Days: 0,
  totalRoutineDaysCompleted: 0,
  routineDaysLast30Days: 0,
  hasOpenedDiary: false,
  diaryEntriesTotal: 0,
  hasActiveTreatment: false,
  hasCompletedAnyExperiment: false,
  hasMonthlyWrapped: false,
  isInTrial: false,
  hasEverExtendedTrial: false,
  hasReceivedAnniversaryCard: false,
  region: 'US',
  hasFamilySharing: false,
  hasActiveLifeStageMode: false,
  activeLifeStageModes: [],
};

describe('selectSaveOffer', () => {
  it('routes trial users to file 41 extension', () => {
    const r = selectSaveOffer({ ...baseCtx, isInTrial: true });
    expect(r.kind).toBe('route-to-trial-extension');
    expect(r.reason).toBe('in-trial');
  });

  it('does NOT route trial users who have already extended', () => {
    const r = selectSaveOffer({
      ...baseCtx,
      isInTrial: true,
      hasEverExtendedTrial: true,
    });
    expect(r.kind).not.toBe('route-to-trial-extension');
  });

  it('offers extension-month-free for sparse users', () => {
    const r = selectSaveOffer({
      ...baseCtx,
      weeksOfPaidSubscription: 2,
      scansLast30Days: 1,
      totalRoutineDaysCompleted: 4,
    });
    expect(r.kind).toBe('extension-month-free');
    expect(r.reason).toBe('sparse-user-needs-time');
  });

  it('offers consolation-doctor-export for engaged treatment users', () => {
    const r = selectSaveOffer({
      ...baseCtx,
      weeksOfPaidSubscription: 8,
      scansLast30Days: 4,
      totalRoutineDaysCompleted: 40,
      hasActiveTreatment: true,
      totalScans: 8,
    });
    expect(r.kind).toBe('consolation-doctor-export');
  });

  it('offers price-match-yearly for long-tenure engaged users', () => {
    const r = selectSaveOffer({
      ...baseCtx,
      weeksOfPaidSubscription: 16,
      scansLast30Days: 4,
      totalRoutineDaysCompleted: 80,
      totalScans: 14,
    });
    expect(r.kind).toBe('price-match-yearly');
  });

  it('falls back to no-offer-respectful-goodbye when no rule fits', () => {
    const r = selectSaveOffer({
      ...baseCtx,
      weeksOfPaidSubscription: 8,
      scansLast30Days: 1,
      totalRoutineDaysCompleted: 8,
    });
    expect(r.kind).toBe('no-offer-respectful-goodbye');
  });

  it('uses mode-aware copy when a life-stage mode is active', () => {
    const r = selectSaveOffer({
      ...baseCtx,
      hasActiveLifeStageMode: true,
      activeLifeStageModes: ['pregnancy'],
      totalScans: 6,
    });
    expect(r.kind).toBe('extension-month-free');
    expect(r.reason).toBe('engaged-during-life-stage');
    expect(r.bodyCopy).toMatch(/bodies do/i);
  });
});

describe('redactPII', () => {
  it('strips emails', () => {
    expect(redactPII('reach me at jane.doe@example.com please')).toBe(
      'reach me at [redacted-email] please',
    );
  });

  it('strips phone numbers', () => {
    expect(redactPII('+1 (415) 555-0142 ok?')).toContain('[redacted-phone]');
  });

  it('caps to 500 chars', () => {
    const input = 'a'.repeat(600);
    expect(redactPII(input).length).toBe(500);
  });
});
