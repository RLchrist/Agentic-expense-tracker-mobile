const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for AI model binary files
config.resolver.assetExts.push('bin', 'onnx');

module.exports = withNativeWind(config, { input: './global.css' });
