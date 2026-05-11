/**
 * AlignmentOverlay (file 05 — redesigned).
 *
 * Full-screen SVG overlay with:
 *  • Thin oval face-guide border
 *  • Four corner-bracket markers at the bounding-box corners (viewfinder style)
 *  • Copper progress arc that fills from 12 o'clock as hold-progress increases
 *  • Single scan-sweep shimmer when isReady first fires
 *  • Subtle breathing pulse on the brackets while a face is detected
 *
 * All pose gate colours (no-face / detecting / holding / ready) use the
 * Obsidian & Copper palette so the UI reads clearly against the dark preview.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, Path, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Oval bounding-box as fractions of screen size ────────────────────────────
const OL = 0.13; // left edge
const OR = 0.87; // right edge
const OT = 0.13; // top edge
const OB = 0.80; // bottom edge (from screen top)

const BRACKET_ARM = 30;    // arm length in points
const BRACKET_W   = 2.5;   // bracket stroke width
const ARC_STROKE  = 3.5;   // progress arc stroke width
const ARC_PADDING = 9;     // how far outside the oval the arc sits

/** Ramanujan approximation of ellipse perimeter (±0.04 % error). */
function ellipsePerimeter(rx: number, ry: number): number {
  const h = ((rx - ry) ** 2) / ((rx + ry) ** 2);
  return Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

export interface AlignmentOverlayProps {
  isReady: boolean;
  hasFace: boolean;
  /** 0…1 while checks pass but native debounce has not fired yet. */
  holdProgress?: number;
  reduceMotion?: boolean;
}

export function AlignmentOverlay({
  isReady,
  hasFace,
  holdProgress = 0,
  reduceMotion,
}: AlignmentOverlayProps) {
  const { width: W, height: H } = useWindowDimensions();

  // ── Oval geometry ────────────────────────────────────────────────────────
  const cx     = W / 2;
  const cy     = ((OT + OB) / 2) * H;
  const rx     = ((OR - OL) / 2) * W;
  const ry     = ((OB - OT) / 2) * H;
  const left   = OL * W;
  const right  = OR * W;
  const top    = OT * H;
  const bottom = OB * H;

  // Progress arc sits just outside the oval
  const arcRx    = rx + ARC_PADDING;
  const arcRy    = ry + ARC_PADDING;
  const perimeter = ellipsePerimeter(arcRx, arcRy);

  // ── Shared values ────────────────────────────────────────────────────────
  const progressAnim  = useSharedValue(0);
  const pulseScale    = useSharedValue(1);
  const scanOffset    = useSharedValue(0);
  const scanAlpha     = useSharedValue(0);

  const prevReadyRef = useRef(false);

  // Drive progress arc fill
  useEffect(() => {
    progressAnim.value = withTiming(holdProgress, {
      duration: 160,
      easing: Easing.out(Easing.quad),
    });
  }, [holdProgress, progressAnim]);

  // Bracket pulse + scan sweep
  useEffect(() => {
    if (!hasFace) {
      pulseScale.value = withTiming(1, { duration: 300 });
      return;
    }

    if (isReady) {
      pulseScale.value = withTiming(1, { duration: 150 });

      // Scan sweep fires once when isReady transitions false → true
      if (!prevReadyRef.current && !reduceMotion) {
        scanOffset.value = 0;
        scanAlpha.value = withSequence(
          withTiming(1,   { duration: 80  }),
          withTiming(0.9, { duration: 380 }),
          withTiming(0,   { duration: 200 }),
        );
        scanOffset.value = withTiming(1, {
          duration: 580,
          easing: Easing.inOut(Easing.quad),
        });
      }
    } else if (!reduceMotion) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.013, { duration: 950 }),
          withTiming(1,     { duration: 950 }),
        ),
        -1,
        true,
      );
    }

    prevReadyRef.current = isReady;
  }, [isReady, hasFace, reduceMotion, pulseScale, scanOffset, scanAlpha]);

  // ── Animated props ───────────────────────────────────────────────────────

  /** Only strokeDashoffset goes through the worklet; colour re-renders on JS side. */
  const arcAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: perimeter * (1 - progressAnim.value),
  }));

  const ovalAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const scanStyle = useAnimatedStyle(() => ({
    opacity: scanAlpha.value,
    transform: [{ translateY: scanOffset.value * (bottom - top) }],
  }));

  // ── Derived colours (JS re-render is fine for these) ────────────────────
  const ovalStroke = isReady
    ? '#C77F4A'
    : hasFace
    ? 'rgba(255,255,255,0.40)'
    : 'rgba(255,255,255,0.16)';

  const bracketStroke = isReady
    ? '#C77F4A'
    : hasFace
    ? 'rgba(255,255,255,0.85)'
    : 'rgba(255,255,255,0.30)';

  const arcColor = isReady
    ? '#C77F4A'
    : holdProgress > 0.04
    ? 'rgba(199,127,74,0.80)'
    : 'rgba(255,255,255,0.08)';

  // ── Corner bracket SVG paths ─────────────────────────────────────────────
  const a   = BRACKET_ARM;
  const tlPath = `M ${left + a},${top}     L ${left},${top}     L ${left},${top + a}`;
  const trPath = `M ${right - a},${top}    L ${right},${top}    L ${right},${top + a}`;
  const blPath = `M ${left + a},${bottom}  L ${left},${bottom}  L ${left},${bottom - a}`;
  const brPath = `M ${right - a},${bottom} L ${right},${bottom} L ${right},${bottom - a}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">

      {/* SVG layer: oval + brackets + progress arc */}
      <Animated.View style={[StyleSheet.absoluteFill, ovalAnim]}>
        <Svg width={W} height={H}>

          {/* Thin base oval */}
          <Ellipse
            cx={cx} cy={cy} rx={rx} ry={ry}
            fill="none"
            stroke={ovalStroke}
            strokeWidth={1}
          />

          {/* Progress arc — rotated so it starts at 12 o'clock */}
          <G transform={`rotate(-90, ${cx}, ${cy})`}>
            <AnimatedEllipse
              cx={cx} cy={cy} rx={arcRx} ry={arcRy}
              fill="none"
              stroke={arcColor}
              strokeWidth={ARC_STROKE}
              strokeDasharray={perimeter}
              strokeLinecap="round"
              animatedProps={arcAnimatedProps}
            />
          </G>

          {/* Corner brackets */}
          <G
            stroke={bracketStroke}
            strokeWidth={BRACKET_W}
            strokeLinecap="round"
            fill="none"
          >
            <Path d={tlPath} />
            <Path d={trPath} />
            <Path d={blPath} />
            <Path d={brPath} />
          </G>

        </Svg>
      </Animated.View>

      {/* Scan sweep: copper shimmer line slides from top to bottom of oval */}
      {!reduceMotion && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: left + 16,
              right: W - right + 16,
              top,
              height: 2.5,
              borderRadius: 2,
            },
            scanStyle,
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(199,127,74,0.90)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

    </View>
  );
}
