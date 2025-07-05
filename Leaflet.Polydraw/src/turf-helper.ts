import * as turf from '@turf/turf';
import concaveman from 'concaveman';
import type { Feature, Polygon, MultiPolygon, Position, Point } from 'geojson';
import { MarkerPosition } from './enums';
import * as L from 'leaflet';
import defaultConfig from './config.json';
import type { ILatLng } from './polygon-helpers';

// For Compass, etc., will add later, so comment out related methods if needed

export class TurfHelper {
  private config: typeof defaultConfig = null;

  constructor(config: object) {
    this.config = { ...defaultConfig, ...config };
  }

  union(poly1, poly2): Feature<Polygon | MultiPolygon> {
    try {
      // In Turf 7.x, union expects a FeatureCollection with multiple features
      const featureCollection = turf.featureCollection([poly1, poly2]);
      // @ts-expect-error Just ignore...
      const union = turf.union(featureCollection);
      return union ? this.getTurfPolygon(union) : null;
    } catch (error) {
      console.warn('Error in union:', error.message);
      return null;
    }
  }

  turfConcaveman(feature: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> {
    const points = turf.explode(feature);
    const coordinates = points.features.map((f) => f.geometry.coordinates);
    return turf.multiPolygon([[concaveman(coordinates)]]);
  }

  getSimplified(
    polygon: Feature<Polygon | MultiPolygon>,
    dynamicTolerance: boolean = false,
  ): Feature<Polygon | MultiPolygon> {
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
        console.warn('Invalid feature passed to getKinks');
        return [feature];
      }

      // Remove duplicate vertices before processing
      const cleanedFeature = this.removeDuplicateVertices(feature);

      // Additional validation after cleaning
      if (!cleanedFeature || !cleanedFeature.geometry || !cleanedFeature.geometry.coordinates) {
        console.warn('Feature became invalid after cleaning in getKinks');
        return [feature];
      }

      const unkink = turf.unkinkPolygon(cleanedFeature);
      const coordinates = [];
      turf.featureEach(unkink, (current) => {
        coordinates.push(current);
      });
      return coordinates;
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
   * Calculate midpoint between two ILatLng points
   */
  getMidpoint(point1: ILatLng, point2: ILatLng): ILatLng {
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
    // Complex logic, adapt as needed
    // For now, placeholder
    return polygon;
  }

  polygonDifference(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> {
    try {
      // In Turf 7.x, difference expects a FeatureCollection with multiple features
      const featureCollection = turf.featureCollection([polygon1, polygon2]);
      const diff = turf.difference(featureCollection);
      return diff ? this.getTurfPolygon(diff) : null;
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
   * Convert ILatLng object to Turf.js coordinate array format.
   *
   * This method serves as a semantic interface for coordinate conversion,
   * ensuring consistent lng/lat order when interfacing with Turf.js functions.
   * While simple, it provides a clear contract and future-proofing for any
   * coordinate validation or transformation that might be needed later.
   *
   * @param point - ILatLng object with lat/lng properties
   * @returns Turf.js coordinate array in [lng, lat] format
   */
  getCoord(point: ILatLng): turf.Coord {
    return [point.lng, point.lat];
  }

  getFeaturePointCollection(points: ILatLng[]): any {
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

  getDoubleElbowLatLngs(points: ILatLng[]): ILatLng[] {
    const doubleized: ILatLng[] = [];
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
}
