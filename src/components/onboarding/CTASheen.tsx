/**
 * CTASheen — wraps a primary CTA with a subtle, continuous diagonal highlight
 * that sweeps across the gradient every ~5s. Reads as a soft glint, not a
 * gimmicky "press me" pulse. Pointer-events disabled so taps fall through.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Radii } from '@/theme/spacing';

export function CTASheen({
  children,
  style,
  /** Height the sheen mask should round to. Match the CTA height. */
  height = 64,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  height?: number;
}) {
  const t = useSharedValue(-1);

  useEffect(() => {
    t.value = withDelay(
      900,
      withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.bezier(0.2, 0, 0, 1) }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(t);
  }, [t]);

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 220 * t.value }],
  }));

  return (
    <View style={[{ position: 'relative' }, style]}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: Radii.pill, overflow: 'hidden', height, justifyContent: 'center' },
        ]}
      >
        <Animated.View
          style={[
            { width: 80, height: '160%', transform: [{ rotate: '14deg' }] },
            sheenStyle,
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.18)',
              'rgba(255,255,255,0)',
            ] as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
