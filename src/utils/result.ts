/**
 * Tiny Result helper used across services to make
 * "did this AI/network call fall back?" first-class.
 */

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E; fallbackValue?: T };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E, fallbackValue?: never): Result<never, E> => ({
  ok: false,
  error,
  fallbackValue,
});
