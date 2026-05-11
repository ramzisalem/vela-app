/**
 * Semantic color tokens (file 15).
 *
 * `accent` is for INLINE accents (link color, focused input border). For
 * primary-action surfaces use the `<Button variant="primary">` component
 * which paints the VelaPrimary gradient — never paint a button with
 * `colors.accent.default`.
 */
import { Palette } from './palette';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
    inverse: string;
    /** Camera frame (charcoal in both modes — NEVER pure black). */
    camera: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    /** White on the gradient or on dark surfaces (light mode). */
    inverse: string;
    accent: string;
  };
  border: {
    default: string;
    subtle: string;
    strong: string;
    accent: string;
  };
  accent: {
    default: string;
    pressed: string;
    muted: string;
    background: string;
  };
  success: { default: string; background: string };
  warning: { default: string; background: string };
  error: { default: string; background: string };
  score: { high: string; mid: string; low: string };
  subScore: {
    skin: string;
    symmetry: string;
    definition: string;
    vitality: string;
    grooming: string;
  };
  overlay: { scrim: string; light: string; dark: string };
  /** Cards / sheets. */
  surface: {
    raised: string;
    pressed: string;
    /** For score-reveal cream radial wash composed via gradients.ts. */
    wash: string;
  };
}

export const lightColors: ThemeColors = {
  background: {
    primary: Palette.cream50,
    secondary: Palette.white,
    tertiary: Palette.cream100,
    muted: Palette.cream100,
    inverse: Palette.charcoal950,
    camera: Palette.charcoal950,
  },
  text: {
    /** True near-black with cool tilt — never `#000`, never warm-brown. */
    primary: Palette.espresso900,
    secondary: Palette.sand500,
    tertiary: Palette.cream300,
    inverse: Palette.white,
    accent: Palette.blue400, // copper
  },
  border: {
    default: Palette.cream200,
    /** Slightly bolder than the previous 0.35α — confident, not timid. */
    subtle: 'rgba(15, 15, 18, 0.08)',
    strong: 'rgba(15, 15, 18, 0.18)',
    accent: Palette.blue400, // copper
  },
  accent: {
    default: Palette.blue400, // ★ copper #C77F4A
    pressed: Palette.blue500, // copper pressed
    muted: Palette.blue200,
    /** Copper wash @ 10% — used for selected option fills. */
    background: 'rgba(199, 127, 74, 0.10)',
  },
  success: { default: Palette.successLight, background: 'rgba(60, 138, 107, 0.12)' },
  warning: { default: Palette.warningLight, background: 'rgba(201, 154, 78, 0.14)' },
  error: { default: Palette.errorLight, background: 'rgba(181, 86, 74, 0.14)' },
  score: { high: Palette.successLight, mid: Palette.warningLight, low: Palette.errorLight },
  subScore: {
    skin: Palette.skin,
    symmetry: Palette.symmetry,
    definition: Palette.definition,
    vitality: Palette.vitality,
    grooming: Palette.grooming,
  },
  overlay: {
    /** Obsidian scrim — replaces the warm espresso veil. */
    scrim: 'rgba(15, 15, 18, 0.5)',
    light: 'rgba(15, 15, 18, 0.05)',
    dark: 'rgba(15, 15, 18, 0.72)',
  },
  surface: {
    raised: Palette.white,
    pressed: Palette.cream100,
    wash: Palette.cream100,
  },
};

export const darkColors: ThemeColors = {
  background: {
    primary: Palette.cool900,
    secondary: Palette.cool850,
    tertiary: Palette.cool800,
    muted: Palette.cool800,
    inverse: Palette.cream50,
    camera: Palette.cool950,
  },
  text: {
    /** Canvas color inverted — warm paper on obsidian. */
    primary: Palette.cream50,
    secondary: '#8B8579',
    tertiary: '#5F5A52',
    inverse: Palette.espresso900,
    accent: Palette.pink300, // lighter copper on dark
  },
  border: {
    default: 'rgba(250, 248, 244, 0.10)',
    subtle: 'rgba(250, 248, 244, 0.06)',
    strong: 'rgba(250, 248, 244, 0.18)',
    accent: Palette.pink300, // lighter copper on dark
  },
  accent: {
    default: Palette.pink300, // light copper for OLED contrast
    pressed: Palette.mauve500, // signature copper
    muted: Palette.cool800,
    /** Copper wash @ 14% on obsidian — selected option fills. */
    background: 'rgba(224, 165, 114, 0.14)',
  },
  success: { default: Palette.successLight, background: 'rgba(60, 138, 107, 0.18)' },
  warning: { default: Palette.warningLight, background: 'rgba(201, 154, 78, 0.20)' },
  error: { default: Palette.errorLight, background: 'rgba(181, 86, 74, 0.20)' },
  score: { high: Palette.successLight, mid: Palette.warningLight, low: Palette.errorLight },
  subScore: {
    skin: Palette.skin,
    symmetry: Palette.symmetry,
    definition: Palette.definition,
    vitality: Palette.vitality,
    grooming: Palette.grooming,
  },
  overlay: {
    scrim: 'rgba(8, 8, 12, 0.65)',
    light: 'rgba(250, 248, 244, 0.06)',
    dark: 'rgba(8, 8, 12, 0.82)',
  },
  surface: {
    raised: Palette.cool850,
    pressed: Palette.cool800,
    wash: Palette.cool850,
  },
};

/**
 * Score color buckets. Color is identifier-only — never the sole signal.
 */
export function colorForScore(score: number, theme: ThemeColors): string {
  if (score >= 80) return theme.score.high;
  if (score >= 60) return theme.text.accent;
  if (score >= 40) return theme.score.mid;
  return theme.score.low;
}

export type SubScoreKey = keyof ThemeColors['subScore'];
export function colorForSubScore(key: SubScoreKey, theme: ThemeColors): string {
  return theme.subScore[key];
}
