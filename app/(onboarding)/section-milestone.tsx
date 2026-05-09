/**
 * Short chapter beat between onboarding sections (file 07 micro-payoff).
 * C → D uses the privacy primer instead of this screen.
 */
import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Body, Caption, HeadlineSerif } from '@/components/ui/Text';
import {
  OnboardingAccentRule,
  OnboardingAnimatedEnter,
  OnboardingFooter,
} from '@/components/onboarding/OnboardingChrome';
import { Spacing } from '@/theme/spacing';
import {
  MILESTONE_AFTER_SECTION,
  isMilestoneAfterSection,
  type MilestoneAfterSection,
} from '@/core/onboarding/sectionCopy';
import { MilestoneDelightBlock } from '@/components/onboarding/MilestoneDelightBlock';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function SectionMilestone() {
  const router = useRouter();
  const { after } = useLocalSearchParams<{ after: string | string[] }>();
  const setIndex = useOnboardingStore((s) => s.setIndex);
  const currentIndex = useOnboardingStore((s) => s.currentIndex);
  const answers = useOnboardingStore((s) => s.answers);

  const key = Array.isArray(after) ? (after[0] ?? '') : (after ?? '');
  const valid = isMilestoneAfterSection(key);

  useEffect(() => {
    if (!valid) {
      router.replace('/(onboarding)/questions');
    }
  }, [valid, router]);

  if (!valid) {
    return null;
  }
  const copy = MILESTONE_AFTER_SECTION[key as MilestoneAfterSection];

  const onContinue = () => {
    if (key === 'E') {
      router.replace('/(onboarding)/permissions');
      return;
    }
    setIndex(currentIndex + 1);
    router.replace('/(onboarding)/questions');
  };

  return (
    <Screen variant="secondary">
      <OnboardingAnimatedEnter
        style={{ flex: 1, justifyContent: 'center', paddingTop: Spacing.xxxl }}
      >
        <OnboardingAccentRule />
        <Caption tone="tertiary">{copy.kicker}</Caption>
        <HeadlineSerif style={{ marginTop: Spacing.md, marginBottom: Spacing.xl }}>{copy.headline}</HeadlineSerif>
        <Body tone="secondary">{copy.body}</Body>
        <MilestoneDelightBlock section={key as MilestoneAfterSection} answers={answers} />
      </OnboardingAnimatedEnter>
      <OnboardingFooter>
        <Button label="Continue" size="xl" fullWidth onPress={onContinue} />
      </OnboardingFooter>
    </Screen>
  );
}
