// Minimal Jest setup. Specific mocks for native modules are colocated with
// the tests that need them so the global setup stays tiny.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// MSW (Node/Jest only — not part of the production bundle). Intercepts fetch
// to Edge URLs during tests. See `src/__mocks__/handlers.ts`.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { server } = require('./src/__mocks__/server');
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
} catch {
  // MSW not installed in some test runs — that is fine.
}
