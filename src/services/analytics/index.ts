/**
 * Analytics service (file 25).
 *
 * PostHog (EU host) for product analytics. Sentry for crash reports.
 * Singular for paid-attribution; gated behind ATT (file 31).
 *
 * Events go through `track()` which validates against the closed enum.
 */
import PostHog from 'posthog-react-native';
import type { AnalyticsEvent, EventProps } from './events';

let isInitialized = false;
let postHog: PostHog | null = null;

function sanitize(props?: EventProps): Record<string, string | number | boolean> | undefined {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export const Analytics = {
  async initialize(): Promise<void> {
    if (isInitialized) return;
    isInitialized = true;
    const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
    const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;
    if (!key) {
      console.info('[analytics] PostHog key missing; analytics off');
      return;
    }
    try {
      postHog = new PostHog(key, { host });
    } catch (e) {
      console.info('[analytics] PostHog init failed', e);
    }
  },

  identify(userId: string, props?: EventProps): void {
    postHog?.identify(userId, sanitize(props));
  },

  track(event: AnalyticsEvent, props?: EventProps): void {
    postHog?.capture(event, sanitize(props));
  },

  /**
   * Persona inference (file 25). Computes a coarse cohort from profile
   * answers and emits as user property for cohort analysis.
   */
  inferPersona(profile: {
    gender: string;
    primaryGoal?: string;
    routineIntensity?: string;
    age?: number;
  }): string {
    if (profile.primaryGoal === 'monitor_treatment') return 'treatment_monitor';
    if (profile.primaryGoal === 'address_skin') return 'skin_focused';
    if (profile.routineIntensity === 'minimal' && profile.gender === 'man') return 'masculine_minimal';
    if (profile.routineIntensity === 'intensive') return 'routine_devoted';
    if ((profile.age ?? 30) >= 45) return 'mature_track';
    return 'baseline_track';
  },
};
