require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'VelaFaceTracker'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = 'Proprietary'
  s.author         = 'Vela'
  s.homepage       = 'https://getvela.app'
  s.platform       = :ios, '15.0'
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.frameworks = ['ARKit', 'SceneKit', 'AVFoundation', 'Vision', 'CoreImage']

  s.source_files = '**/*.{h,m,mm,swift}'
  s.exclude_files = '**/build/**/*'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
