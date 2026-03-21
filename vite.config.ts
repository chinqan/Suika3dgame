import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
  },
  build: {
    target: 'es2020',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:7860',
    },
  },
  preview: {
    port: 7860,
    host: true,
  },
});
