/**
 * Cypress E2E Test Configuration
 *
 * This file sets up Cypress for end-to-end testing of the Polydraw plugin.
 * Place your E2E tests in the test/cypress/e2e/ directory.
 */

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'test/cypress/support/e2e.ts',
    specPattern: 'test/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
  },
  component: {
    devServer: {
      framework: 'vite',
      bundler: 'vite',
    },
    supportFile: 'test/cypress/support/component.ts',
    specPattern: 'test/cypress/component/**/*.cy.{js,jsx,ts,tsx}',
  },
});
