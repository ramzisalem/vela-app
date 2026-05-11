/**
 * InfoCard — the "flame card" pattern adapted from LazyFit's onboarding.
 *
 * Sits directly under a question headline. Reads as a *gift of explanation*:
 * a soft tinted background, a small accent glyph, and 2–3 lines of "why
 * we're asking this." Use sparingly — one card per question, only on
 * consequential ones.
 *
 * Tones:
 *   - `accent`   – pale Vela blue (default)
 *   - `warm`     – pale peach (encouragement / reassurance)
 *   - `success`  – pale sage (positive stat)
 *   - `recommend`– pink VelaPrimary tint (recommendation banner)
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { Palette } from '@/theme/palette';
import { Layout, Radii, Spacing } from '@/theme/spacing';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type InfoCardTone = 'accent' | 'warm' | 'success' | 'recommend';

export interface InfoCardProps {
  /** Plain text body — keep short. Bold via `**word**` markdown-style spans. */
  body: string;
  /** Optional eyebrow (e.g. "Don't worry"). Rendered bold on its own line. */
  eyebrow?: string;
  icon?: IoniconName;
  tone?: InfoCardTone;
  style?: StyleProp<ViewStyle>;
}

const TONE_GLYPH: Record<InfoCardTone, IoniconName> = {
  accent: 'flame',
  warm: 'flame',
  success: 'checkmark-circle',
  recommend: 'sparkles',
};

function toneStyles(tone: InfoCardTone, isLight: boolean, c: ReturnType<typeof useColors>) {
  switch (tone) {
    case 'warm':
      // Pale copper wash + warm gold flame icon — sits in the brand family.
      return {
        bg: isLight ? 'rgba(199, 127, 74, 0.08)' : 'rgba(224, 165, 114, 0.12)',
        icon: Palette.warningLight,
        text: c.text.secondary,
        eyebrow: c.text.primary,
      };
    case 'success':
      return {
        bg: c.success.background,
        icon: c.success.default,
        text: c.text.secondary,
        eyebrow: c.text.primary,
      };
    case 'recommend':
      // Copper light wash + saturated copper glyph
      return {
        bg: 'rgba(224, 165, 114, 0.18)', // copper light @ 18%
        icon: Palette.mauve500, // signature copper #C77F4A
        text: c.text.secondary,
        eyebrow: c.text.primary,
      };
    case 'accent':
    default:
      return {
        bg: c.accent.background,
        icon: c.accent.default,
        text: c.text.secondary,
        eyebrow: c.text.primary,
      };
  }
}

/**
 * Render `body` with **bold** spans converted to inline strong text.
 * Tiny in-place parser; no markdown library.
 */
function RichBody({ body, color }: { body: string; color: string }) {
  const parts = body.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text
      variant="body"
      style={{ color, fontSize: 14.5, lineHeight: 21, flexShrink: 1 }}
    >
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return (
            <Text
              key={i}
              variant="bodyEmphasis"
              style={{ color, fontWeight: '600' }}
            >
              {p.slice(2, -2)}
            </Text>
          );
        }
        return p;
      })}
    </Text>
  );
}

export function InfoCard({ body, eyebrow, icon, tone = 'accent', style }: InfoCardProps) {
  const colors = useColors();
  const s = toneStyles(tone, true, colors);
  const glyph = icon ?? TONE_GLYPH[tone];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.base,
          backgroundColor: s.bg,
          borderRadius: Radii.lg,
          borderWidth: Layout.hairline,
          borderColor: 'transparent',
        },
        style,
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: Radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={glyph} size={22} color={s.icon} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? (
          <Text
            variant="bodyEmphasis"
            style={{ color: s.eyebrow, fontSize: 15, marginBottom: 2 }}
          >
            {eyebrow}
          </Text>
        ) : null}
        <RichBody body={body} color={s.text} />
      </View>
    </View>
  );
}
