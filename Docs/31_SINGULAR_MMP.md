# 31 — Singular MMP Integration

## Overview
Singular is Vela's Mobile Measurement Partner (MMP). It answers the question: **"Which ad campaign drove this paying subscriber?"**

Without an MMP, you're flying blind on paid UA. You can spend $10k on Apple Search Ads, Meta, and TikTok simultaneously and have no idea which one produced subscribers who retained past month 3. Singular closes that loop.

This file covers: why Singular, SDK installation for Expo, initialization order (ATT before SDK — critical), event taxonomy, deep link attribution, privacy compliance (GDPR + ATT), and the data flow between Singular, RevenueCat, and PostHog.

---

## What Singular Does (vs PostHog and RevenueCat)

There are three different analytics systems in Vela. Each has a distinct role:

| System | Role | Key question answered |
|--------|------|----------------------|
| **PostHog** | Product analytics | How do users behave inside the app? |
| **RevenueCat** | Subscription lifecycle | Who paid, when, and how much? |
| **Singular** | Marketing attribution | Which ad campaign acquired each user? |

Singular gets RevenueCat revenue data (via webhook) and PostHog funnel data (via SDK events), and correlates them back to ad spend. The output is ROI per campaign, per ad set, per creative.

**Without Singular, you cannot do paid UA profitably.** Apple Search Ads, Meta, and Google all have their own attribution dashboards, but they each overclaim — every network says it drove the install. Singular is the neutral arbiter.

---

## SDK Version

Current at time of writing: **singular-react-native v4.1.0** (December 2025).

Supports both legacy Bridge and TurboModule (New Architecture). Vela runs New Architecture (set in file 01), so we use the TurboModule path where noted.

---

## Installation

### 1. Install the package

```bash
npm install singular-react-native
```

### 2. Add Expo config plugin

Singular provides an Expo plugin that handles the native AppDelegate and MainActivity modifications automatically — no manual native code editing needed.

```javascript
// app.config.js
{
  expo: {
    plugins: [
      [
        'singular-react-native',
        {
          // Optional: configure plugin-level settings here
        }
      ],
      // ... other plugins
    ]
  }
}
```

### 3. iOS: NSUserTrackingUsageDescription

Required by Apple for any app using ATT. Without this the App Store rejects on submission.

```javascript
// app.config.js
{
  expo: {
    ios: {
      infoPlist: {
        NSUserTrackingUsageDescription:
          'Vela uses this to understand which features matter most and to show you relevant ads. Your scan photos and scores are never shared.',
      },
    },
  },
}
```

### 4. iOS: Add SKAdNetwork IDs

Apple requires the ad network IDs to be listed in `Info.plist` for SKAdNetwork to work. Each network (Apple Search Ads, Meta, TikTok, Google) has a registered ID.

Rather than listing them by hand (the list changes), use the `expo-build-properties` approach or maintain a dedicated `SKAdNetworkItems` array.

The minimum for Vela's planned ad networks:

```javascript
// app.config.js
{
  expo: {
    ios: {
      infoPlist: {
        SKAdNetworkItems: [
          // Apple Search Ads
          { SKAdNetworkIdentifier: 'cstr6suwn9.skadnetwork' },
          // Meta (Facebook / Instagram)
          { SKAdNetworkIdentifier: 'v9wttpbfk9.skadnetwork' },
          { SKAdNetworkIdentifier: 'n38lu8286q.skadnetwork' },
          // Google
          { SKAdNetworkIdentifier: '4fzdc2evr5.skadnetwork' },
          { SKAdNetworkIdentifier: '2fnua5tdw4.skadnetwork' },
          // TikTok
          { SKAdNetworkIdentifier: 'yclnxrl5pm.skadnetwork' },
          { SKAdNetworkIdentifier: 'nu4557a4je.skadnetwork' },
          // Snap
          { SKAdNetworkIdentifier: 'prcb7njfa6.skadnetwork' },
          // X (Twitter)
          { SKAdNetworkIdentifier: '9yg77x724h.skadnetwork' },
          // AppLovin
          { SKAdNetworkIdentifier: '275upjj5gd.skadnetwork' },
          // ironSource
          { SKAdNetworkIdentifier: 'su67r6k2v3.skadnetwork' },
        ],
      },
    },
  },
}
```

**Important:** This list gets stale. Before production, fetch the current list from your Singular dashboard (Settings → SKAdNetwork IDs) or from https://skadnetwork.info — they maintain a current list for all major networks.

### 5. Rebuild dev client

Because Singular is a native module:

```bash
eas build --profile development --platform ios
```

---

## Initialization Order (Critical)

The order of operations at app startup is **strictly defined**. Getting this wrong permanently loses attribution data for that install.

### Correct order

```
1. App opens
2. [WAIT] Request ATT consent → get result
3. [AFTER ATT resolves] Init Singular with IDFA available
4. [AFTER Singular init] Continue to auth check / onboarding
```

### Why order matters

Singular's first session event triggers the attribution lookup. If the IDFA isn't present when that session fires, Singular has to use fingerprinting (device model + IP) which is far less accurate. Once the session fires without IDFA, that session can never be retroactively attributed with the IDFA — it's a permanent loss.

The `waitForTrackingAuthorizationWithTimeoutInterval` config option tells Singular to hold its first session for up to N seconds while ATT resolves.

### Implementation

```typescript
// src/services/singular/init.ts
import { Singular, SingularConfig } from 'singular-react-native';
import { Platform } from 'react-native';
import * as TrackingTransparency from 'expo-tracking-transparency';
import { useAuthStore } from '@/stores/authStore';

const SINGULAR_API_KEY = process.env.EXPO_PUBLIC_SINGULAR_API_KEY!;
const SINGULAR_SECRET  = process.env.EXPO_PUBLIC_SINGULAR_SECRET!;

let initialized = false;

/**
 * Must be called AFTER ATT consent has been requested and resolved.
 * Never call this before ATT — IDFA won't be captured if you do.
 */
export async function initSingular(userId?: string | null) {
  if (initialized) return;
  
  const config = new SingularConfig(SINGULAR_API_KEY, SINGULAR_SECRET);
  
  // Wait up to 5 minutes for ATT response. In practice ATT
  // resolves instantly (accept/deny) or times out at the user ignoring.
  // We've already requested ATT above, so this is a short wait.
  config.withWaitForTrackingAuthorizationWithTimeoutInterval(300);
  
  // Link Singular identity to our user ID for cross-device attribution.
  // Only set after login. See setUserIdAfterLogin() for post-auth flow.
  if (userId) {
    config.withCustomUserId(userId);
  }
  
  // Handle Singular Links (deep links via Singular tracking URLs)
  config.withSingularLink((params) => {
    const deeplink    = params.deepLink;
    const passthrough = params.passthrough;
    const isDeferred  = params.isDeferred;
    
    console.log('[Singular] Link received:', { deeplink, isDeferred });
    
    // Route deep link through our existing router (file 30)
    if (deeplink) {
      import('@/services/deepLinks/router').then(({ routeFromDeepLink }) => {
        routeFromDeepLink(deeplink);
      });
    }
    
    // Passthrough params are custom data attached to the campaign link.
    // e.g. { promo: 'LAUNCH20' } → can trigger a discount code.
    if (passthrough) {
      handlePassthrough(passthrough);
    }
  });
  
  // GDPR: don't send data to partners if user hasn't consented.
  // This is set per-user after consent flow resolves. Default null.
  // Calling withLimitDataSharing(true) before we know GDPR status
  // is safer than calling false — opt in is explicit.
  config.withLimitDataSharing(true); // Conservative default
  
  Singular.init(config);
  initialized = true;
}

/**
 * Called after user signs in or creates account.
 * Associates all future and past attribution data with this user.
 */
export function setSingularUserId(userId: string) {
  Singular.setCustomUserId(userId);
}

/**
 * Called on sign out or account deletion.
 */
export function clearSingularUserId() {
  Singular.unsetCustomUserId();
}

/**
 * Handle passthrough params from Singular tracking links.
 * Used for promo codes, campaign-specific onboarding variants, etc.
 */
function handlePassthrough(passthrough: string) {
  try {
    const params = JSON.parse(passthrough);
    if (params.promo_code) {
      // Store for use at paywall
      import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
        AsyncStorage.setItem('vela.promoCode', params.promo_code);
      });
    }
  } catch {
    // Not JSON, ignore
  }
}
```

### ATT request: where and when

ATT prompt must appear at the right moment to maximize opt-in:
- **Not** on first app launch (too early, user hasn't seen value)
- **After** the score reveal on baseline scan (user just got value from the app)
- **Before** Singular init is called

```typescript
// src/services/singular/attRequest.ts
import * as TrackingTransparency from 'expo-tracking-transparency';
import { Platform } from 'react-native';

export type ATTStatus = 'granted' | 'denied' | 'not_determined' | 'restricted' | 'not_applicable';

/**
 * Requests ATT consent on iOS 14.5+.
 * Should be called after user has seen their baseline score
 * (they've experienced value before being asked to consent).
 *
 * Returns the resolved status. Always resolves — never throws.
 */
export async function requestATT(): Promise<ATTStatus> {
  if (Platform.OS !== 'ios') return 'not_applicable';
  
  try {
    const { status: existingStatus } = await TrackingTransparency.getTrackingPermissionsAsync();
    
    // Already resolved — don't show again
    if (existingStatus !== 'undetermined') {
      return mapATTStatus(existingStatus);
    }
    
    // Show ATT prompt
    const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
    return mapATTStatus(status);
  } catch (error) {
    console.error('[ATT] Error requesting permission:', error);
    return 'not_determined';
  }
}

function mapATTStatus(status: string): ATTStatus {
  switch (status) {
    case 'granted':  return 'granted';
    case 'denied':   return 'denied';
    case 'restricted': return 'restricted';
    default: return 'not_determined';
  }
}
```

### Wiring it into the app lifecycle

```typescript
// src/hooks/useSingularInit.ts
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { requestATT } from '@/services/singular/attRequest';
import { initSingular, setSingularUserId } from '@/services/singular/init';

/**
 * Called once after the user has completed their baseline scan
 * and been shown the score reveal. That's the moment we request ATT.
 */
export function useSingularPostBaselineInit() {
  const { userId } = useAuthStore();
  
  useEffect(() => {
    async function run() {
      // Step 1: Request ATT (shows system prompt)
      const attStatus = await requestATT();
      console.log('[Singular] ATT status:', attStatus);
      
      // Step 2: Init Singular (IDFA now available if granted)
      await initSingular(userId);
      
      // Step 3: Set user ID if already known
      if (userId) {
        setSingularUserId(userId);
      }
    }
    
    run();
  }, []);
}
```

Trigger this hook from the score **reveal** screen. Pass `enabled` rather than calling the hook conditionally (Rules of Hooks):

```typescript
// app/(capture)/reveal.tsx
import { useSingularPostBaselineInit } from '@/hooks/useSingularInit';

export default function RevealScreen() {
  const { isBaseline } = useCapture();

  // Hook is always called; the effect inside is gated by `enabled`.
  useSingularPostBaselineInit({ enabled: isBaseline });

  // ... rest of reveal screen
}
```

Update the hook signature to match:

```typescript
// src/hooks/useSingularInit.ts
export function useSingularPostBaselineInit({ enabled }: { enabled: boolean }) {
  const { userId } = useAuthStore();

  useEffect(() => {
    if (!enabled) return;

    async function run() {
      const attStatus = await requestATT();
      // Init Singular regardless of status — without IDFA it falls back
      // to fingerprinting + SKAdNetwork, which still works (less accurate).
      await initSingular(userId);
      if (userId) setSingularUserId(userId);
    }
    run();
  }, [enabled]);
}
```

### What happens when the user denies ATT

| ATT status | IDFA available | Attribution accuracy | What still works |
|---|---|---|---|
| `granted` | yes | high (deterministic) | Everything |
| `denied` / `restricted` | no | medium (SKAdNetwork + fingerprint) | Conversions, postbacks, deferred deep links |
| `not_determined` (timeout) | no | medium (same as denied) | Same as denied |

The app **continues to function normally** in all cases. Never block the user on ATT. Don't re-prompt within the same install — iOS only allows one prompt; subsequent denials require Settings → Privacy → Tracking. If the user wants to enable later, surface a "Privacy" row in Settings (file 14) that calls `Linking.openSettings()`.

---

## Required Package

```bash
npm install expo-tracking-transparency
```

Add to plugins:

```javascript
// app.config.js
plugins: [
  'expo-tracking-transparency',
  // ...
]
```

---

## Event Tracking

Singular receives two kinds of events:

1. **Custom events** — things we track manually (subscription, onboarding)
2. **Revenue events** — IAP events with monetary value (via RevenueCat webhook, and optionally direct SDK call)

### Event service

```typescript
// src/services/singular/events.ts
import { Singular, SingularIOSPurchase } from 'singular-react-native';
import { Platform } from 'react-native';

/**
 * Standard Singular event names.
 * Use these exact strings — they match Singular's standard event library
 * which enables cross-app benchmarking in Singular's dashboard.
 */
export const SingularEvents = {
  // Standard events (Singular reserved)
  COMPLETE_REGISTRATION: '__COMPLETE_REGISTRATION__',
  LOGIN:                 '__LOGIN__',
  START_TRIAL:           '__START_TRIAL__',
  SUBSCRIBE:             '__SUBSCRIBE__',
  
  // Custom events (Vela-specific)
  ONBOARDING_COMPLETE:  'onboarding_complete',
  BASELINE_CAPTURED:    'baseline_captured',
  WEEKLY_CAPTURE:       'weekly_capture',
  PAYWALL_VIEWED:       'paywall_viewed',
  TRIAL_STARTED:        'trial_started',    // also maps to START_TRIAL
  SUBSCRIPTION_STARTED: 'subscription_started',
  TRIAL_CONVERTED:      'trial_converted',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_LAPSED:  'subscription_lapsed',
  ROUTINE_WEEK_1:       'routine_completed_week_1',
  CAPTURE_WEEK_4:       'capture_completed_week_4',
  SHARE_CARD_SENT:      'share_card_sent',
} as const;

/**
 * Track a non-revenue event.
 */
export function trackSingularEvent(
  event: string,
  params?: Record<string, string | number | boolean>
) {
  if (__DEV__) {
    console.log('[Singular Event]', event, params);
    return;
  }
  
  if (params) {
    Singular.eventWithArgs(event, params);
  } else {
    Singular.event(event);
  }
}

/**
 * Track a subscription purchase or renewal.
 * Called after RevenueCat confirms the transaction.
 *
 * @param receipt    Base64-encoded receipt from RevenueCat
 * @param productId  RevenueCat product identifier
 * @param transactionId  Apple transaction ID
 * @param revenue    Amount in USD
 */
export function trackSubscriptionRevenue({
  receipt,
  productId,
  transactionId,
  revenue,
}: {
  receipt: string;
  productId: string;
  transactionId: string;
  revenue: number;
}) {
  if (__DEV__) {
    console.log('[Singular Revenue]', { productId, revenue });
    return;
  }
  
  if (Platform.OS === 'ios') {
    const iosPurchase = new SingularIOSPurchase(
      revenue,
      'USD',
      productId,
      transactionId,
      receipt
    );
    
    Singular.inAppPurchaseWithArgs(
      SingularEvents.SUBSCRIBE,
      iosPurchase,
      {
        product_id:  productId,
        is_trial:    false,
      }
    );
  }
  // Android: SingularAndroidPurchase when v2 ships
}
```

### What events to send to Singular

Singular events should represent **acquisition funnel milestones** — not every click. The goal is teaching the ad networks what a "good user" looks like.

| Event | When to fire | Why Singular needs it |
|-------|-------------|----------------------|
| `__COMPLETE_REGISTRATION__` | Onboarding complete | Tells networks the install converted to signup |
| `baseline_captured` | Baseline scan done | Engagement signal; user got core value |
| `__START_TRIAL__` | Trial subscription starts | SKAdNetwork conversion value anchor |
| `__SUBSCRIBE__` | First paid charge | Revenue signal for ROAS calculation |
| `trial_converted` | Trial → paid (day 7) | LTV signal |
| `capture_completed_week_4` | 4th weekly scan done | Retention signal |
| `subscription_renewed` | Year 2 charge | LTV signal |

**Don't send Singular every PostHog event.** Noisy event data degrades SKAdNetwork conversion models and clutters your Singular dashboard.

### Firing events at the right places

```typescript
// In onboarding completion handler
trackSingularEvent(SingularEvents.COMPLETE_REGISTRATION, {
  onboarding_persona: detectedPersona,
});

// In capture flow, after baseline AI processing
trackSingularEvent(SingularEvents.BASELINE_CAPTURED);

// In paywall, after RevenueCat purchase confirmed
import { trackSubscriptionRevenue, trackSingularEvent, SingularEvents } from '@/services/singular/events';

async function handlePurchaseSuccess(purchaseInfo: CustomerInfo) {
  const transaction = purchaseInfo.latestExpirationDate; // simplified
  
  // Fire Singular revenue event
  trackSubscriptionRevenue({
    receipt:       purchaseInfo.originalAppUserId,   // Use RC's user ID as receipt ref
    productId:     selectedPlan,
    transactionId: purchaseInfo.originalPurchaseDate.toString(),
    revenue:       selectedPlan === 'annual' ? 79.00 : 9.99,
  });
  
  // Also fire semantic event
  trackSingularEvent(SingularEvents.START_TRIAL, {
    plan: selectedPlan,
  });
}
```

---

## RevenueCat → Singular Revenue Webhook

The SDK call above handles the client-side signal. For complete accuracy (including renewals, which happen in the background), also configure a **server-to-server webhook** from RevenueCat to Singular.

### Setup in RevenueCat dashboard

1. RevenueCat → Project Settings → Integrations → Singular
2. Enter Singular API Key + Secret
3. Enable events: `Initial Purchase`, `Renewal`, `Cancellation`, `Refund`, `Trial Started`, `Trial Converted`

Once configured, RevenueCat sends verified purchase data directly to Singular for every transaction — no client SDK call needed for renewals.

**The client SDK call and the webhook are complementary:**
- Client SDK call: fires instantly at the moment of purchase (fast, good for SKAdNetwork)
- Webhook: fires server-to-server with verified data (authoritative, includes renewals)

Don't remove the client call just because the webhook exists — SKAdNetwork needs the immediate client signal.

---

## GDPR Compliance

Vela is used by people in the EU (especially Priya in the UK, Jordan potentially in Europe). We must not send Singular data to third-party partners without GDPR consent.

### Consent gate

```typescript
// src/services/singular/privacy.ts
import { Singular } from 'singular-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GDPR_CONSENT_KEY = 'vela.gdpr.singular.consent';

export type GDPRConsentState = 'granted' | 'denied' | 'unknown';

/**
 * Call after user makes a consent choice.
 * For EU users only — detect via IP/locale heuristic.
 */
export async function setSingularGDPRConsent(granted: boolean) {
  await AsyncStorage.setItem(GDPR_CONSENT_KEY, granted ? 'granted' : 'denied');
  
  if (granted) {
    // Allow Singular to share data with attribution partners
    Singular.trackingOptIn();
    Singular.limitDataSharing(false);
  } else {
    // Restrict all data sharing
    Singular.trackingUnder13();  // Most restrictive — use for GDPR denials
    Singular.limitDataSharing(true);
  }
}

/**
 * Restore consent state on app re-launch.
 * Called during Singular init before config is finalized.
 */
export async function getStoredGDPRConsent(): Promise<GDPRConsentState> {
  const stored = await AsyncStorage.getItem(GDPR_CONSENT_KEY);
  if (stored === 'granted') return 'granted';
  if (stored === 'denied')  return 'denied';
  return 'unknown';
}

/**
 * CCPA: California users can opt out of data sale.
 * Separate from GDPR.
 */
export function setSingularCCPAOptOut(optedOut: boolean) {
  Singular.limitDataSharing(optedOut);
}
```

### When to show the consent dialog

For EU users (detected by device locale or Supabase geo):

- **Where:** After onboarding section A, before section B (before Singular init fires events)
- **What to explain:** "We use Singular to understand which of our ads worked, so we can spend money on ads that reach people who actually want Vela. Your scan photos are never shared — only app usage signals."
- **Required:** Users must be able to withdraw consent at any time via Settings → Privacy

### Settings integration

In Settings → Privacy section (file 14), add a "Marketing analytics" toggle:

```typescript
// In settings screen
import { setSingularGDPRConsent } from '@/services/singular/privacy';

<SettingsToggle
  label="Marketing analytics"
  description="Helps us understand which ads reach the right people. No photos are ever shared."
  value={singularConsentGranted}
  onChange={async (value) => {
    await setSingularGDPRConsent(value);
    setSingularConsentGranted(value);
  }}
/>
```

This is separate from the PostHog analytics toggle (file 25) — they're different systems with different purposes and different consent bases.

---

## Deep Link Attribution (Singular Links)

Singular Links are tracking URLs (e.g., `https://vela.sng.link/XXXX`) that Singular uses to attribute installs from specific campaigns. When a user taps a Singular Link before installing, Singular defers the deep link and delivers it after install.

### How it works with Vela

1. Marketing team creates a campaign link in Singular (e.g., for a specific Meta ad)
2. User taps the ad
3. iOS opens App Store → user installs Vela
4. On first open, Singular detects the deferred deep link via SKAdNetwork or fingerprint
5. The `withSingularLink` callback fires with the original link's deep link value
6. Vela routes the user to the appropriate screen (or applies a promo code)

### Example campaign flows

**Campaign: "Start 2025 fresh" → routes to onboarding with pre-selected goal**
```
Campaign link passthrough: { "goal_preset": "reduce_redness" }
```
App handles in `handlePassthrough()`:
```typescript
if (params.goal_preset) {
  AsyncStorage.setItem('vela.onboarding.goalPreset', params.goal_preset);
  // Onboarding section C reads this and pre-selects the concern
}
```

**Campaign: "Discount code" → applies promo at paywall**
```
Campaign link passthrough: { "promo_code": "LAUNCH20" }
```
Paywall reads from AsyncStorage and applies discount on RevenueCat.

### Singular Links configuration

1. Singular dashboard → Attribution → Singular Links → Create new link
2. App scheme: `vela://` (or universal link base `vela.app`)
3. iOS team ID + bundle ID must match

The Expo plugin handles the AppDelegate modifications to support universal link passthrough.

---

## Uninstall Tracking

Singular can track when users uninstall the app. This requires sending the APNs push token to Singular.

```typescript
// src/services/singular/uninstallTracking.ts
import { Singular } from 'singular-react-native';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function registerUninstallTracking() {
  if (Platform.OS !== 'ios') return;
  
  try {
    // Get the APNs token (different from the push notification token)
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    
    if (devicePushToken.type === 'ios') {
      Singular.setUninstallToken(devicePushToken.data);
    }
  } catch (error) {
    console.error('[Singular] Uninstall tracking error:', error);
    // Non-critical — don't throw
  }
}
```

Call after Singular is initialized:

```typescript
// After initSingular()
await registerUninstallTracking();
```

Note: Uninstall tracking sends a silent push to devices periodically. If the push bounces (app was uninstalled), Singular records an uninstall event. You must have push permissions for this to work — it's a side benefit of having notifications enabled.

---

## Environment Configuration

Like every other service, Singular uses different credentials per environment.

```bash
# .env.development
EXPO_PUBLIC_SINGULAR_API_KEY=dev_api_key_xxx
EXPO_PUBLIC_SINGULAR_SECRET=dev_secret_xxx

# .env.staging
EXPO_PUBLIC_SINGULAR_API_KEY=staging_api_key_xxx
EXPO_PUBLIC_SINGULAR_SECRET=staging_secret_xxx

# .env.production
EXPO_PUBLIC_SINGULAR_API_KEY=prod_api_key_xxx
EXPO_PUBLIC_SINGULAR_SECRET=prod_secret_xxx
```

Create separate Singular apps in the dashboard for development and production. Don't mix test installs with real installs.

### Disabling in dev mode

```typescript
// In init.ts
export async function initSingular(userId?: string | null) {
  // Don't initialize in dev mode unless explicitly requested
  if (__DEV__ && !process.env.EXPO_PUBLIC_SINGULAR_IN_DEV) {
    console.log('[Singular] Skipping init in dev mode');
    return;
  }
  
  // ... rest of init
}
```

---

## Singular Dashboard Setup

Before any campaigns run, configure the dashboard:

### 1. SKAdNetwork conversion model

In Singular → Attribution → SKAdNetwork → Conversion Model:

- **Conversion window:** 72 hours (standard for subscription apps)
- **Anchor event:** `__START_TRIAL__` — the most meaningful early signal
- **Coarse values** (SKAN 4.0):
  - Low: install only (no trial started)
  - Medium: trial started
  - High: trial converted to paid

This configuration tells Singular (and the ad networks) that a "high value" install is one that converted from trial to paid.

### 2. Revenue attribution

Singular → Integrations → RevenueCat → configure webhook.

Set revenue attribution model to **Last Touch** (standard for subscription apps where the install campaign matters most, not the ad they clicked 6 months later).

### 3. Partner connections

Before running campaigns, connect your ad networks:
- **Apple Search Ads** — most important; native iOS users
- **Meta Ads Manager** — Instagram + Facebook
- **TikTok for Business** — growing importance for 25-35 demo
- **Google UAC** — add when Android ships

Each network requires entering API credentials in Singular → Partners.

### 4. Audiences

After 100+ installs accumulate, create Singular audiences:
- **Subscribers (LTV > $79)** → upload to Meta for lookalike
- **Trial starters who didn't convert** → retargeting audience
- **Week-4 retainers** → gold-standard lookalike for acquisition

---

## Data Flow Summary

```
User taps ad
  → Singular Link / ASA click
  → App Store install
  → Vela opens
  
  → [ATT prompt if iOS]
  → Singular.init() fires session
  
  → User completes onboarding
  → track('__COMPLETE_REGISTRATION__')
  
  → User captures baseline
  → track('baseline_captured')
  
  → User hits paywall → subscribes
  → RevenueCat.purchasePackage()
  → track('__START_TRIAL__') via SDK
  → RevenueCat webhook → Singular (server-to-server)
  
  → [7 days later] Trial converts
  → RevenueCat webhook → Singular 'trial_converted'
  
  → [12 months later] Renewal
  → RevenueCat webhook → Singular 'subscription_renewed'
  
All events correlated by:
  - IDFA (if ATT granted)
  - OR fingerprint (if ATT denied)
  - OR SKAdNetwork (privacy-safe aggregate signal)
  
Attribution result readable in:
  - Singular dashboard (per-campaign ROAS)
  - Exported to PostHog via Singular Data Destination (LTV by source)
  - Exported to Sheets/BI via Singular Reporting API
```

---

## Privacy Policy Updates

Adding Singular requires updating Vela's privacy policy. The policy must disclose:

- **What data is collected:** Device model, OS version, IP address, IDFA (if ATT granted), app events listed above
- **Who it's shared with:** Singular Labs (attribution partner), and via Singular to the ad networks that drove the install
- **Purpose:** Attribution of ad spend; we use this to understand which marketing channels work
- **User rights:** Can opt out via the Marketing analytics toggle in Settings → Privacy; can request deletion by contacting support
- **Legal basis (EU):** Legitimate interests (marketing measurement) if consent not granted; consent if granted

Template line for privacy policy:
> "We use Singular (singular.net) as a mobile measurement partner to understand which advertising campaigns led to Vela downloads and subscriptions. Singular may receive device identifiers and in-app event data for attribution purposes. You can opt out of marketing analytics in Settings → Privacy."

---

## Pre-Launch Checklist

### Setup
- [ ] `singular-react-native` v4.1.0 installed
- [ ] Expo plugin added to `app.config.js`
- [ ] `NSUserTrackingUsageDescription` in iOS `infoPlist`
- [ ] SKAdNetwork IDs listed (current list from Singular dashboard)
- [ ] `expo-tracking-transparency` installed and in plugins
- [ ] Dev/staging/prod credentials in respective `.env` files
- [ ] Separate Singular app entities for dev and production

### Implementation
- [ ] `requestATT()` fires after baseline score reveal (not on cold open)
- [ ] `initSingular()` called AFTER ATT resolves
- [ ] `setSingularUserId()` called on sign-in
- [ ] `clearSingularUserId()` called on sign-out
- [ ] `__COMPLETE_REGISTRATION__` fires on onboarding complete
- [ ] `baseline_captured` fires after baseline AI processing
- [ ] `__START_TRIAL__` fires on trial subscription start
- [ ] `__SUBSCRIBE__` / revenue event fires on paid subscription
- [ ] RevenueCat webhook to Singular configured
- [ ] Uninstall tracking registered after init

### Privacy
- [ ] GDPR consent toggle in Settings → Privacy
- [ ] `setSingularGDPRConsent()` wired to toggle
- [ ] Default: `limitDataSharing(true)` until consent granted
- [ ] Privacy policy updated to disclose Singular
- [ ] CCPA opt-out path available

### Dashboard
- [ ] SKAdNetwork conversion model configured
- [ ] At least Apple Search Ads partner connected
- [ ] Revenue attribution model set to Last Touch
- [ ] Test install appears in Singular (verify before launching campaigns)

### Testing
- [ ] Test event appears in Singular dashboard (use Singular test mode)
- [ ] Verify ATT prompt appears at correct moment (post-baseline reveal)
- [ ] Verify Singular does NOT init before ATT resolves
- [ ] Verify GDPR opt-out actually stops Singular network calls (use Charles Proxy)
- [ ] Verify RevenueCat webhook fires for sandbox purchase

---

## Ongoing Operations

Once running, the key workflows:

### Weekly (once UA campaigns are live)
- Check Singular dashboard for install volume, ROAS per campaign
- Check conversion rate (installs → trials → paid) per source
- Flag campaigns with ROAS < 1.0 for pause

### Monthly
- Pull cohort LTV report from Singular
- Update Meta/TikTok audiences with latest subscriber lists
- Check SKAdNetwork data completeness (should improve as install volume grows)

### Quarterly
- Rotate Singular API credentials
- Review SKAdNetwork conversion model — adjust if trial→paid timing shifts
- Audit GDPR consent rates in privacy dashboard
