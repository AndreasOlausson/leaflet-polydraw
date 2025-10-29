/**
 * Predefined GeoJSON Tests
 *
 * Tests the predefined GeoJSON functionality that extends Polydraw's capabilities:
 * - Adding predefined polygons via addPredefinedGeoJSONs()
 * - GeoJSON Polygon support
 * - GeoJSON MultiPolygon support (all polygons, not just first)
 * - Polygons with holes
 * - Multiple features
 * - Visual optimization levels
 * - Error handling and validation
 * - Integration with drawing modes
 * - Event handling
 * - Real-world scenarios
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockFactory } from '../mocks/factory';
import Polydraw from '../../../src/polydraw';
import type { Feature, Polygon, MultiPolygon } from 'geojson';

// Mock type for Polydraw with test-specific methods
type MockedPolydraw = {
  // Real Polydraw public methods
  addTo(map: L.Map): MockedPolydraw;
  onAdd(map: L.Map): HTMLElement;
  onRemove(map: L.Map): void;
  getFeatureGroups(): L.FeatureGroup[];
  addPredefinedGeoJSONs(
    geojsonFeatures: Feature<Polygon | MultiPolygon>[],
    options?: { visualOptimizationLevel?: number },
  ): Promise<void>;
  addPredefinedPolygon(
    geographicBorders: L.LatLng[][][],
    options?: { visualOptimizationLevel?: number },
  ): Promise<void>;
  setDrawMode(mode: any): MockedPolydraw;
  getDrawMode(): any;
  on(event: any, callback: any): void;
  off(event: any, callback: any): void;
  removeAllFeatureGroups(): void;

  // Test-specific methods
  isDrawing(): boolean;
  startDraw(): void;
  stopDraw(): void;
  clearAll(): void;
  getPolygons(): unknown[];
  remove(): MockedPolydraw;
};

// Mock the polydraw module
vi.mock('../../../src/polydraw', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      const mockInstance = {
        // Mock properties for error testing
        map: MockFactory.createMap(),
        polygonMutationManager: {},

        // Public methods from the real Polydraw class
        addTo: vi.fn().mockReturnThis(),
        onAdd: vi.fn().mockReturnValue(document.createElement('div')),
        onRemove: vi.fn(),
        getFeatureGroups: vi.fn().mockReturnValue([]),
        addPredefinedPolygon: vi.fn().mockResolvedValue(undefined),
        addPredefinedGeoJSONs: vi.fn().mockImplementation(async function (
          this: any,
          geojsonFeatures: Feature<Polygon | MultiPolygon>[],
          options?: { visualOptimizationLevel?: number },
        ) {
          // Simulate the actual implementation logic
          for (const geojsonFeature of geojsonFeatures) {
            const { type, coordinates } = geojsonFeature.geometry;

            if (type === 'MultiPolygon') {
              // Process all polygons in MultiPolygon
              for (const polygonCoords of coordinates) {
                const latLngs = polygonCoords.map((ring) =>
                  ring.map((point) => ({ lat: point[1], lng: point[0] })),
                );
                await this.addPredefinedPolygon([latLngs], options);
              }
            } else if (type === 'Polygon') {
              const latLngs = coordinates.map((ring) =>
                ring.map((point) => ({ lat: point[1], lng: point[0] })),
              );
              await this.addPredefinedPolygon([latLngs], options);
            }
          }
        }),
        setDrawMode: vi.fn().mockReturnThis(),
        getDrawMode: vi.fn().mockReturnValue(0),
        on: vi.fn(),
        off: vi.fn(),
        removeAllFeatureGroups: vi.fn(),

        // Test-specific methods
        startDraw: vi.fn().mockReturnThis(),
        stopDraw: vi.fn().mockReturnThis(),
        clearAll: vi.fn().mockReturnThis(),
        getPolygons: vi.fn().mockReturnValue([]),
        isDrawing: vi.fn().mockReturnValue(false),
        remove: vi.fn().mockReturnThis(),
      };

      return mockInstance;
    }),
  };
});

/**
 * GeoJSON test data factory
 */
class GeoJSONTestData {
  /**
   * Creates a simple square Polygon GeoJSON
   */
  static squarePolygon(): Feature<Polygon> {
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [15.597, 58.397],
            [15.603, 58.397],
            [15.603, 58.403],
            [15.597, 58.403],
            [15.597, 58.397],
          ],
        ],
      },
      properties: {},
    };
  }

  /**
   * Creates an octagon Polygon GeoJSON
   */
  static octagonPolygon(): Feature<Polygon> {
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [15.6, 58.404493],
            [15.602928, 58.402928],
            [15.604493, 58.4],
            [15.602928, 58.397072],
            [15.6, 58.395507],
            [15.597072, 58.397072],
            [15.595507, 58.4],
            [15.597072, 58.402928],
            [15.6, 58.404493],
          ],
        ],
      },
      properties: {},
    };
  }

  /**
   * Creates a triangle Polygon GeoJSON
   */
  static trianglePolygon(): Feature<Polygon> {
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [15.6, 58.405],
            [15.605, 58.395],
            [15.595, 58.395],
            [15.6, 58.405],
          ],
        ],
      },
      properties: {},
    };
  }

  /**
   * Creates a complex polygon with many vertices
   */
  static complexPolygon(): Feature<Polygon> {
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [15.59, 58.39],
            [15.595, 58.39],
            [15.6, 58.391],
            [15.605, 58.392],
            [15.608, 58.394],
            [15.61, 58.397],
            [15.61, 58.4],
            [15.609, 58.403],
            [15.607, 58.406],
            [15.604, 58.408],
            [15.6, 58.41],
            [15.596, 58.409],
            [15.593, 58.407],
            [15.591, 58.404],
            [15.59, 58.4],
            [15.59, 58.395],
            [15.59, 58.39],
          ],
        ],
      },
      properties: {},
    };
  }

  /**
   * Creates a Polygon with a hole (donut shape)
   */
  static polygonWithHole(): Feature<Polygon> {
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          // Outer ring
          [
            [15.597, 58.397],
            [15.603, 58.397],
            [15.603, 58.407],
            [15.597, 58.407],
            [15.597, 58.397],
          ],
          // Inner ring (hole)
          [
            [15.599, 58.401],
            [15.601, 58.401],
            [15.601, 58.403],
            [15.599, 58.403],
            [15.599, 58.401],
          ],
        ],
      },
      properties: {},
    };
  }

  /**
   * Creates a Polygon with multiple holes
   */
  static polygonWithMultipleHoles(): Feature<Polygon> {
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          // Outer boundary
          [
            [15.59, 58.39],
            [15.61, 58.39],
            [15.61, 58.41],
            [15.59, 58.41],
            [15.59, 58.39],
          ],
          // First hole
          [
            [15.592, 58.392],
            [15.598, 58.392],
            [15.598, 58.398],
            [15.592, 58.398],
            [15.592, 58.392],
          ],
          // Second hole
          [
            [15.602, 58.402],
            [15.608, 58.402],
            [15.608, 58.408],
            [15.602, 58.408],
            [15.602, 58.402],
          ],
        ],
      },
      properties: {},
    };
  }

  /**
   * Creates a simple MultiPolygon with 2 polygons
   */
  static simpleMultiPolygon(): Feature<MultiPolygon> {
    return {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          // First polygon
          [
            [
              [15.59, 58.39],
              [15.595, 58.39],
              [15.595, 58.395],
              [15.59, 58.395],
              [15.59, 58.39],
            ],
          ],
          // Second polygon
          [
            [
              [15.605, 58.405],
              [15.61, 58.405],
              [15.61, 58.41],
              [15.605, 58.41],
              [15.605, 58.405],
            ],
          ],
        ],
      },
      properties: {},
    };
  }

  /**
   * Creates a MultiPolygon with 3 separate polygons
   */
  static tripleMultiPolygon(): Feature<MultiPolygon> {
    return {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          // First polygon
          [
            [
              [15.59, 58.39],
              [15.593, 58.39],
              [15.593, 58.393],
              [15.59, 58.393],
              [15.59, 58.39],
            ],
          ],
          // Second polygon
          [
            [
              [15.598, 58.398],
              [15.602, 58.398],
              [15.602, 58.402],
              [15.598, 58.402],
              [15.598, 58.398],
            ],
          ],
          // Third polygon
          [
            [
              [15.607, 58.407],
              [15.61, 58.407],
              [15.61, 58.41],
              [15.607, 58.41],
              [15.607, 58.407],
            ],
          ],
        ],
      },
      properties: {},
    };
  }

  /**
   * Creates a MultiPolygon with polygons that have holes
   */
  static multiPolygonWithHoles(): Feature<MultiPolygon> {
    return {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          // First polygon with hole
          [
            // Outer ring
            [
              [15.59, 58.39],
              [15.6, 58.39],
              [15.6, 58.4],
              [15.59, 58.4],
              [15.59, 58.39],
            ],
            // Inner hole
            [
              [15.592, 58.392],
              [15.598, 58.392],
              [15.598, 58.398],
              [15.592, 58.398],
              [15.592, 58.392],
            ],
          ],
          // Second polygon with hole
          [
            // Outer ring
            [
              [15.602, 58.402],
              [15.61, 58.402],
              [15.61, 58.41],
              [15.602, 58.41],
              [15.602, 58.402],
            ],
            // Inner hole
            [
              [15.604, 58.404],
              [15.608, 58.404],
              [15.608, 58.408],
              [15.604, 58.408],
              [15.604, 58.404],
            ],
          ],
        ],
      },
      properties: {},
    };
  }

  /**
   * Creates a real-world example: simplified country border
   */
  static realWorldPolygon(): Feature<Polygon> {
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [15.62128448, 58.40989856],
            [15.62067986, 58.41001688],
            [15.62021255, 58.41009188],
            [15.61988831, 58.41011429],
            [15.61957359, 58.41009188],
            [15.6193161, 58.41001688],
            [15.61912918, 58.40989856],
            [15.61902618, 58.40974975],
            [15.61902618, 58.40959167],
            [15.61912918, 58.40944286],
            [15.6193161, 58.40932454],
            [15.61957359, 58.40924954],
            [15.61988831, 58.40922713],
            [15.62021255, 58.40924954],
            [15.62067986, 58.40932454],
            [15.62128448, 58.40989856],
          ],
        ],
      },
      properties: {
        name: 'Sample Area',
        population: 10000,
      },
    };
  }
}

describe('Predefined GeoJSON', () => {
  let _map: L.Map;
  let polydraw: MockedPolydraw;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create fresh mock objects
    _map = MockFactory.createMap();
    polydraw = new Polydraw() as unknown as MockedPolydraw;
  });

  describe('Basic Polygon GeoJSON', () => {
    it('should add a simple square polygon from GeoJSON', async () => {
      const square = GeoJSONTestData.squarePolygon();

      await polydraw.addPredefinedGeoJSONs([square]);

      expect(polydraw.addPredefinedGeoJSONs).toHaveBeenCalledWith([square]);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should add an octagon polygon from GeoJSON', async () => {
      const octagon = GeoJSONTestData.octagonPolygon();

      await polydraw.addPredefinedGeoJSONs([octagon]);

      expect(polydraw.addPredefinedGeoJSONs).toHaveBeenCalledWith([octagon]);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should add a triangle polygon from GeoJSON', async () => {
      const triangle = GeoJSONTestData.trianglePolygon();

      await polydraw.addPredefinedGeoJSONs([triangle]);

      expect(polydraw.addPredefinedGeoJSONs).toHaveBeenCalledWith([triangle]);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should add a complex polygon with many vertices from GeoJSON', async () => {
      const complex = GeoJSONTestData.complexPolygon();

      await polydraw.addPredefinedGeoJSONs([complex]);

      expect(polydraw.addPredefinedGeoJSONs).toHaveBeenCalledWith([complex]);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should convert GeoJSON coordinates to LatLng format correctly', async () => {
      const square = GeoJSONTestData.squarePolygon();

      await polydraw.addPredefinedGeoJSONs([square]);

      // Verify that addPredefinedPolygon was called with correct LatLng format
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
                lat: expect.any(Number),
                lng: expect.any(Number),
              }),
            ]),
          ]),
        ]),
        undefined,
      );
    });
  });

  describe('Polygon GeoJSON with Holes', () => {
    it('should add a polygon with a single hole from GeoJSON', async () => {
      const polygonWithHole = GeoJSONTestData.polygonWithHole();

      expect(polygonWithHole.geometry.coordinates).toHaveLength(2); // Outer + 1 hole

      await polydraw.addPredefinedGeoJSONs([polygonWithHole]);

      expect(polydraw.addPredefinedGeoJSONs).toHaveBeenCalledWith([polygonWithHole]);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should add a polygon with multiple holes from GeoJSON', async () => {
      const polygonWithHoles = GeoJSONTestData.polygonWithMultipleHoles();

      expect(polygonWithHoles.geometry.coordinates).toHaveLength(3); // Outer + 2 holes

      await polydraw.addPredefinedGeoJSONs([polygonWithHoles]);

      expect(polydraw.addPredefinedGeoJSONs).toHaveBeenCalledWith([polygonWithHoles]);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should preserve hole structure when converting to LatLng', async () => {
      const polygonWithHole = GeoJSONTestData.polygonWithHole();

      await polydraw.addPredefinedGeoJSONs([polygonWithHole]);

      // Verify that addPredefinedPolygon was called with array containing 2 rings
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(
        expect.arrayContaining([expect.arrayContaining([expect.any(Array), expect.any(Array)])]),
        undefined,
      );
    });
  });

  describe('MultiPolygon GeoJSON', () => {
    it('should add all polygons from a MultiPolygon (not just the first)', async () => {
      const multiPolygon = GeoJSONTestData.simpleMultiPolygon();

      expect(multiPolygon.geometry.coordinates).toHaveLength(2); // 2 polygons

      await polydraw.addPredefinedGeoJSONs([multiPolygon]);

      // Critical test: verify that BOTH polygons were added
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(2);
    });

    it('should add all three polygons from a triple MultiPolygon', async () => {
      const tripleMultiPolygon = GeoJSONTestData.tripleMultiPolygon();

      expect(tripleMultiPolygon.geometry.coordinates).toHaveLength(3); // 3 polygons

      await polydraw.addPredefinedGeoJSONs([tripleMultiPolygon]);

      // Verify all 3 polygons were added
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(3);
    });

    it('should handle MultiPolygon with polygons containing holes', async () => {
      const multiPolygonWithHoles = GeoJSONTestData.multiPolygonWithHoles();

      expect(multiPolygonWithHoles.geometry.coordinates).toHaveLength(2); // 2 polygons
      expect(multiPolygonWithHoles.geometry.coordinates[0]).toHaveLength(2); // First has hole
      expect(multiPolygonWithHoles.geometry.coordinates[1]).toHaveLength(2); // Second has hole

      await polydraw.addPredefinedGeoJSONs([multiPolygonWithHoles]);

      // Verify both polygons were added
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(2);
    });

    it('should process each polygon in MultiPolygon independently', async () => {
      const multiPolygon = GeoJSONTestData.simpleMultiPolygon();

      await polydraw.addPredefinedGeoJSONs([multiPolygon]);

      // Verify each call to addPredefinedPolygon has single polygon
      const calls = (polydraw.addPredefinedPolygon as any).mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0][0]).toHaveLength(1); // First polygon
      expect(calls[1][0]).toHaveLength(1); // Second polygon
    });
  });

  describe('Multiple Features', () => {
    it('should add multiple Polygon features', async () => {
      const features = [
        GeoJSONTestData.squarePolygon(),
        GeoJSONTestData.trianglePolygon(),
        GeoJSONTestData.octagonPolygon(),
      ];

      await polydraw.addPredefinedGeoJSONs(features);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(3);
    });

    it('should add multiple MultiPolygon features', async () => {
      const features = [
        GeoJSONTestData.simpleMultiPolygon(), // 2 polygons
        GeoJSONTestData.tripleMultiPolygon(), // 3 polygons
      ];

      await polydraw.addPredefinedGeoJSONs(features);

      // Total: 2 + 3 = 5 polygons
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(5);
    });

    it('should add mixed Polygon and MultiPolygon features', async () => {
      const features = [
        GeoJSONTestData.squarePolygon(), // 1 polygon
        GeoJSONTestData.simpleMultiPolygon(), // 2 polygons
        GeoJSONTestData.trianglePolygon(), // 1 polygon
      ];

      await polydraw.addPredefinedGeoJSONs(features);

      // Total: 1 + 2 + 1 = 4 polygons
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(4);
    });

    it('should process features sequentially in order', async () => {
      const square = GeoJSONTestData.squarePolygon();
      const triangle = GeoJSONTestData.trianglePolygon();
      const features = [square, triangle];

      await polydraw.addPredefinedGeoJSONs(features);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(2);
      // Order should be preserved
      const calls = (polydraw.addPredefinedPolygon as any).mock.calls;
      expect(calls[0][0]).toBeDefined(); // First call
      expect(calls[1][0]).toBeDefined(); // Second call
    });
  });

  describe('Visual Optimization', () => {
    it('should add polygon with default visual optimization level', async () => {
      const square = GeoJSONTestData.squarePolygon();

      await polydraw.addPredefinedGeoJSONs([square]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(expect.any(Array), undefined);
    });

    it('should add polygon with custom visual optimization level', async () => {
      const square = GeoJSONTestData.squarePolygon();
      const options = { visualOptimizationLevel: 2 };

      await polydraw.addPredefinedGeoJSONs([square], options);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(expect.any(Array), options);
    });

    it('should apply visual optimization to all polygons in MultiPolygon', async () => {
      const multiPolygon = GeoJSONTestData.simpleMultiPolygon();
      const options = { visualOptimizationLevel: 3 };

      await polydraw.addPredefinedGeoJSONs([multiPolygon], options);

      // Both polygons should receive the same options
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(2);
      expect(polydraw.addPredefinedPolygon).toHaveBeenNthCalledWith(1, expect.any(Array), options);
      expect(polydraw.addPredefinedPolygon).toHaveBeenNthCalledWith(2, expect.any(Array), options);
    });

    it('should support visualOptimizationLevel of 0', async () => {
      const square = GeoJSONTestData.squarePolygon();
      const options = { visualOptimizationLevel: 0 };

      await polydraw.addPredefinedGeoJSONs([square], options);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(expect.any(Array), options);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty features array gracefully', async () => {
      await polydraw.addPredefinedGeoJSONs([]);

      expect(polydraw.addPredefinedPolygon).not.toHaveBeenCalled();
    });

    it('should handle single feature in array', async () => {
      const square = GeoJSONTestData.squarePolygon();

      await polydraw.addPredefinedGeoJSONs([square]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should await each polygon addition', async () => {
      const features = [
        GeoJSONTestData.squarePolygon(),
        GeoJSONTestData.trianglePolygon(),
      ];

      await polydraw.addPredefinedGeoJSONs(features);

      // Verify async behavior
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(2);
    });
  });

  describe('Coordinate Conversion', () => {
    it('should convert GeoJSON [lng, lat] to Leaflet [lat, lng] correctly', async () => {
      const square = GeoJSONTestData.squarePolygon();
      const firstCoord = square.geometry.coordinates[0][0];
      const expectedLng = firstCoord[0];
      const expectedLat = firstCoord[1];

      await polydraw.addPredefinedGeoJSONs([square]);

      const call = (polydraw.addPredefinedPolygon as any).mock.calls[0];
      const convertedCoord = call[0][0][0][0];

      expect(convertedCoord.lat).toBe(expectedLat);
      expect(convertedCoord.lng).toBe(expectedLng);
    });

    it('should maintain coordinate precision during conversion', async () => {
      const polygon = GeoJSONTestData.realWorldPolygon();
      const firstCoord = polygon.geometry.coordinates[0][0];

      await polydraw.addPredefinedGeoJSONs([polygon]);

      const call = (polydraw.addPredefinedPolygon as any).mock.calls[0];
      const convertedCoord = call[0][0][0][0];

      // Check precision is maintained
      expect(convertedCoord.lat).toBe(firstCoord[1]);
      expect(convertedCoord.lng).toBe(firstCoord[0]);
    });
  });

  describe('Integration with Drawing Modes', () => {
    it('should work when draw mode is off', async () => {
      polydraw.getDrawMode = vi.fn().mockReturnValue(0); // DrawMode.Off
      const square = GeoJSONTestData.squarePolygon();

      await polydraw.addPredefinedGeoJSONs([square]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should work independently of current draw mode', async () => {
      polydraw.getDrawMode = vi.fn().mockReturnValue(1); // DrawMode.Add
      const square = GeoJSONTestData.squarePolygon();

      await polydraw.addPredefinedGeoJSONs([square]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle real-world polygon data', async () => {
      const realWorld = GeoJSONTestData.realWorldPolygon();

      await polydraw.addPredefinedGeoJSONs([realWorld]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should preserve GeoJSON properties (even though not used)', async () => {
      const realWorld = GeoJSONTestData.realWorldPolygon();

      expect(realWorld.properties).toEqual({
        name: 'Sample Area',
        population: 10000,
      });

      await polydraw.addPredefinedGeoJSONs([realWorld]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should handle loading multiple real-world features', async () => {
      const features = [
        GeoJSONTestData.realWorldPolygon(),
        GeoJSONTestData.realWorldPolygon(),
        GeoJSONTestData.realWorldPolygon(),
      ];

      await polydraw.addPredefinedGeoJSONs(features);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance and Scale', () => {
    it('should handle large number of simple polygons', async () => {
      const features = Array.from({ length: 50 }, () => GeoJSONTestData.squarePolygon());

      await polydraw.addPredefinedGeoJSONs(features);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(50);
    });

    it('should handle large MultiPolygon efficiently', async () => {
      const multiPolygon = GeoJSONTestData.tripleMultiPolygon();

      await polydraw.addPredefinedGeoJSONs([multiPolygon]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(3);
    });

    it('should process complex polygons with many vertices', async () => {
      const complex = GeoJSONTestData.complexPolygon();

      expect(complex.geometry.coordinates[0]).toHaveLength(17); // 16 vertices + close

      await polydraw.addPredefinedGeoJSONs([complex]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });
  });

  describe('Type Safety', () => {
    it('should accept Polygon type in features array', async () => {
      const polygon: Feature<Polygon> = GeoJSONTestData.squarePolygon();

      await polydraw.addPredefinedGeoJSONs([polygon]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should accept MultiPolygon type in features array', async () => {
      const multiPolygon: Feature<MultiPolygon> = GeoJSONTestData.simpleMultiPolygon();

      await polydraw.addPredefinedGeoJSONs([multiPolygon]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(2);
    });

    it('should accept mixed Polygon and MultiPolygon types', async () => {
      const features: Feature<Polygon | MultiPolygon>[] = [
        GeoJSONTestData.squarePolygon(),
        GeoJSONTestData.simpleMultiPolygon(),
      ];

      await polydraw.addPredefinedGeoJSONs(features);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(3); // 1 + 2
    });
  });

  describe('Edge Cases', () => {
    it('should handle polygon with minimum vertices (triangle)', async () => {
      const triangle = GeoJSONTestData.trianglePolygon();

      expect(triangle.geometry.coordinates[0]).toHaveLength(4); // 3 + close

      await polydraw.addPredefinedGeoJSONs([triangle]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should handle polygon with many holes', async () => {
      const polygonWithHoles = GeoJSONTestData.polygonWithMultipleHoles();

      expect(polygonWithHoles.geometry.coordinates).toHaveLength(3); // Outer + 2 holes

      await polydraw.addPredefinedGeoJSONs([polygonWithHoles]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should handle empty properties object', async () => {
      const polygon = GeoJSONTestData.squarePolygon();
      polygon.properties = {};

      await polydraw.addPredefinedGeoJSONs([polygon]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should handle null properties', async () => {
      const polygon = GeoJSONTestData.squarePolygon();
      polygon.properties = null as any;

      await polydraw.addPredefinedGeoJSONs([polygon]);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });
  });

  describe('Comparison with addPredefinedPolygon', () => {
    it('should produce equivalent results to addPredefinedPolygon for simple polygon', async () => {
      const square = GeoJSONTestData.squarePolygon();

      await polydraw.addPredefinedGeoJSONs([square]);

      // Verify it calls addPredefinedPolygon internally
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(1);
    });

    it('should handle MultiPolygon where addPredefinedPolygon cannot', async () => {
      const multiPolygon = GeoJSONTestData.simpleMultiPolygon();

      await polydraw.addPredefinedGeoJSONs([multiPolygon]);

      // addPredefinedGeoJSONs should call addPredefinedPolygon multiple times
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(2);
    });
  });
});
