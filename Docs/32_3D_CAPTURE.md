# 32 — 3D Capture Enhancements

## Why this exists

Vela's defensibility depends on being the only consumer face-tracking app whose scans are *clinically comparable*. Photo-based competitors (looksmaxxing apps, beauty AR, skincare diaries) can only see what a 2D RGB image shows. ARKit on TrueDepth-equipped devices gives Vela three signals they cannot replicate:

1. **Per-pixel depth** — measure facial volume and contour, not just outline.
2. **Environmental light estimation** — normalize across captures so changes you see are real, not lighting artifacts.
3. **6-DOF head pose** — correct for camera-angle drift between sessions so the trend chart compares like-to-like.

This file specifies how Vela uses those signals, what new measurements they produce, where they surface in the product, and how the experience degrades gracefully on devices without TrueDepth.

This file extends `04_NATIVE_ARKIT_MODULE.md` (native bridge), `05_CAPTURE_FLOW.md` (UI), `10_DASHBOARD.md` (chart surfaces), and `11_COMPARISON.md` (slider/side-by-side). Types declared here should be merged into `02_TYPES_AND_MODELS.md` during implementation.

---

## What we measure beyond 2D

Each scan now produces a `Capture3D` object alongside the existing photo + landmark data. None of this leaves the device — it's stored in WatermelonDB and used locally to compute scores and comparisons. Only the resulting numerical scores are sent to the AI proxy, never the underlying mesh or depth map.

### Volume metrics
- **Cheek volume index** — relative volumetric difference between left/right zygomatic regions vs. a personal baseline. Detects volume loss from weight change or aging.
- **Jaw definition score** — angle between mandibular border and submandibular plane. Tracks jowl drop and jaw sharpness over time.
- **Periorbital hollowness** — depth delta around the eye orbit vs. baseline. Sleep deprivation, dehydration, and aging all surface here.
- **Lip projection** — horizontal distance of philtrum vs. chin plane. Detects volume loss in the perioral region.

### Symmetry metrics
- **3D symmetry index** — point-cloud reflection error across the sagittal plane, normalized to face size. A value of 1.0 = perfect mirror; ~0.85 is the human median. We track delta from personal baseline, never absolute against a population.
- **Brow asymmetry** — eyebrow apex height delta in 3D space (camera-tilt corrected).
- **Smile asymmetry** — lip-corner z-coordinate delta during a calibration smile (optional, only if user opts in to expressive captures).

### Capture quality metrics
- **Pose deviation** — angle between captured head orientation and the canonical reference orientation, in degrees. Used to gate comparisons.
- **Light delta** — color temperature and luminance delta vs. baseline, used to normalize redness/clarity scores.
- **Occlusion mask** — percentage of face landmarks that were visible. Glasses, hair-over-forehead, hands-on-chin all increase occlusion. Below 90% triggers a "partial scan" warning.

> **Why these specific metrics:** they map to the things our four personas actually notice and care about (cheek volume → Maya, jaw definition → Marcus, periorbital hollowness → Priya tracking under-eye treatment, symmetry → Jordan tracking long-term change). Avoid measuring things users won't ever look at; every metric in this list earns its place in the dashboard.

---

## Types

```ts
// src/types/capture3d.ts
// Add to 02_TYPES_AND_MODELS.md during implementation.

export interface Capture3D {
  // Volume metrics
  cheekVolumeLeft: number;        // mm³ relative to baseline; baseline = first-scan value
  cheekVolumeRight: number;       // mm³
  cheekAsymmetryPct: number;      // |L - R| / max(L, R) × 100
  jawDefinitionAngle: number;     // degrees; 100 = sharp jaw, 130+ = soft
  periorbitalHollownessLeft: number;  // mm; positive = more hollow than baseline
  periorbitalHollownessRight: number;
  lipProjection: number;          // mm

  // Symmetry metrics
  symmetryIndex3D: number;        // 0.0–1.0
  browAsymmetry: number;          // mm
  smileAsymmetry?: number;        // mm; optional, only when expressive capture taken

  // Capture quality
  poseDeviationDegrees: number;       // 0 = canonical; >5° gates comparisons
  lightDeltaTemperature: number;      // Kelvin delta vs. baseline
  lightDeltaLuminance: number;        // 0–1 normalized
  occlusionPct: number;               // 0–100; <90 = partial scan

  // Provenance — never leaves device
  capturedAt: string;             // ISO timestamp
  arKitVersion: string;
  deviceModel: string;            // iPhone 15 Pro, etc.
  sceneAmbient: { intensity: number; temperature: number };
}

// The canonical reference orientation captured at first scan.
// Subsequent scans are normalized to this orientation before any 3D math runs.
export interface CanonicalPose {
  capturedAt: string;
  rotation: { x: number; y: number; z: number; w: number }; // quaternion
  translation: { x: number; y: number; z: number };          // meters from camera
}
```

---

## Native module extensions (Swift)

The existing `VelaFaceTracker` module (file 04) gains four new methods. All are non-blocking and emit results via the existing event emitter so the JS layer can render progress.

```swift
// VelaFaceTracker.swift extensions

@objc
public func captureCanonicalPose(_ promise: @escaping ExpoModulesPromise) {
    // Snapshot current ARFaceAnchor.transform.
    // Stored in user defaults under "vela.canonicalPose".
    // Called once during first-scan reveal.
}

@objc
public func compute3DMetrics(_ options: NSDictionary, promise: @escaping ExpoModulesPromise) {
    // Reads current frame's ARFaceAnchor + sceneDepth.
    // Normalizes to canonical pose.
    // Returns Capture3D dict.
    // Throws if no canonical pose stored yet (first scan path uses captureCanonicalPose first).
}

@objc
public func estimateLighting(_ promise: @escaping ExpoModulesPromise) {
    // Returns { intensity: Float, temperature: Float } from
    // currentFrame.lightEstimate (ARDirectionalLightEstimate when available).
}

@objc
public func computeOcclusionMask(_ promise: @escaping ExpoModulesPromise) {
    // Returns occlusionPct: percentage of expected landmarks visible.
    // Drives the partial-scan warning.
}
```

### Quaternion-based pose normalization

This is the unlock that makes longitudinal comparison real:

1. On first scan, capture the head's quaternion and translation as the "canonical pose."
2. On every subsequent scan, compute the rotation difference and apply the inverse to the captured point cloud.
3. Volume / symmetry / hollowness math runs on the *normalized* mesh, not the raw one.

Without this, a user who tilts their head 4° to the right today vs. 4° to the left tomorrow shows a "symmetry shift" that's pure noise.

The math: given captured rotation `q_captured` and canonical `q_canonical`, the correction is `q_correction = q_canonical * conjugate(q_captured)`. Apply to every vertex before measurement.

> **Implementation note:** ARKit's `ARFaceAnchor.transform` is a 4×4 matrix. Decompose into quaternion + translation; ignore scale (faces don't change scale meaningfully between captures and any apparent change is camera distance, which the alignment overlay already gates).

### Lighting normalization

Each scan logs `sceneAmbient.intensity` (lumens) and `sceneAmbient.temperature` (Kelvin) from `currentFrame.lightEstimate`. The on-device scoring code:

1. Compares current lighting to the user's baseline scan lighting.
2. If both luminance and temperature are within ±15% of baseline, scores run normally.
3. If either is outside ±15%, the **redness** and **clarity** sub-scores get a confidence reduction (capped at 0.7 instead of 1.0). The user sees a small "lighting differed today" badge under those scores.
4. If lighting is way off (>40% delta on either), the qualitative AI portion is skipped and only geometric scores update. The user sees: *"Different lighting today — we'll see how next week compares."* (Tone matches file 36 aging-band non-judgmental framing; never passive-aggressive.)

> **UX rationale:** never silently "correct" for lighting — users want to trust the data. Always tell them when something was off and what we did about it.

---

## Capture flow integration

### First scan (baseline)
1. User completes alignment overlay (existing flow).
2. After capture, app calls `captureCanonicalPose()` and stores the result.
3. App computes `Capture3D` for the baseline. Volume metrics are stored as baseline values; subsequent scans report delta-from-baseline.
4. Reveal screen shows the existing score. *No 3D-specific UI here* — the user doesn't need to think about it.

### Subsequent scans
1. Existing alignment + capture.
2. After capture, app reads canonical pose, normalizes, computes `Capture3D`.
3. If `poseDeviationDegrees > 5°` after normalization, the comparison view (file 11) shows a small caveat: *"Your head was at a slightly different angle today — comparisons below correct for that, but very fine details may be less reliable."*
4. If `occlusionPct < 90`, the reveal screen shows: *"Your <hair / glasses / hand> covered part of your face — your scan still counts, but a clearer next one will give us more to work with."* Friendly, never punitive.

### Re-scan suggestion
If `poseDeviationDegrees > 12°` OR `lightDeltaLuminance > 0.4` OR `occlusionPct < 75`, the reveal screen offers a "Try again — the conditions weren't great" CTA. **Never forces a re-scan.** The first scan is always saved; the user can layer a better one on top within the same session window.

---

## Where 3D metrics surface in the product

### Dashboard (file 10)
- **Score breakdown section** gains three new sub-scores: *Cheek volume*, *Jaw definition*, *Eye area*. Each shown as the existing trend sparkline. Tap → metric detail view.
- **First-introduction reveal (file 43):** the 3D sub-scores are hidden until the user has 3+ scans, at which point file 43's reveal calendar surfaces a one-time card titled *"Three new things we're tracking now"* with a 60-word explainer of what each metric measures. Without this card, the new metrics arrive without orientation and confuse users.
- **Capture-quality footer** — small reassurance under the latest scan: *"Captured in matched lighting"* or *"Lighting differed today"*. Reads like a weather report, not an alert.

### Comparison (file 11)
- **Pose-corrected slider mode** — when comparing two scans, the slider now snaps both photos to the canonical orientation. The user sees aligned faces, not faces at different tilts.
- **Volume overlay (toggle)** — colored heatmap showing where volume increased (warm) and decreased (cool) between the two scans. Off by default; lives behind a "Show volume change" pill so users who find it intense can ignore it. **No clinical-style annotations** ("subdermal volume loss in the left malar region" etc.) — Vela's voice is plain language.
- **Symmetry compare** — side-by-side mirror render with a small note: *"Your symmetry today is at 0.91, up from 0.89 in May."* Never call it good or bad. Always personal-baseline-relative.

### Treatment timeline (file 34)
3D metrics are the primary signal for treatment tracking. See `34_TREATMENT_TRACKING.md`.

---

## Edge cases

- **Device without TrueDepth (iPhone XR / SE / 11 base / older)** — feature gracefully degrades. App detects via `ARFaceTrackingConfiguration.isSupported` and `ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)`. On unsupported devices, 3D metrics are simply absent; the dashboard renders without those sub-scores. No upsell, no shame. The user sees the standard 2D experience.
- **TrueDepth occluded** — sunglasses, heavy hair, hands. Native module returns `occlusionPct < 90`; the reveal copy explains kindly. Subsequent scans replace the occluded one as the canonical reference if the user's first scan happened to be partial.
- **Canonical pose drift over years** — a user's face genuinely changes shape over 18+ months. After 18 months from baseline, the app silently re-anchors the canonical pose to the most recent 4-week median. The user is told once: *"We've recalibrated your reference scan to make long-term comparisons more accurate."*
- **Multi-face frames** — ARKit returns the largest face. Native module checks `faceAnchors.count > 1` and rejects with a friendly *"Make sure you're alone in the frame"* error.
- **Lighting too low** — `intensity < 200 lux` fails the geometric scan entirely. Reveal copy: *"It's a bit dark for a clean scan. Find a window or a lamp and we'll try again."* Never *"Capture failed."*
- **First-scan canonical pose was bad** — if the user's baseline scan had `poseDeviationDegrees > 8°` (we didn't have a reference yet so couldn't gate it), the first time they take a clean scan, prompt: *"Want to set this scan as your reference instead? It's clearer than your first one."* Tap once to re-anchor.

---

## Privacy reaffirmation

This file expands what we measure, not what we send.

- All depth maps, point clouds, and 3D meshes stay in the app sandbox.
- The AI proxy (file 06) receives only numerical scores (`Capture3D` fields are JSON-safe numbers).
- The mesh is never written to disk in raw form — only the derived `Capture3D` numbers are persisted.
- A new line is added to the privacy primer in onboarding (file 07): *"Your face's 3D shape stays on your phone. We use it to make your trends accurate, then we forget the shape itself."*

---

## AI integration

The AI scoring proxy (file 06) gets a richer input when 3D data is present:

```ts
// Added to ScoreInput sent to the AI proxy
{
  geometric: {
    // existing 2D landmarks summary...
    cheekVolumeDelta: number,        // % vs personal baseline
    jawDefinitionDelta: number,      // % vs personal baseline
    periorbitalHollownessDelta: number,
    symmetryIndex3DDelta: number,
  },
  qualityFlags: {
    poseDeviationOk: boolean,
    lightingOk: boolean,
    occlusionOk: boolean,
  }
}
```

The score-explanation prompt is updated to use these in plain language:

> "Your cheek volume is steady this month — great. Your jaw definition softened a touch, which often tracks weight changes or hydration. Worth noting alongside how you've been feeling."

Never:
> "Subdermal malar volumetric measurement increased by 3.7%."

---

## Analytics events

Add to file 25:

| Event | Properties | Trigger |
|-------|-----------|---------|
| `capture3d_metrics_computed` | `pose_deviation_deg, occlusion_pct, light_delta_lum, has_canonical_pose` | After every successful scan |
| `capture3d_canonical_pose_set` | `is_first_scan, recalibration` | Baseline + 18-month re-anchor |
| `capture3d_volume_overlay_viewed` | `session_id_a, session_id_b, days_apart` | User toggles volume overlay in compare |
| `capture3d_low_quality_warning_shown` | `reason: pose|lighting|occlusion, severity` | Reveal screen warning |
| `capture3d_rescan_offered` | `accepted: bool` | After offering "try again" CTA |

PII safety: no event includes raw 3D data, photo URIs, or face landmark positions.

---

## Pre-launch checklist

- [ ] Canonical pose persists across app launches (verified on iPhone 13/15)
- [ ] 3D metrics return reasonable values across 4 test users (varied face shapes)
- [ ] Lighting normalization correctly downgrades scores when ±15% threshold exceeded
- [ ] Pose-corrected slider visually aligns faces tilted up to ±20°
- [ ] Volume overlay heatmap colorblind-tested (deuteranopia + protanopia)
- [ ] Occlusion mask correctly detects glasses, hair, hand-on-chin
- [ ] Multi-face rejection tested with two people in frame
- [ ] Low-light error copy reads as friendly, not technical (brand voice review)
- [ ] Privacy primer updated in onboarding (file 07) and in Settings → About (file 14)
- [ ] No raw mesh / depth map written to FileSystem (audit `expo-file-system` writes)
- [ ] Sentry breadcrumbs scrub all 3D coordinate data
- [ ] Graceful fallback verified on iPhone XR (no TrueDepth) and iPhone SE (no ARKit face)
- [ ] 18-month re-anchor logic validated via clock manipulation in dev build
- [ ] Native module unit tests cover: pose normalization math, symmetry index across reflections, occlusion edge cases
- [ ] Maestro E2E flow: first scan → 3 follow-ups → comparison view with overlay
