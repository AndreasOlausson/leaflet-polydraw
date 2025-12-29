import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: path.resolve(rootDir, 'test/playwright'),
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-touch',
      use: { ...devices['Desktop Chrome'], hasTouch: true },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'firefox-touch',
      use: { ...devices['Desktop Firefox'], hasTouch: true },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'webkit-touch',
      use: { ...devices['Desktop Safari'], hasTouch: true },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    cwd: path.resolve(rootDir, 'demo'),
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  retries: process.env.CI ? 2 : 0,
  timeout: 60000,
});
