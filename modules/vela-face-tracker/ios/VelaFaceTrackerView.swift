// VelaFaceTrackerView.swift
//
// ExpoView wrapping ARSCNView. The view binds to FaceTrackingSession.shared
// once mounted so the JS-side <VelaFaceTrackerView /> simply needs to render.

import ExpoModulesCore
import ARKit
import SceneKit

public class VelaFaceTrackerView: ExpoView {
    let scnView = ARSCNView()

    public required init(appContext: AppContext? = nil) {
        super.init(appContext: appContext)
        scnView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(scnView)
        NSLayoutConstraint.activate([
            scnView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scnView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scnView.topAnchor.constraint(equalTo: topAnchor),
            scnView.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
        scnView.automaticallyUpdatesLighting = true
        scnView.autoenablesDefaultLighting = false
        scnView.backgroundColor = .clear

        FaceTrackingSession.shared.bindARView(scnView)
    }
}
