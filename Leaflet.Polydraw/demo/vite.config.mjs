import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  base: '/leaflet-polydraw/',
  server: {
    fs: {
      allow: [__dirname, path.resolve(__dirname, '../dist'), repoRoot],
    },
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    dedupe: ['leaflet'],
    alias: {
      'leaflet-polydraw': path.resolve(__dirname, '..'),
      leaflet: path.resolve(__dirname, 'node_modules/leaflet'),
    },
  },
});
