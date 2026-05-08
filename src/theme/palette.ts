/**
 * Vela palette (raw colors). The ONLY file allowed to define hex literals.
 *
 * Lint rule: components must NOT import this directly outside src/theme/. Use
 * semantic tokens via `useColors()`. (file 15_DESIGN_SYSTEM.md)
 *
 * Locked visual identity — cream surfaces, espresso text (never `#000000`),
 * charcoal frame for camera UI (never `#000000`), VelaPrimary 135° gradient
 * used sparingly for primary actions only.
 */

// brand:allow

export const Palette = {
  // Cream / sand neutrals (light mode).
  cream50: '#FAF6EE', // page background — lightest cream
  cream100: '#F5EFE5', // alt surface card
  cream200: '#EAE0CC', // borders, dividers
  cream300: '#CABBA6', // muted strokes, decorative

  sand400: '#B0A088', // decorative accents
  sand500: '#8A7C6C', // secondary text on cream
  sand600: '#5D4F3E', // tertiary headings on cream

  espresso800: '#3D352B', // body text on cream, secondary surfaces
  espresso900: '#241F1A', // primary text, primary chrome
  charcoal950: '#16110D', // frame / camera viewfinder bg ONLY (never text)

  // Brand gradient stops + adjacent values.
  pink100: '#F5D4DD',
  pink300: '#E8B5C4', // VelaPrimary stop 1 (light) — dusty rose
  pink500: '#D89BAB', // VelaPrimary stop 1 (dark)
  mauve400: '#C8B5C8',
  mauve500: '#B098B8', // VelaPrimary stop 2 (light) — warm mauve bridge
  mauve600: '#9582A0', // VelaPrimary stop 2 (dark)
  blue200: '#A8C5DD',
  blue300: '#7AA6CB', // VelaPrimary stop 3 (light) — dusty blue
  blue400: '#5B8DB8', // VelaPrimary stop 3 (dark) + accent.default in light
  blue500: '#477194', // accent.pressed

  // Dark mode neutrals.
  cool800: '#1E2128',
  cool850: '#161920',
  cool900: '#0F1218',
  cool950: '#0A0C12',

  // Pure white (very limited use — gradient text, raised surface in light).
  white: '#FFFFFF',

  // Status (used as fills/icons; NEVER as long-form body text on cream).
  successLight: '#7AA682', // soft sage
  successDark: '#5D7A5F',
  warningLight: '#D4A661', // muted gold
  warningDark: '#8B6E2E',
  errorLight: '#D88B7E', // muted coral
  errorDark: '#7A4F45',

  // Sub-score identifiers (color is identifier-only, never sole indicator).
  skin: '#E8A598', // peach
  symmetry: '#B7C8DD', // light blue-gray
  definition: '#A8E8B0', // soft green
  vitality: '#D4C198', // warm sand
  grooming: '#C898E8', // soft lilac
} as const;

export type PaletteKey = keyof typeof Palette;
