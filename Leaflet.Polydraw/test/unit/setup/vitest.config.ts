import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/unit/setup/test-setup.ts'],
    include: ['test/unit/**/*.test.ts'],
    exclude: ['node_modules/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'dist/',
        'demo/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/vite-env.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'leaflet-polydraw': resolve(__dirname, './src'),
    },
  },
});
