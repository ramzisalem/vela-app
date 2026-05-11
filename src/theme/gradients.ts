/**
 * Brand gradients (file 15). VelaPrimary is fixed at 135°.
 *
 * Obsidian & Copper edition: the gradient is a copper specular ramp
 * (light copper → signature copper → deep copper / bronze) — reads like
 * the bezel of a luxury watch. The light gradient is for light mode;
 * the dark gradient pushes the mid-stop deeper for OLED black.
 *
 * Use VelaPrimary ONLY for: hero score reveal, primary commercial CTAs
 * (welcome "Begin", paywall "Unlock"), the wordmark mask. Forbidden on:
 * card backgrounds, body text, sub-score dots, status colors, in-flow
 * navigation CTAs (those use the flat obsidian `Button variant="dark"`).
 *
 * Contrast: white text on the saturated mid copper stop (`#C77F4A`)
 * meets WCAG ~3.4:1 at >= 16pt SemiBold — acceptable for button labels.
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

/** Warm-paper radial wash for the score-reveal page background (light mode only). */
export const CreamWash = {
  light: ['#F1EBDE', '#F6F1E8', Palette.cream50] as const,
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
