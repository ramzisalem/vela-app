/**
 * Spacing, radii, and layout tokens (file 15).
 *
 * Spacing scale is multiples of 4. Tap targets are >= 44pt (file 23).
 */

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export type SpacingKey = keyof typeof Spacing;

export const Radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const Layout = {
  /** Min tap target. */
  tapTarget: 44,
  /** Default screen horizontal padding. */
  screenInset: 20,
  /** Hairline border width — thin and premium per file 15. */
  hairline: 0.5,
  /** Width of the cream radial wash on score reveal. */
  scoreWashRadius: 320,
} as const;
