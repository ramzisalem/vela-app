/**
 * Hair capture flow (file 35). Four stills: hairline (front), crown + temples
 * (back). Photos stay under Documents/HairScans/<id>/; aggregates sync once.
 */
import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, router } from 'expo-router';
import { uuidv4 } from '@/utils/uuid';
import { useColors } from '@/theme';
import { Body, Caption, HeadlineSerif, Title } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';
import { Screen } from '@/components/ui/Screen';
import { useProfileStore } from '@/stores/profileStore';
import { useHairStore } from '@/stores/hairStore';
import { densityScoresFromFileSizes } from '@/core/hair/hairDensityEngine';
import type { HairCaptureAngle } from '@/types/hair';
import { copyHairPhoto, fileSizeBytes } from '@/services/hair';
import { toast } from '@/components/feedback/toastService';

const STEPS: ReadonlyArray<{
  angle: HairCaptureAngle;
  facing: 'front' | 'back';
  title: string;
  hint: string;
}> = [
  {
    angle: 'hairline-front',
    facing: 'front',
    title: 'Hairline',
    hint: 'Pull hair back from your forehead. Hold still when you capture.',
  },
  {
    angle: 'crown-top-down',
    facing: 'back',
    title: 'Crown',
    hint: 'Raise the phone over your head so the back camera points down. Align with the guide.',
  },
  {
    angle: 'temple-left',
    facing: 'back',
    title: 'Left temple',
    hint: 'Angle slightly so your left temple fills the frame.',
  },
  {
    angle: 'temple-right',
    facing: 'back',
    title: 'Right temple',
    hint: 'Mirror the angle on your right side.',
  },
];

const NEED: HairCaptureAngle[] = [
  'hairline-front',
  'crown-top-down',
  'temple-left',
  'temple-right',
];

export default function HairCaptureScreen() {
  const colors = useColors();
  const profile = useProfileStore((s) => s.profile);
  const recordScan = useHairStore((s) => s.recordScan);
  const setPreferences = useHairStore((s) => s.setPreferences);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<InstanceType<typeof CameraView> | null>(null);
  const sessionIdRef = useRef<string>(uuidv4());

  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [paths, setPaths] = useState<Partial<Record<HairCaptureAngle, string>>>({});

  const step = STEPS[stepIndex] ?? STEPS[0]!;

  async function completeWithPaths(
    nextPaths: Record<HairCaptureAngle, string>,
    userId: string,
  ) {
    const sizes: Record<HairCaptureAngle, number> = {
      'hairline-front': await fileSizeBytes(nextPaths['hairline-front']),
      'crown-top-down': await fileSizeBytes(nextPaths['crown-top-down']),
      'temple-left': await fileSizeBytes(nextPaths['temple-left']),
      'temple-right': await fileSizeBytes(nextPaths['temple-right']),
    };
    const densityScores = densityScoresFromFileSizes(sizes);
    const photoPaths = NEED.map((angle) => ({ angle, path: nextPaths[angle] }));
    recordScan({ userId, photoPaths, densityScores });
    toast.success('Hair scan saved. Photos stay on this device.');
    router.replace('/hair');
  }

  async function onShutter() {
    if (!profile || !cameraRef.current || busy || !cameraReady) return;
    setBusy(true);
    try {
      if (step.facing === 'back') {
        await setPreferences({ backCameraOptIn: true });
      }
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!pic?.uri) throw new Error('no-uri');
      const dest = await copyHairPhoto(pic.uri, sessionIdRef.current, step.angle);
      const merged: Partial<Record<HairCaptureAngle, string>> = { ...paths, [step.angle]: dest };
      setPaths(merged);

      if (stepIndex >= STEPS.length - 1) {
        const full: Record<HairCaptureAngle, string> = {
          'hairline-front': merged['hairline-front']!,
          'crown-top-down': merged['crown-top-down']!,
          'temple-left': merged['temple-left']!,
          'temple-right': merged['temple-right']!,
        };
        await completeWithPaths(full, profile.id);
      } else {
        setStepIndex((i) => i + 1);
        setCameraReady(false);
      }
    } catch {
      toast.warning('That photo did not save. Try again when you are ready.');
    } finally {
      setBusy(false);
    }
  }

  if (!permission?.granted) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Hair capture' }} />
        <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
          <HeadlineSerif>Camera access</HeadlineSerif>
          <Body tone="secondary">
            We need the camera to take the four standardized hair photos. Images stay on this device.
          </Body>
          <Button label="Allow camera" onPress={() => void requestPermission()} />
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background.camera }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView
        key={`${step.facing}-${step.angle}`}
        ref={cameraRef}
        facing={step.facing}
        style={StyleSheet.absoluteFill}
        mirror={step.facing === 'front'}
        onCameraReady={() => setCameraReady(true)}
      />

      <View style={styles.overlay}>
        <Caption tone="inverse">{`Step ${stepIndex + 1} of ${STEPS.length}`}</Caption>
        <Title tone="inverse" style={{ marginTop: Spacing.xs }}>
          {step.title}
        </Title>
        <Body tone="inverse" style={{ marginTop: Spacing.sm }}>
          {step.hint}
        </Body>
      </View>

      <View style={styles.bottom}>
        {busy ? <ActivityIndicator color="#fff" /> : null}
        <Button
          label={stepIndex >= STEPS.length - 1 ? 'Capture & save' : 'Capture'}
          onPress={() => void onShutter()}
          disabled={busy || !cameraReady}
        />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
  },
  bottom: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
});
