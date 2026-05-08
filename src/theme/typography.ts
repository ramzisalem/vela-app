/**
 * Typography tokens (file 15).
 *
 * Rules:
 *   - Sentence case ALWAYS. No Title Case. No ALL CAPS beyond `label`.
 *   - Drop fontWeight `'700'` — use `'500'` instead.
 *   - Serif (`displaySerif`, `headlineSerif`, `sectionMarker`) only for editorial
 *     moments: welcome, paywall promise, score reveal, Morning/Evening section
 *     markers in routine.
 */
import { TextStyle, Platform, PixelRatio } from 'react-native';

export const FONT_SANS = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
}) as string;

export const FONT_SERIF = Platform.select({
  // iOS: New York is the system serif.
  ios: 'New York',
  // Android: fall back to system serif.
  android: 'serif',
  default: 'serif',
}) as string;

export const FONT_MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

const baseSans = (size: number, lineHeight: number, weight: TextStyle['fontWeight'] = '400') => ({
  fontFamily: FONT_SANS,
  fontSize: size,
  lineHeight,
  fontWeight: weight,
  letterSpacing: 0,
});

const baseSerif = (size: number, lineHeight: number, weight: TextStyle['fontWeight'] = '500') => ({
  fontFamily: FONT_SERIF,
  fontSize: size,
  lineHeight,
  fontWeight: weight,
  letterSpacing: 0,
});

export const Typography = {
  // Editorial / hero serif
  displaySerif: baseSerif(40, 46, '500'),
  headlineSerif: baseSerif(28, 34, '500'),
  /** Used for "Morning" / "Evening" markers in routine, etc. */
  sectionMarker: { ...baseSerif(15, 20, '500'), fontStyle: 'italic' as const },

  // Sans hierarchy
  title: baseSans(28, 34, '500'),
  headline: baseSans(22, 28, '500'),
  body: baseSans(16, 22, '400'),
  bodyEmphasis: baseSans(16, 22, '500'),
  caption: baseSans(13, 18, '400'),
  /** The ONLY token allowed to use uppercase letterSpacing treatment. */
  label: { ...baseSans(11, 14, '500'), letterSpacing: 0.6, textTransform: 'uppercase' as const },

  // Numeric (score reveal)
  scoreNumeric: baseSans(72, 76, '500'),
  scoreNumericSmall: baseSans(36, 40, '500'),
  mono: { fontFamily: FONT_MONO, fontSize: 13, lineHeight: 18 },
} as const satisfies Record<string, TextStyle>;

export type TypographyKey = keyof typeof Typography;

/**
 * Dynamic Type-aware sizing. Capped per file 28 to prevent score-display
 * layout breakage at very large accessibility sizes.
 */
export function scaledFontSize(base: number, max = 1.3): number {
  const scale = Math.min(PixelRatio.getFontScale(), max);
  return Math.round(base * scale);
}
