/**
 * Hair tracking types (file 35).
 *
 * Opt-in via Settings → Health & lifestyle. Top-down + back-camera capture
 * (a separate flow from the standard face capture). Voice constraints:
 * never the words "loss" or "balding" in user copy.
 */

export type HairCaptureAngle =
  | 'crown-top-down'
  | 'hairline-front'
  | 'temple-left'
  | 'temple-right';

export interface HairScan {
  id: string;
  userId: string;
  /** ISO timestamp. */
  capturedAt: string;
  /** Local file paths (Documents/HairScans/<id>/). Never synced. */
  photoPaths: ReadonlyArray<{ angle: HairCaptureAngle; path: string }>;
  /** Aggregated density values (0-100), never raw pixel maps. */
  densityScores: HairDensityScores;
}

export interface HairDensityScores {
  crown: number;
  hairline: number;
  templeLeft: number;
  templeRight: number;
  /** Volume-weighted average. */
  overall: number;
}

export interface HairTrendPoint {
  /** YYYY-MM-DD. */
  date: string;
  overall: number;
  crown: number;
  hairline: number;
}

export interface HairProfilePreferences {
  /** True if the user has explicitly opted in to hair tracking. Default false. */
  enabled: boolean;
  /** True if the user enables back-camera capture for crown shots. */
  backCameraOptIn: boolean;
  /** Reminders cadence; 'manual' = no reminders. */
  reminderCadence: 'manual' | 'biweekly' | 'monthly';
}
