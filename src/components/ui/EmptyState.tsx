/**
 * EmptyState (file 20 + 22).
 *
 * Two patterns:
 *   - "warm" (Pattern A): orientation/encouragement, no apology. Default.
 *   - "actionable" (Pattern B): includes a CTA.
 *
 * Voice rules per file 20: positive, brief, never says "no data" or "nothing
 * to show". Use a future-tense framing or a gentle next-step.
 */
import React from 'react';
import { View } from 'react-native';
import { Body, Headline } from './Text';
import { Button } from './Button';
import { Spacing } from '@/theme/spacing';

export interface EmptyStateProps {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
  illustration?: React.ReactNode;
}

export function EmptyState({ title, body, ctaLabel, onCta, illustration }: EmptyStateProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.xxxl,
      }}
    >
      {illustration ? <View style={{ marginBottom: Spacing.lg }}>{illustration}</View> : null}
      <Headline style={{ textAlign: 'center', marginBottom: Spacing.sm }}>{title}</Headline>
      <Body tone="secondary" style={{ textAlign: 'center', marginBottom: Spacing.lg }}>
        {body}
      </Body>
      {ctaLabel && onCta ? <Button label={ctaLabel} onPress={onCta} /> : null}
    </View>
  );
}
