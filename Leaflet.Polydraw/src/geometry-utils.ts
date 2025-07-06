/**
 * GeometryUtils - Simple geometric calculation utilities
 * This is a small, focused module with no external dependencies
 */
import type { ILatLng } from './types/polydraw-interfaces';

export class GeometryUtils {
  /**
   * Calculate angle between three points
   */
  static calculateAngle(p1: ILatLng, p2: ILatLng, p3: ILatLng): number {
    const v1 = { x: p1.lng - p2.lng, y: p1.lat - p2.lat };
    const v2 = { x: p3.lng - p2.lng, y: p3.lat - p2.lat };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosAngle = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  }

  /**
   * Calculate distance from point to line between two other points
   */
  static calculateDistanceFromLine(p1: ILatLng, point: ILatLng, p2: ILatLng): number {
    const A = point.lng - p1.lng;
    const B = point.lat - p1.lat;
    const C = p2.lng - p1.lng;
    const D = p2.lat - p1.lat;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    const param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = p1.lng;
      yy = p1.lat;
    } else if (param > 1) {
      xx = p2.lng;
      yy = p2.lat;
    } else {
      xx = p1.lng + param * C;
      yy = p1.lat + param * D;
    }

    const dx = point.lng - xx;
    const dy = point.lat - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate centroid of polygon
   */
  static calculateCentroid(latlngs: ILatLng[]): ILatLng {
    let sumLat = 0,
      sumLng = 0;
    for (const point of latlngs) {
      sumLat += point.lat;
      sumLng += point.lng;
    }
    return {
      lat: sumLat / latlngs.length,
      lng: sumLng / latlngs.length,
    };
  }

  /**
   * Calculate distance between two points
   */
  static calculateDistance(p1: ILatLng, p2: ILatLng): number {
    const dx = p1.lng - p2.lng;
    const dy = p1.lat - p2.lat;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Apply offset to polygon coordinates
   */
  static offsetPolygonCoordinates(latLngs: any, offsetLat: number, offsetLng: number): any {
    if (!latLngs) return latLngs;

    if (Array.isArray(latLngs[0])) {
      // Multi-dimensional array (polygon with holes or multipolygon)
      return latLngs.map((ring: any) =>
        GeometryUtils.offsetPolygonCoordinates(ring, offsetLat, offsetLng),
      );
    } else if (latLngs.lat !== undefined && latLngs.lng !== undefined) {
      // Single coordinate
      return {
        lat: latLngs.lat + offsetLat,
        lng: latLngs.lng + offsetLng,
      };
    } else {
      // Array of coordinates
      return latLngs.map((coord: any) =>
        GeometryUtils.offsetPolygonCoordinates(coord, offsetLat, offsetLng),
      );
    }
  }
}
