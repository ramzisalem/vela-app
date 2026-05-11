/**
 * DevSkipFAB — floating "skip onboarding" button for testing only.
 *
 * Renders ONLY when `__DEV__` is true, so it's stripped from production
 * bundles. Lives in the top-right of any onboarding screen via the
 * onboarding stack layout.
 *
 * On press it marks onboarding complete in Zustand and replaces the route
 * to the main dashboard. Existing answers are preserved (so testers can
 * partially fill the questionnaire, then jump straight to the app).
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { Radii, Spacing } from '@/theme/spacing';
import { useOnboardingStore } from '@/stores/onboardingStore';

export function DevSkipFAB() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const setQuestionPhase = useOnboardingStore((s) => s.setQuestionPhase);

  if (!__DEV__) return null;

  const onPress = () => {
    setQuestionPhase('complete');
    router.replace('/(main)/dashboard');
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + Spacing.sm,
        right: Spacing.base,
        zIndex: 9999,
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Dev: skip onboarding"
        hitSlop={12}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 6,
          paddingHorizontal: Spacing.sm + 2,
          borderRadius: Radii.pill,
          backgroundColor: colors.text.primary,
          opacity: pressed ? 0.85 : 0.92,
        })}
      >
        <Ionicons name="bug-outline" size={12} color={colors.text.inverse} />
        <Text
          variant="label"
          style={{ color: colors.text.inverse, letterSpacing: 1.2, fontSize: 10 }}
        >
          Skip
        </Text>
      </Pressable>
    </View>
  );
}
