import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    specPattern: 'test/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'test/cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
