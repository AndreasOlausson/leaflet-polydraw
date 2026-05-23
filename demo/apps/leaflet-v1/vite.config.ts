import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appDir, '../../..');
const polydrawRoot = resolve(repoRoot, 'Leaflet.Polydraw');
const requireFromApp = createRequire(resolve(appDir, 'package.json'));
const leafletEntry = requireFromApp.resolve('leaflet');
const leafletStyles = resolve(dirname(leafletEntry), 'leaflet.css');

export default defineConfig(({ command, mode }) => ({
  base: command === 'build' ? '/leaflet-v1/' : '/',
  resolve: {
    alias: [
      { find: /^leaflet$/, replacement: leafletEntry },
      { find: /^leaflet\/dist\/leaflet\.css$/, replacement: leafletStyles },
      ...(mode === 'workspace'
        ? [
            {
              find: /^leaflet-polydraw$/,
              replacement: resolve(polydrawRoot, 'src/polydraw.ts')
            },
            {
              find: /^leaflet-polydraw\/leaflet-polydraw\.css$/,
              replacement: resolve(polydrawRoot, 'src/styles/polydraw.css')
            }
          ]
        : [])
    ]
  },
  server: {
    port: 4174,
    fs: {
      allow: [repoRoot]
    }
  },
  preview: {
    port: 4174
  }
}));
