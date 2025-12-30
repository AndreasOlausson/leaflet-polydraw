/**
 * CoordinateUtils - Handles coordinate conversions and transformations
 * This is a small, focused module for coordinate-related operations
 */
import * as L from 'leaflet';
import { GeometryUtils } from './geometry-utils';
import type { TurfHelper } from './turf-helper';
import { leafletAdapter } from './compatibility/leaflet-adapter';

export class CoordinateUtils {
  /**
   * Convert coordinate arrays to proper format for polygon creation
   */
  static convertToCoords(latlngs: L.LatLngLiteral[][], turfHelper: TurfHelper): number[][][] {
    const coords: number[][][] = [];

    // latlngs length
    if (latlngs.length > 1 && latlngs.length < 3) {
      const coordinates: number[][] = [];
      // Coords of last polygon
      const within = turfHelper.isWithin(
        L.GeoJSON.latLngsToCoords(latlngs[latlngs.length - 1]),
        L.GeoJSON.latLngsToCoords(latlngs[0]),
      );
      if (within) {
        latlngs.forEach((polygon) => {
          coordinates.push(L.GeoJSON.latLngsToCoords(polygon));
        });
      } else {
        latlngs.forEach((polygon) => {
          coords.push([L.GeoJSON.latLngsToCoords(polygon)]);
        });
      }
      if (coordinates.length >= 1) {
        coords.push(coordinates);
      }
      // Within result
    } else if (latlngs.length > 2) {
      const coordinates: number[][] = [];
      for (let index = 1; index < latlngs.length - 1; index++) {
        const within = turfHelper.isWithin(
          L.GeoJSON.latLngsToCoords(latlngs[index]),
          L.GeoJSON.latLngsToCoords(latlngs[0]),
        );
        if (within) {
          latlngs.forEach((polygon) => {
            coordinates.push(L.GeoJSON.latLngsToCoords(polygon));
          });
          coords.push(coordinates);
        } else {
          latlngs.forEach((polygon) => {
            coords.push([L.GeoJSON.latLngsToCoords(polygon)]);
          });
        }
      }
    } else {
      coords.push([L.GeoJSON.latLngsToCoords(latlngs[0])]);
    }

    return coords;
  }

  /**
   * Apply offset to polygon coordinates
   */
  static offsetPolygonCoordinates(
    latLngs: L.LatLngLiteral[][],
    offsetLat: number,
    offsetLng: number,
  ): L.LatLngLiteral[][] {
    return GeometryUtils.offsetPolygonCoordinates(latLngs, offsetLat, offsetLng);
  }

  /**
   * Get latitude/longitude information string
   */
  static getLatLngInfoString(latlng: L.LatLngLiteral): string {
    return 'Latitude: ' + latlng.lat + ' Longitude: ' + latlng.lng;
  }

  /**
   * Convert any coordinate format to L.LatLng
   * Supports multiple input formats with smart auto-detection
   */
  static convertToLatLng(coordinate: unknown): L.LatLng {
    // Handle different input formats
    if (typeof coordinate === 'object' && coordinate !== null) {
      // Object format: {lat: 59.903, lng: 10.724} or {latitude: 59.903, longitude: 10.724}
      if ('lat' in coordinate && 'lng' in coordinate) {
        return leafletAdapter.createLatLng(
          (coordinate as { lat: number; lng: number }).lat,
          (coordinate as { lat: number; lng: number }).lng,
        );
      }
      if ('latitude' in coordinate && 'longitude' in coordinate) {
        return leafletAdapter.createLatLng(
          (coordinate as { latitude: number; longitude: number }).latitude,
          (coordinate as { latitude: number; longitude: number }).longitude,
        );
      }
      // GeoJSON format: {longitude: 10.724, latitude: 59.903} or {lng: 10.724, lat: 59.903}
      if ('longitude' in coordinate && 'latitude' in coordinate) {
        return leafletAdapter.createLatLng(
          (coordinate as { latitude: number; longitude: number }).latitude,
          (coordinate as { latitude: number; longitude: number }).longitude,
        );
      }
      if ('lng' in coordinate && 'lat' in coordinate) {
        return leafletAdapter.createLatLng(
          (coordinate as { lat: number; lng: number }).lat,
          (coordinate as { lat: number; lng: number }).lng,
        );
      }
    }

    // Array format: [59.903, 10.724] or [10.724, 59.903]
    if (Array.isArray(coordinate) && coordinate.length >= 2) {
      const [first, second] = coordinate;

      // Smart detection based on value ranges
      if (typeof first === 'number' && typeof second === 'number') {
        // Your examples: 172,1 vs 1,172
        if (first > 90 || second > 90) {
          // One value is clearly longitude (>90), use GeoJSON order
          return leafletAdapter.createLatLng(second, first); // [lng, lat]
        }
        if (first > 180 || second > 180) {
          // One value is clearly longitude (>180), use GeoJSON order
          return leafletAdapter.createLatLng(second, first); // [lng, lat]
        }
        // Default to lat,lng for ambiguous cases
        return leafletAdapter.createLatLng(first, second); // [lat, lng]
      }
    }

    // String format: Multiple coordinate systems supported
    if (typeof coordinate === 'string') {
      const coord = coordinate.trim();

      // Handle comma-separated: "59.903,10.724" (but not DMS formats)
      if (
        coord.includes(',') &&
        !coord.includes('°') &&
        !coord.includes("'") &&
        !coord.includes('"')
      ) {
        const parts = coord.split(',').map((p) => parseFloat(p.trim()));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          return this.convertToLatLng(parts); // Recursive call for array handling
        }
      }

      // Handle Degrees Minutes Seconds (DMS): "59°54'10.8\"N 10°43'26.4\"E"
      const dmsMatch = coord.match(
        /(\d+)°(\d+)'(?:(\d+(?:\.\d+)?)")?([NS])\s*,?\s*(\d+)°(\d+)'(?:(\d+(?:\.\d+)?)")?([EW])/i,
      );
      if (dmsMatch) {
        const [, latDeg, latMin, latSec, latDir, lngDeg, lngMin, lngSec, lngDir] = dmsMatch;
        const lat = parseFloat(latDeg) + parseFloat(latMin) / 60 + parseFloat(latSec || '0') / 3600;
        const lng = parseFloat(lngDeg) + parseFloat(lngMin) / 60 + parseFloat(lngSec || '0') / 3600;
        const finalLat = latDir.toUpperCase() === 'S' ? -lat : lat;
        const finalLng = lngDir.toUpperCase() === 'W' ? -lng : lng;
        return leafletAdapter.createLatLng(finalLat, finalLng);
      }

      // Handle Degrees + Decimal Minutes: "59°54.18'N 10°43.44'E"
      const ddmMatch = coord.match(
        /(\d+)°(\d+(?:\.\d+)?)'([NS])\s*,?\s*(\d+)°(\d+(?:\.\d+)?)'([EW])/i,
      );
      if (ddmMatch) {
        const [, latDeg, latMin, latDir, lngDeg, lngMin, lngDir] = ddmMatch;
        const lat = parseFloat(latDeg) + parseFloat(latMin) / 60;
        const lng = parseFloat(lngDeg) + parseFloat(lngMin) / 60;
        const finalLat = latDir.toUpperCase() === 'S' ? -lat : lat;
        const finalLng = lngDir.toUpperCase() === 'W' ? -lng : lng;
        return leafletAdapter.createLatLng(finalLat, finalLng);
      }

      // Handle Decimal Degrees with Direction: "59.903°N, 10.724°E"
      const ddMatch = coord.match(/(\d+(?:\.\d+)?)°?\s*([NS])\s*,\s*(\d+(?:\.\d+)?)°?\s*([EW])/i);
      if (ddMatch) {
        const [, lat, latDir, lng, lngDir] = ddMatch;
        const finalLat = latDir.toUpperCase() === 'S' ? -parseFloat(lat) : parseFloat(lat);
        const finalLng = lngDir.toUpperCase() === 'W' ? -parseFloat(lng) : parseFloat(lng);
        return leafletAdapter.createLatLng(finalLat, finalLng);
      }

      // Handle N/E format: "N59 E10"
      const neMatch = coord.match(/N\s*(\d+(?:\.\d+)?)\s+E\s*(\d+(?:\.\d+)?)/i);
      if (neMatch) {
        const [, lat, lng] = neMatch;
        return leafletAdapter.createLatLng(parseFloat(lat), parseFloat(lng));
      }

      // Handle UTM coordinates: "32N 500000 6600000" or "UTM 32N 500000 6600000"
      const utmMatch = coord.match(/(?:UTM\s+)?(\d+)([NS])\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/i);
      if (utmMatch) {
        // Note: UTM to Lat/Lng conversion is complex and requires specialized libraries
        // For now, we'll throw a helpful error message
        throw new Error(
          `UTM coordinates detected: ${coord}. UTM conversion requires specialized libraries like proj4js. Please convert to decimal degrees first.`,
        );
      }

      // Handle MGRS coordinates: "32V NM 00000 00000"
      const mgrsMatch = coord.match(/(\d+)([A-Z])\s+([A-Z]{2})\s+(\d+)\s+(\d+)/i);
      if (mgrsMatch) {
        throw new Error(
          `MGRS coordinates detected: ${coord}. MGRS conversion requires specialized libraries. Please convert to decimal degrees first.`,
        );
      }

      // Handle Plus Codes: "9F2PXX2J+2V"
      const plusCodeMatch = coord.match(
        /^[23456789CFGHJMPQRVWX]{2,3}[23456789CFGHJMPQRVWX]{3,7}\+[23456789CFGHJMPQRVWX]{2,3}$/i,
      );
      if (plusCodeMatch) {
        throw new Error(
          `Plus Code detected: ${coord}. Plus Code conversion requires specialized libraries. Please convert to decimal degrees first.`,
        );
      }
    }

    throw new Error(`Unable to convert coordinate: ${JSON.stringify(coordinate)}`);
  }

  /**
   * Convert any coordinate array format to L.LatLng[][][]
   * Used by addPredefinedPolygon for flexible input handling
   */
  static convertToLatLngArray(geoborders: unknown[][][]): L.LatLng[][][] {
    return geoborders.map((group) =>
      group.map((polygon) => polygon.map((coord) => this.convertToLatLng(coord))),
    );
  }
}
