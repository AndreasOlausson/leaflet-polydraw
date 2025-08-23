import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolygonGeometryManager } from '../../src/managers/polygon-geometry-manager';
import { TurfHelper } from '../../src/turf-helper';
import type { PolydrawConfig } from '../../src/types/polydraw-interfaces';
import type { Feature, Polygon, MultiPolygon } from 'geojson';

// Mock TurfHelper
const mockTurfHelper = {
  isPolygonCompletelyWithin: vi.fn(),
  polygonIntersect: vi.fn(),
  getIntersection: vi.fn(),
  getPolygonArea: vi.fn(),
  getCoords: vi.fn(),
  isPointInsidePolygon: vi.fn(),
  union: vi.fn(),
  polygonDifference: vi.fn(),
  getMultiPolygon: vi.fn(),
  getTurfPolygon: vi.fn(),
  convertToBoundingBoxPolygon: vi.fn(),
  getBezierMultiPolygon: vi.fn(),
  getDoubleElbowLatLngs: vi.fn(),
} as unknown as TurfHelper;

const mockConfig: PolydrawConfig = {
  menuOperations: {
    simplify: {
      processHoles: true,
    },
    bbox: {
      processHoles: true,
    },
    doubleElbows: {
      processHoles: true,
    },
  },
} as PolydrawConfig;

describe('PolygonGeometryManager', () => {
  let manager: PolygonGeometryManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new PolygonGeometryManager({
      turfHelper: mockTurfHelper,
      config: mockConfig,
    });
  });

  describe('constructor', () => {
    it('should initialize with dependencies', () => {
      expect(manager).toBeInstanceOf(PolygonGeometryManager);
    });
  });

  describe('checkPolygonIntersection', () => {
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

    it('should return true when one polygon is completely within another', () => {
      (mockTurfHelper.isPolygonCompletelyWithin as any).mockReturnValue(true);

      const result = manager.checkPolygonIntersection(polygon1, polygon2);

      expect(result).toBe(true);
      expect(mockTurfHelper.isPolygonCompletelyWithin).toHaveBeenCalledWith(polygon1, polygon2);
    });

    it('should return true when polygons intersect using polygonIntersect', () => {
      (mockTurfHelper.isPolygonCompletelyWithin as any).mockReturnValue(false);
      (mockTurfHelper.polygonIntersect as any).mockReturnValue(polygon1);

      const result = manager.checkPolygonIntersection(polygon1, polygon2);

      expect(result).toBe(true);
      expect(mockTurfHelper.polygonIntersect).toHaveBeenCalledWith(polygon1, polygon2);
    });

    it('should return true when polygons have meaningful intersection area', () => {
      (mockTurfHelper.isPolygonCompletelyWithin as any).mockReturnValue(false);
      (mockTurfHelper.polygonIntersect as any).mockReturnValue(null);
      (mockTurfHelper.getIntersection as any).mockReturnValue({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0.5, 0.5],
              [1, 0.5],
              [1, 1],
              [0.5, 1],
              [0.5, 0.5],
            ],
          ],
        },
        properties: {},
      });
      (mockTurfHelper.getPolygonArea as any).mockReturnValue(0.25);

      const result = manager.checkPolygonIntersection(polygon1, polygon2);

      expect(result).toBe(true);
      expect(mockTurfHelper.getPolygonArea).toHaveBeenCalled();
    });

    it('should return true when vertex of one polygon is inside another', () => {
      (mockTurfHelper.isPolygonCompletelyWithin as any).mockReturnValue(false);
      (mockTurfHelper.polygonIntersect as any).mockReturnValue(null);
      (mockTurfHelper.getIntersection as any).mockReturnValue(null);
      (mockTurfHelper.getCoords as any).mockReturnValue([
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ]);
      (mockTurfHelper.isPointInsidePolygon as any).mockReturnValue(true);

      const result = manager.checkPolygonIntersection(polygon1, polygon2);

      expect(result).toBe(true);
      expect(mockTurfHelper.isPointInsidePolygon).toHaveBeenCalled();
    });

    it('should return false when no intersection is detected', () => {
      (mockTurfHelper.isPolygonCompletelyWithin as any).mockReturnValue(false);
      (mockTurfHelper.polygonIntersect as any).mockReturnValue(null);
      (mockTurfHelper.getIntersection as any).mockReturnValue(null);
      (mockTurfHelper.getCoords as any).mockReturnValue([
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ]);
      (mockTurfHelper.isPointInsidePolygon as any).mockReturnValue(false);

      const result = manager.checkPolygonIntersection(polygon1, polygon2);

      expect(result).toBe(false);
    });

    it('should handle errors gracefully and continue to next method', () => {
      (mockTurfHelper.isPolygonCompletelyWithin as any).mockImplementation(() => {
        throw new Error('Test error');
      });
      (mockTurfHelper.polygonIntersect as any).mockReturnValue(polygon1);

      const result = manager.checkPolygonIntersection(polygon1, polygon2);

      expect(result).toBe(true);
    });
  });

  describe('unionPolygons', () => {
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

    const unionResult: Feature<Polygon> = {
      type: 'Feature',
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
      properties: {},
    };

    it('should successfully union multiple polygons', () => {
      vi.mocked(mockTurfHelper.union).mockReturnValue(unionResult);

      const result = manager.unionPolygons([polygon1], polygon2);

      expect(result.success).toBe(true);
      expect(result.result).toBe(unionResult);
      expect(mockTurfHelper.union).toHaveBeenCalledWith(polygon2, polygon1);
    });

    it('should handle union with multiple existing polygons', () => {
      vi.mocked(mockTurfHelper.union)
        .mockReturnValueOnce(unionResult)
        .mockReturnValueOnce(unionResult);

      const result = manager.unionPolygons([polygon1, polygon2], polygon2);

      expect(result.success).toBe(true);
      expect(mockTurfHelper.union).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in union operation', () => {
      vi.mocked(mockTurfHelper.union).mockImplementation(() => {
        throw new Error('Union failed');
      });

      const result = manager.unionPolygons([polygon1], polygon2);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Union failed');
    });
  });

  describe('subtractPolygon', () => {
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

    it('should successfully subtract polygon', () => {
      const differenceResult: Feature<MultiPolygon> = {
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

      vi.mocked(mockTurfHelper.polygonDifference).mockReturnValue(differenceResult);
      vi.mocked(mockTurfHelper.getCoords).mockReturnValue([
        [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        ],
      ]);
      vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(differenceResult);

      const result = manager.subtractPolygon(polygon1, polygon2);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(mockTurfHelper.polygonDifference).toHaveBeenCalledWith(polygon1, polygon2);
    });

    it('should handle null result from difference operation', () => {
      vi.mocked(mockTurfHelper.polygonDifference).mockReturnValue(null);

      const result = manager.subtractPolygon(polygon1, polygon2);

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
    });

    it('should handle errors in subtraction operation', () => {
      vi.mocked(mockTurfHelper.polygonDifference).mockImplementation(() => {
        throw new Error('Subtraction failed');
      });

      const result = manager.subtractPolygon(polygon1, polygon2);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Subtraction failed');
    });
  });

  describe('simplifyPolygon', () => {
    const polygon: Feature<Polygon> = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0.5, 0],
            [1, 0],
            [1, 0.5],
            [1, 1],
            [0.5, 1],
            [0, 1],
            [0, 0.5],
            [0, 0],
          ],
        ],
      },
      properties: {},
    };

    it('should successfully simplify polygon', () => {
      vi.mocked(mockTurfHelper.getCoords).mockReturnValue([
        [
          [
            [0, 0],
            [0.5, 0],
            [1, 0],
            [1, 0.5],
            [1, 1],
            [0.5, 1],
            [0, 1],
            [0, 0.5],
            [0, 0],
          ],
        ],
      ]);
      vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(polygon);
      vi.mocked(mockTurfHelper.getTurfPolygon).mockReturnValue(polygon);

      const result = manager.simplifyPolygon(polygon);

      expect(result.success).toBe(true);
      expect(result.result).toBe(polygon);
    });

    it('should handle invalid polygon coordinates', () => {
      vi.mocked(mockTurfHelper.getCoords).mockReturnValue([]);

      const result = manager.simplifyPolygon(polygon);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid polygon coordinates');
    });

    it('should preserve holes when processHoles is false', () => {
      const configWithoutHoles = {
        ...mockConfig,
        menuOperations: {
          ...mockConfig.menuOperations,
          simplify: { processHoles: false },
        },
      };
      const managerWithoutHoles = new PolygonGeometryManager({
        turfHelper: mockTurfHelper,
        config: configWithoutHoles,
      });

      vi.mocked(mockTurfHelper.getCoords).mockReturnValue([
        [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ], // outer ring
          [
            [0.5, 0.5],
            [1.5, 0.5],
            [1.5, 1.5],
            [0.5, 1.5],
            [0.5, 0.5],
          ], // hole
        ],
      ]);
      vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(polygon);
      vi.mocked(mockTurfHelper.getTurfPolygon).mockReturnValue(polygon);

      const result = managerWithoutHoles.simplifyPolygon(polygon);

      expect(result.success).toBe(true);
    });

    it('should handle errors in simplification', () => {
      vi.mocked(mockTurfHelper.getCoords).mockImplementation(() => {
        throw new Error('Simplification failed');
      });

      const result = manager.simplifyPolygon(polygon);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Simplification failed');
    });
  });

  describe('convertToBoundingBox', () => {
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

    it('should successfully convert to bounding box', () => {
      vi.mocked(mockTurfHelper.getCoords).mockReturnValue([
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ]);
      vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(polygon);
      vi.mocked(mockTurfHelper.getTurfPolygon).mockReturnValue(polygon);

      const result = manager.convertToBoundingBox(polygon);

      expect(result.success).toBe(true);
      expect(result.result).toBe(polygon);
    });

    it('should handle processHoles false configuration', () => {
      const configWithoutHoles = {
        ...mockConfig,
        menuOperations: {
          ...mockConfig.menuOperations,
          bbox: { processHoles: false },
        },
      };
      const managerWithoutHoles = new PolygonGeometryManager({
        turfHelper: mockTurfHelper,
        config: configWithoutHoles,
      });

      vi.mocked(mockTurfHelper.convertToBoundingBoxPolygon).mockReturnValue(polygon);
      vi.mocked(mockTurfHelper.getTurfPolygon).mockReturnValue(polygon);

      const result = managerWithoutHoles.convertToBoundingBox(polygon);

      expect(result.success).toBe(true);
      expect(mockTurfHelper.convertToBoundingBoxPolygon).toHaveBeenCalledWith(polygon);
    });

    it('should handle invalid coordinates', () => {
      vi.mocked(mockTurfHelper.getCoords).mockReturnValue([]);

      const result = manager.convertToBoundingBox(polygon);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid polygon coordinates');
    });

    it('should handle errors in bounding box conversion', () => {
      vi.mocked(mockTurfHelper.getCoords).mockImplementation(() => {
        throw new Error('Bounding box conversion failed');
      });

      const result = manager.convertToBoundingBox(polygon);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bounding box conversion failed');
    });
  });

  describe('bezierifyPolygon', () => {
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

    it('should successfully apply bezier curve to polygon', () => {
      vi.mocked(mockTurfHelper.getCoords).mockReturnValue([
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ]);
      vi.mocked(mockTurfHelper.getBezierMultiPolygon).mockReturnValue(polygon);
      vi.mocked(mockTurfHelper.getTurfPolygon).mockReturnValue(polygon);

      const result = manager.bezierifyPolygon(polygon);

      expect(result.success).toBe(true);
      expect(result.result).toBe(polygon);
      expect(mockTurfHelper.getBezierMultiPolygon).toHaveBeenCalled();
    });

    it('should handle errors in bezier operation', () => {
      vi.mocked(mockTurfHelper.getCoords).mockImplementation(() => {
        throw new Error('Bezier operation failed');
      });

      const result = manager.bezierifyPolygon(polygon);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bezier operation failed');
    });
  });

  describe('doubleElbowsPolygon', () => {
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

    it('should successfully double elbows of polygon', () => {
      vi.mocked(mockTurfHelper.getCoords).mockReturnValue([
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ]);
      vi.mocked(mockTurfHelper.getDoubleElbowLatLngs).mockReturnValue([
        { lat: 0, lng: 0 },
        { lat: 0.5, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 0.5 },
        { lat: 1, lng: 1 },
        { lat: 0.5, lng: 1 },
        { lat: 0, lng: 1 },
        { lat: 0, lng: 0.5 },
        { lat: 0, lng: 0 },
      ]);
      vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(polygon);
      vi.mocked(mockTurfHelper.getTurfPolygon).mockReturnValue(polygon);

      const result = manager.doubleElbowsPolygon(polygon);

      expect(result.success).toBe(true);
      expect(result.result).toBe(polygon);
      expect(mockTurfHelper.getDoubleElbowLatLngs).toHaveBeenCalled();
    });

    it('should handle processHoles false configuration', () => {
      const configWithoutHoles = {
        ...mockConfig,
        menuOperations: {
          ...mockConfig.menuOperations,
          doubleElbows: { processHoles: false },
        },
      };
      const managerWithoutHoles = new PolygonGeometryManager({
        turfHelper: mockTurfHelper,
        config: configWithoutHoles,
      });

      vi.mocked(mockTurfHelper.getCoords).mockReturnValue([
        [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ], // outer ring
          [
            [0.5, 0.5],
            [1.5, 0.5],
            [1.5, 1.5],
            [0.5, 1.5],
            [0.5, 0.5],
          ], // hole
        ],
      ]);
      vi.mocked(mockTurfHelper.getDoubleElbowLatLngs).mockReturnValue([
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 2, lng: 0 },
        { lat: 2, lng: 1 },
        { lat: 2, lng: 2 },
        { lat: 1, lng: 2 },
        { lat: 0, lng: 2 },
        { lat: 0, lng: 1 },
        { lat: 0, lng: 0 },
      ]);
      vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(polygon);
      vi.mocked(mockTurfHelper.getTurfPolygon).mockReturnValue(polygon);

      const result = managerWithoutHoles.doubleElbowsPolygon(polygon);

      expect(result.success).toBe(true);
    });

    it('should handle invalid coordinates', () => {
      vi.mocked(mockTurfHelper.getCoords).mockReturnValue([]);

      const result = manager.doubleElbowsPolygon(polygon);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid polygon coordinates');
    });

    it('should handle errors in double elbows operation', () => {
      vi.mocked(mockTurfHelper.getCoords).mockImplementation(() => {
        throw new Error('Double elbows operation failed');
      });

      const result = manager.doubleElbowsPolygon(polygon);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Double elbows operation failed');
    });
  });
});
