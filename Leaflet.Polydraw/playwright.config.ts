const path = require('node:path');
const process = require('node:process');
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: path.resolve(__dirname, 'test/playwright'),
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
    cwd: path.resolve(__dirname, 'demo'),
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  retries: process.env.CI ? 2 : 0,
  timeout: 60000,
});
