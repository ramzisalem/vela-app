/**
 * Pre-paywall preview cards (file 40).
 *
 * Three small cards under the score reveal that show what the user gets if
 * they continue. Locked routine task IDs are stored on profile.flags so
 * they don't regenerate between preview and post-paywall dashboard.
 */
import React from 'react';
import { View } from 'react-native';
import { Body, Headline } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Spacing } from '@/theme/spacing';

export interface PreviewItem {
  title: string;
  body: string;
}

export const DEFAULT_PREVIEW: ReadonlyArray<PreviewItem> = [
  {
    title: 'Your weekly comparisons',
    body: 'Side-by-side, slider, and difference overlay. The thing you can’t do with a phone camera alone.',
  },
  {
    title: 'A routine that fits you',
    body: 'Built from your answers, calibrated to your scoring framework, and adjusted as your scans change.',
  },
  {
    title: 'Long-term trends',
    body: 'Year-over-year shifts. Honest measurements, never marketing claims.',
  },
];

export function PrePaywallPreview({ items = DEFAULT_PREVIEW }: { items?: ReadonlyArray<PreviewItem> }) {
  return (
    <View style={{ gap: Spacing.sm }}>
      {items.map((it) => (
        <Card key={it.title}>
          <Headline>{it.title}</Headline>
          <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
            {it.body}
          </Body>
        </Card>
      ))}
    </View>
  );
}
