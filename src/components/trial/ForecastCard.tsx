/**
 * Day 7 forecast card (file 41).
 *
 * Three swipeable sub-cards. The "PREVIEW" watermark is mandatory and
 * rendered at 14% opacity in `text.tertiary`. The "This is mocked-up" line
 * is also mandatory.
 */
import React from 'react';
import { ScrollView, View, StyleSheet, Dimensions } from 'react-native';
import { Body, Caption, HeadlineSerif } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/theme';
import type { Forecast } from '@/core/trial/forecast';

interface Props {
  forecast: Forecast;
  onContinue: () => void;
  onNoThanks: () => void;
}

const { width } = Dimensions.get('window');

export function ForecastCard({ forecast, onContinue, onNoThanks }: Props) {
  const colors = useColors();
  return (
    <View style={styles.host}>
      <View accessible accessibilityLabel="Watermark: Preview">
        <View style={styles.watermark}>
          <Caption
            tone="tertiary"
            style={{ opacity: 0.14, fontSize: 36, transform: [{ rotate: '-18deg' }] }}
          >
            PREVIEW
          </Caption>
        </View>
      </View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
      >
        <View style={[styles.page, { backgroundColor: colors.surface.raised }]}>
          <HeadlineSerif>{forecast.headerLine}</HeadlineSerif>
          <Body tone="secondary" style={styles.bodyCopy}>
            A preview, based on what your face has shown us so far and what we typically see in
            someone your age sticking with their routine.
          </Body>
          <Caption tone="tertiary" style={styles.disclaim}>
            This is mocked-up. Real numbers start when they start.
          </Caption>
        </View>

        <View style={[styles.page, { backgroundColor: colors.surface.raised }]}>
          <Caption tone="secondary">Projected at week 4</Caption>
          <HeadlineSerif style={styles.range}>
            {forecast.scoreBand.lower}–{forecast.scoreBand.upper}
          </HeadlineSerif>
          <Body tone="secondary">{forecast.patternHypothesis}</Body>
        </View>

        <View style={[styles.page, { backgroundColor: colors.surface.raised }]}>
          <HeadlineSerif>What gets you there:</HeadlineSerif>
          <View style={{ marginTop: 16, gap: 6 }}>
            <Body>· Weekly scan (you’ve done two)</Body>
            <Body>· Daily routine (consistency lifts what’s controllable)</Body>
            <Body>· Apple Health connection if you have one</Body>
          </View>
          <View style={{ marginTop: 24, gap: 12 }}>
            <Button label={forecast.footerActionLine} variant="primary" size="lg" onPress={onContinue} />
            <Button label="No thanks" variant="ghost" size="lg" onPress={onNoThanks} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  watermark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  pager: { flex: 1 },
  page: {
    width,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 12,
  },
  bodyCopy: { marginTop: 8 },
  disclaim: { marginTop: 12 },
  range: { fontSize: 56, marginTop: 8, marginBottom: 8 },
});
