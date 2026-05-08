/**
 * Animation tokens (file 15 / 23). Reanimated easings.
 * Reduce Motion (file 28) replaces these with instant transitions.
 */
import { Easing } from 'react-native-reanimated';

export const AnimationDuration = {
  /** Toast in/out, micro feedback. */
  micro: 150,
  /** Button press, simple state change. */
  fast: 200,
  /** Standard sheet/screen transition. */
  base: 300,
  /** Score reveal hero. */
  hero: 1200,
  /** Capture progress ring. */
  shutterRing: 500,
} as const;

export const AnimationEasing = {
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  emphasized: Easing.bezier(0.2, 0, 0, 1),
  decelerate: Easing.bezier(0, 0, 0.2, 1),
  linear: Easing.linear,
} as const;

export const SpringConfig = {
  gentle: { damping: 18, stiffness: 140, mass: 1 },
  responsive: { damping: 14, stiffness: 220, mass: 1 },
  snappy: { damping: 10, stiffness: 320, mass: 0.9 },
} as const;
