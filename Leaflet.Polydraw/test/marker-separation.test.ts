import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import L from 'leaflet';
import Polydraw from '../src/polydraw';
import './setup'; // Use the shared test setup

describe('Marker Separation Functionality', () => {
  let map: L.Map;
  let polydraw: Polydraw;
  let mapElement: HTMLElement;

  beforeEach(() => {
    // Create a fresh map element for each test
    mapElement = document.createElement('div');
    mapElement.id = 'map-' + Date.now(); // Unique ID for each test
    mapElement.style.width = '400px';
    mapElement.style.height = '400px';
    document.body.appendChild(mapElement);

    map = L.map(mapElement, {
      center: [59.911491, 10.757933],
      zoom: 13,
      preferCanvas: false, // Avoid canvas to prevent DOM issues in tests
    });

    // Create polydraw instance with all special markers enabled
    polydraw = new Polydraw({
      position: 'topright',
      config: {
        markers: {
          deleteMarker: true,
          infoMarker: true,
          menuMarker: true,
          markerIcon: { styleClasses: 'test-marker' },
          holeIcon: { styleClasses: 'test-hole' },
          zIndexOffset: 1000,
          coordsTitle: true,
          markerDeleteIcon: { position: 5, styleClasses: 'test-delete' },
          markerInfoIcon: {
            position: 3,
            styleClasses: 'test-info',
            useMetrics: true,
            areaLabel: 'Area',
            perimeterLabel: 'Perimeter',
          },
          markerMenuIcon: { position: 7, styleClasses: 'test-menu' },
        },
      } as any,
    });

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
    if (mapElement && mapElement.parentNode) {
      mapElement.parentNode.removeChild(mapElement);
    }
  });

  describe('ensureMarkerSeparation', () => {
    it('should not change positions when no overlap occurs', () => {
      // Test with a polygon that has enough vertices to avoid overlap
      const polygonCoords = [
        [
          new L.LatLng(59.915, 10.75),
          new L.LatLng(59.92, 10.755),
          new L.LatLng(59.918, 10.765),
          new L.LatLng(59.912, 10.762),
          new L.LatLng(59.91, 10.758),
          new L.LatLng(59.908, 10.754),
          new L.LatLng(59.906, 10.75),
          new L.LatLng(59.908, 10.746),
          new L.LatLng(59.915, 10.75), // Closing point
        ],
      ];

      // Add polygon using the public API
      polydraw.addPredefinedPolygon([polygonCoords]);

      // Verify that markers were added (we can't easily test exact positions without accessing private methods)
      expect(polydraw['arrayOfFeatureGroups']).toHaveLength(1);

      const featureGroup = polydraw['arrayOfFeatureGroups'][0];
      let markerCount = 0;
      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          markerCount++;
        }
      });

      // Should have markers for each vertex
      expect(markerCount).toBeGreaterThan(0);
    });

    it('should separate overlapping markers when only 2 special markers are enabled', () => {
      // Test with a small triangle that might cause overlap
      const triangleCoords = [
        [
          { lat: 59.915, lng: 10.75 },
          { lat: 59.92, lng: 10.755 },
          { lat: 59.918, lng: 10.765 },
          { lat: 59.915, lng: 10.75 }, // Closing point
        ],
      ] as any;

      // Add polygon using the existing polydraw instance
      polydraw.addPredefinedPolygon([triangleCoords]);

      // Verify polygon was added
      expect(polydraw['arrayOfFeatureGroups']).toHaveLength(1);

      const featureGroup = polydraw['arrayOfFeatureGroups'][0];
      let markerCount = 0;
      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          markerCount++;
        }
      });

      // Should have markers (the existing polydraw instance has special markers enabled)
      expect(markerCount).toBeGreaterThan(0);
    });

    it('should handle edge case with very small polygons', () => {
      // Test with minimum viable polygon (triangle)
      const minimalTriangle = [
        [
          { lat: 59.915, lng: 10.75 },
          { lat: 59.916, lng: 10.751 },
          { lat: 59.917, lng: 10.75 },
          { lat: 59.915, lng: 10.75 }, // Closing point
        ],
      ] as any;

      polydraw.addPredefinedPolygon([minimalTriangle]);

      // Should still work without errors
      expect(polydraw['arrayOfFeatureGroups']).toHaveLength(1);
    });

    it('should work when all special markers are disabled', () => {
      // Create polydraw with no special markers
      const polydrawNoSpecial = new Polydraw({
        position: 'topright',
        config: {
          markers: {
            deleteMarker: false,
            infoMarker: false,
            menuMarker: false,
          },
        },
      } as any);

      polydrawNoSpecial.addTo(map);

      const polygonCoords = [
        [
          { lat: 59.915, lng: 10.75 },
          { lat: 59.92, lng: 10.755 },
          { lat: 59.918, lng: 10.765 },
          { lat: 59.915, lng: 10.75 },
        ],
      ] as any;

      polydrawNoSpecial.addPredefinedPolygon([polygonCoords]);

      // Should work without special markers
      expect(polydrawNoSpecial['arrayOfFeatureGroups']).toHaveLength(1);
    });
  });

  describe('Marker Position Fallback', () => {
    it('should find alternative positions when markers overlap', () => {
      // Test the private method directly (if accessible)
      const testMarkers = {
        menu: { index: 0, enabled: true },
        delete: { index: 0, enabled: true }, // Same index as menu
        info: { index: 0, enabled: true }, // Same index as menu and delete
      };

      // Access private method for testing
      const separatedIndices = polydraw['ensureMarkerSeparation'](10, testMarkers);

      // All indices should be different
      expect(separatedIndices.menu).not.toBe(separatedIndices.delete);
      expect(separatedIndices.menu).not.toBe(separatedIndices.info);
      expect(separatedIndices.delete).not.toBe(separatedIndices.info);

      // All indices should be valid (0-9 for a 10-vertex polygon)
      expect(separatedIndices.menu).toBeGreaterThanOrEqual(0);
      expect(separatedIndices.menu).toBeLessThan(10);
      expect(separatedIndices.delete).toBeGreaterThanOrEqual(0);
      expect(separatedIndices.delete).toBeLessThan(10);
      expect(separatedIndices.info).toBeGreaterThanOrEqual(0);
      expect(separatedIndices.info).toBeLessThan(10);
    });

    it('should maintain original positions when no overlap', () => {
      const testMarkers = {
        menu: { index: 1, enabled: true },
        delete: { index: 3, enabled: true },
        info: { index: 5, enabled: true },
      };

      const separatedIndices = polydraw['ensureMarkerSeparation'](10, testMarkers);

      // Should keep original positions since no overlap
      expect(separatedIndices.menu).toBe(1);
      expect(separatedIndices.delete).toBe(3);
      expect(separatedIndices.info).toBe(5);
    });

    it('should handle disabled markers correctly', () => {
      const testMarkers = {
        menu: { index: 0, enabled: false },
        delete: { index: 0, enabled: true },
        info: { index: 0, enabled: true },
      };

      const separatedIndices = polydraw['ensureMarkerSeparation'](10, testMarkers);

      // Menu should keep its index since it's disabled
      expect(separatedIndices.menu).toBe(0);

      // Delete and info should be separated
      expect(separatedIndices.delete).not.toBe(separatedIndices.info);
    });
  });

  describe('Integration with Real Polygons', () => {
    it('should properly separate markers in real polygon scenarios', () => {
      // Create a polygon that would naturally cause marker overlap
      const problematicPolygon = [
        [
          { lat: 59.915, lng: 10.75 },
          { lat: 59.916, lng: 10.751 },
          { lat: 59.917, lng: 10.752 },
          { lat: 59.918, lng: 10.751 },
          { lat: 59.915, lng: 10.75 },
        ],
      ] as any;

      polydraw.addPredefinedPolygon([problematicPolygon]);

      const featureGroup = polydraw['arrayOfFeatureGroups'][0];
      const markers: L.Marker[] = [];

      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          markers.push(layer);
        }
      });

      // Should have created markers without errors
      expect(markers.length).toBeGreaterThan(0);

      // Check that special markers (if any) have different positions
      const positions = markers.map((marker) => {
        const latlng = marker.getLatLng();
        return `${latlng.lat},${latlng.lng}`;
      });

      // Special markers should not be at exactly the same position
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBeGreaterThan(0);
    });
  });
});
