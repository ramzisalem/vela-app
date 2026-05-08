# 35 — Hair Tracking

## Why this exists

Face is one of two things people obsess over photographing themselves for; hair is the other. The hair-loss tracking market is enormous (men on finasteride/minoxidil, women with thinning, postpartum shedding, scalp inflammation, transplant aftercare) and almost universally served by ad-hoc selfie folders, Reddit progress threads, and apps that are awful. Vela's standardized capture infrastructure transfers cleanly: same TrueDepth, same lighting normalization, same pose-corrected longitudinal view.

Hair tracking is a v1.5 feature — not because it's complex, but because it deserves its own focused launch and shouldn't dilute the v1 face-tracking message. It is opt-in. Users who don't care never see it.

This file extends `02_TYPES_AND_MODELS.md`, `04_NATIVE_ARKIT_MODULE.md`, `05_CAPTURE_FLOW.md`, `09_ROUTINE.md`, `10_DASHBOARD.md`, `14_SETTINGS_AND_SUBSCRIPTION.md`, `18_PERSONAS.md`, `20_INFORMATION_ARCHITECTURE.md`, and `34_TREATMENT_TRACKING.md` (finasteride / minoxidil / dutasteride / hair transplant treatments).

---

## Product principles

1. **Hair is its own scan, on its own cadence.** A user who tracks both gets a face scan and a hair scan in their weekly session. Same UX language, separate measurements.
2. **No hair-shame copy. Ever.** This domain is full of dark patterns ("Your Norwood 3 is progressing!"). Vela does the opposite. Every word treats hair change as data, not damage.
3. **Inclusive on day one.** Male hairline tracking, female crown thinning, female-pattern thinning, postpartum shedding, eyebrow regrowth, beard density — same infrastructure, same dignified UX.
4. **What we measure is what's defensibly measurable on a phone.** We do not pretend to count individual hairs or estimate medical-grade densitometry. We measure *what we can measure well*: density estimation in defined regions, hairline contour, scalp coverage percentage, midline part width.

---

## What we measure

| Metric | Definition | Capture region | Why it matters |
|---|---|---|---|
| **Hairline density** | Pixels-per-region of opaque hair vs. visible scalp in the frontal hairline ROI | Front-facing capture, hair pulled back | Tracks recession, frontal density |
| **Crown density** | Same metric, crown ROI (top-back of head) | Top-down capture | Tracks vertex/crown thinning |
| **Midline part width** | Width in mm of the visible part down the center of the scalp | Top-down capture | Standard female-pattern progression metric |
| **Hairline contour** | Vector trace of the hairline boundary | Front-facing capture | Tracks recession shape (M-pattern, widow's peak deepening) |
| **Coverage uniformity** | Variance in density across the scalp ROI | Top-down capture | Tracks diffuse vs. patterned thinning |
| **Beard density** *(optional)* | Pixels-per-region in beard ROI | Front-facing capture | Beard tracking (HRT, finasteride paradoxical effects, age) |
| **Brow density** *(optional)* | Pixels-per-region in eyebrow ROI | Front-facing capture | Brow regrowth tracking (e.g., after over-plucking, microblading recovery) |

All metrics are **delta from personal baseline** — never compared to a population norm.

---

## Types

```ts
// src/types/hair.ts
// Add to 02_TYPES_AND_MODELS.md.

export type HairScanRegion =
  | 'hairline-front' | 'crown-top' | 'midline-part'
  | 'beard' | 'brow';

export interface HairScanSession {
  id: string;
  userId: string;
  capturedAt: string;
  // Scan can include any subset; not all users track all regions.
  regions: HairScanRegionResult[];
  qualityNotes: HairScanQuality;
  // Privacy: photos and ROI bitmaps stay on-device.
}

export interface HairScanRegionResult {
  region: HairScanRegion;
  // 0–100 normalized density estimate; scale meaningful only relative to baseline.
  densityScore: number;
  // Region-specific metrics
  hairlineContourPath?: string;       // SVG path, normalized to face landmark space
  partWidthMm?: number;
  coverageUniformity?: number;        // 0–1
  // Computed delta vs. user's baseline for this region.
  deltaFromBaseline: number;          // can be negative
  baselineSessionId?: string;
}

export interface HairScanQuality {
  lighting: 'good' | 'low' | 'high-contrast';
  hairWasWet: boolean | null;
  hairWasStyled: 'natural' | 'pulled-back' | 'styled' | 'unknown';
  occlusionPct: number;               // hat / headphones / scarf
  poseDeviationDegrees: number;
}
```

### WatermelonDB schema

Two new tables, both reactive:

- `hair_scan_sessions` — one per scan; FK to `users`.
- `hair_scan_regions` — many per session.

(Schema mirrors the face `scan_sessions` / sub-score pattern from file 02.)

### Supabase additions

The `profiles` table gains:

- `hair_tracking_enabled boolean default false`
- `hair_tracking_regions text[] default '{}'` — which regions the user has chosen to track.

A new table `hair_baseline_sessions(user_id, region, session_id)` stores per-region baselines. Same RLS pattern.

---

## Capture flow

Hair tracking is enabled in **Settings → Health & lifestyle → Hair tracking → Turn on** (per the file 14 Settings Manifest; this row sits in the Health & lifestyle section, not its own top-level section, to keep the IA shallow). Until then, no hair UI surfaces in the app.

### Onboarding into hair tracking

A focused, opt-in flow:

1. **Why** — single screen explaining what we measure and what we don't. Soft cream surface. *"Hair changes slowly and in patterns we can measure. Like your face, we give you a clear record — same standardized photos, same fair comparisons."* (Tone aligned with file 07 onboarding's "clinically comparable" framing for consistency across surfaces.)
2. **Pick what to track** — checkbox list:
   - Hairline (front)
   - Crown (top of head)
   - Midline part
   - Beard
   - Eyebrows
3. **Privacy primer** — *"Hair photos stay on your phone, just like face photos. We see numbers, not pictures."*
4. **First capture walkthrough** — guided.

### The capture session

A single capture session can contain face + hair. After the face capture (existing flow), if hair tracking is on, a new screen appears:

> **Now your hair**
>
> *(Animated illustration)*
>
> Two more photos. They take about 90 seconds.
>
> [ Walk me through it ]   [ Skip this week ]

Skip is always available; never punitive. Skipped weeks just don't add a hair data point.

### Per-region captures

Each region has its own guided overlay.

#### Hairline (front)
- The same TrueDepth front camera as face capture.
- Overlay shows a mask of where the hairline ROI sits (forehead area, just above brow line up to first ~3 cm into hair).
- Voice/text prompt: *"Pull your hair away from your forehead. Look slightly down so we can see your hairline clearly."*
- Native module computes density on the ROI. Hairline contour traced via Vision framework's `VNDetectFaceLandmarksRequest` + a custom Sobel edge over the ROI to detect hair-skin boundary.

#### Crown (top-down)
- Front camera with a flipped-screen mode: the user holds the phone above their head, screen facing up, and the app uses the back camera with a *very* generous overlay frame.
- Real-time guidance: *"Tilt the phone a bit forward / back / left."* — uses the device's gyroscope.
- Capture trigger is automatic when angle is correct AND lighting is OK AND face is detected at the bottom of frame (so we know which way is "front" for the crown ROI).

#### Midline part
- Same back-camera over-the-head capture. The user combs / parts their hair down the middle first.
- Density of the visible scalp strip + width measurement of the part in mm (using face-width landmark calibration as the size reference).

#### Beard / brow
- Standard front-camera close-up. Beard ROI is the lower face below the lip line; brow ROI is the suprorbital ridge area. Both run through the same density-estimation pipeline.

### Quality gates

- **Hair wet** — if the densitometry pixel histogram skews toward dark/contrasty (wet hair clumps differently), the app asks: *"Is your hair wet today? We can save the scan, but it's better to compare dry-to-dry. Want to try again later?"*
- **Hair styled** — gel/pomade/heavy product creates the same density skew. Same gentle ask.
- **Hat / headphones / glasses** — automatic occlusion detection. *"Looks like part of your scalp is covered. Try once more without the hat?"*
- **Pose deviation > 15°** on top-down capture — automatic re-capture prompt.

> **Never punish a bad scan.** Every quality issue is framed as "let's try again, no big deal" — the user's first scan stays saved as the baseline regardless.

---

## Native module additions (Swift)

Add to `04_NATIVE_ARKIT_MODULE.md`:

```swift
@objc
public func captureHairScan(_ region: NSString, promise: @escaping ExpoModulesPromise) {
    // For top-down regions, switch to back camera + gyro gating.
    // For front regions, use face-tracking session for ROI.
    // Returns: { densityScore, contourPath?, partWidthMm?, qualityNotes }
}

@objc
public func computeHairDensity(_ regionImagePath: NSString, regionMask: NSDictionary,
                               promise: @escaping ExpoModulesPromise) {
    // Load image, mask to ROI, compute hair-vs-scalp pixel ratio in HSV space.
    // Returns normalized 0-100 density estimate.
}

@objc
public func traceHairlineContour(_ frontImagePath: NSString, faceLandmarks: NSDictionary,
                                  promise: @escaping ExpoModulesPromise) {
    // Sobel edge detection within the ROI; trace the topmost continuous hair-skin boundary.
    // Returns SVG path string normalized to face-landmark coordinate space.
}

@objc
public func measureMidlinePart(_ topDownImagePath: NSString, faceLandmarks: NSDictionary,
                                promise: @escaping ExpoModulesPromise) {
    // Detects the visible scalp strip down the center of the frame.
    // Calibrates pixel-to-mm via interpupillary distance (37mm avg) when face landmarks present.
    // Returns width in mm.
}
```

### Why custom rather than ML on-device
A small CNN trained on hair density would be more accurate than a hand-rolled pipeline, but: (1) gathering a balanced training set without race / hair-type bias is genuinely hard and (2) a transparent, deterministic algorithm is auditable and explains itself. We can layer ML in v2 once we have proper training data; the Sobel + HSV pipeline is the honest v1.

### Bias considerations
- Hair density estimation by pixel-counting is sensitive to hair color (very dark hair vs. very light hair vs. gray vs. dyed). The algorithm normalizes per-user against their own baseline, so absolute values don't matter — but if a user changes hair color or goes gray, the next scan will read as a density jump.
- Calibration mechanism: the first time a per-user "color shift" is detected (sharp histogram change), the app asks: *"Did you change your hair color recently? We'll re-calibrate so your tracking stays accurate."* On confirm, we re-anchor the baseline.
- Curly / textured hair: density estimation works as well or better here (more contrast against scalp), but the *contour tracing* in the hairline region needs to handle baby hairs and edge wisps gracefully. The contour algorithm uses a smoothing kernel to avoid jagged paths from individual hairs.

---

## Where hair surfaces in the product

### Dashboard
A second card under the face score: **Hair**. Same visual language — overall score, sparklines per region the user tracks, last scan date. Tap → opens hair detail screen.

### Hair detail screen
Mirrors the face detail screen:
- Trend chart per region.
- Latest scan thumbnail (with the per-region ROI subtly highlighted).
- *"Compare with…"* date picker → opens slider/side-by-side, region-specific.
- Insights card if HealthKit data + hair correlations exist (e.g., *"Your crown density tends to track your sleep over the past months"*).

### Comparison view (file 11)
Hair gets its own comparison mode. Selecting a hair scan as one of the two compared opens the hair-specific slider with the right ROI overlaid. The volume/heatmap overlay (file 32) becomes a density heatmap in this mode (warm = denser, cool = thinner).

### Routine integration (file 09)
When hair tracking is enabled and a user is logging a treatment that affects hair (finasteride, minoxidil, dutasteride, oral minoxidil), the routine engine bias rules from file 34 apply, and hair-specific tasks appear: *"Apply minoxidil 5% (twice daily, scalp dry, leave on)."*

### Treatment timeline (file 34)
Hair-affecting treatments get their primary metrics set to hair regions instead of (or alongside) face metrics. The progress curve for finasteride at 24 weeks looks at `crownDensity` and `hairlineDensity` deltas.

### Brand voice in this section
Hair is, for many users, more emotionally loaded than face. Copy here is **plainer and quieter** than even the rest of Vela. No "growth journey," no "fight back," no "transformation." Just: *"Crown density, week 14. Up 2% from last week. Tracking with what you've been doing."*

---

## Edge cases

- **Postpartum shedding** — a known temporary hair-loss event. The diary (file 37) has a tag for this; if logged, the trend chart shows a soft ghost band over the affected weeks and the AI insight prompt is biased toward expected-recovery framing rather than alarm.
- **Hair transplant aftercare** — users who log "hair transplant" as a treatment in file 34 see their hair detail screen with a *"Healing phase: weeks 1–12"* note. We frame the documented post-op shedding as expected. Density baseline resets to ~12 weeks post-procedure.
- **Big haircut** — a sudden density change from going short or shaving the sides will look like a regression. Diary tag: *"Got a haircut"* → the system marks that week as non-comparable for hairline density (but not for crown / part width if those weren't affected).
- **Hat hair** — a user who almost always wears hats in the morning may have unusual hair behavior in their scans. Captured automatically in `hairWasStyled: 'natural' | 'pulled-back' | 'styled'` self-report.
- **Trans HRT users** — testosterone or estrogen significantly changes hair distribution and growth patterns over months/years. The AI insights prompt is HRT-aware *only* if the user has explicitly logged HRT as a treatment in file 34.
- **Alopecia areata** — patchy, sudden hair loss. The coverage uniformity metric will drop sharply. The AI insight prompt is told to never describe a sharp drop as "concerning"; it just reports the data and suggests *"Worth talking to a dermatologist if this is new for you."*
- **Capture failure on top-down (back camera)** — if the user's phone stays positioned for >12 seconds without a clean capture, the app offers to skip with: *"This one's tricky. Want me to walk you through it again, or skip for this week?"*

---

## AI insights for hair

Add to file 06 as `HAIR_INSIGHT_SYSTEM`:

```
You are writing one observation about how a person's hair has changed.

CONTEXT:
- Region: hairline-front | crown-top | midline-part | beard | brow
- Delta vs. baseline (%)
- Weeks since baseline
- Active treatments (finasteride, minoxidil, dutasteride, hair transplant, etc.)
- Recent diary tags (postpartum, haircut, hat-week)

VOICE:
- Quiet, warm, factual.
- No urgency. No exclamation marks.
- Never use "loss," "thinning" or "balding" if a less loaded word will do.
  Prefer: "density," "coverage," "the front."
- Never characterize change as good or bad — just describe it.
- If positive change: "tracking up." If negative: "tracking down" or "softening."
- If user is on a relevant treatment: connect the change to the treatment time
  course neutrally ("this is around when minoxidil tends to first show up").
- If a diary tag explains the change: name it kindly.

EXAMPLES — good:
- "Your crown density is steady — week eight of finasteride, which is on schedule."
- "The front is tracking up a little since spring. Slow but consistent."
- "Postpartum shedding shows in this scan. This usually peaks around four months and recovers by twelve."

EXAMPLES — bad (do not produce):
- "Hair loss is accelerating!"
- "You should consider stronger treatment."
- "Vertex thinning detected."
```

---

## Privacy

- Hair photos stored locally only, like face photos.
- Top-down captures may inadvertently catch the user's bedroom / bathroom — same EXIF stripping rules from file 32 + 13 apply. Geotags removed before any sharing.
- Hair data is included in the file 14 data export and account deletion flows. Cascade rules cover both new tables.
- The AI proxy receives only `{ region, deltaFromBaseline, weeks, treatmentsActive, diaryTags }` — never the raw images or contour paths.

---

## Sharing

A new share-card variant: *Hair journey*.

Vertical card showing 3-up timeline of crown / hairline / part progressions. Lots of users in the men's-hair community share these on Reddit and YouTube; we make ours dignified and watermarked. Identical privacy guarantees and EXIF stripping as face share cards.

---

## Analytics events

| Event | Properties | Notes |
|---|---|---|
| `hair_tracking_enabled` | `regions: string[]` | |
| `hair_tracking_disabled` | none | |
| `hair_scan_started` | `region` | |
| `hair_scan_completed` | `region, density_score_bucket: 'low'|'mid'|'high', quality_lighting` | Never log raw density |
| `hair_scan_skipped` | `region, week_number` | |
| `hair_baseline_set` | `region` | |
| `hair_color_recalibration_prompt_shown` | `accepted: bool` | |
| `hair_treatment_link_followed` | `treatment_id, region` | |
| `hair_share_card_created` | `regions_included: string[]` | |

---

## Pre-launch checklist

- [ ] Hair tracking is opt-in, off by default, no surface visible until enabled
- [ ] Top-down capture works on every supported iPhone (back camera + gyro gating)
- [ ] Density algorithm normalized per-user; absolute values intentionally not surfaced
- [ ] Hair color change recalibration prompt fires correctly
- [ ] Postpartum, haircut, hat-week diary tags suppress comparison alarms
- [ ] Hairline contour traces handle curly / textured hair without jagged paths (visual review with 6 testers)
- [ ] Brow / beard regions optional, never enabled by default
- [ ] Trans-inclusive copy review (HRT-affecting hair changes)
- [ ] Diary tags integration (file 37) tested for postpartum / haircut / hat-week
- [ ] Treatment integration with finasteride, minoxidil, dutasteride, hair transplant
- [ ] Doctor-friendly PDF (file 34) supports hair primary metrics
- [ ] EXIF stripping + geotag removal on top-down captures
- [ ] All hair copy has zero exclamation marks (linting + manual review)
- [ ] No use of "loss / thinning / balding" except where a user has explicitly used that framing
- [ ] WatermelonDB migrations for new tables tested
- [ ] Account deletion cascades hair_scan_sessions + hair_scan_regions + hair_baseline_sessions
- [ ] AI insight prompt produces neutral language across 100 sample inputs (varied regions, deltas, treatments)
- [ ] Maestro flow: enable hair tracking → first capture → second capture two weeks later → comparison view
- [ ] VoiceOver on hair detail screen reads regions in defined accessibility order
- [ ] Persona check: a man on month-six finasteride and a woman with postpartum shedding both walked through end-to-end
