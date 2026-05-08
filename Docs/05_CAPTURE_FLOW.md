# 05 — Capture Flow UI & AI Analysis

## Overview
The React Native UI that wraps the native ARKit module. Three-angle guided capture, alignment overlay, processing screen, results reveal. AI handles the qualitative analysis (skin assessment, grooming, perceived age).

---

## Capture Screen

```typescript
// app/(capture)/capture.tsx
import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  VelaFaceTracker,
  VelaFaceTrackerView,
  type CaptureAngle,
  type FaceTrackingState,
  type CaptureResult,
} from '@/modules/vela-face-tracker';
import { AlignmentOverlay } from '@/components/capture/AlignmentOverlay';
import { CheckIndicators } from '@/components/capture/CheckIndicators';
import { ShutterButton } from '@/components/capture/ShutterButton';
import { AngleProgress } from '@/components/capture/AngleProgress';
import { useScanStore } from '@/stores/scanStore';
import { useAppState } from '@/stores/appStateStore';
import { processCaptureSession } from '@/core/scoring/scoringEngine';

export default function CaptureScreen() {
  const router = useRouter();
  const { isBaseline } = useLocalSearchParams<{ isBaseline?: string }>();
  const isBaselineCapture = isBaseline === 'true';
  
  const { latestSession } = useScanStore();
  
  const [currentAngle, setCurrentAngle] = useState<CaptureAngle>('front');
  const [trackingState, setTrackingState] = useState<FaceTrackingState | null>(null);
  const [captureReady, setCaptureReady] = useState(false);
  const [capturedAngles, setCapturedAngles] = useState<Record<CaptureAngle, CaptureResult>>({} as any);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const angles: CaptureAngle[] = ['front', 'left_turn', 'right_turn'];
  
  // Setup tracking for current angle
  useEffect(() => {
    let stateSubscription: any;
    let readySubscription: any;
    
    (async () => {
      // Get alignment target from previous session if not baseline
      const alignmentTarget = !isBaselineCapture && latestSession ? {
        transform: getTransformForAngle(latestSession, currentAngle),
        rotationTolerance: 0.08,
        distanceTolerance: 0.05,
      } : undefined;
      
      await VelaFaceTracker.configure({
        angle: currentAngle,
        alignmentTarget,
        minimumLightIntensity: 500,
      });
      
      await VelaFaceTracker.startSession();
      
      stateSubscription = VelaFaceTracker.addStateListener((state) => {
        setTrackingState(state);
      });
      
      readySubscription = VelaFaceTracker.addCaptureReadyListener((ready) => {
        setCaptureReady(ready);
        if (ready) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      });
    })();
    
    return () => {
      stateSubscription?.remove();
      readySubscription?.remove();
      VelaFaceTracker.stopSession();
    };
  }, [currentAngle, isBaselineCapture, latestSession]);
  
  const handleCapture = async () => {
    if (!captureReady) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const result = await VelaFaceTracker.captureFrame();
      const newCaptures = { ...capturedAngles, [currentAngle]: result };
      setCapturedAngles(newCaptures);
      
      // Move to next angle or finish
      const currentIndex = angles.indexOf(currentAngle);
      if (currentIndex < angles.length - 1) {
        setCurrentAngle(angles[currentIndex + 1]);
        setCaptureReady(false);
      } else {
        // All angles captured — process
        await processAllCaptures(newCaptures);
      }
    } catch (error) {
      console.error('Capture failed:', error);
    }
  };
  
  const processAllCaptures = async (captures: Record<CaptureAngle, CaptureResult>) => {
    setIsProcessing(true);
    
    try {
      // Stop the AR session before processing
      await VelaFaceTracker.stopSession();
      
      // Process the session (run AI analysis, scoring, save)
      const session = await processCaptureSession({
        captures,
        isBaseline: isBaselineCapture,
        previousSession: latestSession,
      });
      
      // Update stores
      await useScanStore.getState().addSession(session);
      
      if (isBaselineCapture) {
        useAppState.getState().completeBaseline();
        router.replace('/(capture)/results-reveal');
      } else {
        router.replace('/(main)/dashboard');
      }
    } catch (error) {
      console.error('Processing failed:', error);
      setIsProcessing(false);
    }
  };
  
  if (isProcessing) {
    return <ProcessingScreen />;
  }
  
  return (
    <View style={styles.container}>
      {/* Native AR Camera View */}
      <VelaFaceTrackerView style={StyleSheet.absoluteFill} />
      
      {/* Alignment Overlay */}
      <AlignmentOverlay
        currentAngle={currentAngle}
        isBaseline={isBaselineCapture}
        previousPhotoUri={
          !isBaselineCapture && latestSession
            ? getPhotoUriForAngle(latestSession, currentAngle)
            : undefined
        }
        checks={trackingState?.checks}
      />
      
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </Pressable>
        <Text style={styles.angleInstruction}>
          {getInstructionForAngle(currentAngle)}
        </Text>
        <View style={{ width: 60 }} />
      </View>
      
      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <AngleProgress angles={angles} currentAngle={currentAngle} />
        
        {trackingState && (
          <CheckIndicators checks={trackingState.checks} />
        )}
        
        <ShutterButton
          isActive={captureReady}
          onPress={handleCapture}
        />
      </View>
    </View>
  );
}

function getInstructionForAngle(angle: CaptureAngle): string {
  switch (angle) {
    case 'front': return 'Look straight ahead';
    case 'left_turn': return 'Turn slightly left';
    case 'right_turn': return 'Turn slightly right';
  }
}

function getTransformForAngle(session: any, angle: CaptureAngle) {
  switch (angle) {
    case 'front': return session.frontFaceTransform;
    case 'left_turn': return session.leftFaceTransform;
    case 'right_turn': return session.rightFaceTransform;
  }
}

function getPhotoUriForAngle(session: any, angle: CaptureAngle): string {
  switch (angle) {
    case 'front': return session.frontPhotoPath;
    case 'left_turn': return session.leftPhotoPath;
    case 'right_turn': return session.rightPhotoPath;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  header: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  cancelButton: {
    color: 'white',
    fontSize: 16,
  },
  angleInstruction: {
    ...Typography.subheadline,
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.lg,
  },
});
```

---

## Alignment Overlay Component

```typescript
// src/components/capture/AlignmentOverlay.tsx
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Svg, { Ellipse } from 'react-native-svg';
import type { CaptureAngle, AlignmentChecks } from '@/modules/vela-face-tracker/src/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AlignmentOverlayProps {
  currentAngle: CaptureAngle;
  isBaseline: boolean;
  previousPhotoUri?: string;
  checks?: AlignmentChecks;
}

export function AlignmentOverlay({
  currentAngle,
  isBaseline,
  previousPhotoUri,
  checks,
}: AlignmentOverlayProps) {
  const allPassed = checks
    ? checks.distance && checks.lighting && checks.expression && checks.alignment
    : false;
  
  const ovalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(allPassed ? 1 : 0.6, { duration: 200 }),
  }));
  
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Ghost overlay of previous photo + label so users don't read it as a bug */}
      {!isBaseline && previousPhotoUri && (
        <>
          <Image
            source={{ uri: previousPhotoUri }}
            style={[styles.ghostImage, { opacity: 0.25 }]}
            resizeMode="cover"
            accessibilityLabel="Last scan, shown as a faint overlay to help you align"
          />
          <View style={styles.ghostLabel}>
            <Text style={styles.ghostLabelText}>Last scan, for alignment</Text>
          </View>
        </>
      )}
      
      {/* Face guide ellipse */}
      <Animated.View style={[StyleSheet.absoluteFill, ovalAnimatedStyle]}>
        <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
          <Ellipse
            cx={SCREEN_WIDTH / 2}
            cy={SCREEN_HEIGHT / 2}
            rx={getOvalWidth(currentAngle)}
            ry={SCREEN_HEIGHT * 0.275}
            stroke={allPassed ? colors.success.default : 'rgba(255, 255, 255, 0.6)'}
            strokeWidth={allPassed ? 3 : 2}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function getOvalWidth(angle: CaptureAngle): number {
  switch (angle) {
    case 'front': return SCREEN_WIDTH * 0.275;
    case 'left_turn':
    case 'right_turn': return SCREEN_WIDTH * 0.225;
  }
}

const styles = StyleSheet.create({
  ghostImage: {
    ...StyleSheet.absoluteFillObject,
  },
});
```

---

## Check Indicators

```typescript
// src/components/capture/CheckIndicators.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AlignmentChecks } from '@/modules/vela-face-tracker/src/types';

interface CheckIndicatorsProps {
  checks: AlignmentChecks;
}

export function CheckIndicators({ checks }: CheckIndicatorsProps) {
  return (
    <View style={styles.container}>
      <CheckRow label="Distance" passed={checks.distance} />
      <CheckRow label="Lighting" passed={checks.lighting} />
      <CheckRow label="Expression" passed={checks.expression} />
      <CheckRow label="Alignment" passed={checks.alignment} />
    </View>
  );
}

function CheckRow({ label, passed }: { label: string; passed: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Ionicons
        name={passed ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={passed ? colors.success.default : 'rgba(255, 255, 255, 0.5)'}
      />
      <Text style={[styles.label, { color: passed ? 'white' : 'rgba(255, 255, 255, 0.6)' }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  label: {
    ...Typography.caption,
    fontWeight: '500',
  },
});
```

---

## Shutter Button

```typescript
// src/components/capture/ShutterButton.tsx
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface ShutterButtonProps {
  isActive: boolean;
  onPress: () => void;
}

export function ShutterButton({ isActive, onPress }: ShutterButtonProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isActive ? 1 : 0.85) }],
    opacity: withSpring(isActive ? 1 : 0.5),
  }));
  
  return (
    <Pressable onPress={onPress} disabled={!isActive}>
      <Animated.View style={[styles.outer, animatedStyle]}>
        <Animated.View style={[styles.inner, { backgroundColor: isActive ? '#4ECDC4' : 'white' }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: Layout.recommendedTapTarget * 1.67,
    height: Layout.recommendedTapTarget * 1.67,
    borderRadius: Layout.recommendedTapTarget * 0.83,
    borderWidth: Spacing.xxs,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: Layout.recommendedTapTarget * 1.33,
    height: Layout.recommendedTapTarget * 1.33,
    borderRadius: Layout.recommendedTapTarget * 0.67,
  },
});
```

---

## Processing Screen

```typescript
// app/(capture)/processing.tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

const PROCESSING_STEPS = [
  'Detecting facial landmarks...',
  'Mapping geometry...',
  'Calculating metrics...',
  'Generating your analysis...',
  'Finalizing baseline...',
];

export function ProcessingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const rotation = useSharedValue(0);
  
  useEffect(() => {
    // Cycle through steps
    const interval = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, PROCESSING_STEPS.length - 1));
    }, 1800);
    
    // Spinning animation
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1
    );
    
    return () => clearInterval(interval);
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.spinner, animatedStyle]}>
        {/* Custom scanning animation */}
      </Animated.View>
      
      <Text style={styles.title}>Analyzing your face</Text>
      <Text style={styles.step}>{PROCESSING_STEPS[stepIndex]}</Text>
      
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((stepIndex + 1) / PROCESSING_STEPS.length) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  spinner: {
    width: Spacing.massive,
    height: Spacing.massive,
    borderRadius: Spacing.massive / 2,
    borderWidth: Spacing.xxs,
    borderColor: 'white',
    borderTopColor: 'transparent',
  },
  title: {
    ...Typography.scoreSmall,
    color: 'white',
  },
  step: {
    ...Typography.button,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  progressBar: {
    width: 200,
    height: Spacing.xxs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: Radii.sm,
  },
});
```

---

## Capture Quality & Recovery Path

After all three angles are captured and the AI scoring runs, individual angles can be rejected for low quality (lighting, occlusion, motion blur). The user must have a graceful path to redo just the rejected angle, not the entire session.

### Rejection criteria (per angle)

A captured angle is marked `rejected` if any of:
- `clarityScore < 40` (too blurry / out of focus)
- `lightingDelta > 0.4` from baseline (way off lighting)
- `occlusionPct < 75` (significant face occluded)
- AI scoring returns `quality_flag: 'reject'`

### Recovery UX

If 1+ angle is rejected during processing:

```
┌──────────────────────────────────────────┐
│                                          │
│   We got most of it.                     │
│                                          │
│   The right-side angle came in a bit     │
│   too dark — it'll skew your scores.     │
│   Want to take it again?                 │
│                                          │
│                                          │
│   ┌────────────────────────────────┐     │
│   │  Retake right-side             │     │
│   └────────────────────────────────┘     │
│                                          │
│   Use what we have anyway                │
│                                          │
└──────────────────────────────────────────┘
```

- Tap *Retake* → return to capture screen pre-positioned for the rejected angle only. Other angles remain captured.
- Tap *Use what we have anyway* → proceed to scoring; the rejected angle is excluded from the scoring engine. The reveal screen (later) shows a small "partial scan" indicator.

### Rules
- Recovery offered at most twice per session. After two retakes of the same angle, the session proceeds with whatever's available.
- If all three angles are rejected, the entire session is invalidated (the user is told kindly, capture starts over). This is rare.
- The first scan is always saved as the user's baseline regardless of partial-scan status. Their next clean scan replaces baseline if it scores >85% on quality flags.

### Profile-missing fallback (file 03 contract)

If `saveScanResult` throws `ProfileMissingError`, the capture flow:
1. Stores the session locally as `pending_sync` in WatermelonDB.
2. Shows reveal as normal — the user sees their score immediately (it's computed locally).
3. Retries sync on next app foreground via `SyncOrchestrator.flushPending()`.
4. Never blocks the user on a server failure.

This is the canonical pattern for any capture-flow → backend handoff failure.

---

## Scoring Engine (Combines On-Device + AI)

```typescript
// src/core/scoring/scoringEngine.ts
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import type { CaptureResult, CaptureAngle } from '@/modules/vela-face-tracker/src/types';
import type { ScanSession, ScanScores, RawMetrics } from '@/types/scan';
import type { UserProfile } from '@/types/profile';
import { useProfileStore } from '@/stores/profileStore';
import { useAppState } from '@/stores/appStateStore';
import { AIService } from '@/services/ai';
import { calculateRawMetrics } from './rawMetrics';
import { calibrateScore, getScoringWeights } from './calibration';

interface ProcessCaptureSessionInput {
  captures: Record<CaptureAngle, CaptureResult>;
  isBaseline: boolean;
  previousSession?: ScanSession | null;
}

export async function processCaptureSession(
  input: ProcessCaptureSessionInput
): Promise<ScanSession> {
  const { captures, isBaseline, previousSession } = input;
  const profile = useProfileStore.getState().profile;
  const userId = useAppState.getState().user?.id;

  if (!profile || !userId) {
    throw new Error('Profile or user not loaded');
  }

  // 1. Move photos from temp to permanent storage IMMEDIATELY.
  //    iOS may purge `temporaryDirectory` between launches — never compute
  //    metrics off temp paths. (File 04 captures land in temp; this is the
  //    handoff to durable storage in `Documents/VelaPhotos/<sessionId>/`.)
  const sessionId = uuidv4();
  const photosPaths = await savePhotosPermanently(sessionId, captures);

  // 2. Compute raw metrics from front photo (geometric, on-device — works offline)
  const frontPhotoUri = photosPaths.front;
  const rawMetrics = await calculateRawMetrics(frontPhotoUri, captures.front);

  // 3. Compute base scores (on-device — works offline)
  // ⚠️ Always read the framework off the profile — never re-derive from gender.
  // The derivation happened once at onboarding (file 07) and may have been
  // overridden by the user (non-binary / prefer-not-to-say). See file 02.
  const framework = profile.scoringFramework;
  const baseScores = computeBaseScores(rawMetrics, framework);

  // 4. Get AI assessment. AI is the only network-dependent step.
  //    If offline / failure: persist a partial session, queue for retry,
  //    and show the user the on-device parts of the score now. The reveal
  //    screen displays a "still finalizing" badge until retry succeeds.
  let aiAssessment;
  try {
    aiAssessment = await getAIAssessment(frontPhotoUri, framework, profile);
  } catch (error) {
    console.warn('[capture] AI assessment failed, queueing for retry:', error);
    await queueScanForAIRetry({ sessionId, frontPhotoUri, framework, profile });
    aiAssessment = {
      skinClarity: 0,
      groomingScore: 0,
      groomingExplanation: undefined,
      perceivedAge: profile.age,
      pending: true,
    };
  }
  
  // 5. Combine to final scores
  const finalScores = combineScores(baseScores, aiAssessment);
  
  // 6. Apply demographic calibration
  const calibratedScores = applyCalibration(finalScores, framework, profile.age);
  
  // 7. Add previous scores for delta computation
  if (previousSession) {
    calibratedScores.previousOverall = previousSession.scores.overall;
    calibratedScores.previousSkin = previousSession.scores.skin;
    calibratedScores.previousSymmetry = previousSession.scores.symmetry;
    calibratedScores.previousDefinition = previousSession.scores.definition;
    calibratedScores.previousVitality = previousSession.scores.vitality;
    calibratedScores.previousGrooming = previousSession.scores.grooming;
    
    // Get AI explanations for changes
    try {
      const explanations = await AIService.explainScoreChanges(
        calibratedScores,
        previousSession.scores,
        rawMetrics
      );
      calibratedScores.skinExplanation = explanations.skin;
      calibratedScores.symmetryExplanation = explanations.symmetry;
      calibratedScores.definitionExplanation = explanations.definition;
      calibratedScores.vitalityExplanation = explanations.vitality;
      calibratedScores.groomingExplanation = explanations.grooming;
      calibratedScores.overallSummary = explanations.overall;
    } catch (error) {
      console.error('AI explanation failed:', error);
    }
  } else {
    // Baseline — get an initial summary
    calibratedScores.overallSummary = "This is your baseline. Future scans will show how your face changes over time.";
  }
  
  // 8. Build session object
  const session: ScanSession = {
    id: sessionId,
    userId,
    capturedAt: new Date().toISOString(),
    weekNumber: previousSession ? previousSession.weekNumber + 1 : 1,
    isBaseline,
    frontPhotoPath: photosPaths.front,
    leftPhotoPath: photosPaths.left,
    rightPhotoPath: photosPaths.right,
    frontFaceTransform: captures.front.transform,
    leftFaceTransform: captures.left_turn.transform,
    rightFaceTransform: captures.right_turn.transform,
    alignmentQuality: 'good',
    lightingConsistency: 0.8,
    scores: calibratedScores,
    context: {
      newProductsStarted: [],
      newTreatmentsStarted: [],
    },
    shareCardCached: false,
  };
  
  return session;
}

async function savePhotosPermanently(
  sessionId: string,
  captures: Record<CaptureAngle, CaptureResult>
): Promise<{ front: string; left: string; right: string }> {
  const photosDir = `${FileSystem.documentDirectory}VelaPhotos/${sessionId}/`;
  await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true });
  
  const result = { front: '', left: '', right: '' };
  
  for (const [angle, capture] of Object.entries(captures)) {
    const filename = `${angle}.jpg`;
    const destPath = `${photosDir}${filename}`;
    
    await FileSystem.moveAsync({
      from: capture.imageUri.replace('file://', ''),
      to: destPath,
    });
    
    const relativePath = `${sessionId}/${filename}`;
    
    switch (angle) {
      case 'front': result.front = relativePath; break;
      case 'left_turn': result.left = relativePath; break;
      case 'right_turn': result.right = relativePath; break;
    }
  }
  
  return result;
}

// `getFrameworkForGender` lives in `src/types/profile.ts` as `frameworkForGender`
// (file 02). It is invoked once during onboarding (file 07) to seed
// `profile.scoringFramework`. Do not re-derive at scan time.

async function getAIAssessment(
  photoUri: string,
  framework: ScoringFramework,
  profile: UserProfile
): Promise<{
  skinClarity: number;
  groomingScore: number;
  groomingExplanation: string;
  perceivedAge: number;
}> {
  // Convert photo to base64
  const photoBase64 = await FileSystem.readAsStringAsync(
    `${FileSystem.documentDirectory}VelaPhotos/${photoUri}`,
    { encoding: FileSystem.EncodingType.Base64 }
  );
  
  // Call AI for grooming and skin assessment
  const groomingResult = await AIService.assessGrooming(photoBase64, framework);
  
  return {
    skinClarity: 70, // Placeholder — would come from AI skin assessment
    groomingScore: groomingResult.score,
    groomingExplanation: groomingResult.explanation,
    perceivedAge: profile.age, // Placeholder — would come from AI age estimation
  };
}

function computeBaseScores(
  metrics: RawMetrics,
  framework: ScoringFramework
): Partial<ScanScores> {
  // Symmetry from raw geometric data
  const symmetry = Math.round((1 - metrics.asymmetryCoefficient) * 85 + 15);
  
  // Skin tone evenness
  const skin = Math.round((1 - metrics.skinToneVariance) * 100);
  
  // Definition from jaw + cheek metrics
  const definition = Math.round(
    framework === 'masculine'
      ? metrics.jawDefinitionScore * 70 + metrics.cheekVolumeDistribution * 30
      : framework === 'feminine'
      ? metrics.jawDefinitionScore * 30 + metrics.cheekVolumeDistribution * 70
      : (metrics.jawDefinitionScore + metrics.cheekVolumeDistribution) * 50
  );
  
  // Vitality from under-eye
  const vitality = Math.round((1 - metrics.underEyeDarknessRatio) * 100);
  
  return { skin, symmetry, definition, vitality };
}

function combineScores(
  baseScores: Partial<ScanScores>,
  aiAssessment: any
): ScanScores {
  return {
    overall: 0, // Computed below
    skin: Math.round((baseScores.skin || 0) * 0.5 + aiAssessment.skinClarity * 0.5),
    symmetry: baseScores.symmetry || 0,
    definition: baseScores.definition || 0,
    vitality: baseScores.vitality || 0,
    grooming: aiAssessment.groomingScore,
    perceivedAge: aiAssessment.perceivedAge,
  };
}

function applyCalibration(
  scores: ScanScores,
  framework: ScoringFramework,
  age: number
): ScanScores {
  const weights = getScoringWeights(framework);
  
  // Compute overall as weighted average
  const overallRaw =
    scores.skin * weights.skin +
    scores.symmetry * weights.symmetry +
    scores.definition * weights.definition +
    scores.vitality * weights.vitality +
    scores.grooming * weights.grooming;
  
  scores.overall = calibrateScore(Math.round(overallRaw), framework, age);
  return scores;
}
```

---

## Calibration

```typescript
// src/core/scoring/calibration.ts

export interface ScoringWeights {
  skin: number;
  symmetry: number;
  definition: number;
  vitality: number;
  grooming: number;
}

export function getScoringWeights(framework: ScoringFramework): ScoringWeights {
  switch (framework) {
    case 'masculine':
      return { skin: 0.20, symmetry: 0.20, definition: 0.25, vitality: 0.20, grooming: 0.15 };
    case 'feminine':
      return { skin: 0.30, symmetry: 0.20, definition: 0.15, vitality: 0.25, grooming: 0.10 };
    case 'neutral':
      return { skin: 0.25, symmetry: 0.20, definition: 0.20, vitality: 0.20, grooming: 0.15 };
  }
}

export function calibrateScore(
  rawScore: number,
  framework: ScoringFramework,
  userAge: number
): number {
  // Sigmoid-like calibration
  // Most users land in 45-75 range, with rare extremes
  const normalized = rawScore / 100;
  const calibrated = 1.0 / (1.0 + Math.exp(-8.0 * (normalized - 0.5)));
  
  // Map to 15-85 typical range
  const rangeMin = 15;
  const rangeMax = 85;
  const finalScore = rangeMin + calibrated * (rangeMax - rangeMin);
  
  return Math.max(0, Math.min(100, Math.round(finalScore)));
}
```

---

## Raw Metrics (TensorFlow.js for cross-platform face detection)

For computing geometric metrics from the photo, you have two options on iOS:

**Option A: Use the native module to do additional Vision framework analysis**
Add a method `analyzeImage(uri)` to the native module that runs Vision framework face landmark detection and returns the metrics.

**Option B: Use TensorFlow.js with a pre-trained face landmark model**
Cross-platform but slower and larger app size.

For v1, **use Option A** — it's faster and more accurate. Add this to the native module:

```swift
// Add to VelaFaceTrackerModule.swift

AsyncFunction("analyzeImage") { (uri: String, promise: Promise) in
    guard let url = URL(string: uri),
          let data = try? Data(contentsOf: url),
          let image = UIImage(data: data),
          let cgImage = image.cgImage else {
        promise.reject("ERR_IMAGE", "Could not load image")
        return
    }
    
    let request = VNDetectFaceLandmarksRequest { request, error in
        guard let observations = request.results as? [VNFaceObservation],
              let face = observations.first,
              let landmarks = face.landmarks else {
            promise.reject("ERR_DETECTION", "No face detected")
            return
        }
        
        // Compute metrics from landmarks
        let metrics = self.computeMetrics(landmarks: landmarks, faceBounds: face.boundingBox, image: cgImage)
        promise.resolve(metrics)
    }
    
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try? handler.perform([request])
}
```

```typescript
// src/core/scoring/rawMetrics.ts
import { VelaFaceTracker } from '@/modules/vela-face-tracker';
import type { CaptureResult } from '@/modules/vela-face-tracker/src/types';
import type { RawMetrics } from '@/types/scan';

export async function calculateRawMetrics(
  photoUri: string,
  capture: CaptureResult
): Promise<RawMetrics> {
  // Call native module to do Vision framework analysis
  const metrics = await (VelaFaceTracker as any).analyzeImage(photoUri);
  
  return {
    asymmetryCoefficient: metrics.asymmetry,
    skinToneVariance: metrics.skinToneVariance,
    underEyeDarknessRatio: metrics.underEyeDarkness,
    jawDefinitionScore: metrics.jawDefinition,
    cheekVolumeDistribution: metrics.cheekVolume,
    facialLandmarks: metrics.landmarks,
    estimatedAge: metrics.estimatedAge || 30,
    captureTimestamp: capture.capturedAt,
  };
}
```
