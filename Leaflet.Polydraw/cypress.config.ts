import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    supportFile: 'test/cypress/support/e2e.ts',
    specPattern: 'test/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
