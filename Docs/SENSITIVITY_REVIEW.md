# Sensitivity Review Checklist (Sprint 6)

This document is the single source of truth for the pre-launch sensitivity review of the two life-stage modes that ship behind a flag at v1: HRT (estrogen and testosterone) and cancer recovery. Both modes are fully implemented; their UI surface is gated by `EXPO_PUBLIC_RELEASE_HRT_MODES` and `EXPO_PUBLIC_RELEASE_CANCER_RECOVERY`.

The sensitivity review must produce written sign-off from at least one external reviewer per mode before the flag flips. Sign-off is recorded in `Docs/SENSITIVITY_REVIEW_SIGNOFFS.md` (created by the reviewer; not committed by the build engineer).

---

## HRT — estrogen and testosterone

Reviewer profile: trans person on HRT for ≥18 months. Two reviewers preferred (one E, one T).

Items to review:

1. **Mode-enable copy** in `src/components/lifeStage/LifeStageEnableSheet.tsx` for `hrt_estrogen` and `hrt_testosterone`.
2. **AI prompt LIFE_STAGE_CONTEXT block** in `supabase/functions/ai-proxy/index.ts` for HRT framing.
3. **HRT timeline overlay copy** on the aging band screen — strings only (no medical advice; no gender presumption).
4. **Hair-tracking copy** when active. Hair density rises (T) and falls (E hairline) are tracked descriptively.
5. **Wrapped acknowledgement copy** for "Year one on E/T."
6. **Settings descriptions** for HRT modes in the Health & lifestyle list.
7. **Notification copy** under HRT mode — must be trans-inclusive throughout, no gendered pronouns derived from profile.
8. **Privacy reassurance card** that fires once on HRT mode enable, confirming no AI sees the mode unless explicitly opted in.

Pass criteria:

- Zero gendered presumptions in any HRT copy.
- Zero "transitioning to" framing.
- Zero alarming framing about effects (hairline, body changes).
- All copy reads as descriptive, not prescriptive.

---

## Cancer recovery

Reviewer profile: oncology-aware. Patient advocate or oncology social worker. At least one external reviewer.

Items to review:

1. **Mode-enable copy** in `src/components/lifeStage/LifeStageEnableSheet.tsx` for `cancer_recovery`.
2. **AI prompt LIFE_STAGE_CONTEXT block** for cancer-recovery framing.
3. **Hair-tracking copy** during chemo recovery. Must never use "loss" or "thinning" framing during cancer recovery mode.
4. **Wrapped acknowledgement copy**: *"Through chemo, you scanned thirteen times this year. That's a lot of showing up."* Tone test.
5. **Streak surface** during cancer recovery mode. Streaks auto-freeze for full mode duration; visibility set to subtle. Confirm this is the experience.
6. **Notification copy** under cancer recovery mode. Daily routine reminders pause by default. Weekly scan reminder softens.
7. **Privacy reassurance card** that fires once on cancer recovery mode enable, confirming no metadata leaves the device.
8. **Treatment library warnings** — actives that warn (not block) during cancer recovery: tretinoin, hydroquinone, AHAs/BHAs, microneedling, chemical peels, lasers.
9. **Cancellation save-flow copy** for users in cancer recovery: `bodyForMode('cancer_recovery')` in `src/core/cancelSave/saveEngine.ts`.

Pass criteria:

- Zero alarming framing in any string.
- Zero "loss" or "thinning" language while mode is active.
- All references to chemotherapy / radiation / treatment are descriptive, never prescriptive.
- Hair-tracking copy reads as recovery-supportive, not regret-inducing.

---

## Sign-off process

1. Reviewer reads the relevant strings, runs the app with the gate flag temporarily on, walks through the enable flow.
2. Reviewer provides written feedback (track changes, comments, or a markdown doc).
3. Engineer addresses every comment or documents why a comment is rejected (rare; should require a strong reason).
4. Reviewer re-reads after edits and signs off in `Docs/SENSITIVITY_REVIEW_SIGNOFFS.md`.
5. Engineer flips `EXPO_PUBLIC_RELEASE_HRT_MODES=true` and / or `EXPO_PUBLIC_RELEASE_CANCER_RECOVERY=true` in `eas.json` for the next production build.
6. Release notes mention the new mode by name without flagging it as "new" in a way that calls undue attention to it.

---

## Test coverage

- Unit: `src/core/lifeStage/sensitivityGate.test.ts` verifies the picker hides the gated modes pre-flag.
- E2E: `.maestro/lifestage-mode-pregnancy.yaml` exercises the framework on a v1 mode; HRT / cancer-recovery flows live behind the gate flag and run only in dedicated review builds.

---

## Privacy review

- HRT type and cancer treatment metadata are encrypted at rest.
- Neither mode sends mode-specific metadata (HRT type, treatment type) to the AI proxy without an explicit per-mode AI consent toggle.
- Analytics event properties for these modes are limited to `mode_id` only; durations are bucketed; treatment types are never logged.
- Account deletion cascades all life-stage data including these modes' metadata.
