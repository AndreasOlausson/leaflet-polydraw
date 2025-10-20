/**
 * Coordinate Auto-Detection Tests
 * Tests the CoordinateUtils.convertToLatLng method with various coordinate formats
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CoordinateUtils } from '../../../src/coordinate-utils';
import { MockFactory } from '../mocks/factory';

// Mock the leafletAdapter to avoid dependency issues
vi.mock('../../../src/compatibility/leaflet-adapter', () => ({
  leafletAdapter: {
    createLatLng: (lat: number, lng: number) => ({
      lat,
      lng,
      toString: () => `LatLng(${lat}, ${lng})`,
    }),
  },
}));

describe('CoordinateUtils - Auto-Detection', () => {
  describe('Object Formats', () => {
    it('should handle {lat, lng} format', () => {
      const result = CoordinateUtils.convertToLatLng({ lat: 59.903, lng: 10.724 });
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should handle {latitude, longitude} format', () => {
      const result = CoordinateUtils.convertToLatLng({ latitude: 59.903, longitude: 10.724 });
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should handle {longitude, latitude} format (GeoJSON order)', () => {
      const result = CoordinateUtils.convertToLatLng({ longitude: 10.724, latitude: 59.903 });
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should handle {lng, lat} format', () => {
      const result = CoordinateUtils.convertToLatLng({ lng: 10.724, lat: 59.903 });
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });
  });

  describe('Array Formats', () => {
    it('should handle [lat, lng] format for ambiguous values', () => {
      const result = CoordinateUtils.convertToLatLng([59.903, 10.724]);
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should detect longitude >90 and use GeoJSON order', () => {
      const result = CoordinateUtils.convertToLatLng([172, 1]);
      expect(result.lat).toBe(1);
      expect(result.lng).toBe(172);
    });

    it('should detect longitude >180 and use GeoJSON order', () => {
      const result = CoordinateUtils.convertToLatLng([200, 50]);
      expect(result.lat).toBe(50);
      expect(result.lng).toBe(200);
    });

    it('should default to lat,lng for ambiguous numeric pairs', () => {
      const result = CoordinateUtils.convertToLatLng([10.724, 59.903]);
      expect(result.lat).toBe(10.724);
      expect(result.lng).toBe(59.903);
    });
  });

  describe('String Formats - Comma Separated', () => {
    it('should handle "lat,lng" format', () => {
      const result = CoordinateUtils.convertToLatLng('59.903,10.724');
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should handle comma-separated with spaces', () => {
      const result = CoordinateUtils.convertToLatLng('59.903, 10.724');
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should NOT match comma-separated if DMS symbols are present', () => {
      // This should be handled by DMS pattern instead
      const result = CoordinateUtils.convertToLatLng("59°54'N, 10°43'E");
      expect(result.lat).toBeCloseTo(59.9, 1);
      expect(result.lng).toBeCloseTo(10.716, 1);
    });
  });

  describe('String Formats - Degrees Minutes Seconds (DMS)', () => {
    it('should handle full DMS format with seconds', () => {
      const result = CoordinateUtils.convertToLatLng('59°54\'10.8"N 10°43\'26.4"E');
      expect(result.lat).toBeCloseTo(59.903, 3);
      expect(result.lng).toBeCloseTo(10.724, 3);
    });

    it('should handle DMS format with integer seconds', () => {
      const result = CoordinateUtils.convertToLatLng('59°54\'10"N 10°43\'26"E');
      expect(result.lat).toBeCloseTo(59.9028, 4);
      expect(result.lng).toBeCloseTo(10.7239, 4);
    });

    it('should handle DMS format without seconds', () => {
      const result = CoordinateUtils.convertToLatLng("59°54'N 10°43'E");
      expect(result.lat).toBeCloseTo(59.9, 1);
      expect(result.lng).toBeCloseTo(10.7167, 4);
    });

    it('should handle DMS with Southern latitude', () => {
      const result = CoordinateUtils.convertToLatLng("59°54'S 10°43'E");
      expect(result.lat).toBeCloseTo(-59.9, 1);
      expect(result.lng).toBeCloseTo(10.7167, 4);
    });

    it('should handle DMS with Western longitude', () => {
      const result = CoordinateUtils.convertToLatLng("59°54'N 10°43'W");
      expect(result.lat).toBeCloseTo(59.9, 1);
      expect(result.lng).toBeCloseTo(-10.7167, 4);
    });

    it('should handle DMS with both Southern and Western', () => {
      const result = CoordinateUtils.convertToLatLng("59°54'S 10°43'W");
      expect(result.lat).toBeCloseTo(-59.9, 1);
      expect(result.lng).toBeCloseTo(-10.7167, 4);
    });
  });

  describe('String Formats - Degrees Decimal Minutes (DDM)', () => {
    it('should handle DDM format with decimal minutes', () => {
      const result = CoordinateUtils.convertToLatLng("59°54.18'N 10°43.44'E");
      expect(result.lat).toBeCloseTo(59.903, 3);
      expect(result.lng).toBeCloseTo(10.724, 3);
    });

    it('should handle DDM format with integer minutes', () => {
      const result = CoordinateUtils.convertToLatLng("59°54'N 10°43'E");
      expect(result.lat).toBeCloseTo(59.9, 1);
      expect(result.lng).toBeCloseTo(10.7167, 4);
    });

    it('should handle DDM with Southern latitude', () => {
      const result = CoordinateUtils.convertToLatLng("59°54.18'S 10°43.44'E");
      expect(result.lat).toBeCloseTo(-59.903, 3);
      expect(result.lng).toBeCloseTo(10.724, 3);
    });

    it('should handle DDM with Western longitude', () => {
      const result = CoordinateUtils.convertToLatLng("59°54.18'N 10°43.44'W");
      expect(result.lat).toBeCloseTo(59.903, 3);
      expect(result.lng).toBeCloseTo(-10.724, 3);
    });
  });

  describe('String Formats - Decimal Degrees with Direction', () => {
    it('should handle DD format with degree symbols', () => {
      const result = CoordinateUtils.convertToLatLng('59.903°N, 10.724°E');
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should handle DD format with space separation', () => {
      const result = CoordinateUtils.convertToLatLng('59.903 N, 10.724 E');
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should handle DD format without spaces', () => {
      const result = CoordinateUtils.convertToLatLng('59.903N, 10.724E');
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should handle DD format with Southern latitude', () => {
      const result = CoordinateUtils.convertToLatLng('59.903°S, 10.724°E');
      expect(result.lat).toBe(-59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should handle DD format with Western longitude', () => {
      const result = CoordinateUtils.convertToLatLng('59.903°N, 10.724°W');
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(-10.724);
    });

    it('should handle DD format with both Southern and Western', () => {
      const result = CoordinateUtils.convertToLatLng('59.903°S, 10.724°W');
      expect(result.lat).toBe(-59.903);
      expect(result.lng).toBe(-10.724);
    });
  });

  describe('String Formats - N/E Format', () => {
    it('should handle "N59 E10" format', () => {
      const result = CoordinateUtils.convertToLatLng('N59 E10');
      expect(result.lat).toBe(59);
      expect(result.lng).toBe(10);
    });

    it('should handle "N59.903 E10.724" format', () => {
      const result = CoordinateUtils.convertToLatLng('N59.903 E10.724');
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should handle "N59 E10" with spaces', () => {
      const result = CoordinateUtils.convertToLatLng('N 59 E 10');
      expect(result.lat).toBe(59);
      expect(result.lng).toBe(10);
    });
  });

  describe('Complex Coordinate Systems - Error Handling', () => {
    it('should throw helpful error for UTM coordinates', () => {
      expect(() => {
        CoordinateUtils.convertToLatLng('32N 500000 6600000');
      }).toThrow(
        'UTM coordinates detected: 32N 500000 6600000. UTM conversion requires specialized libraries like proj4js. Please convert to decimal degrees first.',
      );
    });

    it('should throw helpful error for UTM coordinates with prefix', () => {
      expect(() => {
        CoordinateUtils.convertToLatLng('UTM 32N 500000 6600000');
      }).toThrow(
        'UTM coordinates detected: UTM 32N 500000 6600000. UTM conversion requires specialized libraries like proj4js. Please convert to decimal degrees first.',
      );
    });

    it('should throw helpful error for MGRS coordinates', () => {
      expect(() => {
        CoordinateUtils.convertToLatLng('32V NM 00000 00000');
      }).toThrow(
        'MGRS coordinates detected: 32V NM 00000 00000. MGRS conversion requires specialized libraries. Please convert to decimal degrees first.',
      );
    });

    it('should throw helpful error for Plus Codes', () => {
      expect(() => {
        CoordinateUtils.convertToLatLng('9F2PXX2J+2V');
      }).toThrow(
        'Plus Code detected: 9F2PXX2J+2V. Plus Code conversion requires specialized libraries. Please convert to decimal degrees first.',
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should throw error for invalid coordinate format', () => {
      expect(() => {
        CoordinateUtils.convertToLatLng('invalid-coordinate');
      }).toThrow('Unable to convert coordinate: "invalid-coordinate"');
    });

    it('should throw error for empty string', () => {
      expect(() => {
        CoordinateUtils.convertToLatLng('');
      }).toThrow('Unable to convert coordinate: ""');
    });

    it('should throw error for null input', () => {
      expect(() => {
        CoordinateUtils.convertToLatLng(null);
      }).toThrow('Unable to convert coordinate: null');
    });

    it('should throw error for undefined input', () => {
      expect(() => {
        CoordinateUtils.convertToLatLng(undefined);
      }).toThrow('Unable to convert coordinate: undefined');
    });

    it('should throw error for array with insufficient elements', () => {
      expect(() => {
        CoordinateUtils.convertToLatLng([59.903]);
      }).toThrow('Unable to convert coordinate: [59.903]');
    });

    it('should throw error for object with invalid properties', () => {
      expect(() => {
        CoordinateUtils.convertToLatLng({ x: 59.903, y: 10.724 });
      }).toThrow('Unable to convert coordinate: {"x":59.903,"y":10.724}');
    });
  });

  describe('Pattern Priority and Conflict Resolution', () => {
    it('should prioritize DMS over comma-separated when DMS symbols are present', () => {
      const result = CoordinateUtils.convertToLatLng("59°54'N, 10°43'E");
      // Should be parsed as DMS, not comma-separated
      expect(result.lat).toBeCloseTo(59.9, 1);
      expect(result.lng).toBeCloseTo(10.7167, 4);
    });

    it('should prioritize DDM over comma-separated when degree symbols are present', () => {
      const result = CoordinateUtils.convertToLatLng("59°54.18'N, 10°43.44'E");
      // Should be parsed as DDM, not comma-separated
      expect(result.lat).toBeCloseTo(59.903, 3);
      expect(result.lng).toBeCloseTo(10.724, 3);
    });

    it('should prioritize DD with direction over comma-separated when direction symbols are present', () => {
      const result = CoordinateUtils.convertToLatLng('59.903°N, 10.724°E');
      // Should be parsed as DD with direction, not comma-separated
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });
  });

  describe('Real-World Coordinate Examples', () => {
    it('should handle GPS coordinates from smartphone', () => {
      const result = CoordinateUtils.convertToLatLng('59°54\'10.8"N 10°43\'26.4"E');
      expect(result.lat).toBeCloseTo(59.903, 3);
      expect(result.lng).toBeCloseTo(10.724, 3);
    });

    it('should handle coordinates from Google Maps', () => {
      const result = CoordinateUtils.convertToLatLng('59.903°N, 10.724°E');
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should handle coordinates from CSV import', () => {
      const result = CoordinateUtils.convertToLatLng('59.903,10.724');
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should handle coordinates from API response', () => {
      const result = CoordinateUtils.convertToLatLng({ lat: 59.903, lng: 10.724 });
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });

    it('should handle coordinates from GeoJSON', () => {
      const result = CoordinateUtils.convertToLatLng({ longitude: 10.724, latitude: 59.903 });
      expect(result.lat).toBe(59.903);
      expect(result.lng).toBe(10.724);
    });
  });

  describe('Performance and Scale', () => {
    it('should handle large numbers efficiently', () => {
      const result = CoordinateUtils.convertToLatLng([-180, 90]);
      expect(result.lat).toBe(-180);
      expect(result.lng).toBe(90);
    });

    it('should handle small decimal precision', () => {
      const result = CoordinateUtils.convertToLatLng([59.123456789, 10.987654321]);
      expect(result.lat).toBeCloseTo(59.123456789, 9);
      expect(result.lng).toBeCloseTo(10.987654321, 9);
    });

    it('should handle edge case coordinates', () => {
      // North Pole
      const northPole = CoordinateUtils.convertToLatLng([90, 0]);
      expect(northPole.lat).toBe(90);
      expect(northPole.lng).toBe(0);

      // South Pole
      const southPole = CoordinateUtils.convertToLatLng([-90, 0]);
      expect(southPole.lat).toBe(-90);
      expect(southPole.lng).toBe(0);

      // International Date Line (180 is clearly longitude, so GeoJSON order)
      const dateLine = CoordinateUtils.convertToLatLng([0, 180]);
      expect(dateLine.lat).toBe(180); // GeoJSON order: [lng, lat]
      expect(dateLine.lng).toBe(0);
    });
  });
});
