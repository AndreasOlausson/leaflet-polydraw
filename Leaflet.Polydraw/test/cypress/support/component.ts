/**
 * Cypress Component Support
 *
 * This file contains support for component testing.
 */

import './commands';

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to mount a Polydraw component
       * @example cy.mountPolydraw()
       */
      mountPolydraw(): Chainable<void>;
    }
  }
}
