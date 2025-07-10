/**
 * Test multiple split operations to ensure no extra polygons are created
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Polydraw from '../src/polydraw';
import * as L from 'leaflet';
import type { Feature, Polygon } from 'geojson';
import type { ILatLng } from '../src/types/polydraw-interfaces';
import defaultConfig from '../src/config.json';

// Mock Leaflet map
const createMockMap = () => {
  return {
    removeLayer: () => {},
    addLayer: () => {},
    dragging: { enable: () => {}, disable: () => {} },
    doubleClickZoom: { enable: () => {}, disable: () => {} },
    scrollWheelZoom: { enable: () => {}, disable: () => {} },
    getContainer: () => ({ classList: { add: () => {}, remove: () => {} } }),
    on: () => {},
    off: () => {},
  } as any;
};

describe('Multiple Split Operations Test', () => {
  let polydraw: Polydraw;
  let mockMap: L.Map;

  beforeEach(() => {
    mockMap = createMockMap();
    polydraw = new Polydraw({ config: defaultConfig as any });
    polydraw.onAdd(mockMap);
  });

  describe('Complex Split Scenario', () => {
    it('should handle circle → split in half → split both halves correctly', () => {
      // Step 1: Add a circular polygon (approximated as octagon)
      const circlePolygon: ILatLng[][][] = [
        [
          [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 0 },
            { lat: 1.414, lng: 0.414 },
            { lat: 1, lng: 1 },
            { lat: 0, lng: 1 },
            { lat: -1, lng: 1 },
            { lat: -1.414, lng: 0.414 },
            { lat: -1, lng: 0 },
            { lat: -1, lng: -1 },
            { lat: 0, lng: -1 },
            { lat: 1, lng: -1 },
            { lat: 0, lng: 0 }, // Close the polygon
          ],
        ],
      ];

      polydraw.addAutoPolygon(circlePolygon as any);

      // Should have 1 polygon after adding the circle
      const arrayOfFeatureGroups = (polydraw as any).arrayOfFeatureGroups;
      expect(arrayOfFeatureGroups.length).toBe(1);

      // Step 2: Split the circle in half horizontally
      const horizontalSplitter: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-2, 0.1],
              [2, 0.1],
              [2, -0.1],
              [-2, -0.1],
              [-2, 0.1],
            ],
          ],
        },
      };

      // Set to subtract mode and perform the split
      polydraw.setDrawMode(1); // DrawMode.Subtract
      (polydraw as any).subtractPolygon(horizontalSplitter);

      // Should have 2 polygons after horizontal split
      expect(arrayOfFeatureGroups.length).toBe(2);

      // Step 3: Split the left half vertically
      const leftVerticalSplitter: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-0.1, -2],
              [0.1, -2],
              [0.1, 2],
              [-0.1, 2],
              [-0.1, -2],
            ],
          ],
        },
      };

      (polydraw as any).subtractPolygon(leftVerticalSplitter);

      // Should have 3 polygons after splitting the left half
      expect(arrayOfFeatureGroups.length).toBe(3);

      // Step 4: Split the right half vertically
      const rightVerticalSplitter: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0.9, -2],
              [1.1, -2],
              [1.1, 2],
              [0.9, 2],
              [0.9, -2],
            ],
          ],
        },
      };

      (polydraw as any).subtractPolygon(rightVerticalSplitter);

      // Should have exactly 4 polygons after all splits (not 5!)
      expect(arrayOfFeatureGroups.length).toBe(4);

      console.log('✅ Multiple split operations test passed - exactly 4 polygons created');
    });

    it('should handle multiple sequential splits without creating extra polygons', () => {
      // Start with a large square
      const largeSquare: ILatLng[][][] = [
        [
          [
            { lat: 0, lng: 0 },
            { lat: 4, lng: 0 },
            { lat: 4, lng: 4 },
            { lat: 0, lng: 4 },
            { lat: 0, lng: 0 },
          ],
        ],
      ];

      polydraw.addAutoPolygon(largeSquare as any);

      const arrayOfFeatureGroups = (polydraw as any).arrayOfFeatureGroups;
      expect(arrayOfFeatureGroups.length).toBe(1);

      // Split 1: Vertical cut down the middle
      const verticalCut: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [1.9, -1],
              [2.1, -1],
              [2.1, 5],
              [1.9, 5],
              [1.9, -1],
            ],
          ],
        },
      };

      polydraw.setDrawMode(1); // DrawMode.Subtract
      (polydraw as any).subtractPolygon(verticalCut);
      expect(arrayOfFeatureGroups.length).toBe(2);

      // Split 2: Horizontal cut through left piece
      const leftHorizontalCut: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-1, 1.9],
              [2, 1.9],
              [2, 2.1],
              [-1, 2.1],
              [-1, 1.9],
            ],
          ],
        },
      };

      (polydraw as any).subtractPolygon(leftHorizontalCut);
      expect(arrayOfFeatureGroups.length).toBe(3);

      // Split 3: Horizontal cut through right piece
      const rightHorizontalCut: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [2, 1.9],
              [5, 1.9],
              [5, 2.1],
              [2, 2.1],
              [2, 1.9],
            ],
          ],
        },
      };

      (polydraw as any).subtractPolygon(rightHorizontalCut);
      expect(arrayOfFeatureGroups.length).toBe(4);

      // Split 4: Another cut through one of the quarters
      const quarterCut: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-1, 0.9],
              [2, 0.9],
              [2, 1.1],
              [-1, 1.1],
              [-1, 0.9],
            ],
          ],
        },
      };

      (polydraw as any).subtractPolygon(quarterCut);
      expect(arrayOfFeatureGroups.length).toBe(5);

      console.log('✅ Sequential splits test passed - correct number of polygons at each step');
    });

    it('should handle edge case where split creates no result', () => {
      // Add a small polygon
      const smallPolygon: ILatLng[][][] = [
        [
          [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 0 },
            { lat: 1, lng: 1 },
            { lat: 0, lng: 1 },
            { lat: 0, lng: 0 },
          ],
        ],
      ];

      polydraw.addAutoPolygon(smallPolygon as any);

      const arrayOfFeatureGroups = (polydraw as any).arrayOfFeatureGroups;
      expect(arrayOfFeatureGroups.length).toBe(1);

      // Try to subtract a polygon that completely covers the original
      const coveringPolygon: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-1, -1],
              [2, -1],
              [2, 2],
              [-1, 2],
              [-1, -1],
            ],
          ],
        },
      };

      polydraw.setDrawMode(1); // DrawMode.Subtract
      (polydraw as any).subtractPolygon(coveringPolygon);

      // Should have 0 polygons after complete subtraction
      expect(arrayOfFeatureGroups.length).toBe(0);

      console.log('✅ Complete subtraction test passed - polygon completely removed');
    });
  });
});
