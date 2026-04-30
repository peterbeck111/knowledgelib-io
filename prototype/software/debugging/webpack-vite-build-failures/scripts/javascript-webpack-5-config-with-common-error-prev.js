// Input:  webpack.config.js — production-ready configuration
// Output: Bundle with polyfill fallbacks, optimized loaders, filesystem cache

const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js', // contenthash, NOT hash (deprecated in v5)
    clean: true, // replaces CleanWebpackPlugin in Webpack 5
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    fallback: {
      // Explicitly set to false for unused Node.js modules
      "fs": false,
      "path": false,
      "crypto": false,
    },
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        include: path.resolve(__dirname, 'src'),
        loader: 'babel-loader',
        options: { cacheDirectory: true },
      },
    ],
  },
  cache: { type: 'filesystem' }, // persistent disk cache
  stats: { errorDetails: true }, // always show error details
};
