/**
 * Notification surfaces — closed enum (file 12).
 *
 * CI rule: every notification scheduled MUST have a matching surface here.
 * No raw `Notifications.scheduleNotificationAsync` calls outside the
 * NotificationService.
 */

export type NotificationSurfaceId =
  | 'weekly_checkin'
  | 'baseline_done_payoff'
  | 'forecast_day_7'
  | 'streak_protection'
  | 'wrapped_ready'
  | 'lapsed_re_engagement'
  | 'iOS_widget_install_nudge'
  | 'reactivation_returning_user';

export interface NotificationBudgetRule {
  /** Per-week max emissions of this surface (file 12). */
  perWeek: number;
  /** Whether this surface is suppressed if the user has opted out of weekly nudges. */
  respectGlobalOptOut: boolean;
}

export const BUDGET: Record<NotificationSurfaceId, NotificationBudgetRule> = {
  weekly_checkin: { perWeek: 1, respectGlobalOptOut: true },
  baseline_done_payoff: { perWeek: 1, respectGlobalOptOut: false }, // file 38, fires once
  forecast_day_7: { perWeek: 1, respectGlobalOptOut: true },
  streak_protection: { perWeek: 1, respectGlobalOptOut: true },
  wrapped_ready: { perWeek: 1, respectGlobalOptOut: false },
  lapsed_re_engagement: { perWeek: 1, respectGlobalOptOut: true },
  iOS_widget_install_nudge: { perWeek: 0 /* disabled at v1 */, respectGlobalOptOut: true },
  reactivation_returning_user: { perWeek: 1, respectGlobalOptOut: false },
};

export const DEFAULT_HOURS_BETWEEN_NOTIFS = 24;
