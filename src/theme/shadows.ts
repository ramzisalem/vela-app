/**
 * Shadows. File 15: NO drop shadows on cream (light mode). Dark mode is
 * borderless / shadowless. This helper returns `{}` in dark mode and a single
 * subtle shadow only on light mode raised surfaces.
 */
import { ViewStyle } from 'react-native';
import type { ThemeMode } from './colors';

export type ShadowLevel = 'none' | 'soft' | 'lift';

export function getShadow(level: ShadowLevel, mode: ThemeMode): ViewStyle {
  if (mode === 'dark' || level === 'none') return {};
  if (level === 'soft') {
    return {
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    };
  }
  // 'lift'
  return {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  };
}
