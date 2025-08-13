import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/unit/**/*.test.ts'],
    globals: true,
    setupFiles: ['./test/unit/setup.ts'],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
