import { inactiveSubscriptionFlow } from './subscriptionFlow';
import type { SubscriptionStatus } from '@/types';

function base(overrides: Partial<SubscriptionStatus> = {}): SubscriptionStatus {
  return {
    isActive: false,
    isTrialing: false,
    willRenew: false,
    ...overrides,
  };
}

describe('inactiveSubscriptionFlow', () => {
  const realNow = Date.now;

  afterEach(() => {
    Date.now = realNow;
  });

  test('no expiration → subscription_required', () => {
    expect(inactiveSubscriptionFlow(base())).toBe('subscription_required');
  });

  test('trial period type after expiry → subscription_required', () => {
    Date.now = () => Date.parse('2026-06-15T12:00:00Z');
    expect(
      inactiveSubscriptionFlow(
        base({
          expirationDate: '2026-06-01T00:00:00Z',
          premiumPeriodType: 'TRIAL',
        }),
      ),
    ).toBe('subscription_required');
  });

  test('normal paid lapse within 30 days → lapsed_grace', () => {
    Date.now = () => Date.parse('2026-06-15T12:00:00Z');
    expect(
      inactiveSubscriptionFlow(
        base({
          expirationDate: '2026-06-01T00:00:00Z',
          premiumPeriodType: 'NORMAL',
        }),
      ),
    ).toBe('lapsed_grace');
  });

  test('normal paid lapse after 30 days → lapsed_readonly', () => {
    Date.now = () => Date.parse('2026-08-15T12:00:00Z');
    expect(
      inactiveSubscriptionFlow(
        base({
          expirationDate: '2026-06-01T00:00:00Z',
          premiumPeriodType: 'NORMAL',
        }),
      ),
    ).toBe('lapsed_readonly');
  });

  test('not yet expired → subscription_required', () => {
    Date.now = () => Date.parse('2026-05-01T12:00:00Z');
    expect(
      inactiveSubscriptionFlow(
        base({
          expirationDate: '2026-06-01T00:00:00Z',
          premiumPeriodType: 'NORMAL',
        }),
      ),
    ).toBe('subscription_required');
  });
});
