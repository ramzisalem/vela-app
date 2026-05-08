/**
 * Singular MMP integration (file 31).
 *
 * Critical timing rules:
 *   - DO NOT initialize Singular at app launch — wait until ATT consent.
 *   - ATT prompt timing: AFTER baseline reveal, BEFORE paywall (file 31).
 *   - Even when ATT is denied, Singular is initialized in privacy-aware
 *     mode (no IDFA) so SKAdNetwork postbacks still flow.
 */
import { Platform } from 'react-native';
import * as TrackingTransparency from 'expo-tracking-transparency';

let initialized = false;

interface SingularSDK {
  Singular: {
    init: (config: unknown) => void;
    event: (name: string, props?: Record<string, unknown>) => void;
  };
  SingularConfig: new (apiKey: string, secret: string) => unknown;
}

let sdk: SingularSDK | null = null;

function loadSDK(): SingularSDK | null {
  if (sdk) return sdk;
  try {
    sdk = require('singular-react-native') as SingularSDK;
    return sdk;
  } catch {
    return null;
  }
}

export const SingularAttribution = {
  async requestATTAndInit(): Promise<TrackingTransparency.PermissionStatus> {
    if (Platform.OS !== 'ios') {
      return 'unavailable' as TrackingTransparency.PermissionStatus;
    }
    let status: TrackingTransparency.PermissionStatus =
      'undetermined' as TrackingTransparency.PermissionStatus;
    try {
      const result = await TrackingTransparency.requestTrackingPermissionsAsync();
      status = result.status;
    } catch (e) {
      console.info('[singular] ATT prompt failed; treating as denied', e);
    }
    if (initialized) return status;
    initialized = true;
    const SDK = loadSDK();
    if (!SDK) return status;
    const apiKey = process.env.EXPO_PUBLIC_SINGULAR_KEY;
    const secret = process.env.SINGULAR_SECRET;
    if (!apiKey || !secret) {
      console.info('[singular] keys missing — skipping init');
      return status;
    }
    try {
      const config = new SDK.SingularConfig(apiKey, secret);
      SDK.Singular.init(config);
    } catch (e) {
      console.info('[singular] init threw', e);
    }
    return status;
  },

  logEvent(name: string, props?: Record<string, string | number | boolean>): void {
    if (!initialized) return;
    const SDK = loadSDK();
    if (!SDK) return;
    try {
      SDK.Singular.event(name, props ?? {});
    } catch {
      // best-effort
    }
  },
};
