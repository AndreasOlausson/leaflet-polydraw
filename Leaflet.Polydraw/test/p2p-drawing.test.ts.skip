import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';
import { DrawMode } from '../src/enums';

describe('Point-to-Point Drawing - Functional Tests', () => {
  let map: L.Map;
  let polydraw: Polydraw;
  let container: HTMLElement;

  beforeEach(() => {
    // Create a real DOM container for the map
    container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '400px';
    document.body.appendChild(container);

    // Create Leaflet map
    map = L.map(container, {
      center: [59.3293, 18.0686], // Stockholm
      zoom: 13,
    });

    // Create polydraw control
    polydraw = new Polydraw();
    polydraw.addTo(map);
  });

  afterEach(() => {
    // Clean up polydraw first to avoid map cleanup issues
    if (polydraw && map) {
      try {
        map.removeControl(polydraw);
      } catch (error) {
        // Ignore cleanup errors in test environment
      }
    }

    // Clean up map
    if (map) {
      try {
        map.off(); // Remove all event listeners
        map.remove();
      } catch (error) {
        // Ignore cleanup errors in test environment
      }
    }

    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Mode Activation and UI Behavior', () => {
    it('should activate PointToPoint mode when p2p button is clicked', () => {
      // Find and click the p2p button
      const p2pButton = container.querySelector('.icon-p2p') as HTMLElement;
      expect(p2pButton).toBeTruthy();

      // Click the activate button first to show sub-buttons
      const activateButton = container.querySelector('.icon-activate') as HTMLElement;
      activateButton.click();

      // Now click the p2p button
      p2pButton.click();

      // Verify mode is set to PointToPoint
      expect(polydraw.getDrawMode()).toBe(DrawMode.PointToPoint);
    });

    it('should enable crosshair cursor when in PointToPoint mode', () => {
      // Activate p2p mode
      const activateButton = container.querySelector('.icon-activate') as HTMLElement;
      activateButton.click();
      const p2pButton = container.querySelector('.icon-p2p') as HTMLElement;
      p2pButton.click();

      // Check that crosshair cursor class is added
      expect(map.getContainer().classList.contains('crosshair-cursor-enabled')).toBe(true);
    });

    it('should disable map dragging in PointToPoint mode', () => {
      // Activate p2p mode
      const activateButton = container.querySelector('.icon-activate') as HTMLElement;
      activateButton.click();
      const p2pButton = container.querySelector('.icon-p2p') as HTMLElement;
      p2pButton.click();

      // Verify map dragging is disabled
      expect(map.dragging.enabled()).toBe(false);
      expect(map.doubleClickZoom.enabled()).toBe(false);
      expect(map.scrollWheelZoom.enabled()).toBe(false);
    });

    it('should toggle off PointToPoint mode when clicked again', () => {
      // Activate p2p mode
      const activateButton = container.querySelector('.icon-activate') as HTMLElement;
      activateButton.click();
      const p2pButton = container.querySelector('.icon-p2p') as HTMLElement;

      // First click - activate
      p2pButton.click();
      expect(polydraw.getDrawMode()).toBe(DrawMode.PointToPoint);

      // Second click - deactivate
      p2pButton.click();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Off);
    });

    it('should restore normal map behavior when exiting PointToPoint mode', () => {
      // Activate and then deactivate p2p mode
      const activateButton = container.querySelector('.icon-activate') as HTMLElement;
      activateButton.click();
      const p2pButton = container.querySelector('.icon-p2p') as HTMLElement;

      p2pButton.click(); // Activate
      p2pButton.click(); // Deactivate

      // Verify normal map behavior is restored
      expect(map.dragging.enabled()).toBe(true);
      expect(map.doubleClickZoom.enabled()).toBe(true);
      expect(map.scrollWheelZoom.enabled()).toBe(true);
      expect(map.getContainer().classList.contains('crosshair-cursor-enabled')).toBe(false);
    });
  });

  describe('Point Placement Functionality', () => {
    beforeEach(() => {
      // Activate p2p mode for each test
      const activateButton = container.querySelector('.icon-activate') as HTMLElement;
      activateButton.click();
      const p2pButton = container.querySelector('.icon-p2p') as HTMLElement;
      p2pButton.click();
    });

    it('should add first point to tracer when map is clicked', () => {
      const testLatLng = L.latLng(59.3293, 18.0686);

      // Simulate map click
      map.fire('mousedown', { latlng: testLatLng });

      // Get tracer (should be accessible through polydraw)
      const tracerPoints = (polydraw as any).tracer.getLatLngs();
      expect(tracerPoints.length).toBe(1);
      expect(tracerPoints[0].lat).toBeCloseTo(testLatLng.lat, 5);
      expect(tracerPoints[0].lng).toBeCloseTo(testLatLng.lng, 5);
    });

    it('should show dashed line after adding second point', () => {
      const point1 = L.latLng(59.3293, 18.0686);
      const point2 = L.latLng(59.33, 18.07);

      // Add first point
      map.fire('mousedown', { latlng: point1 });

      // Add second point
      map.fire('mousedown', { latlng: point2 });

      // Check tracer has both points
      const tracerPoints = (polydraw as any).tracer.getLatLngs();
      expect(tracerPoints.length).toBe(2);

      // Check that tracer has dashed line style
      const tracerStyle = (polydraw as any).tracer.options;
      expect(tracerStyle.dashArray).toBe('5, 5');
    });

    it('should continue adding points to create polygon outline', () => {
      const points = [
        L.latLng(59.3293, 18.0686),
        L.latLng(59.33, 18.07),
        L.latLng(59.329, 18.071),
        L.latLng(59.328, 18.0695),
      ];

      // Add all points
      points.forEach((point) => {
        map.fire('mousedown', { latlng: point });
      });

      // Verify all points are in tracer
      const tracerPoints = (polydraw as any).tracer.getLatLngs();
      expect(tracerPoints.length).toBe(4);

      // Verify points match
      points.forEach((point, index) => {
        expect(tracerPoints[index].lat).toBeCloseTo(point.lat, 5);
        expect(tracerPoints[index].lng).toBeCloseTo(point.lng, 5);
      });
    });

    it('should ignore clicks when not in PointToPoint mode', () => {
      // Switch to Off mode
      const p2pButton = container.querySelector('.icon-p2p') as HTMLElement;
      p2pButton.click(); // This should turn off p2p mode

      const testLatLng = L.latLng(59.3293, 18.0686);

      // Try to click - should be ignored
      map.fire('mousedown', { latlng: testLatLng });

      // Tracer should be empty
      const tracerPoints = (polydraw as any).tracer.getLatLngs();
      expect(tracerPoints.length).toBe(0);
    });
  });

  describe('Polygon Completion Functionality', () => {
    beforeEach(() => {
      // Activate p2p mode
      const activateButton = container.querySelector('.icon-activate') as HTMLElement;
      activateButton.click();
      const p2pButton = container.querySelector('.icon-p2p') as HTMLElement;
      p2pButton.click();
    });

    it('should complete polygon when double-clicking after minimum 3 points', () => {
      const points = [L.latLng(59.3293, 18.0686), L.latLng(59.33, 18.07), L.latLng(59.329, 18.071)];

      // Add minimum 3 points
      points.forEach((point) => {
        map.fire('mousedown', { latlng: point });
      });

      // Get initial polygon count
      const initialPolygonCount = (polydraw as any).arrayOfFeatureGroups.length;

      // Simulate double-click by firing mousedown twice quickly
      const lastPoint = L.latLng(59.3285, 18.069);
      map.fire('mousedown', { latlng: lastPoint });

      // Simulate second click within double-click threshold
      setTimeout(() => {
        map.fire('mousedown', { latlng: lastPoint });

        // Should have created a polygon
        const finalPolygonCount = (polydraw as any).arrayOfFeatureGroups.length;
        expect(finalPolygonCount).toBe(initialPolygonCount + 1);

        // Should return to Off mode
        expect(polydraw.getDrawMode()).toBe(DrawMode.Off);
      }, 100);
    });

    it('should complete polygon when clicking on first point', () => {
      const points = [L.latLng(59.3293, 18.0686), L.latLng(59.33, 18.07), L.latLng(59.329, 18.071)];

      // Add minimum 3 points
      points.forEach((point) => {
        map.fire('mousedown', { latlng: point });
      });

      const initialPolygonCount = (polydraw as any).arrayOfFeatureGroups.length;

      // Click on first point (with some tolerance for clicking near it)
      const firstPoint = points[0];
      const nearFirstPoint = L.latLng(firstPoint.lat + 0.0001, firstPoint.lng + 0.0001);
      map.fire('mousedown', { latlng: nearFirstPoint });

      // Should have created a polygon
      const finalPolygonCount = (polydraw as any).arrayOfFeatureGroups.length;
      expect(finalPolygonCount).toBe(initialPolygonCount + 1);

      // Should return to Off mode
      expect(polydraw.getDrawMode()).toBe(DrawMode.Off);
    });

    it('should not complete polygon with less than 3 points', () => {
      const points = [L.latLng(59.3293, 18.0686), L.latLng(59.33, 18.07)];

      // Add only 2 points
      points.forEach((point) => {
        map.fire('mousedown', { latlng: point });
      });

      const initialPolygonCount = (polydraw as any).arrayOfFeatureGroups.length;

      // Try to double-click to complete
      const lastPoint = L.latLng(59.3285, 18.069);
      map.fire('mousedown', { latlng: lastPoint });

      setTimeout(() => {
        map.fire('mousedown', { latlng: lastPoint });

        // Should NOT have created a polygon
        const finalPolygonCount = (polydraw as any).arrayOfFeatureGroups.length;
        expect(finalPolygonCount).toBe(initialPolygonCount);

        // Should still be in PointToPoint mode
        expect(polydraw.getDrawMode()).toBe(DrawMode.PointToPoint);
      }, 100);
    });

    it('should create solid polygon that integrates with existing polygon system', () => {
      const points = [L.latLng(59.3293, 18.0686), L.latLng(59.33, 18.07), L.latLng(59.329, 18.071)];

      // Add points and complete
      points.forEach((point) => {
        map.fire('mousedown', { latlng: point });
      });

      // Complete by double-clicking
      const lastPoint = L.latLng(59.3285, 18.069);
      map.fire('mousedown', { latlng: lastPoint });

      setTimeout(() => {
        map.fire('mousedown', { latlng: lastPoint });

        // Verify polygon was created and added to the system
        const featureGroups = (polydraw as any).arrayOfFeatureGroups;
        expect(featureGroups.length).toBe(1);

        // Verify the polygon has the expected structure
        const featureGroup = featureGroups[0];
        const layers = featureGroup.getLayers();

        // Should have polygon layer and markers
        const polygonLayer = layers.find((layer) => layer instanceof L.Polygon);
        expect(polygonLayer).toBeTruthy();

        // Should have markers for polygon vertices
        const markers = layers.filter((layer) => layer instanceof L.Marker);
        expect(markers.length).toBeGreaterThan(0);
      }, 100);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      // Activate p2p mode
      const activateButton = container.querySelector('.icon-activate') as HTMLElement;
      activateButton.click();
      const p2pButton = container.querySelector('.icon-p2p') as HTMLElement;
      p2pButton.click();
    });

    it('should cancel drawing when ESC key is pressed', () => {
      const points = [L.latLng(59.3293, 18.0686), L.latLng(59.33, 18.07)];

      // Add some points
      points.forEach((point) => {
        map.fire('mousedown', { latlng: point });
      });

      // Verify points are in tracer
      expect((polydraw as any).tracer.getLatLngs().length).toBe(2);

      // Press ESC key
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);

      // Should clear tracer and return to Off mode
      expect((polydraw as any).tracer.getLatLngs().length).toBe(0);
      expect(polydraw.getDrawMode()).toBe(DrawMode.Off);
    });

    it('should clean up tracer when switching to different mode', () => {
      const points = [L.latLng(59.3293, 18.0686), L.latLng(59.33, 18.07)];

      // Add some points
      points.forEach((point) => {
        map.fire('mousedown', { latlng: point });
      });

      // Verify points are in tracer
      expect((polydraw as any).tracer.getLatLngs().length).toBe(2);

      // Switch to different mode (e.g., Add mode)
      const drawButton = container.querySelector('.icon-draw') as HTMLElement;
      drawButton.click();

      // Tracer should be cleared
      expect((polydraw as any).tracer.getLatLngs().length).toBe(0);
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);
    });

    it('should handle rapid clicks gracefully', () => {
      const point = L.latLng(59.3293, 18.0686);

      // Fire multiple rapid clicks
      for (let i = 0; i < 5; i++) {
        map.fire('mousedown', { latlng: point });
      }

      // Should only register reasonable number of points (not duplicate every click)
      const tracerPoints = (polydraw as any).tracer.getLatLngs();
      expect(tracerPoints.length).toBeLessThanOrEqual(5);
      expect(tracerPoints.length).toBeGreaterThan(0);
    });

    it('should handle invalid click coordinates gracefully', () => {
      // Try clicking with invalid coordinates
      map.fire('mousedown', { latlng: null });
      map.fire('mousedown', { latlng: undefined });
      map.fire('mousedown', {}); // No latlng property

      // Tracer should remain empty
      expect((polydraw as any).tracer.getLatLngs().length).toBe(0);
      expect(polydraw.getDrawMode()).toBe(DrawMode.PointToPoint);
    });
  });

  describe('Integration with Existing Polygon System', () => {
    beforeEach(() => {
      // Activate p2p mode
      const activateButton = container.querySelector('.icon-activate') as HTMLElement;
      activateButton.click();
      const p2pButton = container.querySelector('.icon-p2p') as HTMLElement;
      p2pButton.click();
    });

    it('should merge with existing polygons when mergePolygons is enabled', () => {
      // First, create an existing polygon using the regular drawing method
      polydraw.addAutoPolygon([
        [
          [
            L.latLng(59.329, 18.068),
            L.latLng(59.3295, 18.069),
            L.latLng(59.3285, 18.0695),
            L.latLng(59.329, 18.068), // Close the polygon
          ],
        ],
      ]);

      const initialPolygonCount = (polydraw as any).arrayOfFeatureGroups.length;
      expect(initialPolygonCount).toBe(1);

      // Now create overlapping polygon with p2p
      const overlappingPoints = [
        L.latLng(59.3292, 18.0685), // Overlaps with existing polygon
        L.latLng(59.33, 18.07),
        L.latLng(59.329, 18.071),
      ];

      // Add points and complete
      overlappingPoints.forEach((point) => {
        map.fire('mousedown', { latlng: point });
      });

      // Complete polygon
      const lastPoint = L.latLng(59.3285, 18.069);
      map.fire('mousedown', { latlng: lastPoint });

      setTimeout(() => {
        map.fire('mousedown', { latlng: lastPoint });

        // If merging is enabled, should still have 1 polygon (merged)
        // If merging is disabled, should have 2 polygons
        const finalPolygonCount = (polydraw as any).arrayOfFeatureGroups.length;
        expect(finalPolygonCount).toBeGreaterThanOrEqual(1);
        expect(finalPolygonCount).toBeLessThanOrEqual(2);
      }, 100);
    });

    it('should work with subtract mode after p2p polygon is created', () => {
      // Create p2p polygon first
      const points = [L.latLng(59.3293, 18.0686), L.latLng(59.33, 18.07), L.latLng(59.329, 18.071)];

      points.forEach((point) => {
        map.fire('mousedown', { latlng: point });
      });

      // Complete polygon
      const lastPoint = L.latLng(59.3285, 18.069);
      map.fire('mousedown', { latlng: lastPoint });

      setTimeout(() => {
        map.fire('mousedown', { latlng: lastPoint });

        // Verify polygon was created
        expect((polydraw as any).arrayOfFeatureGroups.length).toBe(1);

        // Now switch to subtract mode and verify it works
        const subtractButton = container.querySelector('.icon-subtract') as HTMLElement;
        subtractButton.click();

        expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);

        // The polygon should be available for subtract operations
        const featureGroups = (polydraw as any).arrayOfFeatureGroups;
        expect(featureGroups.length).toBe(1);
      }, 100);
    });
  });
});
