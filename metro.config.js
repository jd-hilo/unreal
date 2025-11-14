const { getDefaultConfig } = require('expo/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure Metro honors package "exports" fields (fixes resolving files like ./ExpoRoot)
config.resolver = {
	...(config.resolver || {}),
	unstable_enablePackageExports: true,
};

// Extra safety: make sure common assets like PNG are included (they are by default,
// but we preserve/extend if other tools modify the list).
if (config.resolver.assetExts && !config.resolver.assetExts.includes('png')) {
	config.resolver.assetExts.push('png');
}

module.exports = wrapWithReanimatedMetroConfig(config);

