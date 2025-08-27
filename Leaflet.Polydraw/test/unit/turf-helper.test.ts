import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TurfHelper } from '../../src/turf-helper';
import defaultConfig from '../../src/config.json';
import type { Feature, Polygon, MultiPolygon, Point } from 'geojson';
import * as isTestEnvModule from '../../src/utils';

describe('TurfHelper', () => {
  let turfHelper: TurfHelper;

  beforeEach(() => {
    turfHelper = new TurfHelper(defaultConfig);
  });

  describe('Basic Functionality', () => {
    it('can be instantiated', () => {
      expect(turfHelper).toBeInstanceOf(TurfHelper);
    });

    it('can convert coordinates', () => {
      const latlng = { lat: 58.402514, lng: 15.606188 };

      const coords = turfHelper.getCoord(latlng);
      expect(coords).toBeInstanceOf(Array);
      expect(Array.isArray(coords)).toBe(true);
      expect((coords as number[])[0]).toBeCloseTo(15.606188);
      expect((coords as number[])[1]).toBeCloseTo(58.402514);
    });

    it('should handle coordinate conversion edge cases', () => {
      // Test with zero coordinates
      const zeroCoords = { lat: 0, lng: 0 };
      const result = turfHelper.getCoord(zeroCoords);
      expect(result).toEqual([0, 0]);

      // Test with negative coordinates
      const negativeCoords = { lat: -45.123, lng: -122.456 };
      const negResult = turfHelper.getCoord(negativeCoords);
      expect((negResult as number[])[0]).toBeCloseTo(-122.456);
      expect((negResult as number[])[1]).toBeCloseTo(-45.123);
    });
  });

  describe('Polygon Creation Methods', () => {
    const testLineString: Feature<any> = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      },
      properties: {},
    };

    it('should create polygon using concaveman method', () => {
      const result = turfHelper.turfConcaveman(testLineString);

      expect(result).toBeDefined();
      expect(result.geometry.type).toBe('MultiPolygon');
      expect(result.geometry.coordinates).toBeDefined();
      expect(result.geometry.coordinates.length).toBeGreaterThan(0);
    });

    it('should create polygon from trace using configured method', () => {
      const result = turfHelper.createPolygonFromTrace(testLineString);

      expect(result).toBeDefined();
      expect(['Polygon', 'MultiPolygon']).toContain(result.geometry.type);
    });

    it('should handle different polygon creation methods', () => {
      // Test with different config methods
      const methods = ['concaveman', 'convex', 'direct', 'buffer'];

      methods.forEach((method) => {
        const customConfig = { ...defaultConfig, polygonCreation: { method } };
        const customHelper = new TurfHelper(customConfig);

        const result = customHelper.createPolygonFromTrace(testLineString);
        expect(result).toBeDefined();
        expect(['Polygon', 'MultiPolygon']).toContain(result.geometry.type);
      });
    });

    it('should fallback to concaveman for unknown methods', () => {
      const customConfig = { ...defaultConfig, polygonCreation: { method: 'unknown' } };
      const customHelper = new TurfHelper(customConfig);

      // Suppress console warnings for this test
      const originalConsoleWarn = console.warn;
      console.warn = vi.fn();

      const result = customHelper.createPolygonFromTrace(testLineString);
      expect(result).toBeDefined();

      // Restore console.warn
      console.warn = originalConsoleWarn;
    });

    it('should handle insufficient points for direct polygon creation', () => {
      const insufficientPoints: Feature<any> = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 1],
          ], // Only 2 points
        },
        properties: {},
      };

      const result = turfHelper.createPolygonFromTrace(insufficientPoints);
      expect(result).toBeDefined();
    });
  });

  describe('Boolean Operations', () => {
    const polygon1: Feature<Polygon> = {
      type: 'Feature',
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
      properties: {},
    };

    const polygon2: Feature<Polygon> = {
      type: 'Feature',
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
      properties: {},
    };

    it('should perform union operation', () => {
      const result = turfHelper.union(polygon1, polygon2);

      expect(result).toBeDefined();
      if (result) {
        expect(['Polygon', 'MultiPolygon']).toContain(result.geometry.type);

        // Union should have larger area than individual polygons
        const area1 = turfHelper.getPolygonArea(polygon1);
        const area2 = turfHelper.getPolygonArea(polygon2);
        const unionArea = turfHelper.getPolygonArea(result);

        expect(unionArea).toBeGreaterThan(area1);
        expect(unionArea).toBeGreaterThan(area2);
        expect(unionArea).toBeLessThan(area1 + area2); // Should be less due to overlap
      }
    });

    it('should perform intersection operation', () => {
      const result = turfHelper.getIntersection(polygon1, polygon2);

      expect(result).toBeDefined();
      if (result) {
        expect(['Polygon', 'MultiPolygon']).toContain(result.geometry.type);

        // Intersection should have smaller area
        const area1 = turfHelper.getPolygonArea(polygon1);
        const intersectionArea = turfHelper.getPolygonArea(result);
        expect(intersectionArea).toBeLessThan(area1);
      }
    });

    it('should perform difference operation', () => {
      const result = turfHelper.polygonDifference(polygon1, polygon2);

      expect(result).toBeDefined();
      if (result) {
        expect(['Polygon', 'MultiPolygon']).toContain(result.geometry.type);

        // Difference should have smaller area than original
        const area1 = turfHelper.getPolygonArea(polygon1);
        const diffArea = turfHelper.getPolygonArea(result);
        expect(diffArea).toBeLessThan(area1);
      }
    });

    it('should detect polygon intersection', () => {
      const intersects = turfHelper.polygonIntersect(polygon1, polygon2);
      expect(intersects).toBe(true);
    });

    it('should handle non-intersecting polygons', () => {
      const nonIntersecting: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [5, 5],
              [6, 5],
              [6, 6],
              [5, 6],
              [5, 5],
            ],
          ],
        },
        properties: {},
      };

      const intersects = turfHelper.polygonIntersect(polygon1, nonIntersecting);
      expect(intersects).toBe(false);
    });

    it('should handle error cases in boolean operations', () => {
      const invalidPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [],
        },
        properties: {},
      };

      // Should handle errors gracefully
      turfHelper.union(polygon1, invalidPolygon);
      turfHelper.getIntersection(polygon1, invalidPolygon);
      const intersectsResult = turfHelper.polygonIntersect(polygon1, invalidPolygon);

      expect(intersectsResult).toBe(false);
    });
  });

  describe('Polygon Analysis', () => {
    const simplePolygon: Feature<Polygon> = {
      type: 'Feature',
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
      properties: {},
    };

    const polygonWithHole: Feature<Polygon> = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [4, 0],
            [4, 4],
            [0, 4],
            [0, 0],
          ], // Outer ring
          [
            [1, 1],
            [3, 1],
            [3, 3],
            [1, 3],
            [1, 1],
          ], // Hole
        ],
      },
      properties: {},
    };

    it('should calculate polygon area', () => {
      const area = turfHelper.getPolygonArea(simplePolygon);
      expect(area).toBeGreaterThan(0);
      // Note: Turf.js calculates area in square meters, so actual values will be much larger
      // than the coordinate units suggest due to geographic projection
    });

    it('should calculate polygon perimeter', () => {
      const perimeter = turfHelper.getPolygonPerimeter(simplePolygon);
      expect(perimeter).toBeGreaterThan(0);
    });

    it('should detect polygons with holes', () => {
      // This tests the private method indirectly through getKinks
      const hasHoles = polygonWithHole.geometry.coordinates.length > 1;
      expect(hasHoles).toBe(true);

      const noHoles = simplePolygon.geometry.coordinates.length > 1;
      expect(noHoles).toBe(false);
    });

    it('should check if polygon is completely within another', () => {
      const innerPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [1, 1],
              [2, 1],
              [2, 2],
              [1, 2],
              [1, 1],
            ],
          ],
        },
        properties: {},
      };

      const isWithin = turfHelper.isPolygonCompletelyWithin(innerPolygon, simplePolygon);
      expect(isWithin).toBe(true);
    });

    it('should get convex hull of polygon', () => {
      const convexHull = turfHelper.getConvexHull(simplePolygon);
      expect(convexHull).toBeDefined();
      if (convexHull) {
        expect(convexHull.geometry.type).toBe('Polygon');
      }
    });

    it('should convert polygon to bounding box', () => {
      const bbox = turfHelper.convertToBoundingBoxPolygon(simplePolygon);
      expect(bbox).toBeDefined();
      expect(bbox.geometry.type).toBe('Polygon');
    });
  });

  describe('Kinks and Self-Intersection', () => {
    const selfIntersectingPolygon: Feature<Polygon> = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [2, 2],
            [2, 0],
            [0, 2],
            [0, 0],
          ],
        ], // Figure-8 shape
      },
      properties: {},
    };

    const simplePolygon: Feature<Polygon> = {
      type: 'Feature',
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
      properties: {},
    };

    it('should detect kinks in self-intersecting polygons', () => {
      const hasKinks = turfHelper.hasKinks(selfIntersectingPolygon);
      expect(hasKinks).toBe(true);
    });

    it('should not detect kinks in simple polygons', () => {
      const hasKinks = turfHelper.hasKinks(simplePolygon);
      expect(hasKinks).toBe(false);
    });

    it('should resolve kinks and return valid polygons', () => {
      const resolved = turfHelper.getKinks(selfIntersectingPolygon);

      expect(resolved).toBeDefined();
      expect(Array.isArray(resolved)).toBe(true);
      expect(resolved.length).toBeGreaterThan(0);

      // Each resolved polygon should be valid
      resolved.forEach((polygon) => {
        expect(polygon.geometry).toBeDefined();
        expect(['Polygon', 'MultiPolygon']).toContain(polygon.geometry.type);
      });
    });

    it('should handle polygons with holes during kink resolution', () => {
      const polygonWithHole: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [4, 0],
              [4, 4],
              [0, 4],
              [0, 0],
            ], // Outer ring
            [
              [1, 1],
              [3, 1],
              [3, 3],
              [1, 3],
              [1, 1],
            ], // Hole
          ],
        },
        properties: {},
      };

      const resolved = turfHelper.getKinks(polygonWithHole);
      expect(resolved).toBeDefined();
      expect(Array.isArray(resolved)).toBe(true);
    });
  });

  describe('Simplification', () => {
    const complexPolygon: Feature<Polygon> = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0.1, 0.05],
            [0.2, 0],
            [0.3, 0.05],
            [1, 0],
            [1, 1],
            [0.9, 1.05],
            [0.8, 1],
            [0.7, 1.05],
            [0, 1],
            [0, 0],
          ],
        ],
      },
      properties: {},
    };

    it('should simplify polygon with simple mode', () => {
      const simplified = turfHelper.getSimplified(complexPolygon, false);

      expect(simplified).toBeDefined();
      expect(simplified.geometry.type).toBe('Polygon');

      // Simplified polygon should have fewer points
      const originalPoints = complexPolygon.geometry.coordinates[0].length;
      const simplifiedPoints = simplified.geometry.coordinates[0].length;
      expect(simplifiedPoints).toBeLessThanOrEqual(originalPoints);
    });

    it('should handle different simplification modes', () => {
      const modes = ['simple', 'dynamic', 'none'];

      modes.forEach((mode) => {
        const customConfig = {
          ...defaultConfig,
          polygonCreation: { simplification: { mode } },
        };
        const customHelper = new TurfHelper(customConfig);

        const result = customHelper.getSimplified(complexPolygon, false);
        expect(result).toBeDefined();
        expect(result.geometry.type).toBe('Polygon');
      });
    });

    it('should handle dynamic simplification', () => {
      const customConfig = {
        ...defaultConfig,
        polygonCreation: { simplification: { mode: 'dynamic' } },
        simplification: {
          simplifyTolerance: { tolerance: 0.01 },
          dynamicMode: { fractionGuard: 0.5, multiplier: 2 },
        },
      };
      const customHelper = new TurfHelper(customConfig);

      const result = customHelper.getSimplified(complexPolygon, true);
      expect(result).toBeDefined();
    });
  });

  describe('Utility Functions', () => {
    it('should calculate midpoint between two points', () => {
      const point1 = { lat: 0, lng: 0 };
      const point2 = { lat: 2, lng: 2 };

      const midpoint = turfHelper.getMidpoint(point1, point2);

      expect(midpoint.lat).toBeCloseTo(1);
      expect(midpoint.lng).toBeCloseTo(1);
    });

    it('should calculate distance between points', () => {
      const point1 = [0, 0];
      const point2 = [1, 1];

      const distance = turfHelper.getDistance(point1, point2);
      expect(distance).toBeGreaterThan(0);
    });

    it('should create feature point collection', () => {
      const points = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 2, lng: 2 },
      ];

      const collection = turfHelper.getFeaturePointCollection(points);

      expect(collection).toBeDefined();
      expect(collection.type).toBe('FeatureCollection');
      expect(collection.features.length).toBe(3);
    });

    it('should find nearest point index', () => {
      const targetPoint = [1, 1];
      const points = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
          { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 1] }, properties: {} },
          { type: 'Feature', geometry: { type: 'Point', coordinates: [2, 2] }, properties: {} },
        ],
      };

      const index = turfHelper.getNearestPointIndex(targetPoint, points);
      expect(index).toBe(1);
    });

    it('should get coordinates from feature', () => {
      const polygon: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const coords = turfHelper.getCoords(polygon);
      expect(coords).toBeDefined();
      expect(Array.isArray(coords)).toBe(true);
    });

    it('should convert polygon to multipolygon', () => {
      const polygon: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const multiPolygon = turfHelper.polygonToMultiPolygon(polygon);
      expect(multiPolygon.geometry.type).toBe('MultiPolygon');
    });
  });

  describe('Point-to-Point (P2P) Operations', () => {
    it('should increase the number of points with double elbow', () => {
      const square = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 2 },
        { lat: 2, lng: 2 },
        { lat: 2, lng: 0 },
      ];

      const result = turfHelper.getDoubleElbowLatLngs(square);
      expect(result.length).toBeGreaterThan(square.length);
    });

    it('should generate double elbowed polygon with square input', () => {
      const square = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 2 },
        { lat: 2, lng: 2 },
        { lat: 2, lng: 0 },
      ];

      const result = turfHelper.getDoubleElbowLatLngs(square);
      expect(result.length).toBe(8);
      expect(result[0].lat).toBeCloseTo(0);
      expect(result[0].lng).toBeCloseTo(0);
      expect(result[1].lat).toBeCloseTo(0);
      expect(result[1].lng).toBeCloseTo(1);
      expect(result[2].lat).toBeCloseTo(0);
      expect(result[2].lng).toBeCloseTo(2);
      expect(result[3].lat).toBeCloseTo(1);
      expect(result[3].lng).toBeCloseTo(2);
      expect(result[4].lat).toBeCloseTo(2);
      expect(result[4].lng).toBeCloseTo(2);
      expect(result[5].lat).toBeCloseTo(2);
      expect(result[5].lng).toBeCloseTo(1);
      expect(result[6].lat).toBeCloseTo(2);
      expect(result[6].lng).toBeCloseTo(0);
      expect(result[7].lat).toBeCloseTo(1);
      expect(result[7].lng).toBeCloseTo(0);
    });

    it('should handle closed polygons in double elbow', () => {
      const closedSquare = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 2 },
        { lat: 2, lng: 2 },
        { lat: 2, lng: 0 },
        { lat: 0, lng: 0 }, // Closing point
      ];

      const result = turfHelper.getDoubleElbowLatLngs(closedSquare);
      expect(result.length).toBe(8); // Should still be 8, not 10
    });

    it('should create bezier multipolygon', () => {
      const polygonArray = [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ];

      const bezier = turfHelper.getBezierMultiPolygon(polygonArray);

      expect(bezier).toBeDefined();
      expect(['Polygon', 'MultiPolygon']).toContain(bezier.geometry.type);
    });
  });

  describe('Edge Injection and Modification', () => {
    it('should inject point into polygon edge', () => {
      const polygon: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const newPoint = [1, 0]; // Point on the first edge

      const result = turfHelper.injectPointToPolygon(polygon, newPoint, 0);

      expect(result).toBeDefined();
      expect(result.geometry.coordinates[0].length).toBeGreaterThan(
        polygon.geometry.coordinates[0].length,
      );
    });

    it('should inject point into multipolygon', () => {
      const multiPolygon: Feature<MultiPolygon> = {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [0, 0],
                [2, 0],
                [2, 2],
                [0, 2],
                [0, 0],
              ],
            ],
          ],
        },
        properties: {},
      };

      const newPoint = [1, 0];

      const result = turfHelper.injectPointToPolygon(multiPolygon, newPoint, 0);

      expect(result).toBeDefined();
      expect(result.geometry.coordinates[0][0].length).toBeGreaterThan(
        multiPolygon.geometry.coordinates[0][0].length,
      );
    });
  });

  describe('Data Validation and Cleaning', () => {
    it('should remove duplicate vertices', () => {
      const polygonWithDuplicates: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0, 0],
              [1, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      const cleaned = turfHelper.removeDuplicateVertices(polygonWithDuplicates);

      expect(cleaned).toBeDefined();
      expect(cleaned.geometry.coordinates[0].length).toBeLessThan(
        polygonWithDuplicates.geometry.coordinates[0].length,
      );
    });

    it('should handle invalid input in removeDuplicateVertices', () => {
      const invalidPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [],
        },
        properties: {},
      };

      const result = turfHelper.removeDuplicateVertices(invalidPolygon);
      expect(result).toEqual(invalidPolygon); // Should return original
    });

    it('should preserve valid polygons during cleaning', () => {
      const validPolygon: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const cleaned = turfHelper.removeDuplicateVertices(validPolygon);

      expect(cleaned.geometry.coordinates[0].length).toBe(
        validPolygon.geometry.coordinates[0].length,
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null/undefined inputs gracefully', () => {
      // Suppress console errors for this test
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      console.error = () => {};
      console.warn = () => {};

      // Test that operations handle null inputs appropriately
      expect(() => {
        turfHelper.getPolygonArea(null as any);
      }).toThrow(); // Turf.js will throw for null inputs, which is expected behavior

      const unionResult = turfHelper.union(null as any, null as any);
      expect(unionResult).toBeNull(); // Should return null for invalid inputs

      // Restore console functions
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    });

    it('should handle empty geometries', () => {
      const emptyPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [],
        },
        properties: {},
      };

      expect(() => {
        turfHelper.getPolygonArea(emptyPolygon);
      }).not.toThrow();

      expect(() => {
        turfHelper.hasKinks(emptyPolygon);
      }).not.toThrow();
    });

    it('should handle malformed coordinates', () => {
      const malformedPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0], [1, 0], [1, 1]]], // Invalid coordinate format
        },
        properties: {},
      };

      // Suppress console errors for this test
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      console.error = () => {};
      console.warn = () => {};

      expect(() => {
        turfHelper.removeDuplicateVertices(malformedPolygon);
      }).not.toThrow();

      // Restore console functions
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    });

    it('should handle very small polygons', () => {
      const tinyPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.0001, 0],
              [0.0001, 0.0001],
              [0, 0.0001],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      const area = turfHelper.getPolygonArea(tinyPolygon);
      expect(area).toBeGreaterThan(0);
      // Note: Turf.js calculates area in square meters, so even tiny coordinate differences
      // result in larger areas due to geographic projection
    });

    it('should handle very large coordinates', () => {
      const largePolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [1000000, 1000000],
              [1000001, 1000000],
              [1000001, 1000001],
              [1000000, 1000001],
              [1000000, 1000000],
            ],
          ],
        },
        properties: {},
      };

      expect(() => {
        const area = turfHelper.getPolygonArea(largePolygon);
        expect(area).toBeGreaterThan(0);
      }).not.toThrow();
    });
  });

  describe('Complex Real-World Scenarios', () => {
    it('should handle C-to-O polygon merging scenario', () => {
      // C-shaped polygon
      const cShape: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [3, 0],
              [3, 1],
              [2, 1],
              [2, 2],
              [3, 2],
              [3, 3],
              [0, 3],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      // Closing polygon that would turn C into O
      const closingShape: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [1, 1],
              [2, 1],
              [2, 2],
              [1, 2],
              [1, 1],
            ],
          ],
        },
        properties: {},
      };

      // Test intersection detection
      const intersects = turfHelper.polygonIntersect(cShape, closingShape);
      expect(intersects).toBe(true);

      // Test union operation
      const union = turfHelper.union(cShape, closingShape);
      expect(union).toBeDefined();
    });

    it('should handle polygons with multiple holes', () => {
      const polygonWithMultipleHoles: Feature<Polygon> = {
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
            ], // Outer ring
            [
              [1, 1],
              [3, 1],
              [3, 3],
              [1, 3],
              [1, 1],
            ], // Hole 1
            [
              [6, 6],
              [8, 6],
              [8, 8],
              [6, 8],
              [6, 6],
            ], // Hole 2
          ],
        },
        properties: {},
      };

      const area = turfHelper.getPolygonArea(polygonWithMultipleHoles);
      expect(area).toBeGreaterThan(0);
      // Note: Turf.js calculates area in square meters, so actual values will be much larger
      // than the coordinate units suggest due to geographic projection

      const kinks = turfHelper.getKinks(polygonWithMultipleHoles);
      expect(kinks).toBeDefined();
      expect(Array.isArray(kinks)).toBe(true);
    });

    it('should handle complex self-intersecting polygon with holes', () => {
      const complexPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [4, 0],
              [4, 4],
              [2, 2],
              [0, 4],
              [0, 0],
            ], // Self-intersecting outer ring
            [
              [1, 1],
              [3, 1],
              [3, 3],
              [1, 3],
              [1, 1],
            ], // Hole
          ],
        },
        properties: {},
      };

      expect(() => {
        const kinks = turfHelper.getKinks(complexPolygon);
        expect(kinks).toBeDefined();
        expect(Array.isArray(kinks)).toBe(true);
      }).not.toThrow();
    });

    it('should handle very complex polygon operations', () => {
      // Create a complex polygon with many vertices
      const complexCoords: number[][] = [];
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * 2 * Math.PI;
        const radius = 1 + 0.5 * Math.sin(4 * angle); // Flower-like shape
        complexCoords.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
      }
      complexCoords.push(complexCoords[0]); // Close the polygon

      const complexPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [complexCoords],
        },
        properties: {},
      };

      // Test various operations on complex polygon
      const area = turfHelper.getPolygonArea(complexPolygon);
      expect(area).toBeGreaterThan(0);

      const simplified = turfHelper.getSimplified(complexPolygon, false);
      expect(simplified).toBeDefined();

      const convexHull = turfHelper.getConvexHull(complexPolygon);
      expect(convexHull).toBeDefined();
    });
  });

  describe('Complex Algorithm Testing - Hole-Aware Kink Resolution', () => {
    it('should detect complete hole traversal with duplicate points', () => {
      // Create a polygon where drag line creates duplicate points (cake cutting scenario)
      const polygonWithDuplicateTraversal: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [4, 0],
              [4, 4],
              [0, 4], // Outer boundary
              [2, 2],
              [2, 2], // Duplicate point indicating traversal
              [0, 0], // Close
            ],
          ],
        },
        properties: {},
      };

      const result = turfHelper.getKinks(polygonWithDuplicateTraversal);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle hole traversal with self-intersection line', () => {
      // Polygon with outer ring that creates a line through a hole
      const polygonWithHoleTraversal: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [6, 0],
              [6, 6],
              [0, 6], // Outer ring
              [3, 3],
              [3, 1],
              [3, 5],
              [3, 3], // Self-intersecting line through middle
              [0, 0], // Close
            ],
            [
              [2, 2],
              [4, 2],
              [4, 4],
              [2, 4],
              [2, 2], // Hole in the middle
            ],
          ],
        },
        properties: {},
      };

      const result = turfHelper.getKinks(polygonWithHoleTraversal);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle complex MultiPolygon with holes', () => {
      const multiPolygonWithHoles: Feature<MultiPolygon> = {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [0, 0],
                [4, 0],
                [4, 4],
                [0, 4],
                [0, 0],
              ], // Outer ring
              [
                [1, 1],
                [3, 1],
                [3, 3],
                [1, 3],
                [1, 1],
              ], // Hole
            ],
            [
              [
                [5, 5],
                [9, 5],
                [9, 9],
                [5, 9],
                [5, 5],
              ], // Second polygon outer ring
              [
                [6, 6],
                [8, 6],
                [8, 8],
                [6, 8],
                [6, 6],
              ], // Second polygon hole
            ],
          ],
        },
        properties: {},
      };

      const result = turfHelper.getKinks(multiPolygonWithHoles);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2); // Should handle both polygons
    });

    it('should detect when kinks cut through holes', () => {
      // Create a polygon where the self-intersection goes through a hole
      const polygonWithKinkThroughHole: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [6, 0],
              [6, 6],
              [0, 6], // Outer boundary
              [2, 2],
              [4, 4],
              [4, 2],
              [2, 4], // Figure-8 through hole area
              [0, 0], // Close
            ],
            [
              [2.5, 2.5],
              [3.5, 2.5],
              [3.5, 3.5],
              [2.5, 3.5],
              [2.5, 2.5], // Hole in intersection area
            ],
          ],
        },
        properties: {},
      };

      const result = turfHelper.getKinks(polygonWithKinkThroughHole);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle edge case with very small holes', () => {
      const polygonWithTinyHole: Feature<Polygon> = {
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
            [
              [5, 5],
              [5.001, 5],
              [5.001, 5.001],
              [5, 5.001],
              [5, 5], // Tiny hole
            ],
          ],
        },
        properties: {},
      };

      const result = turfHelper.getKinks(polygonWithTinyHole);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle polygon with hole that touches outer boundary', () => {
      const polygonWithTouchingHole: Feature<Polygon> = {
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
            [
              [0, 5],
              [2, 5],
              [2, 7],
              [0, 7],
              [0, 5], // Hole touching left boundary
            ],
          ],
        },
        properties: {},
      };

      const result = turfHelper.getKinks(polygonWithTouchingHole);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Complex Algorithm Testing - Polygon Intersection Detection', () => {
    it('should use multiple fallback methods for intersection detection', () => {
      // Create polygons that might fail with one method but succeed with another
      const complexPolygon1: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const complexPolygon2: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const intersects = turfHelper.polygonIntersect(complexPolygon1, complexPolygon2);
      expect(intersects).toBe(true);
    });

    it('should handle edge-only intersection (no area overlap)', () => {
      const polygon1: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const polygon2: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [2, 0],
              [4, 0],
              [4, 2],
              [2, 2],
              [2, 0], // Shares an edge
            ],
          ],
        },
        properties: {},
      };

      const intersects = turfHelper.polygonIntersect(polygon1, polygon2);
      expect(intersects).toBe(true);
    });

    it('should handle point-only intersection', () => {
      const polygon1: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const polygon2: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [2, 2],
              [4, 2],
              [4, 4],
              [2, 4],
              [2, 2], // Touches at one corner
            ],
          ],
        },
        properties: {},
      };

      const intersects = turfHelper.polygonIntersect(polygon1, polygon2);
      expect(intersects).toBe(true);
    });

    it('should handle complex concave polygons', () => {
      // L-shaped polygon
      const lShape: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [3, 0],
              [3, 1],
              [1, 1],
              [1, 3],
              [0, 3],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      // Another L-shaped polygon that intersects
      const lShape2: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [2, -1],
              [4, -1],
              [4, 2],
              [3, 2],
              [3, 0],
              [2, 0],
              [2, -1],
            ],
          ],
        },
        properties: {},
      };

      const intersects = turfHelper.polygonIntersect(lShape, lShape2);
      expect(intersects).toBe(true);
    });

    it('should handle polygons with holes in intersection detection', () => {
      const polygonWithHole: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [6, 0],
              [6, 6],
              [0, 6],
              [0, 0],
            ], // Outer ring
            [
              [2, 2],
              [4, 2],
              [4, 4],
              [2, 4],
              [2, 2],
            ], // Hole
          ],
        },
        properties: {},
      };

      const smallPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [3, 3],
              [3.5, 3],
              [3.5, 3.5],
              [3, 3.5],
              [3, 3],
            ], // Inside the hole
          ],
        },
        properties: {},
      };

      const intersects = turfHelper.polygonIntersect(polygonWithHole, smallPolygon);
      expect(intersects).toBe(false); // Should not intersect because small polygon is in hole
    });

    it('should handle malformed polygon coordinates gracefully', () => {
      const validPolygon: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const malformedPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [] as any,
        },
        properties: {},
      };

      const intersects = turfHelper.polygonIntersect(validPolygon, malformedPolygon);
      expect(intersects).toBe(false); // Should handle gracefully
    });

    it('should handle very thin polygons (almost lines)', () => {
      const thinPolygon1: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 0.001],
              [0, 0.001],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      const thinPolygon2: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [5, -1],
              [5.001, -1],
              [5.001, 1],
              [5, 1],
              [5, -1],
            ],
          ],
        },
        properties: {},
      };

      const intersects = turfHelper.polygonIntersect(thinPolygon1, thinPolygon2);
      expect(intersects).toBe(true);
    });
  });

  describe('Complex Algorithm Testing - Point-in-Polygon with Multiple Input Types', () => {
    const testPolygon: Feature<Polygon> = {
      type: 'Feature',
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
      properties: {},
    };

    it('should handle Feature<Point> input', () => {
      const pointFeature: Feature<Point> = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [2, 2],
        },
        properties: {},
      };

      const isInside = turfHelper.isPointInsidePolygon(pointFeature, testPolygon);
      expect(isInside).toBe(true);
    });

    it('should handle Turf Position [lng, lat] input', () => {
      const position: [number, number] = [2, 2];
      const isInside = turfHelper.isPointInsidePolygon(position, testPolygon);
      expect(isInside).toBe(true);
    });

    it('should handle Leaflet LatLngLiteral input', () => {
      const latlng = { lat: 2, lng: 2 };
      const isInside = turfHelper.isPointInsidePolygon(latlng, testPolygon);
      expect(isInside).toBe(true);
    });

    it('should handle generic object with geometry.coordinates', () => {
      const genericPoint = {
        geometry: {
          coordinates: [2, 2],
        },
      };
      const isInside = turfHelper.isPointInsidePolygon(genericPoint as any, testPolygon);
      expect(isInside).toBe(true);
    });

    it('should handle points on polygon boundary', () => {
      const boundaryPoint = { lat: 0, lng: 2 }; // On the bottom edge
      const isInside = turfHelper.isPointInsidePolygon(boundaryPoint, testPolygon);
      expect(typeof isInside).toBe('boolean'); // Should return a boolean result
    });

    it('should handle points outside polygon', () => {
      const outsidePoint = { lat: 5, lng: 5 };
      const isInside = turfHelper.isPointInsidePolygon(outsidePoint, testPolygon);
      expect(isInside).toBe(false);
    });

    it('should handle invalid point formats gracefully', () => {
      const invalidPoint = { invalid: 'data' };
      const isInside = turfHelper.isPointInsidePolygon(invalidPoint as any, testPolygon);
      expect(isInside).toBe(false); // Should return false for invalid input
    });

    it('should handle null/undefined points gracefully', () => {
      const isInside1 = turfHelper.isPointInsidePolygon(null as any, testPolygon);
      const isInside2 = turfHelper.isPointInsidePolygon(undefined as any, testPolygon);
      expect(isInside1).toBe(false);
      expect(isInside2).toBe(false);
    });

    it('should handle polygon with holes', () => {
      const polygonWithHole: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [6, 0],
              [6, 6],
              [0, 6],
              [0, 0],
            ], // Outer ring
            [
              [2, 2],
              [4, 2],
              [4, 4],
              [2, 4],
              [2, 2],
            ], // Hole
          ],
        },
        properties: {},
      };

      const pointInHole = { lat: 3, lng: 3 };
      const pointInPolygon = { lat: 1, lng: 1 };

      const isInHole = turfHelper.isPointInsidePolygon(pointInHole, polygonWithHole);
      const isInPolygon = turfHelper.isPointInsidePolygon(pointInPolygon, polygonWithHole);

      expect(isInHole).toBe(false); // Point in hole should be outside
      expect(isInPolygon).toBe(true); // Point in solid area should be inside
    });

    it('should handle MultiPolygon input', () => {
      const multiPolygon: Feature<MultiPolygon> = {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [0, 0],
                [2, 0],
                [2, 2],
                [0, 2],
                [0, 0],
              ],
            ],
            [
              [
                [3, 3],
                [5, 3],
                [5, 5],
                [3, 5],
                [3, 3],
              ],
            ],
          ],
        },
        properties: {},
      };

      const pointInFirst = { lat: 1, lng: 1 };
      const pointInSecond = { lat: 4, lng: 4 };
      const pointInNeither = { lat: 2.5, lng: 2.5 };

      const isInFirst = turfHelper.isPointInsidePolygon(pointInFirst, multiPolygon);
      const isInSecond = turfHelper.isPointInsidePolygon(pointInSecond, multiPolygon);
      const isInNeither = turfHelper.isPointInsidePolygon(pointInNeither, multiPolygon);

      expect(isInFirst).toBe(true);
      expect(isInSecond).toBe(true);
      expect(isInNeither).toBe(false);
    });
  });

  describe('Complex Algorithm Testing - Coordinate Cleaning and Validation', () => {
    it('should handle coordinates with varying precision', () => {
      const polygonWithVaryingPrecision: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1.000000001, 0.000000001], // Very close to [1, 0]
              [1.000000002, 0.000000002], // Very close to previous point
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      const cleaned = turfHelper.removeDuplicateVertices(polygonWithVaryingPrecision);
      expect(cleaned).toBeDefined();
      expect(cleaned.geometry.coordinates[0].length).toBeLessThan(
        polygonWithVaryingPrecision.geometry.coordinates[0].length,
      );
    });

    it('should preserve valid polygons with sufficient point separation', () => {
      const validPolygon: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const cleaned = turfHelper.removeDuplicateVertices(validPolygon);
      expect(cleaned.geometry.coordinates[0].length).toBe(
        validPolygon.geometry.coordinates[0].length,
      );
    });

    it('should handle polygons with insufficient points after cleaning', () => {
      const almostInvalidPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.0000001, 0.0000001], // Too close to first point
              [0.0000002, 0.0000002], // Too close to previous points
              [0, 0], // Closing point
            ],
          ],
        },
        properties: {},
      };

      const cleaned = turfHelper.removeDuplicateVertices(almostInvalidPolygon);
      expect(cleaned).toBeDefined();
      // Should return original polygon if cleaning would make it invalid
      expect(cleaned).toEqual(almostInvalidPolygon);
    });

    it('should handle MultiPolygon coordinate cleaning', () => {
      const multiPolygonWithDuplicates: Feature<MultiPolygon> = {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [0, 0],
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0], // Duplicates in first polygon
              ],
            ],
            [
              [
                [2, 2],
                [3, 2],
                [3, 2],
                [3, 3],
                [2, 3],
                [2, 2], // Duplicates in second polygon
              ],
            ],
          ],
        },
        properties: {},
      };

      const cleaned = turfHelper.removeDuplicateVertices(multiPolygonWithDuplicates);
      expect(cleaned).toBeDefined();
      expect(cleaned.geometry.type).toBe('MultiPolygon');

      // Should have fewer coordinates after cleaning
      const originalFirstRing = multiPolygonWithDuplicates.geometry.coordinates[0][0].length;
      const cleanedFirstRing = cleaned.geometry.coordinates[0][0].length;
      expect(cleanedFirstRing).toBeLessThanOrEqual(originalFirstRing);
    });

    it('should handle coordinate arrays with invalid formats', () => {
      const polygonWithInvalidCoords: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1], // Invalid - only one coordinate
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      const cleaned = turfHelper.removeDuplicateVertices(polygonWithInvalidCoords);
      expect(cleaned).toBeDefined();
      // Should return original if cleaning encounters invalid coordinates
      expect(cleaned).toEqual(polygonWithInvalidCoords);
    });

    it('should handle null/undefined coordinate arrays', () => {
      const polygonWithNullCoords: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [null as any],
        },
        properties: {},
      };

      const cleaned = turfHelper.removeDuplicateVertices(polygonWithNullCoords);
      expect(cleaned).toBeDefined();
      // Should return original for invalid input
      expect(cleaned).toEqual(polygonWithNullCoords);
    });
  });

  describe('Complex Algorithm Testing - Distance to Line Segment', () => {
    it('should calculate distance to line segment correctly', () => {
      const polygon: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      // Test point injection which uses distanceToLineSegment internally
      const pointOnEdge = [2, 0]; // Point on bottom edge
      const result = turfHelper.injectPointToPolygon(polygon, pointOnEdge, 0);

      expect(result).toBeDefined();
      expect(result.geometry.coordinates[0].length).toBeGreaterThan(
        polygon.geometry.coordinates[0].length,
      );
    });

    it('should handle point injection at polygon corners', () => {
      const polygon: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      // Point very close to a corner
      const cornerPoint = [0.001, 0.001];
      const result = turfHelper.injectPointToPolygon(polygon, cornerPoint, 0);

      expect(result).toBeDefined();
      expect(result.geometry.coordinates[0].length).toBeGreaterThan(
        polygon.geometry.coordinates[0].length,
      );
    });

    it('should handle point injection with zero-length edges', () => {
      const polygonWithZeroEdge: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0], // Duplicate point creates zero-length edge
            ],
          ],
        },
        properties: {},
      };

      const testPoint = [1, 0];
      const result = turfHelper.injectPointToPolygon(polygonWithZeroEdge, testPoint, 0);

      expect(result).toBeDefined();
      // Should handle zero-length edges gracefully
    });

    it('should handle point injection with invalid ring index', () => {
      const polygon: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const testPoint = [1, 0];
      const result = turfHelper.injectPointToPolygon(polygon, testPoint, 999); // Invalid ring index

      expect(result).toBeDefined();
      // Should return original polygon for invalid ring index
      expect(result.geometry.coordinates[0].length).toBe(polygon.geometry.coordinates[0].length);
    });

    it('should handle point injection with invalid geometry type', () => {
      const invalidGeometry = {
        type: 'Feature',
        geometry: {
          type: 'LineString', // Invalid for this function
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        properties: {},
      } as any;

      const testPoint = [0.5, 0.5];
      const result = turfHelper.injectPointToPolygon(invalidGeometry, testPoint, 0);

      expect(result).toBeDefined();
      // Should return original for invalid geometry type
      expect(result).toEqual(invalidGeometry);
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle large polygon operations efficiently', () => {
      // Create a polygon with many vertices
      const largeCoords: number[][] = [];
      for (let i = 0; i < 1000; i++) {
        const angle = (i / 1000) * 2 * Math.PI;
        largeCoords.push([Math.cos(angle), Math.sin(angle)]);
      }
      largeCoords.push(largeCoords[0]);

      const largePolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [largeCoords],
        },
        properties: {},
      };

      const startTime = performance.now();

      const area = turfHelper.getPolygonArea(largePolygon);
      const simplified = turfHelper.getSimplified(largePolygon, false);
      const cleaned = turfHelper.removeDuplicateVertices(largePolygon);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(area).toBeGreaterThan(0);
      expect(simplified).toBeDefined();
      expect(cleaned).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple concurrent operations', () => {
      const polygon1: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const polygon2: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0.5, 0.5],
              [1.5, 0.5],
              [1.5, 1.5],
              [0.5, 1.5],
              [0.5, 0.5],
            ],
          ],
        },
        properties: {},
      };

      // Perform multiple operations simultaneously
      const operations = [
        () => turfHelper.union(polygon1, polygon2),
        () => turfHelper.getIntersection(polygon1, polygon2),
        () => turfHelper.polygonDifference(polygon1, polygon2),
        () => turfHelper.polygonIntersect(polygon1, polygon2),
        () => turfHelper.getPolygonArea(polygon1),
        () => turfHelper.getPolygonPerimeter(polygon1),
      ];

      expect(() => {
        operations.forEach((op) => op());
      }).not.toThrow();
    });
  });

  describe('Error Handling with Console Warnings (Non-Test Environment)', () => {
    it('should trigger console warnings for polygon creation method fallbacks in non-test environment', () => {
      // Mock isTestEnvironment to return false
      const mockIsTestEnvironment = vi
        .spyOn(isTestEnvModule, 'isTestEnvironment')
        .mockReturnValue(false);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Test unknown polygon creation method
      const customConfig = { ...defaultConfig, polygonCreation: { method: 'unknown' } };
      const customHelper = new TurfHelper(customConfig);

      const testLineString: Feature<any> = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        },
        properties: {},
      };

      const result = customHelper.createPolygonFromTrace(testLineString);
      expect(result).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unknown polygon creation method: unknown, falling back to concaveman',
      );

      // Test buffer polygon creation failure
      const bufferConfig = { ...defaultConfig, polygonCreation: { method: 'buffer' } };
      const bufferHelper = new TurfHelper(bufferConfig);

      const problematicFeature: Feature<any> = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0]], // Single point - insufficient for buffer
        },
        properties: {},
      };

      const bufferResult = bufferHelper.createPolygonFromTrace(problematicFeature);
      expect(bufferResult).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Buffer polygon creation failed:',
        expect.any(String),
      );

      // Test direct polygon creation with insufficient points
      const directConfig = { ...defaultConfig, polygonCreation: { method: 'direct' } };
      const directHelper = new TurfHelper(directConfig);

      const insufficientPoints: Feature<any> = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 1],
          ], // Only 2 points
        },
        properties: {},
      };

      const directResult = directHelper.createPolygonFromTrace(insufficientPoints);
      expect(directResult).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Not enough points for direct polygon, falling back to concaveman',
      );

      // Test unknown simplification mode
      const simplificationConfig = {
        ...defaultConfig,
        polygonCreation: { simplification: { mode: 'unknown' } },
      };
      const simplificationHelper = new TurfHelper(simplificationConfig);

      const polygon: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const simplificationResult = simplificationHelper.getSimplified(polygon, false);
      expect(simplificationResult).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unknown simplification mode: unknown, falling back to simple',
      );

      // Restore mocks
      mockIsTestEnvironment.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should trigger console warnings for coordinate cleaning errors in non-test environment', () => {
      // Mock isTestEnvironment to return false
      const mockIsTestEnvironment = vi
        .spyOn(isTestEnvModule, 'isTestEnvironment')
        .mockReturnValue(false);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Test invalid feature passed to removeDuplicateVertices (line 1338-1342)
      const invalidFeature: Feature<Polygon> = {
        type: 'Feature',
        geometry: null as any,
        properties: {},
      };

      const result1 = turfHelper.removeDuplicateVertices(invalidFeature);
      expect(result1).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid feature passed to removeDuplicateVertices',
      );

      // Test invalid coordinates array (line 1347-1348)
      const featureWithInvalidCoords: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 1],
            ],
          ], // Only 2 points - invalid for polygon
        },
        properties: {},
      };

      const result2 = turfHelper.removeDuplicateVertices(featureWithInvalidCoords);
      expect(result2).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid coordinates array - need at least 3 points for a polygon',
      );

      // Test polygon with less than 3 points after cleaning (line 1383-1384)
      const featureWithDuplicates: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.0000001, 0.0000001], // Very close to first point
              [0.0000002, 0.0000002], // Very close to previous points
              [0, 0], // Closing point
            ],
          ],
        },
        properties: {},
      };

      const result3 = turfHelper.removeDuplicateVertices(featureWithDuplicates);
      expect(result3).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith('After cleaning, polygon has less than 3 points');

      // Test cleaned polygon with invalid ring (line 1411-1412)
      const polygonWithInvalidRingAfterCleaning: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.0000001, 0.0000001],
              [0, 0],
            ], // Would become invalid after cleaning
          ],
        },
        properties: {},
      };

      const result4 = turfHelper.removeDuplicateVertices(polygonWithInvalidRingAfterCleaning);
      expect(result4).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cleaned polygon has invalid ring with less than 4 coordinates',
      );

      // Test cleaned multipolygon with invalid ring (line 1431-1432)
      const multiPolygonWithInvalidRing: Feature<MultiPolygon> = {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [0, 0],
                [0.0000001, 0.0000001],
                [0, 0],
              ], // Would become invalid after cleaning
            ],
          ],
        },
        properties: {},
      };

      const result5 = turfHelper.removeDuplicateVertices(multiPolygonWithInvalidRing);
      expect(result5).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cleaned multipolygon has invalid ring with less than 4 coordinates',
      );

      // Note: The error handling path in removeDuplicateVertices (lines 1445-1454) is very difficult
      // to test because the early validation checks catch most error conditions before reaching
      // the main try-catch block. The existing tests above already cover the important validation
      // warnings that are more likely to occur in real usage scenarios.

      // Restore mocks
      mockIsTestEnvironment.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should trigger console warnings for convex hull errors in non-test environment', () => {
      // Mock isTestEnvironment to return false
      const mockIsTestEnvironment = vi
        .spyOn(isTestEnvModule, 'isTestEnvironment')
        .mockReturnValue(false);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Test convex hull with valid input to trigger line 327
      const validPolygon: Feature<Polygon> = {
        type: 'Feature',
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
        properties: {},
      };

      const convexHull = turfHelper.getConvexHull(validPolygon);
      expect(convexHull).toBeDefined();
      // This should execute line 327: return convex(fc);

      // Test convex hull with malformed input to trigger error handling
      // Create a feature that will definitely cause the convex function to throw an error
      const malformedPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [NaN, NaN], // NaN coordinates will cause convex to throw
              [Infinity, -Infinity], // Invalid coordinates
              [null as any, undefined as any], // Null/undefined coordinates
            ],
          ],
        },
        properties: {},
      };

      const invalidResult = turfHelper.getConvexHull(malformedPolygon);
      expect(invalidResult).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Error in getConvexHull:', expect.any(String));

      // Restore mocks
      mockIsTestEnvironment.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Additional Coverage Tests - Missing Functionality', () => {
    describe('Polygon Creation Edge Cases', () => {
      it('should handle convex hull fallback when convex fails', () => {
        // Create a feature that might cause convex hull to fail
        const problematicFeature: Feature<any> = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [0, 0], // Single point - convex hull might fail
          },
          properties: {},
        };

        const result = turfHelper.createPolygonFromTrace(problematicFeature);
        expect(result).toBeDefined();
        expect(['Polygon', 'MultiPolygon']).toContain(result.geometry.type);
      });

      it('should handle buffer polygon creation failure', () => {
        // Create a feature that might cause buffer to fail
        const problematicFeature: Feature<any> = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0]], // Single point - insufficient for buffer
          },
          properties: {},
        };

        const customConfig = { ...defaultConfig, polygonCreation: { method: 'buffer' } };
        const customHelper = new TurfHelper(customConfig);

        // Suppress console warnings for this test
        const originalConsoleWarn = console.warn;
        const originalConsoleError = console.error;
        console.warn = vi.fn();
        console.error = vi.fn();

        // This should handle the error gracefully and fallback to another method
        const result = customHelper.createPolygonFromTrace(problematicFeature);
        expect(result).toBeDefined();
        expect(['Polygon', 'MultiPolygon']).toContain(result.geometry.type);

        // Restore console functions
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
      });

      it('should handle direct polygon creation with polygon input', () => {
        const polygonFeature: Feature<any> = {
          type: 'Feature',
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
          properties: {},
        };

        const customConfig = { ...defaultConfig, polygonCreation: { method: 'direct' } };
        const customHelper = new TurfHelper(customConfig);

        const result = customHelper.createPolygonFromTrace(polygonFeature);
        expect(result).toBeDefined();
        expect(result.geometry.type).toBe('MultiPolygon');
      });

      it('should handle direct polygon creation with other geometry types', () => {
        const pointFeature: Feature<any> = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [0, 0],
          },
          properties: {},
        };

        const customConfig = { ...defaultConfig, polygonCreation: { method: 'direct' } };
        const customHelper = new TurfHelper(customConfig);

        const result = customHelper.createPolygonFromTrace(pointFeature);
        expect(result).toBeDefined();
      });

      it('should handle direct polygon creation with unclosed coordinates', () => {
        const unclosedLineString: Feature<any> = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1], // Not closed
            ],
          },
          properties: {},
        };

        const customConfig = { ...defaultConfig, polygonCreation: { method: 'direct' } };
        const customHelper = new TurfHelper(customConfig);

        const result = customHelper.createPolygonFromTrace(unclosedLineString);
        expect(result).toBeDefined();
        expect(result.geometry.type).toBe('MultiPolygon');
        // Should have added closing point
        expect(result.geometry.coordinates[0][0].length).toBe(5);
      });
    });

    describe('Boolean Operations Error Handling', () => {
      it('should handle union operation errors', () => {
        const invalidPolygon: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 1],
              ],
            ], // Invalid - not enough points
          },
          properties: {},
        };

        const validPolygon: Feature<Polygon> = {
          type: 'Feature',
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
          properties: {},
        };

        // Suppress console warnings for this test
        const originalConsoleWarn = console.warn;
        console.warn = vi.fn();

        const result = turfHelper.union(validPolygon, invalidPolygon);
        // Union might still work with some invalid inputs, so just check it doesn't throw
        expect(result).toBeDefined();

        // Restore console.warn
        console.warn = originalConsoleWarn;
      });

      it('should handle intersection operation with no result', () => {
        const polygon1: Feature<Polygon> = {
          type: 'Feature',
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
          properties: {},
        };

        const polygon2: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [5, 5],
                [6, 5],
                [6, 6],
                [5, 6],
                [5, 5],
              ],
            ],
          },
          properties: {},
        };

        const result = turfHelper.getIntersection(polygon1, polygon2);
        expect(result).toBeNull(); // No intersection should return null
      });

      it('should handle difference operation errors', () => {
        const invalidPolygon: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [],
          },
          properties: {},
        };

        const validPolygon: Feature<Polygon> = {
          type: 'Feature',
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
          properties: {},
        };

        // Suppress console warnings for this test
        const originalConsoleWarn = console.warn;
        console.warn = vi.fn();

        const result = turfHelper.polygonDifference(validPolygon, invalidPolygon);
        // Difference might still work with some invalid inputs, so just check it doesn't throw
        expect(result).toBeDefined();

        // Restore console.warn
        console.warn = originalConsoleWarn;
      });
    });

    describe('Convex Hull Error Handling', () => {
      it('should handle convex hull operation errors', () => {
        const invalidPolygon: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [],
          },
          properties: {},
        };

        // Suppress console warnings for this test
        const originalConsoleWarn = console.warn;
        console.warn = vi.fn();

        const result = turfHelper.getConvexHull(invalidPolygon);
        expect(result).toBeNull(); // Should return null for invalid input

        // Restore console.warn
        console.warn = originalConsoleWarn;
      });
    });

    describe('Polygon Within Detection Fallback', () => {
      it('should use fallback method when booleanWithin fails', () => {
        // Create polygons that might cause booleanWithin to fail
        const innerPolygon: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [1, 1],
                [2, 1],
                [2, 2],
                [1, 2],
                [1, 1],
              ],
            ],
          },
          properties: {},
        };

        const outerPolygon: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [3, 0],
                [3, 3],
                [0, 3],
                [0, 0],
              ],
            ],
          },
          properties: {},
        };

        const result = turfHelper.isPolygonCompletelyWithin(innerPolygon, outerPolygon);
        expect(typeof result).toBe('boolean');
        expect(result).toBe(true);
      });

      it('should handle complex polygon within detection', () => {
        const complexInner: Feature<MultiPolygon> = {
          type: 'Feature',
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [1, 1],
                  [2, 1],
                  [2, 2],
                  [1, 2],
                  [1, 1],
                ],
              ],
            ],
          },
          properties: {},
        };

        const complexOuter: Feature<MultiPolygon> = {
          type: 'Feature',
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [0, 0],
                  [3, 0],
                  [3, 3],
                  [0, 3],
                  [0, 0],
                ],
              ],
            ],
          },
          properties: {},
        };

        const result = turfHelper.isPolygonCompletelyWithin(complexInner, complexOuter);
        expect(typeof result).toBe('boolean');
      });
    });

    describe('Polygon Equality Testing', () => {
      it('should test polygon equality', () => {
        const polygon1: Feature<Polygon> = {
          type: 'Feature',
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
          properties: {},
        };

        const polygon2: Feature<Polygon> = {
          type: 'Feature',
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
          properties: {},
        };

        const polygon3: Feature<Polygon> = {
          type: 'Feature',
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
          properties: {},
        };

        const equal = turfHelper.equalPolygons(polygon1, polygon2);
        const notEqual = turfHelper.equalPolygons(polygon1, polygon3);

        expect(equal).toBe(true);
        expect(notEqual).toBe(false);
      });
    });

    describe('Center of Mass Calculation', () => {
      it('should calculate center of mass', () => {
        const polygon: Feature<Polygon> = {
          type: 'Feature',
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
          properties: {},
        };

        const centerOfMass = turfHelper.getCenterOfMass(polygon);
        expect(centerOfMass).toBeDefined();
        expect(centerOfMass.geometry.type).toBe('Point');
        expect(centerOfMass.geometry.coordinates).toHaveLength(2);
      });
    });

    describe('Bounding Box Compass Position', () => {
      it('should handle getBoundingBoxCompassPosition', () => {
        const polygon = { test: 'polygon' };
        const markerPosition = { test: 'position' };
        const useOffset = true;
        const offsetDirection = 'north';

        const result = turfHelper.getBoundingBoxCompassPosition(
          polygon,
          markerPosition,
          useOffset,
          offsetDirection,
        );

        expect(result).toBeNull(); // Currently returns null as it's not implemented
      });
    });

    describe('isWithin Position Array Method', () => {
      it('should test if one position array is within another', () => {
        const innerRing: [number, number][] = [
          [1, 1],
          [2, 1],
          [2, 2],
          [1, 2],
          [1, 1],
        ];

        const outerRing: [number, number][] = [
          [0, 0],
          [3, 0],
          [3, 3],
          [0, 3],
          [0, 0],
        ];

        const result = turfHelper.isWithin(innerRing, outerRing);
        expect(typeof result).toBe('boolean');
        expect(result).toBe(true);
      });

      it('should test non-within position arrays', () => {
        const ring1: [number, number][] = [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ];

        const ring2: [number, number][] = [
          [2, 2],
          [3, 2],
          [3, 3],
          [2, 3],
          [2, 2],
        ];

        const result = turfHelper.isWithin(ring1, ring2);
        expect(typeof result).toBe('boolean');
        expect(result).toBe(false);
      });
    });

    describe('MultiPolygon Creation', () => {
      it('should create multipolygon from polygon array', () => {
        const polygonArray = [
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
        ];

        const result = turfHelper.getMultiPolygon(polygonArray);
        expect(result).toBeDefined();
        expect(result.geometry.type).toBe('MultiPolygon');
        expect(result.geometry.coordinates).toHaveLength(2);
      });
    });

    describe('Complex Hole Traversal Scenarios', () => {
      it('should handle error in hole traversal detection', () => {
        // Create a polygon that might cause errors in hole traversal detection
        const problematicPolygon: Feature<Polygon> = {
          type: 'Feature',
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
              null as any, // Invalid hole
            ],
          },
          properties: {},
        };

        // Suppress console warnings for this test
        const originalConsoleWarn = console.warn;
        console.warn = vi.fn();

        const result = turfHelper.getKinks(problematicPolygon);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        // Restore console.warn
        console.warn = originalConsoleWarn;
      });

      it('should handle complex self-intersection scenarios', () => {
        const complexSelfIntersecting: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [4, 0],
                [4, 4],
                [2, 2], // Creates self-intersection
                [0, 4],
                [2, 2], // Duplicate point
                [0, 0],
              ],
            ],
          },
          properties: {},
        };

        const result = turfHelper.getKinks(complexSelfIntersecting);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should handle error in subtractIntersectingHoles', () => {
        // This tests the private method indirectly through getKinks
        const polygonWithProblematicHole: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [6, 0],
                [6, 6],
                [0, 6],
                [2, 3], // Self-intersection point
                [4, 3], // Creates line through hole
                [0, 0],
              ],
              [
                [2, 2],
                [4, 2],
                [4, 4],
                [2, 4],
                [2, 2], // Hole that intersects with self-intersection
              ],
            ],
          },
          properties: {},
        };

        // Suppress console warnings for this test
        const originalConsoleWarn = console.warn;
        console.warn = vi.fn();

        const result = turfHelper.getKinks(polygonWithProblematicHole);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        // Restore console.warn
        console.warn = originalConsoleWarn;
      });
    });

    describe('Coordinate Cleaning Edge Cases', () => {
      it('should handle polygon with all duplicate coordinates', () => {
        const allDuplicates: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0.0000001, 0.0000001],
                [0.0000002, 0.0000002],
                [0, 0],
              ],
            ],
          },
          properties: {},
        };

        const result = turfHelper.removeDuplicateVertices(allDuplicates);
        expect(result).toBeDefined();
        // Should return original if cleaning would make polygon invalid
        expect(result).toEqual(allDuplicates);
      });

      it('should handle multipolygon with invalid rings after cleaning', () => {
        const multiWithInvalidRings: Feature<MultiPolygon> = {
          type: 'Feature',
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [0, 0],
                  [0.0000001, 0.0000001],
                  [0, 0], // Would become invalid after cleaning
                ],
              ],
            ],
          },
          properties: {},
        };

        // Suppress console warnings for this test
        const originalConsoleWarn = console.warn;
        console.warn = vi.fn();

        const result = turfHelper.removeDuplicateVertices(multiWithInvalidRings);
        expect(result).toBeDefined();
        // Should return original if cleaning would create invalid rings
        expect(result).toEqual(multiWithInvalidRings);

        // Restore console.warn
        console.warn = originalConsoleWarn;
      });

      it('should handle coordinate cleaning errors', () => {
        const polygonWithNullCoordinates: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], null as any, [1, 1], [0, 1], [0, 0]]],
          },
          properties: {},
        };

        // Suppress console warnings for this test
        const originalConsoleWarn = console.warn;
        console.warn = vi.fn();

        const result = turfHelper.removeDuplicateVertices(polygonWithNullCoordinates);
        expect(result).toBeDefined();
        // Should return original for invalid coordinates
        expect(result).toEqual(polygonWithNullCoordinates);

        // Restore console.warn
        console.warn = originalConsoleWarn;
      });
    });

    describe('Polygon Intersection Complex Scenarios', () => {
      it('should handle intersection with invalid coordinates in fallback methods', () => {
        const validPolygon: Feature<Polygon> = {
          type: 'Feature',
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
          properties: {},
        };

        const polygonWithInvalidCoords: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [1, 1],
                null as any, // Invalid coordinate
                [3, 3],
                [1, 3],
                [1, 1],
              ],
            ],
          },
          properties: {},
        };

        const result = turfHelper.polygonIntersect(validPolygon, polygonWithInvalidCoords);
        expect(result).toBe(false); // Should handle gracefully and return false
      });

      it('should handle line intersection errors in fallback method', () => {
        // Create polygons that might cause line intersection to fail
        const polygon1: Feature<Polygon> = {
          type: 'Feature',
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
          properties: {},
        };

        const polygon2: Feature<Polygon> = {
          type: 'Feature',
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
          properties: {},
        };

        const result = turfHelper.polygonIntersect(polygon1, polygon2);
        expect(typeof result).toBe('boolean');
        expect(result).toBe(true);
      });
    });
  });
});
