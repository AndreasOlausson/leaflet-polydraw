/**
 * Cypress Commands
 *
 * This file contains custom Cypress commands for testing the Polydraw plugin.
 */

// Custom command to select DOM element by data-cy attribute
Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy=${value}]`);
});

// Custom command to wait for map to be ready
Cypress.Commands.add('waitForMap', () => {
  cy.get('.leaflet-container').should('be.visible');
  cy.get('.leaflet-tile').should('have.length.greaterThan', 0);
});

// Custom command to draw a polygon on the map
Cypress.Commands.add('drawPolygon', (coordinates: [number, number][]) => {
  // Enable draw mode
  cy.get('[data-cy="draw-button"]').click();

  // Draw polygon by clicking on coordinates
  coordinates.forEach(([lat, lng]) => {
    cy.get('.leaflet-container').click(lng, lat);
  });

  // Complete the polygon
  cy.get('.leaflet-container').click(coordinates[0][1], coordinates[0][0]);
});
