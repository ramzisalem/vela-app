/**
 * PoseDebugHUD — dev-only overlay showing the raw face-tracker payload.
 *
 * Renders ONLY when `__DEV__` is true. Strips out of production at bundle
 * time. Shows yaw/pitch/roll values (in degrees), each Ok flag, distance
 * hint, light intensity, neutral expression, and the hold progress. Lets us
 * tell at a glance which axis is rejecting a pose vs. a bridge issue.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { FaceTrackingState } from '../../../modules/vela-face-tracker/src/types';

interface Props {
  state: FaceTrackingState | null;
  angle: string;
}

function rad2deg(r: number): string {
  return `${(r * 180 / Math.PI).toFixed(0)}°`;
}

function bool(b: boolean | undefined): string {
  return b ? '✓' : '✗';
}

export function PoseDebugHUD({ state, angle }: Props) {
  if (!__DEV__) return null;
  if (!state) {
    return (
      <View style={styles.box}>
        <Text style={styles.label}>POSE DEBUG (no state)</Text>
      </View>
    );
  }
  const a = state.alignment;
  const passed =
    state.isFaceDetected && a.yawOk && a.pitchOk && a.rollOk
      ? 'PASS'
      : 'FAIL';
  return (
    <View style={styles.box}>
      <Text style={styles.label}>
        Pose · {angle} · {passed}
      </Text>
      <Text style={styles.line}>
        face {bool(state.isFaceDetected)}  ready {bool(state.isReady)}  hold {(state.readyHoldProgress ?? 0).toFixed(2)}
      </Text>
      <Text style={styles.line}>
        yaw  mag {rad2deg(a.yawMag)}  euler {rad2deg(a.yaw)}  {bool(a.yawOk)}
      </Text>
      <Text style={styles.line}>
        pitch mag {rad2deg(a.pitchMag)}  euler {rad2deg(a.pitch)}  {bool(a.pitchOk)}
      </Text>
      <Text style={styles.line}>
        roll mag {rad2deg(a.rollMag)}  euler {rad2deg(a.roll)}  {bool(a.rollOk)}
      </Text>
      <Text style={styles.line}>
        dist {state.distance.toFixed(2)}m · {state.distanceHint}
      </Text>
      <Text style={styles.line}>
        light {state.lightIntensity.toFixed(0)} · {bool(state.isLightOk)}  calm {bool(state.isNeutral)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    bottom: 200,
    left: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    zIndex: 999,
  },
  label: {
    color: '#FFD27A',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 1,
  },
  line: {
    color: '#FAF8F4',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Menlo',
  },
});
