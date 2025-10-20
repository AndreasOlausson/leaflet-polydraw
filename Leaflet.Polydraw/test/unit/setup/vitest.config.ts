import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/unit/setup/test-setup.ts'],
    include: ['test/unit/**/*.test.ts'],
    exclude: ['test-legacy/**/*', 'node_modules/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'test-legacy/',
        'dist/',
        'demo/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/vite-env.d.ts',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'leaflet-polydraw': resolve(__dirname, './src'),
    },
  },
});
