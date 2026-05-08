/**
 * 3D capture types (file 32).
 *
 * `Capture3D` augments a scan with depth-aware geometric metrics; `CanonicalPose`
 * is the user's first-scan reference orientation, captured once and re-anchored
 * silently every 18 months.
 */

export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface CanonicalPose {
  /** Reference orientation (q_canonical). */
  rotation: Quaternion;
  /** Reference distance to camera, meters. */
  distance: number;
  /** ISO timestamp. */
  capturedAt: string;
  /** Re-anchor counter — incremented at silent re-anchor (every ~18 months). */
  anchorVersion: number;
}

/**
 * Numeric 3D metrics. NEVER stores raw mesh / depth maps — those stay
 * on-device per file 32. The proxy receives only numeric features +
 * qualityFlags.
 */
export interface Capture3D {
  /** Pose error (radians) vs canonical. */
  poseErrorRad: number;
  /** True if pose error >= 12° (rescan offered) or 5° (caveat noted). */
  poseGate: 'in_band' | 'caveat' | 'rescan_offered';
  /** 3D symmetry index, 0..1. */
  symmetry3D: number;
  /** Volumetric delta (mm) since last scan, when available. */
  volumeChangeMm?: number;
  /** Lighting normalization (band derived from delta vs canonical). */
  lightingDeltaPct: number;
  /** Quality flags surfaced to AI (no PII / no landmarks). */
  qualityFlags: ReadonlyArray<
    | 'pose_caveat'
    | 'pose_rescan'
    | 'lighting_dim'
    | 'lighting_bright'
    | 'occlusion_glasses'
    | 'occlusion_hair'
    | 'occlusion_beard'
  >;
}
