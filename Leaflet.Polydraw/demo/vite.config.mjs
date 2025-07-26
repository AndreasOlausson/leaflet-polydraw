import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  base: '/leaflet-polydraw/',
  server: {
    fs: {
      allow: ['.', '../dist'],
    },
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      'leaflet-polydraw': path.resolve(__dirname, '../dist/polydraw.es.js'),
    },
  },
});
