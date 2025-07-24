import { TurfHelper } from '../turf-helper';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { PolydrawConfig } from '../types/polydraw-interfaces';

export interface GeometryOperationResult {
  success: boolean;
  result?: Feature<Polygon | MultiPolygon>;
  results?: Feature<Polygon | MultiPolygon>[];
  error?: string;
}

export interface PolygonGeometryManagerDependencies {
  turfHelper: TurfHelper;
  config: PolydrawConfig;
}

/**
 * PolygonGeometryManager handles pure geometric calculations without any direct map interaction.
 * This includes merging, subtracting, simplifying, and other geometric operations on polygons.
 */
export class PolygonGeometryManager {
  private turfHelper: TurfHelper;
  private config: PolydrawConfig;

  constructor(dependencies: PolygonGeometryManagerDependencies) {
    console.log('PolygonGeometryManager constructor');
    this.turfHelper = dependencies.turfHelper;
    this.config = dependencies.config;
  }

  /**
   * Check if two polygons intersect using multiple detection methods
   */
  checkPolygonIntersection(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ): boolean {
    console.log('PolygonGeometryManager checkPolygonIntersection');
    // Method 1: Check if one polygon is completely within the other (for donut scenarios)
    try {
      const poly1WithinPoly2 = this.turfHelper.isPolygonCompletelyWithin(polygon1, polygon2);
      const poly2WithinPoly1 = this.turfHelper.isPolygonCompletelyWithin(polygon2, polygon1);

      if (poly1WithinPoly2 || poly2WithinPoly1) {
        return true;
      }
    } catch (error) {
      // Continue to next method
    }

    // Method 2: Try the original polygonIntersect
    try {
      const result = this.turfHelper.polygonIntersect(polygon1, polygon2);
      if (result) {
        return true;
      }
    } catch (error) {
      // Continue to next method
    }

    // Method 3: Try direct intersection check with area validation
    try {
      const intersection = this.turfHelper.getIntersection(polygon1, polygon2);
      if (
        intersection &&
        intersection.geometry &&
        (intersection.geometry.type === 'Polygon' || intersection.geometry.type === 'MultiPolygon')
      ) {
        // Check if the intersection has meaningful area (not just touching edges/points)
        const intersectionArea = this.turfHelper.getPolygonArea(intersection);
        if (intersectionArea > 0.000001) {
          // Very small threshold for meaningful intersection
          return true;
        }
      }
    } catch (error) {
      // Continue to next method
    }

    // Method 4: Check for vertex containment (one polygon's vertices inside the other)
    try {
      const coords1 = this.turfHelper.getCoords(polygon1);
      const coords2 = this.turfHelper.getCoords(polygon2);

      // Check if any vertex of polygon2 is inside polygon1
      for (const ring2 of coords2) {
        for (const coord of ring2[0]) {
          // First ring (outer ring)
          const point = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coord },
            properties: {},
          };
          if (this.turfHelper.isPolygonCompletelyWithin(point as any, polygon1)) {
            return true;
          }
        }
      }

      // Check if any vertex of polygon1 is inside polygon2
      for (const ring1 of coords1) {
        for (const coord of ring1[0]) {
          // First ring (outer ring)
          const point = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coord },
            properties: {},
          };
          if (this.turfHelper.isPolygonCompletelyWithin(point as any, polygon2)) {
            return true;
          }
        }
      }
    } catch (error) {
      // Continue to next method
    }

    // Method 5: Bounding box overlap check with distance validation
    // This method is too aggressive and causes false positives, so we'll disable it
    // Only use the more precise geometric methods above
    try {
      // Disabled: Bounding box overlap was causing false intersection detection
      // for separate polygons that don't actually intersect geometrically
      // If we reach this point, none of the precise geometric methods detected
      // an intersection, so we should return false rather than using a fallback
      // that might give false positives
    } catch (error) {
      // Continue to fallback
    }

    return false;
  }

  /**
   * Perform union operation on multiple polygons
   */
  unionPolygons(
    polygons: Feature<Polygon | MultiPolygon>[],
    newPolygon: Feature<Polygon | MultiPolygon>,
  ): GeometryOperationResult {
    console.log('PolygonGeometryManager unionPolygons');
    try {
      let result = newPolygon;

      for (const polygon of polygons) {
        // Check if this is a case where we should create a donut instead of a simple union
        const shouldCreateDonut = this.shouldCreateDonutPolygon(result, polygon);

        if (shouldCreateDonut) {
          // Create donut polygon by making the smaller polygon a hole in the larger one
          const donutPolygon = this.createDonutPolygon(result, polygon);
          if (donutPolygon) {
            result = donutPolygon;
          } else {
            // Fallback to regular union if donut creation fails
            const union = this.turfHelper.union(result, polygon);
            result = union;
          }
        } else {
          // Regular union operation
          const union = this.turfHelper.union(result, polygon);
          result = union;
        }
      }

      return {
        success: true,
        result: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in unionPolygons',
      };
    }
  }

  /**
   * Perform subtraction operation
   */
  subtractPolygon(
    existingPolygon: Feature<Polygon | MultiPolygon>,
    subtractPolygon: Feature<Polygon | MultiPolygon>,
  ): GeometryOperationResult {
    console.log('PolygonGeometryManager subtractPolygon');
    try {
      // Perform the difference operation (subtract)
      const result = this.turfHelper.polygonDifference(existingPolygon, subtractPolygon);

      if (result) {
        const coords = this.turfHelper.getCoords(result);
        const results: Feature<Polygon | MultiPolygon>[] = [];

        for (const value of coords) {
          results.push(this.turfHelper.getMultiPolygon([value]));
        }

        return {
          success: true,
          results: results,
        };
      } else {
        return {
          success: true,
          results: [],
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in subtractPolygon',
      };
    }
  }

  /**
   * Simplify a polygon by removing every other point
   */
  simplifyPolygon(polygon: Feature<Polygon | MultiPolygon>): GeometryOperationResult {
    console.log('PolygonGeometryManager simplifyPolygon');
    try {
      const coords = this.turfHelper.getCoords(polygon);
      if (!coords || coords.length === 0) {
        return { success: false, error: 'Invalid polygon coordinates' };
      }

      const simplifiedCoords = coords.map((ring) => {
        const outerRing = ring[0]; // Get the outer ring
        if (outerRing.length <= 4) {
          // Cannot simplify further
          return ring;
        }

        // Remove every other point to simplify
        const simplified: [number, number][] = [];
        for (let i = 0; i < outerRing.length; i += 2) {
          simplified.push(outerRing[i]);
        }

        // Ensure the simplified polygon is closed
        const firstPoint = simplified[0];
        const lastPoint = simplified[simplified.length - 1];
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
          simplified.push(firstPoint);
        }

        // Check if the simplified polygon is still valid
        if (simplified.length < 4) {
          return ring; // Return original if simplification results in invalid polygon
        }

        return [simplified, ...ring.slice(1)]; // Keep holes unchanged
      });

      const result = this.turfHelper.getMultiPolygon(simplifiedCoords);
      return {
        success: true,
        result: this.turfHelper.getTurfPolygon(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in simplifyPolygon',
      };
    }
  }

  /**
   * Convert polygon to bounding box
   */
  convertToBoundingBox(polygon: Feature<Polygon | MultiPolygon>): GeometryOperationResult {
    console.log('PolygonGeometryManager convertToBoundingBox');
    try {
      const result = this.turfHelper.convertToBoundingBoxPolygon(polygon);
      return {
        success: true,
        result: this.turfHelper.getTurfPolygon(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in convertToBoundingBox',
      };
    }
  }

  /**
   * Apply bezier curve to polygon
   */
  bezierifyPolygon(polygon: Feature<Polygon | MultiPolygon>): GeometryOperationResult {
    console.log('PolygonGeometryManager bezierifyPolygon');
    try {
      const coords = this.turfHelper.getCoords(polygon);
      const result = this.turfHelper.getBezierMultiPolygon(coords);
      return {
        success: true,
        result: this.turfHelper.getTurfPolygon(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in bezierifyPolygon',
      };
    }
  }

  /**
   * Double the elbows of a polygon
   */
  doubleElbowsPolygon(latlngs: L.LatLngLiteral[]): GeometryOperationResult {
    console.log('PolygonGeometryManager doubleElbowsPolygon');
    try {
      const doubleLatLngs = this.turfHelper.getDoubleElbowLatLngs(latlngs);
      const coords = [
        [doubleLatLngs.map((latlng) => [latlng.lng, latlng.lat] as [number, number])],
      ];
      const result = this.turfHelper.getMultiPolygon(coords);
      return {
        success: true,
        result: this.turfHelper.getTurfPolygon(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in doubleElbowsPolygon',
      };
    }
  }

  /**
   * Helper method to get polygon center
   */
  private getPolygonCenter(
    polygon: Feature<Polygon | MultiPolygon>,
  ): { lat: number; lng: number } | null {
    console.log('PolygonGeometryManager getPolygonCenter');
    try {
      if (!polygon || !polygon.geometry || !polygon.geometry.coordinates) {
        return null;
      }

      let coordinates;
      if (polygon.geometry.type === 'Polygon') {
        coordinates = polygon.geometry.coordinates[0]; // First ring (outer ring)
      } else if (polygon.geometry.type === 'MultiPolygon') {
        coordinates = polygon.geometry.coordinates[0][0]; // First polygon, first ring
      } else {
        return null;
      }

      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        return null;
      }

      // Calculate centroid
      let latSum = 0;
      let lngSum = 0;
      let count = 0;

      for (const coord of coordinates) {
        if (Array.isArray(coord) && coord.length >= 2) {
          const lng = coord[0];
          const lat = coord[1];

          if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
            lngSum += lng;
            latSum += lat;
            count++;
          }
        }
      }

      if (count === 0) {
        return null;
      }

      return {
        lat: latSum / count,
        lng: lngSum / count,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper method to get bounding box from polygon
   */
  private getBoundingBox(
    polygon: Feature<Polygon | MultiPolygon>,
  ): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
    console.log('PolygonGeometryManager getBoundingBox');
    try {
      if (!polygon || !polygon.geometry || !polygon.geometry.coordinates) {
        return null;
      }

      let coordinates;
      if (polygon.geometry.type === 'Polygon') {
        coordinates = polygon.geometry.coordinates[0]; // First ring (outer ring)
      } else if (polygon.geometry.type === 'MultiPolygon') {
        coordinates = polygon.geometry.coordinates[0][0]; // First polygon, first ring
      } else {
        return null;
      }

      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        return null;
      }

      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLng = Infinity;
      let maxLng = -Infinity;

      for (const coord of coordinates) {
        if (Array.isArray(coord) && coord.length >= 2) {
          const lng = coord[0];
          const lat = coord[1];

          if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          }
        }
      }

      if (
        minLat === Infinity ||
        maxLat === -Infinity ||
        minLng === Infinity ||
        maxLng === -Infinity
      ) {
        return null;
      }

      return { minLat, maxLat, minLng, maxLng };
    } catch (error) {
      return null;
    }
  }

  /**
   * Determine if two polygons should create a donut instead of a regular union
   */
  private shouldCreateDonutPolygon(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ): boolean {
    console.log('PolygonGeometryManager shouldCreateDonutPolygon');
    try {
      // NEVER create donuts - always merge polygons
      // The user specifically reported that small + large surrounding polygons
      // should merge, not create holes. This is the expected behavior.
      return false;
    } catch (error) {
      console.warn('Error in shouldCreateDonutPolygon:', error.message);
      return false;
    }
  }

  /**
   * Create a donut polygon from two intersecting polygons
   */
  private createDonutPolygon(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> | null {
    console.log('PolygonGeometryManager createDonutPolygon');
    try {
      // Determine which polygon should be the outer ring and which should be the hole
      const area1 = this.turfHelper.getPolygonArea(polygon1);
      const area2 = this.turfHelper.getPolygonArea(polygon2);

      let outerPolygon: Feature<Polygon | MultiPolygon>;
      let innerPolygon: Feature<Polygon | MultiPolygon>;

      if (area1 > area2) {
        outerPolygon = polygon1;
        innerPolygon = polygon2;
      } else {
        outerPolygon = polygon2;
        innerPolygon = polygon1;
      }

      // Check if the smaller polygon is completely within the larger one
      const innerWithinOuter = this.turfHelper.isPolygonCompletelyWithin(
        innerPolygon,
        outerPolygon,
      );

      if (innerWithinOuter) {
        // Create donut by making inner polygon a hole in outer polygon
        return this.createDonutFromContainment(outerPolygon, innerPolygon);
      } else {
        // Handle C-to-O scenario: create union first, then subtract intersection
        return this.createDonutFromIntersection(outerPolygon, innerPolygon);
      }
    } catch (error) {
      console.warn('Error in createDonutPolygon:', error.message);
      return null;
    }
  }

  /**
   * Create donut when one polygon is completely within another
   */
  private createDonutFromContainment(
    outerPolygon: Feature<Polygon | MultiPolygon>,
    innerPolygon: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> | null {
    console.log('PolygonGeometryManager createDonutFromContainment');
    try {
      // Get coordinates from both polygons
      const outerCoords = this.turfHelper.getCoords(outerPolygon);
      const innerCoords = this.turfHelper.getCoords(innerPolygon);

      // Create donut polygon: outer ring + inner ring as hole
      const donutCoords = [
        outerCoords[0][0], // Outer ring
        innerCoords[0][0], // Inner ring as hole
      ];

      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: donutCoords,
        },
        properties: {},
      };
    } catch (error) {
      console.warn('Error in createDonutFromContainment:', error.message);
      return null;
    }
  }

  /**
   * Create donut from intersecting polygons (C-to-O scenario)
   */
  private createDonutFromIntersection(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> | null {
    console.log('PolygonGeometryManager createDonutFromIntersection');
    try {
      // First, create union of the two polygons
      const union = this.turfHelper.union(polygon1, polygon2);
      if (!union) {
        return null;
      }

      // Get the intersection area
      const intersection = this.turfHelper.getIntersection(polygon1, polygon2);
      if (!intersection) {
        return union; // No intersection, return regular union
      }

      // Create donut by subtracting intersection from union
      const donut = this.turfHelper.polygonDifference(union, intersection);
      return donut;
    } catch (error) {
      console.warn('Error in createDonutFromIntersection:', error.message);
      return null;
    }
  }
}
