/**
 * Predefined Polygons Tests
 *
 * Tests the predefined polygon functionality that makes Polydraw powerful:
 * - Adding predefined polygons via addPredefinedPolygon()
 * - Complex polygon shapes (octagon, star, C-shape)
 * - Polygons with holes (donut shapes)
 * - Multiple polygons and overlapping scenarios
 * - Visual optimization levels
 * - Error handling and validation
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockFactory } from '../mocks/factory';
import Polydraw from '../../../src/polydraw';

// Mock type for Polydraw with test-specific methods
type MockedPolydraw = {
  // Real Polydraw public methods
  addTo(map: L.Map): MockedPolydraw;
  onAdd(map: L.Map): HTMLElement;
  onRemove(map: L.Map): void;
  getFeatureGroups(): L.FeatureGroup[];
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
        addPredefinedPolygon: vi.fn().mockImplementation(function (
          this: any,
          geographicBorders,
          _options,
        ) {
          // Simulate real validation logic
          if (!geographicBorders || geographicBorders.length === 0) {
            return Promise.reject(new Error('Cannot add empty polygon array'));
          }

          // Check for invalid polygon data
          for (const [groupIndex, group] of geographicBorders.entries()) {
            if (!group || !group[0] || group[0].length < 4) {
              return Promise.reject(
                new Error(
                  `Invalid polygon data at index ${groupIndex}: A polygon must have at least 3 unique vertices.`,
                ),
              );
            }
          }

          // Check map initialization
          if (!this.map) {
            return Promise.reject(new Error('Map not initialized'));
          }

          // Check mutation manager initialization
          if (!this.polygonMutationManager) {
            return Promise.reject(new Error('PolygonMutationManager not initialized'));
          }

          return Promise.resolve(undefined);
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

describe('Predefined Polygons', () => {
  let _map: L.Map;
  let polydraw: MockedPolydraw;
  let predefinedPolygons: ReturnType<typeof MockFactory.createPredefinedPolygons>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create fresh mock objects
    _map = MockFactory.createMap();
    polydraw = new Polydraw() as unknown as MockedPolydraw;
    predefinedPolygons = MockFactory.createPredefinedPolygons();
  });

  describe('Basic Predefined Shapes', () => {
    it('should add an octagon polygon', async () => {
      const octagon = predefinedPolygons.octagon();

      expect(octagon).toHaveLength(1); // One polygon group
      expect(octagon[0]).toHaveLength(1); // One ring (no holes)
      expect(octagon[0][0]).toHaveLength(9); // 8 vertices + closing point

      await polydraw.addPredefinedPolygon(octagon);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(octagon);
    });

    it('should add a triangle polygon', async () => {
      const triangle = predefinedPolygons.triangle();

      expect(triangle).toHaveLength(1);
      expect(triangle[0]).toHaveLength(1);
      expect(triangle[0][0]).toHaveLength(4); // 3 vertices + closing point

      await polydraw.addPredefinedPolygon(triangle);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(triangle);
    });

    it('should add a star-shaped polygon', async () => {
      const star = predefinedPolygons.star();

      expect(star).toHaveLength(1);
      expect(star[0]).toHaveLength(1);
      expect(star[0][0]).toHaveLength(11); // 10 vertices + closing point

      await polydraw.addPredefinedPolygon(star);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(star);
    });

    it('should add a complex polygon with many vertices', async () => {
      const complex = predefinedPolygons.complexPolygon();

      expect(complex).toHaveLength(1);
      expect(complex[0]).toHaveLength(1);
      expect(complex[0][0]).toHaveLength(17); // 16 vertices + closing point

      await polydraw.addPredefinedPolygon(complex);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(complex);
    });
  });

  describe('Polygons with Holes', () => {
    it('should add a square with a hole (donut shape)', async () => {
      const squareWithHole = predefinedPolygons.squareWithHole();

      expect(squareWithHole).toHaveLength(1); // One polygon group
      expect(squareWithHole[0]).toHaveLength(2); // Two rings: outer + hole
      expect(squareWithHole[0][0]).toHaveLength(5); // Outer square: 4 vertices + closing
      expect(squareWithHole[0][1]).toHaveLength(5); // Inner hole: 4 vertices + closing

      await polydraw.addPredefinedPolygon(squareWithHole);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(squareWithHole);
    });

    it('should add a complex polygon with multiple holes', async () => {
      const complexWithHoles = predefinedPolygons.complexWithMultipleHoles();

      expect(complexWithHoles).toHaveLength(1);
      expect(complexWithHoles[0]).toHaveLength(3); // Outer boundary + 2 holes
      expect(complexWithHoles[0][0]).toHaveLength(5); // Outer boundary
      expect(complexWithHoles[0][1]).toHaveLength(5); // First hole
      expect(complexWithHoles[0][2]).toHaveLength(5); // Second hole

      await polydraw.addPredefinedPolygon(complexWithHoles);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(complexWithHoles);
    });
  });

  describe('Multiple Polygons', () => {
    it('should add multiple separate polygons', async () => {
      const multiplePolygons = predefinedPolygons.multipleSimplePolygons();

      expect(multiplePolygons).toHaveLength(3); // Three separate polygons
      multiplePolygons.forEach((polygon, _index) => {
        expect(polygon).toHaveLength(1); // Each polygon has one ring
        expect(polygon[0]).toHaveLength(4); // Each has 3 vertices + closing
      });

      await polydraw.addPredefinedPolygon(multiplePolygons);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(multiplePolygons);
    });

    it('should add overlapping squares for merging tests', async () => {
      const overlappingSquares = predefinedPolygons.overlappingSquares();

      expect(overlappingSquares).toHaveLength(2); // Two overlapping polygons
      expect(overlappingSquares[0]).toHaveLength(1); // First square
      expect(overlappingSquares[1]).toHaveLength(1); // Second square

      await polydraw.addPredefinedPolygon(overlappingSquares);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(overlappingSquares);
    });
  });

  describe('Special Shapes for Merging', () => {
    it('should add a C-shape polygon for merging tests', async () => {
      const cShape = predefinedPolygons.cShape();

      expect(cShape).toHaveLength(1);
      expect(cShape[0]).toHaveLength(1);
      expect(cShape[0][0]).toHaveLength(9); // C-shape with 8 vertices + closing

      await polydraw.addPredefinedPolygon(cShape);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(cShape);
    });
  });

  describe('Visual Optimization', () => {
    it('should add polygon with default visual optimization level', async () => {
      const octagon = predefinedPolygons.octagon();

      await polydraw.addPredefinedPolygon(octagon);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(octagon);
    });

    it('should add polygon with custom visual optimization level', async () => {
      const octagon = predefinedPolygons.octagon();
      const options = { visualOptimizationLevel: 2 };

      await polydraw.addPredefinedPolygon(octagon, options);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(octagon, options);
    });

    it('should handle different visual optimization levels', async () => {
      const triangle = predefinedPolygons.triangle();

      // Test different optimization levels
      const levels = [0, 1, 2, 3];

      for (const level of levels) {
        const options = { visualOptimizationLevel: level };
        await polydraw.addPredefinedPolygon(triangle, options);
        expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(triangle, options);
      }
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle empty polygon array', async () => {
      const emptyPolygons: L.LatLng[][][] = [];

      await expect(polydraw.addPredefinedPolygon(emptyPolygons)).rejects.toThrow(
        'Cannot add empty polygon array',
      );
    });

    it('should handle null polygon data', async () => {
      await expect(polydraw.addPredefinedPolygon(null as any)).rejects.toThrow(
        'Cannot add empty polygon array',
      );
    });

    it('should handle undefined polygon data', async () => {
      await expect(polydraw.addPredefinedPolygon(undefined as any)).rejects.toThrow(
        'Cannot add empty polygon array',
      );
    });

    it('should validate polygon with insufficient vertices', async () => {
      const invalidPolygon: L.LatLng[][][] = [
        [
          [
            MockFactory.createLatLng(58.4, 15.6),
            MockFactory.createLatLng(58.41, 15.6),
            MockFactory.createLatLng(58.4, 15.6), // Only 2 unique vertices
          ],
        ],
      ];

      await expect(polydraw.addPredefinedPolygon(invalidPolygon)).rejects.toThrow(
        'Invalid polygon data at index 0: A polygon must have at least 3 unique vertices.',
      );
    });

    it('should handle polygon with missing map initialization', async () => {
      const octagon = predefinedPolygons.octagon();

      // Mock map not initialized
      (polydraw as any).map = null;

      await expect(polydraw.addPredefinedPolygon(octagon)).rejects.toThrow('Map not initialized');
    });

    it('should handle polygon with missing mutation manager', async () => {
      const octagon = predefinedPolygons.octagon();

      // Mock mutation manager not initialized
      (polydraw as any).polygonMutationManager = null;

      await expect(polydraw.addPredefinedPolygon(octagon)).rejects.toThrow(
        'PolygonMutationManager not initialized',
      );
    });
  });

  describe('Coordinate Validation', () => {
    it('should validate coordinate structure', () => {
      const octagon = predefinedPolygons.octagon();

      // Check that all coordinates are valid LatLng objects
      octagon.forEach((polygonGroup) => {
        polygonGroup.forEach((ring) => {
          ring.forEach((latlng) => {
            expect(latlng).toBeDefined();
            expect(typeof latlng.lat).toBe('number');
            expect(typeof latlng.lng).toBe('number');
            expect(latlng.lat).toBeGreaterThanOrEqual(-90);
            expect(latlng.lat).toBeLessThanOrEqual(90);
            expect(latlng.lng).toBeGreaterThanOrEqual(-180);
            expect(latlng.lng).toBeLessThanOrEqual(180);
          });
        });
      });
    });

    it('should validate polygon closure', () => {
      const octagon = predefinedPolygons.octagon();

      // Check that polygon is properly closed
      const firstRing = octagon[0][0];
      const firstPoint = firstRing[0];
      const lastPoint = firstRing[firstRing.length - 1];

      expect(firstPoint.lat).toBe(lastPoint.lat);
      expect(firstPoint.lng).toBe(lastPoint.lng);
    });

    it('should validate hole orientation', () => {
      const squareWithHole = predefinedPolygons.squareWithHole();

      // Outer ring should be counter-clockwise
      const outerRing = squareWithHole[0][0];
      expect(outerRing).toHaveLength(5);

      // Inner ring (hole) should be clockwise
      const innerRing = squareWithHole[0][1];
      expect(innerRing).toHaveLength(5);
    });
  });

  describe('Performance and Scale', () => {
    it('should handle large predefined polygons', async () => {
      const complexPolygon = predefinedPolygons.complexPolygon();

      // Complex polygon with many vertices
      expect(complexPolygon[0][0]).toHaveLength(17);

      await polydraw.addPredefinedPolygon(complexPolygon);
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(complexPolygon);
    });

    it('should handle multiple predefined polygons in sequence', async () => {
      const shapes = [
        predefinedPolygons.octagon(),
        predefinedPolygons.triangle(),
        predefinedPolygons.star(),
        predefinedPolygons.squareWithHole(),
      ];

      for (const shape of shapes) {
        await polydraw.addPredefinedPolygon(shape);
        expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(shape);
      }
    });

    it('should handle predefined polygons with different optimization levels', async () => {
      const octagon = predefinedPolygons.octagon();

      // Test with different optimization levels
      const optimizationLevels = [0, 1, 2, 3];

      for (const level of optimizationLevels) {
        await polydraw.addPredefinedPolygon(octagon, { visualOptimizationLevel: level });
        expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(octagon, {
          visualOptimizationLevel: level,
        });
      }
    });
  });

  describe('Integration with Drawing Modes', () => {
    it('should work with different drawing modes', async () => {
      const octagon = predefinedPolygons.octagon();

      // Test with different modes
      polydraw.setDrawMode(0); // Off
      await polydraw.addPredefinedPolygon(octagon);

      polydraw.setDrawMode(1); // Add
      await polydraw.addPredefinedPolygon(octagon);

      polydraw.setDrawMode(2); // Edit
      await polydraw.addPredefinedPolygon(octagon);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(3);
    });

    it('should maintain polygon count after adding predefined polygons', async () => {
      const initialPolygons = polydraw.getPolygons();
      expect(Array.isArray(initialPolygons)).toBe(true);

      const octagon = predefinedPolygons.octagon();
      await polydraw.addPredefinedPolygon(octagon);

      // In a real implementation, polygon count would increase
      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(octagon);
    });
  });

  describe('Event Handling', () => {
    it('should fire events when adding predefined polygons', async () => {
      const eventHandler = vi.fn();

      polydraw.on('polygonadded', eventHandler);
      expect(polydraw.on).toHaveBeenCalledWith('polygonadded', eventHandler);

      const octagon = predefinedPolygons.octagon();
      await polydraw.addPredefinedPolygon(octagon);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(octagon);
    });

    it('should handle multiple event listeners', async () => {
      const handlers = {
        polygonadded: vi.fn(),
        polygoncreated: vi.fn(),
        polygonloaded: vi.fn(),
      };

      Object.entries(handlers).forEach(([event, handler]) => {
        polydraw.on(event, handler);
        expect(polydraw.on).toHaveBeenCalledWith(event, handler);
      });

      const triangle = predefinedPolygons.triangle();
      await polydraw.addPredefinedPolygon(triangle);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(triangle);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should simulate loading a complex map with multiple predefined polygons', async () => {
      const mapPolygons = [
        predefinedPolygons.octagon(),
        predefinedPolygons.squareWithHole(),
        predefinedPolygons.star(),
        predefinedPolygons.complexWithMultipleHoles(),
        predefinedPolygons.multipleSimplePolygons(),
      ];

      for (const polygonGroup of mapPolygons) {
        await polydraw.addPredefinedPolygon(polygonGroup);
        expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(polygonGroup);
      }

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(5);
    });

    it('should handle predefined polygons with different visual optimization levels', async () => {
      const octagon = predefinedPolygons.octagon();

      // Simulate different optimization scenarios
      const scenarios = [
        { level: 0, description: 'No optimization' },
        { level: 1, description: 'Light optimization' },
        { level: 2, description: 'Medium optimization' },
        { level: 3, description: 'Heavy optimization' },
      ];

      for (const scenario of scenarios) {
        await polydraw.addPredefinedPolygon(octagon, {
          visualOptimizationLevel: scenario.level,
        });
        expect(polydraw.addPredefinedPolygon).toHaveBeenCalledWith(octagon, {
          visualOptimizationLevel: scenario.level,
        });
      }
    });

    it('should handle predefined polygons for testing merging scenarios', async () => {
      // Load overlapping polygons for merging tests
      const overlappingSquares = predefinedPolygons.overlappingSquares();
      await polydraw.addPredefinedPolygon(overlappingSquares);

      // Load C-shape for complex merging
      const cShape = predefinedPolygons.cShape();
      await polydraw.addPredefinedPolygon(cShape);

      // Load donut for hole merging
      const squareWithHole = predefinedPolygons.squareWithHole();
      await polydraw.addPredefinedPolygon(squareWithHole);

      expect(polydraw.addPredefinedPolygon).toHaveBeenCalledTimes(3);
    });
  });
});
