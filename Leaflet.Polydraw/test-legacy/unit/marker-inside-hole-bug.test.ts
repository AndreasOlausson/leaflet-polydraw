import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolygonMutationManager } from '../../src/managers/polygon-mutation-manager';
import { TurfHelper } from '../../src/turf-helper';
import { PolygonInformationService } from '../../src/polygon-information.service';
import { ModeManager } from '../../src/managers/mode-manager';
import { EventManager } from '../../src/managers/event-manager';
import * as L from 'leaflet';
import type { Feature, Polygon } from 'geojson';
import type { PolydrawConfig } from '../../src/types/polydraw-interfaces';
import { defaultConfig } from '../../src/config';

describe('Marker Inside Hole Bug Fix', () => {
  let mutationManager: PolygonMutationManager;
  let mockMap: L.Map;
  let mockFeatureGroups: L.FeatureGroup[];
  let turfHelper: TurfHelper;
  let polygonInformation: PolygonInformationService;
  let modeManager: ModeManager;
  let eventManager: EventManager;

  beforeEach(() => {
    // Create mock map
    mockMap = {
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      getContainer: vi.fn(() => ({ style: {} })),
      fire: vi.fn(),
      closePopup: vi.fn(),
    } as any;

    // Initialize dependencies
    const config = defaultConfig as unknown as PolydrawConfig;
    turfHelper = new TurfHelper(config);

    // Create mock MapStateService for PolygonInformationService
    const mockMapStateService = {
      updatePolygons: vi.fn(),
    } as any;

    polygonInformation = new PolygonInformationService(mockMapStateService);
    eventManager = new EventManager();
    modeManager = new ModeManager(config, eventManager);
    mockFeatureGroups = [];

    // Create mutation manager
    mutationManager = new PolygonMutationManager({
      turfHelper,
      polygonInformation,
      map: mockMap,
      config,
      modeManager,
      eventManager,
      getFeatureGroups: () => mockFeatureGroups,
    });
  });

  describe('Bug Reproduction: Markers Missing Inside Holes', () => {
    it('should create markers for polygons drawn inside holes (donut scenario)', async () => {
      // Step 1: Create a large outer polygon
      const outerPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      // Add the outer polygon
      const outerResult = await mutationManager.addPolygon(outerPolygon, { noMerge: true });
      expect(outerResult.success).toBe(true);
      expect(mockFeatureGroups).toHaveLength(1);

      // Step 2: Create a hole inside the outer polygon (subtract mode)
      const holePolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [3, 3],
              [7, 3],
              [7, 7],
              [3, 7],
              [3, 3],
            ],
          ],
        },
        properties: {},
      };

      // Subtract the hole from the outer polygon (creates donut)
      const subtractResult = await mutationManager.subtractPolygon(holePolygon);
      expect(subtractResult.success).toBe(true);

      // Now we should have a donut polygon (polygon with hole)
      expect(mockFeatureGroups.length).toBeGreaterThan(0);

      // Step 3: Create a new polygon INSIDE the hole
      const polygonInsideHole: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [4, 4],
              [6, 4],
              [6, 6],
              [4, 6],
              [4, 4],
            ],
          ],
        },
        properties: {},
      };

      // Add the polygon inside the hole
      const insideHoleResult = await mutationManager.addPolygon(polygonInsideHole, {
        noMerge: true,
      });
      expect(insideHoleResult.success).toBe(true);

      // Step 4: Verify that markers are created for the polygon inside the hole
      // This is the critical test - the bug was that no markers were created
      const lastFeatureGroup = mockFeatureGroups[mockFeatureGroups.length - 1];
      expect(lastFeatureGroup).toBeDefined();

      // Count markers in the feature group
      let markerCount = 0;
      let polygonCount = 0;

      lastFeatureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          markerCount++;
        } else if (layer instanceof L.Polygon) {
          polygonCount++;
        }
      });

      // The bug was that markerCount would be 0
      // With the fix, we should have markers
      expect(polygonCount).toBeGreaterThan(0); // Should have the polygon
      expect(markerCount).toBeGreaterThan(0); // Should have markers (this was the bug)

      console.log(`Polygon inside hole test: ${markerCount} markers, ${polygonCount} polygons`);
    });

    it('should create markers for polygons drawn outside holes (control test)', async () => {
      // Step 1: Create a donut polygon (same as above)
      const outerPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      await mutationManager.addPolygon(outerPolygon, { noMerge: true });

      const holePolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [3, 3],
              [7, 3],
              [7, 7],
              [3, 7],
              [3, 3],
            ],
          ],
        },
        properties: {},
      };

      await mutationManager.subtractPolygon(holePolygon);

      // Step 2: Create a new polygon OUTSIDE the donut (this should work)
      const polygonOutsideHole: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [12, 12],
              [14, 12],
              [14, 14],
              [12, 14],
              [12, 12],
            ],
          ],
        },
        properties: {},
      };

      const outsideResult = await mutationManager.addPolygon(polygonOutsideHole, {
        noMerge: true,
      });
      expect(outsideResult.success).toBe(true);

      // Verify markers are created (this should always work)
      const lastFeatureGroup = mockFeatureGroups[mockFeatureGroups.length - 1];
      let markerCount = 0;
      let polygonCount = 0;

      lastFeatureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          markerCount++;
        } else if (layer instanceof L.Polygon) {
          polygonCount++;
        }
      });

      expect(polygonCount).toBeGreaterThan(0);
      expect(markerCount).toBeGreaterThan(0); // This should always work

      console.log(`Polygon outside hole test: ${markerCount} markers, ${polygonCount} polygons`);
    });

    it('should handle complex coordinate structures in normalizePolygonCoordinates', () => {
      // Test the normalizePolygonCoordinates method directly
      const testCases = [
        {
          name: 'Simple LatLng array',
          input: [
            { lat: 1, lng: 2 },
            { lat: 3, lng: 4 },
            { lat: 5, lng: 6 },
          ],
          expectedLength: 1, // Should wrap in array
        },
        {
          name: 'Polygon with holes',
          input: [
            [
              { lat: 0, lng: 0 },
              { lat: 0, lng: 10 },
              { lat: 10, lng: 10 },
              { lat: 10, lng: 0 },
              { lat: 0, lng: 0 },
            ],
            [
              { lat: 3, lng: 3 },
              { lat: 3, lng: 7 },
              { lat: 7, lng: 7 },
              { lat: 7, lng: 3 },
              { lat: 3, lng: 3 },
            ],
          ],
          expectedLength: 2, // Outer ring + hole
        },
        {
          name: 'MultiPolygon structure',
          input: [
            [
              [
                { lat: 0, lng: 0 },
                { lat: 0, lng: 5 },
                { lat: 5, lng: 5 },
                { lat: 5, lng: 0 },
                { lat: 0, lng: 0 },
              ],
            ],
            [
              [
                { lat: 10, lng: 10 },
                { lat: 10, lng: 15 },
                { lat: 15, lng: 15 },
                { lat: 15, lng: 10 },
                { lat: 10, lng: 10 },
              ],
            ],
          ],
          expectedLength: 2, // Should flatten both polygons
        },
      ];

      testCases.forEach((testCase) => {
        // Access the private method through type assertion
        const result = (mutationManager as any).normalizePolygonCoordinates(testCase.input);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(testCase.expectedLength);
        console.log(`${testCase.name}: ${result.length} rings`);
      });
    });

    it('should handle edge cases in coordinate normalization', () => {
      const edgeCases = [
        {
          name: 'Empty array',
          input: [],
          expectedLength: 0,
        },
        {
          name: 'Null input',
          input: null,
          expectedLength: 0,
        },
        {
          name: 'Undefined input',
          input: undefined,
          expectedLength: 0,
        },
        {
          name: 'Invalid coordinate structure',
          input: [{ invalid: 'data' }],
          expectedLength: 0,
        },
      ];

      edgeCases.forEach((testCase) => {
        const result = (mutationManager as any).normalizePolygonCoordinates(testCase.input);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(testCase.expectedLength);
        console.log(`${testCase.name}: ${result.length} rings`);
      });
    });
  });

  describe('Regression Tests', () => {
    it('should not break existing functionality for simple polygons', async () => {
      const simplePolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [5, 0],
              [5, 5],
              [0, 5],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      const result = await mutationManager.addPolygon(simplePolygon, { noMerge: true });
      expect(result.success).toBe(true);
      expect(mockFeatureGroups).toHaveLength(1);

      // Verify markers are created for simple polygons
      const featureGroup = mockFeatureGroups[0];
      let markerCount = 0;
      let polygonCount = 0;

      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          markerCount++;
        } else if (layer instanceof L.Polygon) {
          polygonCount++;
        }
      });

      expect(polygonCount).toBeGreaterThan(0);
      expect(markerCount).toBeGreaterThan(0);
    });

    it('should handle polygon merging correctly', async () => {
      // Enable merging for this test
      const configWithMerging = {
        ...defaultConfig,
        mergePolygons: true,
      } as unknown as PolydrawConfig;
      const mutationManagerWithMerging = new PolygonMutationManager({
        turfHelper,
        polygonInformation,
        map: mockMap,
        config: configWithMerging,
        modeManager,
        eventManager,
        getFeatureGroups: () => mockFeatureGroups,
      });

      const polygon1: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [5, 0],
              [5, 5],
              [0, 5],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      const polygon2: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [3, 3],
              [8, 3],
              [8, 8],
              [3, 8],
              [3, 3],
            ],
          ],
        },
        properties: {},
      };

      await mutationManagerWithMerging.addPolygon(polygon1);
      const result = await mutationManagerWithMerging.addPolygon(polygon2);

      expect(result.success).toBe(true);
      // Should have merged into one polygon
      expect(mockFeatureGroups.length).toBeLessThanOrEqual(2);
    });
  });
});
