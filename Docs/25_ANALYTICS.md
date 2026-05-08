# 25 — Analytics & Telemetry

## Overview
What we measure, why, where it's stored, and how we use it. Vela's analytics are **product-focused**, not surveillance. We track behavior to improve the product, not to sell ads or enable third-party data brokers.

This file defines: choice of platform, the event taxonomy, the privacy posture, and the implementation patterns.

---

## Platform Choice: PostHog

**We use PostHog (self-hosted EU instance or PostHog Cloud EU).**

### Why PostHog
- Open source, self-hostable
- Product analytics (funnels, retention, paths) built-in
- Feature flags built-in (no separate LaunchDarkly subscription)
- A/B testing built-in
- Session recording available but **disabled by default** for privacy
- EU hosting available for GDPR compliance
- Generous free tier (1M events/month)

### Why not the alternatives
- **Mixpanel:** More expensive, no feature flag system included
- **Amplitude:** Same as Mixpanel, plus questionable acquisition history
- **Segment:** Great pipeline but adds complexity and cost
- **Firebase Analytics:** Free but Google-owned and limited query power
- **Plausible / Fathom:** Web-only, not for products

### Configuration

```typescript
// src/services/analytics/posthog.ts
import PostHog from 'posthog-react-native';

let posthog: PostHog | null = null;

export async function initAnalytics() {
  posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY!, {
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
    enableSessionReplay: false,           // Off by default
    captureAppLifecycleEvents: true,       // Track app open/close
    flushInterval: 30,                     // Send events every 30s
    flushAt: 20,                           // Or after 20 events
  });
  
  await posthog.ready();
  
  return posthog;
}

export function getPostHog(): PostHog | null {
  return posthog;
}

/**
 * GDPR opt-out. Backed by AsyncStorage so the choice survives app restarts.
 * Wired to a "Share product analytics" toggle in Settings (file 14).
 *
 * After opt-out:
 *   - PostHog stops sending events for this install.
 *   - Sentry crashes still flow (operational necessity, scrubbed of PII).
 *   - Singular still runs unless ATT was also denied (file 31).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const OPTOUT_KEY = 'vela.analytics.optedOut';

export async function setAnalyticsOptOut(optedOut: boolean): Promise<void> {
  await AsyncStorage.setItem(OPTOUT_KEY, optedOut ? '1' : '0');
  if (!posthog) return;
  if (optedOut) {
    posthog.optOut();
  } else {
    posthog.optIn();
  }
}

export async function loadAnalyticsOptOut(): Promise<boolean> {
  const v = await AsyncStorage.getItem(OPTOUT_KEY);
  const optedOut = v === '1';
  if (posthog && optedOut) posthog.optOut();
  return optedOut;
}
```

> Settings UI (file 14) renders a "Product analytics" row that calls `setAnalyticsOptOut`. Default: **opted in** for non-EU users, **opted out** for EU users until they explicitly opt in (GDPR's lawful-basis-by-consent requirement). Detect EU at startup from device locale + timezone — server-side IP geo is too coarse and we never collect IP.


---

## Event Taxonomy

Every event has a defined name, payload schema, and rationale. **No ad-hoc events.** If you want to track something new, add it here first.

### Naming convention
- Event names use `snake_case`
- Format: `<surface>_<action>_<object>` (e.g., `onboarding_completed_section_a`)
- Properties use `snake_case`
- Booleans named with `is_*` or `has_*` prefix

**Enum vs. wire-string mapping:** the TypeScript enum in `events.ts` uses `UPPER_SNAKE_CASE` keys (TypeScript convention) but the **string value** sent to PostHog is `snake_case`. Example:

```typescript
export const Events = {
  PAYWALL_VIEWED: 'paywall_viewed',
  SCAN_COMPLETED: 'scan_completed',
  // ...
} as const;
```

Cursor MUST NOT pass the enum key directly — always the string value. PostHog dashboards and queries assume `snake_case`. Lint rule: any `posthog.capture(Events.X)` call where `X` is the enum reference and the string value isn't `snake_case` fails CI.

### Event categories

```typescript
// src/services/analytics/events.ts

export const Events = {
  // ======================================
  // App lifecycle
  // ======================================
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  
  // ======================================
  // Auth
  // ======================================
  AUTH_SIGNUP_STARTED: 'auth_signup_started',
  AUTH_SIGNUP_COMPLETED: 'auth_signup_completed',
  AUTH_SIGNIN_COMPLETED: 'auth_signin_completed',
  AUTH_SIGNOUT_COMPLETED: 'auth_signout_completed',
  
  // ======================================
  // Onboarding
  // ======================================
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_QUESTION_ANSWERED: 'onboarding_question_answered',
  ONBOARDING_QUESTION_SKIPPED: 'onboarding_question_skipped',
  ONBOARDING_SECTION_COMPLETED: 'onboarding_section_completed',
  ONBOARDING_MICRO_PAYOFF_VIEWED: 'onboarding_micro_payoff_viewed',
  ONBOARDING_PERMISSIONS_GRANTED: 'onboarding_permissions_granted',
  ONBOARDING_PERMISSIONS_DENIED: 'onboarding_permissions_denied',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_ABANDONED: 'onboarding_abandoned',  // Tracked on app re-open
  
  // ======================================
  // Capture flow
  // ======================================
  CAPTURE_STARTED: 'capture_started',
  CAPTURE_ANGLE_COMPLETED: 'capture_angle_completed',
  CAPTURE_PHOTO_RETAKEN: 'capture_photo_retaken',
  CAPTURE_ABANDONED: 'capture_abandoned',
  CAPTURE_COMPLETED: 'capture_completed',
  CAPTURE_PROCESSING_STARTED: 'capture_processing_started',
  CAPTURE_PROCESSING_COMPLETED: 'capture_processing_completed',
  CAPTURE_PROCESSING_FAILED: 'capture_processing_failed',
  
  // ======================================
  // Score reveal
  // ======================================
  SCORE_REVEALED: 'score_revealed',
  SCORE_DETAIL_OPENED: 'score_detail_opened',
  SUB_SCORE_DETAIL_VIEWED: 'sub_score_detail_viewed',
  
  // ======================================
  // Paywall
  // ======================================
  PAYWALL_VIEWED: 'paywall_viewed',
  PAYWALL_DISMISSED: 'paywall_dismissed',
  PAYWALL_PLAN_SELECTED: 'paywall_plan_selected',
  PAYWALL_PURCHASE_STARTED: 'paywall_purchase_started',
  PAYWALL_PURCHASE_COMPLETED: 'paywall_purchase_completed',
  PAYWALL_PURCHASE_FAILED: 'paywall_purchase_failed',
  PAYWALL_RESTORE_PURCHASES: 'paywall_restore_purchases',
  TRIAL_STARTED: 'trial_started',
  TRIAL_CONVERTED: 'trial_converted',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  
  // ======================================
  // Routine
  // ======================================
  ROUTINE_VIEWED: 'routine_viewed',
  ROUTINE_TASK_OPENED: 'routine_task_opened',
  ROUTINE_TASK_COMPLETED: 'routine_task_completed',
  ROUTINE_TASK_UNDONE: 'routine_task_undone',
  ROUTINE_TASK_SKIPPED: 'routine_task_skipped',
  ROUTINE_GENERATED: 'routine_generated',
  ROUTINE_ADAPTED: 'routine_adapted',
  
  // ======================================
  // Comparison
  // ======================================
  COMPARISON_VIEWED: 'comparison_viewed',
  COMPARISON_MODE_CHANGED: 'comparison_mode_changed',
  COMPARISON_SESSION_CHANGED: 'comparison_session_changed',
  COMPARISON_SLIDER_USED: 'comparison_slider_used',
  
  // ======================================
  // Sharing
  // ======================================
  SHARE_CARD_GENERATED: 'share_card_generated',
  SHARE_CARD_SHARED: 'share_card_shared',
  SHARE_CARD_SAVED: 'share_card_saved',
  
  // ======================================
  // Settings
  // ======================================
  SETTINGS_OPENED: 'settings_opened',
  THEME_CHANGED: 'theme_changed',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  NOTIFICATIONS_DISABLED: 'notifications_disabled',
  DATA_EXPORTED: 'data_exported',
  ACCOUNT_DELETED: 'account_deleted',
  
  // ======================================
  // Notifications
  // ======================================
  NOTIFICATION_RECEIVED: 'notification_received',
  NOTIFICATION_TAPPED: 'notification_tapped',
  NOTIFICATION_DISMISSED: 'notification_dismissed',
  
  // ======================================
  // Errors
  // ======================================
  ERROR_OCCURRED: 'error_occurred',
  
  // ======================================
  // Feature usage
  // ======================================
  FEATURE_DISCOVERED: 'feature_discovered',
  
  // ======================================
  // Milestones
  // ======================================
  MILESTONE_REACHED: 'milestone_reached',
} as const;

export type EventName = typeof Events[keyof typeof Events];
```

### Event property schemas

Define the typed properties for each event:

```typescript
// src/services/analytics/eventSchemas.ts

export interface EventProperties {
  [Events.APP_OPENED]: {
    is_cold_start: boolean;
    minutes_since_last_session?: number;
    app_version: string;
  };
  
  [Events.ONBOARDING_QUESTION_ANSWERED]: {
    section: 'a' | 'b' | 'c' | 'd' | 'e';
    question_id: string;
    question_index: number;
    time_spent_seconds: number;
    was_skipped: boolean;
  };
  
  [Events.ONBOARDING_SECTION_COMPLETED]: {
    section: 'a' | 'b' | 'c' | 'd' | 'e';
    questions_answered: number;
    questions_skipped: number;
    total_time_seconds: number;
  };
  
  [Events.CAPTURE_STARTED]: {
    is_baseline: boolean;
    week_number: number;
    days_since_last_capture: number | null;
  };
  
  [Events.CAPTURE_COMPLETED]: {
    is_baseline: boolean;
    week_number: number;
    angles_captured: number;
    retakes_count: number;
    total_duration_seconds: number;
  };
  
  [Events.SCORE_REVEALED]: {
    is_baseline: boolean;
    overall_score: number;
    delta_overall: number | null;
    week_number: number;
  };
  
  [Events.PAYWALL_VIEWED]: {
    source: 'baseline_complete' | 'subscription_required' | 'expired_renewal';
    days_since_signup: number;
  };
  
  [Events.PAYWALL_PURCHASE_COMPLETED]: {
    plan: 'monthly' | 'annual';
    is_trial: boolean;
    price_usd: number;
  };
  
  [Events.ROUTINE_TASK_COMPLETED]: {
    task_id: string;
    task_category: string;
    completion_streak: number;
    time_of_day: 'morning' | 'midday' | 'evening' | 'night';
  };
  
  [Events.COMPARISON_VIEWED]: {
    from_session_week: number;
    to_session_week: number;
    weeks_apart: number;
    mode: 'side' | 'slider' | 'difference';
  };
  
  [Events.ERROR_OCCURRED]: {
    error_type: string;
    error_message: string;
    surface: string;  // Where in the app
    is_recoverable: boolean;
  };
  
  [Events.MILESTONE_REACHED]: {
    milestone_type: 'baseline' | 'week_1' | 'week_4' | 'week_12' | 'streak_7' | 'streak_30' | 'streak_100';
    days_since_signup: number;
  };
}
```

---

## Tracking Service

```typescript
// src/services/analytics/track.ts
import { getPostHog } from './posthog';
import { Events, type EventName } from './events';
import { EventProperties } from './eventSchemas';

/**
 * Track an event. Type-safe — properties must match the event's schema.
 */
export function track<E extends EventName>(
  event: E,
  properties?: E extends keyof EventProperties ? EventProperties[E] : Record<string, any>
) {
  const posthog = getPostHog();
  if (!posthog) {
    console.warn('PostHog not initialized, dropping event:', event);
    return;
  }
  
  // Don't track in development unless explicitly enabled
  if (__DEV__ && !process.env.EXPO_PUBLIC_ANALYTICS_IN_DEV) {
    console.log(`[Analytics] ${event}`, properties);
    return;
  }
  
  posthog.capture(event, properties);
}

/**
 * Identify the user after auth. Connects events to user profile.
 */
export function identify(userId: string, properties?: Record<string, any>) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.identify(userId, properties);
}

/**
 * Set user properties (without firing an event).
 */
export function setUserProperties(properties: Record<string, any>) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.register(properties);
}

/**
 * Reset on sign out. Clears user identification.
 */
export function reset() {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.reset();
}
```

---

## What We Set as User Properties

User properties are attributes attached to a person across all their events.

```typescript
// On profile completion / update
setUserProperties({
  age_bracket: '30-34',           // Bucketed, not exact
  gender: 'female',
  ethnicity_grouping: 'south_asian',
  fitzpatrick_type: 4,
  primary_concerns: ['hyperpigmentation', 'fine_lines'],
  on_active_treatment: true,
  treatment_types: ['tretinoin'],
  routine_experience: 'experienced',
  product_count: 7,
  budget_tier: 'high',
  signup_date: '2025-08-15',
  
  // Subscription state
  subscription_state: 'trial',     // trial | active | expired | none
  subscription_plan: 'annual',
  
  // Engagement state
  total_sessions: 4,
  current_streak: 7,
  weeks_since_signup: 3,

  // Inferred persona — used for funnel slicing in PostHog dashboards.
  // Set on profile completion and refreshed whenever the profile is materially updated
  // (file 18 personas, deterministic inference per inferPersona()).
  persona_inferred: 'maya',  // 'maya' | 'marcus' | 'priya' | 'jordan' | 'other'
});
```

### Persona Inference (canonical)

Every authenticated user gets a `persona_inferred` user property, computed deterministically from their profile fields. The function lives in `src/services/persona/infer.ts` and is called:

1. **At onboarding completion** — once the profile is fully populated.
2. **When `activeTreatments` changes** — adding a treatment can flip the user from Maya to Priya.
3. **When the user's age crosses a decade boundary** — rare, only for users tenure-tracked across years.

```typescript
// src/services/persona/infer.ts
import type { UserProfile, AppearanceGoal } from '@/types/profile';

export type PersonaInferred = 'maya' | 'marcus' | 'priya' | 'jordan' | 'other';

export function inferPersona(profile: UserProfile): PersonaInferred {
  const {
    age,
    scoringFramework,
    primaryGoal,
    activeTreatments = [],
    gender,
  } = profile;

  // ── Priya: anyone actively tracking a treatment, OR who chose
  // "treatment_tracking" as their primary goal. Treatment-tracker pattern is
  // the strongest behavioral signal; demographics don't override it.
  if (activeTreatments.length > 0 || primaryGoal === 'treatment_tracking') {
    return 'priya';
  }

  // ── Jordan: "overall_confidence" goal (the self-acceptance framing in our
  // taxonomy), OR age 50+, OR non-binary user with neutral framework.
  if (primaryGoal === 'overall_confidence') return 'jordan';
  if (age >= 50) return 'jordan';
  if (gender === 'non_binary' && scoringFramework === 'neutral') return 'jordan';

  // ── Marcus: masculine framework, 18–35, optimization-oriented goal.
  // The marcus-shaped goals are the ones with appearance-optimization framing.
  const marcusGoals: AppearanceGoal[] = [
    'jawline_definition',
    'facial_fat',
    'hair_concerns',  // for masculine framework, this reads as hair-loss optimization
  ];
  if (
    scoringFramework === 'masculine' &&
    age >= 18 &&
    age <= 35 &&
    marcusGoals.includes(primaryGoal)
  ) {
    return 'marcus';
  }

  // ── Maya: feminine framework, 22–45, tracking-oriented goal (or skin-related).
  // Maya is the quantified-self type interested in skin clarity, fine lines,
  // dark circles — the "track changes over time" archetype.
  const mayaGoals: AppearanceGoal[] = [
    'skin_clarity',
    'aging_signs',
    'dark_circles',
  ];
  if (
    scoringFramework === 'feminine' &&
    age >= 22 &&
    age <= 45 &&
    mayaGoals.includes(primaryGoal)
  ) {
    return 'maya';
  }

  // ── Edge cases — user falls between personas (e.g., 40-year-old man with
  // skin_clarity goal, or 28-year-old non-binary user with masculine framework
  // and aging_signs goal). PostHog dashboards include "Other" as a real bucket.
  return 'other';
}
```

### Why this design

- **Deterministic.** No ML, no probabilistic models. Same inputs → same persona, every time. Cursor can test it; QA can verify it; analytics dashboards can rely on it.
- **Treatment-first.** Priya is the highest-LTV persona; ensuring users with treatments are always classified as Priya means we don't lose signal from the 15% segment we care about most.
- **Goal-driven over demographic-driven.** Age and gender narrow the field, but the user's stated goal is the primary signal. A 28-year-old man whose primary goal is "track changes" is Maya-shaped, not Marcus-shaped — the function correctly produces `'other'` for him rather than mis-Marcus-ing him.
- **`'other'` is a real bucket.** ~10% of users will land here per file 18's projection. PostHog dashboards should explicitly include "Other" in funnels, not hide it.

### Distribution check

Run `scripts/persona/distributionCheck.ts` against the synthetic-profile test set monthly. Expected distribution from file 18:
- Maya 35% ± 5%
- Marcus 25% ± 5%
- Priya 15% ± 5%
- Jordan 15% ± 5%
- Other 10% ± 5%

A material drift (>10% change in any bucket) is a signal that either onboarding question wording changed (bad — invalidates historical funnels) or the user-base demographics shifted (good — but worth investigating).

### Funnel slicing

Every funnel in PostHog can be sliced by `persona_inferred`. The product dashboard maintains separate views per persona for:
- Trial-to-paid conversion (different per persona, per file 19)
- Week-4 retention (Marcus is highest churn risk)
- Treatment-tracking adoption (Priya dominates)
- Settings interactions (Jordan customizes more)

This is the layer that makes the personas operational rather than documentational.

### Privacy: what we DON'T track as user properties

- **Email address** — handled by Supabase, not duplicated to analytics
- **Real name** — never sent to analytics
- **Exact birthday** — only age bracket
- **Photos** — never leave device
- **Score values per session** — these are queried from our DB when needed for analysis
- **Specific products used** — only category-level

---

## Funnels (Critical Conversion Paths)

These funnels are visible in the PostHog dashboard from day 1:

### Funnel 1: Onboarding completion
1. `app_opened` (first time)
2. `onboarding_started`
3. `onboarding_section_completed` (section: 'a')
4. `onboarding_section_completed` (section: 'b')
5. `onboarding_section_completed` (section: 'c')
6. `onboarding_section_completed` (section: 'd')
7. `onboarding_section_completed` (section: 'e')
8. `onboarding_completed`
9. `onboarding_permissions_granted`

**Target conversion (top → bottom):** 60%
**Critical drop point:** Between sections (especially after 'c' / budget)

### Funnel 2: First capture to subscription
1. `onboarding_completed`
2. `capture_started`
3. `capture_completed`
4. `capture_processing_completed`
5. `score_revealed`
6. `paywall_viewed`
7. `paywall_plan_selected`
8. `paywall_purchase_completed`

**Target conversion:** 30-40%
**Critical drop point:** Between paywall_viewed and purchase_completed

### Funnel 3: Trial to paid conversion
1. `trial_started`
2. (7 days pass)
3. `trial_converted` OR `subscription_canceled`

**Target conversion to paid:** 50%

### Funnel 4: Week 1 retention
1. `paywall_purchase_completed`
2. `app_opened` on day 7+
3. `capture_started` for second session

**Target conversion:** 70%

### Funnel 5: Week 4 retention (the real product test)
1. `paywall_purchase_completed`
2. `capture_completed` × 4 (4 weeks of weekly capture)

**Target conversion:** 50%

---

## Cohort Definitions

PostHog cohorts to set up:

- **Active subscribers** — `subscription_state = 'active'`
- **Power users** — `total_sessions >= 8 AND current_streak >= 4`
- **At-risk** — `last_capture > 14 days ago AND subscription_state = 'active'`
- **Persona: Maya** — woman, 28-35, professional, active subscriber
- **Persona: Marcus** — man, 25-32, fitness-tracker user
- **Persona: Priya** — woman, 35-45, on active treatment
- **Persona: Jordan** — non-binary OR 40+, considered users

These cohorts let us answer: "How does Maya behave differently from Marcus in week 3?"

---

## Privacy Posture

### What we track
- App usage patterns and feature engagement
- Device type, OS version, app version (for debugging)
- Aggregate user attributes (age bracket, persona segment)
- Conversion events (onboarding completion, subscription)
- Error events (for monitoring)

### What we DON'T track
- Photos or any image data
- Exact face metrics or raw scores in analytics events
- Personal contact info (email, phone, name)
- Location data beyond country (which is inferable from IP — we don't add it as a property)
- Browsing or app usage outside of Vela
- Third-party advertising data

### Opt-out

Users can disable analytics in Settings → Privacy → "Help improve Vela":

```typescript
// In Settings
import { getPostHog } from '@/services/analytics/posthog';

const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

function toggleAnalytics(enabled: boolean) {
  if (enabled) {
    getPostHog()?.optIn();
  } else {
    getPostHog()?.optOut();
  }
  setAnalyticsEnabled(enabled);
  AsyncStorage.setItem('vela.analytics.enabled', String(enabled));
}
```

### GDPR / CCPA compliance

- **Right to access:** Users can request their analytics data via support email; we export from PostHog
- **Right to delete:** Account deletion triggers `posthog.reset()` and a delete-user request to PostHog admin API
- **Data residency:** Analytics hosted in EU
- **Consent:** Implicit on Day 1 (covered in privacy policy), explicit toggle in Settings

```typescript
// In delete account flow
async function deleteAccount(userId: string) {
  // 1. Delete from Supabase (covered in file 03)
  await supabase.functions.invoke('delete-user');
  
  // 2. Delete from PostHog
  const response = await fetch(`https://eu.i.posthog.com/api/projects/${projectId}/persons/?distinct_id=${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}` },
  });
  
  // 3. Reset local PostHog state
  posthog.reset();
}
```

---

## Sentry for Error Tracking (Separate from Analytics)

Errors go to Sentry, not PostHog. Reasons:
- Sentry has better stack trace handling
- Sentry has better release tracking
- Sentry's free tier is generous for solo dev

```typescript
// src/services/sentry.ts
import * as Sentry from '@sentry/react-native';

export function initSentry() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 10% in production
    
    beforeSend(event, hint) {
      // Vela's privacy positioning ("Photos never leave your device") is the
      // product. Sentry MUST NOT receive face data, photos, transforms,
      // landmarks, profile fields, or anything that could re-identify a user.
      // We strip aggressively. If a field looks remotely PII-shaped, drop it.

      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
        delete event.user.username;
      }
      // Remove request bodies entirely — they may contain photo bytes, base64
      // payloads, or AI prompt content with profile fields.
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
      }

      const PII_KEY = /(email|name|phone|address|photo|landmark|transform|face|profile|gender|ethnicity|skin|firstName|lastName|location|city|country|product|barcode|note)/i;
      const scrub = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        for (const k of Object.keys(obj)) {
          if (PII_KEY.test(k)) {
            obj[k] = '[scrubbed]';
          } else if (typeof obj[k] === 'object') {
            scrub(obj[k]);
          } else if (typeof obj[k] === 'string' && obj[k].length > 200) {
            // Likely a payload / base64 chunk — truncate
            obj[k] = obj[k].slice(0, 200) + '…[truncated]';
          }
        }
        return obj;
      };
      scrub(event.extra);
      scrub(event.tags);
      scrub(event.contexts);
      scrub(event.breadcrumbs);

      return event;
    },
  });
}

// Usage:
try {
  await someOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { surface: 'capture_flow' },
    extra: { week_number: 4 },
  });
}
```

### Sentry user context

```typescript
// On sign in
Sentry.setUser({
  id: userId,         // Same ID as PostHog
  // No email, no name
});

// On sign out
Sentry.setUser(null);
```

---

## Implementation Patterns

### Track when an event happens, not when a screen mounts

```typescript
// ❌ Don't track mount
useEffect(() => {
  track(Events.PAYWALL_VIEWED);
}, []);

// ✅ Track meaningful interaction
function handleSubscribe() {
  track(Events.PAYWALL_PURCHASE_STARTED, { plan: selectedPlan });
  initiatePurchase();
}
```

### Don't track every interaction

```typescript
// ❌ Too noisy
function handleScroll() {
  track(Events.SCREEN_SCROLLED);
}

// ✅ Track meaningful interactions only
function handleSwipeToCompare() {
  track(Events.COMPARISON_SLIDER_USED, { from_position: 0.3, to_position: 0.7 });
}
```

### Include context in properties

```typescript
// ❌ Insufficient context
track(Events.CAPTURE_COMPLETED);

// ✅ Includes useful context
track(Events.CAPTURE_COMPLETED, {
  is_baseline: false,
  week_number: 4,
  angles_captured: 3,
  retakes_count: 1,
  total_duration_seconds: 45,
});
```

### Wrap async actions with timing

```typescript
async function processCapture() {
  const startTime = Date.now();
  track(Events.CAPTURE_PROCESSING_STARTED);
  
  try {
    await runAI();
    track(Events.CAPTURE_PROCESSING_COMPLETED, {
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    track(Events.CAPTURE_PROCESSING_FAILED, {
      duration_ms: Date.now() - startTime,
      error_message: error.message,
    });
    throw error;
  }
}
```

---

## Feature Flags

PostHog feature flags let us roll out changes gradually.

```typescript
// src/services/analytics/featureFlags.ts
import { getPostHog } from './posthog';

export const FeatureFlags = {
  NEW_ONBOARDING_FLOW: 'new_onboarding_flow_v2',
  EXPANDED_AI_PROMPTS: 'expanded_ai_prompts',
  WEEKLY_DIGEST_EMAIL: 'weekly_digest_email',
  COMPARISON_AI_NARRATIVE: 'comparison_ai_narrative',
} as const;

export function isFeatureEnabled(flag: string): boolean {
  const posthog = getPostHog();
  if (!posthog) return false;
  return posthog.isFeatureEnabled(flag) ?? false;
}

export function getFeatureFlagPayload(flag: string): any {
  const posthog = getPostHog();
  if (!posthog) return null;
  return posthog.getFeatureFlagPayload(flag);
}
```

### Usage

```typescript
import { FeatureFlags, isFeatureEnabled } from '@/services/analytics/featureFlags';

if (isFeatureEnabled(FeatureFlags.NEW_ONBOARDING_FLOW)) {
  return <NewOnboardingFlow />;
} else {
  return <CurrentOnboardingFlow />;
}
```

---

## Dashboards to Set Up

In PostHog, create these dashboards before launch:

1. **Acquisition** — App opens, onboarding starts, sign-ups
2. **Onboarding funnel** — Drop-off per question
3. **Subscription funnel** — Paywall → trial → paid
4. **Retention curves** — Day 1, 7, 14, 28, 90 retention
5. **Capture compliance** — % of subscribers who capture weekly
6. **Routine engagement** — Tasks completed per user per week
7. **Errors** — Sentry feed embedded
8. **Persona breakdown** — Behavior by persona cohort

---

## Things to Track Once but NOT Repeatedly

Some events are valuable once but become noise if repeated.

**Track only on first occurrence:**
- `feature_discovered` (with `feature_name`)
- `onboarding_completed` (only fires once per user)
- `milestone_reached` (each milestone once)

**Track every time:**
- `app_opened`
- `capture_completed`
- `routine_task_completed`
- `paywall_viewed`

```typescript
// Pattern for once-only events
const FIRST_DISCOVERY_KEY = 'vela.discoveries';

async function trackFirstDiscovery(featureName: string) {
  const stored = await AsyncStorage.getItem(FIRST_DISCOVERY_KEY);
  const discovered = stored ? JSON.parse(stored) : [];
  
  if (!discovered.includes(featureName)) {
    track(Events.FEATURE_DISCOVERED, { feature_name: featureName });
    discovered.push(featureName);
    await AsyncStorage.setItem(FIRST_DISCOVERY_KEY, JSON.stringify(discovered));
  }
}
```

---

## Setup Checklist (Pre-Launch)

- PostHog project created (EU instance)
- Sentry project created
- API keys in `.env` (separate dev / staging / prod)
- All event names defined in `events.ts`
- All event schemas defined in `eventSchemas.ts`
- Track service implemented with type safety
- User identification on auth flow
- User reset on sign out / account deletion
- Privacy opt-out toggle in Settings
- All 5 funnels created in PostHog dashboard
- Cohorts created for personas
- Sentry user context wired up
- Sentry beforeSend strips PII
- Privacy policy updated to mention PostHog and Sentry
