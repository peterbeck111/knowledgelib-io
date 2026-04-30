// Input:  A React project with Webpack using aliases, proxy, env vars, SCSS, and SVG
// Output: Equivalent Vite configuration

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env variables (replaces dotenv-webpack or DefinePlugin with process.env)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),          // Replaces babel-loader + @babel/preset-react
      svgr(),           // Replaces @svgr/webpack (import SVGs as React components)
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@utils': path.resolve(__dirname, 'src/utils'),
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          // Replaces sass-loader additionalData option
          additionalData: `@use "@/styles/variables" as *;`,
        },
      },
      modules: {
        // Replaces css-loader modules option
        localsConvention: 'camelCaseOnly',
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          // Replaces webpack output.filename / chunkFilename
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          // Replaces webpack SplitChunksPlugin
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
          },
        },
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
  };
});
