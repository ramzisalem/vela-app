/**
 * Vela palette (raw colors). The ONLY file allowed to define hex literals.
 *
 * Lint rule: components must NOT import this directly outside src/theme/.
 * Use semantic tokens via `useColors()` (file 15_DESIGN_SYSTEM.md).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  Obsidian & Copper — Vela 2.0 brand reset
 * ─────────────────────────────────────────────────────────────────────────
 *  Signature: copper `#C77F4A` — the single owned hue. Used for accent,
 *  selection, score rings, the wordmark, and as the mid-stop of the
 *  VelaPrimary specular gradient.
 *
 *  Neutrals: warm paper `#FAF8F4` for the canvas, true near-black
 *  `#0F0F12` (subtle cool tilt) for ink. Replaces the previous brown
 *  cream/espresso pairing.
 *
 *  Sub-scores collapse to a single copper ramp at five tonal opacities so
 *  the dashboard reads as one designed system instead of five competing
 *  colors.
 *
 *  Legacy palette keys (`pink*`, `mauve*`, `blue*`) are intentionally
 *  preserved so existing imports keep compiling — they now resolve to the
 *  copper specular ramp instead of the old pink→mauve→blue.
 */

// brand:allow

export const Palette = {
  // ── Neutrals (light canvas + ink) ──────────────────────────────────
  /** Page background — warm paper white. */
  cream50: '#FAF8F4',
  /** Alt surface card (subtler than full white). */
  cream100: '#F2EEE7',
  /** Borders, dividers — light. */
  cream200: '#E7E1D7',
  /** Tertiary text on cream (warm neutral grey). */
  cream300: '#98927E',

  sand400: '#8C8576', // decorative
  sand500: '#5C5750', // secondary text on cream
  sand600: '#3D3934', // tertiary headings on cream

  espresso800: '#1F1F23', // body text on cream
  espresso900: '#0F0F12', // primary text + primary chrome (near-black, cool tilt)
  /** Camera viewfinder / frame — never `#000000`. */
  charcoal950: '#08080A',

  // ── Copper signature ramp ──────────────────────────────────────────
  // Legacy `pink*` / `mauve*` / `blue*` keys remap onto this single ramp.
  // VelaPrimary specular = pink300 → mauve500 → blue300 (light → mid → deep).

  /** Wash / soft tint behind copper elements. */
  pink100: '#F1E2D0',
  /** Copper light — VelaPrimary stop 1 (light mode). */
  pink300: '#E0A572',
  /** Copper light — VelaPrimary stop 1 (dark mode). */
  pink500: '#C9874E',

  /** Mid — used in VelaPrimarySoft and intermediate steps. */
  mauve400: '#D08F58',
  /** ★ SIGNATURE copper — VelaPrimary stop 2 (light). accent.default. */
  mauve500: '#C77F4A',
  /** Copper deep — VelaPrimary stop 2 (dark mode). */
  mauve600: '#A86631',

  /** Soft copper wash for muted accent surfaces. */
  blue200: '#A86E3F',
  /** Copper deep — VelaPrimary stop 3 (light). */
  blue300: '#8C5226',
  /** accent.default in light mode + VelaPrimary stop 3 (dark). */
  blue400: '#C77F4A',
  /** accent.pressed in light mode. */
  blue500: '#A86631',

  // ── Dark mode neutrals ─────────────────────────────────────────────
  cool800: '#1A1A1F',
  cool850: '#13131A',
  cool900: '#0E0E13',
  cool950: '#08080C',

  /** Pure white (very limited use — gradient text, raised surface in light). */
  white: '#FFFFFF',

  // ── Status (semantic — sit beside copper without clashing) ─────────
  successLight: '#3C8A6B', // restrained sage
  successDark: '#2C6850',
  warningLight: '#C99A4E', // muted gold — copper's cousin
  warningDark: '#8B6E2E',
  errorLight: '#B5564A', // muted coral, darker than before
  errorDark: '#7A3A33',

  // ── Sub-score identifiers ──────────────────────────────────────────
  // One material, five finishes — copper saturated → faded.
  // Color is still identifier-only; the opacity ramp gives clear hierarchy
  // without painting the dashboard in five competing hues.
  skin: '#C77F4A',       // 100% copper
  symmetry: '#D29466',   // ~80%
  definition: '#DCA98B', // ~60%
  vitality: '#E5BFA8',   // ~45%
  grooming: '#EFD5C5',   // ~30%
} as const;

export type PaletteKey = keyof typeof Palette;
