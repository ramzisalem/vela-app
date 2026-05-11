/**
 * Wordmark (file 21).
 *
 * Lowercase "vela", serif italic, weight 500, letter-spacing 0.5px. The
 * `gradient` variant masks the text with VelaPrimary (135°) — reserved for
 * sparing contexts (welcome, share-card lockup) and never small in-app.
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/theme/ThemeContext';
import { VelaPrimary, gradientStopsForMode } from '@/theme/gradients';
import { FONT_SERIF } from '@/theme/typography';

export type WordmarkSize = 'small' | 'medium' | 'large' | 'hero';
export type WordmarkVariant = 'standard' | 'gradient';

const SIZE_MAP: Record<WordmarkSize, { fontSize: number; lineHeight: number }> = {
  small: { fontSize: 18, lineHeight: 22 },
  medium: { fontSize: 28, lineHeight: 32 },
  large: { fontSize: 44, lineHeight: 52 },
  hero: { fontSize: 72, lineHeight: 80 },
};

export interface WordmarkProps {
  size?: WordmarkSize;
  variant?: WordmarkVariant;
  style?: StyleProp<ViewStyle>;
  /** Override theme. Useful on share cards (always dark glyph on cream). */
  forceTone?: 'light' | 'dark';
}

export function Wordmark({
  size = 'medium',
  variant = 'standard',
  style,
  forceTone,
}: WordmarkProps) {
  const mode = useThemeMode();
  const dims = SIZE_MAP[size];
  const tone =
    forceTone === 'light'
      ? '#FFFFFF'
      : forceTone === 'dark'
        ? '#0F0F12' // ink (Obsidian & Copper edition)
        : mode === 'dark'
          ? '#FAF8F4' // canvas
          : '#0F0F12';

  const text = (
    <Text
      style={{
        fontFamily: FONT_SERIF,
        fontStyle: 'italic',
        fontWeight: '500',
        fontSize: dims.fontSize,
        lineHeight: dims.lineHeight,
        letterSpacing: 0.5,
        color: variant === 'gradient' ? '#000' /* masked */ : tone,
      }}
      accessibilityLabel="Vela"
    >
      vela
    </Text>
  );

  if (variant === 'standard') {
    return <View style={style}>{text}</View>;
  }

  const grad = gradientStopsForMode(VelaPrimary, mode);
  return (
    <View style={style}>
      <MaskedView maskElement={text}>
        <LinearGradient
          colors={grad.colors as unknown as string[]}
          locations={grad.locations as unknown as number[]}
          start={grad.start}
          end={grad.end}
          style={{ height: dims.lineHeight, width: dims.fontSize * 2.6 }}
        />
      </MaskedView>
    </View>
  );
}
