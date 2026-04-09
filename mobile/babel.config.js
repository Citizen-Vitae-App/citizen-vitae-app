module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // Désactive l’auto-plugin reanimated/worklets du preset pour n’en avoir qu’un seul, en dernier (requis Reanimated 4).
      ['babel-preset-expo', { jsxImportSource: 'nativewind', reanimated: false }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@shared': '../shared',
          },
          extensions: ['.tsx', '.ts', '.js', '.json'],
        },
      ],
      'react-native-worklets/plugin',
    ],
  };
};
