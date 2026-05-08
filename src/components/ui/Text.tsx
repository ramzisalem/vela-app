/**
 * Themed Text primitive (file 15).
 *
 * Always reads color from `useColors()` — never hardcoded. Default tone is
 * `text.primary`. Use `tone="secondary"` / `"tertiary"` / `"inverse"` /
 * `"accent"` for variants.
 */
import React from 'react';
import { Text as RNText, type StyleProp, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useColors, type ThemeColors } from '@/theme';
import { Typography, type TypographyKey } from '@/theme/typography';

type Tone = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'accent';

export interface TextProps extends RNTextProps {
  variant?: TypographyKey;
  tone?: Tone;
  style?: StyleProp<TextStyle>;
  /** Caps Dynamic Type to prevent layout breakage. */
  maxFontSizeMultiplier?: number;
}

function colorForTone(tone: Tone, colors: ThemeColors): string {
  switch (tone) {
    case 'primary':
      return colors.text.primary;
    case 'secondary':
      return colors.text.secondary;
    case 'tertiary':
      return colors.text.tertiary;
    case 'inverse':
      return colors.text.inverse;
    case 'accent':
      return colors.text.accent;
  }
}

export function Text({
  variant = 'body',
  tone = 'primary',
  style,
  maxFontSizeMultiplier = 1.3,
  ...rest
}: TextProps) {
  const colors = useColors();
  const variantStyle = Typography[variant];
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[variantStyle as TextStyle, { color: colorForTone(tone, colors) }, style]}
      {...rest}
    />
  );
}

// Shorthands.
export const Title = (p: TextProps) => <Text variant="title" {...p} />;
export const Headline = (p: TextProps) => <Text variant="headline" {...p} />;
export const Body = (p: TextProps) => <Text variant="body" {...p} />;
export const Caption = (p: TextProps) => <Text variant="caption" tone="secondary" {...p} />;
export const Label = (p: TextProps) => <Text variant="label" tone="secondary" {...p} />;

// Editorial / serif.
export const DisplaySerif = (p: TextProps) => <Text variant="displaySerif" {...p} />;
export const HeadlineSerif = (p: TextProps) => <Text variant="headlineSerif" {...p} />;
export const SectionMarker = (p: TextProps) => (
  <Text variant="sectionMarker" tone="secondary" {...p} />
);
