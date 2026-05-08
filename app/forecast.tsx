/**
 * Day 7 forecast route (file 41).
 *
 * Shown on day 7 morning at 9 AM local. Pinned for the rest of trial day 7
 * + day 8 to the dashboard via a tap-through. Also accessible from the
 * trial-end paywall as a "See what's coming" link.
 */
import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { ForecastCard } from '@/components/trial/ForecastCard';
import { useScanStore } from '@/stores/scanStore';
import { useProfileStore } from '@/stores/profileStore';
import { buildForecast, type Forecast } from '@/core/trial/forecast';
import { AIService } from '@/services/ai';
import { Body } from '@/components/ui/Text';

export default function ForecastRoute() {
  const router = useRouter();
  const sessions = useScanStore((s) => s.sessions);
  const profile = useProfileStore((s) => s.profile);
  const baseline = sessions[0];
  const daySeven = sessions[1];

  const [forecast, setForecast] = React.useState<Forecast | null>(null);

  React.useEffect(() => {
    if (!baseline || !profile) return;
    let cancelled = false;
    (async () => {
      const ai = await AIService.generateForecastCopy({
        baseline: baseline.scores,
        daySeven: daySeven?.scores,
        framework: profile.scoringFramework,
        ageDecade: profile.age ? Math.floor(profile.age / 10) * 10 : 30,
        hasHealthKit: false,
      });
      if (cancelled) return;
      setForecast(
        buildForecast({
          baselineScan: baseline,
          daySevenScan: daySeven,
          framework: profile.scoringFramework,
          ageDecade: profile.age ?? 30,
          hasHealthKit: false,
          aiCopy: ai ?? undefined,
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [baseline, daySeven, profile]);

  if (!baseline) {
    return (
      <Screen>
        <Body tone="secondary">A baseline scan is needed before the preview is meaningful.</Body>
      </Screen>
    );
  }

  if (!forecast) {
    return (
      <Screen>
        <Body tone="secondary">Building your preview…</Body>
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <ForecastCard
          forecast={forecast}
          onContinue={() => router.replace('/paywall')}
          onNoThanks={() => router.replace('/(main)/settings?cancelSave=true')}
        />
      </Screen>
    </>
  );
}
