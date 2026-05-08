/**
 * Quaternion math for canonical pose normalization (file 32).
 *
 *   q_correction = q_canonical * conjugate(q_captured)
 *
 * The correction quaternion is then applied to the captured rotation so each
 * scan reads as if it were taken from the same orientation as the first scan.
 */

export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

export function multiply(a: Quaternion, b: Quaternion): Quaternion {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

export function conjugate(q: Quaternion): Quaternion {
  return { w: q.w, x: -q.x, y: -q.y, z: -q.z };
}

export function norm(q: Quaternion): number {
  return Math.hypot(q.w, q.x, q.y, q.z);
}

export function normalize(q: Quaternion): Quaternion {
  const n = norm(q);
  if (n === 0) return { w: 1, x: 0, y: 0, z: 0 };
  return { w: q.w / n, x: q.x / n, y: q.y / n, z: q.z / n };
}

export function fromEuler(yaw: number, pitch: number, roll: number): Quaternion {
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);
  return {
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
  };
}

/** Angle between two unit quaternions, in radians. */
export function angleBetween(a: Quaternion, b: Quaternion): number {
  const dot = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;
  const clamped = Math.max(-1, Math.min(1, Math.abs(dot)));
  return 2 * Math.acos(clamped);
}

/**
 * The canonical correction. Returns the quaternion that, when applied to
 * the captured rotation, produces the canonical pose.
 */
export function correctionFor(canonical: Quaternion, captured: Quaternion): Quaternion {
  return normalize(multiply(canonical, conjugate(captured)));
}
