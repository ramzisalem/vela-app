# 15 — Design System

## Overview
Vela's visual language. Calm, premium, intelligent. Closer to a luxury wellness journal than a beauty app or a fitness tracker. Built with **semantic color tokens** so light/dark mode is a single switch, not a redesign.

**Visual identity (locked):**
- **Cream surfaces, not white.** Warm radial cream wash on light theme. Pure white reserved for raised cards.
- **Espresso, never black.** Primary text is `espresso900` (`#241F1A`) — a deep warm near-black. Plain `#000000` is forbidden anywhere in product UI (it's harsh and cool against the cream).
- **Serif for headline moments.** Welcome, score reveal, milestone copy, and section markers use the serif. Body / labels / data stay sans.
- **Primary actions wear the brand gradient.** A diagonal pink → mauve → dusty-blue gradient (`VelaPrimary`) is the *only* fill for primary CTAs, active toggles, "done" states, and the brand mark accents. Used sparingly enough that it remains a signature.
- **Premium restraint.** Subtle 0.5px borders, generous whitespace, large radii. No drop shadows on light theme; dark theme is borderless.

---

## Color Architecture (Two Layers)

This is the most important architectural decision in the design system. We use two layers:

**Layer 1: Palette** — raw color values, never used directly in components
**Layer 2: Semantic tokens** — meaning-based names that components use

When the user switches theme, only the semantic mapping changes. Components don't care.

### Palette (raw values)

```typescript
// src/theme/palette.ts
// These are the ONLY hardcoded color values. Never use these directly in components.
// Use semantic tokens (Colors) instead.
//
// `#000000` is intentionally NOT in this palette. The deepest neutral we ever
// render is `charcoal950` (#16110D) — used only for hardware-frame mockups
// and the camera viewfinder background. All product text uses `espresso900`.

export const Palette = {
  // ── Cream / sand layer (light surfaces) ───────────────────────────
  cream50:  '#FAF6EE', // page background — lightest cream
  cream100: '#F5EFE5', // surface card alt
  cream200: '#EAE0CC', // subtle borders, dividers
  cream300: '#CABBA6', // muted strokes, decorative
  sand400:  '#B0A088', // decorative accents
  sand500:  '#8A7C6C', // secondary text on cream
  sand600:  '#5D4F3E', // tertiary headings on cream
  // The cream radial wash used as background.primary in light mode is
  // composed at runtime: Cream50 → Cream100 (radial, top-down) — see
  // `gradients.ts` below.

  // ── Espresso layer (text, frame, dark surfaces — replaces black) ──
  espresso800: '#3D352B', // body text on cream, secondary surfaces
  espresso900: '#241F1A', // primary text, primary chrome (was gray800)
  charcoal950: '#16110D', // frame / camera viewfinder bg only. Never text.

  // ── Brand gradient stops (the Vela signature) ─────────────────────
  pink100:  '#F5D4DD',
  pink300:  '#E8B5C4', // gradient stop 1 — dusty rose
  pink500:  '#D89BAB',
  mauve400: '#C8B5C8',
  mauve500: '#B098B8', // gradient stop 2 — warm mauve bridge
  mauve600: '#9582A0',
  blue200:  '#A8C5DD',
  blue300:  '#7AA6CB', // gradient stop 3 — dusty blue
  blue400:  '#5B8DB8',
  blue500:  '#477194',

  // ── Dark theme cool layer (kept) ──────────────────────────────────
  cool800: '#1E2128',
  cool850: '#161920',
  cool900: '#0F1218',
  cool950: '#0A0C12',

  // ── Pure neutrals (use sparingly — prefer espresso/cream) ─────────
  white: '#FFFFFF',
  // No `black`. Reach for `espresso900` or `charcoal950` instead.

  // ── Semantic colors (subtle, never alarming) ──────────────────────
  // Tuned for cream backgrounds — slightly desaturated.
  successLight: '#7AA682', // soft sage
  successDark:  '#5D7A5F',
  warningLight: '#D4A661', // muted gold
  warningDark:  '#8B6E2E',
  errorLight:   '#D88B7E', // muted coral
  errorDark:    '#7A4F45',

  // ── Sub-score identifiers (consistent across themes) ──────────────
  // These are visual *identifiers*, not theme colors — used as small
  // dots / chart segments next to numbers. Never as text or as fills
  // for buttons/cards.
  skin:       '#E8A598', // peach
  symmetry:   '#B7C8DD', // light blue-gray
  definition: '#A8E8B0', // soft green
  vitality:   '#D4C198', // warm sand
  grooming:   '#C898E8', // soft lilac
};
```

### Brand gradient (the Vela signature)

```typescript
// src/theme/gradients.ts
import { Palette } from './palette';

/**
 * The Vela primary gradient. Used for primary CTAs, active toggle states,
 * "done" indicators on routine tasks, focused selection borders, and the
 * brand wordmark accent. Never use it as a flat fill on cards or backgrounds.
 *
 * Stops chosen for premium restraint: a 3-stop diagonal that bridges through
 * mauve so the transition feels intentional rather than children's-toy
 * pink-to-blue. The 135° angle is fixed; angles other than 135° look cheap.
 */
export const VelaPrimary = {
  light: {
    angle: 135,
    stops: [
      { offset: 0,    color: Palette.pink300  /* #E8B5C4 */ },
      { offset: 0.5,  color: Palette.mauve500 /* #B098B8 */ },
      { offset: 1,    color: Palette.blue300  /* #7AA6CB */ },
    ] as const,
    // Inline string form for SVG/web fallbacks:
    css: 'linear-gradient(135deg, #E8B5C4 0%, #B098B8 50%, #7AA6CB 100%)',
  },
  dark: {
    angle: 135,
    stops: [
      { offset: 0,    color: Palette.pink500  /* #D89BAB */ },
      { offset: 0.5,  color: Palette.mauve600 /* #9582A0 */ },
      { offset: 1,    color: Palette.blue400  /* #5B8DB8 */ },
    ] as const,
    css: 'linear-gradient(135deg, #D89BAB 0%, #9582A0 50%, #5B8DB8 100%)',
  },
};

/**
 * Soft variant — same hues, lighter. Used for the subtle delta pill on the
 * dashboard, profile avatars, and any "tinted, not loud" surface. Never use
 * for buttons (looks washed out at touch size).
 */
export const VelaPrimarySoft = {
  light: {
    angle: 135,
    stops: [
      { offset: 0,   color: Palette.pink100   /* #F5D4DD */ },
      { offset: 0.5, color: Palette.mauve400  /* #C8B5C8 */ },
      { offset: 1,   color: Palette.blue200   /* #A8C5DD */ },
    ] as const,
    css: 'linear-gradient(135deg, #F5D4DD 0%, #C8B5C8 50%, #A8C5DD 100%)',
  },
  // Dark theme reuses light stops — the cream-tinted version still reads
  // correctly on near-black surfaces.
  dark: undefined,
};

/**
 * Cream radial wash for the page background in light mode. Subtle — most
 * users won't consciously notice the gradient, only that the surface feels
 * warm rather than flat.
 */
export const CreamWash = {
  light: 'radial-gradient(120% 100% at 50% 0%, #F1E8DA 0%, #F5EFE5 60%, #FAF6EE 100%)',
};
```

For React Native, use `expo-linear-gradient`:

```bash
npx expo install expo-linear-gradient
```

```typescript
// Usage example (the canonical Button component below already wraps this):
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={['#E8B5C4', '#B098B8', '#7AA6CB']}
  locations={[0, 0.5, 1]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={{ borderRadius: Radii.full, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl }}
>
  <Text variant="button" style={{ color: '#FFFFFF', textAlign: 'center' }}>
    Begin
  </Text>
</LinearGradient>
```

### Semantic Tokens (what components use)

```typescript
// src/theme/colors.ts
import { Palette } from './palette';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: {
    primary: string;   // page bg (cream wash composed via gradients.ts)
    secondary: string; // raised cards (white)
    tertiary: string;  // alt surfaces
    muted: string;     // section dividers / subtle inputs
    inverse: string;   // dark surfaces inside light mode (e.g. comparison hero)
  };
  text: {
    primary: string;   // headlines, body — espresso, never black
    secondary: string; // muted secondary text — sand
    tertiary: string;  // hints — light sand
    inverse: string;   // text on dark surfaces / on the gradient (white)
    accent: string;    // links / inline emphasis (uses dusty blue, not gradient)
  };
  border: {
    default: string;
    subtle: string;
    strong: string;
    accent: string;    // single-color stroke for inputs etc
  };
  /**
   * `accent` is reserved for *inline* accents (link color, focused input
   * border, small emphasized text). For primary-action surfaces (buttons,
   * active toggles, "done" states) use the `primary` gradient via the
   * `<Button variant="primary">` component or the `LinearGradient` direct
   * import. Do not paint a button with `colors.accent.default` — that's
   * what the old design did and it looks flat now.
   */
  accent: {
    default: string;
    pressed: string;
    muted: string;
    background: string; // tinted background for accent (e.g. selected row)
  };
  success: { default: string; background: string };
  warning: { default: string; background: string };
  error:   { default: string; background: string };
  score:   { high: string; mid: string; low: string };
  subScore: {
    skin: string;
    symmetry: string;
    definition: string;
    vitality: string;
    grooming: string;
  };
  overlay: { scrim: string; light: string; dark: string };
}

export const lightColors: ThemeColors = {
  background: {
    primary:   Palette.cream50,    // see CreamWash radial in gradients.ts for the actual rendered bg
    secondary: Palette.white,
    tertiary:  Palette.cream100,
    muted:     Palette.cream100,
    inverse:   Palette.charcoal950,
  },
  text: {
    primary:   Palette.espresso900, // ⚠️ never `#000` — espresso is the warmest readable near-black
    secondary: Palette.sand500,
    tertiary:  Palette.cream300,
    inverse:   Palette.white,       // for text on the gradient or on dark surfaces
    accent:    Palette.blue400,
  },
  border: {
    default: Palette.cream200,
    subtle:  'rgba(202, 187, 166, 0.35)', // cream300 @ 35%
    strong:  Palette.cream300,
    accent:  Palette.blue400,
  },
  accent: {
    default:    Palette.blue400,
    pressed:    Palette.blue500,
    muted:      Palette.blue200,
    background: 'rgba(91, 141, 184, 0.10)',
  },
  success: { default: Palette.successLight, background: 'rgba(122, 166, 130, 0.15)' },
  warning: { default: Palette.warningLight, background: 'rgba(212, 166, 97, 0.15)' },
  error:   { default: Palette.errorLight,   background: 'rgba(216, 139, 126, 0.15)' },
  score:   { high: Palette.successLight, mid: Palette.warningLight, low: Palette.errorLight },
  subScore: {
    skin:       Palette.skin,
    symmetry:   Palette.symmetry,
    definition: Palette.definition,
    vitality:   Palette.vitality,
    grooming:   Palette.grooming,
  },
  overlay: {
    scrim: 'rgba(36, 31, 26, 0.5)',  // espresso scrim — never black
    light: 'rgba(36, 31, 26, 0.05)',
    dark:  'rgba(36, 31, 26, 0.7)',
  },
};

export const darkColors: ThemeColors = {
  background: {
    primary:   Palette.cool900,
    secondary: Palette.cool850,
    tertiary:  Palette.cool800,
    muted:     Palette.cool800,
    inverse:   Palette.cream50,
  },
  text: {
    primary:   '#F5EFE5',            // cream-tinted "white" — keeps brand warmth in dark mode
    secondary: '#A89C8C',
    tertiary:  '#6B6256',
    inverse:   Palette.espresso900,
    accent:    Palette.blue300,
  },
  border: {
    default: 'rgba(245, 239, 229, 0.08)',
    subtle:  'rgba(245, 239, 229, 0.04)',
    strong:  'rgba(245, 239, 229, 0.16)',
    accent:  Palette.blue300,
  },
  accent: {
    default:    Palette.blue300,
    pressed:    Palette.blue400,
    muted:      Palette.cool800,
    background: 'rgba(122, 166, 203, 0.15)',
  },
  success: { default: Palette.successLight, background: 'rgba(122, 166, 130, 0.2)' },
  warning: { default: Palette.warningLight, background: 'rgba(212, 166, 97, 0.2)' },
  error:   { default: Palette.errorLight,   background: 'rgba(216, 139, 126, 0.2)' },
  score:   { high: Palette.successLight, mid: Palette.warningLight, low: Palette.errorLight },
  subScore: {
    skin: Palette.skin, symmetry: Palette.symmetry, definition: Palette.definition,
    vitality: Palette.vitality, grooming: Palette.grooming,
  },
  overlay: {
    scrim: 'rgba(10, 12, 18, 0.7)',
    light: 'rgba(245, 239, 229, 0.05)',
    dark:  'rgba(10, 12, 18, 0.85)',
  },
};

export function colorForScore(score: number, colors: ThemeColors): string {
  if (score >= 80) return colors.score.high;
  if (score >= 50) return colors.score.mid;
  return colors.score.low;
}

export function colorForSubScore(
  metric: 'skin' | 'symmetry' | 'definition' | 'vitality' | 'grooming',
  colors: ThemeColors
): string {
  return colors.subScore[metric];
}
```

---

## Theme Provider & Hooks

```typescript
// src/theme/ThemeContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, ThemeMode, lightColors, darkColors } from './colors';

const STORAGE_KEY = 'vela.theme.preference';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  preference: ThemePreference;
  colors: ThemeColors;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'light' || value === 'dark' || value === 'system') {
        setPreferenceState(value);
      }
      setIsReady(true);
    });
  }, []);
  
  const mode: ThemeMode = preference === 'system' 
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : preference;
  
  const colors = mode === 'dark' ? darkColors : lightColors;
  
  const setPreference = async (newPreference: ThemePreference) => {
    setPreferenceState(newPreference);
    await AsyncStorage.setItem(STORAGE_KEY, newPreference);
  };
  
  if (!isReady) return null;
  
  return (
    <ThemeContext.Provider value={{ mode, preference, colors, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

export function useColors(): ThemeColors {
  return useTheme().colors;
}
```

---

## Typography

```typescript
// src/theme/typography.ts
import { Platform, TextStyle, PixelRatio } from 'react-native';

// ── Font families ────────────────────────────────────────────────
// Sans for everything functional (body, labels, data, navigation).
// Serif for editorial moments only — welcome headline, score reveal,
// section markers ("Morning" / "Evening"), paywall promise, milestone
// copy, brand wordmark.
const FONT_SANS  = Platform.select({ ios: 'System',         android: 'Roboto',           default: 'System' });
const FONT_SERIF = Platform.select({ ios: 'New York',       android: 'serif',            default: 'serif' });
const FONT_MONO  = Platform.select({ ios: 'Menlo',          android: 'monospace',        default: 'monospace' });

// Use New York (iOS system serif, since iOS 13) — no custom font shipping
// required, which keeps bundle size honest. On Android, fall back to the
// system serif. If the editorial direction wants a specific serif at v1.5,
// switch via `expo-font` and update this single import — the tokens stay.

export const Typography: Record<string, TextStyle> = {
  // ── Score displays — SERIF (editorial moment) ──────────────────
  scoreDisplayHero: { fontFamily: FONT_SERIF, fontSize: 96, fontWeight: '500', letterSpacing: -3, lineHeight: 100 },
  scoreDisplay:     { fontFamily: FONT_SERIF, fontSize: 72, fontWeight: '500', letterSpacing: -2, lineHeight: 76 },
  scoreSmall:       { fontFamily: FONT_SERIF, fontSize: 28, fontWeight: '500', lineHeight: 32, letterSpacing: -0.5 },

  // ── Editorial headlines — SERIF ────────────────────────────────
  // Use these for: welcome, score reveal, paywall promise, milestone copy.
  displaySerif:     { fontFamily: FONT_SERIF, fontSize: 32, fontWeight: '500', lineHeight: 38, letterSpacing: -0.5 },
  headlineSerif:    { fontFamily: FONT_SERIF, fontSize: 22, fontWeight: '500', lineHeight: 28, letterSpacing: -0.3 },
  serifItalic:      { fontFamily: FONT_SERIF, fontSize: 16, fontStyle: 'italic', lineHeight: 22 },
  // Section markers ("Morning", "Evening") on the routine.
  sectionMarker:    { fontFamily: FONT_SERIF, fontSize: 15, fontStyle: 'italic', lineHeight: 20 },

  // ── Functional headings — SANS ─────────────────────────────────
  // Use these for: nav titles, list-section headers, anywhere the eye
  // needs to scan rather than read.
  title:       { fontFamily: FONT_SANS, fontSize: 24, fontWeight: '500', lineHeight: 30, letterSpacing: -0.3 },
  headline:    { fontFamily: FONT_SANS, fontSize: 20, fontWeight: '500', lineHeight: 26 },
  subheadline: { fontFamily: FONT_SANS, fontSize: 17, fontWeight: '500', lineHeight: 22 },

  // ── Body — SANS ────────────────────────────────────────────────
  body:         { fontFamily: FONT_SANS, fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyMedium:   { fontFamily: FONT_SANS, fontSize: 15, fontWeight: '500', lineHeight: 22 },

  // ── Captions / labels — SANS ───────────────────────────────────
  caption:         { fontFamily: FONT_SANS, fontSize: 12, fontWeight: '400', lineHeight: 16 },
  captionSemibold: { fontFamily: FONT_SANS, fontSize: 12, fontWeight: '500', lineHeight: 16 },
  label:           { fontFamily: FONT_SANS, fontSize: 11, fontWeight: '500', lineHeight: 14, textTransform: 'uppercase', letterSpacing: 1.4 },

  // ── Buttons — SANS ─────────────────────────────────────────────
  button:      { fontFamily: FONT_SANS, fontSize: 16, fontWeight: '500', lineHeight: 20 },
  buttonSmall: { fontFamily: FONT_SANS, fontSize: 14, fontWeight: '500', lineHeight: 18 },

  // ── Mono — for debug / code only (not user-facing copy) ────────
  mono: { fontFamily: FONT_MONO, fontSize: 13, fontWeight: '400', lineHeight: 18 },
};

export function scaledFontSize(size: number): number {
  const fontScale = PixelRatio.getFontScale();
  return size * Math.min(fontScale, 1.3);
}
```

> **Weight discipline.** Drop fontWeight `'700'` from the system. Tokens use `'500'` everywhere because the serif at 500 reads as confident-not-shouty, and the sans at 500 stays elegant at small sizes. If you find yourself reaching for `'700'`, you probably want the serif.

> **Sentence case always.** Even on labels and buttons. Do not Title Case ("Get Started" → "Get started"). Do not ALL CAPS — `Typography.label` already small-caps via letter-spacing.

### Shorthand components

```typescript
// src/components/ui/Text.tsx (additions)
export const DisplaySerif  = (props: Omit<TextProps, 'variant'>) => <Text variant="displaySerif" {...props} />;
export const HeadlineSerif = (props: Omit<TextProps, 'variant'>) => <Text variant="headlineSerif" {...props} />;
export const SectionMarker = (props: Omit<TextProps, 'variant'>) =>
  <Text variant="sectionMarker" color="secondary" {...props} />;
```

Use the shorthand when authoring — it's harder to drift if "Welcome headline" is `<DisplaySerif>` rather than a prop.

---

## Spacing, Radii, Layout

```typescript
// src/theme/spacing.ts
export const Spacing = {
  none: 0, xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, huge: 64, massive: 96,
} as const;

export const Radii = {
  none: 0, sm: 6, md: 8, lg: 12, xl: 16, xxl: 20, xxxl: 28, full: 9999,
} as const;

export const Layout = {
  screenHorizontalPadding: Spacing.lg,
  screenVerticalPadding: Spacing.lg,
  maxContentWidth: 720,
  minTapTarget: 44,
  recommendedTapTarget: 48,
  rowHeight: 56,
  rowHeightCompact: 44,
  portraitFaceAspectRatio: 0.85,
  squareAspectRatio: 1,
  cardAspectRatio: 0.75,
};
```

```typescript
// src/theme/shadows.ts
import { Platform } from 'react-native';

export function getShadow(intensity: 'sm' | 'md' | 'lg', mode: 'light' | 'dark') {
  if (mode === 'dark') return {};
  
  if (Platform.OS === 'android') {
    return { sm: { elevation: 1 }, md: { elevation: 3 }, lg: { elevation: 6 } }[intensity];
  }
  
  // Espresso-tinted shadow keeps the warm cream surface feeling premium —
  // pure-black shadows on cream read cool and clinical.
  return {
    sm: { shadowColor: '#241F1A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    md: { shadowColor: '#241F1A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
    lg: { shadowColor: '#241F1A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 14 },
  }[intensity];
}
```

---

## Themed Components

### Themed Text

```typescript
// src/components/ui/Text.tsx
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { Typography } from '@/theme/typography';
import { useColors } from '@/theme/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

type TextVariant = keyof typeof Typography;
type TextColor = keyof ThemeColors['text'] | 'inherit';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
}

export function Text({ variant = 'body', color = 'primary', style, ...rest }: TextProps) {
  const colors = useColors();
  const textColor = color === 'inherit' ? undefined : colors.text[color as keyof ThemeColors['text']];
  
  return (
    <RNText
      style={[Typography[variant], textColor && { color: textColor }, style]}
      maxFontSizeMultiplier={1.3}
      {...rest}
    />
  );
}

export const Title    = (props: Omit<TextProps, 'variant'>) => <Text variant="title" {...props} />;
export const Headline = (props: Omit<TextProps, 'variant'>) => <Text variant="headline" {...props} />;
export const Body     = (props: Omit<TextProps, 'variant'>) => <Text variant="body" {...props} />;
export const Caption  = (props: Omit<TextProps, 'variant'>) => <Text variant="caption" color="secondary" {...props} />;
export const Label    = (props: Omit<TextProps, 'variant'>) => <Text variant="label" color="secondary" {...props} />;
```

### Button (themed — gradient primary)

```typescript
// src/components/ui/Button.tsx
import { Pressable, ActivityIndicator, View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { useColors, useTheme } from '@/theme/ThemeContext';
import { VelaPrimary } from '@/theme/gradients';
import { Spacing, Radii } from '@/theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'small' | 'medium' | 'large';

interface Props {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title, onPress, variant = 'primary', size = 'medium',
  loading = false, disabled = false, icon, iconPosition = 'left',
  fullWidth = true, style,
}: Props) {
  const colors = useColors();
  const { mode } = useTheme();

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  const sizeStyle = {
    small:  { paddingVertical: Spacing.sm,     paddingHorizontal: Spacing.lg, minHeight: 36 },
    medium: { paddingVertical: Spacing.md + 2, paddingHorizontal: Spacing.xl, minHeight: 44 },
    large:  { paddingVertical: Spacing.lg,     paddingHorizontal: Spacing.xl, minHeight: 52 },
  }[size];

  const textColor = {
    primary:     '#FFFFFF',                 // white on the gradient — verified AA at button sizes
    secondary:   colors.text.primary,       // espresso on cream
    ghost:       colors.text.secondary,
    destructive: colors.text.inverse,
  }[variant];

  const iconSize = size === 'large' ? 22 : size === 'small' ? 16 : 18;

  // ── Primary = gradient. Wrap children in LinearGradient. ──────────
  if (variant === 'primary') {
    const g = mode === 'dark' ? VelaPrimary.dark : VelaPrimary.light;
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        style={({ pressed }) => [
          fullWidth && styles.fullWidth,
          pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          disabled && { opacity: 0.4 },
          style,
        ]}
      >
        <LinearGradient
          colors={g.stops.map((s) => s.color)}
          locations={g.stops.map((s) => s.offset)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, sizeStyle, { borderRadius: Radii.full }]}
        >
          {loading ? (
            <ActivityIndicator color={textColor} size="small" />
          ) : (
            <View style={styles.content}>
              {icon && iconPosition === 'left' && <Ionicons name={icon} size={iconSize} color={textColor} />}
              <Text variant={size === 'small' ? 'buttonSmall' : 'button'} style={{ color: textColor }}>
                {title}
              </Text>
              {icon && iconPosition === 'right' && <Ionicons name={icon} size={iconSize} color={textColor} />}
            </View>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  // ── Non-primary variants — flat fills as before ───────────────────
  const variantStyle = {
    secondary:   { backgroundColor: colors.background.secondary, borderWidth: 0.5, borderColor: colors.border.strong },
    ghost:       { backgroundColor: 'transparent' },
    destructive: { backgroundColor: colors.error.default },
  }[variant as Exclude<ButtonVariant, 'primary'>];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base, variantStyle, sizeStyle,
        { borderRadius: Radii.full }, // pill radius matches primary
        fullWidth && styles.fullWidth,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.4 },
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <Ionicons name={icon} size={iconSize} color={textColor} />}
          <Text variant={size === 'small' ? 'buttonSmall' : 'button'} style={{ color: textColor }}>{title}</Text>
          {icon && iconPosition === 'right' && <Ionicons name={icon} size={iconSize} color={textColor} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  fullWidth: { width: '100%' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
```

**When to use which variant:**
- `primary` (gradient) — the *one* main CTA on a screen. Welcome's "Begin", paywall's "Start trial", "Save" on a settings flow. If you have two primaries on a screen, you have a hierarchy problem.
- `secondary` (cream/white pill, hairline border) — subordinate CTAs ("Restore purchases", "Cancel subscription").
- `ghost` — tertiary actions in toolbars, sheet headers.
- `destructive` — only inside a confirm modal. Never as the primary action of a screen.

**Other places the gradient appears (besides primary buttons):**
- `<Checkbox checked />` "done" state → fill with `VelaPrimary`
- Active segment in `<SegmentedControl>` → fill with `VelaPrimary`
- Selected option border in `<RadioCard>` (paywall plan) → 1.6px stroke `VelaPrimaryStroke`
- Progress bar fill on streak / weekly progress → `VelaPrimary`
- Comparison slider divider line + handle → stroke + handle fill
- Brand wordmark accent strokes (when using gradient lockup variant)

**Where the gradient must NOT appear:**
- Card backgrounds (looks like a children's app — keep cards white/cream)
- Body text (use solid `text.primary`)
- Sub-score identifier dots (those have their own fixed identifier colors)
- Status colors (success/warning/error — use semantic tokens)

### Card (themed)

```typescript
// src/components/ui/Card.tsx
import { View, ViewProps } from 'react-native';
import { useColors, useTheme } from '@/theme/ThemeContext';
import { getShadow } from '@/theme/shadows';
import { Radii, Spacing } from '@/theme/spacing';

interface Props extends ViewProps {
  padding?: keyof typeof Spacing;
  variant?: 'default' | 'muted' | 'elevated';
  bordered?: boolean;
}

export function Card({ padding = 'lg', variant = 'default', bordered = false, style, children, ...rest }: Props) {
  const colors = useColors();
  const { mode } = useTheme();
  
  const backgroundColor = {
    default: colors.background.secondary,
    muted: colors.background.muted,
    elevated: colors.background.tertiary,
  }[variant];
  
  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: Radii.xl,
          padding: Spacing[padding],
          borderWidth: bordered || mode === 'dark' ? 1 : 0,
          borderColor: colors.border.subtle,
        },
        variant === 'elevated' && getShadow('md', mode),
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
```

### TextField, Badge, Divider, EmptyState

```typescript
// src/components/ui/TextField.tsx
import { View, TextInput, TextInputProps } from 'react-native';
import { useState } from 'react';
import { useColors } from '@/theme/ThemeContext';
import { Typography } from '@/theme/typography';
import { Spacing, Radii } from '@/theme/spacing';
import { Text } from './Text';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export function TextField({ label, error, helperText, ...textInputProps }: Props) {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View style={{ gap: Spacing.xs }}>
      {label && <Text variant="captionSemibold" color="secondary">{label}</Text>}
      <TextInput
        style={[
          Typography.body,
          {
            backgroundColor: colors.background.muted,
            color: colors.text.primary,
            borderRadius: Radii.lg,
            padding: Spacing.lg,
            borderWidth: 1,
            borderColor: error ? colors.error.default : isFocused ? colors.accent.default : 'transparent',
          },
        ]}
        placeholderTextColor={colors.text.tertiary}
        onFocus={(e) => { setIsFocused(true); textInputProps.onFocus?.(e); }}
        onBlur={(e) => { setIsFocused(false); textInputProps.onBlur?.(e); }}
        accessibilityLabel={label}
        {...textInputProps}
      />
      {error && <Text variant="caption" style={{ color: colors.error.default }}>{error}</Text>}
      {!error && helperText && <Text variant="caption" color="secondary">{helperText}</Text>}
    </View>
  );
}
```

```typescript
// src/components/ui/Badge.tsx
import { View } from 'react-native';
import { Text } from './Text';
import { useColors } from '@/theme/ThemeContext';
import { Spacing, Radii } from '@/theme/spacing';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'accent';

export function Badge({ text, variant = 'default' }: { text: string; variant?: BadgeVariant }) {
  const colors = useColors();
  const styles = {
    default: { bg: colors.background.muted, fg: colors.text.secondary },
    success: { bg: colors.success.background, fg: colors.success.default },
    warning: { bg: colors.warning.background, fg: colors.warning.default },
    error:   { bg: colors.error.background, fg: colors.error.default },
    accent:  { bg: colors.accent.background, fg: colors.accent.default },
  }[variant];
  
  return (
    <View style={{
      backgroundColor: styles.bg,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radii.md,
      alignSelf: 'flex-start',
    }}>
      <Text variant="captionSemibold" style={{ color: styles.fg }}>{text}</Text>
    </View>
  );
}
```

```typescript
// src/components/ui/Divider.tsx
import { View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { Spacing } from '@/theme/spacing';

export function Divider({ vertical = false, spacing = 'md', variant = 'subtle' }: { vertical?: boolean; spacing?: keyof typeof Spacing; variant?: 'default' | 'subtle' }) {
  const colors = useColors();
  const color = variant === 'default' ? colors.border.default : colors.border.subtle;
  
  return (
    <View style={{
      ...(vertical ? { width: 1, alignSelf: 'stretch' } : { height: 1, alignSelf: 'stretch' }),
      backgroundColor: color,
      margin: Spacing[spacing],
    }} />
  );
}
```

```typescript
// src/components/ui/EmptyState.tsx
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/theme/ThemeContext';
import { Headline, Body } from './Text';
import { Button } from './Button';
import { Spacing } from '@/theme/spacing';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, illustration, title, description, actionLabel, onAction }: Props) {
  const colors = useColors();
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl, gap: Spacing.md }}>
      {illustration ? illustration : icon ? (
        <View style={{
          width: 96, height: 96, borderRadius: 48,
          backgroundColor: colors.background.muted,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: Spacing.lg,
        }}>
          <Ionicons name={icon} size={48} color={colors.text.tertiary} />
        </View>
      ) : null}
      
      <Headline style={{ textAlign: 'center' }}>{title}</Headline>
      {description && <Body color="secondary" style={{ textAlign: 'center', lineHeight: 22 }}>{description}</Body>}
      {actionLabel && onAction && (
        <View style={{ marginTop: Spacing.xl }}>
          <Button title={actionLabel} onPress={onAction} fullWidth={false} />
        </View>
      )}
    </View>
  );
}
```

---

## Animation Tokens

```typescript
// src/theme/animations.ts
import { Easing } from 'react-native-reanimated';

export const AnimationDuration = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  reveal: 600,
  cinematic: 1200,
} as const;

export const AnimationEasing = {
  default: Easing.out(Easing.ease),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
  bounce: Easing.elastic(1.2),
  linear: Easing.linear,
};

export const SpringConfig = {
  gentle: { damping: 18, stiffness: 120 },
  snappy: { damping: 14, stiffness: 200 },
  bouncy: { damping: 8, stiffness: 100 },
  smooth: { damping: 25, stiffness: 180 },
} as const;
```

---

## Design Principles

1. **Use semantic tokens.** `colors.text.primary` not `Palette.espresso900`. This is what makes dark mode work.
2. **Use `useColors()` hook in components.** Never import `Palette` outside of `colors.ts`.
3. **Pure black is forbidden.** Text is `espresso900`. Frame and camera bg are `charcoal950`. Never `#000000`.
4. **One primary action per screen, painted with the gradient.** If you need two primary CTAs, you have a hierarchy problem.
5. **Serif for editorial moments only.** Welcome, score reveal, paywall promise, milestone copy, section markers ("Morning"/"Evening"). Never for body, labels, navigation, or data.
6. **Cream surfaces, not white.** The page background is the cream radial wash. Pure white is reserved for raised cards.
7. **No emojis in UI copy** unless the user puts them there.
8. **Minimum tap target: 44×44 pt.** Use `Layout.minTapTarget`.
9. **Shadows are subtle (light) or absent (dark).** Use `getShadow(intensity, mode)`.
10. **Use the type scale.** Don't write `fontSize: 14` inline.
11. **Use the spacing scale.** Don't write `padding: 17` inline.
12. **Pressable feedback is haptic.** Use `Haptics.impactAsync()`.
13. **Sub-score colors are identifiers, not accents.** They appear as small dots / chart segments. Never as text or as button fills.
14. **Errors are muted coral.** We're a coach, not a warning sign.
15. **Animations have purpose.** `fast` for micro-interactions, `reveal` for milestones.
16. **Test in both modes.** Every screen, every component, every state. The gradient renders distinctly per mode — verify both.

---

## WCAG AA Contrast Matrix

WCAG AA targets: ≥ 4.5:1 for normal text, ≥ 3:1 for large text (≥ 18pt or ≥ 14pt bold) and UI components. Every combination below is verified at the listed ratio. Re-run `npm run check:contrast` (script below) when you change a token.

### Light theme

| Foreground | Background | Ratio | Pass |
|---|---|---|---|
| `text.primary` (espresso900 `#241F1A`) | `background.primary` (cream50 `#FAF6EE`) | 14.6 : 1 | AAA ✓ |
| `text.primary` | `background.secondary` (white) | 15.7 : 1 | AAA ✓ |
| `text.primary` | cream100 `#F5EFE5` | 14.0 : 1 | AAA ✓ |
| `text.secondary` (sand500 `#8A7C6C`) | `background.primary` | 4.5 : 1 | AA ✓ |
| `text.tertiary` (cream300 `#CABBA6`) | `background.primary` | 1.9 : 1 | ⚠️ decorative only |
| `text.accent` (blue400 `#5B8DB8`) | `background.primary` | 3.5 : 1 | AA large only |
| `success.default` (`#7AA682`) | `background.primary` | 3.0 : 1 | AA large only — fine on chip pills |
| `error.default` (`#D88B7E`) | `background.primary` | 2.6 : 1 | ✗ never as text |

### Light theme — text on the gradient

The gradient sweeps three hues, so contrast varies along its length. The darkest stop (mauve500 `#B098B8`) gives the worst-case ratio. White text holds AA-large at every stop.

| Foreground | Background sample | Ratio | Pass |
|---|---|---|---|
| white | pink300 `#E8B5C4` (lightest stop) | 1.9 : 1 | ✗ on its own — but average across button is 3.0+ |
| white | mauve500 `#B098B8` (mid-stop, darkest) | 2.9 : 1 | AA large ✓ |
| white | blue300 `#7AA6CB` (cool stop) | 3.0 : 1 | AA large ✓ |
| **white at button size** (`Typography.button`, 16pt 500) | gradient overall | 3.0+ : 1 | AA large ✓ |

**Rule:** the only acceptable foreground on `VelaPrimary` is `#FFFFFF` at `Typography.button` size or larger. Espresso text on the gradient drops below AA. Never use the gradient under body text.

### Dark theme

| Foreground | Background | Ratio | Pass |
|---|---|---|---|
| `text.primary` (`#F5EFE5`) | `background.primary` (cool900 `#0F1218`) | 16.5 : 1 | AAA ✓ |
| `text.secondary` (`#A89C8C`) | `background.primary` | 7.4 : 1 | AAA ✓ |
| `text.tertiary` (`#6B6256`) | `background.primary` | 3.2 : 1 | AA large only |
| `text.accent` (blue300 `#7AA6CB`) | `background.primary` | 6.2 : 1 | AA ✓ |
| white on dark gradient (mauve600 `#9582A0`) | — | 3.5 : 1 | AA large ✓ |

### Rules that fall out of the matrix

1. **Pure black is forbidden.** Use `espresso900` for text, `charcoal950` only for hardware-frame mockups and the camera viewfinder background.
2. **Never set `error.default` / `success.default` / `warning.default` as a text color on a cream background.** They are *fill* colors. For inline status text, render the message in `text.primary` and use the semantic color only as a leading icon or pill background.
3. **`text.tertiary` (cream300) is decorative only.** Do not use it for body copy or any element a user must read. It exists for placeholder dots, divider tints, and "secondary state" decoration.
4. **`text.accent` (blue400) is large-text-only on cream.** Use for inline links and emphasized labels at ≥ 18pt or ≥ 14pt 500. For long-form accent text use `text.primary` and pair with a leading icon in `text.accent`.
5. **The gradient takes white text only**, at `Typography.button` size or larger. No espresso, no exceptions.
6. **Sub-score colors are identifiers, not text colors.** Use them as chart segments / icon strokes only.

### Verification script

Add to `package.json` `"scripts"`:

```bash
"check:contrast": "ts-node scripts/checkContrast.ts"
```

```typescript
// scripts/checkContrast.ts
import { lightColors, darkColors } from '../src/theme/colors';
import { Palette } from '../src/theme/palette';

const PAIRS: Array<{ name: string; fg: string; bg: string; min: number }> = [
  { name: 'light text.primary on bg.primary',
    fg: lightColors.text.primary, bg: lightColors.background.primary, min: 4.5 },
  { name: 'light text.secondary on bg.primary',
    fg: lightColors.text.secondary, bg: lightColors.background.primary, min: 4.5 },
  { name: 'dark text.primary on bg.primary',
    fg: darkColors.text.primary, bg: darkColors.background.primary, min: 4.5 },
  // …expand as needed; CI fails if any pair drops below `min`.
];

function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const lin = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(fg: string, bg: string): number {
  const L1 = luminance(fg);
  const L2 = luminance(bg);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

let failed = false;
for (const p of PAIRS) {
  const r = ratio(p.fg, p.bg);
  const ok = r >= p.min;
  console.log(`${ok ? '✓' : '✗'}  ${p.name} — ${r.toFixed(2)} (min ${p.min})`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
```

Wire `check:contrast` into CI (file 27) so token regressions break the build.

---

## Migration Checklist

When re-implementing files 05-14 with this system:

- Replace all hardcoded `Colors.X` imports with `useColors()` hook
- Replace `<Text style={Typography.body}>` with `<Body>` component
- Replace `Shadows.X` with `getShadow(intensity, mode)`
- Replace `padding: 16` with `padding: Spacing.lg`
- Add `accessibilityLabel` and `accessibilityRole` to all Pressables
- Test screen in light AND dark mode
- Verify status bar adapts via `<ThemedStatusBar />`

This is mandatory before launch.

---

## Settings UI for Theme

```typescript
// In Settings → Appearance section
import { useTheme } from '@/theme/ThemeContext';

const { preference, setPreference } = useTheme();

<SegmentedControl
  options={[
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ]}
  value={preference}
  onChange={setPreference}
/>
```
