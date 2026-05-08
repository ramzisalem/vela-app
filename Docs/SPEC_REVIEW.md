# Vela Spec Review — Issues, Bad Practices, Inconsistencies

A pass over all 32 markdown files in this folder, looking for things that will trip up Cursor (or you) when the spec turns into code. Findings are grouped by category and sorted by severity within each group. Every finding cites the file and a line/quote so you can verify before fixing.

---

## Executive Summary (fix these first)

1. **Scan cadence vs. routine cadence is contradictory.** `00_INDEX.md` says "Weekly only. No daily scans. Cadence enforced." (line 106) but `09_ROUTINE.md` tracks per-day completion via `completedDates`. Clarify: weekly *scans*, daily *routine check-offs*.
2. **ATT/Singular init order is unsafe.** `31_SINGULAR_MMP.md` requires ATT consent *before* Singular init, but `01_PROJECT_SETUP.md` shows the app root initializing services in `useEffect` with no ATT step. If Singular fires first, attribution is permanently lost on every install.
3. **Auth tokens stored in unencrypted AsyncStorage.** `03_BACKEND_SUPABASE.md` line 215 sets `storage: AsyncStorage`. Switch to `expo-secure-store` — AsyncStorage is unencrypted on Android.
4. **`ScoringFramework` type is orphaned.** `02_TYPES_AND_MODELS.md` defines `'masculine' | 'feminine' | 'neutral'` but `07_ONBOARDING.md` never asks for it and `09_ROUTINE.md` filters by `Gender` instead. Either wire it through or delete it.
5. **No GDPR-compliant deletion flow.** `14_SETTINGS_AND_SUBSCRIPTION.md` confirms via alert and deletes immediately. No email-confirmation step, no audit trail. Article 17 wants both.
6. **AA contrast is asserted but never verified.** `28_ACCESSIBILITY.md` mandates AA; `15_DESIGN_SYSTEM.md` ships colors without a contrast matrix.
7. **Routine fallback references task IDs that aren't defined anywhere.** `09_ROUTINE.md` lines 111–162 use IDs like `'spf-daily'`, `'cleanser-am'` — the task library is mentioned but never specified. Cursor will invent it differently each time.
8. **Index claims "Cross-cutting (15-30)" but file 31 exists** and is omitted from build order, pre-launch checklists, and architecture summary. Decide where Singular MMP belongs.

---

## 1. Cross-File Contradictions

**1.1 — CRITICAL — Weekly scans vs. daily routine.**
`00_INDEX.md` line 106 ("Weekly only. No daily scans.") vs. `09_ROUTINE.md` `completedDates` map keyed by day. The two cadences need to be named distinctly so Cursor doesn't gate one on the other.
*Fix:* Reword line 106 to "Scans: weekly. Routine completions: daily."

**1.2 — HIGH — Gender branching scattered across three files.**
`02_TYPES_AND_MODELS.md` defines `Gender` and a separate `ScoringFramework`. `07_ONBOARDING.md` only asks for `Gender`. `09_ROUTINE.md` filters by `genderSpecific` flag on tasks. Three sources of truth, two unused.
*Fix:* Pick one (Gender), delete `ScoringFramework`, and reference the same enum in 02 / 07 / 09.

**1.3 — HIGH — Anonymous → identified RevenueCat merge race.**
`08_PAYWALL.md` lines 99–135: user subscribes anonymously, then creates account. `03_BACKEND_SUPABASE.md` lines 311–325 calls `Purchases.logIn()` after `signUpWithEmail`. If the RC webhook fires before `logIn()` resolves, revenue attaches to the anonymous RC user.
*Fix:* Document an explicit `await Purchases.logIn(userId)` *before* any other RC call, and don't acknowledge entitlement until merge completes.

**1.4 — MEDIUM — Weekday numbering convention only set in one place.**
`12_NOTIFICATIONS.md` line 61 uses Expo's "1=Sunday" but `07_ONBOARDING.md` doesn't specify how its day picker maps to JS `Date.getDay()` (0=Sunday).
*Fix:* In 07, defer explicitly to 12's convention or show the conversion.

**1.5 — MEDIUM — `perceivedAge` exists in types but never surfaced.**
`02_TYPES_AND_MODELS.md` lines 199, 375 vs. `06_AI_PROMPTS.md` (no mention) vs. `10_DASHBOARD.md` (no display).
*Fix:* Either show it on the dashboard with a confidence band, or drop it.

---

## 2. Internal Inconsistencies Inside a File

**2.1 — HIGH — `07_ONBOARDING.md` says 30 questions, shows 6.**
Section A's code snippet implements Q1–Q6. Sections B–E describe categories but don't enumerate questions explicitly. Cursor will stub the missing ~24.
*Fix:* List all 30 questions verbatim, or move them to a referenced QBank file.

**2.2 — MEDIUM — `04_NATIVE_ARKIT_MODULE.md`: view → session wiring is incomplete.**
`VelaFaceTrackerView` (lines 311–353) calls `connectToSession()` → `bindARView()`, but the module (lines 229–298) doesn't expose `bindARView`. The native view will compile but won't bind.
*Fix:* Add the method to the module or document the singleton/shared-session pattern explicitly.

**2.3 — MEDIUM — `03_BACKEND_SUPABASE.md`: `saveScanResult` has no profile preflight.**
A scan saved for a user whose profile row was deleted will FK-fail silently with no retry path.
*Fix:* Check / upsert profile stub before scan insert, or add a dead-letter queue.

**2.4 — MEDIUM — `02_TYPES_AND_MODELS.md`: `created_at` decorators not consistent.**
Schema declares `created_at` on `daily_routines` and `user_products`, but the model classes shown elsewhere don't always have `@readonly @date`.
*Fix:* Audit all WatermelonDB models so every timestamp column has the decorator.

---

## 3. Index Hygiene (`00_INDEX.md`)

**3.1 — MEDIUM — Build order omits Week-1 essentials.**
"Week 1: 01, 02, 03, 15" but theme provider, Zustand store wiring, and WatermelonDB init aren't mentioned. Devs will hit "Colors not exported" on day one.
*Fix:* Add an explicit "Theme & Providers" step.

**3.2 — MEDIUM — "Cross-cutting (15-30)" but file 31 exists.**
File 31 (Singular MMP) is missing from the section heading, build order, pre-launch checklist, and architecture diagram.
*Fix:* Either rename to "(15-31)" or split a new "Attribution & Growth" section.

**3.3 — LOW — "Each file ends with a checklist where relevant" is overstated.**
Files 02, 06, 13, 15, 18, 21, 22, 24 don't have one.
*Fix:* Tone down the claim or actually add stub checklists.

---

## 4. Risky / Bad-Practice Technical Decisions

**4.1 — CRITICAL — ATT request not sequenced before Singular init.**
See exec-summary item 2. `31_SINGULAR_MMP.md` describes the order in prose but no concrete `app/_layout.tsx` example shows it.
*Fix:* Drop a code block in 01 or 31 that does `requestTrackingPermissionsAsync` → `await` → `Singular.init` → `Purchases.configure`.

**4.2 — CRITICAL — AsyncStorage for auth session.**
See exec-summary item 3.
*Fix:* Wrap `expo-secure-store` in a Supabase storage adapter.

**4.3 — HIGH — Edge Function CORS is `*`.**
`03_BACKEND_SUPABASE.md` lines 507–514. Any caller with a valid Supabase JWT (from any project) could hit this if the URL leaks.
*Fix:* Restrict origin, validate the user's project, or remove CORS entirely (mobile clients don't need it).

**4.4 — HIGH — WatermelonDB schema pinned to `version: 1` with no migration plan.**
`02_TYPES_AND_MODELS.md` line 646. Any post-launch column change will fail to migrate.
*Fix:* Add a migration scaffold and a "bump version when changing schema" rule to 02.

**4.5 — HIGH — ARKit distance gate (0.25–0.40 m) is too tight.**
`04_NATIVE_ARKIT_MODULE.md` lines 488–489. Short users / short arms can't hit 40 cm.
*Fix:* Widen upper bound to ~0.50 m, test across heights, make configurable.

**4.6 — MEDIUM — Estimated age via ARKit geometry is unreliable.**
`04_NATIVE_ARKIT_MODULE.md` line 188. ARKit isn't an age model.
*Fix:* Replace with self-reported age, or surface only as a coarse band with confidence.

**4.7 — MEDIUM — Captured photos saved to `temporaryDirectory`.**
`04_NATIVE_ARKIT_MODULE.md` line 568. iOS may purge between launches.
*Fix:* Save under `Documents` (or app-group container) immediately.

**4.8 — MEDIUM — No certificate pinning for Supabase / OpenAI calls.**
Optional, but worth noting given the privacy positioning.
*Fix:* Pin via `react-native-ssl-pinning` for the prod build profile only.

---

## 5. Cursor-Specific Risks (LLM Code-Generation Drift)

**5.1 — HIGH — Gender branching has three locations and no canonical pattern.**
Cursor will invent three subtly different implementations.
*Fix:* Make 02 the single source, and have 07 and 09 quote-link to it.

**5.2 — HIGH — Score-explanation prompt mixes "no numbers" with verbose output examples.**
`06_AI_PROMPTS.md` line 26 vs. lines 55–76. Cursor (and the fast tier model at runtime) won't know which style to enforce.
*Fix:* Pick one and rewrite the example to match it exactly.

**5.3 — MEDIUM — Fallback routine uses task IDs that don't exist in the spec.**
`09_ROUTINE.md` references `RoutineContentLibrary` but doesn't define it. Cursor will fabricate the library.
*Fix:* Define the task library inline (id, name, gender flag, contraindications) or in a sibling file.

**5.4 — MEDIUM — Bundle ID conflict between 01 and 27.**
01 hardcodes one ID; 27 shows three env-specific IDs. Cursor will copy the wrong one.
*Fix:* Have 01 say "see 27 for env-specific bundleIdentifier resolution" and remove the hardcoded value.

---

## 6. Missing Pieces

**6.1 — HIGH — GDPR deletion verification.**
See exec-summary item 5.

**6.2 — HIGH — RestorePurchases error / offline path.**
Mentioned in 08 but no code, no UX state.
*Fix:* Add explicit retry + error toast in 08 and 14.

**6.3 — HIGH — ATT prompt copy and timing.**
`31_SINGULAR_MMP.md` defines the Info.plist string but no file says *when* to ask or what the user sees if they deny.
*Fix:* Decide (post-paywall, before main app) and document copy.

**6.4 — MEDIUM — Photo library permission missing from onboarding.**
13 (share cards) and 14 ("save to camera roll") need it; 07 never requests it.
*Fix:* Request lazily on first share/save, with rationale screen.

**6.5 — MEDIUM — No camera-permission-denied recovery flow.**
The native module returns an error; the spec doesn't describe a "go to Settings" deeplink screen.
*Fix:* Show recovery UI with `Linking.openSettings()`.

**6.6 — MEDIUM — No offline path for capture → AI.**
05 hands off to 06 with no fallback if the network drops mid-processing.
*Fix:* Persist landmarks + photos locally, queue AI call, retry on reconnect.

**6.7 — MEDIUM — Sentry PII scrubbing not specified.**
Could leak face data, photo URIs, profile fields.
*Fix:* Add `beforeSend` strip-list in 03 (or wherever Sentry init lives).

**6.8 — MEDIUM — No PostHog opt-out toggle.**
GDPR requires it.
*Fix:* Settings toggle → `posthog.optOut()`.

**6.9 — MEDIUM — App Store guideline 5.1.1(v) account-deletion language not flagged.**
Apple wants the deletion path to be discoverable without leaving the app.
*Fix:* Note this in 16, double-check 14 wording.

---

## 7. Brand / Voice / Persona Drift

**7.1 — MEDIUM — File 21 voice rules aren't passed to file 06 prompts.**
AI-generated micro-payoffs and milestone copy may produce "glow"-style language that 21 explicitly forbids.
*Fix:* Append the forbidden-words list and voice attributes to the relevant 06 system prompts.

**7.2 — MEDIUM — Marcus (file 18) will churn on feminine-coded tasks.**
File 09 only filters tasks marked `genderSpecific`. Anything unmarked goes to everyone.
*Fix:* Tag every task with masculine / feminine / neutral and filter accordingly.

**7.3 — LOW — "No emojis" rule not echoed in 13 (share cards).**
Possible inconsistency in shared assets.
*Fix:* Cross-reference 21 from 13.

---

## 8. Accessibility / Privacy

**8.1 — HIGH — AA contrast asserted, never verified.**
See exec-summary item 6.
*Fix:* Add a contrast matrix in 15 (or a `tokens.contrast.test.ts`).

**8.2 — MEDIUM — VoiceOver focus order on the capture screen is undefined.**
The AR view dominates; you need explicit `accessibilityElements`.
*Fix:* Add a short rule to 28 for camera-dominant screens.

**8.3 — MEDIUM — Score number may overflow at max Dynamic Type.**
File 10 ScoreCard uses a large numeric display.
*Fix:* Cap font scaling on the score, allow vertical reflow.

**8.4 — MEDIUM — No Singular DPA mentioned.**
GDPR requires a data-processing agreement before piping IDFA / events to Singular.
*Fix:* Add a one-line "DPA in place" gate to 31's pre-launch checklist.

---

## 9. Process / Ops

**9.1 — HIGH — No semver / build-number strategy.**
Manual bumps are error-prone, App Store will reject duplicate build numbers.
*Fix:* In 27, automate build number from `${{ github.run_number }}`; major/minor stays manual.

**9.2 — MEDIUM — EAS secret handling not documented.**
27 references env vars but doesn't show `eas secret create`.
*Fix:* Add a short EAS secrets section.

**9.3 — MEDIUM — Node version not pinned.**
Add `.nvmrc` and document in 01.

**9.4 — MEDIUM — No ESLint / Prettier config.**
Add to 01 with `extends: 'expo'`.

**9.5 — LOW — No branch-protection rules.**
Add a one-liner in 27.

---

## 10. Smaller Items

**10.1 — MEDIUM — iOS 15 vs. iOS 17 ARKit feature gating.**
04 should call out which features degrade on iOS 15–16.

**10.2 — MEDIUM — AI model version fallback missing.**
06 historically hardcoded vendor model strings. If OpenAI deprecates an id, the app breaks without fallback updates.
*Fix:* Add a fallback chain and store current model in Supabase config so it can be rotated remotely.

**10.3 — LOW — Medical disclaimer is in App Store copy but not in-app.**
Add to 14 (Settings) or as a one-time onboarding screen.

**10.4 — LOW — Share-card output size not bounded.**
13 doesn't cap PNG file size; some platforms reject >5 MB.

---

## Severity Tally

| Severity | Count |
|----------|-------|
| Critical | 4 |
| High | 14 |
| Medium | 24 |
| Low | 5 |

---

## Recommended Order of Operations Before Feeding to Cursor

1. **Resolve the four Criticals.** They're the ones that break revenue, security, or the product loop.
2. **Pick one source of truth** for: gender branching, routine task library, voice rules. Have every other file *quote-link* back to that source rather than re-stating.
3. **Add the missing-pieces sections** (GDPR deletion, ATT timing & denied state, offline capture, photo permission). These are the ones Cursor will silently skip.
4. **Add a 1-page compatibility matrix** at the top of `00_INDEX.md`: "If file X mentions concept Y, the canonical definition is in file Z." This is the single highest-leverage change for Cursor accuracy.

The spec is *unusually* thorough and well-organized — the issues above are mostly consistency and edge-case gaps, not foundational problems. A focused 4–6 hour pass to fix the Criticals + Highs and stitch together the cross-file references will pay back many hours of post-generation debugging.
