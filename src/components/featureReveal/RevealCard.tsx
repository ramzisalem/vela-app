/**
 * Feature reveal card (file 43).
 *
 * Sits between score card and routine card on the dashboard. Cream surface
 * card. Soft 1px subtle border; no shadow, no glow. Single button + small
 * "Not now" link. Never animates.
 */
import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { HeadlineSerif, Body } from '@/components/ui/Text';
import { useColors } from '@/theme';
import type { RevealDefinition } from '@/types/featureReveal';

interface Props {
  card: RevealDefinition;
  onEngage: () => void;
  onDismiss: () => void;
}

export function RevealCard({ card, onEngage, onDismiss }: Props) {
  const colors = useColors();
  return (
    <View
      accessibilityRole="summary"
      accessible
      accessibilityLabel={`Suggestion: ${card.copy.headline}. ${card.copy.body}.`}
      style={[
        styles.container,
        { backgroundColor: colors.surface.raised, borderColor: colors.border.subtle },
      ]}
    >
      <HeadlineSerif>{card.copy.headline}</HeadlineSerif>
      <Body tone="secondary" style={styles.body}>
        {card.copy.body}
      </Body>
      <View style={styles.actions}>
        <Pressable
          onPress={onEngage}
          accessibilityRole="button"
          accessibilityLabel={card.copy.cta}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: colors.text.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Body tone="inverse">{card.copy.cta}</Body>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Not now"
          style={({ pressed }) => [styles.dismiss, pressed && { opacity: 0.6 }]}
        >
          <Body tone="tertiary">Not now</Body>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
  },
  body: { marginTop: 8 },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cta: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dismiss: { paddingHorizontal: 8, paddingVertical: 10 },
});
