/**
 * WatermelonDB depends on the npm-vendored `simdjson` pod (`@nozbe/simdjson`).
 * CocoaPods trunk does not ship that spec — declare the local path explicitly.
 */
const { withPodfile } = require('@expo/config-plugins');

const SNIPPET = "pod 'simdjson', :path => '../node_modules/@nozbe/simdjson', :modular_headers => true";

function withSimdjsonPod(config) {
  return withPodfile(config, (cfg) => {
    if (cfg.modResults.contents.includes(SNIPPET)) {
      return cfg;
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /(target ['"][^'"]+['"] do\n)(\s*use_expo_modules!)/,
      `$1  ${SNIPPET}\n$2`,
    );
    return cfg;
  });
}

module.exports = withSimdjsonPod;
