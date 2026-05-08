/**
 * Test build flags (file 26).
 *
 * **Expo client:** Only `EXPO_PUBLIC_*` variables are inlined into the JS
 * bundle at build time. Unprefixed `USE_MOCK_*` / `MOCK_*` are **not**
 * available in release binaries — use EAS env on the `test` profile.
 *
 * **E2E scenario** is therefore **compile-time** per artifact unless a future
 * native bridge maps Maestro launch arguments into JS (see
 * `Docs/REVIEW_PHASE_A_INVENTORY.md`).
 */
import Constants from 'expo-constants';
import type { LifeStageModeId } from '@/types/lifeStage';

export const isTestBuild = process.env.EXPO_PUBLIC_TEST_BUILD === 'true';

const env = (k: string) => process.env[k];

function publicEnv(name: `EXPO_PUBLIC_${string}`): string {
  return env(name) ?? '';
}

/** @deprecated Node/dev only; prefer `EXPO_PUBLIC_USE_MOCK_AR` in EAS `test` builds. */
const legacy = (k: string) => env(k) ?? '';

type Extra = {
  mockUserScenario?: string;
  testBuild?: boolean;
};

function extraMockScenario(): string {
  const ex = (Constants.expoConfig?.extra ?? {}) as Extra;
  return typeof ex.mockUserScenario === 'string' ? ex.mockUserScenario : '';
}

/** Effective mock-user scenario slug (E2E / harness). Empty in production. */
export function getMockUserScenario(): string {
  if (!isTestBuild) return '';
  return (
    publicEnv('EXPO_PUBLIC_MOCK_USER_SCENARIO') ||
    extraMockScenario() ||
    legacy('USE_MOCK_USER')
  );
}

export const testFlags = {
  useMockAR:
    isTestBuild &&
    (publicEnv('EXPO_PUBLIC_USE_MOCK_AR') === 'true' || legacy('USE_MOCK_AR') === 'true'),
  /** Raw scenario string, e.g. `true_with_baseline`, `true_with_treatment`. */
  mockUserScenario: getMockUserScenario(),
  mockUserHasBaseline:
    isTestBuild &&
    ['true_with_baseline', 'true_in_trial_day_7', 'true_with_4_sessions', 'true_engaged_paid_4mo'].includes(
      getMockUserScenario(),
    ),
  mockUserHasFourSessions: isTestBuild && getMockUserScenario() === 'true_with_4_sessions',
  mockUserIsTrialDay7: isTestBuild && getMockUserScenario() === 'true_in_trial_day_7',
  mockUserIsEngagedPaid: isTestBuild && getMockUserScenario() === 'true_engaged_paid_4mo',
  mockUserHasTreatment: isTestBuild && getMockUserScenario() === 'true_with_treatment',
  mockUserHasHealthHistory: isTestBuild && getMockUserScenario() === 'true_with_health_history',
  mockUserHasOneMonth: isTestBuild && getMockUserScenario() === 'true_with_one_month',
  mockUserHasHistory: isTestBuild && getMockUserScenario() === 'true_with_history',
  useMockPurchases:
    isTestBuild &&
    (publicEnv('EXPO_PUBLIC_USE_MOCK_PURCHASES') === 'true' || legacy('USE_MOCK_PURCHASES') === 'true'),
  useMockAI:
    isTestBuild && (publicEnv('EXPO_PUBLIC_USE_MOCK_AI') === 'true' || legacy('USE_MOCK_AI') === 'true'),
  useMockNetwork:
    isTestBuild &&
    (publicEnv('EXPO_PUBLIC_USE_MOCK_NETWORK') === 'true' || legacy('USE_MOCK_NETWORK') === 'true'),
  useMockNotifications:
    isTestBuild &&
    (publicEnv('EXPO_PUBLIC_USE_MOCK_NOTIFS') === 'true' || legacy('USE_MOCK_NOTIFS') === 'true'),
  useMockTime:
    isTestBuild &&
    (publicEnv('EXPO_PUBLIC_USE_MOCK_TIME') === 'true' || legacy('USE_MOCK_TIME') === 'true'),
  /** Reserved: fixed “today” for E2E when wired (ISO date string). */
  mockDateIso: isTestBuild
    ? (publicEnv('EXPO_PUBLIC_MOCK_DATE_ISO') || legacy('MOCK_DATE') || '').trim() || undefined
    : undefined,
  forceTheme: isTestBuild ? (env('FORCE_THEME') as 'light' | 'dark' | undefined) : undefined,
  forceLifeStageMode: isTestBuild ? (env('FORCE_LIFE_STAGE') as LifeStageModeId | undefined) : undefined,
};
