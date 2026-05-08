/**
 * SETTINGS_MANIFEST (file 14).
 *
 * Canonical, closed declarative tree. The Settings tab is rendered FROM
 * this manifest — no ad-hoc rows added inline anywhere else. CI fails on
 * direct row creation outside this file (file 14 lint rule).
 *
 * Each row has:
 *   - id (analytics + a11y identifier)
 *   - kind (action | toggle | navigate | external | destructive | infoOnly)
 *   - title, subtitle (sentence case, no exclamation marks)
 *   - eligibility (e.g. only when subscribed)
 */

export type SettingsRowKind =
  | 'action'
  | 'toggle'
  | 'navigate'
  | 'external'
  | 'destructive'
  | 'infoOnly';

export interface SettingsRow {
  id: string;
  kind: SettingsRowKind;
  title: string;
  subtitle?: string;
  /** External URL for `kind: 'external'`. */
  url?: string;
  /** Internal route for `kind: 'navigate'`. */
  route?: string;
  /** Closed-enum action keys handled in app/(main)/settings.tsx. */
  action?:
    | 'manage_subscription'
    | 'restore_purchase'
    | 'extend_trial'
    | 'export_data'
    | 'request_account_deletion'
    | 'cancel_save_flow'
    | 'sign_out'
    | 'reset_onboarding_dev'
    | 'override_scoring_framework';
  /** For toggles. */
  toggleKey?:
    | 'notifications.weekly'
    | 'aging_band.hidden'
    | 'streaks.hidden'
    | 'analytics.optin'
    | 'email_digest.optin';
  /** Hide the row when this returns false. */
  showWhen?: (ctx: SettingsContext) => boolean;
}

export interface SettingsSection {
  id: string;
  title: string;
  rows: SettingsRow[];
}

export interface SettingsContext {
  isSubscribed: boolean;
  hasActiveLifeStageMode: boolean;
  isTrialing: boolean;
  /** True if the user has not used the trial extension once-ever (file 41). */
  trialExtendable: boolean;
}

export const SETTINGS_MANIFEST: ReadonlyArray<SettingsSection> = [
  {
    id: 'subscription',
    title: 'Subscription',
    rows: [
      {
        id: 'subscription.status',
        kind: 'infoOnly',
        title: 'Plan',
        subtitle: 'Vela Pro',
      },
      {
        id: 'subscription.manage',
        kind: 'action',
        title: 'Manage subscription',
        subtitle: 'Open the App Store subscription page',
        action: 'manage_subscription',
      },
      // App Store–standard language; brand:allow
      {
        id: 'subscription.restore', // brand:allow
        kind: 'action',
        title: 'Restore purchase', // brand:allow
        action: 'restore_purchase', // brand:allow
      },
      {
        id: 'subscription.extend_trial',
        kind: 'action',
        title: 'Add 7 days to your trial',
        subtitle: 'One-time courtesy. We do this once per account.',
        action: 'extend_trial',
        showWhen: (ctx) => ctx.isTrialing && ctx.trialExtendable,
      },
    ],
  },
  {
    id: 'capture_routine',
    title: 'Scans and routine',
    rows: [
      {
        id: 'capture.weekly_reminder',
        kind: 'toggle',
        title: 'Weekly check-in reminder',
        subtitle: 'A quiet nudge, never a notification flood',
        toggleKey: 'notifications.weekly',
      },
      {
        id: 'capture.scoring_framework',
        kind: 'action',
        title: 'Scoring framework',
        subtitle: 'Switch between masculine, feminine, neutral — at any time',
        action: 'override_scoring_framework',
      },
      {
        id: 'capture.aging_band_hidden',
        kind: 'toggle',
        title: 'Hide the aging band',
        subtitle: 'Removes the comparison-to-peers chart from your dashboard',
        toggleKey: 'aging_band.hidden',
      },
      {
        id: 'capture.streaks_hidden',
        kind: 'toggle',
        title: 'Hide daily streaks',
        toggleKey: 'streaks.hidden',
      },
    ],
  },
  {
    id: 'life_stage',
    title: 'Life-stage modes',
    rows: [
      {
        id: 'life_stage.manage',
        kind: 'navigate',
        title: 'Manage modes',
        subtitle: 'Pregnancy, postpartum, menopause, HRT, cancer recovery',
        route: '/settings/life-stage',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy',
    rows: [
      {
        id: 'privacy.principles',
        kind: 'navigate',
        title: 'Our privacy principles',
        route: '/settings/privacy',
      },
      {
        id: 'privacy.export',
        kind: 'action',
        title: 'Export your data',
        subtitle: 'JSON of everything we have for you',
        action: 'export_data',
      },
      {
        id: 'privacy.analytics_optin',
        kind: 'toggle',
        title: 'Share anonymous analytics',
        subtitle: 'Helps us improve. Off is fully respected.',
        toggleKey: 'analytics.optin',
      },
      {
        id: 'privacy.email_digest_optin',
        kind: 'toggle',
        title: 'Monthly email digest',
        subtitle: 'A short note about your trends',
        toggleKey: 'email_digest.optin',
      },
    ],
  },
  {
    id: 'evidence',
    title: 'Evidence',
    rows: [
      {
        id: 'evidence.about',
        kind: 'navigate',
        title: 'How we evaluate evidence',
        route: '/settings/evidence',
      },
    ],
  },
  {
    id: 'journal_diary',
    title: 'Diary and journal',
    rows: [
      {
        id: 'diary.open',
        kind: 'navigate',
        title: 'Diary',
        subtitle: 'Notes on the days that don\u2019t fit a number',
        route: '/diary',
      },
      {
        id: 'experiments.open',
        kind: 'navigate',
        title: 'Experiments',
        subtitle: 'One change at a time',
        route: '/experiment',
      },
      {
        id: 'wrapped.open',
        kind: 'navigate',
        title: 'Last month, wrapped',
        subtitle: 'A short recap of your month',
        route: '/wrapped',
      },
      {
        id: 'health.open',
        kind: 'navigate',
        title: 'Health correlations',
        subtitle: 'Patterns between your face data and Health signals',
        route: '/health',
      },
      {
        id: 'treatment.open',
        kind: 'navigate',
        title: 'Treatments',
        subtitle: 'Track a journey alongside your scans',
        route: '/treatment',
      },
      {
        id: 'hair.open',
        kind: 'navigate',
        title: 'Hair density',
        subtitle: 'Opt-in. Photos stay on this device.',
        route: '/hair',
      },
    ],
  },
  {
    id: 'from_vela',
    title: 'From Vela',
    rows: [
      {
        id: 'journal.open',
        kind: 'navigate',
        title: 'Journal',
        subtitle: 'A monthly essay on faces, skin, and time',
        route: '/journal',
      },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    rows: [
      {
        id: 'support.help',
        kind: 'external',
        title: 'Help center',
        url: 'https://help.getvela.app',
      },
      {
        id: 'support.email',
        kind: 'external',
        title: 'Email support',
        url: 'mailto:hello@getvela.app',
      },
    ],
  },
  {
    id: 'legal',
    title: 'Legal',
    rows: [
      {
        id: 'legal.terms',
        kind: 'external',
        title: 'Terms of service',
        url: 'https://getvela.app/terms',
      },
      {
        id: 'legal.privacy_policy',
        kind: 'external',
        title: 'Privacy policy',
        url: 'https://getvela.app/privacy',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    rows: [
      {
        id: 'account.sign_out',
        kind: 'action',
        title: 'Sign out',
        action: 'sign_out',
      },
      {
        id: 'account.delete',
        kind: 'destructive',
        title: 'Delete account',
        subtitle: 'Two-step confirmation. Permanent.',
        action: 'request_account_deletion',
      },
    ],
  },
];
