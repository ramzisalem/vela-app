/**
 * Section milestone — cinematic chapter beat between onboarding sections
 * (file 07 micro-payoff). C → D uses the privacy primer instead.
 *
 * LazyFit-inspired "Part N — title" poster: oversized accent numeral, bold
 * H1, hairline-rule mark, plus the existing snapshot block.
 */
import React, { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { OnboardingScene } from '@/components/onboarding/OnboardingScene';
import { EmphasisHeadline } from '@/components/onboarding/EmphasisHeadline';
import { MilestoneDelightBlock } from '@/components/onboarding/MilestoneDelightBlock';
import { Spacing } from '@/theme/spacing';
import { AnimationDuration } from '@/theme/animations';
import { FONT_SERIF } from '@/theme/typography';
import { useColors } from '@/theme/ThemeContext';
import {
  MILESTONE_AFTER_SECTION,
  isMilestoneAfterSection,
  type MilestoneAfterSection,
} from '@/core/onboarding/sectionCopy';
import { useOnboardingStore } from '@/stores/onboardingStore';

const PART_NUMERAL: Record<MilestoneAfterSection, string> = {
  A: '01',
  B: '02',
  D: '03',
  E: '04',
};

const PART_NAME: Record<MilestoneAfterSection, string> = {
  A: 'About you',
  B: 'Your skin',
  D: 'Day to day',
  E: 'Ready',
};

export default function SectionMilestone() {
  const router = useRouter();
  const { after } = useLocalSearchParams<{ after: string | string[] }>();
  const setIndex = useOnboardingStore((s) => s.setIndex);
  const currentIndex = useOnboardingStore((s) => s.currentIndex);
  const answers = useOnboardingStore((s) => s.answers);
  const colors = useColors();

  const key = Array.isArray(after) ? (after[0] ?? '') : (after ?? '');
  const valid = isMilestoneAfterSection(key);

  useEffect(() => {
    if (!valid) router.replace('/(onboarding)/questions');
  }, [valid, router]);

  if (!valid) return null;
  const sec = key as MilestoneAfterSection;
  const copy = MILESTONE_AFTER_SECTION[sec];

  const onContinue = () => {
    if (sec === 'E') {
      router.replace('/(onboarding)/permissions');
      return;
    }
    setIndex(currentIndex + 1);
    router.replace('/(onboarding)/questions');
  };

  return (
    <OnboardingScene
      footer={
        <View style={{ paddingBottom: Spacing.md }}>
          <Button label="Continue" variant="dark" size="xl" fullWidth onPress={onContinue} />
        </View>
      }
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: Spacing.xxl, paddingBottom: Spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Part N */}
        <Animated.View
          entering={FadeIn.duration(AnimationDuration.base)}
          style={{ alignItems: 'center', marginBottom: Spacing.lg }}
        >
          <Text
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 14,
              letterSpacing: 4,
              color: colors.accent.default,
              textTransform: 'uppercase',
              fontWeight: '500',
            }}
          >
            {`Part ${PART_NUMERAL[sec]} — ${PART_NAME[sec]}`}
          </Text>
          <View
            style={{
              marginTop: Spacing.sm,
              width: 36,
              height: 2,
              borderRadius: 1,
              backgroundColor: colors.accent.default,
            }}
          />
        </Animated.View>

        {/* Big H1 */}
        <Animated.View entering={FadeInUp.duration(500).delay(140)}>
          <EmphasisHeadline size={36}>{`${copy.headline}.`}</EmphasisHeadline>
        </Animated.View>

        {/* Snapshot delight */}
        <Animated.View entering={FadeIn.duration(AnimationDuration.base).delay(280)}>
          <MilestoneDelightBlock section={sec} answers={answers} />
        </Animated.View>
      </ScrollView>
    </OnboardingScene>
  );
}
