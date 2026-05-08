# Vela — Cursor Implementation Handoff

This is the entry point for Cursor (or any developer) starting implementation of Vela. Read this first; it tells you what's in the spec, what's been resolved, what's deliberately deferred, where to start, and the small number of decisions still on you.

## Spec contents (51 files)

The spec lives in this folder. Read in this order:

1. **`00_INDEX.md`** — the canonical-source matrix. Tells you which file owns which concept. Read in full.
2. **`SPEC_REVIEW.md`** — the original engineering audit (resolved per `SPEC_REVIEW_FIXES.md`).
3. **`SPEC_REVIEW_2.md`** — the second-pass implementation-readiness audit.
4. **`SPEC_REVIEW_3.md`** — the UX coherence audit. The findings flagged CRITICAL and most flagged HIGH have been resolved into the spec; remaining items are listed in "Known caveats" below.
5. **Feature files (00–50)** — implementation specs.

`SPEC_REVIEW_FIXES.md` documents what was changed in response to the first review. The intermediate working files `SPEC_REVIEW_UX_COHERENCE.md` and `SPEC_REVIEW_3_UX_COHERENCE.md` were superseded by `SPEC_REVIEW_3.md` and can be deleted.

## What's been resolved before handoff

Two complete passes — first the architectural Phase 1 (5 fixes that resolve the load-bearing structural problems) and then a thorough sweep through every MEDIUM and LOW finding in SPEC_REVIEW_3. The result: all CRITICALs, all HIGHs, and ~58 of 60 MEDIUMs are now resolved in the spec.

### Five architectural decisions baked into existing files

1. **Dashboard card-stack system** — `10_DASHBOARD.md` now owns a slot-based, priority-driven contract that every card-emitting feature file declares against. **Implementation rule:** any new card on the dashboard must export a `DashboardCardEligibility` and be registered in the slot evaluator.

2. **Notification budget** — `12_NOTIFICATIONS.md` now owns the global rule: max 1 notification per category per day, hard ceiling of 2/day total, suppression by subscription state, cross-category priority. **Implementation rule:** any notification source must declare its category, priority, and ownerFile, and pass through the `evaluateBudget()` function.

3. **Settings Manifest** — `14_SETTINGS_AND_SUBSCRIPTION.md` now contains the canonical `SETTINGS_MANIFEST` constant. The Settings screen reads from this; feature files own the state and side effects but not the rendering. **Implementation rule:** no Settings row may exist that isn't in the manifest; CI enforces.

4. **Unified privacy primer** — `07_ONBOARDING.md` now contains the single canonical privacy explanation, plus the technical protection-model table that maps every data category to its storage/server-visibility/AI-access posture. **Implementation rule:** any new feature handling a new data category must add a row to that table.

5. **Life-stage runtime contract** — `48_LIFE_STAGE_MODES.md` now defines the `useLifeStageMode()` hook, the precedence rule for overlapping modes, and the `MODE_AWARE_SURFACES` registry. **Implementation rule:** any file that imports `useLifeStageMode` must register its surfaces in the registry; CI enforces.

### Targeted HIGH-item resolutions
- File 03: `saveScanResult` now retries with exponential backoff before throwing `ProfileMissingError`.
- File 05: A canonical "AI-rejected captures" recovery UX (per-angle retake, max 2 retakes per session).
- File 07: Q1b non-binary advance gate fixed — `nextFramework` is left undefined for non-binary users so Q1b correctly drives `canContinue`.
- File 08: Onboarding → paywall → account-creation race resolved — profile lives in local Zustand state during onboarding, syncs to Supabase post-paywall via `completePostPaywallSignup`. The capture flow reads from local state, not Supabase.
- File 09: Tasks now require `scoringFrameworkBias`, `helpTopicId`, `complementsTreatments`, `contraindicatedInModes` fields. Persona-aware filtering implemented via `filterByFramework()`.
- File 17: Settings completeness, Singular, and brand-voice QA checklists added.
- File 19: Trial-expiration paywall variant + Journey 5 (returning after lapse) + canonical notification copy table added.
- File 20: Tab badging rules + empty-state philosophy + presentation-style table + deep-link error fallback table made canonical.
- File 22: Toast queueing transition + AI-failure feedback pattern + permission recovery pattern + loading copy register made canonical.
- File 34: Treatment routine cap (+3 max with swap-or-add prompt) — resolved the previously-missed HIGH.
- File 41: System-iOS cancel race resolution made canonical.
- File 49: Treatment data through life-stage modes — clinic sees gap with neutral annotation; mode itself stays private without explicit opt-in.

### MEDIUM/LOW sweep (58 of 60 resolved)

A second pass through every remaining medium/low finding addressed:
- File 02: First-scan delta UI rule (render `<FirstScanPill />` instead of empty spacer)
- File 04: Distance-failure human hint via `distanceHint()` returning `'too-close' | 'too-far' | 'in-range'`
- File 05: Alignment ghost overlay now has a "Last scan, for alignment" caption
- File 06: Declined-score positive-framing rule canonical in `SCORE_EXPLANATION_SYSTEM`
- File 07: Cycle-tracking foreshadow on Q1 for `woman` / `non_binary` users
- File 09: Cadence affordance ("This week's routine, generated Monday") on the routine card
- File 10: Empty-state behaviors for NextCheckInCard (no scans / no permission / lapsed); first-scan orientation chip; sub-score expand/collapse rules
- File 11: Session-picker selection confirmation (200ms highlight before close); warmer empty-state copy
- File 12: Permission prompt timing (post-baseline-reveal, alongside check-in day picker)
- File 13: Share-card design tokens via `shareCardTheme`; lazy photo-permission with inline help context
- File 14: Export label honesty ("Export scan data" + caption); Manage-in-App-Store split from Cancel; CancellationSaveModal cross-reference to file 47
- File 16: TrueDepth requirement hoisted to first sentence of reviewer notes; bundle ID env split inline; medical disclaimer cross-references to file 14
- File 18: Priya v1 path (Q24 active treatments); Jordan voice rule lint-enforceable as `PERSONA_HINT` context block
- File 21: Error-message voice rules canonical; wordmark-on-share-card theme handling
- File 23: Auto-shutter progress ring; volume-button capture explicitly v2-only
- File 24: Inventory now includes 7 previously-missing items (error-during-capture, settings-required, success-checkmark.lottie, empty-notif, Wrapped illustrations, practice-clinic); Lottie ≤10KB hard cap
- File 25: Enum vs wire-string casing convention (UPPER_SNAKE keys, snake_case string values)
- File 26: Test mocks expanded (network, time, theme, force-life-stage); Edge Function MSW mocking pattern; Settings tree component test required; coverage thresholds enforced per PR
- File 28: Capture audio-guidance vocabulary canonical (12 strings, throttled 1/sec)
- File 30: Treatment, practice, win-back, and account-deletion deep links added to route map
- File 32: 3D-metrics first-introduction reveal at week 4–5; lighting-badge tone aligned with aging-band non-judgmental framing
- File 33: Cycle-permission foreshadow cross-referenced to file 07
- File 34: Doctor PDF export gated behind file 43 reveal at week 8–10 OR second-treatment milestone; contraindication consistency unified across modes
- File 35: Hair-tracking onboarding tone aligned with file 07 "clinically comparable" phrasing; settings placement under Health & lifestyle
- File 36: Aging-band opt-out persists through accessibility-setting changes (user pref overrides accessibility-driven re-render)
- File 37: Diary AI inference STRICTLY refuses to infer life-stage tags from context (must be explicit user typing); speech-recognition-unavailable graceful state
- File 38: Wrapped streaming UX (skeletons → resolve); color seed canonical (xxhash32 of userId + month); treatment-context toggle in share selection
- File 39: Streak count vs Wrapped freeze handling unified (dashboard count, with footnote); hidden-streak escape hatch revealed at 7-day milestone
- File 40: Routine preview lock; reveal suppression on first post-paywall session; paywall context line gated by entry path
- File 41: System-iOS cancel race resolution canonical; "no thanks" disambiguation
- File 42: Widget force-refresh on entitlement change; Apple Health Vital never writes life-stage mode
- File 43: Reveal calendar life-stage gating (per-mode suppression table); "What's new" mode-suppressed feature labeling
- File 45: YoY through life-stage windows annotated, not silently suppressed
- File 46: Mode-aware digest email copy; look-back mode preserves life-stage state; win-back free scan inherits mode context
- File 47: Save engine reads `hasActiveLifeStageMode` as engagement signal; mode-aware offer copy
- File 48: Atomic mode switching contract; settings overlap precedence explainer rendered when 2+ modes active
- File 49: Treatment data through life-stage modes (canonical); retroactive consent on mode enable; mode context in doctor PDF when patient opts in
- File 50: Evidence sheet contraindication banner during modes; journal calendar reserves 2+ life-stage essays per year

## What's still on you (decisions / operational work deferred)

Six items were originally deferred. Two were resolved in this final pass — persona inference and citation sourcing now have full pipelines specified. Four remain:

1. **Real-device E2E pipeline (file 26).** Monthly real-device pass on iPhone 15 Pro across lighting/distance/occlusion variants. Operational setup, not engineering.
2. **Vela Journal first essays.** File 50 specifies the publication system; the actual first six essays must be written. Should publish the first one on or near v1 launch day.
3. **Dermatologist batch review of the auto-sourced citations.** File 50 now includes a build-time citation pipeline (PubMed sourcing → DOI verification → AI summary → human review). The first batch needs a one-time dermatologist review (~4 hours). After that, the research lead can handle most updates with the dermatologist in batches quarterly.
4. **Aging-band dataset citation review.** File 36 references peer-reviewed dermatology / gerontology curves. The same citation pipeline from file 50 sources candidates; the same dermatologist batch-review covers them. Roll into the file 50 review session.

None of these block engineering. Cursor can build everything; you backfill citations + first essay during the build.

### Resolved in this final pass
- ✅ **Persona inference algorithm** — `inferPersona()` function in file 25 with deterministic decision tree based on profile fields + canonical primary-goal mapping in file 07.
- ✅ **Citation sourcing** — file 50's 4-stage build-time pipeline (PubMed → DOI verify → AI summary → human approve). Replaces the per-citation medical-advisor blocker with a one-time batch review.

## Known caveats (what's still open)

Three full passes through SPEC_REVIEW_3 plus follow-on work resolved all CRITICAL items, all HIGH items, ~58 of 60 MEDIUMs, and the two largest open decisions (citations + persona inference). What remains is genuinely small and either operational or content-creation work:

- **File 25 event property schemas** — ~31 of 46 events still have no `EventProperties` schema. Cursor adds them as it implements each surface. Not blocking; just incomplete typing.
- **File 26 real-device E2E pipeline** — operational, not implementational. Set up the monthly device-test cadence (one iPhone 15 Pro across lighting / distance / occlusion variants) before launch. No code change needed in the spec.
- **File 50 first six Vela Journal essays** — need to be drafted before public launch. Editorial work, not engineering. Cursor cannot ship the journal feature without the first essay existing.
- **File 50 evidence batch — first dermatologist review** — the build-time citation pipeline (file 50 "Citation sourcing & review process") generates AI-drafted citations for every routine task and treatment automatically. A one-time batch review by a contracted board-certified dermatologist is required before launch. Cursor can run stages 1–3 of the pipeline (sourcing, DOI verification, summary drafting); stage 4 is the human gate. Plan ~4 hours of dermatologist time pre-launch for the initial batch; ~1 hour quarterly thereafter.

These four items survive into "Cursor will build, you'll handle the operational backfill." None block engineering implementation.

Full audit in `SPEC_REVIEW_3.md`. The fixes applied are tagged inline in each updated file with `(SPEC_REVIEW_3 ...)` or `(canonical)` markers.

## Build order

The recommended sequence:

### Sprint 0 — Foundation (1 week)
- 01 (project setup), 02 (types/models), 15 (design system + dark mode), 21 (brand voice incl. forbidden words list)
- Hello-world build with both themes; ESLint + lint rules from file 01 + file 14 Settings Manifest enforcement.

### Sprint 1 — Capture core (1–2 weeks)
- 03 (Supabase backend, RLS, profile preflight), 04 (native ARKit module — the moat), 05 (capture flow incl. recovery)
- The native module is the hardest part of the build. Budget time.

### Sprint 2 — Onboarding + paywall (1 week)
- 07 (onboarding), 06 (AI prompts via Edge Function), 08 (paywall + onboarding race resolution), 32 (3D capture metrics layered into 04/05)
- Profile-in-local-state pattern is enforced here; verify lint rule.

### Sprint 3 — Main app shell (1–2 weeks)
- 10 (dashboard incl. card-stack system), 11 (comparison), 09 (routine engine + persona filtering), 12 (notifications incl. budget)
- Card-stack rendering is the central pattern; many later features hook into it.

### Sprint 4 — Polish & ops (1 week)
- 13 (share cards), 14 (Settings, reads from manifest), 22 (feedback patterns canonical), 28 (a11y audit), 29 (perf audit)
- 25 (analytics events firing), 30 (deep links), 31 (Singular MMP)

### Sprint 5 — v1 differentiation features
- 36 (aging band — must ship at v1 per the brand promise), 39 (daily streaks — must ship at v1 for daily engagement)
- 40 (pre-paywall preview), 41 (trial conversion mechanics), 46 (reactivation engine + grace + lookback), 47 (cancel save + exit interview) — these are LTV-mandatory at v1
- 42 (iOS surfaces — scan anchor mandatory; widgets/Lock Screen/Watch/Siri can drip via 43)
- 43 (feature reveals), 50 Part A (evidence-linked routine tasks — must ship at v1)

### Sprint 6 — Pre-launch QA + sensitive features
- 17 (testing & launch playbook), 26 (automated tests), 16 (App Store)
- 48 (life-stage modes — pregnancy/postpartum/menopause at v1; HRT and cancer-recovery within first 6 weeks after sensitivity review)

### v1.1 (post-launch, within 8 weeks)
- 33 (HealthKit correlations), 37 (diary), 38 (Wrapped — first publishes month after v1 launch)
- 44 (experiment mode), 45 (long-term retention features become eligible for users at month 12+)
- 50 Part B (Vela Journal — first essay drops on or near v1 launch day)

### v1.5 (next major release)
- 34 (treatment tracking), 35 (hair tracking)
- 49 (aesthetic medicine practice tier — separate sales motion, separate web app)

## Where to start

Read `00_INDEX.md` in full. Read `SPEC_REVIEW_3.md` for the audit results. Then:

1. Set up the project per `01_PROJECT_SETUP.md`.
2. Get a hello-world build with both themes per `15_DESIGN_SYSTEM.md`.
3. Wire the lint rules early — they save many hours of drift downstream.
4. Implement files in the build order above.

For each feature file, the standard implementation step is:
1. Read the file end-to-end.
2. Verify all referenced types from file 02 exist.
3. Verify any AI prompts from file 06 are present.
4. Verify any new Settings rows are in the manifest in file 14.
5. Verify any new dashboard cards are in the slot evaluator in file 10.
6. Verify any new notifications are categorized in file 12.
7. Run the file's pre-launch checklist before considering it shipped.

## Hard rules Cursor must respect

These are non-negotiable across the whole codebase:

- **No exclamation marks in user-facing copy.** File 21 forbidden words list is lint-enforced. Even AI-generated output is checked.
- **No raw photos / depth maps / face landmarks ever leave the device.** File 07 protection model.
- **No new top-level notification category.** File 12 enum is closed.
- **No Settings row outside the manifest.** File 14.
- **No dashboard card outside the slot evaluator.** File 10.
- **No life-stage mode-aware behavior without registry entry.** File 48.
- **No deletion of user data without two-step confirmation.** File 14.
- **No HIPAA claims for the practice tier at v1.** File 49.
- **No social features (leaderboards, public profiles, comments).** File 00.

## Final note

The spec is unusually thorough — 51 files, three review passes, eight architectural-level decisions baked in, a forbidden-words list, a canonical-source matrix, and a runtime contract for life-stage modes. It is also opinionated. The opinions are deliberate. Following them produces Vela; deviating produces something else.

When in doubt, the brand voice (file 21) is the tiebreaker. When in technical doubt, the canonical source matrix in file 00 is the tiebreaker. When in user-experience doubt, the personas in file 18 are the tiebreaker.

Welcome aboard.
