# Persona & Journey QA (Sprint 6)

Five personas walk Vela end-to-end before any TestFlight build is promoted to App Store review. Each walkthrough is timed, recorded (screen + audio), and stored under `qa/persona-walkthroughs/`. Failure of any pass-criteria blocks the release.

The five personas span the four canonical scoring frameworks (file 02), the three v1 life-stage modes (file 48), and one trial extender. The two gated life-stage modes (HRT, cancer recovery) are reviewed under `Docs/SENSITIVITY_REVIEW.md` rather than persona QA.

---

## Persona 1 — Sam, 27, masculine framework

Walks: install → onboarding → first scan → paywall (start trial) → daily routine → week 2 scan → comparison → cancel-save (declines, exits).

Pass criteria:
- Onboarding includes Q11 facial-hair branch.
- Routine includes `beard_care`; excludes `brow_shape`.
- Score reveal copy uses neutral pronouns.
- Comparison slider runs at 60fps on iPhone 12 and 15.
- Cancel-save offer lands as `extension-month-free` (sparse user, ≤4 weeks paid).

---

## Persona 2 — Lin, 34, feminine framework, pregnancy mode

Walks: install → onboarding → first scan → paywall → enables pregnancy mode in Settings → routine refresh → diary entry → week-2 scan → cancel-save (declines).

Pass criteria:
- Tretinoin removed from routine immediately on mode enable.
- Aging band suppressed across all surfaces.
- Streak chip shows "Auto-paused" copy with no flame, no red color, no "Don't break" language.
- Cancel-save offer lands as `engaged-during-life-stage` with mode-aware body copy ("bodies do").
- LIFE_STAGE_CONTEXT block injected into AI prompts.

---

## Persona 3 — Jordan, 51, neutral framework, menopause mode

Walks: install → onboarding (selects non-binary, picks neutral framework) → first scan → paywall → enables menopause mode → routine → 4-week timeline.

Pass criteria:
- Q1b non-binary gate appears and works.
- Aging band uses menopause-specific overlay (replaced, not suppressed).
- AI copy avoids "you're getting older" framing.
- No 6 AM notifications scheduled (time-of-day gate).

---

## Persona 4 — Priya, 22, feminine framework, trial extender

Walks: install → onboarding → first scan → day-7 forecast → declines paywall → trial-extension flow → 14 more days → eventual paid conversion.

Pass criteria:
- Day-7 forecast card displays the mandatory "PREVIEW" watermark.
- Forecast is a band, never a single number.
- Lower bound is never below baseline (no regression projection).
- Trial-extension flow grants 14 days via the `extend-trial` Edge Function.
- After extension, settings show `trialExtendedAt` set; the flow cannot be used twice.

---

## Persona 5 — Mike, 42, masculine framework, lapsed user

Walks: install → onboarding → six months as paid user → cancels → grace window → look-back read-only mode → resubscribes via reactivation surface.

Pass criteria:
- After cancel: 30-day grace window confirmed; capture and routine still write.
- After 30 days: `lapsed-readonly` phase. Capture replaced by paywall card. Diary writes blocked with "Resume to continue" card.
- Resubscribing restores all data immediately. Welcome-back card on dashboard for 7 days.
- Email digest opt-in honored.

---

## Common QA checklist (every persona)

- [ ] No raw photos / depth maps / face landmarks ever leave the device (verify via Charles Proxy or equivalent).
- [ ] All AI proxy calls go through Supabase Edge Function `ai-proxy` (never direct OpenAI from the client).
- [ ] Auth tokens stored in SecureStorage (Keychain), never AsyncStorage.
- [ ] Singular MMP initializes only after the ATT response.
- [ ] PostHog has analytics opt-out toggle that actually disables events.
- [ ] Reduce Motion preference respected (no big translation animations).
- [ ] VoiceOver navigation works through every primary screen.
- [ ] Brand voice grep across persona's session log: zero forbidden-word matches outside whitelisted exceptions.
- [ ] No exclamation marks in any UI string the persona encountered.
- [ ] Notification budget never exceeded for any surface (file 12).
- [ ] Account deletion completes within 60 seconds; verified via Supabase admin UI that profile and scans are gone.

---

## Recording protocol

Each persona walkthrough is screen-recorded with audio commentary by the QA tester. Files are stored under `qa/persona-walkthroughs/<persona>-<date>.mp4` and not committed to the repo. The walkthrough log (a markdown file recording exact timestamps, observations, and bugs filed) is committed under `qa/persona-walkthroughs/<persona>-<date>.md`.

---

## Acceptance gate

Sprint 6 ships when:

- All five persona walkthroughs pass all listed criteria.
- The brand-voice + contrast lints pass on the production build.
- All Maestro flows under `.maestro/` pass on a physical iPhone 12 + iPhone 15.
- All Jest tests pass, with coverage ≥ thresholds in `jest.config.js`.
- Sensitivity review for HRT and cancer-recovery modes completed and signed off (or modes remain gated for v1.0.x).
- App Store metadata reviewed by a non-engineer reader (file 16).
- TestFlight external testing completed with at least 20 testers and zero P0 bugs in the last 7 days.
