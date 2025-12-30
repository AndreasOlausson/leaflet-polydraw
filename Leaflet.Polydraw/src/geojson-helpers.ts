import type {
  Feature,
  Polygon,
  MultiPolygon,
  Point,
  LineString,
  FeatureCollection,
  Position,
} from 'geojson';
import { EARTH_RADIUS, MATH } from './constants';

/**
 * Coordinate type - array of [longitude, latitude]
 */
export type Coord = [number, number];

/**
 * Creates a GeoJSON Point feature
 * @param coordinates - [longitude, latitude] coordinate pair
 * @param properties - Optional properties object
 * @returns GeoJSON Point feature
 */
export function point(coordinates: Position, properties: Record<string, any> = {}): Feature<Point> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates,
    },
    properties,
  };
}

/**
 * Creates a GeoJSON LineString feature
 * @param coordinates - Array of [longitude, latitude] coordinate pairs
 * @param properties - Optional properties object
 * @returns GeoJSON LineString feature
 */
export function lineString(
  coordinates: Position[],
  properties: Record<string, any> = {},
): Feature<LineString> {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    },
    properties,
  };
}

/**
 * Creates a GeoJSON Polygon feature
 * @param coordinates - Array of linear rings (first is exterior, rest are holes)
 * @param properties - Optional properties object
 * @returns GeoJSON Polygon feature
 */
export function polygon(
  coordinates: Position[][],
  properties: Record<string, any> = {},
): Feature<Polygon> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates,
    },
    properties,
  };
}

/**
 * Creates a GeoJSON MultiPolygon feature
 * @param coordinates - Array of polygon coordinate arrays
 * @param properties - Optional properties object
 * @returns GeoJSON MultiPolygon feature
 */
export function multiPolygon(
  coordinates: Position[][][],
  properties: Record<string, any> = {},
): Feature<MultiPolygon> {
  return {
    type: 'Feature',
    geometry: {
      type: 'MultiPolygon',
      coordinates,
    },
    properties,
  };
}

/**
 * Creates a GeoJSON FeatureCollection
 * @param features - Array of GeoJSON features
 * @returns GeoJSON FeatureCollection
 */
export function featureCollection(features: Feature[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Extracts coordinates from a GeoJSON feature
 * Replaces @turf/invariant getCoords function
 * @param feature - GeoJSON feature
 * @returns Coordinate array(s)
 */
export function getCoords(feature: Feature<Polygon | MultiPolygon>): Position[][][] {
  if (feature.geometry.type === 'Polygon') {
    return [feature.geometry.coordinates];
  } else if (feature.geometry.type === 'MultiPolygon') {
    return feature.geometry.coordinates;
  }
  throw new Error('Feature must be a Polygon or MultiPolygon');
}

/**
 * Calculates the bounding box of a geometry
 * Replaces @turf/bbox function
 * @param feature - GeoJSON feature
 * @returns [minX, minY, maxX, maxY] bounding box
 */
export function bbox(feature: Feature<any>): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const processCoordinates = (coords: any) => {
    if (Array.isArray(coords[0])) {
      coords.forEach(processCoordinates);
    } else {
      const [x, y] = coords;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  };

  processCoordinates(feature.geometry.coordinates);
  return [minX, minY, maxX, maxY];
}

/**
 * Creates a polygon from a bounding box
 * Replaces @turf/bbox-polygon function
 * @param bbox - [minX, minY, maxX, maxY] bounding box
 * @returns GeoJSON Polygon feature
 */
export function bboxPolygon(bboxCoords: [number, number, number, number]): Feature<Polygon> {
  const [minX, minY, maxX, maxY] = bboxCoords;
  return polygon([
    [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
      [minX, minY],
    ],
  ]);
}

/**
 * Calculates the distance between two points using the Haversine formula
 * Replaces @turf/distance function
 * @param from - Starting point [lng, lat] or Point feature
 * @param to - Ending point [lng, lat] or Point feature
 * @param units - Distance units (default: 'kilometers')
 * @returns Distance in specified units
 */
export function distance(
  from: Position | Feature<Point>,
  to: Position | Feature<Point>,
  units: 'kilometers' | 'miles' | 'meters' = 'kilometers',
): number {
  const fromCoords = Array.isArray(from) ? from : from.geometry.coordinates;
  const toCoords = Array.isArray(to) ? to : to.geometry.coordinates;

  const [lon1, lat1] = fromCoords;
  const [lon2, lat2] = toCoords;

  const R =
    units === 'miles'
      ? EARTH_RADIUS.MEAN_MILES
      : units === 'meters'
        ? EARTH_RADIUS.MEAN_METERS
        : EARTH_RADIUS.MEAN_KILOMETERS;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the midpoint between two points
 * Replaces @turf/midpoint function
 * @param point1 - First point [lng, lat] or Point feature
 * @param point2 - Second point [lng, lat] or Point feature
 * @returns Midpoint as Point feature
 */
export function midpoint(
  point1: Position | Feature<Point>,
  point2: Position | Feature<Point>,
): Feature<Point> {
  const coords1 = Array.isArray(point1) ? point1 : point1.geometry.coordinates;
  const coords2 = Array.isArray(point2) ? point2 : point2.geometry.coordinates;

  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;

  const midLon = (lon1 + lon2) / 2;
  const midLat = (lat1 + lat2) / 2;

  return point([midLon, midLat]);
}

/**
 * Calculates the area of a polygon using the Shoelace formula
 * @param feature - Polygon or MultiPolygon feature
 * @returns Area in degrees² (planar). Use @turf/area for meters².
 */
export function area(feature: Feature<Polygon | MultiPolygon>): number {
  const coords = getCoords(feature);
  let totalArea = 0;

  for (const polygon of coords) {
    // Outer ring minus holes
    // Use shoelace in degrees; caller should convert to meters if needed.
    for (let i = 0; i < polygon.length; i++) {
      const ring = polygon[i];
      const ringArea = calculateRingArea(ring);
      totalArea += i === 0 ? ringArea : -ringArea;
    }
  }

  return Math.abs(totalArea);
}

/**
 * Shoelace area in degrees² for a single ring. Expects closed ring.
 */
function calculateRingArea(ring: Position[]): number {
  if (!ring || ring.length < 3) return 0;
  let area = 0;
  const n = ring.length;
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  return 0.5 * area;
}

/**
 * Calculates the centroid of a polygon
 * Replaces @turf/centroid function
 * @param feature - Polygon or MultiPolygon feature
 * @returns Centroid as Point feature
 */
export function centroid(feature: Feature<Polygon | MultiPolygon>): Feature<Point> {
  const coords = getCoords(feature);
  let totalX = 0;
  let totalY = 0;
  let totalPoints = 0;

  for (const polygon of coords) {
    for (const ring of polygon) {
      for (const coord of ring) {
        totalX += coord[0];
        totalY += coord[1];
        totalPoints++;
      }
    }
  }

  return point([totalX / totalPoints, totalY / totalPoints]);
}

/**
 * Helper function to convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * MATH.DEG_TO_RAD;
}
