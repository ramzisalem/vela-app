/**
 * Slider compare (file 11). Drag to reveal "before" vs "after". Reduce
 * Motion (file 28) shows a static center divider with both labels.
 */
import React from 'react';
import { Image, View, type ViewStyle } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Caption } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';

export interface CompareSliderProps {
  fromUri: string;
  toUri: string;
  fromLabel: string;
  toLabel: string;
  height?: number;
  reduceMotion?: boolean;
}

const HANDLE_WIDTH = 4;
const HANDLE_KNOB = 36;

export function CompareSlider({
  fromUri,
  toUri,
  fromLabel,
  toLabel,
  height = 420,
  reduceMotion,
}: CompareSliderProps) {
  const colors = useColors();
  const [width, setWidth] = React.useState(1);
  const xValue = useSharedValue(0.5);

  const onLayout = (e: { nativeEvent: { layout: { width: number } } }) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const drag = Gesture.Pan().onChange((e) => {
    const next = Math.max(0.05, Math.min(0.95, xValue.value + e.changeX / Math.max(1, width)));
    xValue.value = next;
  });

  const overlayStyle = useAnimatedStyle((): ViewStyle => ({
    width: `${xValue.value * 100}%`,
  }));

  const knobStyle = useAnimatedStyle((): ViewStyle => ({
    left: xValue.value * Math.max(0, width - HANDLE_KNOB),
  }));

  React.useEffect(() => {
    if (reduceMotion) {
      runOnJS(() => undefined)();
      return;
    }
    xValue.value = withTiming(0.6, { duration: 800 });
  }, [reduceMotion, xValue]);

  return (
    <View
      onLayout={onLayout}
      style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: colors.background.tertiary }}
    >
      <Image source={{ uri: toUri }} style={{ position: 'absolute', width: '100%', height: '100%' }} />
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', height: '100%', overflow: 'hidden', left: 0 }, overlayStyle]}
      >
        <Image
          source={{ uri: fromUri }}
          style={{ width, height: '100%' }}
        />
      </Animated.View>
      <GestureDetector gesture={drag}>
        <View style={{ flex: 1 }}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: HANDLE_WIDTH,
                backgroundColor: '#FFFFFF',
                opacity: 0.95,
                left: '50%',
              },
              overlayStyle,
            ]}
          />
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: '50%',
                marginTop: -HANDLE_KNOB / 2,
                width: HANDLE_KNOB,
                height: HANDLE_KNOB,
                borderRadius: HANDLE_KNOB / 2,
                backgroundColor: '#FFFFFF',
              },
              knobStyle,
            ]}
          />
        </View>
      </GestureDetector>
      <View style={{ position: 'absolute', top: 12, left: 12 }}>
        <Caption tone="inverse">{fromLabel}</Caption>
      </View>
      <View style={{ position: 'absolute', top: 12, right: 12 }}>
        <Caption tone="inverse">{toLabel}</Caption>
      </View>
    </View>
  );
}
