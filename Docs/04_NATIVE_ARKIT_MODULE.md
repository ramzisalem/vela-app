# 04 — Native ARKit Module (Custom Expo Module)

## Overview
This is the technical core of Vela and the most complex part of the build. We're creating a custom Expo native module that wraps ARKit's face tracking functionality and exposes it to React Native through TypeScript.

**This is iOS-only.** Android equivalent (using ARCore Augmented Faces) will be a separate module in v2. The architecture supports both.

---

## Why a Custom Native Module

React Native cannot directly access ARKit. Existing camera libraries (vision-camera, expo-camera) don't expose face anchor transforms or blend shapes. Our alignment system requires:

- Real-time face anchor detection with 4x4 transform matrices
- Distance measurement via TrueDepth
- Blend shape values for expression detection
- Light estimation
- Frame capture with metadata

All of this requires native ARKit access. We're writing about 800-1000 lines of Swift wrapped behind a clean TypeScript API.

---

## Create the Module

```bash
# In project root
npx create-expo-module modules/vela-face-tracker --local
```

This creates a local module in `modules/vela-face-tracker/`. We'll only implement the iOS side at v1.

---

## Module Structure

```
modules/vela-face-tracker/
├── ios/
│   ├── VelaFaceTrackerModule.swift       # Native module (exposes JS API)
│   ├── VelaFaceTrackerView.swift         # Native UI view (camera + AR)
│   ├── FaceTrackingSession.swift         # Core ARKit logic
│   └── VelaFaceTracker.podspec
├── src/
│   ├── index.ts                          # Public TypeScript API
│   ├── VelaFaceTrackerView.tsx           # React Native component
│   └── types.ts                          # TypeScript types
├── expo-module.config.json
└── package.json
```

---

## expo-module.config.json

```json
{
  "platforms": ["ios"],
  "ios": {
    "modules": ["VelaFaceTrackerModule"]
  }
}
```

---

## TypeScript Types

```typescript
// modules/vela-face-tracker/src/types.ts

export type CaptureAngle = 'front' | 'left_turn' | 'right_turn';

export interface FaceTransform {
  transform: number[]; // 16 floats (4x4 matrix flattened, row-major)
  distance: number;    // meters from camera
  eulerAngles: {
    pitch: number;
    yaw: number;
    roll: number;
  };
}

export interface AlignmentChecks {
  distance: boolean;
  lighting: boolean;
  expression: boolean;
  alignment: boolean;
}

export interface FaceTrackingState {
  isFaceDetected: boolean;
  currentTransform?: FaceTransform;
  ambientLightIntensity: number; // lumens
  blendShapes: Record<string, number>;
  checks: AlignmentChecks;
}

export interface CaptureResult {
  imageUri: string;        // Local URI of captured photo
  transform: FaceTransform;
  ambientLight: number;
  capturedAt: string;      // ISO timestamp
}

export interface AlignmentTarget {
  // Position from a previous capture to align against
  transform: FaceTransform;
  // Tolerances (use defaults if not specified)
  rotationTolerance?: number;  // radians, default 0.08
  distanceTolerance?: number;  // meters, default 0.05
}

export interface FaceTrackingConfig {
  angle: CaptureAngle;
  alignmentTarget?: AlignmentTarget;  // Required for non-baseline scans
  minimumLightIntensity?: number;     // default 500 lumens
}
```

---

## Public TypeScript API

```typescript
// modules/vela-face-tracker/src/index.ts
import { requireNativeModule, EventEmitter, Subscription } from 'expo-modules-core';
import VelaFaceTrackerView from './VelaFaceTrackerView';
import type {
  CaptureAngle,
  FaceTransform,
  AlignmentChecks,
  FaceTrackingState,
  CaptureResult,
  AlignmentTarget,
  FaceTrackingConfig,
} from './types';

const VelaFaceTrackerModule = requireNativeModule('VelaFaceTrackerModule');

const emitter = new EventEmitter(VelaFaceTrackerModule);

export {
  VelaFaceTrackerView,
  type CaptureAngle,
  type FaceTransform,
  type AlignmentChecks,
  type FaceTrackingState,
  type CaptureResult,
  type AlignmentTarget,
  type FaceTrackingConfig,
};

export const VelaFaceTracker = {
  // Check if device supports ARKit face tracking
  async isSupported(): Promise<boolean> {
    return await VelaFaceTrackerModule.isSupported();
  },
  
  // Request camera permission
  async requestPermission(): Promise<boolean> {
    return await VelaFaceTrackerModule.requestPermission();
  },
  
  // Configure the tracking session before showing the view
  async configure(config: FaceTrackingConfig): Promise<void> {
    await VelaFaceTrackerModule.configure(config);
  },
  
  // Start AR session (called when view is mounted)
  async startSession(): Promise<void> {
    await VelaFaceTrackerModule.startSession();
  },
  
  // Stop AR session (called when view is unmounted)
  async stopSession(): Promise<void> {
    await VelaFaceTrackerModule.stopSession();
  },
  
  // Capture current frame (only works when checks pass)
  async captureFrame(): Promise<CaptureResult> {
    return await VelaFaceTrackerModule.captureFrame();
  },
  
  // Listen to tracking state changes (fires every frame)
  addStateListener(listener: (state: FaceTrackingState) => void): Subscription {
    return emitter.addListener('onTrackingStateChange', listener);
  },
  
  // Listen to capture-ready events (when all checks pass for ≥ 0.5s)
  addCaptureReadyListener(listener: (ready: boolean) => void): Subscription {
    return emitter.addListener('onCaptureReady', listener);
  },
};
```

---

## React Native View Component

```typescript
// modules/vela-face-tracker/src/VelaFaceTrackerView.tsx
import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { ViewProps } from 'react-native';

interface VelaFaceTrackerViewProps extends ViewProps {
  // No props at v1 — view is controlled via VelaFaceTracker.configure()
}

const NativeView: React.ComponentType<VelaFaceTrackerViewProps> =
  requireNativeViewManager('VelaFaceTrackerView');

export default function VelaFaceTrackerView(props: VelaFaceTrackerViewProps) {
  return <NativeView {...props} />;
}
```

---

## Native Module (Swift)

```swift
// modules/vela-face-tracker/ios/VelaFaceTrackerModule.swift
import ExpoModulesCore
import ARKit
import AVFoundation

public class VelaFaceTrackerModule: Module {
    
    private var trackingSession: FaceTrackingSession?
    
    public func definition() -> ModuleDefinition {
        Name("VelaFaceTrackerModule")
        
        Events("onTrackingStateChange", "onCaptureReady")
        
        // MARK: - Methods
        
        AsyncFunction("isSupported") { () -> Bool in
            return ARFaceTrackingConfiguration.isSupported
        }
        
        AsyncFunction("requestPermission") { (promise: Promise) in
            AVCaptureDevice.requestAccess(for: .video) { granted in
                promise.resolve(granted)
            }
        }
        
        AsyncFunction("configure") { (config: [String: Any]) in
            DispatchQueue.main.async { [weak self] in
                self?.trackingSession = FaceTrackingSession(
                    config: config,
                    onStateChange: { [weak self] state in
                        self?.sendEvent("onTrackingStateChange", state)
                    },
                    onCaptureReady: { [weak self] ready in
                        self?.sendEvent("onCaptureReady", ["ready": ready])
                    }
                )
                // If the View mounted before configure() — bind it now.
                self?.attachPendingSceneViewIfAny()
            }
        }
        
        AsyncFunction("startSession") { () in
            DispatchQueue.main.async { [weak self] in
                self?.trackingSession?.start()
            }
        }
        
        AsyncFunction("stopSession") { () in
            DispatchQueue.main.async { [weak self] in
                self?.trackingSession?.stop()
            }
        }
        
        AsyncFunction("captureFrame") { (promise: Promise) in
            guard let session = self.trackingSession else {
                promise.reject("ERR_NO_SESSION", "Session not configured")
                return
            }
            
            session.captureFrame { result in
                switch result {
                case .success(let captureResult):
                    promise.resolve(captureResult)
                case .failure(let error):
                    promise.reject("ERR_CAPTURE", error.localizedDescription)
                }
            }
        }
        
        // MARK: - View
        
        View(VelaFaceTrackerView.self) {
            // No props at v1
        }
    }

    // MARK: - View↔Session bridge
    //
    // Called by `VelaFaceTrackerView` once it has constructed its ARSCNView.
    // The module owns the session; the view borrows it. This is intentionally
    // not exposed to JS — it's a Swift-only API used by the View class below.
    //
    // If the JS side calls `configure` AFTER the view mounts (which it usually
    // does), `trackingSession` is nil at first call. We retain the pending
    // sceneView and bind once the session is created.
    private var pendingSceneView: ARSCNView?

    func bindARView(_ sceneView: ARSCNView) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if let session = self.trackingSession {
                session.bindToSceneView(sceneView)
            } else {
                self.pendingSceneView = sceneView
            }
        }
    }

    /// Internal: invoked by `configure` after the session is constructed,
    /// so we attach a previously-mounted view that arrived first.
    func attachPendingSceneViewIfAny() {
        guard let view = pendingSceneView else { return }
        trackingSession?.bindToSceneView(view)
        pendingSceneView = nil
    }
}
```

---

## Native View (Swift)

```swift
// modules/vela-face-tracker/ios/VelaFaceTrackerView.swift
import ExpoModulesCore
import ARKit
import SceneKit

class VelaFaceTrackerView: ExpoView {
    
    private var sceneView: ARSCNView!
    private weak var trackingSession: FaceTrackingSession?
    
    required init(appContext: AppContext? = nil) {
        super.init(appContext: appContext)
        setupSceneView()
    }
    
    private func setupSceneView() {
        sceneView = ARSCNView(frame: bounds)
        sceneView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        sceneView.automaticallyUpdatesLighting = true
        addSubview(sceneView)
        
        // Connect to the tracking session
        if let module = appContext?.moduleRegistry.get(moduleWithName: "VelaFaceTrackerModule") as? VelaFaceTrackerModule {
            // Module manages the session — view just provides the AR view
            // We need a way to connect the session's ARSession to this view
            connectToSession()
        }
    }
    
    private func connectToSession() {
        // Get reference to the FaceTrackingSession from the module
        // and have it use this view's ARSCNView
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            guard let self = self,
                  let module = self.appContext?.moduleRegistry.get(
                    moduleWithName: "VelaFaceTrackerModule"
                  ) as? VelaFaceTrackerModule else { return }
            
            // Module exposes the session — view binds to its scene
            module.bindARView(self.sceneView)
        }
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        sceneView.frame = bounds
    }
}
```

---

## Core ARKit Logic

```swift
// modules/vela-face-tracker/ios/FaceTrackingSession.swift
import ARKit
import AVFoundation
import UIKit

class FaceTrackingSession: NSObject, ARSessionDelegate {
    
    // MARK: - Properties
    private let session = ARSession()
    private weak var sceneView: ARSCNView?
    
    private let onStateChange: ([String: Any]) -> Void
    private let onCaptureReady: (Bool) -> Void
    
    private let angle: String  // "front" | "left_turn" | "right_turn"
    private let alignmentTarget: [String: Any]?
    private let minimumLightIntensity: Double
    
    // State tracking
    private var lastReadyTimestamp: Date?
    private let minimumReadyDuration: TimeInterval = 0.5
    private var isCurrentlyReady = false
    
    // Latest data
    private var latestFaceAnchor: ARFaceAnchor?
    private var latestFrame: ARFrame?
    private var latestAmbientLight: Double = 0
    
    // MARK: - Initialization
    init(
        config: [String: Any],
        onStateChange: @escaping ([String: Any]) -> Void,
        onCaptureReady: @escaping (Bool) -> Void
    ) {
        self.angle = config["angle"] as? String ?? "front"
        self.alignmentTarget = config["alignmentTarget"] as? [String: Any]
        self.minimumLightIntensity = config["minimumLightIntensity"] as? Double ?? 500.0
        self.onStateChange = onStateChange
        self.onCaptureReady = onCaptureReady
        super.init()
        
        session.delegate = self
    }
    
    // MARK: - Lifecycle
    func start() {
        guard ARFaceTrackingConfiguration.isSupported else {
            print("[VelaFaceTracker] ARFaceTracking not supported")
            return
        }
        
        let configuration = ARFaceTrackingConfiguration()
        configuration.isLightEstimationEnabled = true
        configuration.maximumNumberOfTrackedFaces = 1

        // iOS 17+ adds richer face-anchor data (geometry confidence,
        // expanded blendShape set). On iOS 15–16 the rest of the module
        // still works — we just lose those fields. Gate any iOS-17-only
        // configuration here, never crash on older OSes.
        if #available(iOS 17.0, *) {
            // No iOS-17-only knobs are required at v1.
            // Examples for future use:
            //   configuration.worldAlignment = .gravity
            //   configuration.providesAudioData = false
        }

        session.run(configuration, options: [.resetTracking, .removeExistingAnchors])
    }
    
    func stop() {
        session.pause()
    }
    
    func bindToSceneView(_ sceneView: ARSCNView) {
        self.sceneView = sceneView
        sceneView.session = session
    }
    
    // MARK: - ARSessionDelegate
    func session(_ session: ARSession, didUpdate frame: ARFrame) {
        latestFrame = frame
        
        if let lightEstimate = frame.lightEstimate {
            latestAmbientLight = Double(lightEstimate.ambientIntensity)
        }
        
        // Process face anchor if present
        for anchor in frame.anchors {
            if let faceAnchor = anchor as? ARFaceAnchor {
                latestFaceAnchor = faceAnchor
                processFaceAnchor(faceAnchor)
                break
            }
        }
    }
    
    // MARK: - Face Processing
    private func processFaceAnchor(_ anchor: ARFaceAnchor) {
        let transform = extractTransform(from: anchor)
        let blendShapes = extractBlendShapes(from: anchor)
        
        // Run all checks
        let distanceCheck = checkDistance(transform: transform)
        let lightingCheck = latestAmbientLight >= minimumLightIntensity
        let expressionCheck = checkNeutralExpression(blendShapes: blendShapes)
        let alignmentCheck = checkAlignment(transform: transform)
        
        let allChecks = distanceCheck && lightingCheck && expressionCheck && alignmentCheck
        
        // Update ready state with debouncing
        if allChecks {
            if lastReadyTimestamp == nil {
                lastReadyTimestamp = Date()
            }
            
            let elapsedTime = Date().timeIntervalSince(lastReadyTimestamp!)
            if elapsedTime >= minimumReadyDuration && !isCurrentlyReady {
                isCurrentlyReady = true
                onCaptureReady(true)
            }
        } else {
            lastReadyTimestamp = nil
            if isCurrentlyReady {
                isCurrentlyReady = false
                onCaptureReady(false)
            }
        }
        
        // Emit state to JS
        emitTrackingState(
            transform: transform,
            blendShapes: blendShapes,
            checks: (distance: distanceCheck, lighting: lightingCheck, expression: expressionCheck, alignment: alignmentCheck)
        )
    }
    
    // MARK: - Checks
    //
    // Distance gate: 0.25 m floor (avoid forehead occluding TrueDepth IR
    // dot pattern + ARFaceTracking instability close-range) and 0.55 m
    // ceiling (beyond ~55 cm the depth signal degrades and shorter-armed
    // users / users with mobility limits couldn't reach 40 cm reliably).
    // Tuneable per user via `config.minDistance` / `config.maxDistance`.
    private static let DEFAULT_MIN_DISTANCE: Double = 0.25
    private static let DEFAULT_MAX_DISTANCE: Double = 0.55

    private func checkDistance(transform: [String: Any]) -> Bool {
        guard let distance = transform["distance"] as? Double else { return false }
        let minD = (alignmentTarget?["minDistance"] as? Double)
            ?? Self.DEFAULT_MIN_DISTANCE
        let maxD = (alignmentTarget?["maxDistance"] as? Double)
            ?? Self.DEFAULT_MAX_DISTANCE
        return distance >= minD && distance <= maxD
    }

    // Distance hint for the UI: returns 'too-close' | 'too-far' | 'in-range'.
    // The capture screen (file 05) reads this from the emitted state and
    // shows a one-line hint ("Move closer" / "Move further away") instead of
    // the bare ✗ — users with short arms or mobility limits otherwise have no
    // way to know which direction to move.
    private func distanceHint(transform: [String: Any]) -> String {
        guard let distance = transform["distance"] as? Double else { return "in-range" }
        let minD = (alignmentTarget?["minDistance"] as? Double) ?? Self.DEFAULT_MIN_DISTANCE
        let maxD = (alignmentTarget?["maxDistance"] as? Double) ?? Self.DEFAULT_MAX_DISTANCE
        if distance < minD { return "too-close" }
        if distance > maxD { return "too-far" }
        return "in-range"
    }
    
    private func checkNeutralExpression(blendShapes: [String: Double]) -> Bool {
        let smileLeft = blendShapes["mouthSmileLeft"] ?? 0
        let smileRight = blendShapes["mouthSmileRight"] ?? 0
        let mouthOpen = blendShapes["jawOpen"] ?? 0
        let browRaise = blendShapes["browOuterUpLeft"] ?? 0
        
        return smileLeft < 0.3 && smileRight < 0.3 && mouthOpen < 0.1 && browRaise < 0.3
    }
    
    private func checkAlignment(transform: [String: Any]) -> Bool {
        guard let euler = transform["eulerAngles"] as? [String: Double],
              let yaw = euler["yaw"],
              let pitch = euler["pitch"] else { return false }
        
        if let target = alignmentTarget,
           let targetEuler = (target["transform"] as? [String: Any])?["eulerAngles"] as? [String: Double] {
            // Compare against previous capture
            let yawDiff = abs(yaw - (targetEuler["yaw"] ?? 0))
            let pitchDiff = abs(pitch - (targetEuler["pitch"] ?? 0))
            let rollDiff = abs((euler["roll"] ?? 0) - (targetEuler["roll"] ?? 0))
            
            let tolerance: Double = (alignmentTarget?["rotationTolerance"] as? Double) ?? 0.08
            return yawDiff < tolerance && pitchDiff < tolerance && rollDiff < tolerance
        } else {
            // Baseline mode — check angle by name
            switch angle {
            case "front":
                return abs(yaw) < 0.15 && abs(pitch) < 0.15
            case "left_turn":
                return yaw < -0.20 && yaw > -0.45
            case "right_turn":
                return yaw > 0.20 && yaw < 0.45
            default:
                return false
            }
        }
    }
    
    // MARK: - Capture
    enum CaptureError: Error {
        case noActiveFrame
        case notReady
        case imageProcessingFailed
    }
    
    func captureFrame(completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard let frame = latestFrame, let anchor = latestFaceAnchor else {
            completion(.failure(CaptureError.noActiveFrame))
            return
        }
        
        guard isCurrentlyReady else {
            completion(.failure(CaptureError.notReady))
            return
        }
        
        // Convert pixel buffer to UIImage
        let pixelBuffer = frame.capturedImage
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext()
        
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else {
            completion(.failure(CaptureError.imageProcessingFailed))
            return
        }
        
        let image = UIImage(cgImage: cgImage)
        
        // Save to temporary file
        guard let imageData = image.heicData(compressionQuality: 0.85) ?? image.jpegData(compressionQuality: 0.85) else {
            completion(.failure(CaptureError.imageProcessingFailed))
            return
        }
        
        let filename = "\(UUID().uuidString).jpg"
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent(filename)
        
        do {
            try imageData.write(to: fileURL)
            
            let transform = extractTransform(from: anchor)
            
            let result: [String: Any] = [
                "imageUri": fileURL.absoluteString,
                "transform": transform,
                "ambientLight": latestAmbientLight,
                "capturedAt": ISO8601DateFormatter().string(from: Date()),
            ]
            
            completion(.success(result))
        } catch {
            completion(.failure(error))
        }
    }
    
    // MARK: - Extractors
    private func extractTransform(from anchor: ARFaceAnchor) -> [String: Any] {
        let m = anchor.transform
        let flatTransform: [Double] = [
            Double(m.columns.0.x), Double(m.columns.0.y), Double(m.columns.0.z), Double(m.columns.0.w),
            Double(m.columns.1.x), Double(m.columns.1.y), Double(m.columns.1.z), Double(m.columns.1.w),
            Double(m.columns.2.x), Double(m.columns.2.y), Double(m.columns.2.z), Double(m.columns.2.w),
            Double(m.columns.3.x), Double(m.columns.3.y), Double(m.columns.3.z), Double(m.columns.3.w),
        ]
        
        let pos = m.columns.3
        let distance = Double(sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z))
        
        let pitch = Double(asin(-m.columns.2.y))
        let yaw = Double(atan2(m.columns.2.x, m.columns.2.z))
        let roll = Double(atan2(m.columns.0.y, m.columns.1.y))
        
        return [
            "transform": flatTransform,
            "distance": distance,
            "eulerAngles": [
                "pitch": pitch,
                "yaw": yaw,
                "roll": roll,
            ],
        ]
    }
    
    private func extractBlendShapes(from anchor: ARFaceAnchor) -> [String: Double] {
        var result: [String: Double] = [:]
        for (key, value) in anchor.blendShapes {
            result[key.rawValue] = Double(truncating: value)
        }
        return result
    }
    
    private func emitTrackingState(
        transform: [String: Any],
        blendShapes: [String: Double],
        checks: (distance: Bool, lighting: Bool, expression: Bool, alignment: Bool)
    ) {
        let state: [String: Any] = [
            "isFaceDetected": true,
            "currentTransform": transform,
            "ambientLightIntensity": latestAmbientLight,
            "blendShapes": blendShapes,
            "checks": [
                "distance": checks.distance,
                "lighting": checks.lighting,
                "expression": checks.expression,
                "alignment": checks.alignment,
            ],
        ]
        onStateChange(state)
    }
}

// MARK: - UIImage HEIC Extension
extension UIImage {
    func heicData(compressionQuality: CGFloat) -> Data? {
        guard let mutableData = CFDataCreateMutable(nil, 0),
              let destination = CGImageDestinationCreateWithData(mutableData, "public.heic" as CFString, 1, nil),
              let cgImage = cgImage else { return nil }
        
        let options: CFDictionary = [
            kCGImageDestinationLossyCompressionQuality: compressionQuality
        ] as CFDictionary
        
        CGImageDestinationAddImage(destination, cgImage, options)
        guard CGImageDestinationFinalize(destination) else { return nil }
        return mutableData as Data
    }
}
```

---

## Podspec

```ruby
# modules/vela-face-tracker/ios/VelaFaceTracker.podspec
require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'VelaFaceTracker'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '15.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
  
  s.frameworks = 'ARKit', 'SceneKit', 'AVFoundation'
end
```

---

## Using the Module from React Native

```typescript
// Example usage in a screen
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  VelaFaceTracker,
  VelaFaceTrackerView,
  type FaceTrackingState,
  type CaptureResult,
} from '@/modules/vela-face-tracker';

export function CaptureScreen() {
  const [state, setState] = useState<FaceTrackingState | null>(null);
  const [captureReady, setCaptureReady] = useState(false);
  
  useEffect(() => {
    let stateSubscription: any;
    let readySubscription: any;
    
    (async () => {
      // Configure for baseline front capture
      await VelaFaceTracker.configure({
        angle: 'front',
        // No alignment target = baseline mode
      });
      
      // Start session
      await VelaFaceTracker.startSession();
      
      // Subscribe to state changes
      stateSubscription = VelaFaceTracker.addStateListener((newState) => {
        setState(newState);
      });
      
      // Subscribe to capture-ready events
      readySubscription = VelaFaceTracker.addCaptureReadyListener((ready) => {
        setCaptureReady(ready);
      });
    })();
    
    return () => {
      stateSubscription?.remove();
      readySubscription?.remove();
      VelaFaceTracker.stopSession();
    };
  }, []);
  
  const handleCapture = async () => {
    if (!captureReady) return;
    
    try {
      const result: CaptureResult = await VelaFaceTracker.captureFrame();
      console.log('Captured:', result.imageUri);
      // Move to next angle or complete capture
    } catch (error) {
      console.error('Capture failed:', error);
    }
  };
  
  return (
    <View style={styles.container}>
      <VelaFaceTrackerView style={StyleSheet.absoluteFill} />
      {/* Overlay UI showing checks, shutter button, etc. */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
```

---

## Build & Test

After creating the module:

```bash
# Regenerate native projects
npx expo prebuild --clean

# Run on physical iOS device
npx expo run:ios --device
```

**Critical reminder:** This module will not work in iOS simulator. You must use a physical iPhone with Face ID hardware (iPhone X or later).

If the module doesn't build:
1. Check that `expo-module.config.json` is present and valid
2. Check that `Podfile.properties.json` has `"newArchEnabled": "true"`
3. Run `cd ios && pod install` after any changes to native code
4. Clean build folder in Xcode: Product → Clean Build Folder
