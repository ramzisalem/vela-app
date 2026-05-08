/**
 * Button (file 15) — the canonical Button component.
 *
 * Variants:
 *   - primary    : VelaPrimary 135° gradient (the only place gradient lives in UI)
 *   - secondary  : raised surface, espresso/bone text, hairline border
 *   - ghost      : no fill, accent text
 *   - destructive: error fill (rare)
 *
 * Tap target >= 44pt. Press triggers light haptic (selection).
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type GestureResponderEvent,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColors, useThemeMode } from '@/theme/ThemeContext';
import { VelaPrimary, gradientStopsForMode } from '@/theme/gradients';
import { Radii, Spacing, Layout } from '@/theme/spacing';
import { Text } from './Text';
import { SpringConfig, AnimationDuration } from '@/theme/animations';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const SIZE: Record<ButtonSize, { height: number; px: number; variant: 'body' | 'bodyEmphasis' | 'caption' }> = {
  sm: { height: 36, px: Spacing.base, variant: 'caption' },
  md: { height: Layout.tapTarget, px: Spacing.lg, variant: 'bodyEmphasis' },
  lg: { height: 56, px: Spacing.xl, variant: 'bodyEmphasis' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  iconLeft,
  iconRight,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const colors = useColors();
  const mode = useThemeMode();
  const scale = useSharedValue(1);
  const sizeSpec = SIZE[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, SpringConfig.responsive);
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: AnimationDuration.fast });
  };
  const handlePress = (e: GestureResponderEvent) => {
    if (disabled || loading) return;
    Haptics.selectionAsync().catch(() => undefined);
    onPress?.(e);
  };

  const textTone =
    variant === 'primary' || variant === 'destructive'
      ? 'inverse'
      : variant === 'ghost'
        ? 'accent'
        : 'primary';

  const inner = (
    <View style={styles.row}>
      {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
      {loading ? (
        <ActivityIndicator color={textTone === 'inverse' ? '#FFFFFF' : colors.text.primary} />
      ) : (
        <Text variant={sizeSpec.variant} tone={textTone}>
          {label}
        </Text>
      )}
      {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
    </View>
  );

  const baseStyle: ViewStyle = {
    height: sizeSpec.height,
    paddingHorizontal: sizeSpec.px,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.45 : 1,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  if (variant === 'primary') {
    const grad = gradientStopsForMode(VelaPrimary, mode);
    return (
      <Animated.View style={[animatedStyle, baseStyle, style, { padding: 0, overflow: 'hidden' }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled: !!disabled, busy: !!loading }}
          testID={testID}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={{ width: '100%', height: '100%' }}
        >
          <LinearGradient
            colors={grad.colors as unknown as string[]}
            locations={grad.locations as unknown as number[]}
            start={grad.start}
            end={grad.end}
            style={[StyleSheet.absoluteFill, { borderRadius: Radii.pill }]}
          />
          <View style={styles.center}>{inner}</View>
        </Pressable>
      </Animated.View>
    );
  }

  const fill =
    variant === 'destructive'
      ? colors.error.default
      : variant === 'ghost'
        ? 'transparent'
        : colors.surface.raised;
  const borderColor = variant === 'secondary' ? colors.border.default : 'transparent';
  const borderWidth = variant === 'secondary' ? Layout.hairline : 0;

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        testID={testID}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={[baseStyle, { backgroundColor: fill, borderColor, borderWidth }]}
      >
        {inner}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconLeft: { marginRight: Spacing.sm },
  iconRight: { marginLeft: Spacing.sm },
});
