const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const sharedRoot = path.resolve(workspaceRoot, 'shared');

/** @type {import('expo/metro-config').MetroConfig} */
let config = getDefaultConfig(projectRoot);

// Racine du monorepo + `shared/` explicite : le bundler doit voir le code hors de `mobile/`
// (résolution `@shared/*` via babel-plugin-module-resolver).
config.watchFolders = [workspaceRoot, sharedRoot];
config.resolver.disableHierarchicalLookup = false;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// NativeWind d'abord : il enveloppe `transformerPath` (css-interop).
config = withNativeWind(config, { input: './global.css' });

// Important : appliquer la config SVG *après* withNativeWind, sinon les .svg restent des assets
// (Metro renvoie un id numérique → "Element type is invalid ... got: number").
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
if (!config.resolver.sourceExts.includes('svg')) {
  config.resolver.sourceExts.push('svg');
}

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};

module.exports = config;
