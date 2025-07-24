import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    fs: {
      allow: ['.', '../Leaflet.Polydraw/dist']
    }
  }
});
