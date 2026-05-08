# 10 — Dashboard

## Overview
The home tab. Shows the latest score card, trend charts, today's routine, and a next-check-in prompt. This is what users see most often.

By month 2 of a paid subscription, eight different card families want above-fold real estate on this screen. Without an explicit slot system, the dashboard becomes a cluttered scroll. This file owns the **card-stack contract** that every feature file declares its slot eligibility against.

---

## Card-Stack System (canonical for the whole spec)

The dashboard renders cards in fixed slots, each with one or more eligible card kinds. At render time the dashboard runs an evaluator that picks at most one card per slot based on a deterministic priority + eligibility check. Any feature file that wants to surface a card on the dashboard MUST register here.

### Slot inventory

```
┌──────────────────────────────────────────────────────────┐
│  [Header — greeting + Vela wordmark]                     │  fixed
├──────────────────────────────────────────────────────────┤
│  SLOT 1 — Live state                                     │  always renders
│    NextCheckInCard | StreakChip | TrialDaysLeft | etc.   │
├──────────────────────────────────────────────────────────┤
│  SLOT 2 — Insight (above the fold; max ONE card)         │  conditional
│    AgingBandCallout | PatternsNoticed | WrappedReady |   │
│    OnThisDay | FeatureReveal | LifeStageContext |        │
│    TrialForecast | LapsedDigestPreview                   │
├──────────────────────────────────────────────────────────┤
│  SLOT 3 — Score                                          │  always renders if data
│    ScoreCard (with sub-scores, deltas)                   │
├──────────────────────────────────────────────────────────┤
│  SLOT 4 — Trend                                          │  renders if ≥2 scans
│    TrendCharts (with optional aging band overlay)        │
├──────────────────────────────────────────────────────────┤
│  SLOT 5 — Routine                                        │  always renders                
│    RoutineSection (today's tasks + streak chip)          │
├──────────────────────────────────────────────────────────┤
│  SLOT 6 — Compare                                        │  renders if ≥2 scans
│    RecentComparisonCard                                  │
├──────────────────────────────────────────────────────────┤
│  SLOT 7 — Compound                                       │  renders if ≥30 days
│    CompoundEffortTile (file 45)                          │
└──────────────────────────────────────────────────────────┘
```

### The Slot 2 contract (the most important rule in this file)

Slot 2 is the only slot where multiple feature files compete for visibility. **At most one card renders here per dashboard session.** The eligibility evaluator runs once per dashboard mount and picks the winner using this deterministic priority:

| Priority | Card kind | Eligibility | Owner |
|---:|---|---|---|
| 1 | `LapsedDigestPreview` | `subscription_status === 'lapsed-readonly'` | file 46 |
| 2 | `TrialForecast` | day 7-8 of trial AND not yet engaged | file 41 |
| 3 | `WrappedReady` | day 1-7 of new month AND has Wrapped for last month | file 38 |
| 4 | `FeatureReveal` | next eligible reveal per file 43, AND no other slot 2 card eligible AND ≥7 days since last reveal | file 43 |
| 5 | `LifeStageContext` | active life-stage mode AND first dashboard view since enable | file 48 |
| 6 | `OnThisDay` | ≥90 days of data AND a meaningful match for today | file 45 |
| 7 | `PatternsNoticed` | HealthKit + ≥6 weeks data AND new correlation since last view | file 33 |
| 8 | `AgingBandCallout` | latest scan outside the band on a controllable metric | file 36 |
| 9 | none | (Slot 2 hides) | — |

The evaluator picks the highest-priority eligible card. **All other Slot 2 candidates are silently suppressed for that session.** The next dashboard mount re-evaluates.

### Card-emission rules (every feature file MUST follow)

If a feature file wants to surface a card on the dashboard, it must:

1. **Declare the slot it targets.** Slots 1, 2, 6, or 7. (Slots 3-5 are reserved for the canonical screens.)
2. **Define an `isEligible(ctx: DashboardContext): boolean` predicate.** Pure function, deterministic, ≤30ms.
3. **Define a `priority` value** (Slot 2 only — see table above).
4. **Define a `cooldownDays` value.** How many days after dismissal/engagement before re-eligible.
5. **Declare exclusion rules.** Cards that suppress this one (e.g., `LifeStageContext` suppresses `AgingBandCallout` because the band is overridden in modes).

The `DashboardContext` passed to evaluators contains: `daysSinceSignup`, `scansCount`, `consecutiveRoutineDays`, `subscriptionStatus`, `activeLifeStageModes`, `hasHealthKitConnected`, `latestScan`, `iosVersionMajor`, `now`. No file may add to this without updating the canonical type below.

### Type

```typescript
// src/types/dashboard.ts
// Add to 02_TYPES_AND_MODELS.md.

export type DashboardSlotId = 'live' | 'insight' | 'score' | 'trend' | 'routine' | 'compare' | 'compound';

export interface DashboardCardEligibility {
  cardKind: string;                  // unique across all files
  slot: DashboardSlotId;
  priority: number;                  // lower = higher priority; Slot 2 uses table above
  cooldownDays: number;              // days after dismiss/engage before re-eligible
  excludes: string[];                // cardKinds this one suppresses
  isEligible: (ctx: DashboardContext) => boolean;
  ownerFile: string;                 // 'file_38_wrapped' etc., for traceability
}

export interface DashboardContext {
  userId: string;
  daysSinceSignup: number;
  scansCount: number;
  consecutiveRoutineDays: number;
  subscriptionStatus: 'trial' | 'active' | 'lapsed-grace' | 'lapsed-readonly' | 'cancelled';
  activeLifeStageModes: LifeStageModeId[];
  hasHealthKitConnected: boolean;
  latestScan?: { capturedAt: string; primaryMetric: FaceMetric; positionVsBand: 'inside' | 'above' | 'below' };
  iosVersionMajor: number;
  now: Date;
}

export interface DashboardCardRenderRecord {
  userId: string;
  cardKind: string;
  shownAt: string;
  outcome: 'shown' | 'engaged' | 'dismissed';
}
```

The evaluator reads `DashboardCardRenderRecord` history to enforce cooldowns. Every card emission generates one row.

### The week-by-week visibility map (the simplification)

For the team and for QA, this is the practical sequencing the contract produces:

| Week | What's visible by default in slot 2 |
|---|---|
| Week 1 (trial) | nothing in Slot 2 unless TrialForecast on day 7–8 |
| Week 2-3 | nothing unless feature reveal eligible |
| Week 4 | first feature reveal (Apple Health Vital ask, file 33) |
| Week 5 | first comparison reveal (file 11/43) |
| Week 6 | aging band overlay reveal (file 36/43); after this, AgingBandCallout becomes eligible |
| Week 7-8 | settled state; PatternsNoticed eligible if HealthKit |
| Month 1 day 1-7 | WrappedReady wins Slot 2 |
| Anniversary days | OnThisDay wins (lower priority but no other competitor on that day) |

QA check: "On any given day, how many things are competing for the user's attention above the fold?" Answer must be: header + Slot 1 + Slot 2 + score = 4. Never more.

### Anti-clutter rules

- **A card never re-shows in the same session after dismiss.** `cooldownDays` only governs days, not sessions.
- **Slot 2 is empty for new users for the first 6 days.** No reveals, no callouts. Just score + routine + trend.
- **Trial users never see FeatureReveal cards in Slot 2.** Reveals begin at week 4 paid (per file 43).
- **Lapsed-readonly users see only `LapsedDigestPreview` in Slot 2 (the highest priority).** All other cards are suppressed.
- **A user who toggles "minimize dashboard" in Settings** (a future toggle, not v1) hides Slot 2 entirely.

### Implementation reference

```typescript
// src/screens/dashboard/cardStackEvaluator.ts
import { DashboardCardEligibility, DashboardContext } from '@/types/dashboard';

// Each feature file exports its eligibility object. Aggregated here:
import { lapsedDigestEligibility } from '@/screens/dashboard/cards/LapsedDigest'; // file 46
import { trialForecastEligibility } from '@/screens/dashboard/cards/TrialForecast'; // file 41
import { wrappedReadyEligibility } from '@/screens/dashboard/cards/WrappedReady'; // file 38
import { featureRevealEligibility } from '@/screens/dashboard/cards/FeatureReveal'; // file 43
import { lifeStageContextEligibility } from '@/screens/dashboard/cards/LifeStageContext'; // file 48
import { onThisDayEligibility } from '@/screens/dashboard/cards/OnThisDay'; // file 45
import { patternsNoticedEligibility } from '@/screens/dashboard/cards/PatternsNoticed'; // file 33
import { agingBandCalloutEligibility } from '@/screens/dashboard/cards/AgingBandCallout'; // file 36

const SLOT_2_CANDIDATES: DashboardCardEligibility[] = [
  lapsedDigestEligibility,    // priority 1
  trialForecastEligibility,   // priority 2
  wrappedReadyEligibility,    // priority 3
  featureRevealEligibility,   // priority 4
  lifeStageContextEligibility,// priority 5
  onThisDayEligibility,       // priority 6
  patternsNoticedEligibility, // priority 7
  agingBandCalloutEligibility,// priority 8
];

export function pickSlot2Card(ctx: DashboardContext, history: DashboardCardRenderRecord[]): DashboardCardEligibility | null {
  const sorted = [...SLOT_2_CANDIDATES].sort((a, b) => a.priority - b.priority);
  for (const candidate of sorted) {
    if (!isWithinCooldown(candidate, history) && candidate.isEligible(ctx)) {
      // Check exclusions: if a higher-priority card already won, this one is suppressed.
      // (Already handled by sort order; explicit excludes only matter for sibling-level pruning.)
      return candidate;
    }
  }
  return null;
}
```

The lint rule: any new file that exports a `DashboardCardEligibility` object must register itself in `SLOT_2_CANDIDATES` (or the right slot's array) AND add a row to the priority table above. CI fails if a card is exported but unregistered.

---

## Dashboard Screen

```typescript
// app/(main)/dashboard.tsx
import { ScrollView, StyleSheet, RefreshControl, View, Text } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScoreCard } from '@/components/dashboard/ScoreCard';
import { TrendCharts } from '@/components/dashboard/TrendCharts';
import { NextCheckInCard } from '@/components/dashboard/NextCheckInCard';
import { RoutineSection } from '@/components/dashboard/RoutineSection';
import { RecentComparisonCard } from '@/components/dashboard/RecentComparisonCard';
import { useScanStore } from '@/stores/scanStore';
import { useAppState } from '@/stores/appStateStore';
import { useColors } from '@/theme/ThemeContext';
import { Spacing, Radii } from '@/theme/spacing';
import { Typography } from '@/theme/typography';

export default function Dashboard() {
  const colors = useColors();
  const { latestSession, sessions, loadSessions } = useScanStore();
  const { user } = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    if (user) {
      loadSessions(user.id);
    }
  }, [user]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    if (user) await loadSessions(user.id);
    setRefreshing(false);
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.default} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.brand}>Vela</Text>
        </View>
        
        <NextCheckInCard />
        
        {latestSession && <ScoreCard scores={latestSession.scores} />}
        
        {sessions.length >= 2 && <TrendCharts sessions={sessions} />}
        
        {sessions.length >= 2 && <RecentComparisonCard sessions={sessions} />}
        
        <RoutineSection />
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Inline styles in component since it's short; move inside function
// const colors = useColors();
// return (
//   <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background.primary }, styles.container]}>
// const styles = StyleSheet.create({
//   content: { padding: Spacing.lg, gap: Spacing.lg },
//   header: { paddingHorizontal: Spacing.xxs, marginBottom: Spacing.xxs },
//   greeting: { ...Typography.caption },
//   brand: { ...Typography.title },
// });
```

---

## Score Card

```typescript
// src/components/dashboard/ScoreCard.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { ScanScores } from '@/types/scan';
import { useColors } from '@/theme/ThemeContext';

interface Props {
  scores: ScanScores;
}

export function ScoreCard({ scores }: Props) {
  const colors = useColors();
  const [expandedSubScore, setExpandedSubScore] = useState<string | null>(null);
  
  const overallDelta = scores.previousOverall ? scores.overall - scores.previousOverall : null;
  
  return (
    <View style={styles.container}>
      {/* Main score */}
      <View style={styles.scoreSection}>
        <Text style={styles.scoreNumber}>{scores.overall}</Text>
        {overallDelta !== null && overallDelta !== 0 && (
          <View style={[styles.deltaBadge, overallDelta > 0 ? styles.deltaBadgePositive : styles.deltaBadgeNegative]}>
            <Ionicons
              name={overallDelta > 0 ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={overallDelta > 0 ? colors.success.default : colors.error.default}
            />
            <Text style={[styles.deltaText, { color: overallDelta > 0 ? colors.success.default : colors.error.default }]}>
              {Math.abs(overallDelta)} this week
            </Text>
          </View>
        )}
        <Text style={styles.scoreLabel}>Your Vela score</Text>
      </View>
      
      {/* Sub-scores */}
      <View style={styles.subScores}>
        <SubScoreColumn 
          name="Skin" 
          value={scores.skin} 
          previous={scores.previousSkin}
          explanation={scores.skinExplanation}
          color={colors.subScore.skin}
          isExpanded={expandedSubScore === 'skin'}
          onPress={() => setExpandedSubScore(expandedSubScore === 'skin' ? null : 'skin')}
        />
        <SubScoreColumn 
          name="Symmetry" 
          value={scores.symmetry} 
          previous={scores.previousSymmetry}
          explanation={scores.symmetryExplanation}
          color={colors.subScore.symmetry}
          isExpanded={expandedSubScore === 'symmetry'}
          onPress={() => setExpandedSubScore(expandedSubScore === 'symmetry' ? null : 'symmetry')}
        />
        <SubScoreColumn 
          name="Definition" 
          value={scores.definition} 
          previous={scores.previousDefinition}
          explanation={scores.definitionExplanation}
          color={colors.subScore.definition}
          isExpanded={expandedSubScore === 'definition'}
          onPress={() => setExpandedSubScore(expandedSubScore === 'definition' ? null : 'definition')}
        />
        <SubScoreColumn 
          name="Vitality" 
          value={scores.vitality} 
          previous={scores.previousVitality}
          explanation={scores.vitalityExplanation}
          color={colors.subScore.vitality}
          isExpanded={expandedSubScore === 'vitality'}
          onPress={() => setExpandedSubScore(expandedSubScore === 'vitality' ? null : 'vitality')}
        />
        <SubScoreColumn 
          name="Grooming" 
          value={scores.grooming} 
          previous={scores.previousGrooming}
          explanation={scores.groomingExplanation}
          color={colors.subScore.grooming}
          isExpanded={expandedSubScore === 'grooming'}
          onPress={() => setExpandedSubScore(expandedSubScore === 'grooming' ? null : 'grooming')}
        />
      </View>
      
      {/* Expanded explanation */}
      {expandedSubScore && (
        <View style={styles.expandedExplanation}>
          <Text style={styles.expandedTitle}>
            {expandedSubScore.charAt(0).toUpperCase() + expandedSubScore.slice(1)}
          </Text>
          <Text style={styles.expandedText}>
            {getExplanation(scores, expandedSubScore) || 'No change this week.'}
          </Text>
        </View>
      )}
      
      {/* Overall summary */}
      {scores.overallSummary && (
        <View style={styles.summary}>
          <Ionicons name="sparkles" size={14} color={colors.accent.default} />
          <Text style={styles.summaryText}>{scores.overallSummary}</Text>
        </View>
      )}
    </View>
  );
}

function SubScoreColumn({ name, value, previous, explanation, color, isExpanded, onPress }: any) {
  const delta = previous != null ? value - previous : null;
  
  return (
    <Pressable style={[styles.subScore, isExpanded && styles.subScoreExpanded]} onPress={onPress}>
      <View style={[styles.subScoreColorBar, { backgroundColor: color }]} />
      <Text style={styles.subScoreValue}>{value}</Text>
      {delta != null && delta !== 0 && (
        <Text style={[styles.subScoreDelta, { color: delta > 0 ? Colors.success : '#E8A598' }]}>
          {delta > 0 ? '+' : ''}{delta}
        </Text>
      )}
      <Text style={styles.subScoreName}>{name}</Text>
    </Pressable>
  );
}

function getExplanation(scores: ScanScores, key: string): string | undefined {
  switch (key) {
    case 'skin': return scores.skinExplanation;
    case 'symmetry': return scores.symmetryExplanation;
    case 'definition': return scores.definitionExplanation;
    case 'vitality': return scores.vitalityExplanation;
    case 'grooming': return scores.groomingExplanation;
    default: return undefined;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  scoreSection: { alignItems: 'center', gap: Spacing.xxs },
  scoreNumber: { fontSize: 80, fontWeight: '700', color: colors.accent.default },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.lg,
  },
  deltaBadgePositive: { backgroundColor: colors.success.background },
  deltaBadgeNegative: { backgroundColor: colors.error.background },
  deltaText: { fontSize: 13, fontWeight: '600' },
  scoreLabel: { ...Typography.caption, color: colors.text.secondary, marginTop: Spacing.xxs },
  subScores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: Spacing.xxs,
    borderTopColor: colors.border.subtle,
    paddingTop: Spacing.lg,
  },
  subScore: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  subScoreExpanded: { backgroundColor: colors.accent.background },
  subScoreColorBar: {
    width: 24,
    height: Spacing.xxs,
    borderRadius: Radii.sm,
    marginBottom: Spacing.sm,
  },
  subScoreValue: { fontSize: 18, fontWeight: '700' },
  subScoreDelta: { fontSize: 11, fontWeight: '600' },
  subScoreName: { ...Typography.caption, color: colors.text.secondary, marginTop: Spacing.xxs },
  expandedExplanation: {
    backgroundColor: colors.background.muted,
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.xxs,
  },
  expandedTitle: { ...Typography.label, color: colors.text.secondary },
  expandedText: { ...Typography.body, color: colors.text.primary, lineHeight: 20 },
  summary: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: colors.accent.background,
    padding: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'flex-start',
  },
  summaryText: { ...Typography.caption, color: colors.text.primary, flex: 1, lineHeight: 18, fontStyle: 'italic' },
});
```

---

## Trend Charts

```typescript
// src/components/dashboard/TrendCharts.tsx
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import { CartesianChart, Line, useChartPressState } from 'victory-native';
import { Circle, useFont } from '@shopify/react-native-skia';
import type { ScanSession } from '@/types/scan';
import type { SubScore } from '@/types/routine';
import { useColors } from '@/theme/ThemeContext';
import { Spacing, Radii } from '@/theme/spacing';
import { Typography } from '@/theme/typography';

interface Props {
  sessions: ScanSession[];
}

type TimeRange = '30d' | '90d' | 'all';

export function TrendCharts({ sessions }: Props) {
  const colors = useColors();
  const [selectedMetric, setSelectedMetric] = useState<SubScore>('overall');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  
  const filteredSessions = useMemo(() => filterByTimeRange(sessions, timeRange), [sessions, timeRange]);
  
  const data = useMemo(() => 
    filteredSessions.map((session, index) => ({
      week: index + 1,
      score: session.scores[selectedMetric === 'overall' ? 'overall' : selectedMetric] || 0,
    })),
    [filteredSessions, selectedMetric]
  );
  
  const minValue = Math.max(0, Math.min(...data.map((d) => d.score)) - 10);
  const maxValue = Math.min(100, Math.max(...data.map((d) => d.score)) + 10);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your progress</Text>
        
        <View style={styles.timeRangeSelector}>
          {(['30d', '90d', 'all'] as TimeRange[]).map((range) => (
            <Pressable
              key={range}
              style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>
                {range === '30d' ? '30D' : range === '90d' ? '90D' : 'All'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      
      {/* Metric chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.metricChips}>
          {(['overall', 'skin', 'symmetry', 'definition', 'vitality', 'grooming'] as SubScore[]).map((metric) => (
            <Pressable
              key={metric}
              style={[styles.metricChip, selectedMetric === metric && styles.metricChipActive]}
              onPress={() => setSelectedMetric(metric)}
            >
              <Text style={[styles.metricChipText, selectedMetric === metric && styles.metricChipTextActive]}>
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      
      {/* Chart */}
      <View style={styles.chartContainer}>
        <CartesianChart
          data={data}
          xKey="week"
          yKeys={['score']}
          domain={{ y: [minValue, maxValue] }}
          padding={{ left: Spacing.lg, right: Spacing.lg, top: Spacing.sm, bottom: Spacing.lg }}
        >
          {({ points }) => (
            <Line points={points.score} color={colors.accent.default} strokeWidth={2.5} />
          )}
        </CartesianChart>
      </View>
      
      {/* Stats summary */}
      <View style={styles.stats}>
        <Stat label="Current" value={data[data.length - 1]?.score.toString() || '—'} />
        <Stat label="Average" value={Math.round(data.reduce((s, d) => s + d.score, 0) / data.length).toString() || '—'} />
        <Stat label="Best" value={Math.max(...data.map((d) => d.score)).toString() || '—'} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function filterByTimeRange(sessions: ScanSession[], range: TimeRange): ScanSession[] {
  const now = Date.now();
  const cutoffs: Record<TimeRange, number> = {
    '30d': now - 30 * 86400 * 1000,
    '90d': now - 90 * 86400 * 1000,
    'all': 0,
  };
  
  return sessions
    .filter((s) => new Date(s.capturedAt).getTime() >= cutoffs[range])
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...Typography.subheadline },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background.muted,
    borderRadius: Radii.md,
    padding: Spacing.xxs,
  },
  timeRangeButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  timeRangeButtonActive: { backgroundColor: colors.background.secondary },
  timeRangeText: { ...Typography.caption, fontWeight: '600', color: colors.text.secondary },
  timeRangeTextActive: { color: colors.text.primary },
  metricChips: { flexDirection: 'row', gap: Spacing.sm },
  metricChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.xxl,
    backgroundColor: colors.background.muted,
  },
  metricChipActive: { backgroundColor: colors.accent.default },
  metricChipText: { ...Typography.caption, fontWeight: '600', color: colors.text.secondary },
  metricChipTextActive: { color: colors.text.inverse },
  chartContainer: { height: 180 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: Spacing.xxs,
    borderTopColor: colors.border.subtle,
    paddingTop: Spacing.md,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { ...Typography.caption, color: colors.text.secondary, marginTop: Spacing.xxs },
});
```

---

## Next Check-In Card

States this component must render (canonical):
1. **No scans yet** — `latestSession === null`. Returns `null`. Slot 1 stays empty (the score card / first-scan welcome handles it).
2. **No notification permission** — has `latestSession` but `notificationsEnabled === false`. Renders the date countdown only (no "We'll remind you" copy). One-time inline CTA: *"Want a reminder when it's time? Turn on notifications in Settings."*
3. **Notification permission granted** — full state: countdown + anchor-aware reminder text.
4. **Lapsed-readonly** — returns `null` (Slot 1 handles look-back banner per file 46).

### First-scan orientation chip (one-time)

The dashboard renders an orientation chip only on the FIRST view after the baseline scan reveal. It explains what baseline scores mean, dismissable forever:

> *"These are your baseline numbers. They'll start to mean more next week, when there's something to compare them against."*

Persisted as `profile.flags.dashboardFirstScanChipDismissed = true` after dismiss.

### Sub-score expand/collapse rules

Tapping a sub-score expands it. Tapping a different sub-score while one is open closes the old + opens the new in the same render cycle. Implementation rule:
- 200ms ease-out on collapse, 200ms ease-out on expand.
- Reduce-motion: instant transitions.
- Only one sub-score expanded at a time.
- Tap the expanded sub-score again → collapses.

```typescript
// src/components/dashboard/NextCheckInCard.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useScanStore } from '@/stores/scanStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useColors } from '@/theme/ThemeContext';
import { Spacing, Radii, Layout } from '@/theme/spacing';
import { Typography } from '@/theme/typography';
import { differenceInDays, addDays, format } from 'date-fns';

export function NextCheckInCard() {
  const colors = useColors();
  const router = useRouter();
  const { latestSession } = useScanStore();
  const { hasPermission } = useNotificationStore();
  
  if (!latestSession) return null;
  
  const lastCapture = new Date(latestSession.capturedAt);
  const nextCheckIn = addDays(lastCapture, 7);
  const daysUntil = differenceInDays(nextCheckIn, new Date());
  
  // Determine state
  const isOverdue = daysUntil < 0;
  const isToday = daysUntil === 0;
  const isTomorrow = daysUntil === 1;
  
  let title: string;
  let subtitle: string;
  let actionLabel: string;
  let isUrgent = false;
  
  if (isOverdue) {
    title = `Check-in is ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} overdue`;
    subtitle = "Skipping check-ins makes future comparisons less reliable";
    actionLabel = 'Capture now';
    isUrgent = true;
  } else if (isToday) {
    title = "Today's check-in";
    subtitle = "Take 90 seconds to capture this week's data";
    actionLabel = 'Capture now';
    isUrgent = true;
  } else if (isTomorrow) {
    title = "Check-in tomorrow";
    subtitle = format(nextCheckIn, "EEEE 'at' h:mm a");
    actionLabel = 'View';
  } else {
    title = `Next check-in in ${daysUntil} days`;
    subtitle = format(nextCheckIn, "EEEE, MMM d");
    actionLabel = 'View';
  }
  
  return (
    <Pressable
      style={[styles.card, isUrgent && styles.cardUrgent]}
      onPress={() => router.push('/(capture)/capture')}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={isUrgent ? 'camera' : 'calendar'}
          size={24}
          color={isUrgent ? colors.accent.default : colors.text.secondary}
        />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, isUrgent && styles.titleUrgent]}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      
      <View style={[styles.action, isUrgent && styles.actionUrgent]}>
        <Text style={[styles.actionText, isUrgent && styles.actionTextUrgent]}>
          {actionLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: Spacing.lg,
    borderRadius: Radii.xl,
    gap: Spacing.md,
  },
  cardUrgent: {
    backgroundColor: colors.accent.background,
    borderWidth: Spacing.xxs,
    borderColor: colors.accent.default,
  },
  iconContainer: {
    width: Layout.minTapTarget,
    height: Layout.minTapTarget,
    borderRadius: Radii.lg,
    backgroundColor: colors.background.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  title: { ...Typography.body, fontWeight: '600' },
  titleUrgent: { color: colors.accent.default },
  subtitle: { ...Typography.caption, color: colors.text.secondary, marginTop: Spacing.xxs },
  action: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
    backgroundColor: colors.background.muted,
  },
  actionUrgent: { backgroundColor: colors.accent.default },
  actionText: { ...Typography.caption, fontWeight: '600' },
  actionTextUrgent: { color: colors.text.inverse },
});
```

---

## Recent Comparison Card

```typescript
// src/components/dashboard/RecentComparisonCard.tsx
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ScanSession } from '@/types/scan';
import { useColors } from '@/theme/ThemeContext';
import { Spacing, Radii, Layout } from '@/theme/spacing';
import { Typography } from '@/theme/typography';
import { format } from 'date-fns';

interface Props {
  sessions: ScanSession[];
}

export function RecentComparisonCard({ sessions }: Props) {
  const colors = useColors();
  const router = useRouter();
  
  if (sessions.length < 2) return null;
  
  const sorted = [...sessions].sort((a, b) => 
    new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
  );
  
  const latest = sorted[0];
  const baseline = sorted[sorted.length - 1];
  
  const baselineUri = `${FileSystem.documentDirectory}VelaPhotos/${baseline.frontPhotoPath}`;
  const latestUri = `${FileSystem.documentDirectory}VelaPhotos/${latest.frontPhotoPath}`;
  
  const overallDelta = latest.scores.overall - baseline.scores.overall;
  
  return (
    <Pressable style={styles.card} onPress={() => router.push('/(main)/compare')}>
      <View style={styles.header}>
        <Text style={styles.title}>Your transformation</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
      </View>
      
      <View style={styles.imageRow}>
        <View style={styles.imageColumn}>
          <Image source={{ uri: baselineUri }} style={styles.image} resizeMode="cover" />
          <Text style={styles.dateLabel}>{format(new Date(baseline.capturedAt), 'MMM d')}</Text>
          <Text style={styles.weekLabel}>Baseline</Text>
        </View>
        
        <View style={styles.arrow}>
          <Ionicons name="arrow-forward" size={20} color={colors.accent.default} />
          {overallDelta !== 0 && (
            <Text style={[styles.deltaText, overallDelta > 0 && styles.deltaPositive]}>
              {overallDelta > 0 ? '+' : ''}{overallDelta}
            </Text>
          )}
        </View>
        
        <View style={styles.imageColumn}>
          <Image source={{ uri: latestUri }} style={styles.image} resizeMode="cover" />
          <Text style={styles.dateLabel}>{format(new Date(latest.capturedAt), 'MMM d')}</Text>
          <Text style={styles.weekLabel}>Week {latest.weekNumber}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.background.secondary, borderRadius: Radii.xl, padding: Spacing.lg, gap: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...Typography.subheadline },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  imageColumn: { flex: 1, alignItems: 'center', gap: Spacing.xxs },
  image: { width: '100%', aspectRatio: Layout.portraitFaceAspectRatio, borderRadius: Radii.md, backgroundColor: colors.background.muted },
  dateLabel: { ...Typography.caption, fontWeight: '600' },
  weekLabel: { ...Typography.caption, color: colors.text.secondary },
  arrow: { alignItems: 'center', gap: Spacing.xxs },
  deltaText: { fontSize: 14, fontWeight: '700', color: colors.text.secondary },
  deltaPositive: { color: colors.success.default },
});
```

---

## Tab Layout

```typescript
// app/(main)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/theme/ThemeContext';

export default function MainTabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent.default,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.background.secondary,
          borderTopColor: colors.border.default,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="trending-up" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: 'Compare',
          tabBarIcon: ({ color, size }) => <Ionicons name="git-compare" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```
