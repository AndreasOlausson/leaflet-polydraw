import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: './src/polydraw.ts',
      name: 'LeafletPolydraw',
      fileName: (format) => `polydraw.${format}.js`
    },
    rollupOptions: {
      external: ['leaflet'],
      output: {
        globals: {
          leaflet: 'L'
        }
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, 'src/styles/polydraw.css'),
          dest: 'styles' // hamnar som dist/styles/polydraw.css
        },
        {
          src: path.resolve(__dirname, 'public/icons/*'),
          dest: 'icons'
        }
      ]
    })
  ]
});
