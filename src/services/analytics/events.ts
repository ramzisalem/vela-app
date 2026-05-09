/**
 * Analytics event registry (file 25). Closed enum — CI fails on raw
 * `track()` calls outside this file's allowlist (file 25 lint rule).
 */

export type AnalyticsEvent =
  // Onboarding
  | 'onboarding_started'
  | 'onboarding_phase_started'
  | 'onboarding_question_answered'
  | 'onboarding_completed'
  | 'onboarding_scan_hint_applied'
  | 'onboarding_deferred_profile_saved'
  | 'privacy_primer_viewed'

  // Capture
  | 'baseline_started'
  | 'baseline_angle_captured'
  | 'baseline_completed'
  | 'baseline_failed'
  | 'weekly_scan_started'
  | 'weekly_scan_completed'

  // Score reveal
  | 'score_reveal_shown'
  | 'score_explanation_loaded'

  // Paywall
  | 'paywall_shown'
  | 'paywall_purchased'
  | 'paywall_cancelled'
  | 'paywall_restored'

  // Trial
  | 'trial_started'
  | 'trial_extended'
  | 'trial_converted'

  // Routine
  | 'routine_generated'
  | 'routine_task_checked_off'
  | 'routine_task_skipped'

  // Compare
  | 'compare_mode_changed'

  // Share
  | 'share_card_captured'
  | 'share_card_saved_to_camera_roll'

  // Settings
  | 'settings_row_tapped'
  | 'subscription_managed'

  // Lifecycle
  | 'app_foregrounded'
  | 'app_backgrounded'
  | 'session_started'
  | 'persona_inferred'

  // Life-stage
  | 'life_stage_mode_enabled'
  | 'life_stage_mode_disabled'

  // Reactivation / cancel-save (file 46/47)
  | 'reactivation_email_clicked'
  | 'cancel_save_offer_shown'
  | 'cancel_save_offer_accepted';

export interface EventProps {
  [key: string]: string | number | boolean | undefined;
}
