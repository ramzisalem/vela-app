# Changelog

All notable changes to Vela are documented in this file. The format is loosely based on Keep a Changelog (https://keepachangelog.com/) and Vela uses Semantic Versioning.

## [Unreleased] - review / QA

- **Phase A (inventory).** `Docs/REVIEW_PHASE_A_INVENTORY.md` — env, MSW/Jest vs app, E2E bundle policy. `app.config.js`: EAS `test` profile uses **`.dev`** bundle id (`com.velapp.vela.dev`). `src/config/testMode.ts`: **`EXPO_PUBLIC_*`** mock flags + `getMockUserScenario()`, optional `expo-constants` `extra` mirror. Maestro YAML **`appId`** fixed to `com.velapp.vela.dev`. `eas.json` `test` env sets `EXPO_PUBLIC_USE_MOCK_AR=true`. Root layout **`__DEV__`** logs harness flags when `EXPO_PUBLIC_TEST_BUILD`.

- **Phase B (feature review + fixes).** `Docs/REVIEW_PHASE_B_FINDINGS.md` — auth/flow, capture/sync, paywall/RC/settings. **Fixes:** `initializeServices` loads profile, rehydrates `hasCompletedBaseline` from sessions, `checkSubscription` before `updateFlow`; `VELA_ENTITLEMENT_ID` (`vela_premium`) shared by `init` + `paywall`; paywall **See plans** uses same post-purchase path as auto-present; `profileExists` uses Supabase **count**; `signOut` clears profile + `Purchases.logOut`; deep links parse **`host` + `pathname`**; single-flight deep-link listener; capture **`weekNumber`** from prior sessions; **one** `Analytics.initialize` (inside `initializeServices` only).

## [Unreleased] - product direction

- **No clinician web app.** The `practice/` Next.js dashboard was removed. Vela’s positioning is **in-app AI + evidence citations** (e.g. routine explanations, settings evidence index, score copy) instead of a separate B2B staff portal.
- **CORS:** dropped `https://practice.getvela.com` from Edge Function allowlist (`supabase/functions/_shared/cors.ts`).
- **Types:** `src/types/practice.ts` header documents legacy DB-aligned shapes only; Supabase tables from file 49 may still exist until a follow-up migration removes them.

## [Unreleased] - v1.5 pass

### Mobile (file 35)

- **Hair capture.** `app/hair/capture.tsx` — four-angle flow (hairline front, crown, temples) with `CameraView`, on-device JPEG storage under `Documents/HairScans/`, deterministic density engine `src/core/hair/hairDensityEngine.ts`, and `syncHairScanToSupabase` for numeric aggregates only.
- **Hair store.** Async opt-in persisted via AsyncStorage; `bootstrap(userId)` loads prefs + remote `hair_scans` history; `recordScan` pushes to Supabase after each session.
- **Dashboard.** New `card.hairTracking` in slot 3 (priority below streak) and `HairTrackingCard` component.
- **Hair screen trend.** `app/hair/index.tsx` renders density `Sparkline`s for overall, crown, hairline, and temples (left/right average), after at least three scans (chronological order).
- **Weekly reveal** nudges hair capture when tracking is enabled (non-baseline path).
- **Init.** `initializeServices` calls `useHairStore.bootstrap` alongside scan/diary hydrate.

### Mobile (file 34)

- **Treatment Supabase sync.** `src/services/treatment/treatmentSync.ts` — fetch and merge remote `user_treatments` and `user_treatment_side_effects`, upsert after local mutations; newer `updatedAt` wins for treatments (with safe handling for invalid timestamps), local rows win on side-effect id conflicts. `fetchTreatmentsForUser` throws when Supabase returns `error` so bootstrap can log and keep local state.
- **Treatment store.** `useTreatmentStore.bootstrap(userId)` runs from `initializeServices`; `logSideEffect` and `resolveSideEffect` take explicit `userId` for RLS-aligned writes.
- **Add treatment.** `app/treatment/new.tsx` uses the signed-in app user id (`useAppState`) so rows match session bootstrap and valid UUIDs for Postgres.
- **Treatment detail.** Doctor export stays disabled until the `doctor-friendly-export` reveal; locked-state copy references signup age and timeline week from shared `DOCTOR_EXPORT_MIN_DAYS_SINCE_SIGNUP` (`calendar.ts`).
- **Feature reveals.** `useFeatureRevealStore` persists `history` + `globallyEnabled` via AsyncStorage; `signOut` clears history so another account does not inherit prompt state.
- **Side effect sheet.** Primary action shows a short saving state to avoid double submit.
- **Tests.** `src/services/treatment/treatmentSync.test.ts` — merge-by-recency, side-effect overlay, row mappers, invalid-date merge, `fetchTreatmentsForUser` error propagation; `treatmentStore` tests share real merge helpers via `jest.requireActual` on `treatmentSync` (sync functions mocked).

### Backend

- **Practice tier docs.** Migration `20260608120000_practice_tier_table_comments.sql` adds `COMMENT ON TABLE` for file 49 practice tables (no DDL/RLS changes).
- **Migration** `20260601100000_practice_consented_reads.sql` — RLS `select` on `scan_results` and `hair_scans` for practice members when enrollment is accepted, not revoked, and the relevant scope (`face-scans` / `hair`) is granted.

## [Unreleased] - persistence pass

- **Local-first hydrate.** `initializeServices` now restores scan history (`useScanStore.loadSessions`) and diary entries (`useDiaryStore.loadFromLocal`) from WatermelonDB before reconciling with Supabase, so the dashboard renders instantly on cold boot and offline.
- **Sync queue.** `useScanStore.retryPendingSync` retries any `pending_sync` / `failed` sessions, preserving `pending_sync` if the profile preflight (`ProfileMissingError`) hasn't bootstrapped yet, and downgrading to `failed` on other errors. Triggered on app start and on every `AppState → active` foreground transition.
- **Reconcile-on-load.** `loadSessions` merges remote rows by id and appends locally-pending sessions that haven't synced yet; sort key remains `createdAt`.
- **Tests.** Added `src/stores/scanStore.test.ts` covering ordering, retry-success, profile-missing handling, generic-error transition to `failed`, and pair selection. Total: 160 tests across 24 suites.

## [Unreleased] - polish pass

- **Scoring framework editor.** Settings → "Scoring framework" opens a sheet with the three options (masculine, feminine, neutral), short descriptions, and a confirm button. Past scans are not re-scored; the next scan picks up the new lens.
- **Switch to yearly.** The cancel-save `price-match-yearly` offer now drives `Purchases.purchasePackage(annual)` directly. RevenueCat handles the StoreKit prorated upgrade; we only react to the result.
- **Compare scrubber.** `app/(main)/compare.tsx` exposes every scan via a two-row scrubber (`from`, `to`); invalid pairs auto-snap so `from` always precedes `to`. Default selection remains oldest → newest.
- **Long-term trend card.** Now renders a real sparkline of overall scores over the most recent 26 scans. The aging-band card uses the same Sparkline at a tighter window. The Sparkline component lives at `src/components/charts/Sparkline.tsx` with a `components`-project Jest test (4 cases).
- **Init audit.** `initializeServices` now wires PostHog (`Analytics.initialize` + identify on resume). Sentry remains a documented post-launch follow-up.
- **Components Jest project.** `jest-expo` preset added under the `components` displayName; transformIgnore patterns extended to allow `expo-modules-core`. Total: 154 tests across 23 suites.
- **Maestro v1.1+v1.5 critical paths.** Added `diary-attach.yaml`, `experiment-create.yaml`, `health-correlation.yaml`, `monthly-wrapped.yaml`, `treatment-side-effect.yaml`, plus a `CHECKLIST.md` for CI gating.

## [Unreleased] - hardening pass

- **Local persistence (file 01).** WatermelonDB schema, migrations, and models for `scan_sessions`, `daily_routines`, `user_products`, `diary_entries`, and `health_snapshots`. Lazy native-adapter loader keeps unit tests fast.
- **Profile sync.** `profileStore.loadProfile/saveProfile` now hit Supabase via `profileService`, mapping every profile column.
- **Scan sync.** `scanStore.loadSessions(userId)` reads `scan_results` and rehydrates raw metrics, scores, and capture-3D context.
- **Subscription state.** `appStateStore.checkSubscription` calls RevenueCat (`fetchSubscriptionStatus`) and surfaces trial/active/family-share flags. `SubscriptionStatus` gains `expirationDate`, `productIdentifier`, `originalPurchaseDate`, `isFamilyShare`.
- **Life-stage cascade.** `useLifeStageMode` hook performs the atomic cascade across routine, dashboard, and streak when modes change.
- **Evidence Part A.** Replaced placeholder citations in the routine task library with curated DOI-backed entries from `src/data/evidence-database.json`.
- **Experiment compliance + verdict.** New `app/experiment/[id].tsx` with daily compliance toggle, stats row, and a verdict button gated by sample size and window close.
- **Treatment screen.** `Log a side effect` sheet, side-effect log with resolve, doctor-export button gated by feature reveal, calls `requestDoctorExport`.
- **Dashboard slot 6.** New cards for YoY insight, On-this-day, anniversary tribute, and Wrapped-ready surface in the existing card-stack registry; long-term trend card remains the default.
- **Diary entry points.** `DiaryAttachButton` wired into the scan reveal screen and a new history list with attached-note counts and a "Note for today" footer.
- **Settings screens.** `app/settings/evidence`, `app/settings/privacy`, `app/settings/life-stage` — all manifest-driven routes now resolve.
- **Deep links.** Added `vela://winback/scan`, `vela://wrapped/<month>`, `vela://journal/<slug>`, `vela://experiment/<id>`, `vela://treatment/<id>`, `vela://diary`, `vela://health`, and `vela://hair`.
- **Edge functions.** Added `journal-subscribe`, `evaluate-cancel-save`, and `send-lapsed-digest`. Hardened `extend-trial`, `generate-monthly-wrapped`, `doctor-pdf-export`, and `confirm-account-deletion` to use the canonical CORS preflight + `getAuthedUser` shared helpers.
- **Tests.** New unit tests for `diaryStore` and `healthStore` (8 tests). Total: 150 passing across 22 suites.
- **Jest.** Disabled watchman in config to avoid intermittent local hangs.

## [1.5.0] - Planned

- **Treatment tracking** (file 34): library of evidence-graded treatments, locked timeline, side-effect log, contraindication unification with life-stage modes, and a doctor PDF export.
- **Hair tracking** (file 35): opt-in density timeline at crown, hairline, and temples. Photos remain on-device.
- **Practice tier** (file 49): optional DB tables for legacy B2B enrollment; **no web dashboard** — product uses in-app AI + citations instead.

## [1.1.0] - Planned

- **HealthKit correlations** (file 33): on-device Pearson r + p-value pass between face metrics and sleep, HRV, cycle phase, hydration, alcohol, and workouts. Raw HealthKit values never leave the device.
- **Diary** (file 37): local-first entries, quick tags, weekly themes summary, AI auto-tagging that refuses to infer life-stage tags from context.
- **Monthly Wrapped** (file 38): server-generated recap with stat cards (scans, streak, metric ↑/steady/↓, patterns) and AI cards (cover tagline, in-your-words, quiet-note).
- **Experiment Mode** (file 44): one change at a time, hypothesis + daily action + duration, verdict engine that uses aging-band drift as noise reference.
- **Long-term retention** (file 45): YoY insight cards, On-this-day cards, anniversary tributes, Family Sharing recognition.
- **Vela Journal Part B** (file 50): monthly long-form essay channel published in-app, on the web, and via email.

## [1.0.0] - Unreleased

- Initial public release. Weekly aligned face tracking, honest five-dimensional scoring, adaptive routine, three comparison modes, on-device privacy.
- Onboarding (30 questions) with non-binary Q1b gate and AI micro-payoffs between sections.
- Hard paywall with 7-day free trial.
- Day-7 trial forecast preview card.
- Aging band overlay with controllability callouts.
- Daily streaks with weekly auto-freeze + diary-tag freeze + life-stage auto-pause.
- Cancel-save flow with mode-aware offers and a respectful exit interview.
- Life-stage modes: pregnancy, postpartum, menopause (HRT and cancer-recovery gated behind sensitivity review).
- Drip-feed feature reveals: Apple Health Vital, Home Screen widget, lock screen complication, Apple Watch companion, Siri Shortcuts.
- Reactivation lifecycle (active / trial / grace / lapsed-readonly) with monthly email digest opt-in.
