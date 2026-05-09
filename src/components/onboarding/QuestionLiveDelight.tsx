import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { Question } from '@/core/onboarding/questions';
import { getQuestionLiveDelight } from '@/core/onboarding/delightContent';
import { sliceVizForQuestion } from '@/core/onboarding/delightVizSlice';
import { AnimationDuration } from '@/theme/animations';
import { Body, Text } from '@/components/ui/Text';
import { Spacing } from '@/theme/spacing';
import { DelightDataViz, DelightGlassFrame } from '@/components/onboarding/DelightDataViz';

export function QuestionLiveDelight({ question, value }: { question: Question; value: unknown }) {
  const d = getQuestionLiveDelight(question, value);
  if (!d) return null;

  return (
    <Animated.View
      key={`live-delight-${question.id}-${JSON.stringify(value)}`}
      entering={FadeInUp.duration(AnimationDuration.base)}
      style={{ marginBottom: Spacing.md }}
    >
      <DelightGlassFrame>
        <View style={{ padding: Spacing.base, paddingTop: Spacing.lg }}>
          <Text variant="caption" tone="accent" style={{ marginBottom: Spacing.xs, letterSpacing: 0.4 }}>
            {d.headline}
          </Text>
          <Body tone="primary" style={{ fontSize: 15, lineHeight: 22 }}>
            {d.fact}
          </Body>
          <View style={{ marginHorizontal: -4 }}>
            <DelightDataViz spec={sliceVizForQuestion(d.viz, question.id)} />
          </View>
        </View>
      </DelightGlassFrame>
    </Animated.View>
  );
}
