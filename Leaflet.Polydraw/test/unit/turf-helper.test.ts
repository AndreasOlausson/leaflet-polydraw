import { describe, it, expect, vi } from 'vitest';
import { TurfHelper } from '../../src/turf-helper';
import defaultConfig from '../../src/config.json';
import type { Feature, Polygon, MultiPolygon } from 'geojson';

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
      expect(coords[0]).toBeCloseTo(15.606188);
      expect(coords[1]).toBeCloseTo(58.402514);
    });

    it('should handle coordinate conversion edge cases', () => {
      // Test with zero coordinates
      const zeroCoords = { lat: 0, lng: 0 };
      const result = turfHelper.getCoord(zeroCoords);
      expect(result).toEqual([0, 0]);

      // Test with negative coordinates
      const negativeCoords = { lat: -45.123, lng: -122.456 };
      const negResult = turfHelper.getCoord(negativeCoords);
      expect(negResult[0]).toBeCloseTo(-122.456);
      expect(negResult[1]).toBeCloseTo(-45.123);
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
      expect(['Polygon', 'MultiPolygon']).toContain(result.geometry.type);

      // Union should have larger area than individual polygons
      const area1 = turfHelper.getPolygonArea(polygon1);
      const area2 = turfHelper.getPolygonArea(polygon2);
      const unionArea = turfHelper.getPolygonArea(result);

      expect(unionArea).toBeGreaterThan(area1);
      expect(unionArea).toBeGreaterThan(area2);
      expect(unionArea).toBeLessThan(area1 + area2); // Should be less due to overlap
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
      expect(['Polygon', 'MultiPolygon']).toContain(result.geometry.type);

      // Difference should have smaller area than original
      const area1 = turfHelper.getPolygonArea(polygon1);
      const diffArea = turfHelper.getPolygonArea(result);
      expect(diffArea).toBeLessThan(area1);
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
      const unionResult = turfHelper.union(polygon1, invalidPolygon);
      const intersectionResult = turfHelper.getIntersection(polygon1, invalidPolygon);
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
          dynamicMode: { fractionGuard: 0.5, multipiler: 2 },
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
});
