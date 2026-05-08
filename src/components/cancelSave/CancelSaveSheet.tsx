/**
 * Cancel-save bottom sheet (file 47).
 *
 * Hard rules:
 *   - One save attempt only.
 *   - Dismissable at any time; dismissal is treated as decline.
 *   - No "are you sure?" multi-step confirms.
 */
import React from 'react';
import { Modal, Pressable, View, StyleSheet } from 'react-native';
import { useColors } from '@/theme';
import { HeadlineSerif, Body } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import type { CancelSaveOffer } from '@/types/cancelSave';

interface Props {
  visible: boolean;
  offer: CancelSaveOffer | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function CancelSaveSheet({ visible, offer, onAccept, onDecline }: Props) {
  const colors = useColors();
  if (!offer) return null;

  const acceptIsCancel = offer.kind === 'no-offer-respectful-goodbye';
  const declineLabel = acceptIsCancel ? 'Stay subscribed' : 'Continue cancelling';

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onDecline}>
      <Pressable style={styles.scrim} onPress={onDecline} accessibilityLabel="Dismiss">
        <View style={[styles.sheet, { backgroundColor: colors.surface.raised }]}>
          <HeadlineSerif>{titleForOffer(offer.kind)}</HeadlineSerif>
          <Body tone="secondary" style={styles.body}>
            {offer.bodyCopy}
          </Body>
          <Button
            variant={acceptIsCancel ? 'destructive' : 'primary'}
            size="lg"
            onPress={onAccept}
            label={offer.ctaText}
          />
          <Pressable
            onPress={onDecline}
            accessibilityRole="button"
            accessibilityLabel={declineLabel}
            style={styles.declineRow}
          >
            <Body tone="tertiary">{declineLabel}</Body>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function titleForOffer(kind: CancelSaveOffer['kind']): string {
  switch (kind) {
    case 'extension-month-free':
      return 'Skin moves slowly.';
    case 'price-match-yearly':
      return 'A small thing.';
    case 'consolation-doctor-export':
      return 'Before you go.';
    case 'no-offer-respectful-goodbye':
      return 'No big sales pitch.';
    case 'route-to-trial-extension':
      return 'Skin takes time.';
  }
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(36,31,26,0.5)' },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 16,
  },
  body: { marginBottom: 8 },
  declineRow: { alignItems: 'center', paddingVertical: 12 },
});
