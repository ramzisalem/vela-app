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
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Body, Headline } from '@/components/ui/Text';
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
import {
  alignmentHintText,
  distanceHintText,
  lightHintText,
  neutralHintText,
} from '@/components/capture/distanceHint';
import { processCaptureSession } from '@/core/scoring/scoringEngine';
import { useProfileStore } from '@/stores/profileStore';
import { useScanStore } from '@/stores/scanStore';
import { useAppState } from '@/stores/appStateStore';
import { toast } from '@/components/feedback/toastService';

const ANGLES: ReadonlyArray<CaptureAngle> = ['front', 'left_turn', 'right_turn'];
const MAX_RETAKES_PER_SESSION = 2;

export default function CaptureScreen() {
  const router = useRouter();
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

  const currentAngle = ANGLES[angleIndex] ?? 'front';
  const captured = ANGLES.filter((a) => captures[a]);

  // Reduce Motion (file 28).
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);

  // Native session lifecycle.
  useEffect(() => {
    let stateSub: { remove: () => void } | null = null;
    (async () => {
      const supported = await VelaFaceTracker.isSupported();
      if (!supported) {
        toast.warning(
          'This device does not support TrueDepth face tracking. Vela requires iPhone X or later.',
        );
        return;
      }
      const granted = await VelaFaceTracker.requestPermission();
      if (!granted) {
        toast.error('Camera access is needed for your scan. Open Settings to allow.');
        return;
      }
      await VelaFaceTracker.startSession(currentAngle);
      stateSub = VelaFaceTracker.addStateListener(setTrackingState);
    })();

    return () => {
      stateSub?.remove();
      if (!stoppedRef.current) {
        VelaFaceTracker.stopSession();
      }
    };
  }, [currentAngle]);

  const onCapture = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await VelaFaceTracker.captureFrame();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setCaptures((prev) => ({ ...prev, [currentAngle]: result }));
      if (angleIndex < ANGLES.length - 1) {
        setAngleIndex((i) => i + 1);
      } else {
        // All angles done — stop session, run scoring engine.
        stoppedRef.current = true;
        VelaFaceTracker.stopSession();
        await finishSession({ ...captures, [currentAngle]: result });
      }
    } catch {
      toast.warning('That scan needs a quick redo. Try once more when you’re ready.');
    } finally {
      setIsProcessing(false);
    }
  }, [angleIndex, captures, currentAngle, isProcessing]);

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
    if (!profile) {
      toast.error('Profile is still loading. Please retry in a moment.');
      router.back();
      return;
    }
    const angles = (Object.entries(allCaptures) as [CaptureAngle, CaptureResult][]).map(
      ([angle, capture]) => ({ angle, capture }),
    );
    const isBaselineScan = isBaseline === 'true';
    const prior = useScanStore.getState().sessions;
    const maxWeek = prior.reduce((m, s) => Math.max(m, s.weekNumber ?? 0), 0);
    const weekNumber = isBaselineScan ? 1 : Math.max(1, maxWeek) + 1;
    const session = await processCaptureSession({
      userId: profile.id,
      weekNumber,
      isBaseline: isBaselineScan,
      angles,
      profile,
    });
    addSession(session);
    if (isBaselineScan) completeBaseline();
    router.replace('/(capture)/processing');
  }

  const distanceOk = trackingState?.distanceHint === 'in_range';
  const lightOk = !!trackingState?.isLightOk;
  const alignmentOk =
    !!trackingState?.alignment.yawOk &&
    !!trackingState?.alignment.pitchOk &&
    !!trackingState?.alignment.rollOk;

  const hint =
    distanceHintText(trackingState?.distanceHint ?? 'no_face') ||
    lightHintText(lightOk) ||
    alignmentHintText(
      !!trackingState?.alignment.yawOk,
      !!trackingState?.alignment.pitchOk,
      !!trackingState?.alignment.rollOk,
    ) ||
    neutralHintText(!!trackingState?.isNeutral);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.camera }]}>
      <VelaFaceTrackerView style={StyleSheet.absoluteFill} />

      <AlignmentOverlay
        isReady={!!trackingState?.isReady}
        hasFace={!!trackingState?.isFaceDetected}
        reduceMotion={reduceMotion}
      />

      <View style={styles.topBar}>
        <CheckIndicators distanceOk={distanceOk} lightOk={lightOk} alignmentOk={alignmentOk} />
        {hint ? (
          <Body
            tone="inverse"
            style={{ textAlign: 'center', marginTop: Spacing.sm }}
            accessibilityLiveRegion="polite"
          >
            {hint}
          </Body>
        ) : null}
      </View>

      <View style={styles.bottomBar}>
        <AngleProgress current={currentAngle} captured={captured} />
        <View style={{ alignItems: 'center', marginTop: Spacing.lg }}>
          <ShutterButton
            isReady={!!trackingState?.isReady && !isProcessing}
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

      {/* Cancel returns to dashboard on weekly scans, or onboarding for baseline. */}
      <View style={styles.cancel}>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
  },
  cancel: { position: 'absolute', top: 16, right: 16 },
});
