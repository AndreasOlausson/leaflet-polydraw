import * as L from 'leaflet';
import type { ILatLng } from '../polygon-helpers';

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
  static getLatLngsFromJson(feature: any): ILatLng[][] {
    let coord: ILatLng[][];

    if (feature) {
      if (feature.geometry.coordinates.length > 1 && feature.geometry.type === 'MultiPolygon') {
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]);
      } else if (
        feature.geometry.coordinates[0].length > 1 &&
        feature.geometry.type === 'Polygon'
      ) {
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0]);
      } else {
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]);
      }
    }

    return coord;
  }

  /**
   * Apply offset to polygon coordinates for dragging operations
   * @param latLngs Original coordinates
   * @param offsetLat Latitude offset
   * @param offsetLng Longitude offset
   * @returns Offset coordinates
   */
  static offsetPolygonCoordinates(latLngs: any, offsetLat: number, offsetLng: number): any {
    if (!latLngs) return latLngs;

    if (Array.isArray(latLngs[0])) {
      // Multi-dimensional array (polygon with holes or multipolygon)
      return latLngs.map((ring: any) => this.offsetPolygonCoordinates(ring, offsetLat, offsetLng));
    } else if (latLngs.lat !== undefined && latLngs.lng !== undefined) {
      // Single coordinate
      return {
        lat: latLngs.lat + offsetLat,
        lng: latLngs.lng + offsetLng,
      };
    } else {
      // Array of coordinates
      return latLngs.map((coord: any) =>
        this.offsetPolygonCoordinates(coord, offsetLat, offsetLng),
      );
    }
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
