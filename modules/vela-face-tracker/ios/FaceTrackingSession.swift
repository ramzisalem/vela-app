// FaceTrackingSession.swift
//
// Owns the ARSession, transforms ARFaceAnchor data into the JS payload, and
// determines capture readiness (file 04).
//
// Capture-ready debounce: >= 0.5s of all checks passing simultaneously.
// Distance gate: 0.25m..0.55m. Light intensity: minimumLightIntensity (default 300 lux for indoor).
// Neutral expression: blend-shape caps (slightly relaxed vs v1 strict).
// Pose tolerances per angle (file 04): gates use **geometry** vs camera — front-camera Euler is a
// poor fit for "Pose" UX because face +Z faces opposite to camera +Z, giving Euler ≈ π at the
// "correct" pose. We compute three independent geometric scalars:
//   • yaw    — heading angle between face-forward and toward-camera ray
//   • pitch  — face-forward's up/down tilt within the camera's vertical plane
//   • roll   — head-cock angle around the toward-camera axis
// Each gates its own indicator; nothing is double-derived. Euler values still land in `rotation`
// for scoring/analytics, but are not used to drive the UI.

import ARKit
import SceneKit
import AVFoundation
import UIKit

public protocol FaceTrackingSessionDelegate: AnyObject {
    func session(_ session: FaceTrackingSession, didUpdateState payload: [String: Any])
    func sessionDidBecomeCaptureReady(_ session: FaceTrackingSession, payload: [String: Any])
}

public enum CaptureError: Error {
    case noActiveFrame
    case notReady
    case imageProcessingFailed
}

public final class FaceTrackingSession: NSObject, ARSessionDelegate {

    public static let shared = FaceTrackingSession()
    public weak var delegate: FaceTrackingSessionDelegate?

    // MARK: - Configuration (file 04)
    private struct AlignmentTarget {
        var yawRange: ClosedRange<Double>
        var pitchRange: ClosedRange<Double>
        var rollRange: ClosedRange<Double>
        var minDistance: Double
        var maxDistance: Double
        // For follow-up scans: tolerance vs prior capture, in radians.
        var rotationToleranceRad: Double
        var distanceToleranceM: Double
    }

    private static let DEFAULT_MIN_DISTANCE: Double = 0.25
    private static let DEFAULT_MAX_DISTANCE: Double = 0.55
    private static let DEFAULT_ROTATION_TOLERANCE: Double = 0.08
    private static let DEFAULT_DISTANCE_TOLERANCE: Double = 0.05
    private static let DEFAULT_MIN_LIGHT: Double = 300.0

    private var minimumLightIntensity: Double = FaceTrackingSession.DEFAULT_MIN_LIGHT
    private var currentAngle: String = "front"
    /// Fallback Euler bands (`yawRange` / `pitch` / `roll`) used only when `currentAngle` is not
    /// `front` \| `left_turn` \| `right_turn`. Known angles gate pose with geometry; distances still apply.
    /// `configure(alignmentTarget:)` may override these ranges for custom / future flows.
    private var alignmentTarget: AlignmentTarget = .init(
        yawRange: -0.45...0.45,
        pitchRange: -0.42...0.42,
        rollRange: -0.55...0.55,
        minDistance: DEFAULT_MIN_DISTANCE,
        maxDistance: DEFAULT_MAX_DISTANCE,
        rotationToleranceRad: DEFAULT_ROTATION_TOLERANCE,
        distanceToleranceM: DEFAULT_DISTANCE_TOLERANCE
    )

    // MARK: - Internal state
    private let arSession = ARSession()
    private var currentFrame: ARFrame?
    private var currentFaceAnchor: ARFaceAnchor?
    private var lastReadyAt: Date?
    private var lastEmitAt: Date = .distantPast
    /// Used to bypass the 10Hz throttle when a face appears or disappears so JS never sticks on stale state.
    private var lastHadFaceInFrame: Bool = false
    fileprivate weak var pendingSceneView: ARSCNView?
    /// Reused for JPEG export — avoids allocating a new `CIContext` every capture (file 04 perf).
    private lazy var ciCaptureContext: CIContext = CIContext()
    /// `true` after JS `startSession` until `stopSession` — used so we resume AR after app background instead of leaving the session dead.
    private var jsWantsSessionRunning = false
    private var pausedForBackground = false

    public override init() {
        super.init()
        arSession.delegate = self
    }

    // MARK: - Configure / lifecycle
    public func configure(with cfg: [String: Any]) {
        if let angle = cfg["angle"] as? String { self.currentAngle = angle }
        applyDefaultAlignmentForCurrentAngle()
        if let minLux = cfg["minimumLightIntensity"] as? Double {
            self.minimumLightIntensity = minLux
        }
        if let target = cfg["alignmentTarget"] as? [String: Any] {
            updateAlignmentTarget(target)
        }
    }

    /// Baseline `alignmentTarget` distance + fallback Euler slices for unknown angle strings.
    private func applyDefaultAlignmentForCurrentAngle() {
        switch currentAngle {
        case "left_turn":
            alignmentTarget.yawRange = 0.08...1.18
            alignmentTarget.pitchRange = -0.55...0.55
            alignmentTarget.rollRange = -0.72...0.72
        case "right_turn":
            alignmentTarget.yawRange = -1.18...(-0.08)
            alignmentTarget.pitchRange = -0.55...0.55
            alignmentTarget.rollRange = -0.72...0.72
        default:
            alignmentTarget.yawRange = -0.45...0.45
            alignmentTarget.pitchRange = -0.42...0.42
            alignmentTarget.rollRange = -0.55...0.55
        }
        alignmentTarget.minDistance = Self.DEFAULT_MIN_DISTANCE
        alignmentTarget.maxDistance = Self.DEFAULT_MAX_DISTANCE
        alignmentTarget.rotationToleranceRad = Self.DEFAULT_ROTATION_TOLERANCE
        alignmentTarget.distanceToleranceM = Self.DEFAULT_DISTANCE_TOLERANCE
    }

    private func buildFaceTrackingConfiguration() -> ARFaceTrackingConfiguration {
        let config = ARFaceTrackingConfiguration()
        if #available(iOS 13.0, *) {
            config.maximumNumberOfTrackedFaces = 1
        }
        if #available(iOS 17.0, *) {
            config.isWorldTrackingEnabled = false
        }
        return config
    }

    public func start() {
        guard ARFaceTrackingConfiguration.isSupported else { return }
        lastHadFaceInFrame = false
        jsWantsSessionRunning = true
        pausedForBackground = false
        rerunFaceSessionKeepingIntent(resetTracking: true)
    }

    public func stop() {
        jsWantsSessionRunning = false
        pausedForBackground = false
        arSession.pause()
        currentFrame = nil
        currentFaceAnchor = nil
        lastReadyAt = nil
        lastHadFaceInFrame = false
    }

    /// Called when the app backgrounds mid-capture. Do **not** use full `stop()` here — JS will not call `startSession` again until the route remounts.
    func pauseForAppBackground() {
        guard jsWantsSessionRunning else { return }
        arSession.pause()
        pausedForBackground = true
    }

    /// Restarts the face session after background if capture was still active.
    func resumeAfterAppForeground() {
        guard jsWantsSessionRunning, pausedForBackground else { return }
        pausedForBackground = false
        rerunFaceSessionKeepingIntent(resetTracking: false)
    }

    /** Shared resume path — call after interruptions or foreground return. */
    private func rerunFaceSessionKeepingIntent(resetTracking: Bool) {
        guard jsWantsSessionRunning else { return }
        lastHadFaceInFrame = false
        currentFaceAnchor = nil
        lastReadyAt = nil
        let opts: ARSession.RunOptions = resetTracking ? [.resetTracking, .removeExistingAnchors] : []
        arSession.run(buildFaceTrackingConfiguration(), options: opts)
        attachPendingSceneViewIfAny()
    }

    // MARK: - Bridging from view (called by VelaFaceTrackerView)
    public func bindARView(_ view: ARSCNView) {
        view.session = arSession
        pendingSceneView = view
    }

    private func attachPendingSceneViewIfAny() {
        guard let view = pendingSceneView else { return }
        view.session = arSession
    }

    // MARK: - ARSessionDelegate
    public func session(_ session: ARSession, didUpdate frame: ARFrame) {
        currentFrame = frame
        // Always sync from the current frame: if the face leaves the view, anchors drop and we must
        // clear the cache — otherwise we keep evaluating a stale anchor and JS never gets `no_face`.
        let face = frame.anchors.compactMap({ $0 as? ARFaceAnchor }).first
        currentFaceAnchor = face
        let hasFace = face != nil
        let facePresenceChanged = hasFace != lastHadFaceInFrame
        lastHadFaceInFrame = hasFace

        // Throttle to ~10Hz (file 29 perf budget), but always emit on face ↔ no-face transitions so UI
        // does not stay stuck showing the previous pose / pills after the user steps out of frame.
        let now = Date()
        if !facePresenceChanged, now.timeIntervalSince(lastEmitAt) < 0.1 { return }
        lastEmitAt = now

        evaluateAndEmit(frame: frame)
    }

    public func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
        guard anchors.contains(where: { $0 is ARFaceAnchor }) else { return }
        guard currentFaceAnchor != nil else { return }
        currentFaceAnchor = nil
        lastHadFaceInFrame = false
        guard let frame = currentFrame else { return }
        evaluateAndEmit(frame: frame)
        lastEmitAt = Date()
    }

    /// Phone call / system sheet can interrupt ARKit without `-applicationDidEnterBackground:`.
    /// Clear debounce immediately; **`sessionInterruptionEnded`** resets tracking so anchors repopulate.
    public func sessionWasInterrupted(_ session: ARSession) {
        lastReadyAt = nil
    }

    public func sessionInterruptionEnded(_ session: ARSession) {
        guard jsWantsSessionRunning else { return }
        rerunFaceSessionKeepingIntent(resetTracking: true)
    }

    // MARK: - Evaluation
    private func evaluateAndEmit(frame: ARFrame) {
        guard let face = currentFaceAnchor else {
            lastReadyAt = nil
            let luxNoFace = frame.lightEstimate?.ambientIntensity ?? 0
            emitState([
                "isFaceDetected": false,
                "isReady": false,
                "readyHoldProgress": 0.0,
                "distance": 0,
                "lightIntensity": luxNoFace,
                "isLightOk": luxNoFace >= minimumLightIntensity,
                "isNeutral": false,
                "alignment": [:],
                "distanceHint": "no_face",
            ])
            return
        }

        let transform = face.transform
        let cameraTransform = frame.camera.transform
        let camPos = simd_make_float3(cameraTransform.columns.3)

        let toCamera = simd_mul(simd_inverse(cameraTransform), transform)
        let distance = Double(simd_length(simd_make_float3(toCamera.columns.3)))

        // Euler (camera-relative) kept for payload / scoring; pose gates below use geometry.
        let Rface = rotation3x3(from: transform)
        let Rcam = rotation3x3(from: cameraTransform)
        let Rrel = simd_mul(Rcam.transpose, Rface)
        let euler = eulerAngles(from: expandRotationTo4x4(Rrel))
        let yaw = Double(euler.y)
        let pitch = Double(euler.x)
        let roll = Double(euler.z)

        // Light estimate
        let lux = frame.lightEstimate?.ambientIntensity ?? 0

        // Neutral expression
        let smileL = (face.blendShapes[.mouthSmileLeft] as? Double) ?? 0
        let smileR = (face.blendShapes[.mouthSmileRight] as? Double) ?? 0
        let jawOpen = (face.blendShapes[.jawOpen] as? Double) ?? 0
        let browL = (face.blendShapes[.browOuterUpLeft] as? Double) ?? 0
        let browR = (face.blendShapes[.browOuterUpRight] as? Double) ?? 0
        let smileMax = max(smileL, smileR)
        let browMax = max(browL, browR)
        let isNeutral = smileMax < 0.42 && jawOpen < 0.14 && browMax < 0.42

        // Distance hint
        let distanceHint: String
        if distance < alignmentTarget.minDistance { distanceHint = "too_close" }
        else if distance > alignmentTarget.maxDistance { distanceHint = "too_far" }
        else { distanceHint = "in_range" }

        // Planar tilt vs camera “level” (⟂ view axis) — drives pitch/roll pills; Euler left in payload for analytics.
        let towardCamUnit: SIMD3<Float> = {
            var v = camPos - simd_make_float3(transform.columns.3)
            let l = simd_length(v)
            if l < 1e-4 { return SIMD3<Float>(0, 0, 1) }
            return v / l
        }()

        // Roll: how much the head is cocked around the camera-axis (independent of pitch).
        // Measures the angle between face-up and camera-up after projecting both onto the
        // plane perpendicular to the toward-camera ray. Was previously called `tilt` and
        // ALSO reused as pitch — a single scalar gating two indicators. Now split.
        let rollMag = planarTiltMisalignmentRad(
            faceTransform: transform,
            towardCam: towardCamUnit,
        )
        let rollOk = rollMag <= 0.55  // ~31° — head-cock around the cam axis.

        // Pitch: how much the head is tilted up/down relative to the toward-camera ray.
        // Now measured against gravity-up, so portrait-camera sensor mounting can't fool it.
        let pitchMag = planarPitchMisalignmentRad(
            faceTransform: transform,
            towardCam: towardCamUnit,
        )
        let pitchOk = pitchMag <= 0.55  // ~31°

        let yawOk: Bool
        // Cone angle between face-forward and toward-cam — always emitted as the yaw
        // magnitude regardless of which angle is active (HUD/analytics-friendly).
        let headingForMag = headingAngleFaceTowardCameraRad(
            faceTransform: transform,
            cameraTransform: cameraTransform,
        )
        switch currentAngle {
        case "front":
            yawOk = headingForMag <= 0.70  // ~40° — pose is "facing the camera" when the cone is small.
        case "left_turn":
            // yp > 0 = user turned to their own left (right cheek toward lens).
            // ~14° lower bound so a casual turn starts registering; ~80° upper bound to
            // include almost-full profiles before atan2 saturates near π/2.
            let faceFwd = faceForwardTowardCamera(faceTransform: transform, cameraPosition: camPos)
            let yp = planarYawRelativeToCamera(faceFwd: faceFwd, towardCam: towardCamUnit)
            yawOk = yp >= 0.20 && yp <= 1.40
        case "right_turn":
            let faceFwd = faceForwardTowardCamera(faceTransform: transform, cameraPosition: camPos)
            let yp = planarYawRelativeToCamera(faceFwd: faceFwd, towardCam: towardCamUnit)
            yawOk = yp <= -0.20 && yp >= -1.40
        default:
            yawOk = alignmentTarget.yawRange.contains(yaw)
        }
        let lightOk = lux >= minimumLightIntensity
        let alignmentOk = yawOk && pitchOk && rollOk && distanceHint == "in_range"
        let isReadyNow = alignmentOk && lightOk && isNeutral

        // Debounce: must hold ready for >= 0.5s.
        var debouncedReady = false
        if isReadyNow {
            if let started = lastReadyAt, Date().timeIntervalSince(started) >= 0.5 {
                debouncedReady = true
            } else if lastReadyAt == nil {
                lastReadyAt = Date()
            }
        } else {
            lastReadyAt = nil
        }

        // 0…1 while pose/light/neutral/distance are good but debounce not finished — drives UI ring.
        var readyHoldProgress = 0.0
        if isReadyNow {
            if debouncedReady {
                readyHoldProgress = 1.0
            } else if let started = lastReadyAt {
                readyHoldProgress = min(1.0, Date().timeIntervalSince(started) / 0.5)
            }
        }

        let payload: [String: Any] = [
            "isFaceDetected": true,
            "isReady": debouncedReady,
            "readyHoldProgress": readyHoldProgress,
            "distance": distance,
            "distanceHint": distanceHint,
            "lightIntensity": lux,
            "isLightOk": lightOk,
            "isNeutral": isNeutral,
            "alignment": [
                // Euler values stay for scoring / analytics. They include the 90°
                // sensor-orientation offset on iPhone front cameras, so don't use them
                // for UX gating — that's what `*Mag` is for.
                "yaw": yaw, "pitch": pitch, "roll": roll,
                // Geometric magnitudes used to drive the pose pill (gravity-referenced,
                // sensor-orientation safe). 0 rad = perfectly aligned.
                "yawMag": Double(headingForMag),
                "pitchMag": Double(pitchMag),
                "rollMag": Double(rollMag),
                // Explicit NSNumber boxing — bridging a Swift Bool inside `[String: Any]`
                // alongside Doubles can occasionally land on the JS side as `0`/`1` rather
                // than `true`/`false`. `nativeBool()` already handles that, but forcing
                // NSNumber(value:) makes the boolean intent unambiguous in the bridge.
                "yawOk": NSNumber(value: yawOk),
                "pitchOk": NSNumber(value: pitchOk),
                "rollOk": NSNumber(value: rollOk),
            ],
            "transform": Array(transform.flat()),
            "rotation": ["yaw": yaw, "pitch": pitch, "roll": roll],
        ]

        delegate?.session(self, didUpdateState: payload)
        if debouncedReady {
            delegate?.sessionDidBecomeCaptureReady(self, payload: payload)
        }
    }

    // MARK: - Capture
    public func captureFrame(completion: @escaping (Result<[String: Any], CaptureError>) -> Void) {
        guard let frame = currentFrame, let face = currentFaceAnchor else {
            completion(.failure(.noActiveFrame))
            return
        }

        let pixelBuffer = frame.capturedImage
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        guard let cg = ciCaptureContext.createCGImage(ciImage, from: ciImage.extent) else {
            completion(.failure(.imageProcessingFailed))
            return
        }
        let uiImage = UIImage(cgImage: cg)

        // Persist to a temp file. iOS may purge — never score off temp URIs;
        // the JS layer copies to Documents/VelaPhotos/ immediately (file 05).
        let tempDir = FileManager.default.temporaryDirectory
        let url = tempDir.appendingPathComponent("vela-capture-\(UUID().uuidString).jpg")
        guard let data = uiImage.jpegData(compressionQuality: 0.85) else {
            completion(.failure(.imageProcessingFailed))
            return
        }
        do {
            try data.write(to: url)
        } catch {
            completion(.failure(.imageProcessingFailed))
            return
        }

        let RfaceCap = rotation3x3(from: face.transform)
        let RcamCap = rotation3x3(from: frame.camera.transform)
        let RrelCap = simd_mul(RcamCap.transpose, RfaceCap)
        let eulerCap = eulerAngles(from: expandRotationTo4x4(RrelCap))
        let payload: [String: Any] = [
            "imageUri": url.path,
            "transform": Array(face.transform.flat()),
            "rotation": ["yaw": eulerCap.y, "pitch": eulerCap.x, "roll": eulerCap.z],
            "distance": frame.distance(to: face),
            "lightIntensity": frame.lightEstimate?.ambientIntensity ?? 0,
            "alignmentQuality": "good",
            "capturedAt": ISO8601DateFormatter().string(from: Date()),
        ]
        completion(.success(payload))
    }

    // MARK: - Helpers
    private func updateAlignmentTarget(_ dict: [String: Any]) {
        if let yaw = dict["yawRange"] as? [Double], yaw.count == 2 {
            alignmentTarget.yawRange = yaw[0]...yaw[1]
        }
        if let pitch = dict["pitchRange"] as? [Double], pitch.count == 2 {
            alignmentTarget.pitchRange = pitch[0]...pitch[1]
        }
        if let roll = dict["rollRange"] as? [Double], roll.count == 2 {
            alignmentTarget.rollRange = roll[0]...roll[1]
        }
        if let minD = dict["minDistance"] as? Double { alignmentTarget.minDistance = minD }
        if let maxD = dict["maxDistance"] as? Double { alignmentTarget.maxDistance = maxD }
        if let rt = dict["rotationToleranceRad"] as? Double { alignmentTarget.rotationToleranceRad = rt }
        if let dt = dict["distanceToleranceM"] as? Double { alignmentTarget.distanceToleranceM = dt }
    }

    private func emitState(_ payload: [String: Any]) {
        delegate?.session(self, didUpdateState: payload)
    }

    /// Angle in \([0, \pi]\) between “face outward” and the direction from face toward camera (0 = aligned).
    /// Picks +Z or −Z from the anchor rotation so it stays correct if the rig’s forward axis disagrees with docs.
    private func headingAngleFaceTowardCameraRad(faceTransform: simd_float4x4, cameraTransform: simd_float4x4) -> Float {
        let facePos = simd_make_float3(faceTransform.columns.3)
        let camPos = simd_make_float3(cameraTransform.columns.3)
        var towardCam = camPos - facePos
        let len = simd_length(towardCam)
        if len < 1e-4 { return .pi }
        towardCam = towardCam / len
        let c2 = simd_make_float3(faceTransform.columns.2)
        let n2 = simd_normalize(c2)
        let negN2 = -n2
        let faceOut = simd_dot(n2, towardCam) >= simd_dot(negN2, towardCam) ? n2 : negN2
        let d = max(-1 as Float, min(1, simd_dot(faceOut, towardCam)))
        return acos(d)
    }

    /// Face +Z or −Z (whichever points more toward the camera) as a unit vector in world space.
    private func faceForwardTowardCamera(faceTransform: simd_float4x4, cameraPosition: SIMD3<Float>) -> SIMD3<Float> {
        let facePos = simd_make_float3(faceTransform.columns.3)
        var towardCam = cameraPosition - facePos
        let len = simd_length(towardCam)
        if len < 1e-4 {
            towardCam = SIMD3<Float>(0, 0, 1)
        } else {
            towardCam = towardCam / len
        }
        let c2 = simd_make_float3(faceTransform.columns.2)
        let n2 = simd_normalize(c2)
        let negN2 = -n2
        return simd_dot(n2, towardCam) >= simd_dot(negN2, towardCam) ? n2 : negN2
    }

    /**
     Horizontal turn angle (rad): signed yaw of face-forward relative to the toward-camera
     direction, measured in the **gravity-horizontal plane** (around world-up, not the
     iPhone's sensor-rotated camera-Y). 0 ≈ nose toward lens; ±turn ≈ cheek toward lens.

     Sign convention: **positive = user turned to their own LEFT** (their right cheek faces
     the camera), negative = user turned right. The `cross(hf, cf)` order is intentional —
     when face-fwd has been rotated to the user's left from toward-cam, the cross product
     with world-up gives a positive component, which matches the natural "left turn = +"
     convention and the existing left_turn / right_turn gates downstream.
     */
    private func planarYawRelativeToCamera(faceFwd: SIMD3<Float>, towardCam: SIMD3<Float>) -> Float {
        let up = Self.WORLD_UP
        var hf = faceFwd - simd_dot(faceFwd, up) * up
        if simd_length_squared(hf) < 1e-10 {
            hf = SIMD3<Float>(1, 0, 0)
        } else {
            hf = simd_normalize(hf)
        }
        var cf = towardCam - simd_dot(towardCam, up) * up
        if simd_length_squared(cf) < 1e-10 {
            cf = SIMD3<Float>(0, 0, -1)
        } else {
            cf = simd_normalize(cf)
        }
        // hf × cf (not cf × hf): puts "user turned left" on the positive side. Earlier
        // version had this inverted, which is why the left_turn gate was matching right
        // turns and the indicator only fired on extreme rotations.
        let cr = simd_cross(hf, cf)
        let si = simd_dot(cr, up)
        let co = simd_dot(cf, hf)
        return atan2(si, co)
    }

    /// World up. ARKit's world coordinate system has its Y axis gravity-aligned, both
    /// for world-tracking and face-tracking configurations. We use this as the "up"
    /// reference for pose math instead of `cameraTransform.columns.1` because the
    /// iPhone front-camera **sensor is physically mounted in landscape**: in a portrait
    /// app, the camera's local Y axis is 90° off from the user-perceived up direction,
    /// which makes a perfectly upright head read as ~±90° "roll" against camera-Y.
    /// Gravity-up dodges that entirely and matches what the user actually sees.
    private static let WORLD_UP: SIMD3<Float> = SIMD3<Float>(0, 1, 0)

    /// Pitch misalignment (rad): how far face-forward tilts up/down relative to the
    /// toward-camera ray, measured in the world-vertical plane. Independent of roll.
    /// 0 rad = looking straight at the camera; π/2 = nose pointed straight up/down.
    private func planarPitchMisalignmentRad(
        faceTransform: simd_float4x4,
        towardCam: SIMD3<Float>,
    ) -> Float {
        // Vertical axis inside the plane perpendicular to toward-cam (world-up projected).
        var vert = Self.WORLD_UP - simd_dot(Self.WORLD_UP, towardCam) * towardCam
        if simd_length_squared(vert) < 1e-10 {
            return 0
        }
        vert = simd_normalize(vert)

        // Face forward axis (out of nose), sign auto-chosen toward the camera.
        let c2 = simd_make_float3(faceTransform.columns.2)
        let n2 = simd_normalize(c2)
        let faceFwd = simd_dot(n2, towardCam) >= simd_dot(-n2, towardCam) ? n2 : -n2

        let along = simd_dot(faceFwd, towardCam)
        let upDown = simd_dot(faceFwd, vert)
        if abs(along) + abs(upDown) < 1e-6 {
            return 0
        }
        return abs(atan2(upDown, along))
    }

    /// Roll misalignment (rad): how much the head is cocked around the toward-camera
    /// axis. Compares face-up to gravity-up after projecting both onto the plane
    /// perpendicular to toward-cam. 0 rad = head level with the world horizon.
    private func planarTiltMisalignmentRad(
        faceTransform: simd_float4x4,
        towardCam: SIMD3<Float>,
    ) -> Float {
        var y = simd_normalize(simd_make_float3(faceTransform.columns.1))
        if simd_dot(y, Self.WORLD_UP) < simd_dot(-y, Self.WORLD_UP) {
            y = -y
        }
        var nu = Self.WORLD_UP - simd_dot(Self.WORLD_UP, towardCam) * towardCam
        if simd_length_squared(nu) < 1e-10 {
            return 0
        }
        nu = simd_normalize(nu)
        var nf = y - simd_dot(y, towardCam) * towardCam
        if simd_length_squared(nf) < 1e-10 {
            return 0
        }
        nf = simd_normalize(nf)
        let d = max(-1 as Float, min(1, simd_dot(nu, nf)))
        return acos(d)
    }

    private func eulerAngles(from m: simd_float4x4) -> SIMD3<Float> {
        // Tait-Bryan, ZYX order — matches JS-side expectation.
        let sy = sqrt(m.columns.0.x * m.columns.0.x + m.columns.1.x * m.columns.1.x)
        let singular = sy < 1e-6
        let x: Float, y: Float, z: Float
        if !singular {
            x = atan2(m.columns.2.y, m.columns.2.z)
            y = atan2(-m.columns.2.x, sy)
            z = atan2(m.columns.1.x, m.columns.0.x)
        } else {
            x = atan2(-m.columns.1.z, m.columns.1.y)
            y = atan2(-m.columns.2.x, sy)
            z = 0
        }
        return SIMD3<Float>(x, y, z)
    }

    private func rotation3x3(from m: simd_float4x4) -> simd_float3x3 {
        simd_float3x3(
            SIMD3<Float>(m.columns.0.x, m.columns.0.y, m.columns.0.z),
            SIMD3<Float>(m.columns.1.x, m.columns.1.y, m.columns.1.z),
            SIMD3<Float>(m.columns.2.x, m.columns.2.y, m.columns.2.z)
        )
    }

    private func expandRotationTo4x4(_ r: simd_float3x3) -> simd_float4x4 {
        simd_float4x4(
            SIMD4<Float>(r.columns.0.x, r.columns.0.y, r.columns.0.z, 0),
            SIMD4<Float>(r.columns.1.x, r.columns.1.y, r.columns.1.z, 0),
            SIMD4<Float>(r.columns.2.x, r.columns.2.y, r.columns.2.z, 0),
            SIMD4<Float>(0, 0, 0, 1)
        )
    }
}

private extension simd_float4x4 {
    func flat() -> [Float] {
        return [
            columns.0.x, columns.0.y, columns.0.z, columns.0.w,
            columns.1.x, columns.1.y, columns.1.z, columns.1.w,
            columns.2.x, columns.2.y, columns.2.z, columns.2.w,
            columns.3.x, columns.3.y, columns.3.z, columns.3.w,
        ]
    }
}

private extension ARFrame {
    func distance(to anchor: ARFaceAnchor) -> Double {
        let cameraInverse = simd_inverse(camera.transform)
        let toCamera = simd_mul(cameraInverse, anchor.transform)
        return Double(simd_length(simd_make_float3(toCamera.columns.3)))
    }
}
