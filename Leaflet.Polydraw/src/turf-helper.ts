import * as turf from '@turf/turf';
import concaveman from 'concaveman';
import type { Feature, Polygon, MultiPolygon, Position, Point } from 'geojson';
import { MarkerPosition } from './enums';
import * as L from 'leaflet';
import defaultConfig from './config.json';
import type { LatLngLiteral } from 'leaflet';

/**
 * Enhanced GeoJSON feature with polydraw-specific metadata
 */
interface PolydrawFeature extends Feature<Polygon | MultiPolygon> {
  _polydrawHoleTraversalOccurred?: boolean;
}

// For Compass, etc., will add later, so comment out related methods if needed

export class TurfHelper {
  private config: typeof defaultConfig = null;

  constructor(config: object) {
    this.config = { ...defaultConfig, ...config };
  }

  union(
    poly1: Feature<Polygon | MultiPolygon>,
    poly2: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> {
    try {
      const featureCollection = turf.featureCollection([poly1, poly2]);
      const union = turf.union(featureCollection);
      return union ? this.getTurfPolygon(union) : null;
    } catch (error) {
      console.warn('Error in union:', error.message);
      return null;
    }
  }

  /**
   * Create polygon from drawing trace using configured method
   */
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
        console.warn(`Unknown polygon creation method: ${method}, falling back to concaveman`);
        return this.turfConcaveman(feature);
    }
  }

  /**
   * Original concaveman implementation
   */
  turfConcaveman(feature: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> {
    const points = turf.explode(feature);
    const coordinates = points.features.map((f) => f.geometry.coordinates);
    return turf.multiPolygon([[concaveman(coordinates)]]);
  }

  /**
   * Create convex hull polygon (simplest, fewest edges)
   */
  private createConvexPolygon(feature: Feature<any>): Feature<Polygon | MultiPolygon> {
    const points = turf.explode(feature);
    const convexHull = turf.convex(points);

    if (!convexHull) {
      // Fallback to direct polygon if convex hull fails
      return this.createDirectPolygon(feature);
    }

    return this.getTurfPolygon(convexHull);
  }

  /**
   * Create polygon directly from line coordinates (moderate edge count)
   */
  private createDirectPolygon(feature: Feature<any>): Feature<Polygon | MultiPolygon> {
    let coordinates: number[][];

    if (feature.geometry.type === 'LineString') {
      coordinates = feature.geometry.coordinates;
    } else if (feature.geometry.type === 'Polygon') {
      coordinates = feature.geometry.coordinates[0];
    } else {
      // Fallback: extract coordinates from any geometry
      const points = turf.explode(feature);
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
      console.warn('Not enough points for direct polygon, falling back to concaveman');
      return this.turfConcaveman(feature);
    }

    return turf.multiPolygon([[coordinates]]);
  }

  /**
   * Create polygon using buffer method (smooth curves)
   */
  private createBufferedPolygon(feature: Feature<any>): Feature<Polygon | MultiPolygon> {
    try {
      // Convert to line if needed
      let line: Feature<any>;

      if (feature.geometry.type === 'LineString') {
        line = feature;
      } else {
        // Convert polygon or other geometry to line
        const points = turf.explode(feature);
        const coordinates = points.features.map((f) => f.geometry.coordinates);
        line = turf.lineString(coordinates);
      }

      // Apply small buffer to create polygon
      const buffered = turf.buffer(line, 0.001, { units: 'kilometers' });

      if (!buffered) {
        return this.createDirectPolygon(feature);
      }

      return this.getTurfPolygon(buffered);
    } catch (error) {
      console.warn('Buffer polygon creation failed:', error.message);
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

      const simplified = turf.simplify(polygon, tolerance);
      return simplified;
    } else if (simplificationMode === 'dynamic') {
      // Original dynamic simplification
      const numOfEdges = polygon.geometry.coordinates[0][0].length;
      const tolerance = this.config.simplification.simplifyTolerance;

      if (!dynamicTolerance) {
        const simplified = turf.simplify(polygon, tolerance);
        return simplified;
      } else {
        let simplified = turf.simplify(polygon, tolerance);
        const fractionGuard = this.config.simplification.dynamicMode.fractionGuard;
        const multipiler = this.config.simplification.dynamicMode.multipiler;
        while (
          simplified.geometry.coordinates[0][0].length > 4 &&
          simplified.geometry.coordinates[0][0].length / (numOfEdges + 2) > fractionGuard
        ) {
          tolerance.tolerance = tolerance.tolerance * multipiler;
          simplified = turf.simplify(polygon, tolerance);
        }
        return simplified;
      }
    } else if (simplificationMode === 'none') {
      // No simplification

      return polygon;
    } else {
      // Fallback to simple mode
      console.warn(`Unknown simplification mode: ${simplificationMode}, falling back to simple`);
      const tolerance = {
        tolerance: 0.0001,
        highQuality: false,
        mutate: false,
      };
      return turf.simplify(polygon, tolerance);
    }
  }

  getTurfPolygon(polygon: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> {
    let turfPolygon;
    if (polygon.geometry.type === 'Polygon') {
      turfPolygon = turf.multiPolygon([polygon.geometry.coordinates]);
    } else {
      turfPolygon = turf.multiPolygon(polygon.geometry.coordinates);
    }
    return turfPolygon;
  }

  getMultiPolygon(polygonArray: Position[][][]): Feature<Polygon | MultiPolygon> {
    return turf.multiPolygon(polygonArray);
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
        console.warn('Feature became invalid after cleaning in getKinks');
        return [feature];
      }

      // 🎯 HOLE-AWARE SPLITTING: Check if the polygon has holes
      const hasHoles = this.polygonHasHoles(cleanedFeature);

      if (hasHoles) {
        // For polygons with holes, we need special handling
        return this.getKinksWithHolePreservation(cleanedFeature);
      } else {
        // For simple polygons, use the standard unkink approach
        const unkink = turf.unkinkPolygon(cleanedFeature);
        const coordinates = [];
        turf.featureEach(unkink, (current) => {
          coordinates.push(current);
        });
        return coordinates;
      }
    } catch (error) {
      console.warn('Error processing kinks:', error.message);
      // Return the original feature as a fallback
      return [feature];
    }
  }

  getCoords(feature: Feature<Polygon | MultiPolygon>) {
    return turf.getCoords(feature);
  }

  hasKinks(feature: Feature<Polygon | MultiPolygon>) {
    const kinks = turf.kinks(feature);
    return kinks.features.length > 0;
  }

  /**
   * Get the convex hull of a polygon
   */
  getConvexHull(polygon: Feature<Polygon | MultiPolygon>): Feature<Polygon> | null {
    try {
      const featureCollection = turf.featureCollection([polygon]);
      return turf.convex(featureCollection);
    } catch (error) {
      console.warn('Error in getConvexHull:', error.message);
      return null;
    }
  }

  /**
   * Calculate midpoint between two LatLngLiteral points
   */
  getMidpoint(point1: L.LatLngLiteral, point2: L.LatLngLiteral): L.LatLngLiteral {
    const p1 = turf.point([point1.lng, point1.lat]);
    const p2 = turf.point([point2.lng, point2.lat]);

    const midpoint = turf.midpoint(p1, p2);

    return {
      lat: midpoint.geometry.coordinates[1],
      lng: midpoint.geometry.coordinates[0],
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
        console.warn('Invalid features passed to polygonIntersect');
        return false;
      }

      const poly = [];
      const poly2 = [];
      const latlngsCoords = turf.getCoords(latlngs);
      latlngsCoords.forEach((element) => {
        // Create proper GeoJSON Feature
        const feat: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [element[0]],
          },
          properties: {},
        };
        poly.push(feat);
      });
      const polygonCoords = turf.getCoords(polygon);
      polygonCoords.forEach((element) => {
        // Create proper GeoJSON Feature
        const feat: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [element[0]],
          },
          properties: {},
        };
        poly2.push(feat);
      });

      let intersect = false;
      loop1: for (let i = 0; i < poly.length; i++) {
        // Validate the created feature before using it
        if (!poly[i] || !poly[i].geometry || !poly[i].geometry.coordinates) {
          continue;
        }

        if (this.getKinks(poly[i]).length < 2) {
          for (let j = 0; j < poly2.length; j++) {
            // Validate the created feature before using it
            if (!poly2[j] || !poly2[j].geometry || !poly2[j].geometry.coordinates) {
              continue;
            }

            if (this.getKinks(poly2[j]).length < 2) {
              try {
                // Use individual polygon features for intersect
                const test = turf.intersect(poly[i], poly2[j]);
                if (test?.geometry.type === 'Polygon') {
                  intersect = true;
                }
                if (intersect) {
                  break loop1;
                }
              } catch (error) {
                // Continue to next iteration if intersect fails
                continue;
              }
            }
          }
        }
      }
      return intersect;
    } catch (error) {
      console.warn('Error in polygonIntersect:', error.message);
      return false;
    }
  }

  getIntersection(
    poly1: Feature<Polygon | MultiPolygon>,
    poly2: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> | null {
    try {
      // In Turf 7.x, intersect expects a FeatureCollection with multiple features
      const featureCollection = turf.featureCollection([poly1, poly2]);
      const result = turf.intersect(featureCollection);

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
      console.warn('Error in getIntersection:', error.message);
      return null;
    }
  }

  getDistance(point1, point2): number {
    return turf.distance(point1, point2);
  }

  isWithin(polygon1: Position[], polygon2: Position[]): boolean {
    return turf.booleanWithin(turf.polygon([polygon1]), turf.polygon([polygon2]));
  }

  /**
   * Check if one polygon is completely within another polygon
   */
  isPolygonCompletelyWithin(
    innerPolygon: Feature<Polygon | MultiPolygon>,
    outerPolygon: Feature<Polygon | MultiPolygon>,
  ): boolean {
    try {
      return turf.booleanWithin(innerPolygon, outerPolygon);
    } catch (error) {
      // Fallback: check if all vertices of inner polygon are within outer polygon
      const innerCoords = turf.getCoords(innerPolygon);
      const outerCoords = turf.getCoords(outerPolygon);

      // For each ring in the inner polygon
      for (const innerRing of innerCoords) {
        for (const ring of innerRing) {
          for (const coord of ring) {
            const point = turf.point(coord);
            let isInside = false;

            // Check against each ring in the outer polygon
            for (const outerRing of outerCoords) {
              for (const outerRingCoords of outerRing) {
                const outerPoly = turf.polygon([outerRingCoords]);
                if (turf.booleanPointInPolygon(point, outerPoly)) {
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
   * Checks if two polygons are equal.
   * @param polygon1 First polygon.
   * @param polygon2 Second polygon.
   */
  equalPolygons(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ) {
    // Use turf.booleanEqual(polygon1, polygon2)
  }

  convertToBoundingBoxPolygon(polygon: Feature<Polygon | MultiPolygon>): Feature<Polygon> {
    const bbox = turf.bbox(polygon.geometry);
    const bboxPolygon = turf.bboxPolygon(bbox);
    // TODO: Add Compass logic if needed
    return bboxPolygon;
  }

  polygonToMultiPolygon(poly: Feature<Polygon>): Feature<MultiPolygon> {
    const multi = turf.multiPolygon([poly.geometry.coordinates]);
    return multi;
  }

  injectPointToPolygon(polygon, point) {
    // Clone polygon to avoid modifying original
    const newPoly = JSON.parse(JSON.stringify(polygon));

    if (newPoly.geometry.type === 'MultiPolygon') {
      const coordinates = newPoly.geometry.coordinates[0][0];
      // Find the closest edge and insert the point
      let minDistance = Infinity;
      let insertIndex = 0;

      for (let i = 0; i < coordinates.length - 1; i++) {
        const edgeStart = coordinates[i];
        const edgeEnd = coordinates[i + 1];
        const distance = this.distanceToLineSegment(point, edgeStart, edgeEnd);

        if (distance < minDistance) {
          minDistance = distance;
          insertIndex = i + 1;
        }
      }

      coordinates.splice(insertIndex, 0, point);
    } else if (newPoly.geometry.type === 'Polygon') {
      const coordinates = newPoly.geometry.coordinates[0];
      // Find the closest edge and insert the point
      let minDistance = Infinity;
      let insertIndex = 0;

      for (let i = 0; i < coordinates.length - 1; i++) {
        const edgeStart = coordinates[i];
        const edgeEnd = coordinates[i + 1];
        const distance = this.distanceToLineSegment(point, edgeStart, edgeEnd);

        if (distance < minDistance) {
          minDistance = distance;
          insertIndex = i + 1;
        }
      }

      coordinates.splice(insertIndex, 0, point);
    }

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
  ): Feature<Polygon | MultiPolygon> {
    try {
      // In Turf 7.x, difference expects a FeatureCollection with multiple features
      const featureCollection = turf.featureCollection([polygon1, polygon2]);
      const diff = turf.difference(featureCollection);

      const result = diff ? this.getTurfPolygon(diff) : null;
      return result;
    } catch (error) {
      console.warn('Error in polygonDifference:', error.message);
      return null;
    }
  }

  getBoundingBoxCompassPosition(polygon, MarkerPosition, useOffset, offsetDirection) {
    // TODO: Implement with Compass
    return null;
  }

  getNearestPointIndex(targetPoint: turf.Coord, points: any): number {
    const index = turf.nearestPoint(targetPoint, points).properties.featureIndex;
    return index;
  }

  /**
   * Convert LatLngLiteral object to Turf.js coordinate array format.
   *
   * This method serves as a semantic interface for coordinate conversion,
   * ensuring consistent lng/lat order when interfacing with Turf.js functions.
   * While simple, it provides a clear contract and future-proofing for any
   * coordinate validation or transformation that might be needed later.
   *
   * @param point - LatLngLiteral object with lat/lng properties
   * @returns Turf.js coordinate array in [lng, lat] format
   */
  getCoord(point: L.LatLngLiteral): turf.Coord {
    return [point.lng, point.lat];
  }

  getFeaturePointCollection(points: L.LatLngLiteral[]): any {
    const pts = [];
    points.forEach((v) => {
      const p = turf.point([v.lng, v.lat], {});
      pts.push(p);
    });
    const fc = turf.featureCollection(pts);
    return fc;
  }

  getPolygonArea(poly: Feature<Polygon | MultiPolygon>): number {
    const area = turf.area(poly);
    return area;
  }

  getPolygonPerimeter(poly: Feature<Polygon | MultiPolygon>): number {
    const length = turf.length(poly, { units: 'kilometers' });
    return length;
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
      const midPoint = turf.midpoint(turf.point([p1.lng, p1.lat]), turf.point([p2.lng, p2.lat]));
      doubleized.push(
        new L.LatLng(midPoint.geometry.coordinates[1], midPoint.geometry.coordinates[0]),
      );
    }

    return doubleized;
  }

  getBezierMultiPolygon(polygonArray: Position[][][]): Feature<Polygon | MultiPolygon> {
    const line = turf.polygonToLine(this.getMultiPolygon(polygonArray));
    // Add first point to "close" the line
    (line as any).features[0].geometry.coordinates.push(
      (line as any).features[0].geometry.coordinates[0],
    );
    const bezierLine = turf.bezierSpline((line as any).features[0], {
      resolution: this.config.bezier.resolution,
      sharpness: this.config.bezier.sharpness,
    });
    const bezierPoly = turf.lineToPolygon(bezierLine);
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
      console.warn('Error checking for holes:', error.message);
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
          const unkink = turf.unkinkPolygon(outerPolygon);
          const splitPolygons: Feature<Polygon | MultiPolygon>[] = [];

          turf.featureEach(unkink, (splitPolygon: Feature<Polygon>) => {
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
      console.warn('Error in getKinksWithHolePreservation:', error.message);
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
      console.warn('Error checking complete hole traversal:', error.message);
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
      for (const [key, data] of pointCounts) {
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
      console.warn('Error finding self-intersection line:', error.message);
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
      const holePolygon = turf.polygon([hole]);

      // Check if the line endpoints are on opposite sides of the hole
      const startInHole = turf.booleanPointInPolygon(turf.point(lineStart), holePolygon);
      const endInHole = turf.booleanPointInPolygon(turf.point(lineEnd), holePolygon);

      // If one endpoint is inside the hole and one is outside, it might traverse
      if (startInHole !== endInHole) {
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Error checking line hole traversal:', error.message);
      return false;
    }
  }

  /**
   * Check if a hole is cut by the kinks in the outer ring
   */
  private holeIsCutByKinks(outerRing: Position[], hole: Position[]): boolean {
    try {
      // Create polygons for analysis
      const outerPolygon = turf.polygon([outerRing]);
      const holePolygon = turf.polygon([hole]);

      // Get the kinks (self-intersections) in the outer ring
      const kinks = turf.kinks(outerPolygon);

      if (kinks.features.length === 0) return false;

      // Check if any kink points are related to the hole
      for (const kink of kinks.features) {
        const kinkPoint = kink.geometry.coordinates;

        // Check if the kink is near or intersects the hole
        try {
          const distance = turf.distance(turf.point(kinkPoint), turf.centroid(holePolygon));

          if (distance < 0.01) {
            // Close to hole center

            return true;
          }

          // Also check if kink point is inside the hole
          if (turf.booleanPointInPolygon(turf.point(kinkPoint), holePolygon)) {
            return true;
          }
        } catch (distanceError) {
          // Fallback: just check if point is in polygon
          if (turf.booleanPointInPolygon(turf.point(kinkPoint), holePolygon)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.warn('Error checking hole cut by kinks:', error.message);
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

      const outerPolygon = turf.polygon([outerRing]);

      for (const hole of holes) {
        const holePolygon = turf.polygon([hole]);

        // Check if outer ring intersects with hole boundary
        const intersection = this.getIntersection(outerPolygon, holePolygon);

        if (intersection) {
          return true;
        }

        // Also check if any part of the outer ring goes through the hole
        for (let i = 0; i < outerRing.length - 1; i++) {
          const point = outerRing[i];
          const pointInHole = turf.booleanPointInPolygon(turf.point(point), holePolygon);

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
    holes: Position[][],
  ): Feature<Polygon>[] {
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
      const unkink = turf.unkinkPolygon(solidPolygon);
      const resultPolygons: Feature<Polygon>[] = [];

      turf.featureEach(unkink, (splitPolygon: Feature<Polygon>) => {
        // For complete hole traversal, we create solid polygons
        // The hole area becomes "nothing" (like cutting cake)
        // This tells the marker manager to NOT preserve hole structure
        (splitPolygon as PolydrawFeature)._polydrawHoleTraversalOccurred = true;

        resultPolygons.push(splitPolygon);
      });

      return resultPolygons;
    } catch (error) {
      console.warn('Error handling complete hole traversal:', error.message);
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
   * Assign holes to a polygon based on containment and intersection analysis
   */
  private assignHolesToPolygon(polygon: Feature<Polygon>, holes: Position[][]): Feature<Polygon> {
    try {
      const assignedHoles: Position[][] = [];

      for (const hole of holes) {
        const holePolygon = turf.polygon([hole]);

        // Check if the hole intersects with the polygon boundary
        const intersectionResult = this.analyzeHolePolygonRelationship(holePolygon, polygon);

        if (intersectionResult.isCompletelyContained) {
          // Hole is completely within the polygon - assign as normal hole
          assignedHoles.push(hole);
        } else if (intersectionResult.hasIntersection) {
          // Hole is intersected by the split - ignore it (let it disappear naturally)
          // Do nothing - the hole part just disappears, resulting in solid polygons
        } else {
          /* empty */
        }
      }

      // Return polygon with assigned holes (if any)
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [polygon.geometry.coordinates[0], ...assignedHoles],
        },
        properties: polygon.properties || {},
      };
    } catch (error) {
      console.warn('Error assigning holes to polygon:', error.message);
      // Return polygon without holes if assignment fails
      return polygon;
    }
  }

  /**
   * Analyze the relationship between a hole and a polygon
   */
  private analyzeHolePolygonRelationship(
    hole: Feature<Polygon>,
    polygon: Feature<Polygon>,
  ): {
    isCompletelyContained: boolean;
    hasIntersection: boolean;
    intersectionArea: number;
  } {
    try {
      // Check if hole is completely within polygon
      const isCompletelyContained = turf.booleanWithin(hole, polygon);

      if (isCompletelyContained) {
        return {
          isCompletelyContained: true,
          hasIntersection: false,
          intersectionArea: 0,
        };
      }

      // Check if there's any meaningful intersection (not just touching)
      const intersection = this.getIntersection(hole, polygon);
      const hasIntersection = intersection !== null;
      let intersectionArea = 0;

      if (hasIntersection) {
        intersectionArea = turf.area(intersection);
        const holeArea = turf.area(hole);

        // Only consider it a meaningful intersection if the intersection area
        // is significant compared to the hole area (more than 10%)
        const intersectionRatio = intersectionArea / holeArea;

        if (intersectionRatio < 0.1) {
          // Very small intersection - treat as no intersection
          return {
            isCompletelyContained: false,
            hasIntersection: false,
            intersectionArea: 0,
          };
        }
      }

      return {
        isCompletelyContained: false,
        hasIntersection,
        intersectionArea,
      };
    } catch (error) {
      console.warn('Error analyzing hole-polygon relationship:', error.message);
      return {
        isCompletelyContained: false,
        hasIntersection: false,
        intersectionArea: 0,
      };
    }
  }

  /**
   * Subtract intersecting holes from a polygon to create proper "bite" shapes
   */
  private subtractIntersectingHoles(
    polygon: Feature<Polygon>,
    holes: Position[][],
  ): Feature<Polygon> {
    try {
      let resultPolygon = polygon;

      for (const hole of holes) {
        const holePolygon = turf.polygon([hole]);

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
                const area = turf.area(poly);
                if (area > largestArea) {
                  largestArea = area;
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
      console.warn('Error subtracting intersecting holes:', error.message);
      return polygon; // Return original polygon if subtraction fails
    }
  }

  /**
   * Calculate the area of a ring using the shoelace formula
   */
  private calculateRingArea(ring: Position[]): number {
    let area = 0;
    const n = ring.length;

    for (let i = 0; i < n - 1; i++) {
      area += ring[i][0] * ring[i + 1][1];
      area -= ring[i + 1][0] * ring[i][1];
    }

    return Math.abs(area) / 2;
  }

  /**
   * Remove duplicate vertices from a polygon to prevent turf errors
   */
  removeDuplicateVertices(
    feature: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> {
    // Validate input feature
    if (!feature || !feature.geometry || !feature.geometry.coordinates) {
      console.warn('Invalid feature passed to removeDuplicateVertices');
      return feature;
    }

    const cleanCoordinates = (coords: Position[]): Position[] => {
      if (!coords || coords.length < 3) {
        console.warn('Invalid coordinates array - need at least 3 points for a polygon');
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
        console.warn('After cleaning, polygon has less than 3 points');
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
          console.warn('Cleaned polygon has invalid ring with less than 4 coordinates');
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
          console.warn('Cleaned multipolygon has invalid ring with less than 4 coordinates');
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
      console.warn('Error in removeDuplicateVertices:', error.message);
      return feature; // Return original feature if cleaning fails
    }

    return feature;
  }

  // ========================================================================
  // POTENTIALLY UNUSED METHODS - TO BE REVIEWED FOR DELETION
  // ========================================================================
  /**
   * Create a "bite" by subtracting the intersected part of the hole from the polygon
   */
  private createBiteFromHoleIntersection(
    polygon: Feature<Polygon>,
    hole: Feature<Polygon>,
  ): Feature<Polygon> | null {
    try {
      // Get the intersection between the hole and the polygon
      const intersection = this.getIntersection(hole, polygon);

      if (!intersection) {
        return polygon; // No intersection, return original polygon
      }

      // Subtract the intersection from the polygon to create the "bite"
      const result = this.polygonDifference(polygon, intersection);

      if (result && result.geometry.type === 'Polygon') {
        return result as Feature<Polygon>;
      }

      return polygon; // Fallback to original if difference operation fails
    } catch (error) {
      console.warn('Error creating bite from hole intersection:', error.message);
      return polygon;
    }
  }
}
