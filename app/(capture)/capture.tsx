/**
 * Capture screen (file 05).
 *
 * Three-angle scan (front → left_turn → right_turn). Native ARKit module
 * emits real-time tracking state; the screen renders alignment overlay,
 * check indicators, shutter ring, and per-angle progress.
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
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Body, Caption, Headline } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
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

/** Let native preview + RN layout settle before AR emits (reduces sparse / missed first frames after mount). */
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
  front: 'Front',
  left_turn: 'Left turn',
  right_turn: 'Right turn',
};

const ANGLE_SUBTITLE: Record<CaptureAngle, string> = {
  front: "Arm's length, eyes toward the camera",
  left_turn: 'Ease your head until the oval steadies',
  right_turn: 'Ease your head until the oval steadies',
};

export default function CaptureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { isBaseline } = useLocalSearchParams<{ isBaseline?: string }>();
  const profile = useProfileStore((s) => s.profile);
  const completeBaseline = useAppState((s) => s.completeBaseline);
  const addSession = useScanStore((s) => s.addSession);

  const [reduceMotion, setReduceMotion] = useState(false);
  const [angleIndex, setAngleIndex] = useState(0);
  const [captures, setCaptures] = useState<Partial<Record<CaptureAngle, CaptureResult>>>({});
  const [trackingState, setTrackingState] = useState<FaceTrackingState | null>(null);
  const [retakeCount, setRetakeCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const stoppedRef = useRef(false);
  const lastHoldProgressRef = useRef(0);

  /** Baseline opens capture with `replace` — no stack to `back()`; weekly scans exit to home. */
  const exitCapture = useCallback(() => {
    if (isBaseline === 'true') {
      router.replace('/(onboarding)/permissions');
    } else {
      router.replace('/(main)/dashboard');
    }
  }, [router, isBaseline]);

  const currentAngle = ANGLES[angleIndex] ?? 'front';
  const captured = ANGLES.filter((a) => captures[a]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exitCapture();
      return true;
    });
    return () => sub.remove();
  }, [exitCapture]);

  // Reduce Motion (file 28).
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);

  // Drop stale metrics immediately when the scan step changes (native emits on its own cadence).
  useEffect(() => {
    setTrackingState(null);
  }, [currentAngle]);

  // Native session lifecycle (cancel-safe: avoids orphan listeners / stale sessions on Strict Mode or fast remounts).
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
      // Subscribe **before** `startSession`: otherwise Swift can emit frames while no JS listener exists.
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
      if (!stoppedRef.current) {
        VelaFaceTracker.stopSession();
      }
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

    // Phase 1: native capture. A failure here genuinely means "redo this frame."
    let result: CaptureResult;
    try {
      result = await VelaFaceTracker.captureFrame();
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[capture] captureFrame failed:', e);
      }
      toast.warning('That scan needs a quick redo. Try once more when you’re ready.');
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

    // Phase 2: all three angles done — stop the AR session and run scoring.
    // Scoring failures should NOT trigger "redo" — the captures are good. We log
    // for dev and surface a more accurate message.
    stoppedRef.current = true;
    VelaFaceTracker.stopSession();
    try {
      await finishSession({ ...captures, [currentAngle]: result });
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.error('[capture] finishSession failed:', e);
      }
      toast.error(
        __DEV__
          ? `Could not process scan: ${(e as Error).message ?? 'unknown'}`
          : 'We couldn’t process that scan. Please try again.',
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
    // Baseline scans run BEFORE post-paywall signup (file 08 + 07), so the
    // profile store is intentionally empty until the user authenticates. Compose
    // a draft profile from the onboarding answers in that case and stash it in
    // profileStore so the scoring engine has what it needs. `draftUserId` is
    // stable across retries and rewritten to the real Supabase user id by
    // `completePostPaywallSignup` after sign-up.
    let effectiveProfile = profile;
    if (!effectiveProfile) {
      const onboarding = useOnboardingStore.getState();
      const draftId = onboarding.ensureDraftUserId();
      effectiveProfile = onboarding.composeProfile(draftId, undefined, {
        omitDeferredAnswers: true,
      });
      useProfileStore.getState().setProfile(effectiveProfile);
    }

    const angles = (Object.entries(allCaptures) as [CaptureAngle, CaptureResult][]).map(
      ([angle, capture]) => ({ angle, capture }),
    );
    const isBaselineScan = isBaseline === 'true';
    const prior = useScanStore.getState().sessions;
    const maxWeek = prior.reduce((m, s) => Math.max(m, s.weekNumber ?? 0), 0);
    const weekNumber = isBaselineScan ? 1 : Math.max(1, maxWeek) + 1;
    const session = await processCaptureSession({
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

  const hasFace = !!trackingState?.isFaceDetected;
  const distanceOk = hasFace && trackingState?.distanceHint === 'in_range';
  const lightOk = !!trackingState?.isLightOk;
  const alignmentOk =
    hasFace &&
    !!trackingState?.alignment.yawOk &&
    !!trackingState?.alignment.pitchOk &&
    !!trackingState?.alignment.rollOk;
  const expressionOk = hasFace && !!trackingState?.isNeutral;
  const holdProgress = trackingState?.readyHoldProgress ?? 0;

  const instruction = scannerInstruction(currentAngle, trackingState);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.camera }]}>
      {/* key remounts the native Expo view each angle so ARKit view binding stays in sync after stop/start */}
      <VelaFaceTrackerView key={currentAngle} style={StyleSheet.absoluteFill} />

      <AlignmentOverlay
        isReady={!!trackingState?.isReady}
        hasFace={hasFace}
        holdProgress={holdProgress}
        reduceMotion={reduceMotion}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={{ marginBottom: Spacing.sm }}>
          <Headline tone="inverse" style={{ textAlign: 'center' }}>
            {ANGLE_TITLE[currentAngle]}
          </Headline>
          <Caption tone="inverse" style={{ textAlign: 'center', marginTop: Spacing.xs, opacity: 0.88 }}>
            {ANGLE_SUBTITLE[currentAngle]}
          </Caption>
        </View>
        <CheckIndicators
          distanceOk={distanceOk}
          lightOk={lightOk}
          alignmentOk={alignmentOk}
          expressionOk={expressionOk}
        />
        {instruction ? (
          <Body
            tone="inverse"
            style={{ textAlign: 'center', marginTop: Spacing.sm, maxWidth: 320, alignSelf: 'center' }}
            accessibilityLiveRegion="polite"
          >
            {instruction}
          </Body>
        ) : null}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <AngleProgress current={currentAngle} captured={captured} />
        <View style={{ alignItems: 'center', marginTop: Spacing.lg }}>
          <ShutterButton
            isReady={!!trackingState?.isReady && !isProcessing}
            holdProgress={holdProgress}
            onCapture={onCapture}
            reduceMotion={reduceMotion}
          />
        </View>
        {captures[currentAngle] ? (
          <Button
            label={`Retake ${currentAngle.replace('_', ' ')}`}
            variant="ghost"
            onPress={onRetake}
            style={{ alignSelf: 'center', marginTop: Spacing.base }}
          />
        ) : null}
      </View>

      {/* Cancel: baseline enters via replace — no stack to pop; use explicit routes. */}
      <View style={[styles.cancel, { top: insets.top + Spacing.xs }]}>
        <Button label="Cancel" variant="ghost" onPress={exitCapture} />
      </View>

      {/* Dev-only debug overlay showing the raw face-tracker payload. */}
      <PoseDebugHUD state={trackingState} angle={currentAngle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  cancel: { position: 'absolute', right: Spacing.sm },
});
