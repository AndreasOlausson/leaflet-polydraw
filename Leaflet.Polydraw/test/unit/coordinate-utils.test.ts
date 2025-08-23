import { describe, it, expect, vi } from 'vitest';
import { CoordinateUtils } from '../../src/coordinate-utils';
import * as L from 'leaflet';
import { TurfHelper } from '../../src/turf-helper';

// Mock TurfHelper
const mockTurfHelper = {
  isWithin: vi.fn(),
} as unknown as TurfHelper;

describe('CoordinateUtils', () => {
  describe('convertToCoords', () => {
    it('should handle single polygon (length 1)', () => {
      const latlngs: L.LatLngLiteral[][] = [
        [
          { lat: 0, lng: 0 },
          { lat: 1, lng: 0 },
          { lat: 1, lng: 1 },
          { lat: 0, lng: 1 },
          { lat: 0, lng: 0 },
        ],
      ];

      const result = CoordinateUtils.convertToCoords(latlngs, mockTurfHelper);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0]).toEqual([
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0],
        [0, 0],
      ]);
    });

    it('should handle two polygons with within relationship', () => {
      const latlngs: L.LatLngLiteral[][] = [
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

      vi.mocked(mockTurfHelper.isWithin).mockReturnValue(true);

      const result = CoordinateUtils.convertToCoords(latlngs, mockTurfHelper);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
    });

    it('should handle two polygons without within relationship', () => {
      const latlngs: L.LatLngLiteral[][] = [
        [
          { lat: 0, lng: 0 },
          { lat: 1, lng: 0 },
          { lat: 1, lng: 1 },
          { lat: 0, lng: 1 },
          { lat: 0, lng: 0 },
        ],
        [
          { lat: 2, lng: 2 },
          { lat: 3, lng: 2 },
          { lat: 3, lng: 3 },
          { lat: 2, lng: 3 },
          { lat: 2, lng: 2 },
        ],
      ];

      vi.mocked(mockTurfHelper.isWithin).mockReturnValue(false);

      const result = CoordinateUtils.convertToCoords(latlngs, mockTurfHelper);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(1);
      expect(result[1]).toHaveLength(1);
    });

    it('should handle multiple polygons (more than 2)', () => {
      const latlngs: L.LatLngLiteral[][] = [
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
        [
          { lat: 3, lng: 3 },
          { lat: 4, lng: 3 },
          { lat: 4, lng: 4 },
          { lat: 3, lng: 4 },
          { lat: 3, lng: 3 },
        ],
      ];

      vi.mocked(mockTurfHelper.isWithin).mockReturnValue(true);

      const result = CoordinateUtils.convertToCoords(latlngs, mockTurfHelper);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
    });

    it('should handle multiple polygons without within relationship', () => {
      const latlngs: L.LatLngLiteral[][] = [
        [
          { lat: 0, lng: 0 },
          { lat: 1, lng: 0 },
          { lat: 1, lng: 1 },
          { lat: 0, lng: 1 },
          { lat: 0, lng: 0 },
        ],
        [
          { lat: 2, lng: 2 },
          { lat: 3, lng: 2 },
          { lat: 3, lng: 3 },
          { lat: 2, lng: 3 },
          { lat: 2, lng: 2 },
        ],
        [
          { lat: 4, lng: 4 },
          { lat: 5, lng: 4 },
          { lat: 5, lng: 5 },
          { lat: 4, lng: 5 },
          { lat: 4, lng: 4 },
        ],
      ];

      vi.mocked(mockTurfHelper.isWithin).mockReturnValue(false);

      const result = CoordinateUtils.convertToCoords(latlngs, mockTurfHelper);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(1);
      expect(result[1]).toHaveLength(1);
      expect(result[2]).toHaveLength(1);
    });
  });

  describe('offsetPolygonCoordinates', () => {
    it('should delegate to GeometryUtils.offsetPolygonCoordinates', () => {
      const latLngs: L.LatLngLiteral[][] = [
        [
          { lat: 0, lng: 0 },
          { lat: 1, lng: 0 },
          { lat: 1, lng: 1 },
          { lat: 0, lng: 1 },
          { lat: 0, lng: 0 },
        ],
      ];
      const offsetLat = 0.1;
      const offsetLng = 0.2;

      const result = CoordinateUtils.offsetPolygonCoordinates(latLngs, offsetLat, offsetLng);

      // Should return the same structure with offset applied
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(5);
      expect(result[0][0]).toEqual({ lat: 0.1, lng: 0.2 });
      expect(result[0][1]).toEqual({ lat: 1.1, lng: 0.2 });
      expect(result[0][2]).toEqual({ lat: 1.1, lng: 1.2 });
      expect(result[0][3]).toEqual({ lat: 0.1, lng: 1.2 });
      expect(result[0][4]).toEqual({ lat: 0.1, lng: 0.2 });
    });

    it('should handle empty arrays', () => {
      const latLngs: L.LatLngLiteral[][] = [];
      const offsetLat = 0.1;
      const offsetLng = 0.2;

      const result = CoordinateUtils.offsetPolygonCoordinates(latLngs, offsetLat, offsetLng);

      expect(result).toEqual([]);
    });

    it('should handle negative offsets', () => {
      const latLngs: L.LatLngLiteral[][] = [
        [
          { lat: 1, lng: 1 },
          { lat: 2, lng: 1 },
          { lat: 2, lng: 2 },
          { lat: 1, lng: 2 },
          { lat: 1, lng: 1 },
        ],
      ];
      const offsetLat = -0.5;
      const offsetLng = -0.3;

      const result = CoordinateUtils.offsetPolygonCoordinates(latLngs, offsetLat, offsetLng);

      expect(result[0][0]).toEqual({ lat: 0.5, lng: 0.7 });
      expect(result[0][1]).toEqual({ lat: 1.5, lng: 0.7 });
      expect(result[0][2]).toEqual({ lat: 1.5, lng: 1.7 });
      expect(result[0][3]).toEqual({ lat: 0.5, lng: 1.7 });
    });
  });

  describe('getLatLngInfoString', () => {
    it('should format latitude and longitude correctly', () => {
      const latlng: L.LatLngLiteral = { lat: 45.123, lng: -122.456 };

      const result = CoordinateUtils.getLatLngInfoString(latlng);

      expect(result).toBe('Latitude: 45.123 Longitude: -122.456');
    });

    it('should handle zero coordinates', () => {
      const latlng: L.LatLngLiteral = { lat: 0, lng: 0 };

      const result = CoordinateUtils.getLatLngInfoString(latlng);

      expect(result).toBe('Latitude: 0 Longitude: 0');
    });

    it('should handle negative coordinates', () => {
      const latlng: L.LatLngLiteral = { lat: -33.8688, lng: 151.2093 };

      const result = CoordinateUtils.getLatLngInfoString(latlng);

      expect(result).toBe('Latitude: -33.8688 Longitude: 151.2093');
    });

    it('should handle decimal coordinates', () => {
      const latlng: L.LatLngLiteral = { lat: 40.7128, lng: -74.006 };

      const result = CoordinateUtils.getLatLngInfoString(latlng);

      expect(result).toBe('Latitude: 40.7128 Longitude: -74.006');
    });

    it('should handle very precise coordinates', () => {
      const latlng: L.LatLngLiteral = { lat: 51.5074123456789, lng: -0.1278987654321 };

      const result = CoordinateUtils.getLatLngInfoString(latlng);

      expect(result).toBe('Latitude: 51.5074123456789 Longitude: -0.1278987654321');
    });
  });
});
