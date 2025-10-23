/**
 * Sample E2E Test for Polydraw Plugin
 *
 * This is a basic example of how to write E2E tests for the Polydraw plugin.
 * You can expand this with more comprehensive tests.
 */

describe('Polydraw E2E Tests', () => {
  beforeEach(() => {
    // Visit the demo page
    cy.visit('/leaflet-polydraw/');

    // Wait for the map to be ready
    cy.waitForMap();
  });

  it('should load the demo page successfully', () => {
    // Check that the map container is visible
    cy.get('.leaflet-container').should('be.visible');

    // Check that the polydraw control is present
    cy.get('.leaflet-control-polydraw').should('be.visible');
  });

  it('should have working draw buttons', () => {
    // Check that draw buttons are present and clickable
    cy.get('[data-cy="draw-button"]').should('be.visible').and('not.be.disabled');
    cy.get('[data-cy="subtract-button"]').should('be.visible').and('not.be.disabled');
    cy.get('[data-cy="point-to-point-button"]').should('be.visible').and('not.be.disabled');
    cy.get('[data-cy="erase-button"]').should('be.visible').and('not.be.disabled');
  });

  it('should be able to switch drawing modes', () => {
    // Test draw mode
    cy.get('[data-cy="draw-button"]').click();
    cy.get('[data-cy="draw-button"]').should('have.class', 'active');

    // Test subtract mode
    cy.get('[data-cy="subtract-button"]').click();
    cy.get('[data-cy="subtract-button"]').should('have.class', 'active');

    // Test point-to-point mode
    cy.get('[data-cy="point-to-point-button"]').click();
    cy.get('[data-cy="point-to-point-button"]').should('have.class', 'active');
  });

  it('should be able to draw a simple polygon', () => {
    // Enable draw mode
    cy.get('[data-cy="draw-button"]').click();

    // Draw a simple triangle
    const coordinates: [number, number][] = [
      [58.4, 15.6],
      [58.5, 15.7],
      [58.6, 15.8],
    ];

    cy.drawPolygon(coordinates);

    // Check that a polygon was created
    cy.get('.leaflet-polygon').should('exist');
  });

  it('should be able to erase polygons', () => {
    // First draw a polygon
    cy.get('[data-cy="draw-button"]').click();
    cy.drawPolygon([
      [58.4, 15.6],
      [58.5, 15.7],
      [58.6, 15.8],
    ]);

    // Then erase it
    cy.get('[data-cy="erase-button"]').click();

    // Check that the polygon was removed
    cy.get('.leaflet-polygon').should('not.exist');
  });
});
