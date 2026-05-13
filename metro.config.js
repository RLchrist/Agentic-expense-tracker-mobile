const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for AI model binary files
config.resolver.assetExts.push('bin', 'onnx');

module.exports = config;
