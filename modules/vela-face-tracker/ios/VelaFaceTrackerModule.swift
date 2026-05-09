// VelaFaceTrackerModule.swift
//
// Expo module bridge for the Vela ARKit face tracker (file 04).
// iOS only — Android ARCore deferred to v2.
//
// Public JS API (matches src/index.ts):
//   isSupported() -> Bool
//   requestPermission() -> Bool
//   configure(config) -> Void
//   startSession() -> Void
//   stopSession() -> Void
//   captureFrame() -> CaptureResult
//
// Events:
//   onTrackingStateChange — emitted while a session is active
//   onCaptureReady       — emitted when alignment + lighting + neutrality pass

import ExpoModulesCore
import ARKit
import AVFoundation

public class VelaFaceTrackerModule: Module {

    private var session: FaceTrackingSession?

    public func definition() -> ModuleDefinition {
        Name("VelaFaceTrackerModule")

        Events("onTrackingStateChange", "onCaptureReady")

        AsyncFunction("isSupported") { () -> Bool in
            return ARFaceTrackingConfiguration.isSupported
        }

        AsyncFunction("requestPermission") { (promise: Promise) in
            switch AVCaptureDevice.authorizationStatus(for: .video) {
            case .authorized:
                promise.resolve(true)
            case .notDetermined:
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    DispatchQueue.main.async { promise.resolve(granted) }
                }
            default:
                promise.resolve(false)
            }
        }

        Function("configure") { (config: [String: Any]) -> Void in
            FaceTrackingSession.shared.configure(with: config)
        }

        AsyncFunction("startSession") { (promise: Promise) in
            guard ARFaceTrackingConfiguration.isSupported else {
                promise.reject("UNSUPPORTED", "ARFaceTrackingConfiguration not supported on this device")
                return
            }
            FaceTrackingSession.shared.delegate = self
            FaceTrackingSession.shared.start()
            promise.resolve(true)
        }

        Function("stopSession") { () -> Void in
            FaceTrackingSession.shared.stop()
        }

        AsyncFunction("captureFrame") { (promise: Promise) in
            FaceTrackingSession.shared.captureFrame { result in
                switch result {
                case .success(let payload):
                    promise.resolve(payload)
                case .failure(let err):
                    promise.reject("CAPTURE_FAILED", err.localizedDescription)
                }
            }
        }

        // Per-frame metric stream (file 05). 10Hz throttle handled in Swift.
        // Pause only — full `stop()` would end tracking until the capture screen unmounts; users would see "no face" forever after returning from multitasking.
        OnAppEntersBackground {
            FaceTrackingSession.shared.pauseForAppBackground()
        }
        OnAppEntersForeground {
            FaceTrackingSession.shared.resumeAfterAppForeground()
        }

        View(VelaFaceTrackerView.self) {
            Events("onLayoutReady")
        }
    }
}

// MARK: - FaceTrackingSession delegate
extension VelaFaceTrackerModule: FaceTrackingSessionDelegate {
    public func session(_ session: FaceTrackingSession, didUpdateState payload: [String: Any]) {
        sendEvent("onTrackingStateChange", payload)
    }

    public func sessionDidBecomeCaptureReady(_ session: FaceTrackingSession, payload: [String: Any]) {
        sendEvent("onCaptureReady", payload)
    }
}
