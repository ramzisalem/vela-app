/**
 * Dashboard card components (file 10). Each maps 1:1 to a DashboardCardId.
 */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Body, Caption, Headline, HeadlineSerif } from '@/components/ui/Text';
import { Spacing, Radii } from '@/theme/spacing';
import { useColors } from '@/theme/ThemeContext';
import type { DashboardContext } from '@/core/dashboard/cards';
import { ScoreRing } from '@/components/results/ScoreRing';
import { StreakChip } from '@/components/streak/StreakChip';
import { useFeatureRevealStore } from '@/stores/featureRevealStore';
import { RevealCard } from '@/components/featureReveal/RevealCard';
import type { EligibilityContext } from '@/types/featureReveal';
import { Sparkline } from '@/components/charts/Sparkline';
import { useHairStore } from '@/stores/hairStore';

export function NextCheckinCard({ ctx }: { ctx: DashboardContext }) {
  const days = Math.max(0, 7 - ctx.daysSinceLastScan);
  return (
    <Card>
      <Caption tone="secondary">Up next</Caption>
      <Headline>{`Next scan in ${days} day${days === 1 ? '' : 's'}.`}</Headline>
      <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
        Same time of day, same lighting if you can. Consistency makes the comparisons honest.
      </Body>
    </Card>
  );
}

export function WeeklyReadyCard() {
  const router = useRouter();
  return (
    <Card>
      <Caption tone="secondary">A week has passed</Caption>
      <Headline>Ready when you are.</Headline>
      <Body tone="secondary" style={{ marginTop: Spacing.xs, marginBottom: Spacing.base }}>
        Your weekly comparison is one short scan away.
      </Body>
      <Button label="Start scan" onPress={() => router.push('/(capture)/capture')} />
    </Card>
  );
}

export function FirstScanPillCard() {
  const router = useRouter();
  return (
    <Card>
      <Caption tone="secondary">First scan</Caption>
      <HeadlineSerif>Set your baseline.</HeadlineSerif>
      <Body tone="secondary" style={{ marginTop: Spacing.xs, marginBottom: Spacing.base }}>
        Two minutes — and every weekly comparison after this becomes meaningful.
      </Body>
      <Button label="Start" onPress={() => router.push('/(capture)/capture?isBaseline=true')} />
    </Card>
  );
}

export function ScoreSummaryCard({ ctx }: { ctx: DashboardContext }) {
  const latest = ctx.scans[ctx.scans.length - 1];
  const prev = ctx.scans[ctx.scans.length - 2];
  const delta = latest && prev ? Math.round(latest.scores.overall - prev.scores.overall) : undefined;
  if (!latest) return null;
  return (
    <Card>
      <Caption tone="secondary">Your latest scan</Caption>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <ScoreRing score={latest.scores.overall} size={120} stroke={6} />
        <View style={{ flex: 1 }}>
          <Headline>{`Overall ${latest.scores.overall}.`}</Headline>
          {delta !== undefined ? (
            <Body tone="secondary">
              {delta > 0
                ? `Up ${delta} from last week.`
                : delta < 0
                  ? `Down ${Math.abs(delta)} from last week.`
                  : 'Same as last week.'}
            </Body>
          ) : (
            <Body tone="secondary">Your first scan. The comparison opens up next week.</Body>
          )}
        </View>
      </View>
    </Card>
  );
}

export function AgingBandCard({ ctx }: { ctx?: DashboardContext }) {
  const sparkValues = React.useMemo(() => {
    const scans = ctx?.scans ?? [];
    return scans
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-12)
      .map((s) => s.scores.overall);
  }, [ctx?.scans]);
  return (
    <Card>
      <Caption tone="secondary">Your aging band</Caption>
      <Headline>Within typical range.</Headline>
      {sparkValues.length >= 3 ? (
        <View style={{ marginTop: Spacing.sm }}>
          <Sparkline values={sparkValues} highlightLast />
        </View>
      ) : null}
      <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
        Compared to people of similar background, your six-month trend tracks within the typical
        band.
      </Body>
    </Card>
  );
}

export function ModeNarrativeCard({ ctx }: { ctx: DashboardContext }) {
  const colors = useColors();
  const mode = ctx.primaryLifeStageMode;
  const copy: Record<string, { title: string; body: string }> = {
    pregnancy: {
      title: 'Gentle weeks ahead.',
      body: 'Skin shifts during pregnancy are normal. We mute the routine to safe categories until you say otherwise.',
    },
    postpartum: {
      title: 'A softer tempo.',
      body: 'Postpartum changes can take time. Your routine and tone are adjusted accordingly.',
    },
    menopause: {
      title: 'Your hormonal context, honored.',
      body: 'We adjust expectations and recommendations rather than apply a generic baseline.',
    },
    cancer_recovery: {
      title: 'Recovery first.',
      body: 'We pause cosmetic-leaning content. Your routine focuses on barrier support and gentleness.',
    },
  };
  const entry = (mode && copy[mode]) ?? { title: 'Mode active.', body: 'Your scoring is mode-aware.' };
  return (
    <Card style={{ borderColor: colors.border.accent }}>
      <Caption tone="secondary">Mode</Caption>
      <Headline>{entry.title}</Headline>
      <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
        {entry.body}
      </Body>
    </Card>
  );
}

export function StreakChipCard({ ctx: _ctx }: { ctx: DashboardContext }) {
  // The streak chip itself is intentionally minimal — no card chrome.
  return (
    <View style={{ paddingHorizontal: Spacing.xs }}>
      <StreakChip />
    </View>
  );
}

export function HairTrackingCard() {
  const router = useRouter();
  const scans = useHairStore((s) => s.scans);
  const latest = scans.length ? scans[scans.length - 1] : null;
  return (
    <Card>
      <Caption tone="secondary">Hair</Caption>
      <Headline>
        {latest
          ? `Overall density this session: ${latest.densityScores.overall}.`
          : 'Track crown, hairline, and temples over time.'}
      </Headline>
      <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
        Photos stay on this device. We store numbers, not pictures.
      </Body>
      <Button
        label={latest ? 'Open hair timeline' : 'Start a hair scan'}
        variant="ghost"
        onPress={() => router.push('/hair')}
        style={{ alignSelf: 'flex-start', marginTop: Spacing.sm }}
      />
    </Card>
  );
}

export function RoutineProgressCard({ ctx }: { ctx: DashboardContext }) {
  const router = useRouter();
  const { completed, total } = ctx.routineProgress;
  return (
    <Card>
      <Caption tone="secondary">Today’s routine</Caption>
      <Headline>{`${completed} of ${total} done.`}</Headline>
      <Button
        label="Open routine"
        variant="ghost"
        onPress={() => router.push('/(main)/routine')}
        style={{ alignSelf: 'flex-start', marginTop: Spacing.sm }}
      />
    </Card>
  );
}

export function RecentComparisonCard() {
  const router = useRouter();
  return (
    <Card>
      <Caption tone="secondary">Most recent comparison</Caption>
      <Headline>See what changed.</Headline>
      <Body tone="secondary" style={{ marginTop: Spacing.xs, marginBottom: Spacing.base }}>
        Slider, side-by-side, or difference overlay across your last two scans.
      </Body>
      <Button label="Compare" onPress={() => router.push('/(main)/compare')} />
    </Card>
  );
}

export function LongTermTrendCard({ ctx }: { ctx?: DashboardContext }) {
  const router = useRouter();
  const sparkValues = React.useMemo(() => {
    const scans = ctx?.scans ?? [];
    return scans
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-26)
      .map((s) => s.scores.overall);
  }, [ctx?.scans]);
  const startLabel = sparkValues.length > 1 ? `${sparkValues[0]}` : '';
  const endLabel = sparkValues.length > 0 ? `${sparkValues[sparkValues.length - 1]}` : '';
  return (
    <Card>
      <Caption tone="secondary">Long-term</Caption>
      <Headline>Your trend so far.</Headline>
      {sparkValues.length >= 4 ? (
        <View style={{ marginTop: Spacing.sm }}>
          <Sparkline
            values={sparkValues}
            startLabel={startLabel}
            endLabel={endLabel}
          />
        </View>
      ) : null}
      <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
        Year-over-year shows up after twelve months of scans. On-this-day cards land on quiet
        anniversaries.
      </Body>
      <View style={{ marginTop: Spacing.sm }}>
        <Button label="Open Wrapped" variant="ghost" onPress={() => router.push('/wrapped')} />
      </View>
    </Card>
  );
}

export function FeatureRevealCard({ ctx }: { ctx?: DashboardContext }) {
  const router = useRouter();
  const evaluate = useFeatureRevealStore((s) => s.evaluate);
  const recordShown = useFeatureRevealStore((s) => s.recordShown);
  const recordEngaged = useFeatureRevealStore((s) => s.recordEngaged);
  const recordDismissed = useFeatureRevealStore((s) => s.recordDismissed);

  const elig: EligibilityContext = React.useMemo(() => {
    const scans = ctx?.scans ?? [];
    return {
      daysSinceSignup: ctx?.monthsSinceJoined ? ctx.monthsSinceJoined * 30 : 0,
      scansCount: scans.length,
      consecutiveRoutineDays: 0,
      hasHealthKitConnected: false,
      hasPairedAppleWatch: false,
      iosVersionMajor: 17,
      hasInstalledWidget: false,
      hasOpenedDiary: false,
      hasActiveTreatment: false,
      yearsSinceFirstScan: 0,
      diaryTags: [],
      activeLifeStageModes: ctx?.primaryLifeStageMode ? [ctx.primaryLifeStageMode] : [],
      onboardingHints: [],
    };
  }, [ctx]);

  const card = React.useMemo(() => evaluate(elig), [evaluate, elig]);

  React.useEffect(() => {
    if (card) recordShown(card.id);
  }, [card, recordShown]);

  if (!card) return null;
  return (
    <RevealCard
      card={card}
      onEngage={() => {
        recordEngaged(card.id);
        router.push(card.cta.route as never);
      }}
      onDismiss={() => recordDismissed(card.id)}
    />
  );
}

export function YoYInsightDashboardCard({ ctx: _ctx }: { ctx: DashboardContext }) {
  const router = useRouter();
  return (
    <Card>
      <Caption tone="secondary">A year on</Caption>
      <Headline>One year of patterns to look at.</Headline>
      <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
        We can read repeats and divergences from the same week last year. Calm, observational, never alarming.
      </Body>
      <View style={{ marginTop: Spacing.sm }}>
        <Button
          variant="ghost"
          label="See the pattern"
          onPress={() => router.push('/(main)/history')}
        />
      </View>
    </Card>
  );
}

export function OnThisDayDashboardCard({ ctx: _ctx }: { ctx: DashboardContext }) {
  const router = useRouter();
  return (
    <Card>
      <Caption tone="secondary">On this day</Caption>
      <Headline>You scanned today, before.</Headline>
      <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
        A quiet anniversary. No comparison pressure. Tap to see how that day landed.
      </Body>
      <View style={{ marginTop: Spacing.sm }}>
        <Button
          variant="ghost"
          label="Open it"
          onPress={() => router.push('/(main)/history')}
        />
      </View>
    </Card>
  );
}

export function AnniversaryDashboardCard({ ctx: _ctx }: { ctx: DashboardContext }) {
  return (
    <Card>
      <Caption tone="secondary">A small anniversary</Caption>
      <HeadlineSerif>Quietly, a year of looking.</HeadlineSerif>
      <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
        We made a card for the moment. Nothing loud, nothing to share unless you want to.
      </Body>
    </Card>
  );
}

export function WrappedReadyCard() {
  const router = useRouter();
  return (
    <Card>
      <Caption tone="secondary">Last month, in three minutes</Caption>
      <Headline>Your monthly Wrapped is ready.</Headline>
      <Body tone="secondary" style={{ marginTop: Spacing.xs }}>
        A short recap of the month \u2014 honest, no fanfare.
      </Body>
      <View style={{ marginTop: Spacing.sm }}>
        <Button
          label="Open Wrapped"
          variant="primary"
          onPress={() => router.push('/wrapped')}
        />
      </View>
    </Card>
  );
}
