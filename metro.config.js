// metro.config.js
//
// Custom Metro configuration for vyralyx-fitness-app.
//
// Key customisations:
//   1. Stub browser-only / unavailable native packages that are pulled in as
//      transitive dependencies of @tensorflow-models/pose-detection and
//      @tensorflow/tfjs-react-native but are never executed at runtime:
//        - @mediapipe/pose        (BlazePose MediaPipe, web-only)
//        - react-native-fs        (bundleResourceIO, unused — we load from CDN)
//
// These stubs prevent Metro from erroring during bundling while having zero
// effect on runtime behaviour, because the code paths that reference them
// (BlazePose MediaPipe detector, bundleResourceIO) are never called.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ── Extra node module aliases ─────────────────────────────────────────────────
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@mediapipe/pose':               path.resolve(__dirname, 'src/stubs/mediapipe-pose.js'),
  'react-native-fs':               path.resolve(__dirname, 'src/stubs/react-native-fs.js'),
  '@tensorflow/tfjs-backend-webgpu': path.resolve(__dirname, 'src/stubs/tfjs-backend-webgpu.js'),
};

module.exports = config;
