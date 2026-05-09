/**
 * Dynamic Expo config (file 27). Replaces app.json at build time.
 *
 * **Single app identity:** `com.velapp.vela` / launcher name "Vela" for every profile.
 * Local dev (Metro + dev client), EAS internal builds, and App Store all replace the same
 * install on a device — no `.dev` / `.staging` bundle id forks. Environment is still exposed
 * at runtime via `extra.env` (`EXPO_PUBLIC_API_ENV` / `EAS_BUILD_PROFILE`).
 *
 * EAS reads the EAS_BUILD_PROFILE env var; locally we fall back to
 * EXPO_PUBLIC_API_ENV from `.env`.
 */

const withSimdjsonPod = require('./plugins/withSimdjsonPod');

const env = process.env.EAS_BUILD_PROFILE || process.env.EXPO_PUBLIC_API_ENV || 'development';

module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? []), withSimdjsonPod];
  return {
    ...config,
    plugins,
    name: 'Vela',
    slug: 'vela',
    ios: {
      ...config.ios,
      bundleIdentifier: 'com.velapp.vela',
    },
    android: {
      ...config.android,
      package: 'com.velapp.vela',
    },
    extra: {
      ...config.extra,
      env,
      /** Mirrored for debugging; scenario is fixed at build time for Expo (not per Maestro launch). */
      easProfile: process.env.EAS_BUILD_PROFILE ?? null,
      testBuild: process.env.EXPO_PUBLIC_TEST_BUILD === 'true',
      mockUserScenario: process.env.EXPO_PUBLIC_MOCK_USER_SCENARIO ?? '',
    },
    hooks: {
      postPublish: [
        // Sentry source maps (file 27). Wired via SENTRY_AUTH_TOKEN.
      ],
    },
  };
};
