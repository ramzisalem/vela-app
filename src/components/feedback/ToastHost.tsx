/**
 * ToastHost (file 22). Mounted at root layout. Renders the current toast at
 * the top of the screen with safe-area inset.
 */
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { Radii, Spacing } from '@/theme/spacing';
import { AnimationDuration } from '@/theme/animations';
import { useToastStore } from './toastService';

export function ToastHost() {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-12);

  useEffect(() => {
    if (current) {
      opacity.value = withTiming(1, { duration: AnimationDuration.micro });
      translateY.value = withTiming(0, { duration: AnimationDuration.micro });
    } else {
      opacity.value = withTiming(0, { duration: AnimationDuration.micro });
      translateY.value = withTiming(-12, { duration: AnimationDuration.micro });
    }
  }, [current, opacity, translateY]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!current) return null;

  const fill =
    current.variant === 'error'
      ? colors.error.background
      : current.variant === 'warning'
        ? colors.warning.background
        : current.variant === 'success'
          ? colors.success.background
          : colors.surface.raised;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + Spacing.sm,
        left: Spacing.base,
        right: Spacing.base,
      }}
      accessibilityLiveRegion={current.liveRegion}
    >
      <Animated.View style={animated}>
        <Pressable
          onPress={() => {
            current.onAction?.();
            dismiss();
          }}
          style={{
            backgroundColor: fill,
            borderRadius: Radii.lg,
            padding: Spacing.base,
            borderWidth: 0.5,
            borderColor: colors.border.default,
          }}
        >
          <Body>{current.message}</Body>
        </Pressable>
      </Animated.View>
    </View>
  );
}
