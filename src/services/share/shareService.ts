/**
 * ShareService (file 13).
 *
 * Off-screen renders the requested card via react-native-view-shot, writes
 * it to a temp file, optionally saves to camera roll (lazy permission),
 * then opens the system share sheet.
 *
 * Lazy permission: Photos write permission is requested ONLY when the user
 * taps "Save to camera roll", never preemptively (file 13).
 */
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { toast } from '@/components/feedback/toastService';

export interface CaptureRefHandle {
  current: unknown;
}

export interface ShareOptions {
  /** Source of truth for what to render — caller passes a ref to a hidden ShareCard. */
  ref: CaptureRefHandle;
  /** Includes the share sheet text. */
  message?: string;
  /** Optional save-to-camera-roll prompt before the share sheet. */
  saveToCameraRoll?: boolean;
}

export const ShareService = {
  async capture(ref: CaptureRefHandle): Promise<string | null> {
    try {
      const uri = await captureRef(ref as never, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      return uri;
    } catch (e) {
      console.warn('[share] capture failed', e);
      return null;
    }
  },

  async saveToCameraRoll(uri: string): Promise<boolean> {
    const perms = await MediaLibrary.getPermissionsAsync(true);
    if (!perms.granted) {
      const requested = await MediaLibrary.requestPermissionsAsync(true);
      if (!requested.granted) {
        toast.warning('Photos access is needed to save the card.');
        return false;
      }
    }
    try {
      await MediaLibrary.saveToLibraryAsync(uri);
      toast.success('Saved to your camera roll.');
      return true;
    } catch {
      toast.warning('We could not save to your camera roll.');
      return false;
    }
  },

  async share(opts: ShareOptions): Promise<boolean> {
    const uri = await ShareService.capture(opts.ref);
    if (!uri) return false;
    if (opts.saveToCameraRoll) {
      await ShareService.saveToCameraRoll(uri);
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        dialogTitle: opts.message ?? 'Share your Vela',
        mimeType: 'image/png',
      });
      return true;
    }
    return false;
  },
};
