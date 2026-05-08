# Phase C — Persistence & auth sync (complete)

Follow-ups from [REVIEW_PHASE_B_FINDINGS.md](./REVIEW_PHASE_B_FINDINGS.md) §B.6.

## C.1 Scan sessions (WatermelonDB)

- `persistScanSession` upserts by `remote_id` + `user_id` so `retryPendingSync` does not create duplicate rows.

## C.2 Diary (WatermelonDB + Zustand)

- `updateEntry` / `deleteEntry` call `upsertDiaryEntry` and `deleteDiaryEntryLocal` so local WMDB matches the in-memory store.

## C.3 Supabase auth

- `supabase.auth.onAuthStateChange` is registered once from `initializeServices` (right after `startSupabaseSessionRefresh`).
- **`INITIAL_SESSION`** — ignored (cold start uses `getSession` + shared hydrate to avoid duplicate work).
- **`SIGNED_IN`** — `hydrateStoresForUserSession` (same path as init: local hydrate, baseline, subscription, `retryPendingSync`, foreground retry loop, `updateFlow`, `Analytics.identify`).
- **`SIGNED_OUT`** — `useAppState.signOut()` (profile / feature / RevenueCat cleanup already centralized there).
- **`TOKEN_REFRESHED`** — updates `SessionUser` (`id` + `email`) only.
- **`USER_UPDATED`** — updates `SessionUser` + best-effort `loadProfile`; `updateFlow`.
- Shared helper: **`hydrateStoresForUserSession`** (`src/services/initialize.ts`), used by `getSession` and `SIGNED_IN`.

## C.4 E2E / `EXPO_PUBLIC_MOCK_USER_SCENARIO`

- Still **build-time** only — see [REVIEW_PHASE_A_INVENTORY.md](./REVIEW_PHASE_A_INVENTORY.md) **§A.6.1** for the CI recipe (one scenario per Maestro artifact).

## C.5 Backlog items addressed (post–Phase C pass)

- **Sync** — [Docs/SYNC_SCAN_RETRY.md](./SYNC_SCAN_RETRY.md); `SyncOrchestrator` persists WMDB on successful flush; Phase B table row updated.
- **Capture UX** — `capture.tsx` → `processing` → `results-reveal` (processing screen is wired, not dead).
- **`AppFlow`** — JSDoc on `paywall` / `lapsed_*` vs `updateFlow` in `src/types/appState.ts`.
- **Sign-out** — `signOut()` early-returns if already logged out; settings relies on **`SIGNED_OUT`** for cleanup after `supabase.auth.signOut()`.
- **`scan_results` UPDATE** — migration `20260611100000_scan_results_update_policy.sql` for own-row updates.
- **`record-subscription`** — updates **`profiles.is_in_trial`** / **`has_ever_paid`** when `app_user_id` is a UUID (best-effort from RC event fields).
- **`generate-monthly-wrapped`** — **`verify_jwt = false`** with dual auth: user JWT via `getAuthedUser`, **or** `x-vela-internal-secret` + JSON **`userId`** matching **`GENERATE_WRAPPED_INTERNAL_SECRET`** (documented in `.env.example`).
