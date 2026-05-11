/**
 * PrivacyShieldMark — minimal animated trust mark for the privacy primer.
 *
 * A shield outline draws in, then a tiny check stroke draws inside. Single
 * accent color, hairline weight, no decoration beyond the curve and check.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useColors } from '@/theme/ThemeContext';

const APath = Animated.createAnimatedComponent(Path);

export function PrivacyShieldMark({ size = 96 }: { size?: number }) {
  const colors = useColors();
  const shield = useSharedValue(360);
  const check = useSharedValue(60);

  useEffect(() => {
    shield.value = withTiming(0, { duration: 1100, easing: Easing.bezier(0.2, 0, 0, 1) });
    check.value = withDelay(900, withTiming(0, { duration: 500, easing: Easing.bezier(0.2, 0, 0, 1) }));
  }, [shield, check]);

  const shieldProps = useAnimatedProps(() => ({
    strokeDashoffset: shield.value,
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: check.value,
  }));

  return (
    <View style={{ width: size, height: size, alignSelf: 'flex-start' }}>
      <Svg width={size} height={size} viewBox="0 0 96 96">
        {/* Shield outline */}
        <APath
          d="M 48 8 L 80 20 L 80 48 C 80 66 66 80 48 88 C 30 80 16 66 16 48 L 16 20 Z"
          stroke={colors.text.primary}
          strokeWidth={1.4}
          strokeLinejoin="round"
          strokeDasharray={360}
          animatedProps={shieldProps}
          fill="none"
        />
        {/* Check */}
        <APath
          d="M 32 50 L 44 62 L 64 38"
          stroke={colors.accent.default}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={60}
          animatedProps={checkProps}
          fill="none"
        />
      </Svg>
    </View>
  );
}
