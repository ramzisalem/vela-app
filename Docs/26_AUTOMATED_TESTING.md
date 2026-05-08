# 26 — Automated Testing

## Overview
Vela's automated testing strategy. Three layers: **unit tests** (logic, pure functions), **integration tests** (components with stores/services), and **E2E tests** (full user flows on real devices). Plus mocking strategies for the things that are hard to test (ARKit, RevenueCat, AI calls).

The goal is **high confidence with low maintenance**. We test the things most likely to break and most expensive to break in production.

---

## Testing Philosophy

### What we test
- Business logic in pure functions (scoring, AI prompt generation, data transformations)
- Critical user flows (onboarding, capture, paywall, comparison)
- Components with non-trivial state (capture flow state machine, routine engine)
- API contracts (Supabase Edge Function inputs/outputs)
- Type contracts (TypeScript strict mode + tests verify runtime conformance)

### What we don't test
- Static UI rendering (snapshot tests are brittle, don't catch real bugs)
- Third-party libraries (we trust react-native-reanimated to work)
- One-off scripts in `/scripts/`
- Markdown content in spec files

### Testing pyramid

```
              ┌──────────────┐
              │     E2E      │   ~20 tests
              │  (Maestro)   │
              └──────────────┘
            ┌──────────────────┐
            │  Integration     │  ~80 tests
            │  (Jest + RNTL)   │
            └──────────────────┘
        ┌──────────────────────────┐
        │      Unit tests          │  ~250 tests
        │       (Jest)             │
        └──────────────────────────┘
```

---

## Tooling

### Jest
- Test runner and assertion library
- Already included with Expo
- Use `jest-expo` preset

### React Native Testing Library (RNTL)
- Component testing with user-centric queries
- Encourages testing behavior, not implementation

### Maestro
- E2E test framework, replaces Detox
- Simpler YAML syntax than Detox's JavaScript
- Faster local execution
- Supports both iOS Simulator and physical devices

### Why not Detox
- Detox is more complex, brittle on iOS 17+
- Maestro's YAML files are easier to write and maintain
- Maestro Cloud provides device farm
- Fewer moving parts

### Setup

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "maestro test .maestro/",
    "test:e2e:cloud": "maestro cloud --apiKey $MAESTRO_API_KEY .maestro/"
  },
  "devDependencies": {
    "@testing-library/react-native": "^13.0.0",
    "@testing-library/jest-native": "^5.4.3",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "jest-expo": "~51.0.0",
    "react-test-renderer": "18.2.0"
  }
}
```

```javascript
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@watermelondb)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 70,
      statements: 70,
    },
  },
};
```

```typescript
// jest.setup.ts
import '@testing-library/jest-native/extend-expect';

// Silence noisy logs in tests
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Mock async storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Reanimated
require('react-native-reanimated/lib/reanimated2/jestUtils').setUpTests();

// Mock the native ARKit module
jest.mock('@/native/VelaArKit', () => ({
  startSession: jest.fn(),
  stopSession: jest.fn(),
  getCurrentMetrics: jest.fn(() => Promise.resolve({
    yaw: 0, pitch: 0, roll: 0, distance: 0.4, confidence: 0.95,
  })),
}));
```

---

## Unit Tests

Test pure logic in isolation. The bulk of Vela's tests live here.

### Example: Score calculation

```typescript
// src/services/scoring/__tests__/computeScore.test.ts
import { computeOverallScore, computeSubScores } from '../computeScore';
import type { FaceMetrics } from '@/types';

describe('computeOverallScore', () => {
  it('returns weighted average of sub-scores', () => {
    const subScores = {
      skin: 80,
      symmetry: 70,
      definition: 60,
      vitality: 75,
      grooming: 85,
    };
    
    const overall = computeOverallScore(subScores);
    
    // Skin (35%) + Symmetry (15%) + Definition (20%) + Vitality (20%) + Grooming (10%)
    const expected = 80 * 0.35 + 70 * 0.15 + 60 * 0.20 + 75 * 0.20 + 85 * 0.10;
    expect(overall).toBeCloseTo(expected, 1);
  });
  
  it('clamps to [0, 100] range', () => {
    expect(computeOverallScore({ skin: -10, symmetry: 0, definition: 0, vitality: 0, grooming: 0 })).toBeGreaterThanOrEqual(0);
    expect(computeOverallScore({ skin: 200, symmetry: 100, definition: 100, vitality: 100, grooming: 100 })).toBeLessThanOrEqual(100);
  });
  
  it('rounds to integer', () => {
    const result = computeOverallScore({ skin: 73.4, symmetry: 81.2, definition: 65, vitality: 70, grooming: 75 });
    expect(result).toBe(Math.round(result));
  });
});

describe('computeSubScores', () => {
  it('penalizes asymmetry', () => {
    const symmetricMetrics: FaceMetrics = createMockMetrics({ asymmetryScore: 0.05 });
    const asymmetricMetrics: FaceMetrics = createMockMetrics({ asymmetryScore: 0.4 });
    
    const symmetric = computeSubScores(symmetricMetrics);
    const asymmetric = computeSubScores(asymmetricMetrics);
    
    expect(symmetric.symmetry).toBeGreaterThan(asymmetric.symmetry);
  });
  
  it('handles missing metrics gracefully', () => {
    const partialMetrics = createMockMetrics({ skinClarity: undefined });
    const result = computeSubScores(partialMetrics);
    
    expect(result.skin).toBeDefined();
    expect(result.skin).toBeGreaterThanOrEqual(0);
  });
});

function createMockMetrics(overrides: Partial<FaceMetrics> = {}): FaceMetrics {
  return {
    skinClarity: 0.75,
    skinTexture: 0.70,
    skinTone: 0.80,
    asymmetryScore: 0.15,
    jawDefinition: 0.65,
    cheekboneDefinition: 0.70,
    underEyeDarkness: 0.20,
    skinBrightness: 0.75,
    facialPuffiness: 0.10,
    grooming: 0.80,
    confidence: 0.95,
    ...overrides,
  };
}
```

### Example: AI prompt generation

```typescript
// src/services/ai/__tests__/generatePrompt.test.ts
import { generateRoutinePrompt } from '../generatePrompt';

describe('generateRoutinePrompt', () => {
  it('includes user concerns in the prompt', () => {
    const prompt = generateRoutinePrompt({
      profile: { age: 32, ethnicity: 'south_asian', concerns: ['hyperpigmentation'] },
      latestScores: { skin: 65 },
    } as any);
    
    expect(prompt).toContain('hyperpigmentation');
    expect(prompt).toContain('32');
    expect(prompt).toContain('south_asian');
  });
  
  it('mentions active treatments when present', () => {
    const prompt = generateRoutinePrompt({
      profile: { activeTreatments: ['tretinoin'] },
    } as any);
    
    expect(prompt.toLowerCase()).toContain('tretinoin');
  });
  
  it('does not mention treatments when none active', () => {
    const prompt = generateRoutinePrompt({
      profile: { activeTreatments: [] },
    } as any);
    
    expect(prompt.toLowerCase()).not.toContain('tretinoin');
  });
});
```

### Example: Data transformations

```typescript
// src/services/__tests__/sessionGrouping.test.ts
import { groupSessionsByMonth } from '../sessionGrouping';

describe('groupSessionsByMonth', () => {
  it('groups sessions by month', () => {
    const sessions = [
      { id: '1', capturedAt: new Date('2025-01-15') },
      { id: '2', capturedAt: new Date('2025-01-22') },
      { id: '3', capturedAt: new Date('2025-02-05') },
    ] as any;
    
    const grouped = groupSessionsByMonth(sessions);
    
    expect(grouped).toHaveLength(2);
    expect(grouped[0].sessions).toHaveLength(2);
    expect(grouped[1].sessions).toHaveLength(1);
  });
  
  it('sorts months newest first', () => {
    const sessions = [
      { id: '1', capturedAt: new Date('2025-01-01') },
      { id: '2', capturedAt: new Date('2025-03-01') },
    ] as any;
    
    const grouped = groupSessionsByMonth(sessions);
    
    expect(grouped[0].title).toBe('March 2025');
    expect(grouped[1].title).toBe('January 2025');
  });
});
```

---

## Integration Tests (RNTL)

Test components with their stores, services, and providers.

### Example: Button component

```typescript
// src/components/ui/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';
import { ThemeProvider } from '@/theme/ThemeContext';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Button', () => {
  it('renders the title', () => {
    renderWithTheme(<Button title="Save" onPress={jest.fn()} />);
    expect(screen.getByText('Save')).toBeOnTheScreen();
  });
  
  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    renderWithTheme(<Button title="Save" onPress={onPress} />);
    
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  
  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    renderWithTheme(<Button title="Save" onPress={onPress} disabled />);
    
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    
    expect(onPress).not.toHaveBeenCalled();
  });
  
  it('shows loading indicator when loading', () => {
    renderWithTheme(<Button title="Save" onPress={jest.fn()} loading />);
    
    expect(screen.queryByText('Save')).toBeNull();
    expect(screen.getByLabelText('Save')).toBeOnTheScreen();
  });
});
```

### Example: Onboarding question screen

```typescript
// app/(onboarding)/__tests__/section-a.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import SectionA from '../section-a';
import { ThemeProvider } from '@/theme/ThemeContext';
import { OnboardingProvider } from '@/stores/onboardingStore';

function renderScreen() {
  return render(
    <ThemeProvider>
      <OnboardingProvider>
        <SectionA />
      </OnboardingProvider>
    </ThemeProvider>
  );
}

describe('SectionA', () => {
  it('disables Continue button until name is entered', () => {
    renderScreen();
    
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    expect(continueButton).toBeDisabled();
    
    fireEvent.changeText(screen.getByLabelText('Your name'), 'Maya');
    
    expect(continueButton).not.toBeDisabled();
  });
  
  it('saves answers to onboarding store', async () => {
    renderScreen();
    
    fireEvent.changeText(screen.getByLabelText('Your name'), 'Maya');
    fireEvent.press(screen.getByText('32'));
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    
    // Assert state was saved (assuming we expose getter)
    // ...
  });
});
```

### Example: Routine task with state

```typescript
// src/components/routine/__tests__/RoutineTaskCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RoutineTaskCard } from '../RoutineTaskCard';
import { ThemeProvider } from '@/theme/ThemeContext';

const mockTask = {
  id: 'task-1',
  title: 'Apply SPF 30+',
  duration_minutes: 1,
  category: 'sunscreen',
  why_it_matters: 'UV exposure causes hyperpigmentation',
  evidence_level: 'strong' as const,
  // ...
};

describe('RoutineTaskCard', () => {
  it('toggles completed state on tap', () => {
    const onToggle = jest.fn();
    render(
      <ThemeProvider>
        <RoutineTaskCard task={mockTask} isCompleted={false} onToggle={onToggle} />
      </ThemeProvider>
    );
    
    fireEvent.press(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('task-1', true);
  });
  
  it('shows duration and evidence badge', () => {
    render(
      <ThemeProvider>
        <RoutineTaskCard task={mockTask} isCompleted={false} onToggle={jest.fn()} />
      </ThemeProvider>
    );
    
    expect(screen.getByText('1 min')).toBeOnTheScreen();
    expect(screen.getByText(/strong evidence/i)).toBeOnTheScreen();
  });
});
```

---

## Mocking Strategies

### Mocking the native ARKit module

```typescript
// src/native/__mocks__/VelaArKit.ts
export const startSession = jest.fn(() => Promise.resolve());
export const stopSession = jest.fn(() => Promise.resolve());
export const getCurrentMetrics = jest.fn(() => Promise.resolve({
  yaw: 0,
  pitch: 0,
  roll: 0,
  distance: 0.4,
  confidence: 0.95,
}));
export const capturePhoto = jest.fn(() => Promise.resolve({
  uri: 'file:///mock-photo.jpg',
  width: 1080,
  height: 1920,
  metrics: {
    yaw: 0, pitch: 0, roll: 0, distance: 0.4, confidence: 0.95,
  },
}));
```

### Mocking Supabase

```typescript
// src/services/supabase/__mocks__/client.ts
export const supabase = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },
  
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
  })),
  
  functions: {
    invoke: jest.fn(),
  },
};
```

### Mocking RevenueCat

```typescript
// src/services/__mocks__/revenuecat.ts
export const Purchases = {
  configure: jest.fn(),
  getCustomerInfo: jest.fn(() => Promise.resolve({
    entitlements: { active: {} },
  })),
  getOfferings: jest.fn(() => Promise.resolve({
    current: {
      annual: { product: { priceString: '$79.00' } },
      monthly: { product: { priceString: '$9.99' } },
    },
  })),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
};
```

### Mocking AI calls

```typescript
// src/services/ai/__mocks__/aiService.ts
export const generateRoutine = jest.fn(() => Promise.resolve({
  summary: 'Mock routine summary',
  tasks: [
    { id: 'mock-1', title: 'Mock task 1' },
    { id: 'mock-2', title: 'Mock task 2' },
  ],
}));

export const generateMicroPayoff = jest.fn(() => Promise.resolve(
  'Mock micro-payoff response based on your answers.'
));

export const generateScoreNarrative = jest.fn(() => Promise.resolve({
  overall: 'Strong week. Your routine is working.',
  perSubScore: {},
}));
```

---

## E2E Tests with Maestro

Maestro flows live in `.maestro/`. Each flow is a YAML file describing user actions.

### Setup

```bash
# Install Maestro
brew tap mobile-dev-inc/tap
brew install maestro

# Run a flow
maestro test .maestro/onboarding.yaml

# Run all flows
maestro test .maestro/
```

### Example: Onboarding flow

```yaml
# .maestro/onboarding.yaml
appId: com.velapp.vela.dev
---
- launchApp:
    clearState: true
- assertVisible: "Track your face properly"
- tapOn: "Get started"

# Sign in
- assertVisible: "Sign in with Apple"
- tapOn:
    id: "test-skip-signin"  # Test-only path that mocks auth

# Onboarding section A
- assertVisible: "Tell us about yourself"
- inputText: "Test User"
- tapOn: "30-34"
- tapOn: "Woman"
- tapOn: "Continue"

# Section transition with AI micro-payoff
- assertVisible: "Tell us about your skin"
  timeout: 15000

# Continue through sections...
- tapOn: "Continue"
- tapOn: "Continue"

# Permissions
- assertVisible: "We need camera access"
- tapOn: "Allow camera access"
- tapOn: "Allow"  # System dialog

# First capture
- assertVisible: "First scan"
- tapOn: "I'm ready"

# Capture flow (will use mocked AR module in test build)
- waitForAnimationToEnd
- assertVisible: "Calibrating your baseline"

# Score reveal
- assertVisible: "Your baseline"
  timeout: 30000

- tapOn: "Continue"

# Paywall
- assertVisible: "Start 7-Day Free Trial"
- tapOn: "Start 7-Day Free Trial"

# Mock purchase succeeds
- assertVisible: "Welcome to Vela"
  timeout: 10000
```

### Example: Capture flow

```yaml
# .maestro/capture.yaml
appId: com.velapp.vela.dev
---
- launchApp:
    arguments:
      - "USE_MOCK_USER=true"
      - "USE_MOCK_AR=true"
- tapOn: "Take this week's scan"
- assertVisible: "Position your face"
- waitForAnimationToEnd:
    timeout: 5000
- assertVisible: "Captured"
  timeout: 15000
- tapOn: "Continue"
- assertVisible: "Your scores"
  timeout: 30000
```

### Example: Comparison flow

```yaml
# .maestro/comparison.yaml
appId: com.velapp.vela.dev
---
- launchApp:
    arguments:
      - "USE_MOCK_USER=true_with_4_sessions"
- tapOn:
    id: "tab-compare"
- assertVisible: "Baseline vs Latest"
- tapOn: "Slider"
- assertVisible:
    id: "comparison-slider"
- swipe:
    from: { x: "30%", y: "50%" }
    to: { x: "70%", y: "50%" }
- tapOn: "Side by side"
- assertVisible: "Score change: +5"
```

### E2E rules

- **Don't test everything end-to-end.** E2E is slow and brittle. Reserve for critical paths.
- **Use test-build mocks.** Real ARKit requires physical device. Real RevenueCat requires sandbox account. Real AI costs money.
- **One flow per file.** Easier to debug failures.
- **Run on CI nightly, not on every commit.** Too slow for per-PR.

---

## Test Builds

We need a special build that mocks expensive/hard-to-test parts:

```typescript
// src/config/testMode.ts
export const isTestBuild = process.env.EXPO_PUBLIC_TEST_BUILD === 'true';

export const testFlags = {
  useMockAR: isTestBuild && process.env.USE_MOCK_AR === 'true',
  useMockUser: isTestBuild && process.env.USE_MOCK_USER === 'true',
  useMockPurchases: isTestBuild && process.env.USE_MOCK_PURCHASES === 'true',
  useMockAI: isTestBuild && process.env.USE_MOCK_AI === 'true',
  // Additional mocks for hard-to-test surfaces:
  useMockNetwork: isTestBuild && process.env.USE_MOCK_NETWORK === 'true',
  // ↑ When true, all fetch / Supabase calls go through MSW handlers.
  useMockNotifications: isTestBuild && process.env.USE_MOCK_NOTIFS === 'true',
  // ↑ When true, simulate notification taps via global helpers exposed in dev.
  useMockTime: isTestBuild && process.env.USE_MOCK_TIME === 'true',
  // ↑ When true, sinon.useFakeTimers() advances the clock for streak / DST / Wrapped tests.
  forceTheme: isTestBuild ? (process.env.FORCE_THEME as 'light'|'dark'|undefined) : undefined,
  // ↑ Forces light or dark mode regardless of system; test both branches.
  forceLifeStageMode: isTestBuild ? (process.env.FORCE_LIFE_STAGE as LifeStageModeId|undefined) : undefined,
  // ↑ Lets E2E tests verify file 48 mode-aware surfaces without UI flow to enable.
};

// Conditionally use mock or real implementation
export const arService = testFlags.useMockAR 
  ? require('@/native/__mocks__/VelaArKit')
  : require('@/native/VelaArKit');
```

EAS Build profile for tests:

```json
// eas.json
{
  "build": {
    "test": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_TEST_BUILD": "true",
        "EXPO_PUBLIC_API_URL": "https://staging.vela.app"
      },
      "ios": {
        "simulator": true
      }
    }
  }
}
```

---

## Edge Function mocking (canonical)

The AI proxy and other Edge Functions are mocked in tests via **Mock Service Worker (MSW)**, not by stubbing service modules. This way the request/response contract is validated against the actual fetch path the app uses in production.

```typescript
// src/__mocks__/handlers.ts
import { http, HttpResponse } from 'msw';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export const handlers = [
  http.post(`${SUPABASE_URL}/functions/v1/ai-proxy`, async ({ request }) => {
    const body = await request.json();
    if (body.action === 'generate-routine') {
      return HttpResponse.json({ /* canonical mock routine */ });
    }
    if (body.action === 'score-explanation') {
      return HttpResponse.json({ /* canonical mock explanation */ });
    }
    return new HttpResponse(null, { status: 404 });
  }),
  // ... handlers for every Edge Function
];
```

**Rule:** every Edge Function added to file 03 MUST have a corresponding handler. CI runs a contract test that calls every handler with both happy and unhappy payloads.

---

## Settings tree component test (canonical)

A new test file MUST exist: `src/screens/__tests__/SettingsScreen.test.tsx`. It iterates `SETTINGS_MANIFEST` (file 14) and verifies every section + row renders without crashing.

```typescript
import { render } from '@testing-library/react-native';
import SettingsScreen from '@/app/(main)/settings';
import { SETTINGS_MANIFEST } from '@/screens/settings/manifest';

describe('Settings tree completeness', () => {
  it.each(SETTINGS_MANIFEST)('renders section: $title', (section) => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText(section.title)).toBeTruthy();
    section.rows.forEach((row) => {
      expect(getByText(row.label)).toBeTruthy();
    });
  });
});
```

This test is the safety net for new feature files adding rows that crash on render.

---

## Coverage thresholds enforced per PR

CI fails if any PR drops coverage below the targets. Workflow snippet:

```yaml
# .github/workflows/test.yml
- run: npm test -- --coverage --coverageReporters=json-summary
- name: Enforce coverage
  run: |
    node -e "
      const c = require('./coverage/coverage-summary.json').total;
      if (c.lines.pct < 70 || c.branches.pct < 60) process.exit(1);
    "
```

Per-file overrides allowed via `jest.config.js` `coverageThreshold` only for documented exceptions.

---

## What NOT to test

### Skip these
- Snapshot tests of the entire app (brittle, low value)
- Tests of styling (covered by visual review and design QA)
- Tests of third-party library behavior
- Tests of generated code
- Tests of TypeScript types (use TS itself)

### Don't write tests like this
```typescript
// ❌ Tests implementation, not behavior
it('calls useEffect on mount', () => {
  const useEffectSpy = jest.spyOn(React, 'useEffect');
  render(<Component />);
  expect(useEffectSpy).toHaveBeenCalled();
});

// ❌ Snapshot of complex UI (changes constantly)
it('matches snapshot', () => {
  expect(render(<Dashboard />).toJSON()).toMatchSnapshot();
});

// ❌ Tests internal state
it('sets state to loading', () => {
  const { result } = renderHook(() => useCapture());
  act(() => result.current.start());
  expect(result.current.internalState).toBe('loading');  // Internal!
});
```

### Do write tests like this
```typescript
// ✅ Tests behavior the user sees
it('disables Continue while saving', async () => {
  render(<Form />);
  fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.com');
  fireEvent.press(screen.getByText('Continue'));
  expect(screen.getByText('Continue')).toBeDisabled();
  await waitFor(() => expect(screen.getByText('Continue')).not.toBeDisabled());
});
```

---

## Coverage Targets

Per-area minimums for coverage:

| Area | Target |
|------|--------|
| Pure logic (`src/services/scoring/`, `src/services/ai/`) | 90% |
| State management (`src/stores/`) | 80% |
| Components (`src/components/ui/`) | 70% |
| Screen components (`app/`) | 50% |
| Utilities (`src/utils/`) | 80% |
| Native bridges (`src/native/`) | 30% (mostly mocked) |
| Overall | 70% |

These are minimums. Don't aim for 100%; that drives bad tests.

---

## CI Integration

(Detailed in file 27 — CI/CD.)

Tests run on every PR:
- `npm test` — unit + integration tests
- `npm run typecheck`
- `npm run lint`

E2E runs nightly:
- Maestro Cloud test on iOS simulator with mocked AR

Coverage reported to PR via Codecov or CodeClimate.

---

## Test Naming Conventions

Use `describe`/`it` with descriptive names:

```typescript
// ❌ Vague
describe('utils', () => {
  it('works', () => {});
});

// ✅ Descriptive
describe('formatScoreDelta', () => {
  describe('when delta is positive', () => {
    it('prefixes with +', () => {});
    it('uses success color', () => {});
  });
  
  describe('when delta is zero', () => {
    it('shows "no change"', () => {});
    it('uses neutral color', () => {});
  });
});
```

---

## Common Test Pitfalls (and Fixes)

### Async operations not awaited
```typescript
// ❌ Test passes by accident
it('saves data', () => {
  fireEvent.press(screen.getByText('Save'));
  expect(mockSave).toHaveBeenCalled();  // Hasn't fired yet!
});

// ✅ Wait for async
it('saves data', async () => {
  fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(mockSave).toHaveBeenCalled());
});
```

### Reanimated tests need setup
Reanimated animations don't run in Jest by default. Use the official setup helper (in `jest.setup.ts`).

### Date.now() makes tests flaky
```typescript
// ❌ Flaky
it('formats date', () => {
  expect(formatRelative(new Date())).toBe('just now');
});

// ✅ Mock the clock
it('formats date', () => {
  jest.useFakeTimers().setSystemTime(new Date('2025-01-15'));
  expect(formatRelative(new Date('2025-01-15T00:00:30'))).toBe('30s ago');
});
```

---

## Pre-Launch Test Checklist

Before any release:

- All unit tests passing (`npm test`)
- TypeScript clean (`npm run typecheck`)
- ESLint clean (`npm run lint`)
- E2E onboarding flow passes on iOS simulator
- E2E capture flow passes (with mocked AR)
- E2E paywall flow passes (with mocked purchases)
- Manual capture test on physical device
- Manual paywall test with sandbox account
- Manual dark mode pass on every screen
- Manual VoiceOver pass on critical flows
