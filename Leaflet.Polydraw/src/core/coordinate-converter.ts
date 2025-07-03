import * as L from 'leaflet';
import type { ILatLng, IBounds } from '../types/polydraw-interfaces';
import type { Feature, Polygon, MultiPolygon } from 'geojson';

/**
 * Coordinate conversion utilities following single responsibility principle
 */
export class CoordinateConverter {
  /**
   * Convert LatLng arrays to coordinate arrays for Turf.js operations
   * @param latlngs Array of LatLng arrays representing polygon rings
   * @returns Coordinate arrays suitable for Turf.js
   */
  static convertToCoords(latlngs: ILatLng[][]): number[][][] {
    const coords: number[][][] = [];

    if (latlngs.length > 1 && latlngs.length < 3) {
      const coordinates: number[][] = [];

      // Check if last polygon is within first (hole detection)
      const within = this.isWithin(
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
    } else if (latlngs.length > 2) {
      const coordinates: number[][] = [];

      for (let index = 1; index < latlngs.length - 1; index++) {
        const within = this.isWithin(
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
   * Extract LatLng coordinates from GeoJSON feature
   * @param feature GeoJSON feature to extract coordinates from
   * @returns Array of LatLng coordinates
   */
  static getLatLngsFromJson(feature: Feature<Polygon | MultiPolygon>): ILatLng[][] {
    let coord: ILatLng[][] = [];

    if (feature && feature.geometry) {
      if (feature.geometry.coordinates.length > 1 && feature.geometry.type === 'MultiPolygon') {
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]) as ILatLng[][];
      } else if (
        feature.geometry.type === 'Polygon' &&
        feature.geometry.coordinates[0].length > 1
      ) {
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0]) as ILatLng[][];
      } else if (feature.geometry.type === 'Polygon') {
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]) as ILatLng[][];
      }
    }

    return coord;
  }

  /**
   * Apply offset to polygon coordinates for dragging operations
   * @param latLngs Original coordinates (can be nested arrays or single coordinates)
   * @param offsetLat Latitude offset
   * @param offsetLng Longitude offset
   * @returns Offset coordinates with same structure as input
   */
  static offsetPolygonCoordinates(
    latLngs: ILatLng | ILatLng[] | ILatLng[][] | ILatLng[][][],
    offsetLat: number,
    offsetLng: number,
  ): ILatLng | ILatLng[] | ILatLng[][] | ILatLng[][][] {
    if (!latLngs) return latLngs;

    // Check if it's a single coordinate object
    if (this.isLatLngObject(latLngs)) {
      const coord = latLngs as ILatLng;
      return {
        lat: coord.lat + offsetLat,
        lng: coord.lng + offsetLng,
      };
    }

    // Check if it's an array
    if (Array.isArray(latLngs)) {
      if (latLngs.length === 0) return latLngs;

      // Check if first element is also an array (nested structure)
      if (Array.isArray(latLngs[0])) {
        return (latLngs as (ILatLng[] | ILatLng[][])[]).map((ring) =>
          this.offsetPolygonCoordinates(ring, offsetLat, offsetLng),
        ) as ILatLng[][] | ILatLng[][][];
      } else {
        // Array of coordinates
        return (latLngs as ILatLng[]).map((coord) =>
          this.offsetPolygonCoordinates(coord, offsetLat, offsetLng),
        ) as ILatLng[];
      }
    }

    return latLngs;
  }

  /**
   * Type guard to check if an object is a LatLng coordinate
   */
  private static isLatLngObject(obj: unknown): obj is ILatLng {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'lat' in obj &&
      'lng' in obj &&
      typeof (obj as ILatLng).lat === 'number' &&
      typeof (obj as ILatLng).lng === 'number'
    );
  }

  /**
   * Get coordinate information string for display
   * @param latlng LatLng coordinate
   * @returns Formatted coordinate string
   */
  static getLatLngInfoString(latlng: ILatLng): string {
    return `Latitude: ${latlng.lat} Longitude: ${latlng.lng}`;
  }

  /**
   * Simple within check for polygon containment
   * @param inner Inner polygon coordinates
   * @param outer Outer polygon coordinates
   * @returns True if inner is within outer
   */
  private static isWithin(inner: number[][], outer: number[][]): boolean {
    // Simplified containment check - in a real implementation,
    // this would use proper geometric algorithms
    if (!inner || !outer || inner.length === 0 || outer.length === 0) {
      return false;
    }

    // Basic bounding box check
    const innerBounds = this.getBounds(inner);
    const outerBounds = this.getBounds(outer);

    return (
      innerBounds.minLat >= outerBounds.minLat &&
      innerBounds.maxLat <= outerBounds.maxLat &&
      innerBounds.minLng >= outerBounds.minLng &&
      innerBounds.maxLng <= outerBounds.maxLng
    );
  }

  /**
   * Get bounding box of coordinate array
   */
  private static getBounds(coords: number[][]): {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } {
    let minLat = Infinity,
      maxLat = -Infinity;
    let minLng = Infinity,
      maxLng = -Infinity;

    coords.forEach(([lng, lat]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    return { minLat, maxLat, minLng, maxLng };
  }
}
