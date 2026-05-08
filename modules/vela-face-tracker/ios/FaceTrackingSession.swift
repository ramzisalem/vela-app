// FaceTrackingSession.swift
//
// Owns the ARSession, transforms ARFaceAnchor data into the JS payload, and
// determines capture readiness (file 04).
//
// Capture-ready debounce: >= 0.5s of all checks passing simultaneously.
// Distance gate: 0.25m..0.55m. Light intensity: minimumLightIntensity (default 500).
// Neutral expression: smile < 0.3, jawOpen < 0.1, browOuterUpLeft < 0.3.
// Pose tolerances per angle (front, left_turn, right_turn).

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
    private static let DEFAULT_MIN_LIGHT: Double = 500.0

    private var minimumLightIntensity: Double = FaceTrackingSession.DEFAULT_MIN_LIGHT
    private var currentAngle: String = "front"
    private var alignmentTarget: AlignmentTarget = .init(
        yawRange: -0.10...0.10,
        pitchRange: -0.10...0.10,
        rollRange: -0.10...0.10,
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
    fileprivate weak var pendingSceneView: ARSCNView?

    public override init() {
        super.init()
        arSession.delegate = self
    }

    // MARK: - Configure / lifecycle
    public func configure(with cfg: [String: Any]) {
        if let angle = cfg["angle"] as? String { self.currentAngle = angle }
        if let minLux = cfg["minimumLightIntensity"] as? Double {
            self.minimumLightIntensity = minLux
        }
        if let target = cfg["alignmentTarget"] as? [String: Any] {
            updateAlignmentTarget(target)
        }
    }

    public func start() {
        guard ARFaceTrackingConfiguration.isSupported else { return }
        let config = ARFaceTrackingConfiguration()
        if #available(iOS 13.0, *) {
            config.maximumNumberOfTrackedFaces = 1
        }
        if #available(iOS 17.0, *) {
            // Gate iOS 17+ specific options. Never crash older OSes.
            config.isWorldTrackingEnabled = false
        }
        arSession.run(config, options: [.resetTracking, .removeExistingAnchors])
        attachPendingSceneViewIfAny()
    }

    public func stop() {
        arSession.pause()
        currentFrame = nil
        currentFaceAnchor = nil
        lastReadyAt = nil
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
        if let face = frame.anchors.compactMap({ $0 as? ARFaceAnchor }).first {
            currentFaceAnchor = face
        }
        // Throttle to ~10Hz (file 29 perf budget).
        let now = Date()
        if now.timeIntervalSince(lastEmitAt) < 0.1 { return }
        lastEmitAt = now

        evaluateAndEmit(frame: frame)
    }

    // MARK: - Evaluation
    private func evaluateAndEmit(frame: ARFrame) {
        guard let face = currentFaceAnchor else {
            emitState([
                "isFaceDetected": false,
                "isReady": false,
                "distance": 0,
                "lightIntensity": frame.lightEstimate?.ambientIntensity ?? 0,
                "alignment": [:],
                "distanceHint": "no_face",
            ])
            return
        }

        let transform = face.transform
        let cameraTransform = frame.camera.transform
        let toCamera = simd_mul(simd_inverse(cameraTransform), transform)
        let distance = Double(simd_length(simd_make_float3(toCamera.columns.3)))

        // Euler angles
        let euler = eulerAngles(from: transform)
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
        let smileMax = max(smileL, smileR)
        let isNeutral = smileMax < 0.3 && jawOpen < 0.1 && browL < 0.3

        // Distance hint
        let distanceHint: String
        if distance < alignmentTarget.minDistance { distanceHint = "too_close" }
        else if distance > alignmentTarget.maxDistance { distanceHint = "too_far" }
        else { distanceHint = "in_range" }

        let yawOk = alignmentTarget.yawRange.contains(yaw)
        let pitchOk = alignmentTarget.pitchRange.contains(pitch)
        let rollOk = alignmentTarget.rollRange.contains(roll)
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

        let payload: [String: Any] = [
            "isFaceDetected": true,
            "isReady": debouncedReady,
            "distance": distance,
            "distanceHint": distanceHint,
            "lightIntensity": lux,
            "isLightOk": lightOk,
            "isNeutral": isNeutral,
            "alignment": [
                "yaw": yaw, "pitch": pitch, "roll": roll,
                "yawOk": yawOk, "pitchOk": pitchOk, "rollOk": rollOk,
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
        let context = CIContext()
        guard let cg = context.createCGImage(ciImage, from: ciImage.extent) else {
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

        let euler = eulerAngles(from: face.transform)
        let payload: [String: Any] = [
            "imageUri": url.path,
            "transform": Array(face.transform.flat()),
            "rotation": ["yaw": euler.y, "pitch": euler.x, "roll": euler.z],
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
