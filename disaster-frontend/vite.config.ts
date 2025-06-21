import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    })
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    open: true,
  },
  preview: {
    port: 3000,
    host: true,
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, 'src'),
      },
    ],
  },
  define: {
    'process.env': {},
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress warnings during build
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      }
    }
  },
  esbuild: {
    // Disable some strict checks
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
});
