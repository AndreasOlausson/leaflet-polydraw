/**
 * CoordinateUtils - Handles coordinate conversions and transformations
 * This is a small, focused module for coordinate-related operations
 */
import * as L from 'leaflet';
import type { ILatLng } from './types/polydraw-interfaces';
import { GeometryUtils } from './geometry-utils';

export class CoordinateUtils {
  /**
   * Convert coordinate arrays to proper format for polygon creation
   */
  static convertToCoords(latlngs: ILatLng[][]): any[] {
    const coords = [];

    // latlngs length
    if (latlngs.length > 1 && latlngs.length < 3) {
      const coordinates = [];
      // Coords of last polygon
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
      // Within result
    } else if (latlngs.length > 2) {
      const coordinates = [];
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
   * Apply offset to polygon coordinates
   */
  static offsetPolygonCoordinates(latLngs: any, offsetLat: number, offsetLng: number): any {
    return GeometryUtils.offsetPolygonCoordinates(latLngs, offsetLat, offsetLng);
  }

  /**
   * Get latitude/longitude information string
   */
  static getLatLngInfoString(latlng: ILatLng): string {
    return 'Latitude: ' + latlng.lat + ' Longitude: ' + latlng.lng;
  }

  /**
   * Simple within check (placeholder for more complex logic)
   * This is a simplified version - in a real implementation this would use proper geometric algorithms
   */
  private static isWithin(inner: number[][], outer: number[][]): boolean {
    // Simplified check - just compare first points
    if (!inner || !outer || inner.length === 0 || outer.length === 0) {
      return false;
    }

    // This is a placeholder implementation
    // In the real implementation, this would use proper point-in-polygon algorithms
    return false;
  }
}
