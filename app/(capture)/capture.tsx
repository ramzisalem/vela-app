/**
 * Capture screen (file 05 — redesigned).
 *
 * Three-angle scan (front → left_turn → right_turn). Native ARKit module
 * emits real-time tracking state; the screen renders:
 *
 *  • Full-bleed camera view
 *  • AlignmentOverlay (SVG oval + corner brackets + progress arc + sweep)
 *  • Top gradient shell: X cancel · "N of 3" counter · title · pills · instruction
 *  • Bottom gradient shell: connected step indicator · shutter button · retake
 *
 * Recovery UX (file 05 SPEC_REVIEW_3):
 *   - Per-angle retake (max 2 retakes per session).
 *   - All-rejected restart.
 *   - Partial scan allowed with indicator; baseline always saved.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  InteractionManager,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Body, Caption, Headline } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { Spacing } from '@/theme/spacing';
import {
  VelaFaceTracker,
  VelaFaceTrackerView,
  type CaptureAngle,
  type CaptureResult,
  type FaceTrackingState,
} from '../../modules/vela-face-tracker/src';
import { AlignmentOverlay } from '@/components/capture/AlignmentOverlay';
import { CheckIndicators } from '@/components/capture/CheckIndicators';
import { ShutterButton } from '@/components/capture/ShutterButton';
import { AngleProgress } from '@/components/capture/AngleProgress';
import { PoseDebugHUD } from '@/components/capture/PoseDebugHUD';
import { scannerInstruction } from '@/components/capture/distanceHint';
import { processCaptureSession } from '@/core/scoring/scoringEngine';
import { useProfileStore } from '@/stores/profileStore';
import { useScanStore } from '@/stores/scanStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAppState } from '@/stores/appStateStore';
import { toast } from '@/components/feedback/toastService';

const ANGLES: ReadonlyArray<CaptureAngle> = ['front', 'left_turn', 'right_turn'];
const MAX_RETAKES_PER_SESSION = 2;

/** Let native preview + RN layout settle before AR emits. */
function awaitLayoutAndInteractions(): Promise<void> {
  return new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
}

const ANGLE_TITLE: Record<CaptureAngle, string> = {
  front:      'Face Forward',
  left_turn:  'Turn Left',
  right_turn: 'Turn Right',
};

const ANGLE_SUBTITLE: Record<CaptureAngle, string> = {
  front:      "Arm's length, eyes toward the camera",
  left_turn:  'Ease your head until the oval steadies',
  right_turn: 'Ease your head until the oval steadies',
};

// ─── Animated instruction pill ──────────────────────────────────────────────
function InstructionPill({ text }: { text: string }) {
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(6);

  useEffect(() => {
    opacity.value    = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.instructionWrap, style]}>
      <Body
        tone="inverse"
        style={{ textAlign: 'center', fontSize: 13, opacity: 0.88 }}
        accessibilityLiveRegion="polite"
      >
        {text}
      </Body>
    </Animated.View>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────
export default function CaptureScreen() {
  const router        = useRouter();
  const insets        = useSafeAreaInsets();
  const colors        = useColors();
  const { isBaseline } = useLocalSearchParams<{ isBaseline?: string }>();
  const profile       = useProfileStore((s) => s.profile);
  const completeBaseline = useAppState((s) => s.completeBaseline);
  const addSession    = useScanStore((s) => s.addSession);

  const [reduceMotion, setReduceMotion] = useState(false);
  const [angleIndex, setAngleIndex]     = useState(0);
  const [captures, setCaptures]         = useState<Partial<Record<CaptureAngle, CaptureResult>>>({});
  const [trackingState, setTrackingState] = useState<FaceTrackingState | null>(null);
  const [retakeCount, setRetakeCount]   = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const stoppedRef                      = useRef(false);
  const lastHoldProgressRef             = useRef(0);

  const exitCapture = useCallback(() => {
    if (isBaseline === 'true') {
      router.replace('/(onboarding)/permissions');
    } else {
      router.replace('/(main)/dashboard');
    }
  }, [router, isBaseline]);

  const currentAngle = ANGLES[angleIndex] ?? 'front';
  const captured     = ANGLES.filter((a) => captures[a]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exitCapture();
      return true;
    });
    return () => sub.remove();
  }, [exitCapture]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    setTrackingState(null);
  }, [currentAngle]);

  // Native session lifecycle
  useEffect(() => {
    let cancelled = false;
    const subRef = { current: null as { remove: () => void } | null };

    (async () => {
      const supported = await VelaFaceTracker.isSupported();
      if (cancelled) return;
      if (!supported) {
        toast.warning(
          'This device does not support TrueDepth face tracking. Vela requires iPhone X or later.',
        );
        return;
      }
      const granted = await VelaFaceTracker.requestPermission();
      if (cancelled) return;
      if (!granted) {
        toast.error('Camera access is needed for your scan. Open Settings to allow.');
        return;
      }
      if (cancelled) return;
      VelaFaceTracker.configure({ angle: currentAngle });
      const sub = VelaFaceTracker.addStateListener(setTrackingState);
      subRef.current = sub;
      await awaitLayoutAndInteractions();
      if (cancelled) {
        sub.remove();
        subRef.current = null;
        return;
      }
      await VelaFaceTracker.startSession(currentAngle);
      if (cancelled) {
        sub.remove();
        subRef.current = null;
        if (!stoppedRef.current) VelaFaceTracker.stopSession();
        return;
      }
    })();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
      if (!stoppedRef.current) VelaFaceTracker.stopSession();
    };
  }, [currentAngle]);

  useEffect(() => {
    const hp = trackingState?.readyHoldProgress ?? 0;
    if (hp >= 0.5 && lastHoldProgressRef.current < 0.5) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    lastHoldProgressRef.current = hp;
  }, [trackingState?.readyHoldProgress]);

  const onCapture = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Phase 1: native frame capture — failure here means genuinely bad frame → redo.
    let result: CaptureResult;
    try {
      result = await VelaFaceTracker.captureFrame();
    } catch (e) {
      if (__DEV__) console.warn('[capture] captureFrame failed:', e);
      toast.warning("That scan needs a quick redo. Try once more when you're ready.");
      setIsProcessing(false);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setCaptures((prev) => ({ ...prev, [currentAngle]: result }));

    if (angleIndex < ANGLES.length - 1) {
      setAngleIndex((i) => i + 1);
      setIsProcessing(false);
      return;
    }

    // Phase 2: all angles done — stop AR and score.
    stoppedRef.current = true;
    VelaFaceTracker.stopSession();
    try {
      await finishSession({ ...captures, [currentAngle]: result });
    } catch (e) {
      if (__DEV__) console.error('[capture] finishSession failed:', e);
      toast.error(
        __DEV__
          ? `Could not process scan: ${(e as Error).message ?? 'unknown'}`
          : "We couldn't process that scan. Please try again.",
      );
      exitCapture();
    } finally {
      setIsProcessing(false);
    }
  }, [angleIndex, captures, currentAngle, isProcessing, exitCapture]);

  const onRetake = useCallback(() => {
    if (retakeCount >= MAX_RETAKES_PER_SESSION) {
      toast.warning('Two retakes used for this session. Continuing with what we have.');
      return;
    }
    setRetakeCount((c) => c + 1);
    setCaptures((prev) => {
      const copy = { ...prev };
      delete copy[currentAngle];
      return copy;
    });
  }, [retakeCount, currentAngle]);

  async function finishSession(allCaptures: Partial<Record<CaptureAngle, CaptureResult>>) {
    let effectiveProfile = profile;
    if (!effectiveProfile) {
      const onboarding = useOnboardingStore.getState();
      const draftId    = onboarding.ensureDraftUserId();
      effectiveProfile = onboarding.composeProfile(draftId, undefined, {
        omitDeferredAnswers: true,
      });
      useProfileStore.getState().setProfile(effectiveProfile);
    }

    const angles = (Object.entries(allCaptures) as [CaptureAngle, CaptureResult][]).map(
      ([angle, capture]) => ({ angle, capture }),
    );
    const isBaselineScan = isBaseline === 'true';
    const prior          = useScanStore.getState().sessions;
    const maxWeek        = prior.reduce((m, s) => Math.max(m, s.weekNumber ?? 0), 0);
    const weekNumber     = isBaselineScan ? 1 : Math.max(1, maxWeek) + 1;
    const session        = await processCaptureSession({
      userId: effectiveProfile.id,
      weekNumber,
      isBaseline: isBaselineScan,
      angles,
      profile: effectiveProfile,
    });
    addSession(session);
    if (isBaselineScan) completeBaseline();
    router.replace('/(capture)/processing');
  }

  // ── Derived check states ──────────────────────────────────────────────────
  const hasFace      = !!trackingState?.isFaceDetected;
  const distanceOk   = hasFace && trackingState?.distanceHint === 'in_range';
  const lightOk      = !!trackingState?.isLightOk;
  const alignmentOk  =
    hasFace &&
    !!trackingState?.alignment.yawOk &&
    !!trackingState?.alignment.pitchOk &&
    !!trackingState?.alignment.rollOk;
  const expressionOk = hasFace && !!trackingState?.isNeutral;
  const holdProgress = trackingState?.readyHoldProgress ?? 0;
  const instruction  = scannerInstruction(currentAngle, trackingState);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.camera }]}>

      {/* Camera view — full bleed */}
      <VelaFaceTrackerView key={currentAngle} style={StyleSheet.absoluteFill} />

      {/* Alignment overlay — SVG face guide */}
      <AlignmentOverlay
        isReady={!!trackingState?.isReady && !isProcessing}
        hasFace={hasFace}
        holdProgress={holdProgress}
        reduceMotion={reduceMotion}
      />

      {/* ── TOP GRADIENT SHELL ── */}
      <LinearGradient
        colors={['rgba(0,0,0,0.80)', 'rgba(0,0,0,0.42)', 'transparent']}
        style={[styles.topGradient, { height: insets.top + 220 }]}
        pointerEvents="none"
      />

      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.xs }]}>

        {/* Nav row: ✕ cancel · "N of 3" counter */}
        <View style={styles.navRow}>
          <Pressable
            onPress={exitCapture}
            style={styles.cancelBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Cancel scan"
          >
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.88)" />
          </Pressable>

          <Caption style={styles.stepCounter}>
            {angleIndex + 1} of {ANGLES.length}
          </Caption>

          {/* Balance spacer */}
          <View style={styles.navSpacer} />
        </View>

        {/* Angle title + subtitle */}
        <Headline
          tone="inverse"
          style={styles.angleTitle}
        >
          {ANGLE_TITLE[currentAngle]}
        </Headline>
        <Caption
          tone="inverse"
          style={styles.angleSubtitle}
        >
          {ANGLE_SUBTITLE[currentAngle]}
        </Caption>

        {/* Check pills */}
        <CheckIndicators
          distanceOk={distanceOk}
          lightOk={lightOk}
          alignmentOk={alignmentOk}
          expressionOk={expressionOk}
          angle={currentAngle}
        />

        {/* Coaching instruction — fades in on key change */}
        {instruction ? (
          <InstructionPill key={instruction} text={instruction} />
        ) : null}

      </View>

      {/* ── BOTTOM GRADIENT SHELL ── */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.50)', 'rgba(0,0,0,0.82)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.xl) }]}>

        {/* Connected step indicator */}
        <AngleProgress current={currentAngle} captured={captured} />

        {/* Shutter button */}
        <View style={styles.shutterRow}>
          <ShutterButton
            isReady={!!trackingState?.isReady && !isProcessing}
            holdProgress={holdProgress}
            onCapture={onCapture}
            reduceMotion={reduceMotion}
          />
        </View>

        {/* Retake / placeholder row so layout doesn't jump */}
        {captures[currentAngle] ? (
          <Pressable
            onPress={onRetake}
            style={styles.retakeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel={`Retake ${currentAngle.replace('_', ' ')} angle`}
          >
            <Caption style={styles.retakeLabel}>
              Retake {currentAngle.replace('_', ' ')}
            </Caption>
          </Pressable>
        ) : (
          <View style={styles.retakePlaceholder} />
        )}

      </View>

      {/* Dev-only debug HUD */}
      <PoseDebugHUD state={trackingState} angle={currentAngle} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Top shell ──────────────────────────────────────────────────────────
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
  },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.lg,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cancelBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCounter: {
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  navSpacer: { width: 36 }, // mirrors cancelBtn width for symmetry

  angleTitle: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: Spacing.xxs,
  },
  angleSubtitle: {
    textAlign: 'center',
    opacity: 0.70,
    marginBottom: Spacing.md,
    fontSize: 13,
    letterSpacing: 0.1,
  },

  instructionWrap: {
    marginTop: Spacing.sm,
    alignSelf: 'center',
    maxWidth: 300,
    paddingHorizontal: Spacing.sm,
  },

  // ── Bottom shell ───────────────────────────────────────────────────────
  bottomGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 320,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  shutterRow: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  retakeBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  retakeLabel: {
    color: 'rgba(255,255,255,0.60)',
    letterSpacing: 0.4,
    fontSize: 13,
  },
  retakePlaceholder: {
    height: 44,
  },
});
