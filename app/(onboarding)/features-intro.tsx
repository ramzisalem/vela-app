/**
 * What Vela does — shown after welcome, before the questionnaire.
 * Horizontal pager: one feature per screen, sentence case (file 07 + 21).
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  useWindowDimensions,
  View,
  type ListRenderItem,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Body, Caption, HeadlineSerif } from '@/components/ui/Text';
import {
  OnboardingAccentRule,
  OnboardingAnimatedEnter,
  OnboardingFooter,
} from '@/components/onboarding/OnboardingChrome';
import { useColors } from '@/theme/ThemeContext';
import { Radii, Spacing, Layout } from '@/theme/spacing';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface FeatureSlide {
  id: string;
  icon: IoniconName;
  title: string;
  body: string;
}

const SLIDES: FeatureSlide[] = [
  {
    id: 'scans',
    icon: 'scan-outline',
    title: 'Weekly scans that match each other',
    body: 'Same framing and lighting guidance each time, so the deltas on your dashboard reflect real change, not a different angle.',
  },
  {
    id: 'scores',
    icon: 'analytics-outline',
    title: 'Scores you can actually read',
    body: 'Skin texture, symmetry, vitality, and more — broken into numbers with short explanations. No gatekeeping, no jargon wall.',
  },
  {
    id: 'routine',
    icon: 'calendar-outline',
    title: 'A routine that respects your life',
    body: 'Suggestions scale to the time and budget you will share in the next steps. Fewer generic tips, more grounded nudges.',
  },
  {
    id: 'privacy',
    icon: 'shield-checkmark-outline',
    title: 'Your face stays on your device',
    body: 'Baseline photos and depth stay local. Synced data is measurements and choices you approve — covered again before we ask lifestyle questions.',
  },
];

export default function FeaturesIntroScreen() {
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<FeatureSlide>>(null);
  const [index, setIndex] = useState(0);
  const last = index >= SLIDES.length - 1;

  const onScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / Math.max(1, width));
    setIndex(Math.min(Math.max(next, 0), SLIDES.length - 1));
  }, [width]);

  const goNext = useCallback(() => {
    if (last) {
      router.push('/(onboarding)/questions');
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true, viewPosition: 0 });
  }, [index, last, router]);

  const goBack = useCallback(() => {
    if (index === 0) {
      router.back();
      return;
    }
    listRef.current?.scrollToIndex({ index: index - 1, animated: true, viewPosition: 0 });
  }, [index, router]);

  const renderSlide: ListRenderItem<FeatureSlide> = useCallback(
    ({ item }) => (
      <View style={{ width, paddingHorizontal: Spacing.base, justifyContent: 'center' }}>
        <OnboardingAccentRule />
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: Radii.xl,
              backgroundColor: colors.accent.background,
              borderWidth: Layout.hairline,
              borderColor: colors.border.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: Spacing.xl,
            }}
          >
            <Ionicons name={item.icon} size={40} color={colors.accent.default} />
          </View>
          <HeadlineSerif style={{ marginBottom: Spacing.lg, textAlign: 'center' }}>{item.title}</HeadlineSerif>
          <Body tone="secondary" style={{ textAlign: 'center', lineHeight: 24 }}>
            {item.body}
          </Body>
        </View>
      </View>
    ),
    [colors, width],
  );

  return (
    <Screen variant="secondary">
      <OnboardingAnimatedEnter style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Caption tone="tertiary" style={{ textAlign: 'center', marginBottom: Spacing.sm }}>
            What you get
          </Caption>
          <FlatList
            ref={listRef}
            data={SLIDES}
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
                100,
              );
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg }}>
            {SLIDES.map((s, i) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityLabel={i === index ? `Slide ${i + 1} of ${SLIDES.length}, current` : `Go to slide ${i + 1}`}
                onPress={() => listRef.current?.scrollToIndex({ index: i, animated: true, viewPosition: 0 })}
              >
                <View
                  style={{
                    width: i === index ? 22 : 8,
                    height: 8,
                    borderRadius: Radii.pill,
                    backgroundColor: i === index ? colors.accent.default : colors.border.subtle,
                  }}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </OnboardingAnimatedEnter>
      <OnboardingFooter>
        <Button label={last ? 'Start questions' : 'Next'} size="xl" fullWidth onPress={goNext} />
        <Button label={index === 0 ? 'Back to welcome' : 'Previous'} variant="ghost" fullWidth style={{ marginTop: Spacing.sm }} onPress={goBack} />
      </OnboardingFooter>
    </Screen>
  );
}
