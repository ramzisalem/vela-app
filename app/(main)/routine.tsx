/**
 * Routine tab (file 09). Sentence case throughout. Section markers
 * (Morning / Anytime / Evening) are serif italic.
 */
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Caption, DisplaySerif, SectionMarker, Body } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spacing, Radii } from '@/theme/spacing';
import { useColors } from '@/theme/ThemeContext';
import { useRoutineStore } from '@/stores/routineStore';
import { getTaskById } from '@/core/routine/taskLibrary';
import { todayISO } from '@/utils/dates';
import { useRouter } from 'expo-router';

const ORDER: ReadonlyArray<{ key: 'morning' | 'anytime' | 'evening'; label: string }> = [
  { key: 'morning', label: 'Morning' },
  { key: 'anytime', label: 'Anytime' },
  { key: 'evening', label: 'Evening' },
];

export default function Routine() {
  const router = useRouter();
  const colors = useColors();
  const routine = useRoutineStore((s) => s.currentRoutine);
  const toggle = useRoutineStore((s) => s.toggleTask);
  const today = todayISO();

  if (!routine || routine.tasks.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="Your routine, generated weekly."
          body="Take your baseline scan and we'll build something you'll actually keep."
          ctaLabel="Start scan"
          onCta={() => router.push('/(capture)/capture?isBaseline=true')}
        />
      </Screen>
    );
  }

  const tasksByTimeOfDay = ORDER.map((bucket) => ({
    bucket,
    tasks: routine.tasks
      .map((t) => ({ instance: t, def: getTaskById(t.taskId) }))
      .filter((t): t is { instance: typeof t.instance; def: ReturnType<typeof getTaskById> & {} } =>
        t.def?.timeOfDay === bucket.key,
      ),
  }));

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.base }}
      >
        <Caption tone="secondary">Today</Caption>
        <DisplaySerif>{`Week ${routine.weekNumber}.`}</DisplaySerif>
        {routine.personalizationNote ? (
          <Body tone="secondary">{routine.personalizationNote}</Body>
        ) : null}

        {tasksByTimeOfDay.map(({ bucket, tasks }) =>
          tasks.length === 0 ? null : (
            <View key={bucket.key} style={{ gap: Spacing.sm }}>
              <SectionMarker>{bucket.label}</SectionMarker>
              {tasks.map(({ instance, def }) => {
                const done = instance.completedDates.includes(today);
                return (
                  <Pressable
                    key={instance.taskId}
                    onPress={() => toggle(instance.taskId)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: done }}
                  >
                    <Card
                      style={{
                        borderColor: done ? colors.border.accent : colors.border.default,
                        backgroundColor: done ? colors.accent.background : colors.surface.raised,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: Spacing.base,
                        }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: Radii.pill,
                            borderWidth: 1.5,
                            borderColor: done ? colors.accent.default : colors.border.strong,
                            backgroundColor: done ? colors.accent.default : 'transparent',
                            marginTop: 2,
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Body tone={done ? 'accent' : 'primary'}>{def.title}</Body>
                          <Body tone="secondary" style={{ marginTop: Spacing.xxs }}>
                            {def.description}
                          </Body>
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          ),
        )}
      </ScrollView>
    </Screen>
  );
}
