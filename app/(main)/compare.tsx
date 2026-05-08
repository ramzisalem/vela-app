/**
 * Compare tab (file 11).
 *
 * Three modes: slider, side-by-side, difference. A small mode switcher at
 * the top toggles between them. Default `from` = oldest scan, default
 * `to` = newest. The scrubber lets the user pick any pair from the
 * full history, with `from` always strictly before `to`.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Body, Caption, DisplaySerif } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spacing } from '@/theme/spacing';
import { useScanStore } from '@/stores/scanStore';
import { CompareSlider } from '@/components/compare/CompareSlider';
import { CompareSideBySide } from '@/components/compare/CompareSideBySide';
import { CompareDifference } from '@/components/compare/CompareDifference';
import { CompareScrubber } from '@/components/compare/CompareScrubber';
import { useRouter } from 'expo-router';

type CompareMode = 'slider' | 'side' | 'difference';

const MODES: ReadonlyArray<{ id: CompareMode; label: string }> = [
  { id: 'slider', label: 'Slider' },
  { id: 'side', label: 'Side by side' },
  { id: 'difference', label: 'Difference' },
];

export default function Compare() {
  const router = useRouter();
  const sessions = useScanStore((s) => s.sessions);
  const ordered = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [sessions],
  );

  const [mode, setMode] = useState<CompareMode>('slider');
  const [fromIndex, setFromIndex] = useState(0);
  const [toIndex, setToIndex] = useState(Math.max(ordered.length - 1, 1));

  if (ordered.length < 2) {
    return (
      <Screen>
        <EmptyState
          title="Two scans, then we compare."
          body="One more weekly scan and your before-and-after opens up."
          ctaLabel="Take a scan"
          onCta={() => router.push('/(capture)/capture')}
        />
      </Screen>
    );
  }

  const fromSafe = Math.min(fromIndex, ordered.length - 2);
  const toSafe = Math.max(Math.min(toIndex, ordered.length - 1), fromSafe + 1);
  const from = ordered[fromSafe]!;
  const to = ordered[toSafe]!;

  const fromUri = from.photoPaths.front ?? '';
  const toUri = to.photoPaths.front ?? '';
  const delta = to.scores.overall - from.scores.overall;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingBottom: Spacing.xxxl,
          gap: Spacing.lg,
        }}
      >
        <Caption tone="secondary">{`Week ${from.weekNumber} \u2192 Week ${to.weekNumber}`}</Caption>
        <DisplaySerif>What changed.</DisplaySerif>

        <CompareScrubber
          sessions={ordered}
          fromIndex={fromSafe}
          toIndex={toSafe}
          onChange={({ fromIndex: f, toIndex: t }) => {
            setFromIndex(f);
            setToIndex(t);
          }}
        />

        <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
          {MODES.map((m) => (
            <Button
              key={m.id}
              label={m.label}
              size="sm"
              variant={mode === m.id ? 'primary' : 'secondary'}
              onPress={() => setMode(m.id)}
            />
          ))}
        </View>

        {mode === 'slider' ? (
          <CompareSlider
            fromUri={fromUri}
            toUri={toUri}
            fromLabel={`Wk ${from.weekNumber}`}
            toLabel={`Wk ${to.weekNumber}`}
          />
        ) : mode === 'side' ? (
          <CompareSideBySide
            fromUri={fromUri}
            toUri={toUri}
            fromLabel={`Wk ${from.weekNumber}`}
            toLabel={`Wk ${to.weekNumber}`}
          />
        ) : (
          <CompareDifference
            fromUri={fromUri}
            toUri={toUri}
            fromLabel={`Wk ${from.weekNumber}`}
            toLabel={`Wk ${to.weekNumber}`}
            scoreDelta={delta}
          />
        )}

        <Body tone="secondary">
          {delta > 0
            ? `Overall up ${delta} points.`
            : delta < 0
              ? `Overall down ${Math.abs(delta)} points.`
              : 'Overall steady this week.'}
        </Body>
      </ScrollView>
    </Screen>
  );
}
