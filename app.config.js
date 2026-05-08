/**
 * Dynamic Expo config (file 27). Replaces app.json at build time.
 *
 * Three environments — development | staging | production. Each has its
 * own bundle id suffix, app name suffix, splash, icon variant, and Sentry
 * environment tag.
 *
 * EAS reads the EAS_BUILD_PROFILE env var; locally we fall back to
 * EXPO_PUBLIC_API_ENV from `.env`.
 */

const withSimdjsonPod = require('./plugins/withSimdjsonPod');

const env = process.env.EAS_BUILD_PROFILE || process.env.EXPO_PUBLIC_API_ENV || 'development';

/** EAS `test` profile — internal simulator/device builds for Maestro; same bundle family as dev. */
const isTestProfile = env === 'test';
const isDev = env === 'development';
const isStaging = env === 'staging';

const bundleSuffix = isDev || isTestProfile ? '.dev' : isStaging ? '.staging' : '';
const nameSuffix = isDev
  ? ' (Dev)'
  : isTestProfile
    ? ' (Test)'
    : isStaging
      ? ' (Staging)'
      : '';

module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? []), withSimdjsonPod];
  return {
    ...config,
    plugins,
    name: `Vela${nameSuffix}`,
    slug: 'vela',
    ios: {
      ...config.ios,
      bundleIdentifier: `com.velapp.vela${bundleSuffix}`,
    },
    android: {
      ...config.android,
      package: `com.velapp.vela${bundleSuffix}`,
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
