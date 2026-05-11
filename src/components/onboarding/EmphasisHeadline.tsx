/**
 * EmphasisHeadline — onboarding question headline with inline emphasis.
 *
 * Pattern lifted from LazyFit: every question reads like
 * "What's your **gender**?" — the topic word is heavier. The bolded span is
 * marked with `**word**` in the text. The regular weight uses our serif
 * `displaySerif` variant; the bold span re-renders in the same serif at the
 * same size but heavier + italic to feel editorial without breaking the
 * inline-emphasis cue.
 *
 * Always center-aligned by default (LazyFit pattern). Short headlines only —
 * 2 lines max. Sentence case (file 21).
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { FONT_SERIF } from '@/theme/typography';

export interface EmphasisHeadlineProps {
  /** Headline with **bold** spans, e.g. `"What's your **skin type**?"`. */
  children: string;
  /** Font size override. Default 30. */
  size?: number;
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
}

export function EmphasisHeadline({
  children,
  size = 30,
  align = 'center',
  style,
}: EmphasisHeadlineProps) {
  const colors = useColors();
  const parts = children.split(/(\*\*[^*]+\*\*)/g);
  const lineHeight = Math.round(size * 1.14);

  return (
    <View style={style}>
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: FONT_SERIF,
          fontSize: size,
          lineHeight,
          textAlign: align,
          color: colors.text.primary,
          fontWeight: '500',
        }}
      >
        {parts.map((p, i) => {
          if (p.startsWith('**') && p.endsWith('**')) {
            return (
              <Text
                key={i}
                style={{
                  fontFamily: FONT_SERIF,
                  fontStyle: 'italic',
                  fontWeight: '500',
                  color: colors.accent.default,
                  fontSize: size,
                  lineHeight,
                }}
              >
                {p.slice(2, -2)}
              </Text>
            );
          }
          return p;
        })}
      </Text>
    </View>
  );
}
