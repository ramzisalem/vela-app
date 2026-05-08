# 08 — Paywall

## Overview
Vela uses **RevenueCat Paywalls** — the no-code, remotely-managed paywall UI built into the RevenueCat SDK. The paywall design lives entirely in the RevenueCat dashboard and can be updated without an app release. There is no custom paywall screen in the codebase.

Hard paywall after baseline scan. Close button leads to a dead-end "Subscription Required" screen, not free access.

### Paywall timing: pre-auth, during onboarding

The paywall fires **during onboarding, before the user has an account**. The flow is:

```
Onboarding → Capture → Score reveal → Paywall → [subscribe] → Create account → Dashboard
```

This means RevenueCat is initialized anonymously first, the purchase happens against an anonymous RC user ID, and when the user then creates their Vela account the anonymous RC identity is merged into their permanent account via `Purchases.logIn(userId)`. From that point on their subscription travels with them across devices and reinstalls.

This is RevenueCat's built-in `logIn()` alias flow — no custom work on our side, just the right call order.

### Profile race resolution (SPEC_REVIEW_3 finding)

The capture flow (file 05) needs `profile.gender` and `profile.scoringFramework` to drive the routine engine, but the user has no Supabase account yet at capture time. **Resolution: the profile lives in local Zustand state during onboarding and capture, then syncs to Supabase post-paywall as part of account creation.**

Concretely:

1. During onboarding, every answer is written to `useProfileStore` (local-only) — no Supabase calls.
2. The capture flow (file 05) and routine engine (file 09) read profile data from `useProfileStore`. They never query Supabase during onboarding/capture.
3. After successful paywall purchase, account creation runs:
   ```typescript
   // src/services/onboardingFlow.ts
   async function completePostPaywallSignup(profile: LocalProfile) {
     // 1. Create the Supabase auth user.
     const { data: authUser, error: authError } = await supabase.auth.signUp({ ... });
     if (authError) throw authError;

     // 2. Insert profiles row synchronously — must complete before logIn() and dashboard.
     const { error: profileError } = await supabase
       .from('profiles')
       .insert({ id: authUser.id, ...profile });
     if (profileError) throw profileError;

     // 3. Upload pending baseline scan from local WatermelonDB.
     await SyncOrchestrator.flushPending();

     // 4. RC alias merge — anonymous → identified.
     await Purchases.logIn(authUser.id);
   }
   ```
4. The capture flow's `saveScanResult` (file 03) is called only AFTER the profile insert succeeds. Until then, scans are persisted locally in WatermelonDB as `pending_sync`.

This resolves the race: by the time `saveScanResult` runs, the profile row is guaranteed present. The `retryUntilExists` retry logic in file 03 handles edge cases (network blip during signup), not the structural race.

**Lint rule:** any code that calls `saveScanResult` must be reachable only from a code path where `await completePostPaywallSignup` has resolved. CI fails if a capture-flow component calls `saveScanResult` from a path that bypasses this.

---

## What RevenueCat Paywalls Gives Us

- Visual paywall builder in the RC dashboard (WYSIWYG, AI-assisted, A/B testable)
- Native rendering (not a WebView — fast, smooth, no white flash)
- Design changes deployed without App Store review
- Built-in Restore Purchases button
- Custom Variables for personalization (e.g., inject user's first name)
- Remotely configurable per country, platform, or audience via Targeting

The only things we own in code: **when to show it**, **what to do after it closes** (purchased vs dismissed), and **the dead-end screen**.

---

## Package Installation

Two packages are required:

```bash
npm install react-native-purchases react-native-purchases-ui
```

Both require native code. Rebuild the dev client after adding:

```bash
eas build --profile development --platform ios
```

---

## RevenueCat Dashboard Setup

Do this before any code:

1. **Create entitlement:** `vela_premium`
2. **Create products in App Store Connect:**
   - `vela_annual` — $79/year, 7-day free trial
   - `vela_monthly` — $9.99/month, 7-day free trial
   - Both in subscription group "Vela Premium"
3. **Create Offering** in RC dashboard named `default`
   - Two packages: Annual (default) + Monthly
4. **Design the Paywall** in RC dashboard → Paywalls:
   - Pick a template or start blank
   - Apply Vela brand tokens (see file 15):
     - Background: cream paywall wash (`#F8F0E2` → `#EFD9C2`, radial top-down). RC's editor supports a single solid bg — pick `#F1E1CE` as the average.
     - Body / headline color: `espresso900` (`#241F1A`) — never `#000`.
     - Headline font: serif (RC supports system serif on iOS)
     - Selected-package border: `VelaPrimary` gradient. RC editor supports a single solid for borders — use `#B098B8` (mauve, the gradient midpoint) as the closest single-stop approximation.
     - CTA button: enable RC's gradient fill option with stops `#E8B5C4` → `#B098B8` → `#7AA6CB` at 135°. CTA label color: `#FFFFFF`.
   - Headline: "A patient record / of your face." (italic on the second line)
   - Subtitle: "Weekly scans · adaptive routine · photos stay on your device."
   - Set Annual package as default-selected with "BEST VALUE" badge
   - Add Restore Purchases button (required for Apple compliance)
5. **Attach Paywall to Offering**
6. **Publish Paywall** (visible in-app immediately)

Design notes for whoever builds the paywall in the RC dashboard:
- Keep copy in line with file 21 (brand voice). Forbidden words apply.
- No emojis in core copy.
- Feature list: max 4 items, one line each.
- Trust line below CTA: "Cancel anytime in iOS Settings. No dark patterns."
- The paywall is the only screen besides Welcome where the brand wordmark uses the gradient lockup. Place it at the top, ~28px high.

---

## SDK Initialization

### Anonymous-first init

RC must be initialized **before** the user creates an account, because the paywall fires during onboarding. Initialize anonymously at app root — RC generates a random anonymous user ID internally.

```typescript
// src/services/revenuecat/init.ts
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

const RC_KEY_IOS     = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!;
const RC_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!;

let initialized = false;

/**
 * Initialize RC anonymously. Call at app root, before auth check.
 * The anonymous RC user ID persists across sessions on this device.
 * If the user bought a subscription anonymously, logIn() will carry it forward.
 */
export function initRevenueCat() {
  if (initialized) return;
  
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  
  Purchases.configure({
    apiKey: Platform.OS === 'ios' ? RC_KEY_IOS : RC_KEY_ANDROID,
    // No appUserID — let RC assign an anonymous ID
  });
  
  initialized = true;
}

/**
 * Call immediately after the user creates their account or signs in.
 *
 * RC's logIn() does two things at once:
 *   1. Switches the RC identity to the permanent user ID
 *   2. Merges any purchases made as the anonymous user into that identity
 *
 * This is the mechanism that carries a pre-auth subscription onto the account.
 * Safe to call multiple times — RC is idempotent if the user is already identified.
 */
export async function identifyRevenueCatUser(userId: string): Promise<void> {
  try {
    const { customerInfo, created } = await Purchases.logIn(userId);
    console.log('[RC] logIn complete. New user:', created);
    
    // If the anonymous user had an active subscription, it's now on this account.
    const hasEntitlement = !!customerInfo.entitlements.active['vela_premium'];
    console.log('[RC] Has vela_premium after logIn:', hasEntitlement);
  } catch (error) {
    // logIn failing is non-fatal — subscription will restore on next getCustomerInfo()
    console.error('[RC] logIn error:', error);
  }
}

/**
 * Call on sign-out. Resets RC to a new anonymous identity.
 * The signed-out user's subscription is NOT carried to the new anonymous session.
 */
export async function resetRevenueCatUser(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('[RC] logOut error:', error);
  }
}
```

Initialize at app root, before the auth check:

```typescript
// app/_layout.tsx
import { initRevenueCat } from '@/services/revenuecat/init';

// Must be synchronous and first — paywall can fire during onboarding
initRevenueCat();
```

### The alias flow in practice

```
1. User opens app for the first time
   RC state: anonymous (e.g. $RCAnonymousID:abc123)

2. User completes onboarding, captures baseline, sees paywall
   RC state: still anonymous
   User subscribes → purchase attached to $RCAnonymousID:abc123

3. User creates Vela account (Supabase user ID: uuid-xyz)
   → identifyRevenueCatUser('uuid-xyz') is called
   → RC merges abc123's purchases into uuid-xyz
   RC state: identified as uuid-xyz, subscription intact

4. User signs out, reinstalls, signs back in
   → identifyRevenueCatUser('uuid-xyz') is called again
   → RC fetches uuid-xyz's subscription from server
   RC state: identified as uuid-xyz, subscription restored ✓
```

### Returning user who already has an account

If a user already has an account and signs in directly (not via new onboarding), `identifyRevenueCatUser()` restores their subscription immediately after login. No paywall shown.

```typescript
// In auth flow (file 03), after sign-in completes:
await identifyRevenueCatUser(supabaseUser.id);
// useSubscription() will now reflect their active subscription
```

---

## Subscription State Hook

```typescript
// src/hooks/useSubscription.ts
import { useState, useEffect } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';

export type SubscriptionStatus =
  | 'loading'
  | 'active'
  | 'trial'
  | 'expired'
  | 'none';

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  
  useEffect(() => {
    // Fetch once on mount
    Purchases.getCustomerInfo().then(resolve).catch(() => setStatus('none'));
    
    // Listen for changes (purchases, renewals, cancellations)
    const listener = Purchases.addCustomerInfoUpdateListener(resolve);
    return () => listener.remove();
  }, []);
  
  function resolve(info: CustomerInfo) {
    setCustomerInfo(info);
    const entitlement = info.entitlements.active['vela_premium'];
    
    if (!entitlement) {
      setStatus('none');
    } else if (entitlement.periodType === 'TRIAL') {
      setStatus('trial');
    } else {
      setStatus('active');
    }
  }
  
  const hasAccess = status === 'active' || status === 'trial';
  
  return { status, hasAccess, customerInfo };
}
```

---

## Presenting the Paywall

Use `RevenueCatUI.presentPaywall()` — an imperative call that shows the RC-designed paywall as a native modal and returns a result enum.

```typescript
// src/services/revenuecat/paywall.ts
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { CustomVariableValue } from 'react-native-purchases-ui';
import { router } from 'expo-router';

export type PaywallOutcome = 'purchased' | 'restored' | 'dismissed' | 'error';

/**
 * Show the RevenueCat paywall.
 * On dismiss (no purchase), route to the dead-end required screen.
 * On purchase/restore, return 'purchased'/'restored' to caller.
 */
export async function showPaywall(options?: {
  userName?: string;
}): Promise<PaywallOutcome> {
  try {
    const result = await RevenueCatUI.presentPaywall({
      // Inject user's name into the paywall copy.
      // The RC paywall must have a {{ user_name }} custom variable defined.
      customVariables: options?.userName
        ? { user_name: CustomVariableValue.string(options.userName) }
        : undefined,
    });
    
    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
        return 'purchased';
      
      case PAYWALL_RESULT.RESTORED:
        return 'restored';
      
      // User tapped the close button → hard dead-end
      case PAYWALL_RESULT.CANCELLED:
        router.replace('/subscription-required');
        return 'dismissed';
      
      case PAYWALL_RESULT.NOT_PRESENTED:
      case PAYWALL_RESULT.ERROR:
      default:
        return 'error';
    }
  } catch (error) {
    console.error('[RC Paywall] Error:', error);
    return 'error';
  }
}

/**
 * Show paywall only if user doesn't already have access.
 * Useful for gating screens rather than replacing them.
 */
export async function showPaywallIfNeeded(): Promise<PaywallOutcome> {
  try {
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: 'vela_premium',
    });
    
    switch (result) {
      case PAYWALL_RESULT.PURCHASED: return 'purchased';
      case PAYWALL_RESULT.RESTORED:  return 'restored';
      case PAYWALL_RESULT.CANCELLED:
        router.replace('/subscription-required');
        return 'dismissed';
      default:
        return 'dismissed';
    }
  } catch (error) {
    return 'error';
  }
}
```

---

## Where the Paywall Is Triggered

The paywall fires **during onboarding, after the baseline score reveal, before account creation**.

```
Reveal screen → [1.2s delay] → RC Paywall → [purchased] → Account creation screen → Dashboard
                                           → [dismissed] → /subscription-required
```

```typescript
// app/(capture)/reveal.tsx
import { useEffect } from 'react';
import { showPaywall } from '@/services/revenuecat/paywall';
import { useSubscription } from '@/hooks/useSubscription';
import { router } from 'expo-router';

export default function RevealScreen() {
  const { hasAccess } = useSubscription();
  const { isBaseline } = useCapture();
  
  useEffect(() => {
    if (!isBaseline) return;
    if (hasAccess) {
      // Already has subscription (e.g. restored from another device pre-login)
      router.replace('/(onboarding)/create-account');
      return;
    }
    
    // Brief delay so the reveal animation completes first
    const timer = setTimeout(async () => {
      const outcome = await showPaywall();
      
      if (outcome === 'purchased' || outcome === 'restored') {
        // Subscription confirmed — move to account creation
        // The account creation step calls identifyRevenueCatUser() which
        // merges this anonymous purchase onto the new account.
        router.replace('/(onboarding)/create-account');
      }
      // 'dismissed' already navigates to /subscription-required
    }, 1200);
    
    return () => clearTimeout(timer);
  }, [isBaseline, hasAccess]);
  
  // ... rest of reveal screen
}
```

### Account creation screen (added to onboarding)

This screen comes **after** the paywall, not before. It creates the Supabase account and immediately calls `identifyRevenueCatUser()` so the subscription transfers.

```typescript
// app/(onboarding)/create-account.tsx
import { useState } from 'react';
import { supabase } from '@/services/supabase';
import { identifyRevenueCatUser } from '@/services/revenuecat/init';
import { setSingularUserId } from '@/services/singular/init';
import { router } from 'expo-router';

export default function CreateAccountScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  async function handleCreateAccount() {
    setLoading(true);
    
    try {
      // 1. Create Supabase account
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      
      const userId = data.user!.id;
      
      // 2. Identify RC — merges anonymous purchase onto this account
      await identifyRevenueCatUser(userId);
      
      // 3. Identify Singular (file 31)
      setSingularUserId(userId);
      
      // 4. Done
      router.replace('/(main)/dashboard');
    } catch (error) {
      toast.error('Could not create account. Try again.');
    } finally {
      setLoading(false);
    }
  }
  
  // Also support "Sign in instead" for returning users
  async function handleSignIn() {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error('Sign in failed'); return; }
    
    await identifyRevenueCatUser(data.user.id);
    setSingularUserId(data.user.id);
    router.replace('/(main)/dashboard');
  }
  
  // ... UI
}
```

### Updated onboarding sequence

```
welcome → section-a … section-e → permissions → capture → reveal
  → [paywall] → create-account → dashboard
```

The create-account screen is the last step of onboarding, not the first. Users give their email after they've already paid — this reduces friction at the highest-drop-off moment (the paywall).

---

## Dead-End Screen (`/subscription-required`)

The only custom screen we own. Shown when the user closes the paywall without subscribing.

Apple compliance: the close button on the paywall must be present (we can't remove it), so we intercept the dismissal and route here instead of returning to free features.

```typescript
// app/subscription-required.tsx
import { View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { Headline, Body } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { SubscriptionRequired } from '@/components/illustrations';
import { showPaywall } from '@/services/revenuecat/paywall';
import { Spacing } from '@/theme/spacing';
import { useProfileStore } from '@/stores/profileStore';

export default function SubscriptionRequiredScreen() {
  const colors = useColors();
  const { profile } = useProfileStore();
  
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background.primary,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xxl,
      gap: Spacing.lg,
    }}>
      <SubscriptionRequired />
      
      <Headline style={{ textAlign: 'center' }}>
        Vela requires a subscription
      </Headline>
      
      <Body color="secondary" style={{ textAlign: 'center' }}>
        Your baseline is saved. Subscribe to see your scores, 
        track your progress, and get your personalized routine.
      </Body>
      
      <Button
        title="See subscription options"
        onPress={() => showPaywall({ userName: profile?.name })}
        style={{ marginTop: Spacing.lg }}
      />
    </View>
  );
}
```

**No back button. No navigation header. No way to get to free content from here.**

```typescript
// In the route config
<Stack.Screen
  name="subscription-required"
  options={{
    headerShown: false,
    gestureEnabled: false,       // No swipe-back
    headerBackVisible: false,
  }}
/>
```

---

## Settings: Manage Subscription

In Settings → Subscription section (file 14), the "Manage subscription" row opens Apple's native subscription management via RevenueCat:

```typescript
import Purchases from 'react-native-purchases';
import { Linking } from 'react-native';

async function openSubscriptionManagement() {
  try {
    const info = await Purchases.getCustomerInfo();
    const mgmtUrl = info.managementURL;
    if (mgmtUrl) {
      await Linking.openURL(mgmtUrl);
    } else {
      // Fallback: open App Store subscriptions page
      await Linking.openURL('https://apps.apple.com/account/subscriptions');
    }
  } catch {
    await Linking.openURL('https://apps.apple.com/account/subscriptions');
  }
}
```

Restore Purchases is built into the RC paywall itself. But also expose it in Settings for users who arrive there:

```typescript
import Purchases from 'react-native-purchases';
import { toast } from '@/services/toastService';

async function restorePurchases() {
  try {
    const info = await Purchases.restorePurchases();
    if (info.entitlements.active['vela_premium']) {
      toast.success('Subscription restored');
    } else {
      toast.info('No active subscription found');
    }
  } catch (error) {
    toast.error('Restore failed. Try again or contact support.');
  }
}
```

---

## A/B Testing Paywalls

Because the paywall lives in the RC dashboard, A/B tests require no code changes:

1. RC dashboard → Experiments → New experiment
2. Control: current paywall design
3. Variant: new copy, new price emphasis, new layout
4. Set audience split (50/50)
5. Ship — users automatically see either variant

Track the experiment from our side by pulling offering metadata:

```typescript
import Purchases from 'react-native-purchases';
import { track, Events } from '@/services/analytics/track';

async function logPaywallOffering() {
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  
  track(Events.PAYWALL_VIEWED, {
    offering_id:    current?.identifier ?? 'unknown',
    experiment_id:  current?.metadata?.experiment_id as string | undefined,
  });
}
```

---

## Custom Variables Reference

Define these in the RC Paywall Editor as `{{ variable_name }}` placeholders:

| Variable | Type | What it does |
|----------|------|-------------|
| `user_name` | string | Personalises headline: "Maya, your baseline is captured." |

Pass them via `customVariables` when calling `presentPaywall()`. If the variable isn't provided, RC falls back to the default copy defined in the editor.

---

## What We Don't Own

Because RC handles the paywall UI:

- **No `app/paywall.tsx`** — the screen doesn't exist in our codebase
- **No manual `purchasePackage()` calls** — RC's paywall handles the purchase flow
- **No offering fetching logic** — RC's paywall handles that internally
- **No loading state UI** — RC's paywall handles it
- **No error handling for failed purchases** — RC's paywall handles it
- **No pricing display** — configured in the RC dashboard, rendered natively

The only purchase-adjacent code we write is in the paywall service above (outcome routing) and in the settings screen (manage + restore).

---

## Environment Variables

```bash
# .env.development / .env.staging / .env.production
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx  # When Android ships
```

Use separate RC apps per environment (development / production). Sandbox purchases work against the development app; real purchases only go to production.

---

## Pre-Launch Checklist

- [ ] `react-native-purchases` + `react-native-purchases-ui` installed
- [ ] RC entitlement `vela_premium` created
- [ ] Annual + monthly products created in App Store Connect
- [ ] Both products linked to RC offering `default`
- [ ] Paywall designed in RC dashboard (brand colors, Vela copy)
- [ ] `user_name` custom variable defined in paywall editor
- [ ] Paywall attached to offering and published
- [ ] `initRevenueCat()` called at app root **without** a user ID (anonymous)
- [ ] Paywall fires after baseline reveal with 1.2s delay, **before** account creation
- [ ] `identifyRevenueCatUser(userId)` called in create-account screen after Supabase signup
- [ ] `identifyRevenueCatUser(userId)` also called on existing-user sign-in
- [ ] `resetRevenueCatUser()` called on sign-out
- [ ] `PAYWALL_RESULT.CANCELLED` routes to `/subscription-required`
- [ ] `/subscription-required` has no back gesture, no header
- [ ] Manage subscription opens `managementURL`
- [ ] Restore Purchases works in Settings
- [ ] **Test the alias flow end-to-end on physical device:**
  - Subscribe anonymously (before creating account)
  - Create account
  - Verify `vela_premium` entitlement is active on the new user
  - Sign out, sign back in on a different device
  - Verify subscription restored on second device
- [ ] Paywall renders correctly in dark mode
- [ ] `NSUserTrackingUsageDescription` present (required before ATT, see file 31)
