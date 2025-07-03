import * as L from 'leaflet';

/**
 * Polygon validation utilities following single responsibility principle
 */
export class PolygonValidator {
  /**
   * Validate polygon input structure and coordinates
   * @param geographicBorders Array of polygon groups to validate
   * @throws Error if validation fails
   */
  static validatePolygonInput(geographicBorders: L.LatLng[][][]): void {
    if (!geographicBorders || geographicBorders.length === 0) {
      throw new Error('Cannot add empty polygon array');
    }

    for (let groupIndex = 0; groupIndex < geographicBorders.length; groupIndex++) {
      const group = geographicBorders[groupIndex];

      if (!Array.isArray(group)) {
        throw new Error(`Invalid polygon structure at group ${groupIndex}: expected array`);
      }

      for (let ringIndex = 0; ringIndex < group.length; ringIndex++) {
        const ring = group[ringIndex];
        this.validateRing(ring, groupIndex, ringIndex);
      }
    }
  }

  /**
   * Validate a single polygon ring
   */
  private static validateRing(ring: L.LatLng[], groupIndex: number, ringIndex: number): void {
    if (!Array.isArray(ring)) {
      throw new Error(
        `Invalid ring structure at group ${groupIndex}, ring ${ringIndex}: expected array`,
      );
    }

    // Check minimum points for a valid polygon (need at least 4 points to form a closed polygon)
    if (ring.length < 4) {
      throw new Error(
        `Insufficient points in polygon at group ${groupIndex}, ring ${ringIndex}: need at least 4 points for a closed polygon, got ${ring.length}`,
      );
    }

    this.validateClosure(ring, groupIndex, ringIndex);
    this.validateUniquePoints(ring, groupIndex, ringIndex);
    this.validateCoordinates(ring, groupIndex, ringIndex);
  }

  /**
   * Validate polygon closure (first and last points must match)
   */
  private static validateClosure(ring: L.LatLng[], groupIndex: number, ringIndex: number): void {
    const firstPoint = ring[0];
    const lastPoint = ring[ring.length - 1];

    if (firstPoint.lat !== lastPoint.lat || firstPoint.lng !== lastPoint.lng) {
      throw new Error(
        `Polygon not properly closed at group ${groupIndex}, ring ${ringIndex}: first and last points must be identical`,
      );
    }
  }

  /**
   * Validate unique points (no duplicates except closure)
   */
  private static validateUniquePoints(
    ring: L.LatLng[],
    groupIndex: number,
    ringIndex: number,
  ): void {
    const uniquePoints = new Set();

    for (let pointIndex = 0; pointIndex < ring.length - 1; pointIndex++) {
      // Exclude last point since it should equal first
      const point = ring[pointIndex];
      const pointKey = `${point.lat},${point.lng}`;

      if (uniquePoints.has(pointKey)) {
        throw new Error(
          `Duplicate point found at group ${groupIndex}, ring ${ringIndex}, point ${pointIndex}: polygon has insufficient unique points`,
        );
      }
      uniquePoints.add(pointKey);
    }

    // Need at least 3 unique points to form a valid polygon (excluding the closing point)
    if (uniquePoints.size < 3) {
      throw new Error(
        `Insufficient unique points in polygon at group ${groupIndex}, ring ${ringIndex}: need at least 3 unique points, got ${uniquePoints.size}`,
      );
    }
  }

  /**
   * Validate individual coordinates
   */
  private static validateCoordinates(
    ring: L.LatLng[],
    groupIndex: number,
    ringIndex: number,
  ): void {
    for (let pointIndex = 0; pointIndex < ring.length; pointIndex++) {
      const point = ring[pointIndex];
      this.validatePoint(point, groupIndex, ringIndex, pointIndex);
    }
  }

  /**
   * Validate a single coordinate point
   */
  private static validatePoint(
    point: any,
    groupIndex: number,
    ringIndex: number,
    pointIndex: number,
  ): void {
    if (!point || typeof point !== 'object') {
      throw new Error(
        `Invalid coordinate at group ${groupIndex}, ring ${ringIndex}, point ${pointIndex}: expected object with lat/lng`,
      );
    }

    // Check for valid latitude
    if (typeof point.lat !== 'number' || isNaN(point.lat)) {
      throw new Error(
        `Invalid latitude at group ${groupIndex}, ring ${ringIndex}, point ${pointIndex}: ${point.lat}`,
      );
    }

    // Check for valid longitude
    if (typeof point.lng !== 'number' || isNaN(point.lng)) {
      throw new Error(
        `Invalid longitude at group ${groupIndex}, ring ${ringIndex}, point ${pointIndex}: ${point.lng}`,
      );
    }

    // Check latitude bounds
    if (point.lat < -90 || point.lat > 90) {
      throw new Error(
        `Latitude out of bounds at group ${groupIndex}, ring ${ringIndex}, point ${pointIndex}: ${point.lat} (must be between -90 and 90)`,
      );
    }

    // Check longitude bounds
    if (point.lng < -180 || point.lng > 180) {
      throw new Error(
        `Longitude out of bounds at group ${groupIndex}, ring ${ringIndex}, point ${pointIndex}: ${point.lng} (must be between -180 and 180)`,
      );
    }
  }
}
