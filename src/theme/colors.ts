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
    primary: Palette.espresso900, // espresso, never `#000`
    secondary: Palette.sand500,
    tertiary: Palette.cream300,
    inverse: Palette.white,
    accent: Palette.blue400,
  },
  border: {
    default: Palette.cream200,
    subtle: 'rgba(202, 187, 166, 0.35)',
    strong: Palette.cream300,
    accent: Palette.blue400,
  },
  accent: {
    default: Palette.blue400,
    pressed: Palette.blue500,
    muted: Palette.blue200,
    background: 'rgba(91, 141, 184, 0.10)',
  },
  success: { default: Palette.successLight, background: 'rgba(122, 166, 130, 0.15)' },
  warning: { default: Palette.warningLight, background: 'rgba(212, 166, 97, 0.15)' },
  error: { default: Palette.errorLight, background: 'rgba(216, 139, 126, 0.15)' },
  score: { high: Palette.successLight, mid: Palette.warningLight, low: Palette.errorLight },
  subScore: {
    skin: Palette.skin,
    symmetry: Palette.symmetry,
    definition: Palette.definition,
    vitality: Palette.vitality,
    grooming: Palette.grooming,
  },
  overlay: {
    scrim: 'rgba(36, 31, 26, 0.5)',
    light: 'rgba(36, 31, 26, 0.05)',
    dark: 'rgba(36, 31, 26, 0.7)',
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
    primary: '#F5EFE5',
    secondary: '#A89C8C',
    tertiary: '#6B6256',
    inverse: Palette.espresso900,
    accent: Palette.blue300,
  },
  border: {
    default: 'rgba(245, 239, 229, 0.08)',
    subtle: 'rgba(245, 239, 229, 0.04)',
    strong: 'rgba(245, 239, 229, 0.16)',
    accent: Palette.blue300,
  },
  accent: {
    default: Palette.blue300,
    pressed: Palette.blue400,
    muted: Palette.cool800,
    background: 'rgba(122, 166, 203, 0.15)',
  },
  success: { default: Palette.successLight, background: 'rgba(122, 166, 130, 0.20)' },
  warning: { default: Palette.warningLight, background: 'rgba(212, 166, 97, 0.20)' },
  error: { default: Palette.errorLight, background: 'rgba(216, 139, 126, 0.20)' },
  score: { high: Palette.successLight, mid: Palette.warningLight, low: Palette.errorLight },
  subScore: {
    skin: Palette.skin,
    symmetry: Palette.symmetry,
    definition: Palette.definition,
    vitality: Palette.vitality,
    grooming: Palette.grooming,
  },
  overlay: {
    scrim: 'rgba(10, 12, 18, 0.6)',
    light: 'rgba(245, 239, 229, 0.06)',
    dark: 'rgba(10, 12, 18, 0.8)',
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
