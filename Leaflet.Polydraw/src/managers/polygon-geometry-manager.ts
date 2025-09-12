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
    // console.log('PolygonGeometryManager constructor');
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
    // console.log('PolygonGeometryManager checkPolygonIntersection');
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
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: coord },
            properties: {},
          };
          if (this.turfHelper.isPointInsidePolygon(point, polygon1)) {
            return true;
          }
        }
      }

      // Check if any vertex of polygon1 is inside polygon2
      for (const ring1 of coords1) {
        for (const coord of ring1[0]) {
          // First ring (outer ring)
          const point = {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: coord },
            properties: {},
          };
          if (this.turfHelper.isPointInsidePolygon(point, polygon2)) {
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
    // console.log('PolygonGeometryManager unionPolygons');
    try {
      let result = newPolygon;

      for (const polygon of polygons) {
        // Regular union operation
        const union = this.turfHelper.union(result, polygon);
        if (union) {
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
    // console.log('PolygonGeometryManager subtractPolygon');
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
    // console.log('PolygonGeometryManager simplifyPolygon');
    try {
      const coords = this.turfHelper.getCoords(polygon);
      if (!coords || coords.length === 0) {
        return { success: false, error: 'Invalid polygon coordinates' };
      }

      const processHoles = this.config.menuOperations?.simplify?.processHoles ?? true;

      const simplifiedCoords = coords.map((ring) => {
        const simplifiedRings: [number, number][][] = [];

        // Process each ring (outer ring + holes)
        for (let ringIndex = 0; ringIndex < ring.length; ringIndex++) {
          const currentRing = ring[ringIndex];
          const isOuterRing = ringIndex === 0;

          // Always process the outer ring, process holes only if config allows
          if (isOuterRing || processHoles) {
            if (currentRing.length <= 4) {
              // Cannot simplify further
              simplifiedRings.push(currentRing as [number, number][]);
              continue;
            }

            // Remove every other point to simplify
            const simplified: [number, number][] = [];
            for (let i = 0; i < currentRing.length; i += 2) {
              simplified.push(currentRing[i] as [number, number]);
            }

            // Ensure the simplified polygon is closed
            const firstPoint = simplified[0];
            const lastPoint = simplified[simplified.length - 1];
            if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
              simplified.push(firstPoint);
            }

            // Check if the simplified polygon is still valid
            if (simplified.length < 4) {
              simplifiedRings.push(currentRing as [number, number][]); // Return original if simplification results in invalid polygon
            } else {
              simplifiedRings.push(simplified);
            }
          } else {
            // Keep holes unchanged if processHoles is false
            simplifiedRings.push(currentRing as [number, number][]);
          }
        }

        return simplifiedRings;
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
    // console.log('PolygonGeometryManager convertToBoundingBox');
    try {
      const coords = this.turfHelper.getCoords(polygon);
      if (!coords || coords.length === 0) {
        return { success: false, error: 'Invalid polygon coordinates' };
      }

      const processHoles = this.config.menuOperations?.bbox?.processHoles ?? true;

      if (!processHoles) {
        // Only create bounding box for outer ring, ignore holes
        const result = this.turfHelper.convertToBoundingBoxPolygon(polygon);
        return {
          success: true,
          result: this.turfHelper.getTurfPolygon(result),
        };
      }

      // Process holes: create rectangular holes within the outer bounding box
      const bboxCoords = coords.map((ring) => {
        const bboxRings: [number, number][][] = [];

        // Process each ring (outer ring + holes)
        for (let ringIndex = 0; ringIndex < ring.length; ringIndex++) {
          const currentRing = ring[ringIndex];

          // Calculate bounding box for this ring
          let minLat = Infinity;
          let maxLat = -Infinity;
          let minLng = Infinity;
          let maxLng = -Infinity;

          for (const coord of currentRing) {
            if (Array.isArray(coord) && coord.length >= 2) {
              const lng = coord[0];
              const lat = coord[1];

              if (
                typeof lng === 'number' &&
                typeof lat === 'number' &&
                !isNaN(lng) &&
                !isNaN(lat)
              ) {
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
              }
            }
          }

          // Create rectangular coordinates for this ring
          if (
            minLat !== Infinity &&
            maxLat !== -Infinity &&
            minLng !== Infinity &&
            maxLng !== -Infinity
          ) {
            const rectangularRing: [number, number][] = [
              [minLng, minLat], // Bottom-left
              [minLng, maxLat], // Top-left
              [maxLng, maxLat], // Top-right
              [maxLng, minLat], // Bottom-right
              [minLng, minLat], // Close the ring
            ];
            bboxRings.push(rectangularRing);
          } else {
            // Fallback: keep original ring if bounding box calculation fails
            bboxRings.push(currentRing as [number, number][]);
          }
        }

        return bboxRings;
      });

      const result = this.turfHelper.getMultiPolygon(bboxCoords);
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
    // console.log('PolygonGeometryManager bezierifyPolygon');
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
  doubleElbowsPolygon(polygon: Feature<Polygon | MultiPolygon>): GeometryOperationResult {
    // console.log('PolygonGeometryManager doubleElbowsPolygon');
    try {
      const coords = this.turfHelper.getCoords(polygon);
      if (!coords || coords.length === 0) {
        return { success: false, error: 'Invalid polygon coordinates' };
      }

      const processHoles = this.config.menuOperations?.doubleElbows?.processHoles ?? true;

      const doubleElbowCoords = coords.map((ring) => {
        const processedRings: [number, number][][] = [];

        // Process each ring (outer ring + holes)
        for (let ringIndex = 0; ringIndex < ring.length; ringIndex++) {
          const currentRing = ring[ringIndex];
          const isOuterRing = ringIndex === 0;

          // Always process the outer ring, process holes only if config allows
          if (isOuterRing || processHoles) {
            // Convert coordinates to LatLng format for the turf helper
            const latlngs = currentRing.map((coord) => ({
              lat: (coord as [number, number])[1],
              lng: (coord as [number, number])[0],
            }));
            const doubleLatLngs = this.turfHelper.getDoubleElbowLatLngs(latlngs);
            const doubledCoords = doubleLatLngs.map(
              (latlng) => [latlng.lng, latlng.lat] as [number, number],
            );
            processedRings.push(doubledCoords);
          } else {
            // Keep holes unchanged if processHoles is false
            processedRings.push(currentRing as [number, number][]);
          }
        }

        return processedRings;
      });

      const result = this.turfHelper.getMultiPolygon(doubleElbowCoords);
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
}
