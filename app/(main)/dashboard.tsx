/**
 * Dashboard (file 10). Reads from the 7-slot card-stack registry.
 */
import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Caption, DisplaySerif } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { Wordmark } from '@/components/brand';
import { Spacing } from '@/theme/spacing';
import { useScanStore } from '@/stores/scanStore';
import { useProfileStore } from '@/stores/profileStore';
import { useRoutineStore } from '@/stores/routineStore';
import { useLifeStageStore } from '@/stores/lifeStageStore';
import { selectDashboardCards, type DashboardContext } from '@/core/dashboard/cards';
import {
  AgingBandCard,
  FeatureRevealCard,
  FirstScanPillCard,
  HairTrackingCard,
  LongTermTrendCard,
  ModeNarrativeCard,
  NextCheckinCard,
  RecentComparisonCard,
  RoutineProgressCard,
  ScoreSummaryCard,
  StreakChipCard,
  WeeklyReadyCard,
  YoYInsightDashboardCard,
  OnThisDayDashboardCard,
  AnniversaryDashboardCard,
  WrappedReadyCard,
} from '@/components/dashboard/cards';
import {
  hasYoyEligibility,
  findOnThisDayCard,
  eligibleAnniversaryCard,
  computeCompoundEffort,
} from '@/core/longTerm/longTermEngine';
import { useDiaryStore } from '@/stores/diaryStore';
import { useHairStore } from '@/stores/hairStore';

export default function Dashboard() {
  const profile = useProfileStore((s) => s.profile);
  const scans = useScanStore((s) => s.sessions);
  const routine = useRoutineStore((s) => s.currentRoutine);
  const routineProgress = useRoutineStore((s) => s.getProgressToday());
  const primaryLifeStageMode = useLifeStageStore((s) => s.primaryMode());
  const hasActiveLifeStageMode = useLifeStageStore((s) => s.hasActiveLifeStageMode());

  const diaryEntries = useDiaryStore((s) => s.entries);
  const hairTrackingEnabled = useHairStore((s) => s.enabled);

  const ctx: DashboardContext = useMemo(() => {
    const latest = scans[scans.length - 1];
    const daysSinceLastScan = latest
      ? Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 86_400_000)
      : 99;
    const monthsSinceJoined = profile
      ? Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (86_400_000 * 30))
      : 0;
    const hasYoy = hasYoyEligibility(scans);
    const onThisDay = findOnThisDayCard(scans);
    let anniversary = null;
    if (profile?.createdAt) {
      const stats = computeCompoundEffort(
        scans,
        diaryEntries.length,
        scans.length,
        profile.createdAt,
      );
      anniversary = eligibleAnniversaryCard(profile.createdAt, stats, '');
    }
    const dayOfMonth = new Date().getDate();
    const wrappedReady = monthsSinceJoined >= 1 && dayOfMonth <= 5;
    return {
      profile: profile ?? undefined,
      scans,
      daysSinceLastScan,
      hasActiveLifeStageMode,
      primaryLifeStageMode,
      monthsSinceJoined,
      routineProgress,
      hasYoyInsight: hasYoy,
      hasOnThisDayCard: onThisDay !== null,
      hasAnniversaryCard: anniversary !== null,
      hasWrappedReady: wrappedReady,
      hairTrackingEnabled,
    };
  }, [
    profile,
    scans,
    hasActiveLifeStageMode,
    primaryLifeStageMode,
    routineProgress,
    diaryEntries.length,
    hairTrackingEnabled,
  ]);

  const slots = useMemo(() => selectDashboardCards(ctx), [ctx]);
  void routine;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.base }}
      >
        <View style={{ marginBottom: Spacing.base }}>
          <Wordmark size="medium" />
        </View>
        <Caption tone="secondary">Today</Caption>
        <DisplaySerif style={{ marginBottom: Spacing.lg }}>
          {profile?.email ? `Welcome back.` : 'Welcome.'}
        </DisplaySerif>

        {slots[1] === 'card.firstScanPill' ? <FirstScanPillCard /> : null}
        {slots[1] === 'card.weeklyReady' ? <WeeklyReadyCard /> : null}
        {slots[1] === 'card.nextCheckin' ? <NextCheckinCard ctx={ctx} /> : null}

        {slots[2] === 'card.modeNarrative' ? <ModeNarrativeCard ctx={ctx} /> : null}
        {slots[2] === 'card.scoreSummary' ? <ScoreSummaryCard ctx={ctx} /> : null}
        {slots[2] === 'card.agingBand' ? <AgingBandCard ctx={ctx} /> : null}

        {slots[3] === 'card.streakChip' ? <StreakChipCard ctx={ctx} /> : null}
        {slots[3] === 'card.hairTracking' ? <HairTrackingCard /> : null}
        {slots[4] === 'card.routineProgress' ? <RoutineProgressCard ctx={ctx} /> : null}
        {slots[5] === 'card.recentComparison' ? <RecentComparisonCard /> : null}
        {slots[6] === 'card.anniversary' ? <AnniversaryDashboardCard ctx={ctx} /> : null}
        {slots[6] === 'card.wrappedReady' ? <WrappedReadyCard /> : null}
        {slots[6] === 'card.yoyInsight' ? <YoYInsightDashboardCard ctx={ctx} /> : null}
        {slots[6] === 'card.onThisDay' ? <OnThisDayDashboardCard ctx={ctx} /> : null}
        {slots[6] === 'card.longTermTrend' ? <LongTermTrendCard ctx={ctx} /> : null}
        {slots[7] === 'card.featureReveal' ? <FeatureRevealCard ctx={ctx} /> : null}
      </ScrollView>
    </Screen>
  );
}
