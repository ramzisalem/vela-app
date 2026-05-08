/**
 * Animated score ring used in score reveal + dashboard.
 *
 * Reduce Motion (file 28) renders the ring in its final state without
 * the count-up.
 */
import React, { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '@/theme/ThemeContext';
import { Text } from '@/components/ui/Text';
import { AnimationDuration } from '@/theme/animations';
import { Typography } from '@/theme/typography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  score: number;
  size?: number;
  stroke?: number;
}

export function ScoreRing({ score, size = 220, stroke = 8 }: Props) {
  const colors = useColors();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [displayed, setDisplayed] = React.useState(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      target.value = 1;
      setDisplayed(score);
      return;
    }
    target.value = withTiming(1, {
      duration: AnimationDuration.hero,
      easing: Easing.out(Easing.cubic),
    });
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / AnimationDuration.hero);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(score * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, reduceMotion, target]);

  const ringDerived = useDerivedValue(() => circumference * (1 - target.value * (score / 100)));

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: ringDerived.value,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border.subtle}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.accent.default}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}, ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text
        accessibilityLiveRegion="polite"
        style={{
          ...Typography.scoreNumeric,
          color: colors.text.primary,
          position: 'absolute',
        }}
      >
        {displayed}
      </Text>
    </View>
  );
}
