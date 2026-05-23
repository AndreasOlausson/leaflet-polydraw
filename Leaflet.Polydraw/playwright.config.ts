import path from 'node:path';
import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';

const rootDir = path.resolve(process.cwd());
const e2ePort = Number(process.env.POLYDRAW_E2E_PORT ?? 43173);
const e2eBaseURL = `http://127.0.0.1:${e2ePort}/leaflet-polydraw/`;

export default defineConfig({
  testDir: path.resolve(rootDir, 'test/playwright'),
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: e2eBaseURL,
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
    command: `npm run preview -- --host 127.0.0.1 --port ${e2ePort}`,
    cwd: path.resolve(rootDir, 'demo'),
    url: e2eBaseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  retries: process.env.CI ? 2 : 0,
  timeout: 60000,
});
