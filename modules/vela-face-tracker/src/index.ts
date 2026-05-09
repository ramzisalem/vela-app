/**
 * VelaFaceTracker — JS-side public API (file 04).
 *
 * Wraps the native `VelaFaceTrackerModule` (Swift `Name(...)`) and its embedded view. iOS only
 * at v1; Android ARCore deferred to v2.
 */
import { requireNativeModule, EventEmitter, requireNativeViewManager } from 'expo-modules-core';
import { Platform } from 'react-native';
import type {
  CaptureAngle,
  CaptureResult,
  FaceTrackingConfig,
  FaceTrackingState,
} from './types';
import { normalizeTrackingState } from './normalizeTrackingState';

export * from './types';

interface NativeModule {
  isSupported(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  configure(config: Partial<FaceTrackingConfig>): void;
  startSession(): Promise<boolean>;
  stopSession(): void;
  captureFrame(): Promise<CaptureResult>;
}

let nativeModule: NativeModule | null = null;
let emitter: EventEmitter | null = null;

function getNative(): NativeModule {
  if (Platform.OS !== 'ios') {
    throw new Error('VelaFaceTracker requires iOS at v1. Android ARCore is v2.');
  }
  if (nativeModule) return nativeModule;
  nativeModule = requireNativeModule<NativeModule>('VelaFaceTrackerModule');
  return nativeModule;
}

function getEmitter(): EventEmitter {
  if (emitter) return emitter;
  emitter = new EventEmitter(getNative() as unknown as Record<string, unknown>);
  return emitter;
}

export const VelaFaceTracker = {
  /** True only on physical iPhones with TrueDepth (X or later). */
  async isSupported(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    try {
      return await getNative().isSupported();
    } catch {
      return false;
    }
  },

  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    return getNative().requestPermission();
  },

  configure(config: Partial<FaceTrackingConfig>): void {
    if (Platform.OS !== 'ios') return;
    getNative().configure(config);
  },

  async startSession(angle: CaptureAngle = 'front'): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    getNative().configure({ angle });
    return getNative().startSession();
  },

  stopSession(): void {
    if (Platform.OS !== 'ios') return;
    getNative().stopSession();
  },

  async captureFrame(): Promise<CaptureResult> {
    if (Platform.OS !== 'ios') {
      throw new Error('captureFrame requires iOS at v1');
    }
    return getNative().captureFrame();
  },

  addStateListener(handler: (state: FaceTrackingState) => void) {
    if (Platform.OS !== 'ios') return { remove: () => undefined };
    const sub = getEmitter().addListener('onTrackingStateChange', (payload: unknown) => {
      handler(normalizeTrackingState(payload));
    });
    return sub;
  },

  addCaptureReadyListener(handler: (state: FaceTrackingState) => void) {
    if (Platform.OS !== 'ios') return { remove: () => undefined };
    const sub = getEmitter().addListener('onCaptureReady', (payload: unknown) => {
      handler(normalizeTrackingState(payload));
    });
    return sub;
  },
};

import type { ComponentType } from 'react';
import type { ViewProps } from 'react-native';

const NativeView: ComponentType<ViewProps> =
  Platform.OS === 'ios'
    ? (requireNativeViewManager('VelaFaceTrackerModule') as ComponentType<ViewProps>)
    : ((() => null) as unknown as ComponentType<ViewProps>);

export const VelaFaceTrackerView = NativeView;
