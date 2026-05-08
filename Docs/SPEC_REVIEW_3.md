# Vela Spec Review 3 — UX Coherence Audit

A whole-app UX review across all 51 spec files. Where `SPEC_REVIEW.md` was about engineering hygiene and `SPEC_REVIEW_2.md` was about implementation-readiness, this pass asks a different question: **as the spec stands now, does it actually compose into a coherent product a user can navigate, trust, and enjoy?**

The audit ran four parallel reviewers across the spec's natural seams (foundation, daily-use, differentiation, retention) plus a thematic angle for each. The findings here are consolidated and de-duplicated from those four batches. Two intermediate working files (`SPEC_REVIEW_UX_COHERENCE.md`, `SPEC_REVIEW_3_UX_COHERENCE.md`) were superseded by this consolidated review and can be deleted.

Conventions:
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW (used strictly)
- **Tag:** CONN (cross-feature connection), USE (ease of use), FRIEND (user-friendliness), SEC (privacy/security), A11Y (accessibility)

The previous reviews fixed most of the foundational issues. This pass is the next layer: how the app *feels* when 51 files compose into one product.

---

## Executive Summary — fix these first

1. **Dashboard card-stack sequencing isn't defined.** A user in week 6 could see a score card, an aging-band callout, a 3D sub-score row, a "Patterns we noticed" card (file 33), a Wrapped-ready card (file 38), a streak chip, a feature-reveal card (file 43), AND a quiet-nudge banner — all stacked. File 10 needs an explicit progressive-disclosure spec listing which cards are eligible to render at which week and an explicit "max 2 above-fold" rule.

2. **Notification budget is uncapped across files 12, 33, 37, 38, 39, 41, 46.** No file owns the global rule of "one push per user per day max." A user could receive a daily routine reminder, a diary nudge, a milestone moment, a Wrapped notification, AND a streak quiet-nudge in 24 hours — exactly the loop that kills retention by month 3. File 12 must own a budget table + dedup rule; every feature file's notification spec must reference it.

3. **Settings is the central nervous system but has no manifest.** File 14 sketches a 30-row tree assembled from 15 files; no file maintains the canonical Settings inventory (id, label, section, default, owner-file, analytics event). Implementation will produce duplicates, reorderings, or dropped rows. Add a Settings Manifest table to file 14 that every feature file is required to update.

4. **The onboarding → first-scan → paywall → account-creation flow has unresolved hand-offs.** File 08 says the paywall fires post-reveal; file 05 says routine generation needs `profile.gender` from Supabase; the account doesn't exist until post-paywall. Either: (a) move account creation before first scan, (b) cache profile data in local state and sync post-paywall, or (c) make the routine engine tolerate a missing-profile fallback. As specified, the first scan can race the account.

5. **Brand voice forbidden-words list is fragmented across 8 files.** File 21's list is partial; files 32, 36, 38, 39, 41, 44, 46, 50 each add their own subtly different rules. CI lint can only enforce one canonical list. Consolidate to a single `FORBIDDEN_WORDS_CONSOLIDATED` table in file 21 (already partially done in the recent update) and reference from every prompt and copy file.

6. **Persona alignment is documented in file 18 but not enforced anywhere.** File 09's routine task library doesn't tag tasks by `scoringFrameworkBias`. File 06's AI prompts don't carry a persona-aware context. Marcus will see feminine-coded tasks; Jordan will see "should have started earlier" framing. The personas exist as a design principle, not as an implementation rule.

7. **Life-stage modes (file 48) ripple through 9 other files without centralized gating.** Practice tier (49), reactivation emails (46), Wrapped (38), evidence sheets (50), year-over-year (45), trial forecast (41), feature reveals (43), aging band (36), and treatment library (34) all need to *check* mode state. Today they each name the dependency in prose without a runtime contract. File 48 needs a "Mode-aware surfaces" registry listing every surface that must check mode state, plus a precedence rule for overlapping modes.

8. **Privacy narrative fragments across 32, 33, 37, 49.** File 32 says "stays in the app sandbox," 33 says "stays on your phone," 37 says "encrypted with a key only you have," 49 says "informed-consent outcome tracking." Each is technically accurate; a reading user comes away unsure whether these are different protection levels or the same commitment in different words. File 07's onboarding privacy primer must unify the language and explicitly map each feature to its protection model.

---

## Per-file findings

### Foundation (00–04)

#### 01_PROJECT_SETUP.md
_No new findings._ The fixes from `SPEC_REVIEW_FIXES.md` are sufficient.

#### 02_TYPES_AND_MODELS.md
- [MEDIUM] **`ScanScores` delta fields lack first-scan handling.** `previousOverall?` etc. are optional, but `getScoreDelta()` returns `undefined` when prev is missing — fine, but the dashboard must render an explicit "First scan" state rather than empty spacers. Add a UI rule, not just a type comment. Tag CONN.

#### 03_BACKEND_SUPABASE.md
- [HIGH] **`saveScanResult` profile preflight throws hard on missing profile.** Lines 465–478. During trial-surge concurrency, baseline scans can fail silently because the auth user → profile insert hasn't replicated yet. Add a 3-attempt exponential backoff before throwing, OR ensure profile insert is awaited synchronously before the paywall. Tag CONN.

#### 04_NATIVE_ARKIT_MODULE.md
- [MEDIUM] **Distance failure has no human hint.** `DEFAULT_MIN_DISTANCE` / `DEFAULT_MAX_DISTANCE` thresholds (file 04) drive a `distanceCheck` boolean that file 05's `CheckIndicators` renders as ✓/✗. A user with short arms or mobility limits sees red without knowing whether to move closer or further. Surface a derived hint: *"Move closer"* / *"Move further away"* based on `latestFaceAnchor.distance`. Tag USE / FRIEND.

### Capture & onboarding (05–08)

#### 05_CAPTURE_FLOW.md
- [HIGH] **No recovery for AI-rejected captures.** `processAllCaptures()` runs all three angles through scoring; if AI rejects one for low quality (heavy glare, motion blur, occluded forehead), the user has no path to redo just that angle. Add a per-angle "Redo this one?" prompt when an angle scores below a quality threshold. Tag USE.
- [MEDIUM] **Alignment ghost overlay has no purpose label.** Lines 283–287 dim the previous capture as a 25% ghost without explaining why. Users can read it as a rendering bug. Add a tiny "Last scan, for alignment" caption. Tag FRIEND.

#### 06_AI_PROMPTS.md
- [MEDIUM] **Score-explanation prompt forbids "worse" with no positive framing for actual declines.** A score that drops 12 points must be acknowledged honestly. Today the prompt drifts to neutral ("stable", "unchanged") which feels like dishonesty. Add: *"If a score declines, acknowledge it neutrally and constructively. Never blame the user."* Tag FRIEND.

#### 07_ONBOARDING.md
- [HIGH] **Unified privacy primer absent.** Files 32, 33, 37 each explain on-device privacy in different words. Onboarding's privacy moment is the user's only chance to learn this once. Add a single primer that covers face data, health data, and diary data with consistent language and links to each feature's specific guarantees. Tag CONN / FRIEND.
- [MEDIUM] **Q1b non-binary path can advance without framework selected.** When the user picks `non_binary`, Q1b reveals to capture `scoringFramework`. The `canContinue` state checks both, but the section's `advance()` doesn't distinguish between Q1-answered and Q1+Q1b-answered. A non-binary user can skip past Q1b into Q2 with framework still null. Block continue until Q1b answered for non-binary users. Tag USE.
- [MEDIUM] **Cycle-tracking ask isn't foreshadowed.** File 33 asks lazily after week 3; if the user picks `woman` or `non_binary` at Q1, foreshadow that cycle tracking is a future opt-in. Reduces ambush feel later. Tag USE.

#### 08_PAYWALL.md
- [HIGH] **Onboarding → paywall → account-creation race.** Routine generation (file 09) needs profile data; profile lives in Supabase; account isn't created until post-paywall. Pick one: account-first, or a local-only profile that syncs after subscription. As-is the first-scan flow can hit a missing profile under bad timing. Tag CONN.

### Daily-use core (09–14)

#### 09_ROUTINE.md
- [HIGH] **Persona-aware task selection unimplemented.** File 18 says Marcus churns on feminine-coded tasks; the routine library doesn't tag tasks by `scoringFrameworkBias`. Add the field to every entry; filter in the engine. Tag CONN / FRIEND.
- [HIGH] **No `helpTopicId` on tasks.** File 36's "What helps?" link from below-band callouts is supposed to filter to the relevant tasks; today it would open all tasks. Add `helpTopicId` per task (e.g., `'eye-area'`, `'cheek-volume'`) so the link can filter. Tag CONN.
- [MEDIUM] **Cadence claim has no UI affordance.** "Daily check-offs, weekly adaptation" is a critical model the spec mentions in prose. The dashboard / routine card must surface it: a tiny "This week's routine, generated Monday" date stamp. Tag USE.

#### 10_DASHBOARD.md
- [CRITICAL] **No card-stack sequencing.** Eight card families want above-fold real estate by month 2: score, routine, streak, aging-band callout, 3D sub-score detail, "Patterns we noticed," Wrapped-ready, "On this day," feature reveal. Without sequencing, a returning user is overwhelmed; without an exclusion rule, two callouts can fight. Add an explicit progressive-disclosure spec: which cards eligible at which week, max 2 above-fold, exclusion rules (e.g., aging-band callout suppressed on Wrapped-ready days). Tag CONN / USE.
- [MEDIUM] **`NextCheckInCard` empty-state for users without notification permission.** Component referenced but not specified. If notifications are denied, what does it show? "Set a reminder?" or hide entirely? Spec the no-permission state. Tag USE.
- [MEDIUM] **Sub-score expand collapse-by-different-tap behavior unspecified.** Tapping a different sub-score while one is open closes the old + opens the new in the same render. This works but needs an explicit easing transition; otherwise it reads broken on slow devices. Tag USE.
- [MEDIUM] **First-scan dashboard state lacks orientation.** A baseline user sees scores with no comparison context and no understanding that these will shift. Add a "What are baseline scores?" inline help chip on first view, dismissable forever after. Tag USE.

#### 11_COMPARISON.md
- [MEDIUM] **Session picker selection has no confirmation.** Modal opens, user taps, modal vanishes — on slow devices, no visual feedback that the selection took. Add a brief checkmark + 200ms delay before close. Tag FRIEND.
- [LOW] **Empty-state copy is passive.** *"No comparisons yet. After your second weekly scan, you'll be able to see your actual progress."* Warmer: *"One more scan to compare. Next week, you'll see your actual changes."* Tag FRIEND.

#### 12_NOTIFICATIONS.md
- [CRITICAL] **No global notification budget.** Files 12, 33, 37, 38, 39, 41, 46 each define their own push cadence. There's no central rule preventing 6 notifications from firing in one day. Add a budget table to file 12: max 1 routine reminder + 1 feature/insight notification + 1 milestone per day; dedup logic; bundling (if Wrapped + milestone same morning, Wrapped wins, milestone defers). Tag USE / CONN.
- [HIGH] **Missed check-in nudges don't check lapsed/grace state.** File 12's 2-day, 5-day, 14-day nudges fire blindly. A user in file 46's grace window or look-back mode shouldn't get *"time for your weekly scan"* notifications when they can't scan. Gate every notification on subscription state. Tag CONN / USE.
- [MEDIUM] **Permission prompt timing unspecified.** When does `requestPermission()` fire? Onboarding? Settings? Post-baseline? Pick one — recommendation: post-baseline-reveal alongside "set your check-in day." Tag USE.

#### 13_SHARE_CARDS.md
- [MEDIUM] **Hardcoded `rgba` colors break theme adaptation.** Lines 196–293 use literal colors. If the brand updates the share-card palette, every variant has to be hand-fixed. Move to a `shareCardTheme` token export. Tag CONN.
- [MEDIUM] **Photo library permission lacks context.** First-time tap of "Save to camera roll" triggers the permission ask without explaining why iOS will pop up. Add inline help: *"Saves to your Photos. iOS will ask permission once."* Tag FRIEND.

#### 14_SETTINGS_AND_SUBSCRIPTION.md
- [HIGH] **Settings manifest absent.** The current tree (now 30+ rows from 15 files) has no master inventory. Add a Settings Manifest table: `{id, label, section, default, owner_file, analytics_event}` per row. Every feature file must update the manifest, lint-enforced. Tag CONN / USE.
- [HIGH] **Analytics + Singular opt-out toggles fragmented.** File 25 (PostHog) and file 31 (Singular) both have GDPR consent needs. The Settings Privacy section should expose both as separate, clearly labeled toggles with opposite default states made explicit. Tag USE / FRIEND.
- [MEDIUM] **"Export my data" is misleading.** The label promises completeness; the implementation excludes photos. Either rename to "Export scan data" or bundle photos as a separate ZIP. Tag FRIEND.
- [MEDIUM] **Cancellation save modal not specified inline.** File 14 references `<CancellationSaveModal>` from file 47 but doesn't summarize. Inline a one-paragraph "see file 47" summary so a settings reviewer doesn't have to chase. Tag CONN.
- [MEDIUM] **"Manage Subscription" button intent ambiguous.** Does it open file 47's save flow, the App Store page, or RevenueCat's native modal? Pick one and document. Tag USE.

### Surface-area & cross-cutting (15–22)

#### 15_DESIGN_SYSTEM.md
_No new findings._ The fixes from prior reviews are sufficient; the system is internally coherent.

#### 16_APP_STORE.md
- [MEDIUM] **TrueDepth requirement buried in reviewer notes.** Apple reviewers test on whatever device they grab; if they grab an SE, they hit the no-AR-supported screen. Hoist TrueDepth requirement to the first sentence of reviewer notes. Tag USE.
- [MEDIUM] **Bundle ID hardcoded; conflicts with file 27's per-environment resolution.** Reference file 27 inline rather than restating the value. Tag CONN.
- [LOW] **Medical-disclaimer wording diverges between App Store listing and in-app Settings.** Identical wording or explicit cross-reference. Tag FRIEND.

#### 17_TESTING_AND_LAUNCH.md
- [HIGH] **Settings completeness not in QA checklist.** No test case verifies the entire Settings tree renders without error. A new feature file's row that throws on render won't be caught. Add: *"Open every Settings section; verify no crashes; verify each has a title and ≥1 row."* Tag USE.
- [MEDIUM] **Notification-toggle persistence across restart not tested.** File 12 already flags durability; QA should verify the user-facing toggle reflects truth post-restart. Tag USE.
- [LOW] **Brand-voice consistency check absent from launch checklist.** Add a T-1 day step: grep for forbidden words; spot-check 10 random AI prompts. Tag FRIEND.

#### 18_PERSONAS.md
- [HIGH] **Marcus mitigation absent in implementation files.** Personas live in file 18; nowhere does file 09's routine library tag tasks per persona, file 06's AI prompts include persona-aware context, or file 14's Settings surface persona-relevant preferences. Until these dependencies are wired, the personas are documentation, not enforcement. Tag CONN / USE.
- [MEDIUM] **Priya's treatment-tracker path absent in v1 onboarding.** File 34 (treatment tracking) is v1.5; for v1, surface a lightweight onboarding question: *"Are you on any active treatments?"* Even just storing the strings primes future routine bias. Tag CONN / FRIEND.
- [MEDIUM] **Jordan's no-judgment voice rule isn't lint-enforced.** File 18 names it; file 06's AI prompts don't carry a `PERSONA_HINT` context. Add: *"For long-lapse / older / 'comeback' profiles, prefer 'actionable baseline' framing over 'starting behind.'"* Tag FRIEND.

#### 19_USER_JOURNEYS.md
- [HIGH] **Trial-expiration paywall variant unspecified.** File 19 says "30-40% convert," but where does the conversion *moment* live? Day 7 midnight, the paywall must re-appear with a "trial expired" variant; file 08's paywall doesn't enumerate that variant. Tag USE / CONN.
- [MEDIUM] **No "returning after lapse" journey for month 4+.** File 46 covers 30-day grace + look-back; the spec is silent on a user returning at month 8 from full lapse. Add Journey 5: *"Returning after long lapse."* Tag CONN / USE.
- [MEDIUM] **Notification copy not enumerated per journey stage.** File 19 names triggers, doesn't quote text. Cross-reference file 12 + file 21 in each journey section, or inline the exact strings. Tag FRIEND / CONN.

#### 20_INFORMATION_ARCHITECTURE.md
- [HIGH] **Tab-badging rules undefined.** Routine tab — does it badge incomplete tasks? Settings — does it badge subscription expiry? Add a Tab Badging Rules subsection. Tag USE / CONN.
- [HIGH] **Empty-state philosophy inconsistent across screens.** Dashboard hard-redirects to capture; Compare shows encouraging copy; Routine shows generated-after-first-scan. New screens will guess. Add a "Empty State Philosophy" subsection: dashboard redirects to action; everything else shows encouraging copy + CTA. Tag USE.
- [MEDIUM] **Modal vs push-stack semantics undefined.** Capture is full-screen modal; routine-detail / share-comparison aren't annotated. Add a Presentation Style column to the Screen Inventory. Tag USE / CONN.
- [MEDIUM] **Deep-link error fallback unspecified.** Invalid `vela://compare/<bad-uuid>` — what happens? Add explicit fallback: invalid → home tab + error toast. Tag USE / FRIEND.
- [LOW] **Cross-references to file 14 lack line specificity.** Tag CONN.

#### 21_BRAND_SYSTEM.md
- [MEDIUM] **Error-message voice rules underspecified.** File 21 shows examples but doesn't generalize. Add a subsection with rules: *"Calm; never blames the user; always includes a recovery path; no 'Oops!'; no emoji."* Tag FRIEND.
- [LOW] **Wordmark gradient on share cards — light or dark?** A user in dark mode sharing a card — which gradient? Add: *"Uses the user's current theme at share time."* Tag CONN.

#### 22_FEEDBACK_SYSTEM.md
- [HIGH] **Toast queueing behavior implementation-undefined.** Spec promises "max 1; new replaces existing" but never specifies the replacement transition (fade-out 150ms, fade-in 150ms). Without this, behavior on rapid back-to-back toasts is unspecified. Tag USE.
- [HIGH] **AI-failure feedback pattern missing.** File 06 says "no defensive parser"; file 22 needs a canonical pattern: *"AI failure → show toast 'Analyzing your face — this is taking longer than usual.' On-device geometric score persists immediately. Auto-retry up to 3x."* Without this the app crashes on bad JSON. Tag FRIEND / USE.
- [MEDIUM] **Loading-copy register loose.** Various loading strings exist across files; the rule isn't centralized. Add: *"Use gerund + object: Calibrating, Drafting, Generating. Never 'Please wait,' never 'Processing.'"* Tag FRIEND.
- [MEDIUM] **Permission-recovery banner pattern undefined.** Camera, notifications, photos, HealthKit all need the same pattern (denied → banner with `Linking.openSettings()`). Spec it once here; reference everywhere. Tag USE.

#### 23_INTERACTIONS.md
- [MEDIUM] **Auto-shutter has no progress feedback.** 0.5s alignment-window auto-fire; the user gets no countdown or progress ring. On near-misses they don't know how close they were. Add a small progress ring during the alignment window. Tag USE.
- [MEDIUM] **Volume-button capture as v2 not flagged in file 05.** Tag CONN.
- [LOW] **Onboarding keyboard handling vague.** Single-field onboarding screens don't specify Return-key behavior — does it advance, or is the button the only affordance? Pick one. Tag USE.

#### 24_ILLUSTRATIONS.md
- [MEDIUM] **Inventory missing items referenced elsewhere.** `error-during-capture.svg`, `settings-required.svg`, `success-checkmark.lottie` all referenced in 14 / 22 but not in 24's barrel. Audit imports + add. Tag CONN.
- [MEDIUM] **Lottie file budget unenforced.** Each Lottie should be ≤10KB compressed; otherwise bundle balloons. Add to file 24 + lint in file 29. Tag USE.
- [LOW] **SVG color fallback for missing theme context absent.** Tag FRIEND.

#### 25_ANALYTICS.md
- [HIGH] **Event property schemas incomplete.** ~31 of 46 events have no `EventProperties` schema. Either populate all or split the enum. Tag CONN / USE.
- [HIGH] **Persona-inferred property unimplemented.** File 25 promises persona-sliced funnels; no file implements the inference. Add a *"Persona Inference"* section: post-onboarding, profile fields → `persona_inferred: 'Maya' | 'Marcus' | 'Priya' | 'Jordan' | 'other'`, set on the user, used to slice funnels. Tag CONN / USE.
- [MEDIUM] **Analytics + Singular toggles fragmented in Settings.** Tag USE / FRIEND. (Echoes file 14 finding.)
- [MEDIUM] **Event-name casing inconsistency.** Enum keys are `UPPER_SNAKE_CASE`; PostHog dashboards expect `snake_case`. Document the mapping. Tag CONN.

#### 26_AUTOMATED_TESTING.md
- [HIGH] **Native module integration tested only mocked.** ARKit distance gates / alignment / lighting are validated by manual QA only. A monthly real-device E2E pass on iPhone 15 Pro is needed across lighting + distance variants. Tag USE.
- [MEDIUM] **Edge Function mocking strategy absent.** Tests stub `generateRoutine` / `generateMicroPayoff` returning hardcoded JSON; no contract validation. Add MSW or Nock-based contract tests. Tag CONN.
- [MEDIUM] **Test-build mocks miss network/time/theme.** `useMockNetwork`, `useMockNotifications`, time-mocking — needed for backgrounded-24h scenarios. Tag USE.
- [MEDIUM] **No Settings tree component test.** A new feature file's Settings row that crashes on render won't be caught by unit tests. Add SettingsScreen.test.tsx. Tag USE.
- [LOW] **Coverage targets unenforced per PR.** Tag CONN.

### Infrastructure & differentiation (27–39)

#### 27_CICD.md / 29_PERFORMANCE.md / 31_SINGULAR_MMP.md
_No new UX findings._ Internal coherence is sound.

#### 28_ACCESSIBILITY.md
- [MEDIUM] **Capture audio-guidance copy not canonical.** Spec describes audio guidance but doesn't define the vocabulary (move-closer, turn-left, tilt-up, etc.). Add a `CAPTURE_AUDIO_GUIDANCE` constant in file 06 or inline here, cross-referenced from file 05. Tag USE.

#### 30_DEEP_LINKING.md
- [LOW] **Treatment deep link missing from route map.** File 34 mentions `vela://treatment/start?id=` as a partner-link entry point; file 30 doesn't list it. Tag CONN.

#### 32_3D_CAPTURE.md
- [MEDIUM] **3D sub-scores arrive on dashboard without orientation.** Three new sparklines appear on a user's dashboard at week 4–6 with no introduction. Tie to file 43's reveal calendar: Week 4–5 *"Meet your three new metrics"* card explaining what each measures. Tag USE / CONN.
- [MEDIUM] **Lighting badge copy off-tone.** *"We'll wait until next week"* reads slightly passive-aggressive. Rephrase to mirror aging-band's neutral observational voice: *"Different lighting today — we'll see how next week compares."* Tag FRIEND.

#### 33_HEALTHKIT.md
- [MEDIUM] **"Patterns we noticed" card competes with Wrapped-ready card.** Both want the dashboard's slot 2. Add to file 10's card-stack rules: only one of {aging-band callout, pattern-noticed, wrapped-ready} above the fold; ordered by recency + importance. Tag USE.
- [MEDIUM] **Cycle-permission ambush risk.** Tag USE. (Echoes file 07 finding.)

#### 34_TREATMENT_TRACKING.md
- [HIGH] **Routine biasing for treatments uncapped.** Tretinoin adds 3 complementary tasks; if baseline routine was 3, the user now has 6 — a 90-second routine where it was 30. Risk: streak breakage. Cap at +3 tasks total or present a swap choice. Tag USE.
- [MEDIUM] **Doctor-friendly PDF export ungated.** Rich, sophisticated output exposed at v1 launch with no introduction. Gate behind file 43's reveal calendar (week 8–10 or second-treatment milestone) and add an in-context primer card. Tag USE.
- [MEDIUM] **Contraindication enforcement inconsistent across modes.** Pregnancy hard-blocks; cancer recovery shows soft warnings; menopause is silent. Unify in file 48: hard-blocks for pregnancy/postpartum (highest liability); soft warnings for the rest. Tag FRIEND.

#### 35_HAIR_TRACKING.md
- [MEDIUM] **Hair-tracking onboarding tone diverges from face.** *"Vela does the same thing for hair that we do for your face"* doesn't echo file 07's *"clinically comparable"* phrasing. Align. Tag FRIEND.
- [LOW] **Settings placement of hair-tracking toggle unclear.** File 35 says *"Settings → Hair tracking → Turn on"*; file 20's IA doesn't show this section. Pick a parent (probably "Capture & tracking" or under "Health & lifestyle"). Tag USE.

#### 36_AGING_ACCEPTANCE.md
- [MEDIUM] **Aging-band opt-out can be silently undone by accessibility setting changes.** A user who toggled the band off, then later enables Increase Contrast (file 28), gets a more-visible band. The user-preference must override accessibility-driven re-rendering. Tag USE.
- [MEDIUM] **"What helps?" link from below-band callout doesn't have a filter.** Tag CONN. (Resolved by adding `helpTopicId` per file 09 finding above.)

#### 37_DIARY.md
- [MEDIUM] **Diary AI inference can pre-empt life-stage mode consent.** The inference prompt can return a `pregnant` tag from text alone; file 48 expects the user to explicitly enable pregnancy mode. Tighten the prompt: *"Do not infer 'pregnant' / 'postpartum' from context — only when the user explicitly types those words."* Tag FRIEND.
- [LOW] **Speech-recognition unavailability case unspecified.** Mic button hides; no error sheet. Make this explicit in 37's edge cases. Tag USE.

#### 38_MONTHLY_WRAPPED.md
- [MEDIUM] **AI-card streaming UX unspecified.** Wrapped opens at 8:01 AM on the 1st; AI cards are still generating server-side. Either show "generating…" placeholders that resolve, OR delay the Wrapped open until ready. Pick one. Tag USE.
- [MEDIUM] **Color algorithm not explained.** *"Hue is deterministic per user × month"* — what's the seed? Add: *"hash(userId, month) so identical across devices, varies between months."* Tag CONN.
- [MEDIUM] **Treatment context absent from default share set.** A user mid-tretinoin has a treatment-progress card; the share defaults exclude it. Add a "include treatment progress" toggle that prompts users with active treatments. Tag CONN.

#### 39_DAILY_STREAKS.md
- [MEDIUM] **Streak count vs Wrapped freeze handling silent.** When 3 of 14 days were frozen, what does Wrapped show? Pick one: actual consistent days only, with a footnote about freezes; OR the "21 days" count from the dashboard. Document. Tag CONN.
- [MEDIUM] **Milestone notification can collide with Wrapped notification.** A 7-day milestone hit on the 1st of the month: both fire same morning. Add to file 12's dedup: Wrapped wins; milestone defers. Tag USE.
- [MEDIUM] **Hidden-streak escape hatch undiscovered until later.** A user feeling pressured by streaks doesn't know about the Subtle/Hidden toggle until they search Settings. Add a 7-day reveal: *"You've made this a habit. (And if streaks feel like pressure, you can hide them in Settings.)"* Tag USE / FRIEND.

### Retention layer (40–47)

#### 40_PREPAYWALL_VALUE.md
- [MEDIUM] **Routine preview can desync with day-7 forecast.** The preview shows "what we'll start you on" with 3–5 task names; if the engine re-generates between preview-time and forecast-time, the forecast shows different tasks. Lock the preview output and use it as canonical until the user confirms post-paywall. Tag CONN.
- [MEDIUM] **Micro-payoff cards risk collision with file 43 reveals.** Both can fire on day 1; the "one new thing per session" rule from file 43 should explicitly suppress reveals during onboarding's first session. Tag CONN / USE.
- [MEDIUM] **Paywall-arriving-from-preview line confuses lapsed-user paywall.** *"You've seen what we noticed and what we'll start you on"* makes no sense for a returning lapsed user. Gate the line on `fromNewSignup`. Tag CONN.

#### 41_TRIAL_CONVERSION.md
- [HIGH] **Day-7 forecast doesn't check life-stage modes.** A pregnant user shouldn't see a forecast projecting tretinoin-driven improvement. Forecast engine must read `activeLifeStageMode` and either suppress or adjust. Tag CONN.
- [HIGH] **System-iOS cancel + save-flow timing race.** A user who already cancelled in iOS Settings sees the save flow on next app open — but the cancellation already happened. Document: at this state, the flow is *informational* (acknowledging the cancel) and routes to file 47, not a save attempt. Tag CONN / USE.
- [MEDIUM] **"No thanks" on day-7 forecast → trial extension is ambiguous.** If preview cards already offered something, a second "No thanks" reads as nag. Clarify: file 41's flow only fires once; preview-card decline doesn't pre-empty the forecast. Tag USE.

#### 42_IOS_SURFACES.md
- [HIGH] **Lock-screen complication during grace/lapsed unspecified.** Streak count on the lock screen during look-back mode — does it show the frozen number, "Paused," or hide? Pick one. Tag CONN.
- [MEDIUM] **Widget data freshness on entitlement change.** Trial extension grants entitlement; widgets refresh every 30 minutes. Stale "trial ends tomorrow" can show for hours. Force a widget timeline reload on entitlement change. Tag USE.
- [MEDIUM] **Apple Health Vital write must respect life-stage mode.** A user in pregnancy mode writing a face score to Apple Health — does the score get a context flag, or just look like a metric drop to anyone reviewing the user's Health record? Mode status never written to Apple Health (the score remains, but mode stays app-private). Document explicitly. Tag CONN / FRIEND.

#### 43_FEATURE_REVEALS.md
- [MEDIUM] **Reveal calendar doesn't account for life-stage modes.** A pregnancy-mode user shouldn't see the treatment-tracking reveal during pregnancy. Reveal engine must check active modes. Tag CONN.
- [MEDIUM] **"What's new in Vela" recovery surface shows mode-suppressed features.** Either hide them or label *"Available after [mode ends]."* Tag CONN.

#### 44_EXPERIMENT_MODE.md
_No new findings._ Self-contained and well-bounded.

#### 45_LONG_TERM_RETENTION.md
- [MEDIUM] **"On this day" cards in lapsed look-back mode.** Can a lapsed user see them? They were generated when paid; do they persist read-only? Spec it. Tag CONN.
- [MEDIUM] **Year-over-year overlay through life-stage windows.** A user pregnant a year ago, not now — YoY comparison risks misleading framing. Either suppress YoY through mode windows OR annotate them. Tag CONN / FRIEND.
- [MEDIUM] **Anniversary cards through grace/lapsed.** A user who churns at month 11 returns at month 14 — do they get the 12-month anniversary retroactively? Pick one. Tag CONN.

#### 46_REACTIVATION.md
- [MEDIUM] **Email digest doesn't reflect life-stage mode context.** *"Your face from last month"* during the months a user was in cancer-recovery mode lands wrong. Template must check mode-state for the shown period and add context. Tag FRIEND.
- [MEDIUM] **Look-back mode life-stage state.** Does mode persist into look-back? Today the spec is silent. Modes should persist (so charts render consistently with the user's last live state); document. Tag CONN.
- [MEDIUM] **Win-back free scan inheritance.** Does the free scan use the user's last active mode's framework, aging band, and routine bias? Yes (continuity); document. Tag CONN.

#### 47_CANCEL_SAVE.md
- [MEDIUM] **Save engine doesn't consider life-stage mode as engagement signal.** A user actively tracking through pregnancy is high-engagement; the engine doesn't see that. Add `hasActiveLifeStageMode: boolean` to `CancelSaveContext`; mode-aware copy in offer text. Tag CONN / FRIEND.
- [MEDIUM] **Save offer copy generic across modes.** A user cancelling mid-cancer-recovery shouldn't get the same template as a frustrated trial user. Mode-aware offer copy is a small lift, big payoff. Tag FRIEND.

### Audience expansion (48–50)

#### 48_LIFE_STAGE_MODES.md
- [HIGH] **Mode-aware surfaces registry absent.** File 48 says modes adjust 6 surfaces; in practice, 9+ files need to *check* mode state. Add a registry table: *"Surfaces that read mode state, what they do, precedence on overlap."* Tag CONN.
- [HIGH] **Mode enable doesn't trigger immediate routine regeneration.** Spec says routine is biased per mode; doesn't say if the user's *current* routine refreshes on enable, or only the next generation cycle. Pick: immediate regen (better UX, less rotation surprise). Tag CONN / USE.
- [HIGH] **Practice-tier visibility into modes unspecified.** A clinic can't interpret a patient's data without knowing they're in pregnancy mode; but mode state is a privacy floor in file 49. Resolution: clinics see *"This patient is in a life-stage mode that may affect the data — patient hasn't shared which one"* as a non-specific flag, OR mode state requires patient opt-in to share with the clinic. Document. Tag CONN / FRIEND.
- [MEDIUM] **Mode switch atomic timing during overlap.** Pregnancy → postpartum: instant atomic, or 24h dual-mode? Pick atomic. Tag CONN.
- [MEDIUM] **Settings overlap precedence not user-explained.** *"Cancer recovery's gentler bias wins"* should be a single-line explainer in the modes screen so users know what to expect. Tag USE.

#### 49_PRACTICE_TIER.md
- [HIGH] **Treatment data through life-stage mode windows opaque to clinic.** A patient on tretinoin during pregnancy — does the clinic see it as "active" or "paused"? For medical safety, they need to see the pause and the reason. Add a non-specific *"paused due to user setting"* annotation on the clinic dashboard for treatments paused during a mode. Tag CONN / FRIEND.
- [MEDIUM] **Patient consent doesn't address mode-driven retroactive scope changes.** When a patient enables a life-stage mode after enrolling, does the clinic's existing visibility narrow automatically? Document: existing consent stands, mode-driven privacy is layered on top. Tag CONN.
- [MEDIUM] **Doctor-friendly PDF (file 34) needs mode context.** A 6-month tretinoin timeline that includes a 3-month pregnancy gap should annotate the gap. Tag CONN / FRIEND.

#### 50_EVIDENCE_VOICE.md
- [MEDIUM] **Evidence sheet for contraindicated tasks during a mode.** Tap (ⓘ) for tretinoin in pregnancy mode — sheet still shows tretinoin's evidence. Add a mode-aware top banner: *"This task is paused during pregnancy mode."* Evidence still visible (transparency) but contextualized. Tag CONN / USE.
- [MEDIUM] **Vela Journal editorial calendar misses life-stage topics.** Pregnancy, menopause, HRT, cancer recovery are exactly the topics that earn the journal's audience. Reserve 2–3 essay slots per year for mode-relevant deep dives. Tag FRIEND.

---

## New cross-cutting themes

### A. The dashboard is becoming the chokepoint of the entire product

Eight cards want above-fold real estate by month 2. Without progressive-disclosure logic, the dashboard becomes a cluttered scroll. The fix is structural: file 10 owns a `DashboardCardSlot` system with priority + eligibility + exclusion rules, and every feature file declares its slot eligibility there.

### B. Settings is the second chokepoint, and worse-organized

The Settings tree now spans 15 source files. Without a Settings Manifest, implementation will diverge: rows reorder, duplicates appear, defaults drift. Treat Settings as a first-class data structure, not a UI tree assembled ad-hoc by feature file.

### C. The brand voice rules are spread across 10 files

File 21 owns the canonical voice. In practice, each feature file (32, 36, 38, 39, 41, 44, 46, 50) has its own slightly different forbidden-words list. CI lint can only enforce one; the consolidation in file 21's recent update is the right move but every feature file's voice section should reference file 21 verbatim, not duplicate it.

### D. Life-stage modes need a runtime contract, not just prose dependencies

File 48 names 9 files that must check mode state. The spec describes the dependency in prose. At implementation time, this becomes 9 places where someone might forget the check. Add a `useLifeStageMode()` hook with a registry of modes-affected-surfaces, lint-enforced, so adding a new mode-aware surface fails CI if it doesn't register.

### E. Notification fatigue is the under-budgeted retention killer

Each feature file specs notifications independently. By month 2, a user could receive: daily routine reminder, weekly scan reminder, diary nudge, streak quiet-nudge, milestone notification, Wrapped notification, correlation insight notification, feature-reveal notification. Without a global cap, retention silently bleeds. File 12 must own a budget table — max 1/day + dedup rules — that every notification source respects.

### F. Persona alignment is documentation, not implementation

File 18 promises persona-aware behavior. Six files away (06, 09, 14, 19, 22, 25) the implementation hooks are missing. Either remove the persona promise, or wire it through: routine task biases, AI prompt context, analytics inference, Settings personalization. Half-implemented personas are worse than none.

### G. The privacy story is true but reads inconsistent

Every privacy claim in the spec is accurate. The language varies between files in ways that make the user wonder whether they're reading about different protection levels. One unified primer in file 07 mapping each feature to its protection model resolves this with negative implementation cost.

### H. Empty / error / offline state philosophy is a missing utility

Each screen handles its empty state differently. New features will guess. A 1-page "Edge State Patterns" doc in file 22 (empty = encouraging copy + CTA; error = calm, recoverable, never blaming; offline = banner + auto-retry) saves dozens of micro-decisions during implementation.

---

## Severity tally

| Severity | Count |
|---|---:|
| CRITICAL | 2 |
| HIGH | 19 |
| MEDIUM | 60 |
| LOW | 7 |
| **Total** | **88** |

For comparison: the first review tallied 47 findings; the second, 107. This pass is in between because it's narrower in scope (UX coherence, not engineering hygiene) but wider in surface (51 files, not 32).

---

## Recommended order of operations

The two CRITICAL items and most HIGH items resolve to a small number of structural fixes:

### Phase 1 — Architectural decisions (1 working week)

These are decisions, not implementations, and they unblock everything else:

1. **Define the dashboard card-stack system in file 10.** Slot-based, priority-driven, lifecycle-aware. Every card-emitting feature file declares its eligibility here. Resolves the dashboard CRITICAL and ~12 dependent MEDIUMs.
2. **Define the global notification budget in file 12.** Max 1/day per category, dedup rules, bundling logic. Every notification-emitting feature file references this. Resolves the notifications CRITICAL and ~6 dependent MEDIUMs.
3. **Define the Settings Manifest in file 14.** Single canonical inventory, owner-tagged per row, lint-enforced. Resolves ~8 cross-file findings.
4. **Lock the unified privacy primer in file 07.** Single page mapping every feature's protection model. Resolves the privacy fragmentation theme.
5. **Define the life-stage mode runtime contract.** A `useLifeStageMode()` hook + a "mode-aware surfaces" registry in file 48. Resolves the mode rippling theme and ~10 dependent findings.

### Phase 2 — Implementation cleanup (1–2 working weeks)

6. **Wire personas into implementation.** Add `scoringFrameworkBias` to file 09's task library; add `PERSONA_HINT` context to file 06's prompts; add `persona_inferred` to file 25's analytics. ~5 findings.
7. **Consolidate forbidden words in file 21 + lint everything.** ~6 findings.
8. **Resolve the onboarding → paywall → account race.** Pick one of the three options listed in file 08's HIGH finding.
9. **Add the Edge State Patterns doc to file 22.** Empty / error / offline / loading patterns canonical. ~4 findings.

### Phase 3 — Polish (ongoing)

The remaining MEDIUM + LOW findings are individual-file refinements that can be picked up as part of normal feature work. None are blocking.

---

## What the spec gets right

For balance: the depth and consistency of this spec across 51 files is unusual. A few patterns that work well and should not be changed:

- **The canonical-source matrix in file 00 is the single most leveraged decision.** Without it, the spec would be unreadable. With it, the gaps this review surfaces are diagnosable.
- **The brand voice as a first-class concept, with forbidden-words enforcement.** Other apps in this category have nothing like it.
- **The privacy posture in 32, 33, 37, 49.** Even where the *language* is fragmented (theme G above), the underlying decisions are consistently strong.
- **The retention layer (40–47).** Most apps treat retention as anti-pattern dark UX; Vela's retention layer is a structural alternative that's coherent with the rest of the brand.
- **Life-stage modes as opt-in, never inferred.** This single decision makes the entire mode system safe. The runtime contract gap (theme D) is solvable; the design intent is right.

The fixes above don't change the product's identity. They harden the connective tissue between features that the previous reviews didn't reach.
