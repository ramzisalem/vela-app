# 30 — Deep Linking

## Overview
How URLs route into Vela. Vela is an **iOS app only — there is no web version**. All deep links use the `vela://` custom URL scheme. No Universal Links, no AASA file, no web fallback pages.

Why this matters: push notifications, share cards, marketing campaigns, password resets — all rely on working deep links. Get this wrong and a user taps "Reset password" in their email and nothing opens.

---

## URL Scheme

One scheme, three variants (one per environment):

```javascript
// app.config.js
const scheme = {
  production: 'vela',
  staging:    'vela-staging',
  development: 'vela-dev',
}[APP_VARIANT];

export default {
  expo: {
    scheme,
    // ...
  },
};
```

This registers `vela://` (or `vela-staging://`, `vela-dev://`) to open the app.

No `associatedDomains`. No Universal Links. No web server needed.

---

## Route Map

All supported deep link paths:

| URL | Action | Auth required |
|-----|--------|---------------|
| `vela://` | Open app to dashboard (or onboarding) | Routes appropriately |
| `vela://capture` | Open capture flow | Yes, subscribed |
| `vela://dashboard` | Open dashboard tab | Yes |
| `vela://compare?from=ID&to=ID` | Open comparison with sessions | Yes, subscribed |
| `vela://session/ID` | Open session detail | Yes |
| `vela://settings` | Open settings tab | Yes |
| `vela://settings/subscription` | Open subscription management | Yes |
| `vela://settings/notifications` | Open notification prefs | Yes |
| `vela://treatment/start?id=ID` | Open new-treatment sheet pre-populated with a treatment ID (file 34) | Yes, subscribed |
| `vela://treatment/[id]` | Open treatment timeline view | Yes, subscribed; ownership-checked |
| `vela://practice/enroll?code=CODE` | Open practice-tier enrollment consent flow (file 49) | No (works for first-time enrollers) |
| `vela://winback/scan` | Single-use win-back free scan offer (file 46 day-90) | Yes, lapsed-readonly |
| `vela://delete-account/confirm?token=TOKEN` | Account-deletion email confirmation (file 14) | Yes |

### Password reset

Supabase sends a password reset email. The link in the email must be configured to use the custom scheme, not a web URL.

In the Supabase dashboard → Auth → URL Configuration:
- **Site URL:** `vela://`
- **Redirect URLs:** add `vela://reset-password`

Supabase then generates links like `vela://reset-password#access_token=...` that open the app directly.

```typescript
// app/(auth)/reset-password.tsx
// Supabase auto-processes the token fragment on app open via the JS SDK.
// We just render the new password form.
import { useState } from 'react';
import { supabase } from '@/services/supabase';

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  
  async function handleReset() {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Couldn't reset password");
    } else {
      toast.success('Password updated');
      router.replace('/(auth)/sign-in');
    }
  }
  // ...
}
```

### Share cards

Share cards (file 13) generate a static image. When shared via iOS Share Sheet, users share the **image directly** — no link, no URL. There is no shareable URL for a Vela comparison because there is no web to render it.

If a future use case requires a shareable link (e.g. for Singular tracking links), use a `vela://` deep link that opens the app to the relevant session. Users without the app will see a "This link requires Vela" message from iOS — that's acceptable.

### Singular tracking links

Singular campaign links (file 31) use Singular's own `sng.link` domain. These are handled by the Singular SDK via the `withSingularLink` callback — no changes needed on our side. Singular Links don't require Universal Links to work; they use fingerprinting and SKAdNetwork for attribution.

---

## Implementation: Expo Router Deep Linking

### Root layout handler

```typescript
// app/_layout.tsx
import { useEffect } from 'react';
import * as Linking from 'expo-linking';

export default function RootLayout() {
  useEffect(() => {
    // Handle initial URL (app launched via link)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    
    // Handle subsequent URLs (app already open)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });
    
    return () => subscription.remove();
  }, []);
  
  function handleDeepLink(url: string) {
    const parsed = Linking.parse(url);
    routeFromDeepLink(parsed);
  }
  
  // ...
}
```

### Centralized routing logic

```typescript
// src/services/deepLinks/router.ts
import { router } from 'expo-router';
import type { ParsedURL } from 'expo-linking';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

interface PendingLink {
  path: string;
  params?: Record<string, string>;
}

export async function routeFromDeepLink(parsed: ParsedURL): Promise<void> {
  const { scheme, hostname, path, queryParams } = parsed;
  
  // Ignore links that aren't ours (Supabase OAuth callback, etc.)
  if (!scheme?.startsWith('vela')) return;
  
  // The "path" in vela://capture is hostname in expo-linking's parse
  const target = hostname ?? path ?? '';
  
  console.log('[DeepLink]', { target, queryParams });
  
  // Password reset — handled by Supabase JS SDK automatically,
  // but we navigate to the reset screen to render the form
  if (target === 'reset-password') {
    router.push('/(auth)/reset-password');
    return;
  }
  
  // OAuth callback — Supabase handles the token, just load the app
  if (target === 'auth' && path?.includes('callback')) {
    return;
  }
  
  // Auth guard
  const { isAuthenticated, hasCompletedOnboarding } = useAuthStore.getState();
  const { hasActiveSubscription } = useSubscriptionStore.getState();
  
  if (!isAuthenticated || !hasCompletedOnboarding) {
    storePendingLink({ path: target, params: queryParams as Record<string, string> });
    router.push('/(auth)/welcome');
    return;
  }
  
  const requiresSubscription = ['capture', 'compare', 'session'].includes(target);
  if (requiresSubscription && !hasActiveSubscription) {
    router.push('/subscription-required');
    return;
  }
  
  routeToDestination(target, queryParams as Record<string, string>);
}

function routeToDestination(target: string, params?: Record<string, string>) {
  const map: Record<string, string> = {
    '':               '/(main)/dashboard',
    'dashboard':      '/(main)/dashboard',
    'capture':        '/(capture)/pre-capture',
    'compare':        '/(main)/compare',
    'history':        '/(main)/history',
    'routine':        '/(main)/routine',
    'settings':       '/(main)/settings',
  };
  
  if (target === 'session' && params?.id) {
    if (!isValidUUID(params.id)) return;
    router.push(`/(modal)/session-detail/${params.id}`);
    return;
  }
  
  if (target === 'compare' && params?.from && params?.to) {
    router.push(`/(main)/compare?from=${params.from}&to=${params.to}`);
    return;
  }
  
  if (target === 'settings' && params?.section) {
    router.push(`/(main)/settings?section=${params.section}`);
    return;
  }
  
  router.push(map[target] ?? '/(main)/dashboard');
}

// Pending link for post-auth routing
import AsyncStorage from '@react-native-async-storage/async-storage';
const PENDING_KEY = 'vela.pendingDeepLink';

async function storePendingLink(link: PendingLink) {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(link));
}

export async function consumePendingLink(): Promise<PendingLink | null> {
  const stored = await AsyncStorage.getItem(PENDING_KEY);
  if (!stored) return null;
  await AsyncStorage.removeItem(PENDING_KEY);
  return JSON.parse(stored);
}

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
```

### After auth: complete the pending link

```typescript
// In sign-in / onboarding create-account completion
import { consumePendingLink, routeToDestination } from '@/services/deepLinks/router';

async function onAuthComplete() {
  const pending = await consumePendingLink();
  if (pending) {
    routeToDestination(pending.path, pending.params);
  } else {
    router.replace('/(main)/dashboard');
  }
}
```

---

## Use Cases

### Notification → capture

```typescript
// In notification handler (file 12)
Notifications.addNotificationResponseReceivedListener((response) => {
  const { type } = response.notification.request.content.data || {};
  
  if (type === 'weekly_check_in') {
    handleDeepLink('vela://capture');
  } else if (type === 'milestone_reached') {
    handleDeepLink('vela://compare?from=baseline&to=latest');
  }
});
```

### Marketing campaign → specific screen

Singular tracking links (file 31) handle attribution separately. For the actual in-app routing after install, use passthrough params:

```typescript
// Singular withSingularLink callback
config.withSingularLink((params) => {
  if (params.deepLink) {
    // deepLink is a vela:// URL set in the Singular campaign
    handleDeepLink(params.deepLink);
  }
});
```

Set the deep link on the Singular campaign to `vela://routine` or `vela://capture` as needed. No web URL involved.

---

## Testing Deep Links

### iOS Simulator

```bash
xcrun simctl openurl booted "vela://capture"
xcrun simctl openurl booted "vela://compare?from=abc&to=def"
xcrun simctl openurl booted "vela://settings?section=subscription"
```

### Development builds

```bash
# Dev builds use vela-dev:// scheme
xcrun simctl openurl booted "vela-dev://capture"

# Or via uri-scheme
npx uri-scheme open "vela://capture" --ios
```

### Maestro E2E

```yaml
# .maestro/deep-link.yaml
appId: com.velapp.vela.dev
---
- launchApp:
    permissions:
      all: allow
- openLink: "vela://capture"
- assertVisible: "First scan"
```

---

## Edge Cases

### Cold start with deep link

URL arrives via `Linking.getInitialURL()`. Must wait for auth to resolve before routing:

```typescript
useEffect(() => {
  async function init() {
    await checkAuth(); // Wait for auth state
    const url = await Linking.getInitialURL();
    if (url) handleDeepLink(url);
  }
  init();
}, []);
```

### Invalid session ID

```typescript
useEffect(() => {
  loadSession(id).catch((err) => {
    if (err.code === 'NOT_FOUND') {
      toast.error('That scan no longer exists');
      router.replace('/(main)/history');
    }
  });
}, [id]);
```

### Link arrives while subscription is expired

The router checks subscription state before routing to protected screens. Expired users get sent to `/subscription-required` where they can resubscribe, then the original destination resumes via the pending link queue.

---

## Tracking Deep Link Source

```typescript
function handleDeepLink(url: string) {
  track(Events.DEEP_LINK_OPENED, {
    url,
    source: inferSource(url), // 'notification' | 'share' | 'marketing' | 'unknown'
    target: Linking.parse(url).hostname ?? '',
  });
  
  routeFromDeepLink(Linking.parse(url));
}
```

---

## Security

- Validate all ID params before use (UUIDs only, see `isValidUUID`)
- Never put passwords, tokens, or personal data in `vela://` URLs
- Auth state is always checked — deep links cannot bypass the paywall or login

---

## Setup Checklist

- [ ] `vela://` scheme registered in `app.config.js` per environment
- [ ] Supabase Auth → URL Configuration set to `vela://` (not a web URL)
- [ ] `vela://reset-password` added to Supabase redirect URLs
- [ ] Deep link handler in `app/_layout.tsx`
- [ ] Centralized router in `src/services/deepLinks/router.ts`
- [ ] Pending link storage for post-auth routing
- [ ] Notification deep links wired up (file 12)
- [ ] Singular `withSingularLink` callback routes via `handleDeepLink` (file 31)
- [ ] Analytics tracking deep link source
- [ ] All ID params validated before use
- [ ] Tested on physical device: cold start via tapped link
- [ ] Tested on physical device: link arrives while app is open
- [ ] Maestro tests for critical paths
