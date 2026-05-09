/**
 * Score reveal (file 05 + 08).
 *
 * For baseline: shows score + sub-scores + AI-generated explanation, then
 * the pre-paywall preview cards (file 40). Continue opens the remaining
 * onboarding questions (post-scan), then scan-anchor and paywall (file 42).
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Caption, DisplaySerif, HeadlineSerif } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Spacing } from '@/theme/spacing';
import { useScanStore } from '@/stores/scanStore';
import { ScoreRing } from '@/components/results/ScoreRing';
import { SubScoreBars } from '@/components/results/SubScoreBars';
import { PrePaywallPreview } from '@/components/results/PrePaywallPreview';
import { AIService } from '@/services/ai';
import { useProfileStore } from '@/stores/profileStore';
import { useSingularPostBaselineInit } from '@/hooks/useSingularPostBaselineInit';
import { DiaryAttachButton } from '@/components/diary/DiaryAttachButton';
import { useHairStore } from '@/stores/hairStore';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function ResultsReveal() {
  const router = useRouter();
  const latest = useScanStore((s) => s.latest);
  const profile = useProfileStore((s) => s.profile);
  const hairEnabled = useHairStore((s) => s.enabled);
  const [explanation, setExplanation] = useState<string | undefined>(latest?.scoreExplanation);

  // ATT prompt fires AFTER baseline reveal, BEFORE paywall (file 31).
  useSingularPostBaselineInit();

  useEffect(() => {
    if (!latest || latest.scoreExplanation) return;
    let cancelled = false;
    (async () => {
      const result = await AIService.explainScoreChanges({
        scores: latest.scores,
        rawMetrics: latest.rawMetrics,
        framework: profile?.scoringFramework,
        isBaseline: latest.isBaseline,
      });
      if (cancelled) return;
      setExplanation(
        result?.summary ??
          'A clean baseline. Skin, contour, and grooming all read in band. The next scan will give you a real comparison.',
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [latest, profile]);

  if (!latest) {
    return (
      <Screen>
        <Body tone="secondary">No scan available.</Body>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl, paddingTop: Spacing.xl }}>
        <Caption tone="secondary">{latest.isBaseline ? 'Your baseline' : 'This week'}</Caption>
        <DisplaySerif style={{ marginTop: Spacing.xs, marginBottom: Spacing.lg }}>
          {latest.isBaseline ? 'A starting line.' : 'Where you are this week.'}
        </DisplaySerif>

        <View style={{ alignItems: 'center', marginVertical: Spacing.lg }}>
          <ScoreRing score={latest.scores.overall} />
        </View>

        {explanation ? (
          <Body tone="secondary" style={{ marginVertical: Spacing.lg }}>
            {explanation}
          </Body>
        ) : null}

        <HeadlineSerif style={{ marginTop: Spacing.lg, marginBottom: Spacing.base }}>
          By sub-score.
        </HeadlineSerif>
        <SubScoreBars scores={latest.scores} />

        {!latest.isBaseline ? (
          <View style={{ marginTop: Spacing.lg }}>
            <Caption tone="secondary">If something today belongs in the picture</Caption>
            <View style={{ marginTop: Spacing.xs }}>
              <DiaryAttachButton
                attachedTo={{ kind: 'scan', sessionId: latest.id }}
                label="Add a note"
              />
            </View>
          </View>
        ) : null}

        {!latest.isBaseline && hairEnabled ? (
          <View style={{ marginTop: Spacing.xl }}>
            <HeadlineSerif style={{ marginBottom: Spacing.sm }}>Hair density</HeadlineSerif>
            <Body tone="secondary">
              Four quick photos build your hairline and crown timeline. Skip any week — this is optional.
            </Body>
            <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
              <Button label="Add hair photos" onPress={() => router.push('/hair/capture')} />
              <Caption tone="tertiary">Photos stay on this device.</Caption>
            </View>
          </View>
        ) : null}

        {latest.isBaseline ? (
          <View style={{ marginTop: Spacing.xxl }}>
            <HeadlineSerif style={{ marginBottom: Spacing.base }}>What unlocks next.</HeadlineSerif>
            <PrePaywallPreview />
          </View>
        ) : null}
      </ScrollView>

      <View style={{ paddingBottom: Spacing.xl }}>
        <Button
          label="Continue"
          fullWidth
          onPress={() => {
            if (latest.isBaseline) {
              const { questionPhase, setQuestionPhase, setIndex } = useOnboardingStore.getState();
              if (questionPhase === 'pre_scan') {
                setQuestionPhase('post_scan');
                setIndex(0);
              }
              router.replace('/(onboarding)/questions');
              return;
            }
            router.replace('/(main)/dashboard');
          }}
        />
      </View>
    </Screen>
  );
}
