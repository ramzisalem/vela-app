/**
 * Relate — LazyFit-style commitment ladder.
 *
 * Three back-to-back relatable statements ("I forget my routine after a
 * week", "I can never tell if a product is actually working", "I want
 * proof, not opinions") — Yes/No taps. After each Yes, a soft InfoCard
 * appears with an empathetic stat for ~900ms before auto-advancing.
 *
 * Sits between scan-anchor and the computing/well-done/profile-ready
 * sequence. Builds psychological commitment without asking for anything new.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Button } from '@/components/ui/Button';
import { Body, Caption, Text } from '@/components/ui/Text';
import { OnboardingScene } from '@/components/onboarding/OnboardingScene';
import { EmphasisHeadline } from '@/components/onboarding/EmphasisHeadline';
import { InfoCard } from '@/components/onboarding/InfoCard';
import { SegmentedProgress } from '@/components/onboarding/SegmentedProgress';
import { useColors } from '@/theme/ThemeContext';
import { Spacing } from '@/theme/spacing';
import { AnimationDuration } from '@/theme/animations';

interface Statement {
  /** Headline with `**topic**` emphasis. */
  title: string;
  /** Optional illustration glyph rendered above the headline. */
  illustration: 'forget' | 'confused' | 'wantProof';
  /** Stat shown after a Yes tap. */
  reassureBody: string;
  reassureEyebrow: string;
}

const STATEMENTS: ReadonlyArray<Statement> = [
  {
    title: 'You forget your skincare routine after a **busy week**.',
    illustration: 'forget',
    reassureEyebrow: 'You’re not alone',
    reassureBody: '**78%** of new Vela users say the same. Weekly scans rebuild the habit.',
  },
  {
    title: 'You can’t tell if a product is **actually working**.',
    illustration: 'confused',
    reassureEyebrow: 'That’s exactly why we built this',
    reassureBody: 'Vela measures **12 metrics** every scan. The numbers will tell you.',
  },
  {
    title: 'You want **proof**, not opinions.',
    illustration: 'wantProof',
    reassureEyebrow: 'Same',
    reassureBody: 'Every score has a short explanation tied to **your face’s own baseline** — never a generic average.',
  },
];

/* ── Tiny line illustrations (SVG) ──────────────────────────────────── */

function Illustration({
  kind,
  size = 168,
}: {
  kind: Statement['illustration'];
  size?: number;
}) {
  const colors = useColors();
  const stroke = colors.text.primary;
  const accent = colors.accent.default;

  if (kind === 'forget') {
    // Calendar with question mark
    return (
      <Svg width={size} height={size} viewBox="0 0 160 160">
        <Path
          d="M 28 40 H 132 V 130 a 8 8 0 0 1 -8 8 H 36 a 8 8 0 0 1 -8 -8 Z"
          stroke={stroke}
          strokeWidth={2}
          fill="none"
        />
        <Path d="M 28 60 H 132" stroke={stroke} strokeWidth={2} />
        <Path d="M 52 28 V 50 M 108 28 V 50" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" />
        <Path
          d="M 70 90 q 0 -12 10 -12 q 10 0 10 10 q 0 8 -10 12 v 6"
          stroke={accent}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
        <Path d="M 80 116 v 1" stroke={accent} strokeWidth={4} strokeLinecap="round" />
      </Svg>
    );
  }
  if (kind === 'confused') {
    // Two bottles with a question mark between
    return (
      <Svg width={size} height={size} viewBox="0 0 160 160">
        <Path
          d="M 36 56 v -10 a 6 6 0 0 1 6 -6 h 16 a 6 6 0 0 1 6 6 v 10 v 60 a 8 8 0 0 1 -8 8 H 44 a 8 8 0 0 1 -8 -8 Z"
          stroke={stroke}
          strokeWidth={2}
          fill="none"
        />
        <Path d="M 36 76 H 64" stroke={stroke} strokeWidth={1.6} />
        <Path
          d="M 96 56 v -10 a 6 6 0 0 1 6 -6 h 16 a 6 6 0 0 1 6 6 v 10 v 60 a 8 8 0 0 1 -8 8 H 104 a 8 8 0 0 1 -8 -8 Z"
          stroke={stroke}
          strokeWidth={2}
          fill="none"
        />
        <Path d="M 96 76 H 124" stroke={stroke} strokeWidth={1.6} />
        <Path
          d="M 74 76 q 0 -8 6 -8 q 6 0 6 6 q 0 5 -6 7 v 4"
          stroke={accent}
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        />
        <Path d="M 80 94 v 1" stroke={accent} strokeWidth={3} strokeLinecap="round" />
      </Svg>
    );
  }
  // wantProof — magnifier over a small chart bar
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Path d="M 28 120 V 60" stroke={stroke} strokeWidth={2} />
      <Path d="M 28 120 H 138" stroke={stroke} strokeWidth={2} />
      <Path d="M 48 110 V 80" stroke={accent} strokeWidth={6} strokeLinecap="round" />
      <Path d="M 72 110 V 70" stroke={accent} strokeWidth={6} strokeLinecap="round" />
      <Path d="M 96 110 V 60" stroke={accent} strokeWidth={6} strokeLinecap="round" />
      <Path
        d="M 110 56 a 18 18 0 1 0 0.1 0.1 z"
        stroke={stroke}
        strokeWidth={2}
        fill="none"
      />
      <Path d="M 124 70 L 138 84" stroke={stroke} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

/* ── Screen ──────────────────────────────────────────────────────────── */

export default function Relate() {
  const router = useRouter();
  const colors = useColors();
  const [idx, setIdx] = useState(0);
  const [showReassure, setShowReassure] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (t.current) clearTimeout(t.current);
  }, []);

  const advance = () => {
    if (idx >= STATEMENTS.length - 1) {
      router.replace('/(onboarding)/computing' as never);
      return;
    }
    setShowReassure(false);
    setIdx((i) => i + 1);
  };

  const tapYes = () => {
    setShowReassure(true);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(advance, 1100);
  };

  const tapNo = () => {
    setShowReassure(false);
    advance();
  };

  const s = STATEMENTS[idx]!;

  return (
    <OnboardingScene
      footer={
        <View style={{ paddingBottom: Spacing.md, gap: Spacing.sm }}>
          <SegmentedProgress
            sectionIndex={idx}
            sectionCount={STATEMENTS.length}
            stepInSection={1}
            stepsInSection={1}
          />
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button label="No" variant="secondary" size="xl" fullWidth onPress={tapNo} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Yes" variant="dark" size="xl" fullWidth onPress={tapYes} />
            </View>
          </View>
        </View>
      }
    >
      <View style={{ flex: 1, justifyContent: 'space-between', paddingTop: Spacing.lg }}>
        <View style={{ alignItems: 'center', marginTop: Spacing.md }}>
          <Text variant="label" tone="tertiary" style={{ letterSpacing: 1.6 }}>
            Tell us
          </Text>
        </View>

        <Animated.View
          key={`illu-${idx}`}
          entering={FadeIn.duration(AnimationDuration.base)}
          style={{ alignItems: 'center' }}
        >
          <Illustration kind={s.illustration} size={180} />
        </Animated.View>

        <View style={{ gap: Spacing.lg }}>
          <Animated.View
            key={`title-${idx}`}
            entering={FadeInUp.duration(440).delay(80)}
          >
            <EmphasisHeadline size={28}>{s.title}</EmphasisHeadline>
          </Animated.View>

          {showReassure ? (
            <Animated.View entering={FadeIn.duration(280)}>
              <InfoCard
                tone="success"
                eyebrow={s.reassureEyebrow}
                body={s.reassureBody}
              />
            </Animated.View>
          ) : (
            <Body tone="tertiary" style={{ textAlign: 'center', color: colors.text.tertiary }}>
              Tap **Yes** if it sounds like you.
            </Body>
          )}
        </View>
      </View>
    </OnboardingScene>
  );
}
