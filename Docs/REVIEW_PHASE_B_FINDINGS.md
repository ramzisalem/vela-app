# Phase B — Feature-domain review (findings)

Consolidated read-only audit (mobile app + services). Severity: **Critical** > **High** > **Medium** > **Low**.

## B.1 Auth, flow, routing, deep links

| Sev | Topic | Notes |
|-----|--------|------|
| Critical | Cold-start flow | `hasCompletedBaseline` and `subscription` were memory-only after restart. **Fixed:** after `loadSessions`, derive baseline from existing sessions; call `checkSubscription()` before `updateFlow()`. |
| High | Paywall “See plans” | Skipped `completePostPaywallSignup` / `restored` / `setSubscription`. **Fixed:** shared success handler with auto-present path. |
| High | Deep link path | `vela://delete-account/confirm` parsed as path `confirm` only. **Fixed:** combine `hostname` + `pathname` for custom schemes. |
| Medium | `onAuthStateChange` | Still optional follow-up for remote sign-out / token refresh. |
| Medium | Deep link listener | **Fixed:** single-flight guard to avoid duplicate `Linking` listeners on fast refresh. |
| Medium | `AppFlow` branches | `paywall` / `lapsed_*` in types but not set in `updateFlow` — confirm lifecycle ownership or prune. |
| Low | `subscription-required` | Copy mentions sign-out; UI only “View plan” — optional parity. |

**Solid:** Supabase SecureStore adapter, session refresh, post-paywall ordering in `postPaywallSignup.ts`, settings sign-out ordering.

## B.2 Scans, capture, sync

| Sev | Topic | Notes |
|-----|--------|------|
| High | `weekNumber` | Weekly capture always used `1`. **Fixed:** baseline stays `1`; otherwise `max(existing weekNumber) + 1`. |
| High | WMDB `persistScanSession` + retries | Duplicate local rows on retry — **not fixed** in Phase B (larger Watermelon upsert story). |
| Medium | `SyncOrchestrator` vs `retryPendingSync` | **Documented:** `Docs/SYNC_SCAN_RETRY.md`. Orchestrator now persists WMDB on success like `retryPendingSync`. Optional later: single internal helper. |
| Medium | Cold start race | Orchestrator flush vs init — **unchanged**; mitigation is ordered init + retry on foreground. |
| Low | `processing.tsx` stub | Verify dead route or wire. |

**Solid:** local-first `loadSessions`, `ProfileMissingError` handling, `retryPendingSync` tests, capture recovery UX.

## B.3 Paywall, RevenueCat, settings, diary, health

| Sev | Topic | Notes |
|-----|--------|------|
| Critical | Entitlement id | `paywall.ts` used `vela_pro`, `init.ts` used `vela_premium`. **Fixed:** single `VELA_ENTITLEMENT_ID` in `init.ts`, imported in `paywall.ts`. |
| High | `checkSubscription` unused | **Fixed:** called from `initializeServices` after hydrate. |
| Medium | RevenueCat `logOut` on sign-out | **Fixed:** best-effort `Purchases.logOut()` in `signOut`. |
| Medium | Profile `profileExists` | `head: true` + `data !== null` was unreliable. **Fixed:** use `count`. |
| Medium | Sign-out profile leak | **Fixed:** `useProfileStore.getState().clear()` in `signOut`. |
| Medium | Diary update/delete vs WMDB | Zustand-only for update/delete — follow-up for persistence. |
| Low | Diary / experiment docs vs UI | Swipe-delete comment, “sync” header on experiment store. |

**Solid:** RC anonymous configure + `logIn` ordering, health on-device framing, manifest-driven settings.

## B.4 Treatment & hair (spot-check)

Previously hardened: session `userId` on new treatment, feature-reveal persist, sync error throws, regional hair trends. No new blockers in Phase B pass.

## B.5 Phase B fixes applied (this commit)

- `initializeServices`: baseline rehydrate, `checkSubscription`, then `updateFlow`.
- `paywall.tsx`: unified purchase/restore success path for auto + “See plans”.
- `revenuecat/init.ts` + `paywall.ts`: `VELA_ENTITLEMENT_ID`.
- `profileService.ts`: `profileExists` via `count`.
- `appStateStore.ts`: `clear` profile + `Purchases.logOut` on sign-out.
- `deepLinks/index.ts`: `parseUrl` + listener guard.
- `capture.tsx`: `weekNumber` from scan history.
- `app/_layout.tsx`: remove duplicate `Analytics.initialize` (keep single call inside `initializeServices`).

## B.6 Recommended Phase C seeds (**done** — see [REVIEW_PHASE_C.md](./REVIEW_PHASE_C.md))

- Watermelon upsert for `scan_sessions` on successful sync retry.
- `onAuthStateChange` → `setUser` / `signOut` / `updateFlow`.
- Diary update/delete persistence.
- E2E: `EXPO_PUBLIC_MOCK_USER_SCENARIO` on CI per flow (documented in Phase C + Phase A inventory).
