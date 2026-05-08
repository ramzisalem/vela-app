/**
 * Brand gradients (file 15). VelaPrimary is fixed at 135°. The light gradient
 * is for light mode buttons; the dark gradient (deeper hues) is for dark mode
 * buttons.
 *
 * Use VelaPrimary ONLY for: primary CTAs, active toggles, done states, brand
 * accents (sparingly). Forbidden on: card backgrounds, body text, sub-score
 * dots, status colors.
 *
 * Note on contrast: white text on the soft VelaPrimary stops doesn't meet
 * strict WCAG 4.5:1 across the mauve middle. The brand-locked design accepts
 * 2.4:1+ on this single pairing as an editorial exception (button text only,
 * font-weight 500+ at >= 16pt). Verified via scripts/checkContrast.ts.
 */
import { Palette } from './palette';

export interface GradientStop {
  offset: number;
  color: string;
}

export interface ThemedGradient {
  light: { angle: 135; stops: ReadonlyArray<GradientStop> };
  dark?: { angle: 135; stops: ReadonlyArray<GradientStop> };
}

export const VelaPrimary: ThemedGradient = {
  light: {
    angle: 135,
    stops: [
      { offset: 0, color: Palette.pink300 },
      { offset: 0.5, color: Palette.mauve500 },
      { offset: 1, color: Palette.blue300 },
    ],
  },
  dark: {
    angle: 135,
    stops: [
      { offset: 0, color: Palette.pink500 },
      { offset: 0.5, color: Palette.mauve600 },
      { offset: 1, color: Palette.blue400 },
    ],
  },
};

/** Soft variant — same hues, lighter. Never use for buttons (washed out). */
export const VelaPrimarySoft: ThemedGradient = {
  light: {
    angle: 135,
    stops: [
      { offset: 0, color: Palette.pink100 },
      { offset: 0.5, color: Palette.mauve400 },
      { offset: 1, color: Palette.blue200 },
    ],
  },
};

/** Cream radial wash for the page background (light mode only). */
export const CreamWash = {
  light: ['#F1E8DA', '#F5EFE5', Palette.cream50] as const,
};

/** Helper for `expo-linear-gradient`. */
export function gradientStopsForMode(g: ThemedGradient, mode: 'light' | 'dark') {
  const variant = mode === 'dark' && g.dark ? g.dark : g.light;
  return {
    colors: variant.stops.map((s) => s.color) as unknown as readonly [string, string, string],
    locations: variant.stops.map((s) => s.offset) as unknown as readonly [number, number, number],
    start: { x: 0, y: 0 } as const,
    end: { x: 1, y: 1 } as const,
  };
}
