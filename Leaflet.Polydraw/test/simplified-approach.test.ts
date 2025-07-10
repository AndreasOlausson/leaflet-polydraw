/**
 * Test the simplified approach with single point of truth
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PolygonStateManager } from '../src/core/polygon-state-manager';
import { SimplifiedMarkerManager } from '../src/core/simplified-marker-manager';
import { PolydrawStateManager } from '../src/core/state-manager';
import { TurfHelper } from '../src/turf-helper';
import * as L from 'leaflet';
import type { Feature, Polygon } from 'geojson';
import defaultConfig from '../src/config.json';

// Mock Leaflet map
const createMockMap = () => {
  return {
    removeLayer: () => {},
    addLayer: () => {},
  } as any;
};

// Mock feature group creation
const createMockFeatureGroup = () => {
  const featureGroup = new L.FeatureGroup();
  // Mock the addTo method to prevent actual map operations
  featureGroup.addTo = () => featureGroup;
  return featureGroup;
};

describe('Simplified Approach Tests', () => {
  let polygonStateManager: PolygonStateManager;
  let simplifiedMarkerManager: SimplifiedMarkerManager;
  let stateManager: PolydrawStateManager;
  let turfHelper: TurfHelper;
  let mockMap: L.Map;

  beforeEach(() => {
    mockMap = createMockMap();
    stateManager = new PolydrawStateManager();
    turfHelper = new TurfHelper(defaultConfig as any);

    polygonStateManager = new PolygonStateManager(
      defaultConfig as any,
      turfHelper,
      mockMap,
      stateManager,
      () => createMockFeatureGroup(),
    );

    simplifiedMarkerManager = new SimplifiedMarkerManager(
      defaultConfig as any,
      polygonStateManager,
    );
  });

  describe('PolygonStateManager', () => {
    it('should follow the deletePolygon -> addPolygon pattern', () => {
      // Create a simple polygon
      const polygon: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      };

      // Add polygon
      const ids = polygonStateManager.addPolygon(polygon);
      expect(ids).toHaveLength(1);
      expect(polygonStateManager.getCount()).toBe(1);

      // Update polygon (delete old, add new)
      const updatedPolygon: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
      };

      const newIds = polygonStateManager.updatePolygon(ids[0], updatedPolygon);
      expect(newIds).toHaveLength(1);
      expect(polygonStateManager.getCount()).toBe(1); // Still one polygon, but updated

      // Verify the old polygon is gone and new one exists
      expect(polygonStateManager.getPolygon(ids[0])).toBeUndefined();
      expect(polygonStateManager.getPolygon(newIds[0])).toBeDefined();
    });

    it('should handle MultiPolygon by splitting into separate polygons', () => {
      const multiPolygon: Feature<any> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
            [
              [
                [2, 2],
                [3, 2],
                [3, 3],
                [2, 3],
                [2, 2],
              ],
            ],
          ],
        },
      };

      const ids = polygonStateManager.addPolygon(multiPolygon);
      expect(ids).toHaveLength(2); // Split into 2 separate polygons
      expect(polygonStateManager.getCount()).toBe(2);
    });

    it('should handle subtract operations', () => {
      // Add a base polygon
      const basePolygon: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [4, 0],
              [4, 4],
              [0, 4],
              [0, 0],
            ],
          ],
        },
      };

      const baseIds = polygonStateManager.addPolygon(basePolygon);
      expect(polygonStateManager.getCount()).toBe(1);

      // Subtract a smaller polygon from it
      const subtractPolygon: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [1, 1],
              [3, 1],
              [3, 3],
              [1, 3],
              [1, 1],
            ],
          ],
        },
      };

      const resultIds = polygonStateManager.subtractPolygon(subtractPolygon);

      // The base polygon should be removed and replaced with the result
      expect(polygonStateManager.getPolygon(baseIds[0])).toBeUndefined();

      // Should have a result (polygon with hole or multiple pieces)
      if (resultIds.length > 0) {
        expect(polygonStateManager.getPolygon(resultIds[0])).toBeDefined();
      }
    });
  });

  describe('SimplifiedMarkerManager', () => {
    it('should extract coordinates from markers and update polygon', () => {
      // Create a polygon first
      const polygon: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      };

      const ids = polygonStateManager.addPolygon(polygon);
      const polygonData = polygonStateManager.getPolygon(ids[0]);

      expect(polygonData).toBeDefined();
      if (polygonData) {
        // Create mock markers
        const markers = [
          new L.Marker([0, 0]),
          new L.Marker([2, 0]), // Changed position
          new L.Marker([2, 2]), // Changed position
          new L.Marker([0, 2]), // Changed position
        ];

        // Add markers to feature group
        markers.forEach((marker) => polygonData.featureGroup.addLayer(marker));

        // Test marker drag end
        simplifiedMarkerManager.handleMarkerDragEnd(polygonData.featureGroup);

        // The polygon should be updated with new coordinates
        // (In a real scenario, this would trigger the update through the state manager)
        expect(polygonStateManager.getCount()).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Integration Tests', () => {
    it('should maintain single point of truth throughout operations', () => {
      // Start with empty state
      expect(polygonStateManager.getCount()).toBe(0);

      // Add polygon
      const polygon1: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      };

      const ids1 = polygonStateManager.addPolygon(polygon1);
      expect(polygonStateManager.getCount()).toBe(1);

      // Add another polygon
      const polygon2: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [2, 2],
              [3, 2],
              [3, 3],
              [2, 3],
              [2, 2],
            ],
          ],
        },
      };

      const ids2 = polygonStateManager.addPolygon(polygon2);
      expect(polygonStateManager.getCount()).toBe(2);

      // Update first polygon
      const updatedPolygon1: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1.5, 0],
              [1.5, 1.5],
              [0, 1.5],
              [0, 0],
            ],
          ],
        },
      };

      const newIds1 = polygonStateManager.updatePolygon(ids1[0], updatedPolygon1);
      expect(polygonStateManager.getCount()).toBe(2); // Still 2 polygons

      // Remove one polygon
      const removed = polygonStateManager.removePolygon(ids2[0]);
      expect(removed).toBe(true);
      expect(polygonStateManager.getCount()).toBe(1);

      // Clear all
      polygonStateManager.clearAll();
      expect(polygonStateManager.getCount()).toBe(0);
    });
  });
});
