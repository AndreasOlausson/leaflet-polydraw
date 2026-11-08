import path from 'node:path';
import process from 'node:process';
import { defineConfig, devices, type PlaywrightTestOptions } from '@playwright/test';

const rootDir = path.resolve(process.cwd());
const e2ePort = Number(process.env.POLYDRAW_E2E_PORT ?? 43173);
const e2eBaseURL = `http://127.0.0.1:${e2ePort}/leaflet-polydraw/`;
const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

if (!username || !accessKey) {
  throw new Error(
    'BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY are required for BrowserStack tests.',
  );
}

const commonCapabilities = {
  'browserstack.username': username,
  'browserstack.accessKey': accessKey,
  'browserstack.local': 'true',
  'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
  'browserstack.playwrightVersion': '1.latest',
  'client.playwrightVersion': '1.56.1',
  'browserstack.debug': 'true',
  'browserstack.console': 'info',
  'browserstack.networkLogs': 'false',
  project: process.env.BROWSERSTACK_PROJECT_NAME ?? 'Leaflet.Polydraw',
  build: process.env.BROWSERSTACK_BUILD_NAME ?? `local-${new Date().toISOString()}`,
};

const remote = (
  name: string,
  capabilities: Record<string, string | undefined>,
  context: Partial<PlaywrightTestOptions> = {},
) => ({
  name,
  use: {
    ...context,
    connectOptions: {
      wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(
        JSON.stringify({ ...commonCapabilities, ...capabilities, name }),
      )}`,
    },
  },
});

export default defineConfig({
  testDir: path.resolve(rootDir, 'test/playwright'),
  testMatch: 'browserstack-smoke.spec.ts',
  fullyParallel: false,
  workers: 3,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/browserstack' }]],
  use: {
    baseURL: e2eBaseURL,
    headless: true,
    // Remote connection metadata can contain credentials, so do not persist traces.
    trace: 'off',
  },
  projects: [
    remote('Chrome latest / Windows 11', {
      browser: 'chrome',
      browser_version: 'latest',
      os: 'Windows',
      os_version: '11',
      resolution: '1440x900',
    }),
    remote('WebKit latest / macOS Sonoma', {
      browser: 'playwright-webkit',
      os: 'OS X',
      os_version: 'Sonoma',
      resolution: '1440x900',
    }),
    remote(
      'Chrome touch / Windows 11',
      {
        browser: 'chrome',
        browser_version: 'latest',
        os: 'Windows',
        os_version: '11',
      },
      { ...devices['iPhone 15 Pro'] },
    ),
  ],
  webServer: {
    command: `npm run preview -- --host 0.0.0.0 --port ${e2ePort}`,
    cwd: path.resolve(rootDir, 'demo'),
    url: e2eBaseURL,
    reuseExistingServer: false,
    timeout: 120000,
  },
  retries: 1,
  timeout: 90000,
});
