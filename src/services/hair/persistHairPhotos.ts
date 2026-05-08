/**
 * Persist hair capture JPEGs under Documents/HairScans/<scanId>/ (file 35).
 */
import * as FileSystem from 'expo-file-system';
import type { HairCaptureAngle } from '@/types/hair';

const ROOT = `${FileSystem.documentDirectory ?? ''}HairScans/`;

export async function ensureHairScanDir(scanId: string): Promise<string> {
  const dir = `${ROOT}${scanId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

export async function copyHairPhoto(
  tempUri: string,
  scanId: string,
  angle: HairCaptureAngle,
): Promise<string> {
  const dir = await ensureHairScanDir(scanId);
  const dest = `${dir}${angle}.jpg`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  try {
    await FileSystem.deleteAsync(tempUri, { idempotent: true });
  } catch {
    /* best-effort */
  }
  return dest;
}

export async function fileSizeBytes(path: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(path, { size: true });
  if (!info.exists) return 1;
  return 'size' in info && typeof info.size === 'number' ? Math.max(1, info.size) : 1;
}
