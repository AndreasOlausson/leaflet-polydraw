/**
 * Cypress Support Files
 *
 * This file contains commands and utilities for Cypress tests.
 */

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to select DOM element by data-cy attribute.
       * @example cy.dataCy('greeting')
       */
      dataCy(value: string): Chainable<Element>;

      /**
       * Custom command to wait for map to be ready
       * @example cy.waitForMap()
       */
      waitForMap(): Chainable<void>;

      /**
       * Custom command to draw a polygon on the map
       * @example cy.drawPolygon([[lat1, lng1], [lat2, lng2], [lat3, lng3]])
       */
      drawPolygon(coordinates: [number, number][]): Chainable<void>;
    }
  }
}
