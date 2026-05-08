# Phase A — Inventory & mock surface (complete)

This document is the **authoritative map** for data sources, test doubles, and env wiring. Update it when adding flags or E2E flows.

## A.1 Build profiles & bundle IDs (`eas.json` + `app.config.js`)

| EAS profile      | `EAS_BUILD_PROFILE` | `EXPO_PUBLIC_TEST_BUILD` | iOS bundle id (after Phase A fix)   |
|------------------|---------------------|---------------------------|-------------------------------------|
| development      | development         | (unset)                   | `com.velapp.vela.dev`              |
| **test**         | **test**            | **true**                  | **`com.velapp.vela.dev`** (E2E)    |
| staging          | staging             | (unset)                   | `com.velapp.vela.staging`          |
| preview          | preview             | (unset)                   | `com.velapp.vela` (see note)       |
| production       | production          | (unset)                   | `com.velapp.vela`                  |

**Note:** `preview` uses `EAS_BUILD_PROFILE=preview`; `app.config.js` only treats `development` / `test` as `.dev` and `staging` as `.staging`. Any other profile gets **no suffix** (production-shaped id). Adjust if preview should match staging.

## A.2 `EXPO_PUBLIC_*` variables (inlined at bundle time)

| Variable | Where set | Consumed by |
|----------|-----------|-------------|
| `EXPO_PUBLIC_TEST_BUILD` | `eas.json` → `test` profile | `src/config/testMode.ts` |
| `EXPO_PUBLIC_API_ENV` | All EAS profiles | `app.config.js`, services |
| `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY` | Secrets / `.env` | `src/services/supabase`, Jest setup |
| `EXPO_PUBLIC_REVENUECAT_*` | EAS secrets | `revenuecat/init.ts` |
| `EXPO_PUBLIC_POSTHOG_*` | EAS secrets | `analytics/index.ts` |
| `EXPO_PUBLIC_AI_PROXY_URL` | Optional | `ai/index.ts` |
| `EXPO_PUBLIC_SINGULAR_KEY` | Optional | `attribution/singular.ts` |
| `EXPO_PUBLIC_RELEASE_HRT_MODES` / `CANCER_RECOVERY` | EAS | `lifeStage/sensitivityGate.ts` |
| `EXPO_PUBLIC_USE_MOCK_AR` | EAS `test` only (optional) | `testMode.ts` |
| `EXPO_PUBLIC_MOCK_USER_SCENARIO` | EAS `test` only (optional) | `testMode.ts` |
| `EXPO_PUBLIC_MOCK_DATE_ISO` | EAS `test` only (optional, reserved) | `testMode.ts` (reserved) |

**Rule:** Only `EXPO_PUBLIC_*` are guaranteed in the React Native bundle. Un-prefixed `USE_MOCK_*` are **not** inlined by Metro; they are listed as **deprecated** in `testMode.ts` for documentation/CI that runs in Node.

## A.3 Jest-only mock data (not shipped)

| Artifact | Role |
|----------|------|
| `src/__mocks__/handlers.ts` | MSW stubs for `ai-proxy`, `delete-account`, `extend-trial` in **Node** |
| `src/__mocks__/server.ts` | MSW `setupServer` |
| `jest.setup.js` | Starts MSW if present; sets fake Supabase URL for tests |
| `*.test.ts` / `*.test.tsx` | `jest.mock`, in-memory fixtures |

**Production app must not import `src/__mocks__/*`.** Grep: only `jest.setup.js` requires the server.

## A.4 Maestro E2E vs mock scenario

- **Maestro `launchApp.arguments`** (legacy YAML) does **not** automatically populate `process.env` in an Expo binary. Scenario selection for E2E should use either:
  1. **Build-time:** `EXPO_PUBLIC_MOCK_USER_SCENARIO` on the **EAS `test`** profile (one scenario per build artifact), or  
  2. **Future:** a native/dev-client bridge that reads launch arguments and sets JS state (not implemented).

- All `.maestro/*.yaml` **`appId`** values were **`app.getvela.dev`** (incorrect). They must match the **test/dev** bundle: **`com.velapp.vela.dev`**.

## A.5 Product vs “mock” ( honesty )

| Area | Behavior |
|------|----------|
| Hair density | Deterministic signal from on-device JPEG sizes — **not** clinical densitometry; copy must stay aligned. |
| Doctor PDF edge | Placeholder text PDF bytes — QA should treat as **stub** until real PDF pipeline ships. |

## A.6 Sign-off checklist (Phase A)

### A.6.1 CI — one scenario per E2E artifact

`EXPO_PUBLIC_*` is inlined at **Metro bundle** time. Maestro cannot inject it via `launchApp.arguments`. For each GitHub Actions (or other CI) job that runs Maestro:

1. **Pick the scenario** for that flow (see `src/config/testMode.ts` for allowed values, e.g. `true_with_treatment`).
2. **Build** the app with the EAS **`test`** profile (or local `expo export` / EAS build) and pass the var into the build environment, e.g.  
   `EXPO_PUBLIC_MOCK_USER_SCENARIO=true_with_treatment eas build --profile test ...`  
   or set the same key in **`eas.json`** → `test.env` for a dedicated “Maestro treatment” profile if you split jobs.
3. **Run Maestro** against the produced binary; one job = one scenario = one build artifact.

Do not rely on runtime-only env in CI for scenario selection unless you add a native bridge (not implemented).

- [x] Inventory written (this file)
- [x] `test` EAS profile resolves to **`.dev` bundle** (E2E binary identifiable)
- [x] `testMode.ts` uses **`EXPO_PUBLIC_*`** for mock flags
- [x] Maestro **`appId`** aligned to `com.velapp.vela.dev`
- [x] EAS **`test`** profile sets `EXPO_PUBLIC_USE_MOCK_AR=true` (simulator-friendly)
- [x] CI: `EXPO_PUBLIC_MOCK_USER_SCENARIO` per E2E job — **spec below (§A.6.1)**; wire your pipeline to match.
- [x] Phase B: product domain review (separate pass)

## A.7 Next phase (B)

Feature-domain review: auth, capture, scoring, treatment, hair, etc., using the checklist from the planning thread.
