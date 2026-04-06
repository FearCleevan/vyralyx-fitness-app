// Stub for react-native-fs — only used by @tensorflow/tfjs-react-native's
// bundleResourceIO which we never invoke (we load MoveNet from CDN).
module.exports = {
  readFile: () => Promise.reject(new Error('[stub] react-native-fs not available')),
  writeFile: () => Promise.reject(new Error('[stub] react-native-fs not available')),
  exists: () => Promise.resolve(false),
  mkdir: () => Promise.resolve(),
  unlink: () => Promise.resolve(),
  DocumentDirectoryPath: '',
  CachesDirectoryPath: '',
};
