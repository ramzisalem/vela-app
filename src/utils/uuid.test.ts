/** Smoke-test the uuidv4 shim used by stores + scoring. */
import { uuidv4 } from './uuid';

describe('uuidv4', () => {
  test('returns an RFC-4122 v4 UUID', () => {
    const id = uuidv4();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  test('produces unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uuidv4()));
    expect(ids.size).toBe(100);
  });
});
