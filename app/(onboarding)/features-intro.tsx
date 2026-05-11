/**
 * Features intro — cinematic feature showcase shown after welcome.
 *
 * Five hero panels that mirror real Vela surfaces (score ring, sub-score
 * bars, trend chart, routine card, privacy lockup). Each panel is mostly
 * visual: a tiny chapter kicker, a 5–7 word headline, the live preview, and
 * a single proof tag. No body paragraph — the animation does the talking.
 *
 * Auto-advances every ~5.4s. Manual swipe still works. Bottom is segmented
 * progress + sheened CTA.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { Caption } from '@/components/ui/Text';
import { OnboardingScene } from '@/components/onboarding/OnboardingScene';
import { EmphasisHeadline } from '@/components/onboarding/EmphasisHeadline';
import { InfoCard } from '@/components/onboarding/InfoCard';
import { SegmentedProgress } from '@/components/onboarding/SegmentedProgress';
import {
  CapturePreview,
  MetricsPreview,
  RoutinePreview,
  TrendPreview,
  PrivacyPreview,
} from '@/components/onboarding/FeaturePreviews';
import { Layout, Spacing } from '@/theme/spacing';
import { AnimationDuration } from '@/theme/animations';

type SlideId = 'capture' | 'metrics' | 'trend' | 'routine' | 'privacy';

interface Slide {
  id: SlideId;
  numeral: string;
  kicker: string;
  /** Headline string — supports `**bold**` spans for the topic word. */
  title: string;
  /** Soft body explanation, shown inside an InfoCard under the headline. */
  info: string;
  Preview: React.ComponentType;
}

const SLIDES: ReadonlyArray<Slide> = [
  {
    id: 'capture',
    numeral: '01',
    kicker: 'Capture',
    title: 'One scan. **One score**.',
    info: 'A 20-second weekly scan with **AR alignment** so every frame matches the last.',
    Preview: CapturePreview,
  },
  {
    id: 'metrics',
    numeral: '02',
    kicker: 'Measure',
    title: 'Five dimensions of **your face**.',
    info: 'Skin, symmetry, lighting, contour, grooming — measured in **plain numbers**, never opinions.',
    Preview: MetricsPreview,
  },
  {
    id: 'trend',
    numeral: '03',
    kicker: 'Trend',
    title: 'See **real change**.',
    info: 'On average, users gain **+19 points** in their first 8 weeks. You will see your own line draw.',
    Preview: TrendPreview,
  },
  {
    id: 'routine',
    numeral: '04',
    kicker: 'Adapt',
    title: 'A routine **for your day**.',
    info: 'Five to twenty-five minutes, **tuned to your time** and budget — not the other way around.',
    Preview: RoutinePreview,
  },
  {
    id: 'privacy',
    numeral: '05',
    kicker: 'Protect',
    title: 'Your face **stays with you**.',
    info: 'Photos and depth never leave this device. Only the **measurements** sync.',
    Preview: PrivacyPreview,
  },
];

const AUTO_ADVANCE_MS = 5400;

export default function FeaturesIntroScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const last = index >= SLIDES.length - 1;

  useEffect(() => {
    if (last) return;
    const id = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true, viewPosition: 0 });
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(id);
  }, [index, last]);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / Math.max(1, width));
      setIndex(Math.min(Math.max(next, 0), SLIDES.length - 1));
    },
    [width],
  );

  const goNext = useCallback(() => {
    if (last) {
      router.push('/(onboarding)/questions');
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true, viewPosition: 0 });
  }, [index, last, router]);

  const renderSlide: ListRenderItem<Slide> = useCallback(
    ({ item }) => {
      const Preview = item.Preview;
      return (
        <View
          style={{
            width,
            paddingHorizontal: Layout.screenInset,
            justifyContent: 'center',
          }}
        >
          {/* Headline — centered, inline-emphasis topic word */}
          <Animated.View
            key={`copy-${item.id}`}
            entering={FadeIn.duration(AnimationDuration.base)}
            style={{ marginBottom: Spacing.lg }}
          >
            <EmphasisHeadline size={28}>{item.title}</EmphasisHeadline>
          </Animated.View>

          {/* Hero preview */}
          <Animated.View
            key={`preview-${item.id}`}
            entering={FadeInUp.duration(440).delay(80).easing(Easing.out(Easing.cubic))}
            style={{ alignItems: 'center', marginBottom: Spacing.lg }}
          >
            <Preview />
          </Animated.View>

          {/* InfoCard — soft explanation under the preview */}
          <Animated.View
            entering={FadeInUp.duration(440).delay(200).easing(Easing.out(Easing.cubic))}
          >
            <InfoCard body={item.info} tone="warm" />
          </Animated.View>
        </View>
      );
    },
    [width],
  );

  return (
    <OnboardingScene
      footer={
        <View style={{ paddingBottom: Spacing.md, gap: Spacing.md }}>
          <SegmentedProgress
            sectionIndex={index}
            sectionCount={SLIDES.length}
            stepInSection={1}
            stepsInSection={1}
          />
          <Button
            label={last ? 'Build my plan' : 'Next'}
            variant="dark"
            size="xl"
            fullWidth
            onPress={goNext}
          />
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
            <Caption tone="tertiary" style={{ textAlign: 'center', paddingVertical: 2 }}>
              Back
            </Caption>
          </Pressable>
        </View>
      }
      contentStyle={styles.bleed}
    >
      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={SLIDES as Slide[]}
          keyExtractor={(it) => it.id}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={onScrollEnd}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          initialNumToRender={SLIDES.length}
          onScrollToIndexFailed={({ index: target }) => {
            setTimeout(
              () => listRef.current?.scrollToIndex({ index: target, animated: true, viewPosition: 0 }),
              80,
            );
          }}
        />
      </View>
    </OnboardingScene>
  );
}

const styles = StyleSheet.create({
  bleed: { paddingHorizontal: 0 },
});
