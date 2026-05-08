# Vela — Cursor Build Index (React Native + Expo)

## What This Is
Vela is a longitudinal face tracking app built with **Expo + React Native + TypeScript**. Custom native ARKit module for iOS face tracking. Android version (later v2) uses ARCore via separate native module.

**Positioning:** "The Oura for your face." Serious longitudinal tracker, not a looksmaxxing app.

**Visual identity:** Cream surfaces, espresso text (never pure black), serif headlines for editorial moments, and a single pink → mauve → dusty-blue gradient (`VelaPrimary`) for primary actions. See file 15 for tokens, file 21 for brand voice.

---

## Critical Stack Decisions

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Expo SDK 51+ (managed with custom dev client) | Fastest iteration, supports native modules |
| Language | TypeScript (strict mode) | Type safety across the stack |
| Routing | Expo Router (file-based) | Modern routing, similar to Next.js |
| State | Zustand | Simpler than Redux, perfect for this scope |
| Backend | Supabase (JS SDK) | Auth, profile, sync |
| Subscriptions | RevenueCat React Native SDK | Cross-app entitlements |
| Camera | react-native-vision-camera | Best-in-class camera, frame processors |
| Face Tracking (iOS) | Custom Expo native module wrapping ARKit | The moat — must be native |
| Face Tracking (Android) | Custom Expo native module wrapping ARCore (v2) | Cross-platform parity |
| Local DB | WatermelonDB | Reactive, fast, offline-first |
| Animations | React Native Reanimated 3 | 60fps animations |
| Charts | Victory Native XL | Performant cross-platform charts |
| AI | OpenAI via Supabase Edge Function `ai-proxy` | Server-side, never expose API keys |
| Analytics | PostHog (EU) | Product analytics + feature flags |
| Errors | Sentry | Crash reporting |
| Testing | Jest + RNTL + Maestro | Unit, integration, E2E |

---

## Spec File Index (51 files total)

The spec is organized into six groups:

### Foundation (00-04) — Architecture & infrastructure
- `00_INDEX.md` — **This file. Read first.**
- `01_PROJECT_SETUP.md` — Expo init, dependencies, folder structure
- `02_TYPES_AND_MODELS.md` — All TypeScript types, Zustand stores, WatermelonDB schemas
- `03_BACKEND_SUPABASE.md` — Supabase setup, auth, profile API, Edge Functions
- `04_NATIVE_ARKIT_MODULE.md` — Custom Expo native module for ARKit (Swift)

### Core feature surfaces (05-14) — User-facing functionality
- `05_CAPTURE_FLOW.md` — Camera UI, alignment overlay, capture screen
- `06_AI_PROMPTS.md` — All AI prompts (scoring, routine, copy; OpenAI via Edge)
- `07_ONBOARDING.md` — 30-question onboarding with gender branching
- `08_PAYWALL.md` — Hard paywall, RevenueCat integration
- `09_ROUTINE.md` — Daily routine UI, task management, AI adaptation
- `10_DASHBOARD.md` — Home screen, score display, trend charts
- `11_COMPARISON.md` — Side-by-side, slider, difference views
- `12_NOTIFICATIONS.md` — Expo notifications, weekly reminders
- `13_SHARE_CARDS.md` — Viral shareable card generation
- `14_SETTINGS_AND_SUBSCRIPTION.md` — Settings, subscription, data export

### Cross-cutting systems (15-31) — Quality, polish, ops, growth
- `15_DESIGN_SYSTEM.md` — **Themed design system with dark mode** (light + dark)
- `16_APP_STORE.md` — App Store metadata, screenshots, review prep
- `17_TESTING_AND_LAUNCH.md` — Manual test checklist, launch playbook
- `18_PERSONAS.md` — Four primary personas + anti-personas
- `19_USER_JOURNEYS.md` — Day 1, Week 1-4, Month 3+ journeys
- `20_INFORMATION_ARCHITECTURE.md` — Sitemap, navigation, screen inventory
- `21_BRAND_SYSTEM.md` — Voice, wordmark, brand decision tree
- `22_FEEDBACK_SYSTEM.md` — Toasts, banners, alerts, haptics, sound
- `23_INTERACTIONS.md` — Gestures, scroll, keyboard, platform integration
- `24_ILLUSTRATIONS.md` — SVG illustration system, Lottie usage, icons
- `25_ANALYTICS.md` — PostHog event taxonomy, funnels, feature flags
- `26_AUTOMATED_TESTING.md` — Jest, RNTL, Maestro E2E
- `27_CICD.md` — GitHub Actions, EAS Build, environments
- `28_ACCESSIBILITY.md` — VoiceOver, Dynamic Type, Reduce Motion, contrast
- `29_PERFORMANCE.md` — Bundle size, memory, frame rate, monitoring
- `30_DEEP_LINKING.md` — URL schemes, Universal Links, routing
- `31_SINGULAR_MMP.md` — Singular attribution SDK (ad measurement, ATT, SKAdNetwork, GDPR)

### Differentiation features (32-39) — The moat-building layer

These are the features that take Vela from "an Oura for your face" to a product nobody else can credibly ship. They build on top of the v1 foundation. **Not all are v1 surfaces** — see "Build order" further down.

- `32_3D_CAPTURE.md` — Depth-aware capture, 3D symmetry, volume tracking, head-pose normalization, lighting normalization. The capture moat.
- `33_HEALTHKIT.md` — HealthKit correlations (sleep, HRV, cycle, hydration, weight). The "explain why my face changed" layer. The actual long-term moat.
- `34_TREATMENT_TRACKING.md` — Tretinoin/accutane/Botox/finasteride journeys. Locked timeline view, side-effect logging, doctor-friendly PDF export.
- `35_HAIR_TRACKING.md` — Hairline, crown, midline part, beard, brow tracking. Same capture infrastructure; v1.5.
- `36_AGING_ACCEPTANCE.md` — Natural aging band on charts. The brand-defining feature: shows what's expected vs. controllable, never sets a target.
- `37_DIARY.md` — Free-text + voice-to-text journal, AI auto-tagging, weekly summary. Local encryption. Powers correlations + Wrapped.
- `38_MONTHLY_WRAPPED.md` — First-of-month auto-generated retrospective. Beautiful, shareable, calm, brand-perfect. The retention payoff.
- `39_DAILY_STREAKS.md` — Anti-dark-pattern routine streaks. Forgive-by-default freezes, no flames, no panic, never punishing. The daily-engagement layer.

### Retention features (40-47) — Closing the leaks at every lifecycle phase

These are the features that turn a good app into a low-churn business. They map one-to-one to each phase where Vela could lose users — pre-paywall, trial, habit-formation, plateau, long-term, reactivation, cancellation. Together, they're the difference between LTV-positive growth and treadmill churn.

- `40_PREPAYWALL_VALUE.md` — "Your face right now" preview card + routine preview + onboarding friction audit. Bridges the moment between sign-up and the paywall with tangible value.
- `41_TRIAL_CONVERSION.md` — Day 7 forecast card + trial-extension save flow (14 free days, no discount). Closes the value-window gap that breaks trial conversion.
- `42_IOS_SURFACES.md` — Scan anchoring + widgets + Lock Screen + Apple Health Vital + Apple Watch + Siri Shortcuts. Incidental-engagement layer that compounds retention without nagging.
- `43_FEATURE_REVEALS.md` — Per-user drip-feed of feature introductions across weeks 6–20. Plateau prevention without urgency or FOMO.
- `44_EXPERIMENT_MODE.md` — N-of-1 personal experimentation with honest verdicts. The "AI lab partner" feature. Category-defining for the Maya persona.
- `45_LONG_TERM_RETENTION.md` — Year-over-year overlays + "On this day" cards + compound-effort visualization + anniversary moments + Family Sharing. Tenure compounds.
- `46_REACTIVATION.md` — 30-day grace window + "look back" read-only mode + monthly digest emails + day-90 win-back free scan. Lapsed users are preserved, not punished.
- `47_CANCEL_SAVE.md` — Usage-aware save offers + single-question exit interview + honest goodbye. No pause flow (file 46 covers that need); no dark patterns; one save attempt only.

### Audience-expansion & trust layer (48-50) — The next horizon

These files take Vela from "a great consumer app for the average user" into:
- **Modes for users whose lives aren't average** (pregnancy, menopause, HRT, cancer recovery)
- **A separate revenue stream** with much higher per-account margins (aesthetic medicine practice tier)
- **The trust scaffolding** that turns the brand into a publication and the routine into a sourced, defensible recommendation set

- `48_LIFE_STAGE_MODES.md` — Pregnancy, postpartum, menopause/perimenopause, HRT (E/T), cancer recovery as opt-in modes that adjust aging band, AI copy, routine bias, treatment contraindications, notifications, diary prompts, and streak rules.
- `49_PRACTICE_TIER.md` — B2B web dashboard for aesthetic medicine clinics. Patient enrollment with explicit consent, scoped data sharing, per-patient timelines, aggregate outcome reports, white-label option, conservative privacy posture (HIPAA-aware at v1, HIPAA-compliant at v2).
- `50_EVIDENCE_VOICE.md` — Evidence-linked routine tasks (every task has a citation set + plain summary in a tap-accessible "About this" sheet) plus the Vela Journal — a monthly long-form essay channel published in-app, on the web, and via email newsletter.

---


## Canonical Source Matrix (Cursor: read this before generating code)

When the same concept appears in multiple files, the **canonical** definition lives in exactly one place. If you see something elsewhere that contradicts the canonical source, the canonical source wins. Update only the canonical file and re-reference from the others.

| Concept | Canonical source | Referenced by |
|---|---|---|
| User profile schema (`UserProfile`, all enums) | `02_TYPES_AND_MODELS.md` | 03, 05, 07, 09, 14 |
| Gender → scoring framework mapping (`frameworkForGender`) | `02_TYPES_AND_MODELS.md` | 05 (scoring), 07 (onboarding), 09 (routine), 14 (settings override) |
| `ScoringFramework` literal values (`'masculine' \| 'feminine' \| 'neutral'`) | `02_TYPES_AND_MODELS.md` | 05, 06, 09 |
| Onboarding question bank (all 30 + Q1b conditional) | `07_ONBOARDING.md` ("Question Bank") | 17 (QA checklist), 25 (events) |
| Routine task IDs / library | `09_ROUTINE.md` ("Content Library") | 06 (AI prompt allowlist), 02 (referenced types) |
| Brand voice + forbidden words | `21_BRAND_SYSTEM.md` | 06 (every AI prompt), 07, 08, 12, 13, 22 |
| Design tokens (Colors, Typography, Spacing, Radii, Layout, Animation) | `15_DESIGN_SYSTEM.md` | every UI file (05, 07, 08–14, 22) |
| `VelaPrimary` gradient (pink → mauve → blue, 135°) | `15_DESIGN_SYSTEM.md` ("Brand gradient") | 07 (welcome CTA), 08 (paywall), 09 (done states), 11 (slider/segment), 13 (wordmark lockup), 14 (Settings actions) |
| Serif typography (`displaySerif`, `headlineSerif`, `sectionMarker`) | `15_DESIGN_SYSTEM.md` ("Typography") | 07 (welcome), 08 (paywall promise), 09 (Morning/Evening section markers), 10 (score reveal) |
| Theme context / `useColors()` hook | `15_DESIGN_SYSTEM.md` | every component |
| WCAG AA contrast verification | `15_DESIGN_SYSTEM.md` ("Contrast Matrix") | 28 |
| Auth session storage (SecureStore adapter) | `03_BACKEND_SUPABASE.md` ("Supabase Client") | 14, 25 |
| RevenueCat anonymous→identified merge | `08_PAYWALL.md` ("Anonymous-first init") | 03 (`signUpWithEmail`), 14 |
| Subscription cadence enforcement (weekly cooldown) | `03_BACKEND_SUPABASE.md` (server) + `09_ROUTINE.md` (client cadence rules) | 00, 05 |
| Account deletion (two-step GDPR flow) | `14_SETTINGS_AND_SUBSCRIPTION.md` (UI) + `03_BACKEND_SUPABASE.md` (`requestAccountDeletion` / `confirmAccountDeletion`) | 16, 30 (deep link) |
| ATT prompt timing & denied-state behavior | `31_SINGULAR_MMP.md` ("Initialization Order", "What happens when the user denies ATT") | 01 (root layout), 14 (Settings re-link) |
| AI Edge Function CORS + rate limit | `03_BACKEND_SUPABASE.md` (`ai-proxy`) | 06 (callers) |
| AI model versions (model.fast / model.quality + fallback) | `06_AI_PROMPTS.md` ("Model fallback chain") | 03 (Edge Function reads `app_config`) |
| WatermelonDB schema + migration policy | `02_TYPES_AND_MODELS.md` ("WatermelonDB Schema") | 27 (CI guard) |
| Bundle ID resolution (per-environment) | `27_CICD.md` ("Bundle IDs and visual indicators") | 01 (defers via `app.config.js`) |
| Build number automation | `27_CICD.md` ("Versioning Strategy" + workflow `BUILD_NUMBER`) | 01, 16 |
| Sentry PII scrubbing | `25_ANALYTICS.md` (`beforeSend`) | every service that captures errors |
| PostHog opt-out flow | `25_ANALYTICS.md` (`setAnalyticsOptOut`) | 14 (toggle UI) |
| Photo library permission (lazy on first share) | `13_SHARE_CARDS.md` (`saveToCameraRoll`) + `28_ACCESSIBILITY.md` | 14, 07 (NOT requested in onboarding) |
| Camera permission denied recovery | `05_CAPTURE_FLOW.md` + `Linking.openSettings()` | 04 (returns error), 17 (QA) |
| Distance gate (ARKit min/max) | `04_NATIVE_ARKIT_MODULE.md` (`DEFAULT_MIN_DISTANCE` / `DEFAULT_MAX_DISTANCE`) | 05 |
| 3D capture types (`Capture3D`, `CanonicalPose`) | `32_3D_CAPTURE.md` ("Types") | 02, 04, 05, 10, 11, 34 |
| Canonical pose normalization rule | `32_3D_CAPTURE.md` ("Quaternion-based pose normalization") | 04, 05, 11 |
| Lighting normalization thresholds (±15% / ±40%) | `32_3D_CAPTURE.md` ("Lighting normalization") | 05, 06, 10 |
| HealthKit data types we read | `33_HEALTHKIT.md` ("What HealthKit data we use") | 02, 03, 06, 14 |
| Correlation engine algorithm + thresholds | `33_HEALTHKIT.md` ("Correlation engine") | 06, 10, 38 |
| Treatment library schema (`TreatmentDefinition`) | `34_TREATMENT_TRACKING.md` ("The treatment library") | 02, 06, 09, 35 |
| User treatment instance schema | `34_TREATMENT_TRACKING.md` ("User-side treatment instance") | 02, 03, 09, 11, 13, 33, 38 |
| Hair scan metrics + regions | `35_HAIR_TRACKING.md` ("What we measure") | 02, 04, 05, 09, 10, 34 |
| Hair density algorithm + bias notes | `35_HAIR_TRACKING.md` ("Native module additions") | 04 |
| Natural-aging band dataset & rules | `36_AGING_ACCEPTANCE.md` ("What 'natural aging band' means") | 06, 10, 11, 21, 28 |
| Aging-band copy lint rules | `36_AGING_ACCEPTANCE.md` ("Forbidden in this feature") | 06, 21 |
| Diary entry schema + tag vocabulary | `37_DIARY.md` ("Types") | 02, 03, 06, 33, 34, 35, 36, 38, 39 |
| Diary encryption-at-rest pattern | `37_DIARY.md` ("Privacy" → "Storage") | 03, 14, 25 |
| Monthly Wrapped card structure | `38_MONTHLY_WRAPPED.md` ("Structure of a Wrapped") | 02, 03, 06, 13, 21 |
| Wrapped generation cron + cadence | `38_MONTHLY_WRAPPED.md` ("When Wrapped fires") | 03, 12, 27 |
| Streak consistency definition (80% rule) | `39_DAILY_STREAKS.md` ("Definitions") | 02, 09, 38 |
| Freeze rules (weekly auto / diary / holiday) | `39_DAILY_STREAKS.md` ("Freezes") | 09, 12, 37, 38 |
| Anti-dark-pattern checklist for streaks | `39_DAILY_STREAKS.md` ("Anti-dark-pattern checklist") | 21, 22 |
| Pre-paywall preview cards (face + routine) | `40_PREPAYWALL_VALUE.md` ("Card 1 / Card 2") | 05, 06, 07, 08 |
| Onboarding friction audit rules + question cuts | `40_PREPAYWALL_VALUE.md` ("Onboarding friction audit") | 07 |
| 30-day pre-paywall data purge | `40_PREPAYWALL_VALUE.md` ("Persistence & data lifecycle") | 03, 14, 25 |
| Day-7 forecast card + trajectory dataset | `41_TRIAL_CONVERSION.md` ("The Day 7 Forecast") | 06, 08, 12 |
| Trial-extension save flow eligibility | `41_TRIAL_CONVERSION.md` ("Eligibility rules") | 03, 08, 14 |
| Scan anchor types + notification copy | `42_IOS_SURFACES.md` ("Scan anchoring") | 02, 07, 12, 38, 39 |
| Widget + Lock Screen surfaces — what they show | `42_IOS_SURFACES.md` ("What surfaces show, by privacy axis") | 28, 30 |
| Apple Health Vital registration | `42_IOS_SURFACES.md` ("Apple Health Vital registration") | 33 |
| Feature reveal calendar + eligibility | `43_FEATURE_REVEALS.md` ("The reveal calendar") | every feature file 32–47 |
| Reveal card UX + dismiss / re-show rules | `43_FEATURE_REVEALS.md` ("Per-reveal card") | 10, 22 |
| Experiment definition + verdict engine | `44_EXPERIMENT_MODE.md` ("Types" / "The verdict engine") | 02, 06, 09, 36 |
| Routine lock during experiment | `44_EXPERIMENT_MODE.md` ("Living through the experiment") | 09 |
| Year-over-year chart overlay rules | `45_LONG_TERM_RETENTION.md` ("Year-over-year emergence") | 10, 11 |
| "On this day" card cadence | `45_LONG_TERM_RETENTION.md` ("On this day cards") | 10 |
| Compound visualization tile | `45_LONG_TERM_RETENTION.md` ("Compound visualization") | 10 |
| Anniversary card structure | `45_LONG_TERM_RETENTION.md` ("Anniversary moments") | 13, 38 |
| Family Sharing UX (organizer + member views) | `45_LONG_TERM_RETENTION.md` ("Family Sharing") | 08, 14 |
| Lapsed-user lifecycle (grace → readonly → digest → win-back) | `46_REACTIVATION.md` ("The lapsed-user lifecycle") | 03, 08, 12, 14, 47 |
| 30-day grace window behavior | `46_REACTIVATION.md` ("Phase 1") | 09, 10, 14 |
| Look-back mode allowed/blocked surfaces | `46_REACTIVATION.md` ("Phase 2") | 05, 09, 14 |
| Lapsed user email digest cadence + content | `46_REACTIVATION.md` ("Phase 3") | 03, 25 |
| Win-back free scan deep link | `46_REACTIVATION.md` ("Phase 4") | 30 |
| Cancel save offer engine + offer kinds | `47_CANCEL_SAVE.md` ("Step 1") | 03, 08, 14 |
| Exit interview categories + retention | `47_CANCEL_SAVE.md` ("Step 2") | 25 |
| Honest-goodbye screen + email digest opt-in | `47_CANCEL_SAVE.md` ("Step 3") | 14, 46 |
| Life-stage mode types + framework | `48_LIFE_STAGE_MODES.md` ("The framework") | 02, 06, 07, 14, 33, 34, 36, 37, 39 |
| Per-mode behavior (pregnancy/postpartum/menopause/HRT/cancer) | `48_LIFE_STAGE_MODES.md` ("Mode-specific behavior") | 06, 09, 12, 34, 36 |
| `LIFE_STAGE_CONTEXT` AI prompt block | `48_LIFE_STAGE_MODES.md` ("AI prompt integration") | 06 |
| Practice tier — clinic dashboard | `49_PRACTICE_TIER.md` ("The practice dashboard") | 03 |
| Patient enrollment + consent scope | `49_PRACTICE_TIER.md` ("Patient enrollment flow") | 02, 14, 30 |
| Practice tier RLS + privacy floors | `49_PRACTICE_TIER.md` ("Schema additions" / "RLS policies") | 03 |
| Evidence-linked routine tasks (`RoutineTaskEvidence`) | `50_EVIDENCE_VOICE.md` ("Part A") | 02, 06, 09, 34 |
| Vela Journal essays + subscriptions | `50_EVIDENCE_VOICE.md` ("Part B") | 03, 14, 21, 25, 46 |
| Editorial voice rules (extension of file 21) | `50_EVIDENCE_VOICE.md` ("Voice rules") + `21_BRAND_SYSTEM.md` ("Editorial voice") | every AI prompt + every essay |
| Forbidden-words consolidated list | `21_BRAND_SYSTEM.md` ("Forbidden words (consolidated list)") | 06, 22, 36, 38, 39, 41, 44, 46, 50 |

**Drift detection rule:** if a concept above appears in a file other than the canonical source AND the values diverge, treat it as a bug. Fix the non-canonical file to reference (or quote-link) the canonical source.

---

## How To Use These Files

### For initial implementation
Read in order: 00 → 01 → 02 → 03 → 04 → 05 → ...

Each foundation file (00-04) is required before later files. Within feature surfaces (05-14), files mostly stand alone.

### For ongoing reference
- **Building a screen?** → Reference 15 (design system) + 20 (IA) + 22 (feedback) + 23 (interactions) + 28 (a11y)
- **Writing UI copy?** → Reference 21 (brand voice) + 18 (persona test)
- **Adding a feature?** → Reference 19 (does it serve a journey?) + 18 (persona test) + 25 (track it)
- **Designing a flow?** → Reference 19 (journeys) + 22 (feedback patterns) + 23 (interaction patterns)
- **Pre-launch QA?** → Reference 17, 26, 28, 29 (each has a checklist)

### For Cursor specifically
Feed files to Cursor in domain order. Each file is self-contained for its domain. The cross-cutting files (15-30) inform every other file — keep them open as reference.

---

## Core Product Decisions (Read Before Building)

**Name:** Vela
**Platform:** iOS first (React Native + Expo, ready for Android v2)
**Minimum iOS:** iOS 15+ (some ARKit features require iOS 17 for best quality)
**Paywall:** Hard paywall after first scan. No free tier. No skip.
**Pricing:** $79/year (default) or $9.99/month. 7-day free trial.
**Backend:** Supabase (auth + profile + Edge Functions for AI proxy)
**AI:** OpenAI (gpt-4o-mini for speed-critical, gpt-4o for quality / vision)
**Subscription:** RevenueCat with cross-app entitlements (v2 scanner shares)
**Scan cadence:** Scans are weekly only — no daily scans. Cadence enforced server-side.
**Routine cadence:** Routine task check-offs are *daily* (file 09 tracks `completedDates` per day). Do not gate routine completion on the weekly scan cooldown.
**Gender branching:** Full experience branches from onboarding question 1
**Privacy:** Photos never uploaded. All face landmark data stays on-device.
**Themes:** Light AND dark mode required at v1 (built into design system from the start)
**Accessibility:** AA contrast minimum, VoiceOver support, Dynamic Type, Reduce Motion respected

---

## Persona Distribution (Target)

| Persona | Share | LTV |
|---------|-------|-----|
| Maya — Quantified Self (woman, 32) | ~35% | High |
| Marcus — Optimization-curious (man, 28) | ~25% | Medium |
| Priya — Treatment Tracker (woman, 38) | ~15% | Highest |
| Jordan — Considered Comeback (NB, 45) | ~15% | High (long-term) |
| Other / between personas | ~10% | Variable |

If a feature doesn't serve at least one of these personas, kill it. (Details in file 18.)

---

## What AI Does in Vela

AI is central to the product, not decorative:

1. **Score computation (qualitative parts)** — OpenAI vision assesses face photos for skin clarity, redness, grooming quality. Combined with on-device geometric measurements.

2. **Score explanations** — OpenAI explains *why* a score moved from week to week in user-friendly language.

3. **Routine generation** — OpenAI personalizes the routine by selecting tasks from a curated library based on profile + scores + weakest areas + lifestyle.

4. **Routine adaptation** — Each week, the model reviews progress and adapts: reinforces what's working, swaps what isn't.

5. **Personalized copy** — Onboarding micro-payoffs, milestone messages, notification content are AI-generated.

6. **(Future v2) Product analysis** — Vela Scan may use the same proxy to analyze ingredient lists against the user's profile.

All AI calls go through a Supabase Edge Function proxy. No API keys ever exposed to the client.

---

## What Vela Is NOT
- Not a looksmaxxing app (no "become hot" language — see file 21 for forbidden words)
- Not a beauty product recommender (no aggressive affiliate push at v1)
- Not a social app (no leaderboards, no public profiles — file 20)
- Not a medical device (always include medical disclaimer — file 14)
- Not Android at v1 (Android is v2 — architecture is ready though)
- Not noisy (no sounds in v1 — file 22)
- Not a chat companion (no AI conversation — file 20)
- Not a streak-shamer (file 39 freezes generously, never punishes)
- Not an "anti-aging" app (file 36 shows what's typical, never sets a target)
- Not a face data farm (files 32, 33, 37 keep the most sensitive data on-device)
- Not a discount peddler at cancellation (file 47 picks one offer per user, never stacks, never a second attempt)
- Not a guilt-trip channel for lapsed users (file 46 monthly digest is opt-in, plain, no "we miss you" copy)
- Not a one-size-fits-all app (file 48 acknowledges that pregnancy, menopause, HRT, and cancer recovery deserve their own handling)
- Not making medical claims, ever (file 50 evidence layer cites studies; file 49 practice tier explicitly says "not a medical record")
- Not a content factory (file 50 Vela Journal is one editorial essay a month; quality over volume)

---

## Architecture Summary

```
Vela App (React Native + Expo)
├── UI Layer (TypeScript + React Native + Expo Router)
│   ├── Onboarding Flow (file 07)
│   ├── Capture UI (file 05)
│   ├── Dashboard (file 10)
│   ├── Comparison Views (file 11)
│   ├── Routine UI (file 09)
│   └── Settings (file 14)
│
├── Native Module Layer (Swift, exposed to JS)
│   ├── VelaFaceTracker.swift (iOS - ARKit wrapper) — file 04
│   ├── VelaAnalysis.swift (iOS - Vision framework) — file 04
│   └── (Future) VelaFaceTrackerAndroid.kt (ARCore wrapper)
│
├── Business Logic Layer (TypeScript)
│   ├── Scoring engine (combines on-device + AI) — file 06
│   ├── Routine engine (template-based + AI selection) — file 09
│   ├── Profile manager — file 02
│   └── Sync orchestration — file 03
│
├── Data Layer
│   ├── WatermelonDB (local, reactive, offline-first) — file 02
│   ├── File system (photos in app sandbox) — file 05, 29
│   └── Supabase (auth, profile sync, scan results) — file 03
│
├── Service Layer
│   ├── Supabase client — file 03
│   ├── RevenueCat client — file 08, 14
│   ├── AI proxy client (calls Edge Function) — file 06
│   ├── Notification service (expo-notifications) — file 12
│   ├── Analytics (PostHog) — file 25
│   ├── Errors (Sentry) — file 25
│   └── Deep links — file 30
│
└── Cross-cutting (every layer touches these)
    ├── Theme (light + dark) — file 15
    ├── Brand voice — file 21
    ├── Feedback patterns — file 22
    ├── Interaction patterns — file 23
    ├── Illustrations — file 24
    └── Accessibility — file 28
```

---

## Mandatory Pre-Launch Checklists

Each file ends with a checklist where relevant. Run them all before App Store submission:

- File 17: Manual testing — every flow, both themes, real device
- File 26: Automated testing — coverage, CI green
- File 28: Accessibility — VoiceOver, contrast, Dynamic Type
- File 29: Performance — bundle, memory, startup time
- File 30: Deep linking — vela:// scheme and Supabase redirect URLs verified
- File 25: Analytics — events firing, funnels populated
- File 27: CI/CD — secrets rotated, environments aligned
- File 31: Singular MMP — ATT timing verified, DPA in place, SKAdNetwork IDs current
- File 32: 3D capture — canonical pose, lighting normalization, occlusion handling tested across iPhone matrix
- File 36: Aging acceptance — band dataset shipped with citations; brand-voice review of every band-related copy string
- File 39: Daily streaks — anti-dark-pattern checklist passed in full
- File 40: Pre-paywall preview cards land in <4 minute median sign-up flow; data purge cron verified
- File 41: Trial extension granted via RC sandbox + production; system-cancel detection working
- File 42: All iOS surfaces (anchor, widget, Lock Screen, Vital, Watch, Siri) functional and respecting privacy axes
- File 43: Reveal calendar tested with simulated long-running user; one-card-per-session rule honored
- File 46: 30-day grace + look-back + digest + win-back fully wired; email service deliverability verified
- File 47: Save-engine offer selection deterministic; exit-interview PII redaction tested; no anti-pattern slips through QA
- File 48: All five mode IDs registered in Settings → Health & lifestyle; pregnancy/postpartum/menopause modes fully functional; HRT and cancer-recovery modes registered with appropriate consent gates; sensitivity reviewer signed off on copy
- File 49: Practice dashboard at `practice.getvela.com` deployed; patient consent scope changes propagate within 5 seconds; RLS audit confirms diary, HealthKit, and life-stage data NEVER visible to clinic; HIPAA disclaimer reviewed by legal counsel
- File 50: Every routine task has populated `evidence` field with citations reviewed by medical advisor; first six Vela Journal essays drafted and reviewed; in-app, web, and newsletter pipelines functional

---

## Build Order Recommendation

### Week 1: Foundation
- 01 (project setup), 02 (types), 03 (Supabase), 15 (design system w/ dark mode)
- Get a hello-world build running with both themes

### Week 1-2: Core capture
- 04 (native ARKit module) — this is the hard part
- 05 (capture flow) — depends on 04

### Week 2: Onboarding & paywall
- 07 (onboarding), 06 (AI prompts), 08 (paywall)
- AI integration via Edge Function

### Week 3: Main app
- 09 (routine), 10 (dashboard), 11 (comparison)
- 21 (brand voice) reference throughout

### Week 4: Polish & ops
- 12 (notifications), 13 (share cards), 14 (settings)
- 28 (accessibility), 29 (performance) audits
- 27 (CI/CD), 25 (analytics), 30 (deep links), 31 (Singular MMP) infrastructure

### Pre-launch
- 16 (App Store), 17 (manual QA), 26 (automated tests)
- File 19 (journeys) walkthrough end-to-end
- File 18 (persona check) on every screen

### Differentiation features (post-v1 → v1.5)

The new files 32–39 are the moat layer. They build *on top of* the v1 foundation. The intended sequencing:

**v1 (with the foundation)** — these ship together because they enhance, rather than expand, the existing v1 surface:
- `32_3D_CAPTURE.md` — uses existing capture flow; adds depth math under the hood. **Ship at v1**: this is the capture moat and is more or less invisible to the user except in better-quality comparisons.
- `36_AGING_ACCEPTANCE.md` — modifies existing trend charts; light surface change. **Ship at v1**: it's the brand-defining moment. Without it, Vela is just a tracker.
- `39_DAILY_STREAKS.md` — extends existing routine engine. **Ship at v1**: drives daily engagement and is the foundation for retention.

**v1.1 (immediately after v1)** — additive features that don't block launch but are the highest-leverage early adds:
- `33_HEALTHKIT.md` — the actual moat. Should ship within 8 weeks of v1 to start collecting correlation data on existing users.
- `37_DIARY.md` — powers correlations and Wrapped meaningfully. Ship alongside or just after HealthKit.
- `38_MONTHLY_WRAPPED.md` — depends on streak data, diary data, and a full month of usage. Ship by end of v1's first calendar month so first cohort gets a Wrapped.

**v1.5 (next major release)**:
- `34_TREATMENT_TRACKING.md` — significant new surface, deserves its own focused launch.
- `35_HAIR_TRACKING.md` — new capture flows (top-down, back-camera). Depends on treatment tracking infrastructure for finasteride/minoxidil flows.

### Retention features sequencing (40-47)

The retention layer is essentially a pre-launch hardening pass. **Most of these need to be live at v1** because each one closes a different leak — you can't launch a paid app without trial conversion mechanics or a cancel-save flow and expect healthy LTV.

**v1 (mandatory)** — these are not optional for a sustainable paid launch:
- `40_PREPAYWALL_VALUE.md` — the bridge from sign-up to paywall. Without it, conversion collapses.
- `41_TRIAL_CONVERSION.md` — Day 7 forecast + trial extension. Without it, trial-to-paid is structurally broken (the value-window mismatch).
- `46_REACTIVATION.md` — 30-day grace + look-back mode. Required for the paywall to feel safe to cross. Email digest opt-in must exist on day 1.
- `47_CANCEL_SAVE.md` — usage-aware save offers + exit interview. Required for honest LTV measurement.

**v1 (high-priority, ship within first 6 weeks)**:
- `42_IOS_SURFACES.md` — scan anchoring is required at v1; widgets / Lock Screen / Watch / Siri can drip during weeks 1–6 (especially via the file 43 reveal cadence).
- `43_FEATURE_REVEALS.md` — required for plateau prevention. The system itself is a v1 ship; new reveals can be added over time.

**v1.1 (second milestone)**:
- `44_EXPERIMENT_MODE.md` — depends on stable routine engine + treatment tracking patterns. Ship at v1.1 once core data is reliable.
- `45_LONG_TERM_RETENTION.md` — most features (year-over-year, anniversary cards) only become meaningful at month 12; can ship at v1.1 with eligibility gates that keep them invisible until earned.

### Audience-expansion & trust layer sequencing (48-50)

**v1 (mandatory)**:
- `50_EVIDENCE_VOICE.md` (Part A: evidence-linked tasks). Every routine task in the library needs a populated `evidence` field at v1. The "About this" sheet is the trust scaffolding the brand promise depends on; it cannot be a v1.1 add. Part B (Vela Journal) is launch-adjacent — first essay drops on or near v1 launch day.

**v1 (high-priority within first 6 weeks)**:
- `48_LIFE_STAGE_MODES.md` — three of the five modes (pregnancy, postpartum, menopause) ship at v1 because they're the most common and most under-served. HRT and cancer-recovery modes ship within the first 6 weeks as they require additional sensitivity review and external partnership input (oncology-aware reviewers, trans health consultants). The framework and Settings UI ship at v1 with all five mode IDs registered so we can light them up incrementally.

**v1.5 (second major release)**:
- `49_PRACTICE_TIER.md` — entirely separate web dashboard, distinct sales motion, conservative HIPAA posture for v1.5; HIPAA compliance at v2. Treat as a parallel product launch with its own playbook. Shipping at v1.5 lets the consumer side stabilize first and gives the sales team a track record of consumer-side outcomes data to lead with.

---

## Key Files for Specific Tasks

**"How do I add a new screen?"**
- 20 (IA) — document it first
- 15 (design system) — use themed components
- 23 (interactions) — gesture patterns
- 28 (a11y) — accessibility from start
- 25 (analytics) — track key events

**"How do I write user-facing copy?"**
- 21 (brand) — voice rules + forbidden words
- 18 (personas) — who am I writing for?
- 22 (feedback) — error/success patterns

**"How do I add a feature?"**
- 18 (personas) — does this serve someone?
- 19 (journeys) — where does it fit?
- 20 (IA) — what's the placement?
- 25 (analytics) — what events to track?
- 26 (testing) — what's testable?

**"How do I make this faster?"**
- 29 (performance) — bundle, memory, fps
- 26 (testing) — measure first

**"How do I make this accessible?"**
- 28 (accessibility) — full guide
- 23 (interactions) — every gesture has alternative
