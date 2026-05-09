# Maestro E2E Checklist

> Critical-path flows for v1.0 → v1.5. Use the **EAS `test` profile** build
> (`EXPO_PUBLIC_TEST_BUILD=true`, bundle id **`com.velapp.vela`**).
> See **`Docs/REVIEW_PHASE_A_INVENTORY.md`** for env + mock policy.

## Harness notes

- **Jest / MSW** (`src/__mocks__/handlers.ts`) is **not** used by the app — only by Node tests via `jest.setup.js`.
- **Scenario data** (e.g. `true_with_treatment`) is selected at **`eas build`** time via
  `EXPO_PUBLIC_MOCK_USER_SCENARIO` on the `test` profile, **not** via `launchApp.arguments`
  (Expo inlines `EXPO_PUBLIC_*` at bundle time; per-flow args do not change JS env without a native bridge).
- Optional **dev-only** log: with a test binary, `__DEV__` prints `testFlags` from `app/_layout.tsx`.

## v1.0 (launch)

- [x] `onboarding.yaml` — Q1 → Q1b gate → Q2 personalization → privacy primer → paywall.
- [x] `capture.yaml` — Weekly scan: positioning, capture, scoring, reveal.
- [x] `comparison.yaml` — Two scans → compare slider → side-by-side → difference.
- [x] `forecast.yaml` — Day 7 trial forecast → conversion CTA.
- [x] `cancel-save.yaml` — Cancel intent → exit interview → save offer → confirm.
- [x] `lifestage-mode-pregnancy.yaml` — Toggle pregnancy mode → routine cascade → tone shift.

## v1.1 (refinements)

- [x] `diary-attach.yaml` — Reveal → "Add a note" → diary sheet → tags + free text.
- [x] `experiment-create.yaml` — Hypothesis → 4-week window → daily log → verdict.
- [x] `health-correlation.yaml` — HealthKit consent → snapshot ingest → correlation card.
- [x] `monthly-wrapped.yaml` — Wrapped-ready card → composer → share.

## v1.5 (treatment + hair)

- [x] `treatment-side-effect.yaml` — Active treatment → log severity → doctor export PDF.
- [ ] `hair-baseline.yaml` — Hair opt-in → 4-angle back-camera capture → density score.
- [ ] `practice-share-consent.yaml` — Deferred: no clinician web app; in-app AI + evidence citations instead.

## How to run locally

```bash
maestro test .maestro/capture.yaml --device "iPhone 15 Pro"
maestro test .maestro --include-tags critical-path
```

## CI

GitHub Actions runs the full set on the EAS `test` profile build per PR.
Failures block merge unless explicitly waived in the PR description with
the `e2e-skip` label and a justification.
