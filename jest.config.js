/** Jest config for Vela.
 *
 * Two projects:
 *   - "unit"        — pure-logic tests (no React Native), fast.
 *                     Uses ts-jest to skip Metro/Expo overhead.
 *   - "components"  — RNTL tests for components and stores.
 *                     Uses jest-expo preset; runs less often.
 *
 * Run all:  npx jest
 * Unit only:  npx jest --selectProjects unit
 */
const moduleNameMapper = {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@/types$': '<rootDir>/src/types/index.ts',
  '^@/types/(.*)$': '<rootDir>/src/types/$1',
  '^@/stores/(.*)$': '<rootDir>/src/stores/$1',
  '^@/services/(.*)$': '<rootDir>/src/services/$1',
  '^@/core/(.*)$': '<rootDir>/src/core/$1',
  '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
  '^@/theme$': '<rootDir>/src/theme/index.ts',
};

module.exports = {
  // Watchman hangs intermittently on this checkout; jest's built-in walker
  // is fast enough for the project size.
  watchman: false,
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/core/**/*.test.{ts,tsx}',
        '<rootDir>/src/services/**/*.test.{ts,tsx}',
        '<rootDir>/src/stores/**/*.test.{ts,tsx}',
        '<rootDir>/src/utils/**/*.test.{ts,tsx}',
      ],
      transform: {
        '^.+\\.(ts|tsx)$': [
          'ts-jest',
          {
            tsconfig: { jsx: 'react', esModuleInterop: true, target: 'es2020' },
            isolatedModules: true,
            diagnostics: false,
          },
        ],
      },
      moduleNameMapper,
      setupFiles: ['<rootDir>/jest.setup.js'],
      testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/', '/.expo/', '/supabase/', '/modules/'],
    },
    {
      displayName: 'components',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/src/components/**/*.test.{ts,tsx}'],
      moduleNameMapper,
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|expo-modules-core|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/react-native-skia)/)',
      ],
      setupFiles: ['<rootDir>/jest.setup.js'],
    },
  ],
  collectCoverageFrom: [
    'src/core/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    'src/stores/**/*.{ts,tsx}',
    'src/utils/**/*.{ts,tsx}',
  ],
  coverageThreshold: {
    global: { lines: 50, statements: 50, functions: 50, branches: 40 },
  },
};
