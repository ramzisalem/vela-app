module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/stores': './src/stores',
            '@/services': './src/services',
            '@/core': './src/core',
            '@/types': './src/types',
            '@/db': './src/db',
            '@/theme': './src/theme',
            '@/utils': './src/utils',
          },
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        },
      ],
      // Required for WatermelonDB.
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      // Reanimated plugin must be last.
      'react-native-reanimated/plugin',
    ],
  };
};
