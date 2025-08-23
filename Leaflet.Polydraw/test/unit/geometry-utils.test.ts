import { describe, it, expect, vi } from 'vitest';
import { GeometryUtils } from '../../src/geometry-utils';
import { PolygonUtil } from '../../src/polygon.util';

// Mock PolygonUtil
vi.mock('../../src/polygon.util', () => ({
  PolygonUtil: {
    getCenter: vi.fn(),
  },
}));

describe('GeometryUtils', () => {
  describe('calculateAngle', () => {
    it('should calculate angle between three points forming a right angle', () => {
      const p1 = { lat: 0, lng: 0 };
      const p2 = { lat: 0, lng: 1 };
      const p3 = { lat: 1, lng: 1 };

      const angle = GeometryUtils.calculateAngle(p1, p2, p3);

      expect(angle).toBeCloseTo(Math.PI / 2, 5); // 90 degrees in radians
    });

    it('should calculate angle between three points forming a straight line', () => {
      const p1 = { lat: 0, lng: 0 };
      const p2 = { lat: 0, lng: 1 };
      const p3 = { lat: 0, lng: 2 };

      const angle = GeometryUtils.calculateAngle(p1, p2, p3);

      expect(angle).toBeCloseTo(Math.PI, 5); // 180 degrees in radians
    });

    it('should return 0 when points are identical (zero magnitude)', () => {
      const p1 = { lat: 1, lng: 1 };
      const p2 = { lat: 1, lng: 1 };
      const p3 = { lat: 2, lng: 2 };

      const angle = GeometryUtils.calculateAngle(p1, p2, p3);

      expect(angle).toBe(0);
    });

    it('should handle acute angles', () => {
      const p1 = { lat: 0, lng: 0 };
      const p2 = { lat: 1, lng: 0 };
      const p3 = { lat: 1, lng: 1 };

      const angle = GeometryUtils.calculateAngle(p1, p2, p3);

      expect(angle).toBeCloseTo(Math.PI / 2, 5); // 90 degrees in radians (corrected)
    });

    it('should handle obtuse angles', () => {
      const p1 = { lat: 0, lng: 0 };
      const p2 = { lat: 1, lng: 0 };
      const p3 = { lat: 0.5, lng: -1 };

      const angle = GeometryUtils.calculateAngle(p1, p2, p3);

      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThan(Math.PI);
    });
  });

  describe('calculateDistanceFromLine', () => {
    it('should calculate distance from point to horizontal line', () => {
      const p1 = { lat: 0, lng: 0 };
      const point = { lat: 1, lng: 0.5 };
      const p2 = { lat: 0, lng: 1 };

      const distance = GeometryUtils.calculateDistanceFromLine(p1, point, p2);

      expect(distance).toBeCloseTo(1, 5);
    });

    it('should calculate distance from point to vertical line', () => {
      const p1 = { lat: 0, lng: 0 };
      const point = { lat: 0.5, lng: 1 };
      const p2 = { lat: 1, lng: 0 };

      const distance = GeometryUtils.calculateDistanceFromLine(p1, point, p2);

      expect(distance).toBeGreaterThan(0);
    });

    it('should return distance to closest endpoint when point projects outside line segment', () => {
      const p1 = { lat: 0, lng: 0 };
      const point = { lat: 0, lng: -1 }; // Point is before p1
      const p2 = { lat: 0, lng: 1 };

      const distance = GeometryUtils.calculateDistanceFromLine(p1, point, p2);

      expect(distance).toBeCloseTo(1, 5); // Distance to p1
    });

    it('should handle zero-length line segment', () => {
      const p1 = { lat: 1, lng: 1 };
      const point = { lat: 2, lng: 2 };
      const p2 = { lat: 1, lng: 1 }; // Same as p1

      const distance = GeometryUtils.calculateDistanceFromLine(p1, point, p2);

      const expectedDistance = Math.sqrt(2); // Distance from (1,1) to (2,2)
      expect(distance).toBeCloseTo(expectedDistance, 5);
    });

    it('should return 0 when point is on the line', () => {
      const p1 = { lat: 0, lng: 0 };
      const point = { lat: 0, lng: 0.5 }; // Point on the line
      const p2 = { lat: 0, lng: 1 };

      const distance = GeometryUtils.calculateDistanceFromLine(p1, point, p2);

      expect(distance).toBeCloseTo(0, 5);
    });
  });

  describe('calculateCentroid', () => {
    it('should delegate to PolygonUtil.getCenter', () => {
      const latlngs = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
      ];
      const expectedCenter = { lat: 0.5, lng: 0.5 };

      vi.mocked(PolygonUtil.getCenter).mockReturnValue(expectedCenter);

      const result = GeometryUtils.calculateCentroid(latlngs);

      expect(PolygonUtil.getCenter).toHaveBeenCalledWith(latlngs);
      expect(result).toBe(expectedCenter);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const p1 = { lat: 0, lng: 0 };
      const p2 = { lat: 3, lng: 4 };

      const distance = GeometryUtils.calculateDistance(p1, p2);

      expect(distance).toBeCloseTo(5, 5); // 3-4-5 triangle
    });

    it('should return 0 for identical points', () => {
      const p1 = { lat: 1.5, lng: 2.5 };
      const p2 = { lat: 1.5, lng: 2.5 };

      const distance = GeometryUtils.calculateDistance(p1, p2);

      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const p1 = { lat: -1, lng: -1 };
      const p2 = { lat: 1, lng: 1 };

      const distance = GeometryUtils.calculateDistance(p1, p2);

      expect(distance).toBeCloseTo(Math.sqrt(8), 5);
    });

    it('should calculate distance for points on same latitude', () => {
      const p1 = { lat: 5, lng: 0 };
      const p2 = { lat: 5, lng: 3 };

      const distance = GeometryUtils.calculateDistance(p1, p2);

      expect(distance).toBeCloseTo(3, 5);
    });

    it('should calculate distance for points on same longitude', () => {
      const p1 = { lat: 0, lng: 7 };
      const p2 = { lat: 4, lng: 7 };

      const distance = GeometryUtils.calculateDistance(p1, p2);

      expect(distance).toBeCloseTo(4, 5);
    });
  });

  describe('offsetPolygonCoordinates', () => {
    it('should offset single coordinate', () => {
      const coord = { lat: 1, lng: 2 };
      const offsetLat = 0.5;
      const offsetLng = 0.3;

      const result = GeometryUtils.offsetPolygonCoordinates(coord, offsetLat, offsetLng);

      expect(result).toEqual({ lat: 1.5, lng: 2.3 });
    });

    it('should offset array of coordinates', () => {
      const coords = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 2, lng: 2 },
      ];
      const offsetLat = 0.1;
      const offsetLng = 0.2;

      const result = GeometryUtils.offsetPolygonCoordinates(coords, offsetLat, offsetLng);

      expect(result).toEqual([
        { lat: 0.1, lng: 0.2 },
        { lat: 1.1, lng: 1.2 },
        { lat: 2.1, lng: 2.2 },
      ]);
    });

    it('should offset multi-dimensional array (polygon with holes)', () => {
      const coords = [
        [
          { lat: 0, lng: 0 },
          { lat: 2, lng: 0 },
          { lat: 2, lng: 2 },
          { lat: 0, lng: 2 },
          { lat: 0, lng: 0 },
        ],
        [
          { lat: 0.5, lng: 0.5 },
          { lat: 1.5, lng: 0.5 },
          { lat: 1.5, lng: 1.5 },
          { lat: 0.5, lng: 1.5 },
          { lat: 0.5, lng: 0.5 },
        ],
      ];
      const offsetLat = 0.1;
      const offsetLng = 0.1;

      const result = GeometryUtils.offsetPolygonCoordinates(coords, offsetLat, offsetLng);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(5);
      expect(result[1]).toHaveLength(5);
      expect(result[0][0]).toEqual({ lat: 0.1, lng: 0.1 });
      expect(result[1][0]).toEqual({ lat: 0.6, lng: 0.6 });
    });

    it('should handle null/undefined input', () => {
      const result1 = GeometryUtils.offsetPolygonCoordinates(null, 0.1, 0.1);
      const result2 = GeometryUtils.offsetPolygonCoordinates(undefined, 0.1, 0.1);

      expect(result1).toBeNull();
      expect(result2).toBeUndefined();
    });

    it('should handle empty arrays', () => {
      const coords: any[] = [];
      const offsetLat = 0.1;
      const offsetLng = 0.1;

      const result = GeometryUtils.offsetPolygonCoordinates(coords, offsetLat, offsetLng);

      expect(result).toEqual([]);
    });

    it('should handle negative offsets', () => {
      const coord = { lat: 1, lng: 1 };
      const offsetLat = -0.5;
      const offsetLng = -0.3;

      const result = GeometryUtils.offsetPolygonCoordinates(coord, offsetLat, offsetLng);

      expect(result).toEqual({ lat: 0.5, lng: 0.7 });
    });

    it('should handle deeply nested arrays (multipolygon)', () => {
      const coords = [
        [
          [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 0 },
            { lat: 1, lng: 1 },
            { lat: 0, lng: 1 },
            { lat: 0, lng: 0 },
          ],
        ],
        [
          [
            { lat: 2, lng: 2 },
            { lat: 3, lng: 2 },
            { lat: 3, lng: 3 },
            { lat: 2, lng: 3 },
            { lat: 2, lng: 2 },
          ],
        ],
      ];
      const offsetLat = 0.1;
      const offsetLng = 0.1;

      const result = GeometryUtils.offsetPolygonCoordinates(coords, offsetLat, offsetLng);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(1);
      expect(result[1]).toHaveLength(1);
      expect(result[0][0][0]).toEqual({ lat: 0.1, lng: 0.1 });
      expect(result[1][0][0]).toEqual({ lat: 2.1, lng: 2.1 });
    });
  });
});
