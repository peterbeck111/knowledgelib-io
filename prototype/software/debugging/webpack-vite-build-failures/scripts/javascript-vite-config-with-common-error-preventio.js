// Input:  vite.config.js — production-ready configuration
// Output: Optimized build with CJS compatibility and error handling

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015', // explicit browser target
    sourcemap: true,
    rollupOptions: {
      output: {
        // Prevent chunk naming collisions
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  optimizeDeps: {
    // Pre-bundle CJS dependencies that cause issues
    include: ['axios', 'lodash'],
  },
  server: {
    // Fix WSL2 file watching
    watch: { usePolling: true },
  },
});
