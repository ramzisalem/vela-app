/**
 * "What's new in Vela" — recovery surface (file 43).
 *
 * Lists every reveal grouped by:
 *   - Active / engaged
 *   - Dismissed (recoverable)
 *   - Locked / upcoming (name-only)
 *
 * Mode-suppressed features show an honest informational label.
 */
import React from 'react';
import { ScrollView, View, Pressable, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { HeadlineSerif, Body, Caption } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { useColors } from '@/theme';
import { useFeatureRevealStore } from '@/stores/featureRevealStore';
import { REVEAL_CALENDAR } from '@/core/featureReveals/calendar';
import { useLifeStageStore } from '@/stores/lifeStageStore';
import type { FeatureReveal, FeatureRevealId } from '@/types/featureReveal';

export default function WhatsNew() {
  const colors = useColors();
  const router = useRouter();
  const history = useFeatureRevealStore((s) => s.history);
  const globallyEnabled = useFeatureRevealStore((s) => s.globallyEnabled);
  const setGloballyEnabled = useFeatureRevealStore((s) => s.setGloballyEnabled);
  const recordEngaged = useFeatureRevealStore((s) => s.recordEngaged);
  const activeModes = useLifeStageStore((s) => s.activeModes);

  const byId = new Map<FeatureRevealId, FeatureReveal>(history.map((h) => [h.id, h]));

  type Card = (typeof REVEAL_CALENDAR)[number];
  const groups = {
    active: [] as Card[],
    dismissed: [] as Card[],
    locked: [] as Card[],
  };
  for (const card of REVEAL_CALENDAR) {
    const past = byId.get(card.id);
    if (past?.status === 'engaged') groups.active.push(card);
    else if (past?.status === 'dismissed-once' || past?.status === 'dismissed-twice')
      groups.dismissed.push(card);
    else groups.locked.push(card);
  }

  function isModeSuppressed(card: Card) {
    return activeModes.some((m) => card.suppressedDuringModes.includes(m.id));
  }

  return (
    <Screen variant="secondary">
      <ScrollView contentContainerStyle={styles.container}>
        <HeadlineSerif>What’s new in Vela</HeadlineSerif>
        <Body tone="secondary" style={styles.intro}>
          Things you can use that you may not have explored yet.
        </Body>

        {groups.active.length > 0 ? (
          <Card style={styles.card}>
            <Caption tone="secondary" style={styles.section}>
              Active
            </Caption>
            {groups.active.map((card) => (
              <Row
                key={card.id}
                title={card.copy.headline.replace(/^Now’s a good time:\s*/i, '').replace(/\.$/, '')}
                subtitle="Currently set up"
                onPress={() => router.push(card.cta.route as never)}
              />
            ))}
          </Card>
        ) : null}

        {groups.dismissed.length > 0 ? (
          <Card style={styles.card}>
            <Caption tone="secondary" style={styles.section}>
              You hid these
            </Caption>
            {groups.dismissed.map((card) => (
              <Row
                key={card.id}
                title={card.copy.headline.replace(/^Now’s a good time:\s*/i, '').replace(/\.$/, '')}
                subtitle="Try it"
                onPress={() => {
                  recordEngaged(card.id);
                  router.push(card.cta.route as never);
                }}
              />
            ))}
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Caption tone="secondary" style={styles.section}>
            And the rest, as you grow
          </Caption>
          {groups.locked.map((card) => {
            const suppressed = isModeSuppressed(card);
            return (
              <View key={card.id} style={styles.lockedRow}>
                <Body tone={suppressed ? 'tertiary' : 'secondary'}>
                  · {card.copy.headline.replace(/^Now’s a good time:\s*/i, '').replace(/\.$/, '')}
                </Body>
                {suppressed ? (
                  <Caption tone="tertiary" style={styles.lockedNote}>
                    Available after your active mode ends.
                  </Caption>
                ) : null}
              </View>
            );
          })}
        </Card>

        <Card style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Body>Reveal cards on dashboard</Body>
              <Caption tone="secondary">A user who finds them intrusive can disable.</Caption>
            </View>
            <Switch value={globallyEnabled} onValueChange={setGloballyEnabled} />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Row({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border.subtle, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Body>{title}</Body>
        {subtitle ? <Caption tone="secondary">{subtitle}</Caption> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 24, paddingBottom: 64 },
  intro: { marginTop: 8, marginBottom: 16 },
  section: { marginBottom: 8 },
  card: { marginVertical: 8 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lockedRow: { paddingVertical: 6 },
  lockedNote: { marginTop: 2, marginLeft: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
});
