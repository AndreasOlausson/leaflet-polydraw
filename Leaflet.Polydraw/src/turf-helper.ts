import {
  featureCollection,
  multiPolygon,
  point,
  lineString,
  polygon,
  type Coord,
} from '@turf/helpers';
import centerOfMass from '@turf/center-of-mass';
import lineIntersect from '@turf/line-intersect';
import union from '@turf/union';
import intersect from '@turf/intersect';
import difference from '@turf/difference';
import convex from '@turf/convex';
import explode from '@turf/explode';
import buffer from '@turf/buffer';
import simplify from '@turf/simplify';
import { getCoords } from '@turf/invariant';
import kinks from '@turf/kinks';
import unkinkPolygon from '@turf/unkink-polygon';
import { featureEach } from '@turf/meta';
import midpoint from '@turf/midpoint';
import area from '@turf/area';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import distance from '@turf/distance';
import booleanWithin from '@turf/boolean-within';
import booleanEqual from '@turf/boolean-equal';
import bbox from '@turf/bbox';
import bboxPolygon from '@turf/bbox-polygon';
import nearestPoint from '@turf/nearest-point';
import polygonToLine from '@turf/polygon-to-line';
import lineToPolygon from '@turf/line-to-polygon';
import bezierSpline from '@turf/bezier-spline';
import centroid from '@turf/centroid';
import length from '@turf/length';
// @ts-expect-error - concaveman doesn't have types
import concaveman from 'concaveman';
import type { Feature, Polygon, MultiPolygon, Position, Point } from 'geojson';
import * as L from 'leaflet';
import defaultConfig from './config.json';
import { isTestEnvironment } from './utils';

/**
 * Enhanced GeoJSON feature with polydraw-specific metadata
 */
interface PolydrawFeature extends Feature<Polygon | MultiPolygon> {
  _polydrawHoleTraversalOccurred?: boolean;
}

export class TurfHelper {
  private config: typeof defaultConfig = defaultConfig;

  constructor(config: object) {
    this.config = { ...defaultConfig, ...config };
  }

  union(
    poly1: Feature<Polygon | MultiPolygon>,
    poly2: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> | null {
    try {
      const fc = featureCollection([poly1, poly2]);
      const u = union(fc);
      return u ? this.getTurfPolygon(u) : null;
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn('Error in union:', error instanceof Error ? error.message : String(error));
      }
      return null;
    }
  }

  /**
   * Create polygon from drawing trace using configured method
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createPolygonFromTrace(feature: Feature<any>): Feature<Polygon | MultiPolygon> {
    const method = this.config.polygonCreation?.method || 'concaveman';

    switch (method) {
      case 'concaveman':
        return this.turfConcaveman(feature);
      case 'convex':
        return this.createConvexPolygon(feature);
      case 'direct':
        return this.createDirectPolygon(feature);
      case 'buffer':
        return this.createBufferedPolygon(feature);
      default:
        if (!isTestEnvironment()) {
          console.warn(`Unknown polygon creation method: ${method}, falling back to concaveman`);
        }
        return this.turfConcaveman(feature);
    }
  }

  /**
   * Original concaveman implementation
   */
  turfConcaveman(feature: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> {
    const points = explode(feature);
    const coordinates = points.features.map((f) => f.geometry.coordinates);
    return multiPolygon([[concaveman(coordinates)]]);
  }

  /**
   * Create convex hull polygon (simplest, fewest edges)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createConvexPolygon(feature: Feature<any>): Feature<Polygon | MultiPolygon> {
    const points = explode(feature);
    const convexHull = convex(points);

    if (!convexHull) {
      // Fallback to direct polygon if convex hull fails
      return this.createDirectPolygon(feature);
    }

    return this.getTurfPolygon(convexHull);
  }

  /**
   * Create polygon directly from line coordinates (moderate edge count)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createDirectPolygon(feature: Feature<any>): Feature<Polygon | MultiPolygon> {
    let coordinates: number[][];

    if (feature.geometry.type === 'LineString') {
      coordinates = feature.geometry.coordinates;
    } else if (feature.geometry.type === 'Polygon') {
      coordinates = feature.geometry.coordinates[0];
    } else {
      // Fallback: extract coordinates from any geometry
      const points = explode(feature);
      coordinates = points.features.map((f) => f.geometry.coordinates);
    }

    // Ensure polygon is closed
    if (coordinates.length > 0) {
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];

      if (first[0] !== last[0] || first[1] !== last[1]) {
        coordinates.push([first[0], first[1]]);
      }
    }

    // Need at least 4 points for a valid polygon (3 + closing point)
    if (coordinates.length < 4) {
      if (!isTestEnvironment()) {
        console.warn('Not enough points for direct polygon, falling back to concaveman');
      }
      return this.turfConcaveman(feature);
    }

    return multiPolygon([[coordinates]]);
  }

  /**
   * Create polygon using buffer method (smooth curves)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createBufferedPolygon(feature: Feature<any>): Feature<Polygon | MultiPolygon> {
    try {
      // Convert to line if needed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let line: Feature<any>;

      if (feature.geometry.type === 'LineString') {
        line = feature;
      } else {
        // Convert polygon or other geometry to line
        const points = explode(feature);
        const coordinates = points.features.map((f) => f.geometry.coordinates);
        line = lineString(coordinates);
      }

      // Apply small buffer to create polygon
      const buffered = buffer(line, 0.001, { units: 'kilometers' });

      if (!buffered) {
        return this.createDirectPolygon(feature);
      }

      return this.getTurfPolygon(buffered);
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Buffer polygon creation failed:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return this.createDirectPolygon(feature);
    }
  }

  getSimplified(
    polygon: Feature<Polygon | MultiPolygon>,
    dynamicTolerance: boolean = false,
  ): Feature<Polygon | MultiPolygon> {
    const simplificationMode = this.config.polygonCreation?.simplification?.mode || 'simple';

    if (simplificationMode === 'simple') {
      // Simple single-pass simplification (like the original Angular version)
      const tolerance = {
        tolerance: this.config.polygonCreation?.simplification?.tolerance || 0.0001,
        highQuality: this.config.polygonCreation?.simplification?.highQuality || false,
        mutate: false,
      };

      const simplified = simplify(polygon, tolerance);
      return simplified;
    } else if (simplificationMode === 'dynamic') {
      // Original dynamic simplification
      const numOfEdges = polygon.geometry.coordinates[0][0].length;
      const tolerance = this.config.simplification.simplifyTolerance;

      if (!dynamicTolerance) {
        const simplified = simplify(polygon, tolerance);
        return simplified;
      } else {
        let simplified = simplify(polygon, tolerance);
        const fractionGuard = this.config.simplification.dynamicMode.fractionGuard;
        const multiplier = this.config.simplification.dynamicMode.multiplier;
        while (
          simplified.geometry.coordinates[0][0].length > 4 &&
          simplified.geometry.coordinates[0][0].length / (numOfEdges + 2) > fractionGuard
        ) {
          tolerance.tolerance = tolerance.tolerance * multiplier;
          simplified = simplify(polygon, tolerance);
        }
        return simplified;
      }
    } else if (simplificationMode === 'none') {
      // No simplification

      return polygon;
    } else {
      // Fallback to simple mode
      if (!isTestEnvironment()) {
        console.warn(`Unknown simplification mode: ${simplificationMode}, falling back to simple`);
      }
      const tolerance = {
        tolerance: 0.0001,
        highQuality: false,
        mutate: false,
      };
      return simplify(polygon, tolerance);
    }
  }

  getTurfPolygon(polygon: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> {
    let turfPolygon;
    if (polygon.geometry.type === 'Polygon') {
      turfPolygon = multiPolygon([polygon.geometry.coordinates]);
    } else {
      turfPolygon = multiPolygon(polygon.geometry.coordinates);
    }
    return turfPolygon;
  }

  getMultiPolygon(polygonArray: Position[][][]): Feature<Polygon | MultiPolygon> {
    return multiPolygon(polygonArray);
  }

  getKinks(feature: Feature<Polygon | MultiPolygon>) {
    try {
      // Validate input feature
      if (!feature || !feature.geometry || !feature.geometry.coordinates) {
        return [feature];
      }

      // Remove duplicate vertices before processing
      const cleanedFeature = this.removeDuplicateVertices(feature);

      // Additional validation after cleaning
      if (!cleanedFeature || !cleanedFeature.geometry || !cleanedFeature.geometry.coordinates) {
        if (!isTestEnvironment()) {
          console.warn('Feature became invalid after cleaning in getKinks');
        }
        return [feature];
      }

      // 🎯 HOLE-AWARE SPLITTING: Check if the polygon has holes
      const hasHoles = this.polygonHasHoles(cleanedFeature);

      if (hasHoles) {
        // For polygons with holes, we need special handling
        return this.getKinksWithHolePreservation(cleanedFeature);
      } else {
        // For simple polygons, use the standard unkink approach
        const unkink = unkinkPolygon(cleanedFeature);
        const coordinates: Feature<Polygon | MultiPolygon>[] = [];
        featureEach(unkink, (current) => {
          coordinates.push(current);
        });
        return coordinates;
      }
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error processing kinks:',
          error instanceof Error ? error.message : String(error),
        );
      }
      // Return the original feature as a fallback
      return [feature];
    }
  }

  getCoords(feature: Feature<Polygon | MultiPolygon>) {
    return getCoords(feature);
  }

  hasKinks(feature: Feature<Polygon | MultiPolygon>) {
    const k = kinks(feature);
    return k.features.length > 0;
  }

  /**
   * Get the convex hull of a polygon
   */
  getConvexHull(polygon: Feature<Polygon | MultiPolygon>): Feature<Polygon> | null {
    try {
      const fc = featureCollection([polygon]);
      return convex(fc);
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error in getConvexHull:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return null;
    }
  }

  /**
   * Calculate midpoint between two LatLngLiteral points
   */
  getMidpoint(point1: L.LatLngLiteral, point2: L.LatLngLiteral): L.LatLngLiteral {
    const p1 = point([point1.lng, point1.lat]);
    const p2 = point([point2.lng, point2.lat]);

    const mp = midpoint(p1, p2);

    return {
      lat: mp.geometry.coordinates[1],
      lng: mp.geometry.coordinates[0],
    };
  }

  polygonIntersect(
    polygon: Feature<Polygon | MultiPolygon>,
    latlngs: Feature<Polygon | MultiPolygon>,
  ): boolean {
    try {
      // Validate input features
      if (
        !polygon ||
        !polygon.geometry ||
        !polygon.geometry.coordinates ||
        !latlngs ||
        !latlngs.geometry ||
        !latlngs.geometry.coordinates
      ) {
        if (!isTestEnvironment()) {
          console.warn('Invalid features passed to polygonIntersect');
        }
        return false;
      }

      // Method 1: Try direct intersection using intersect with FeatureCollection
      try {
        const fc = featureCollection([polygon, latlngs]);
        const intersection = intersect(fc);

        if (
          intersection &&
          intersection.geometry &&
          (intersection.geometry.type === 'Polygon' ||
            intersection.geometry.type === 'MultiPolygon')
        ) {
          // Check if the intersection has meaningful area
          const polygonArea = area(intersection);
          if (polygonArea > 0.000001) {
            // Very small threshold for meaningful intersection
            return true;
          }
        }
      } catch (error) {
        // Continue to fallback methods
      }

      // Method 2: Check if any vertices of one polygon are inside the other
      try {
        const points1 = explode(polygon);
        const points2 = explode(latlngs);

        for (const point of points2.features) {
          if (booleanPointInPolygon(point, polygon)) {
            return true;
          }
        }

        for (const point of points1.features) {
          if (booleanPointInPolygon(point, latlngs)) {
            return true;
          }
        }
      } catch (error) {
        // Continue to next method
      }

      // Method 3: Check for edge intersections using line intersection
      try {
        const coords1 = getCoords(polygon);
        const coords2 = getCoords(latlngs);

        for (const ring1 of coords1) {
          const outerRing1 = ring1[0]; // Get outer ring
          for (let i = 0; i < outerRing1.length - 1; i++) {
            const line1 = lineString([outerRing1[i], outerRing1[i + 1]]);

            for (const ring2 of coords2) {
              const outerRing2 = ring2[0]; // Get outer ring
              for (let j = 0; j < outerRing2.length - 1; j++) {
                const line2 = lineString([outerRing2[j], outerRing2[j + 1]]);

                try {
                  const intersection = lineIntersect(line1, line2);
                  if (intersection && intersection.features && intersection.features.length > 0) {
                    return true;
                  }
                } catch (lineError) {
                  // Continue checking other line pairs
                }
              }
            }
          }
        }
      } catch (error) {
        // Continue to fallback
      }

      // Method 4: Bounding box overlap check as final fallback
      // This method is too aggressive and causes false positives, so we'll disable it
      // Only use the more precise geometric methods above
      try {
        // Disabled: Bounding box overlap was causing false intersection detection
        // for separate polygons that don't actually intersect geometrically
        // If we reach this point, none of the precise geometric methods detected
        // an intersection, so we should return false rather than using a fallback
        // that might give false positives
      } catch (error) {
        if (!isTestEnvironment()) {
          console.warn(
            'Error in bounding box check:',
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      return false;
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error in polygonIntersect:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return false;
    }
  }

  getIntersection(
    poly1: Feature<Polygon | MultiPolygon>,
    poly2: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> | null {
    try {
      const fc = featureCollection([poly1, poly2]);
      const result = intersect(fc);

      // Validate that the result is actually a polygon or multipolygon
      if (
        result &&
        result.geometry &&
        (result.geometry.type === 'Polygon' || result.geometry.type === 'MultiPolygon')
      ) {
        return result as Feature<Polygon | MultiPolygon>;
      }

      // Return null if intersection doesn't result in a polygon
      return null;
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error in getIntersection:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDistance(point1: any, point2: any): number {
    return distance(point1, point2);
  }

  isWithin(polygon1: Position[], polygon2: Position[]): boolean {
    return booleanWithin(polygon([polygon1]), polygon([polygon2]));
  }

  /**
   * Check if one polygon is completely within another polygon
   */
  isPolygonCompletelyWithin(
    innerPolygon: Feature<Polygon | MultiPolygon>,
    outerPolygon: Feature<Polygon | MultiPolygon>,
  ): boolean {
    try {
      return booleanWithin(innerPolygon, outerPolygon);
    } catch (error) {
      // Fallback: check if all vertices of inner polygon are within outer polygon
      const innerCoords = getCoords(innerPolygon);
      const outerCoords = getCoords(outerPolygon);

      // For each ring in the inner polygon
      for (const innerRing of innerCoords) {
        for (const ring of innerRing) {
          for (const coord of ring) {
            const pt = point(coord);
            let isInside = false;

            // Check against each ring in the outer polygon
            for (const outerRing of outerCoords) {
              for (const outerRingCoords of outerRing) {
                const outerPoly = polygon([outerRingCoords]);
                if (booleanPointInPolygon(pt, outerPoly)) {
                  isInside = true;
                  break;
                }
              }
              if (isInside) break;
            }

            if (!isInside) {
              return false;
            }
          }
        }
      }

      return true;
    }
  }
  /**
   * Normalize various point-like inputs into a GeoJSON Feature<Point>.
   * Supports GeoJSON Feature<Point>, Turf Position [lng, lat], and Leaflet LatLngLiteral.
   */
  private toPointFeature(
    pt: Feature<Point> | Position | L.LatLngLiteral | { geometry?: { coordinates?: number[] } },
  ): Feature<Point> {
    // Case 1: Already a Feature<Point>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((pt as Feature<Point>)?.type === 'Feature' && (pt as any).geometry?.type === 'Point') {
      return pt as Feature<Point>;
    }

    // Case 2: Turf Position [lng, lat]
    if (
      Array.isArray(pt) &&
      pt.length >= 2 &&
      typeof pt[0] === 'number' &&
      typeof pt[1] === 'number'
    ) {
      return point(pt as Position);
    }

    // Case 3: Leaflet LatLngLiteral {lat, lng}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (pt as any)?.lat === 'number' && typeof (pt as any)?.lng === 'number') {
      const p = pt as L.LatLngLiteral;
      return point([p.lng, p.lat]);
    }

    // Case 4: Generic object with geometry.coordinates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((pt as any)?.geometry?.coordinates && Array.isArray((pt as any).geometry.coordinates)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return point((pt as any).geometry.coordinates as Position);
    }

    // Fallback – throw to make caller handle gracefully
    throw new Error('Unsupported point format provided to toPointFeature');
  }

  /**
   * Check if a point lies within a polygon.
   * Accepts Feature<Point>, Turf Position [lng, lat], or Leaflet LatLngLiteral.
   * This normalization prevents noisy console warnings in tests.
   */
  isPointInsidePolygon(
    pt: Feature<Point> | Position | L.LatLngLiteral,
    polygon: Feature<Polygon | MultiPolygon>,
  ): boolean {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pointFeature = this.toPointFeature(pt as any);
      return booleanPointInPolygon(pointFeature, polygon);
    } catch (error) {
      // Be quiet in failure – just return false to avoid noisy test output
      return false;
    }
  }
  /**
   * Checks if two polygons are equal.
   * @param polygon1 First polygon.
   * @param polygon2 Second polygon.
   */
  equalPolygons(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ): boolean {
    return booleanEqual(polygon1, polygon2);
  }

  convertToBoundingBoxPolygon(polygon: Feature<Polygon | MultiPolygon>): Feature<Polygon> {
    const bboxCoords = bbox(polygon.geometry);
    const bboxPoly = bboxPolygon(bboxCoords);
    // TODO: Add Compass logic if needed
    return bboxPoly;
  }

  polygonToMultiPolygon(poly: Feature<Polygon>): Feature<MultiPolygon> {
    const multi = multiPolygon([poly.geometry.coordinates]);
    return multi;
  }

  injectPointToPolygon(
    polygon: Feature<Polygon | MultiPolygon>,
    point: Position,
    ringIndex: number,
  ): Feature<Polygon | MultiPolygon> {
    // Clone polygon to avoid modifying original
    const newPoly = JSON.parse(JSON.stringify(polygon));

    let targetRing: Position[];

    if (newPoly.geometry.type === 'MultiPolygon') {
      // For MultiPolygon, we assume the first polygon is the target
      targetRing = newPoly.geometry.coordinates[0][ringIndex];
    } else if (newPoly.geometry.type === 'Polygon') {
      targetRing = newPoly.geometry.coordinates[ringIndex];
    } else {
      // Should not happen with proper input
      return newPoly; // NOSONAR: Early return for invalid geometry type
    }

    if (!targetRing) {
      // Invalid ring index
      return newPoly; // NOSONAR: Early return for invalid ring index
    }

    // Find the closest edge and insert the point
    let minDistance = Infinity;
    let insertIndex = 0;

    for (let i = 0; i < targetRing.length - 1; i++) {
      const edgeStart = targetRing[i];
      const edgeEnd = targetRing[i + 1];
      const distance = this.distanceToLineSegment(point, edgeStart, edgeEnd);

      if (distance < minDistance) {
        minDistance = distance;
        insertIndex = i + 1;
      }
    }

    // Modify the cloned polygon by inserting the point into the target ring
    // This modifies newPoly by reference through targetRing
    targetRing.splice(insertIndex, 0, point);

    // NOSONAR: All return paths return newPoly, but it's modified by reference above
    // The targetRing.splice() operation modifies the newPoly object, making each return unique
    return newPoly;
  }

  private distanceToLineSegment(point: number[], lineStart: number[], lineEnd: number[]): number {
    const A = point[0] - lineStart[0];
    const B = point[1] - lineStart[1];
    const C = lineEnd[0] - lineStart[0];
    const D = lineEnd[1] - lineStart[1];

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    const param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = lineStart[0];
      yy = lineStart[1];
    } else if (param > 1) {
      xx = lineEnd[0];
      yy = lineEnd[1];
    } else {
      xx = lineStart[0] + param * C;
      yy = lineStart[1] + param * D;
    }

    const dx = point[0] - xx;
    const dy = point[1] - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  polygonDifference(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> | null {
    try {
      // In Turf 7.x, difference expects a FeatureCollection with multiple features
      const fc = featureCollection([polygon1, polygon2]);
      const diff = difference(fc);

      const result = diff ? this.getTurfPolygon(diff) : null;
      return result;
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error in polygonDifference:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return null;
    }
  }

  getBoundingBoxCompassPosition(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _polygon: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _MarkerPosition: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _useOffset: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _offsetDirection: any,
  ) {
    void _polygon; // make lint happy
    void _MarkerPosition; // make lint happy
    void _useOffset; // make lint happy
    void _offsetDirection; // make lint happy
    // TODO: Implement with Compass
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getNearestPointIndex(targetPoint: Coord, points: any): number {
    const index = nearestPoint(targetPoint, points).properties.featureIndex;
    return index;
  }

  /**
   * Convert LatLngLiteral object to js coordinate array format.
   *
   * This method serves as a semantic interface for coordinate conversion,
   * ensuring consistent lng/lat order when interfacing with js functions.
   * While simple, it provides a clear contract and future-proofing for any
   * coordinate validation or transformation that might be needed later.
   *
   * @param point - LatLngLiteral object with lat/lng properties
   * @returns js coordinate array in [lng, lat] format
   */
  getCoord(point: L.LatLngLiteral): Coord {
    return [point.lng, point.lat];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFeaturePointCollection(points: L.LatLngLiteral[]): any {
    const pts: Feature<Point>[] = [];
    points.forEach((v) => {
      const p = point([v.lng, v.lat], {});
      pts.push(p);
    });
    const fc = featureCollection(pts);
    return fc;
  }

  getPolygonArea(poly: Feature<Polygon | MultiPolygon>): number {
    const polygonArea = area(poly);
    return polygonArea;
  }

  getPolygonPerimeter(poly: Feature<Polygon | MultiPolygon>): number {
    const polygonLength = length(poly, { units: 'kilometers' });
    return polygonLength;
  }

  getCenterOfMass(feature: Feature<Polygon | MultiPolygon>) {
    return centerOfMass(feature);
  }

  getDoubleElbowLatLngs(points: L.LatLngLiteral[]): L.LatLngLiteral[] {
    const doubleized: L.LatLngLiteral[] = [];
    const len = points.length;
    const effectiveLen =
      points[0].lat === points[len - 1].lat && points[0].lng === points[len - 1].lng
        ? len - 1
        : len;

    for (let i = 0; i < effectiveLen; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % effectiveLen];
      // Add current point
      doubleized.push(new L.LatLng(p1.lat, p1.lng));
      // Calculate and add midpoint
      const midPoint = midpoint(point([p1.lng, p1.lat]), point([p2.lng, p2.lat]));
      doubleized.push(
        new L.LatLng(midPoint.geometry.coordinates[1], midPoint.geometry.coordinates[0]),
      );
    }

    return doubleized;
  }

  getBezierMultiPolygon(polygonArray: Position[][][]): Feature<Polygon | MultiPolygon> {
    const line = polygonToLine(this.getMultiPolygon(polygonArray));
    // Add first point to "close" the line
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (line as any).features[0].geometry.coordinates.push(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (line as any).features[0].geometry.coordinates[0],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bezierLine = bezierSpline((line as any).features[0], {
      resolution: this.config.bezier.resolution,
      sharpness: this.config.bezier.sharpness,
    });
    const bezierPoly = lineToPolygon(bezierLine);
    return bezierPoly;
  }

  /**
   * Check if a polygon has holes (more than one ring)
   */
  private polygonHasHoles(feature: Feature<Polygon | MultiPolygon>): boolean {
    try {
      if (feature.geometry.type === 'Polygon') {
        // A polygon has holes if it has more than one ring (outer + holes)
        return feature.geometry.coordinates.length > 1;
      } else if (feature.geometry.type === 'MultiPolygon') {
        // Check if any polygon in the multipolygon has holes
        return feature.geometry.coordinates.some((polygon) => polygon.length > 1);
      }
      return false;
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error checking for holes:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return false;
    }
  }

  /**
   * Handle kinks in polygons with holes while preserving hole structure
   */
  private getKinksWithHolePreservation(
    feature: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon>[] {
    try {
      // For polygons with holes, we need to:
      // 1. Split only the outer ring if it has kinks
      // 2. Determine which resulting polygons should contain which holes
      // 3. Reconstruct polygons with their appropriate holes

      if (feature.geometry.type === 'Polygon') {
        const coordinates = feature.geometry.coordinates;
        const outerRing = coordinates[0];
        const holes = coordinates.slice(1);

        // Create a temporary polygon with just the outer ring to check for kinks
        const outerPolygon: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [outerRing],
          },
          properties: feature.properties || {},
        };

        // Check if the outer ring has kinks
        const outerHasKinks = this.hasKinks(outerPolygon);

        // 🎯 FALLBACK: Even without kinks, check if outer ring intersects holes (hole traversal)
        const outerRingIntersectsHoles = this.checkOuterRingHoleIntersection(outerRing, holes);

        if (outerHasKinks || outerRingIntersectsHoles) {
          if (outerHasKinks) {
            /* empty */
          } else {
            /* empty */
          }

          // Check if drag line goes completely through hole
          const dragGoesCompletelyThroughHole = this.checkIfDragCompletelyThroughHole(
            outerRing,
            holes,
          );

          if (dragGoesCompletelyThroughHole) {
            return this.handleCompleteHoleTraversal(outerPolygon, holes);
          }

          // Split ONLY the outer ring (not the holes)
          const unkink = unkinkPolygon(outerPolygon);
          const splitPolygons: Feature<Polygon | MultiPolygon>[] = [];

          featureEach(unkink, (splitPolygon: Feature<Polygon>) => {
            // For each split polygon, subtract any intersecting holes to create proper "bites"
            const polygonWithBites = this.subtractIntersectingHoles(splitPolygon, holes);
            splitPolygons.push(polygonWithBites);
          });

          return splitPolygons;
        } else {
          return [feature];
        }
      } else if (feature.geometry.type === 'MultiPolygon') {
        // Handle MultiPolygon case
        const allResults: Feature<Polygon | MultiPolygon>[] = [];

        for (const polygonCoords of feature.geometry.coordinates) {
          const singlePolygon: Feature<Polygon> = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: polygonCoords,
            },
            properties: feature.properties || {},
          };

          const results = this.getKinksWithHolePreservation(singlePolygon);
          allResults.push(...results);
        }

        return allResults;
      }

      return [feature];
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error in getKinksWithHolePreservation:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return [feature];
    }
  }

  /**
   * Check if the drag line goes completely through a hole (like cutting cake)
   */
  private checkIfDragCompletelyThroughHole(outerRing: Position[], holes: Position[][]): boolean {
    try {
      // Method 1: Check for duplicate points (most reliable method)
      const duplicatePoints = this.findDuplicatePoints(outerRing);
      if (duplicatePoints.length > 0) {
        return true;
      }

      // Method 2: Check if the outer ring creates a line that intersects holes
      const selfIntersectionLine = this.findSelfIntersectionLine(outerRing);
      if (selfIntersectionLine && holes.length > 0) {
        for (const hole of holes) {
          if (this.lineCompletelyTraversesHole(selfIntersectionLine, hole)) {
            return true;
          }
        }
      }

      // Method 3: Check if any hole is completely "cut" by the self-intersection
      if (
        this.hasKinks({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [outerRing] },
          properties: {},
        })
      ) {
        for (const hole of holes) {
          if (this.holeIsCutByKinks(outerRing, hole)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error checking complete hole traversal:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return false;
    }
  }

  /**
   * Find the line created by self-intersection in the outer ring
   */
  private findSelfIntersectionLine(outerRing: Position[]): Position[] | null {
    try {
      // Look for the pattern where a point appears twice (creating a line)
      const pointCounts = new Map<string, { point: Position; indices: number[] }>();

      for (let i = 0; i < outerRing.length - 1; i++) {
        const point = outerRing[i];
        const key = `${point[0]},${point[1]}`;

        if (!pointCounts.has(key)) {
          pointCounts.set(key, { point, indices: [i] });
        } else {
          pointCounts.get(key)!.indices.push(i);
        }
      }

      // Find points that appear multiple times
      for (const [, data] of pointCounts) {
        if (data.indices.length >= 2) {
          // This creates a line from the first occurrence to the second
          const startIndex = data.indices[0];
          const endIndex = data.indices[1];

          // Extract the line segment
          const line: Position[] = [];
          for (let i = startIndex; i <= endIndex; i++) {
            line.push(outerRing[i]);
          }

          return line;
        }
      }

      return null;
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error finding self-intersection line:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return null;
    }
  }

  /**
   * Check if a line completely traverses a hole
   */
  private lineCompletelyTraversesHole(line: Position[], hole: Position[]): boolean {
    try {
      if (line.length < 2) return false;

      const lineStart = line[0];
      const lineEnd = line[line.length - 1];

      // Create a polygon from the hole
      const holePolygon = polygon([hole]);

      // Check if the line endpoints are on opposite sides of the hole
      const startInHole = booleanPointInPolygon(point(lineStart), holePolygon);
      const endInHole = booleanPointInPolygon(point(lineEnd), holePolygon);

      // If one endpoint is inside the hole and one is outside, it might traverse
      if (startInHole !== endInHole) {
        return true;
      }

      return false;
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error checking line hole traversal:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return false;
    }
  }

  /**
   * Check if a hole is cut by the kinks in the outer ring
   */
  private holeIsCutByKinks(outerRing: Position[], hole: Position[]): boolean {
    try {
      // Create polygons for analysis
      const outerPolygon = polygon([outerRing]);
      const holePolygon = polygon([hole]);

      // Get the kinks (self-intersections) in the outer ring
      const kinkFeatures = kinks(outerPolygon);
      if (kinkFeatures.features.length === 0) return false;

      // Check if any kink points are related to the hole
      for (const kink of kinkFeatures.features) {
        const kinkPt = kink.geometry.coordinates as Position;

        try {
          const d = distance(point(kinkPt), centroid(holePolygon));
          if (d < 0.01) {
            // Close to hole center
            return true;
          }

          // Also check if kink point is inside the hole
          if (booleanPointInPolygon(point(kinkPt), holePolygon)) {
            return true;
          }
        } catch {
          // Fallback: just check if point is in polygon
          if (booleanPointInPolygon(point(kinkPt), holePolygon)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn('Error checking hole cut by kinks:', (error as Error).message);
      }
      return false;
    }
  }

  /**
   * Find duplicate points in a ring (excluding first/last which should be the same)
   */
  private findDuplicatePoints(ring: Position[]): Position[] {
    const duplicates: Position[] = [];
    const seen = new Set<string>();

    // Skip the last point since it should be the same as the first
    for (let i = 0; i < ring.length - 1; i++) {
      const point = ring[i];
      const key = `${point[0]},${point[1]}`;

      if (seen.has(key)) {
        duplicates.push(point);
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  }

  /**
   * Check if outer ring intersects with holes (fallback detection for hole traversal)
   */
  private checkOuterRingHoleIntersection(outerRing: Position[], holes: Position[][]): boolean {
    try {
      if (holes.length === 0) {
        return false;
      }

      const outerPolygon = polygon([outerRing]);

      for (const hole of holes) {
        const holePolygon = polygon([hole]);

        // Check if outer ring intersects with hole boundary
        const intersection = this.getIntersection(outerPolygon, holePolygon);

        if (intersection) {
          return true;
        }

        // Also check if any part of the outer ring goes through the hole
        for (let i = 0; i < outerRing.length - 1; i++) {
          const pt = outerRing[i];
          const pointInHole = booleanPointInPolygon(point(pt), holePolygon);

          if (pointInHole) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle complete hole traversal - create solid polygons (cake cutting)
   */
  private handleCompleteHoleTraversal(
    outerPolygon: Feature<Polygon>,
    _holes: Position[][],
  ): Feature<Polygon>[] {
    void _holes; // make lint happy
    try {
      // 🎯 RADICAL FIX: Instead of using union/unkink operations that might create connections,
      // let's create a simple solid polygon from just the outer ring and split that

      // Create a simple solid polygon with ONLY the outer ring (no holes)
      const solidPolygon: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [outerPolygon.geometry.coordinates[0]], // ONLY outer ring
        },
        properties: outerPolygon.properties || {},
      };

      // Now split this simple solid polygon
      const unkink = unkinkPolygon(solidPolygon);
      const resultPolygons: Feature<Polygon>[] = [];

      featureEach(unkink, (splitPolygon: Feature<Polygon>) => {
        // For complete hole traversal, we create solid polygons
        // The hole area becomes "nothing" (like cutting cake)
        // This tells the marker manager to NOT preserve hole structure
        (splitPolygon as PolydrawFeature)._polydrawHoleTraversalOccurred = true;

        resultPolygons.push(splitPolygon);
      });

      return resultPolygons;
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error handling complete hole traversal:',
          error instanceof Error ? error.message : String(error),
        );
      }
      // Fallback: create a simple solid polygon without holes
      try {
        const fallbackPolygon = {
          ...outerPolygon,
          geometry: {
            ...outerPolygon.geometry,
            coordinates: [outerPolygon.geometry.coordinates[0]], // Only outer ring
          },
        };
        (fallbackPolygon as PolydrawFeature)._polydrawHoleTraversalOccurred = true;
        return [fallbackPolygon];
      } catch (fallbackError) {
        return [outerPolygon];
      }
    }
  }

  /**
   * Subtract intersecting holes from a polygon to create proper "bite" shapes
   */
  private subtractIntersectingHoles(
    basePolygon: Feature<Polygon>,
    holes: Position[][],
  ): Feature<Polygon> {
    try {
      let resultPolygon = basePolygon;

      for (const hole of holes) {
        const holePolygon = polygon([hole]);

        // Check if this hole intersects with the polygon
        const intersection = this.getIntersection(holePolygon, resultPolygon);

        if (intersection) {
          // Instead of subtracting intersection, subtract the ENTIRE hole from the polygon
          // This creates the proper "bite" shape
          const difference = this.polygonDifference(resultPolygon, holePolygon);

          if (difference) {
            if (difference.geometry.type === 'Polygon') {
              resultPolygon = difference as Feature<Polygon>;
            } else if (difference.geometry.type === 'MultiPolygon') {
              // If difference results in MultiPolygon, take the largest piece
              const multiPoly = difference as Feature<MultiPolygon>;
              let largestArea = 0;
              let largestPolygon: Feature<Polygon> | null = null;

              for (const coords of multiPoly.geometry.coordinates) {
                const poly: Feature<Polygon> = {
                  type: 'Feature',
                  geometry: { type: 'Polygon', coordinates: coords },
                  properties: {},
                };
                const polygonArea = area(poly);
                if (polygonArea > largestArea) {
                  largestArea = polygonArea;
                  largestPolygon = poly;
                }
              }

              if (largestPolygon) {
                resultPolygon = largestPolygon;
              }
            }
          } else {
            /* empty */
          }
        } else {
          /* empty */
        }
      }

      return resultPolygon;
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error subtracting intersecting holes:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return basePolygon; // Return original polygon if subtraction fails
    }
  }

  /**
   * Remove duplicate vertices from a polygon to prevent turf errors
   */
  removeDuplicateVertices(
    feature: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> {
    // Validate input feature
    if (!feature || !feature.geometry || !feature.geometry.coordinates) {
      if (!isTestEnvironment()) {
        console.warn('Invalid feature passed to removeDuplicateVertices');
      }
      return feature;
    }

    const cleanCoordinates = (coords: Position[]): Position[] => {
      if (!coords || coords.length < 3) {
        if (!isTestEnvironment()) {
          console.warn('Invalid coordinates array - need at least 3 points for a polygon');
        }
        return coords || [];
      }

      const cleaned: Position[] = [];
      const tolerance = 0.000001; // Very small tolerance for coordinate comparison

      for (let i = 0; i < coords.length; i++) {
        const current = coords[i];
        const next = coords[(i + 1) % coords.length];

        // Validate coordinate format
        if (
          !current ||
          !Array.isArray(current) ||
          current.length < 2 ||
          !next ||
          !Array.isArray(next) ||
          next.length < 2
        ) {
          continue;
        }

        // Check if current point is significantly different from next point
        const latDiff = Math.abs(current[1] - next[1]);
        const lngDiff = Math.abs(current[0] - next[0]);

        if (latDiff > tolerance || lngDiff > tolerance) {
          cleaned.push(current);
        }
      }

      // Ensure we have at least 3 points for a valid polygon
      if (cleaned.length < 3) {
        if (!isTestEnvironment()) {
          console.warn('After cleaning, polygon has less than 3 points');
        }
        return coords; // Return original if cleaning resulted in invalid polygon
      }

      // Ensure polygon is closed (first and last point are the same)
      if (cleaned.length > 0) {
        const first = cleaned[0];
        const last = cleaned[cleaned.length - 1];
        const latDiff = Math.abs(first[1] - last[1]);
        const lngDiff = Math.abs(first[0] - last[0]);

        if (latDiff > tolerance || lngDiff > tolerance) {
          cleaned.push([first[0], first[1]]);
        }
      }

      return cleaned;
    };

    try {
      if (feature.geometry.type === 'Polygon') {
        const cleanedCoords = feature.geometry.coordinates.map((ring) => cleanCoordinates(ring));

        // Validate that we still have valid coordinates after cleaning
        if (cleanedCoords.some((ring) => ring.length < 4)) {
          // 4 because polygon must be closed
          if (!isTestEnvironment()) {
            console.warn('Cleaned polygon has invalid ring with less than 4 coordinates');
          }
          return feature; // Return original if cleaning failed
        }

        return {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: cleanedCoords,
          },
        };
      } else if (feature.geometry.type === 'MultiPolygon') {
        const cleanedCoords = feature.geometry.coordinates.map((polygon) =>
          polygon.map((ring) => cleanCoordinates(ring)),
        );

        // Validate that we still have valid coordinates after cleaning
        if (cleanedCoords.some((polygon) => polygon.some((ring) => ring.length < 4))) {
          if (!isTestEnvironment()) {
            console.warn('Cleaned multipolygon has invalid ring with less than 4 coordinates');
          }
          return feature; // Return original if cleaning failed
        }

        return {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: cleanedCoords,
          },
        };
      }
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error in removeDuplicateVertices:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return feature; // Return original feature if cleaning fails
    }

    return feature;
  }
}
