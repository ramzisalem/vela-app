/**
 * Well-done — LazyFit's pre-paywall dopamine release.
 *
 * Confetti rain + a big animated check + serif H1 ("**Well done.**") + a
 * single InfoCard with the personalised promise ("Your plan is ready").
 * Auto-advance to `profile-ready` after ~1.6s so the celebration lands,
 * but the user can tap the CTA to skip forward.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { Body } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { OnboardingScene } from '@/components/onboarding/OnboardingScene';
import { EmphasisHeadline } from '@/components/onboarding/EmphasisHeadline';
import { InfoCard } from '@/components/onboarding/InfoCard';
import { Confetti } from '@/components/onboarding/Confetti';
import { useColors } from '@/theme/ThemeContext';
import { Spacing } from '@/theme/spacing';

const APath = Animated.createAnimatedComponent(Path);

function BigCheck({ size = 132 }: { size?: number }) {
  const colors = useColors();
  const scale = useSharedValue(0);
  const draw = useSharedValue(60);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
    draw.value = withDelay(280, withTiming(0, { duration: 460, easing: Easing.bezier(0.2, 0, 0, 1) }));
  }, [scale, draw]);

  const ringStyle = { transform: [{ scale: 1 }] };
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: draw.value }));

  return (
    <Animated.View
      style={[
        ringStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.success.background,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 60 60">
        <Circle
          cx={30}
          cy={30}
          r={26}
          stroke={colors.success.default}
          strokeWidth={1.5}
          fill="none"
          opacity={0.35}
        />
        <APath
          d="M 18 31 L 27 40 L 44 22"
          stroke={colors.success.default}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={60}
          animatedProps={checkProps}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

export default function WellDone() {
  const router = useRouter();

  const go = () => router.replace('/(onboarding)/profile-ready' as never);

  return (
    <OnboardingScene
      footer={
        <View style={{ paddingBottom: Spacing.md }}>
          <Button label="See my plan" size="xl" fullWidth onPress={go} />
        </View>
      }
    >
      <Confetti count={70} />
      <View style={{ flex: 1, justifyContent: 'center', gap: Spacing.xl, paddingBottom: Spacing.huge }}>
        <Animated.View entering={FadeIn.duration(380)} style={{ alignItems: 'center' }}>
          <BigCheck />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(440).delay(180)}>
          <EmphasisHeadline size={36}>**Well done.**</EmphasisHeadline>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(440).delay(280)}>
          <Body tone="secondary" style={{ textAlign: 'center', fontSize: 16, lineHeight: 22 }}>
            You&rsquo;re off to an excellent start.
          </Body>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(440).delay(380)}>
          <InfoCard
            tone="recommend"
            eyebrow="Personalised for you"
            body="Your **weekly plan** is ready — built from everything you told us."
          />
        </Animated.View>
      </View>
    </OnboardingScene>
  );
}
