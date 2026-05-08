/**
 * Notification budget rules (file 12).
 *
 * Verifies the closed enum + budget invariants. Service-level scheduling is
 * tested separately under src/services/notifications.
 */
import {
  BUDGET,
  DEFAULT_HOURS_BETWEEN_NOTIFS,
  type NotificationSurfaceId,
} from './types';

describe('Notification BUDGET enum', () => {
  it('has rules for every surface', () => {
    const surfaces: NotificationSurfaceId[] = [
      'weekly_checkin',
      'baseline_done_payoff',
      'forecast_day_7',
      'streak_protection',
      'wrapped_ready',
      'lapsed_re_engagement',
      'iOS_widget_install_nudge',
      'reactivation_returning_user',
    ];
    for (const s of surfaces) {
      expect(BUDGET[s]).toBeDefined();
      expect(BUDGET[s].perWeek).toBeGreaterThanOrEqual(0);
      expect(BUDGET[s].perWeek).toBeLessThanOrEqual(2);
    }
  });

  it('disables iOS widget install nudge at v1 (perWeek === 0)', () => {
    expect(BUDGET.iOS_widget_install_nudge.perWeek).toBe(0);
  });

  it('rate-limits at 24 hours between notifications by default', () => {
    expect(DEFAULT_HOURS_BETWEEN_NOTIFS).toBe(24);
  });

  it('respects global opt-out for opt-in-style nudges only', () => {
    // Lifecycle and reactivation surfaces always fire (they are infrequent
    // and non-recurring); recurring nudges respect opt-out.
    expect(BUDGET.weekly_checkin.respectGlobalOptOut).toBe(true);
    expect(BUDGET.streak_protection.respectGlobalOptOut).toBe(true);
    expect(BUDGET.wrapped_ready.respectGlobalOptOut).toBe(false);
    expect(BUDGET.reactivation_returning_user.respectGlobalOptOut).toBe(false);
  });
});
