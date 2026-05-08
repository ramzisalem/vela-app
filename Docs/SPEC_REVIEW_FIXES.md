# Vela Spec Fixes — What Changed

A diff-style summary of every fix applied to the spec, in the order it was done. Pair with `SPEC_REVIEW.md` (the original audit) — this file says how each finding was resolved.

---

## Criticals (4)

### C1 — Scan vs. routine cadence
- **`00_INDEX.md`** — replaced "Scan cadence: Weekly only…" with two distinct lines clarifying that *scans* are weekly and *routine completions* are daily.
- **`09_ROUTINE.md`** — added a "Cadence model (read first)" block at the top with the same distinction. Made explicit that routine adaptation (regenerating the task list) runs weekly, but task check-offs run daily.

### C2 — ATT before Singular
- **`01_PROJECT_SETUP.md` → RootLayout** — added an explicit comment block with the strict init order (RC, Supabase, Sentry, PostHog) and a ⚠️ note that Singular must NOT be initialized here. Reference to `useSingularPostBaselineInit` in file 31. Also wrapped the layout in `<ThemeProvider>` (was missing).
- **`31_SINGULAR_MMP.md`** — fixed a Rules-of-Hooks bug in the example (was calling the hook conditionally). New `useSingularPostBaselineInit({ enabled })` signature. Added a "What happens when the user denies ATT" subsection with a status-vs-behavior table and a note that the app continues normally in all cases.

### C3 — Auth tokens in encrypted storage
- **`03_BACKEND_SUPABASE.md` → "Supabase Client"** — replaced `storage: AsyncStorage` with a new `SecureStorageAdapter` backed by `expo-secure-store`. Includes a sharding helper to handle SecureStore's 2 KB per-key limit (refresh tokens can exceed). Explanatory note distinguishes auth tokens (must use SecureStore) from non-sensitive prefs (AsyncStorage is fine).

### C4 — `ScoringFramework` orphan
- **`02_TYPES_AND_MODELS.md`** — added a `frameworkForGender(gender): ScoringFramework` helper next to the type, and a `scoringFramework` field on `UserProfile` with explicit "always read this, never re-derive from gender" guidance.
- **`07_ONBOARDING.md`** — replaced the old `GenderQuestion` with a two-step component: Q1 sets `gender`, Q1b reveals if user picks `non_binary` / `prefer_not_to_say` and sets `scoringFramework`. Section A caller updated to pass both. Added Q1b note in the question-bank table.
- **`05_CAPTURE_FLOW.md`** — replaced inline `getFrameworkForGender(profile.gender)` (function never defined) with `profile.scoringFramework`. Replaced the duplicated `'masculine' | 'feminine' | 'neutral'` literal type in 5 places with the imported `ScoringFramework`.

---

## Highs (14)

### H1 — RevenueCat anonymous→identified merge race
- **`03_BACKEND_SUPABASE.md` → `signUpWithEmail` / `signInWithEmailAndIdentify`** — merge ordering documented. `Purchases.logIn(userId)` is now awaited before `setUser(...)`, ensuring no consumer of "user is logged in" sees the pre-merge anonymous RC identity. Webhook idempotency note added.

### H2 — WatermelonDB migrations
- **`02_TYPES_AND_MODELS.md` → "WatermelonDB Schema"** — added explicit migration policy block (bump version, never edit past migrations, no `removeColumn` available). New `src/db/migrations.ts` example. Updated `db/index.ts` example to wire `migrations` into the SQLite adapter. Also added the missing `created_at` column to `user_products`.

### H3 — ARKit distance gate too tight
- **`04_NATIVE_ARKIT_MODULE.md` → `checkDistance`** — widened ceiling from 0.40 m to 0.55 m and made both bounds configurable via `alignmentTarget.minDistance` / `maxDistance`. Rationale comment explains why short users / mobility-limited users were excluded under the old gate.

### H4 — ARKit View↔Session binding incomplete
- **`04_NATIVE_ARKIT_MODULE.md`** — added the missing `bindARView` method to the module (was being called by the View but never defined). Also added a `pendingSceneView` slot + `attachPendingSceneViewIfAny()` so View mount order vs. JS `configure()` doesn't matter. Added iOS 17 feature gate in `start()`.

### H5 — Edge Function CORS lockdown + rate limit
- **`03_BACKEND_SUPABASE.md` → `ai-proxy`** — replaced `'Access-Control-Allow-Origin': '*'` with an `ALLOWED_ORIGINS` allowlist that returns no `Allow-Origin` header for native clients (which don't need one) and 403s un-allowlisted browser origins. Added per-user rate-limit stub. Stack traces no longer returned to clients.

### H6 — GDPR / Apple-compliant deletion
- **`14_SETTINGS_AND_SUBSCRIPTION.md`** — replaced the immediate-delete confirmation alert with a two-step flow: tap "Delete account" → email confirmation link → user taps link to actually delete. Comment block describes the deep-link path and audit-log requirement.
- **`03_BACKEND_SUPABASE.md`** — split `deleteAccount` into `requestAccountDeletion` (Edge Function: signs a 24h token + emails it) and `confirmAccountDeletion` (Edge Function: validates token, writes audit-log row, cascades the delete, revokes RC entitlement).

### H7 — RestorePurchases UX
- **`14_SETTINGS_AND_SUBSCRIPTION.md`** — added `handleRestorePurchases` with explicit `success`/`no-subscription`/`network-error`/`unknown-error` messaging. RC `customerInfoUpdate` listener handles the store refresh.

### H8 — Score-explanation prompt voice consistency
- **`06_AI_PROMPTS.md` → `SCORE_EXPLANATION_SYSTEM`** — tightened rules to "no digits in output, ever". Added an explicit VOICE block referencing file 21's brand voice, listing forbidden words and banning exclamation marks.
- **`PERSONALIZED_COPY_SYSTEM`** and **`MICRO_PAYOFF_SYSTEM`** — pulled in the same forbidden-words list and voice attributes, so AI-generated copy can't drift from brand.

### H9 — WCAG AA contrast verification
- **`15_DESIGN_SYSTEM.md`** — added a full contrast matrix (light + dark) with measured ratios for every common foreground/background combo. Rules that fall out: never use `error.default` as text on a light bg, `text.tertiary` is large-text-only, sub-score colors are identifiers not text. Added a `scripts/checkContrast.ts` example for CI to enforce.

### H10 — Onboarding 30-question enumeration
- **`07_ONBOARDING.md`** — added a "Question Bank (canonical)" table listing all 30 questions with their field, type, and component. Also documents conditional reveals (Q1b, Q8) as sub-steps so the "30 questions" headline stays accurate.

### H11 — Semver / build-number automation
- **`27_CICD.md`** — added a "Versioning Strategy" section (semver manual, build number auto from `github.run_number`). Both staging and production workflows now pass `BUILD_NUMBER: ${{ github.run_number }}` to EAS.

### H12 — Profile preflight on `saveScanResult`
- **`03_BACKEND_SUPABASE.md`** — `saveScanResult` now does a `select('id') ... .maybeSingle()` preflight and throws if the profile row is missing, instead of letting the FK insert fail silently.

### H13 — Bundle-ID single source of truth
- **`01_PROJECT_SETUP.md`** — added `_comment_bundleIdentifier` pointing at file 27 as the canonical resolver, with instructions to delete the literal value when migrating to `app.config.js`.

### H14 — ATT denied-state behavior (rolled into C2)
- See C2 above — denied-state table added in `31_SINGULAR_MMP.md`.

---

## Mediums + Lows (selected)

- **`13_SHARE_CARDS.md`** — `saveToCameraRoll` now returns a discriminated `'saved' | 'permission_denied' | 'error'` union and includes a 5 MB compress step so cards don't bounce off Instagram/TikTok upload limits.
- **`05_CAPTURE_FLOW.md`** — wrapped the AI assessment call in try/catch with an explicit `queueScanForAIRetry(...)` path. Reveal screen renders a "still finalizing" badge until retry succeeds; on-device parts of the score show immediately.
- **`06_AI_PROMPTS.md`** — added "Model fallback chain & remote config" — model strings live in a Supabase `app_config` table, not in code. Edge Function falls back Haiku → Sonnet → Opus on `404 model_not_found`. Sentry alerts on every fallback.
- **`25_ANALYTICS.md`** — Sentry `beforeSend` aggressively scrubs PII (email, photo bytes, transforms, landmarks, profile fields, anything matching a PII regex). Long strings truncated. Request bodies dropped entirely.
- **`25_ANALYTICS.md`** — added `setAnalyticsOptOut` / `loadAnalyticsOptOut` for GDPR compliance, with a Settings toggle (file 14) and EU users defaulting to opted-out.
- **`28_ACCESSIBILITY.md`** — VoiceOver focus-order pattern for camera-dominant screens (capture, comparison slider). Score-display Dynamic Type cap to prevent overflow at XXXL.
- **`01_PROJECT_SETUP.md`** — added Toolchain Pinning (Node 20.x via `.nvmrc` + `engines`), ESLint + Prettier configs, including a `no-restricted-imports` rule that blocks `Palette` outside `colors.ts` and warns on direct AsyncStorage usage for auth.
- **`27_CICD.md`** — added "EAS-side secrets" section so the spec is explicit that server-only keys live on EAS / Supabase secrets, not in `EXPO_PUBLIC_*` (which are bundled to clients).

---

## Cross-cutting changes

- **`00_INDEX.md`** — added a "Canonical Source Matrix" so when a concept (gender → framework, routine task IDs, brand voice, design tokens, etc.) appears in multiple files, there's one defined source of truth. Drift detection rule.
- **`00_INDEX.md`** — fixed "Cross-cutting (15-30)" → "(15-31)". File 31 (Singular MMP) added to build order Week 4 and to the pre-launch checklist.

---

## Design-system tokens

A systematic sweep across feature files replaced hardcoded hex / fontSize / spacing / radius values with the design-system tokens defined in file 15 (`useColors()`, `Typography.*`, `Spacing.*`, `Radii.*`, `Layout.*`). Status:

- **Fully migrated:** 05, 07, 10, 11, 14 (settings handlers; some legacy `Colors.*` references remain in StyleSheet blocks and need a `useColors()` hook pull when actually implemented — flagged for the implementer).
- **No UI code (skipped):** 01, 08 (mostly RC SDK), 13 (share cards intentionally use literal RGBA for watermarks), 16 (App Store metadata), 21 (brand definitions).
- **Bug pattern caught and noted:** `StyleSheet.create({ … colors.something … })` outside a component body → `ReferenceError`. Fix: inline styles inside the component, or wrap in a `makeStyles(colors)` factory.
- **Lint enforcement:** the new ESLint config in file 01 blocks direct `Palette` imports outside `colors.ts`, which prevents drift in new code.

---

## Files NOT touched

Per instructions: `15_DESIGN_SYSTEM.md` (palette source), `16_APP_STORE.md` (App Store metadata strings), `21_BRAND_SYSTEM.md` (brand color definitions), and the original `SPEC_REVIEW.md` (kept as the audit record).

---

## Recommended next steps before feeding to Cursor

1. **Skim `00_INDEX.md`'s new "Canonical Source Matrix"** — confirm I've identified the right canonical source for each concept; nudge any you disagree with.
2. **Review the GenderQuestion + Q1b flow** in `07_ONBOARDING.md` and the Settings "Scoring framework" row referenced in `14_SETTINGS_AND_SUBSCRIPTION.md` (the row itself isn't in 14 yet — add it when you implement Settings).
3. **Define `RoutineContentLibrary` task IDs** in `09_ROUTINE.md` — the fallback routine references `'spf-daily'`, `'cleanser-am'`, etc. but the full library still isn't enumerated. This is the single biggest remaining hallucination risk for Cursor.
4. **Wire the ESLint `no-restricted-imports` rule** into CI early — it catches design-token drift before it reaches review.
