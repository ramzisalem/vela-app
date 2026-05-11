/**
 * UUID v4 helper.
 *
 * The `uuid` npm package v9+ requires `crypto.getRandomValues()`, which is
 * NOT provided by Hermes / React Native out of the box. Rather than wire
 * the `react-native-get-random-values` polyfill (extra native dep, has to
 * load before any code that uses `uuid`), we route through
 * `expo-crypto.randomUUID()` — already installed in this project and
 * implemented natively on iOS/Android with no global polyfill required.
 *
 * In unit tests (jest, node environment) `expo-crypto` resolves but its
 * native module isn't available; we fall back to a Math.random-based v4
 * generator. Tests don't need cryptographic strength, only uniqueness.
 */

let impl: (() => string) | null = null;

function fallback(): string {
  // RFC 4122 v4. Sufficient for tests.
  const bytes: number[] = [];
  for (let i = 0; i < 16; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variant 10xx
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

function resolve(): () => string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Crypto = require('expo-crypto') as { randomUUID?: () => string };
    if (typeof Crypto.randomUUID === 'function') {
      return () => Crypto.randomUUID!();
    }
  } catch {
    // expo-crypto not installed in this env (e.g. some jest setups).
  }
  return fallback;
}

export function uuidv4(): string {
  if (!impl) impl = resolve();
  return impl();
}
