/**
 * Score share card (file 13).
 *
 * Off-screen renderable. Wordmark always present, locked at bottom-left.
 * Cream background gradient. No personal photo on this card.
 */
import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wordmark } from '@/components/brand';
import { Caption, DisplaySerif, Body } from '@/components/ui/Text';
import { ScoreRing } from '@/components/results/ScoreRing';
import { CreamWash } from '@/theme/gradients';
import { Spacing } from '@/theme/spacing';
import type { ScanSession } from '@/types';

export interface ShareCardScoreProps {
  scan: ScanSession;
}

export const SHARE_CARD_SIZE = { width: 1080, height: 1920 };

export function ShareCardScore({ scan }: ShareCardScoreProps) {
  return (
    <View
      style={{
        width: SHARE_CARD_SIZE.width,
        height: SHARE_CARD_SIZE.height,
        backgroundColor: '#FAF6EE',
      }}
    >
      <LinearGradient
        colors={[...CreamWash.light]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, paddingHorizontal: 80, paddingVertical: 100 }}
      >
        <View style={{ marginBottom: 40 }}>
          <Caption tone="secondary">Vela score</Caption>
        </View>
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <ScoreRing score={scan.scores.overall} size={500} stroke={20} />
          <DisplaySerif style={{ marginTop: 80, fontSize: 64 }}>{scan.scores.overall}</DisplaySerif>
          <Body tone="secondary" style={{ marginTop: Spacing.lg, fontSize: 24 }}>
            {scan.isBaseline ? 'Baseline' : `Week ${scan.weekNumber}`}
          </Body>
        </View>
        <Wordmark size="hero" forceTone="dark" />
      </LinearGradient>
    </View>
  );
}
