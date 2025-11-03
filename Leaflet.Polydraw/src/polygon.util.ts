import * as L from 'leaflet';
import { TurfHelper } from './turf-helper';
import { defaultConfig } from './config';
import type { Feature, Polygon, MultiPolygon, Point } from 'geojson';
import { MATH } from './constants';

/**
 * Utility class for polygon calculations.
 */
export class PolygonUtil {
  private static turfHelper = new TurfHelper(defaultConfig);

  /**
   * Calculates the center of the polygon.
   * @param polygon Array of LatLng points.
   * @returns The center LatLng.
   */
  static getCenter(polygon: L.LatLngLiteral[]) {
    let x = 0;
    let y = 0;
    let z = 0;

    polygon.forEach((v) => {
      let lat1 = v.lat;
      let lon1 = v.lng;
      lat1 = lat1 * MATH.DEG_TO_RAD;
      lon1 = lon1 * MATH.DEG_TO_RAD;
      x += Math.cos(lat1) * Math.cos(lon1);
      y += Math.cos(lat1) * Math.sin(lon1);
      z += Math.sin(lat1);
    });

    let lng = Math.atan2(y, x);
    const hyp = Math.sqrt(x * x + y * y);
    let lat = Math.atan2(z, hyp);
    lat = lat * MATH.RAD_TO_DEG;
    lng = lng * MATH.RAD_TO_DEG;
    const center: L.LatLngLiteral = { lat: lat, lng: lng };

    return center;
  }
  /**
   * Gets the southwest point of the polygon bounds.
   * @param polygon Array of LatLng points.
   * @returns The southwest LatLng.
   */
  static getSouthWest(polygon: L.LatLngLiteral[]): L.LatLngLiteral {
    const bounds = this.getBounds(polygon);
    return bounds.getSouthWest();
  }
  static getNorthEast(polygon: L.LatLngLiteral[]): L.LatLngLiteral {
    const bounds = this.getBounds(polygon);
    return bounds.getNorthEast();
  }
  static getNorthWest(polygon: L.LatLngLiteral[]): L.LatLngLiteral {
    const bounds = this.getBounds(polygon);
    return bounds.getNorthWest();
  }
  static getSouthEast(polygon: L.LatLngLiteral[]): L.LatLngLiteral {
    const bounds = this.getBounds(polygon);
    return bounds.getSouthEast();
  }
  static getNorth(polygon: L.LatLngLiteral[]): number {
    const bounds = this.getBounds(polygon);
    return bounds.getNorth();
  }
  static getSouth(polygon: L.LatLngLiteral[]): number {
    const bounds = this.getBounds(polygon);
    return bounds.getSouth();
  }
  static getWest(polygon: L.LatLngLiteral[]): number {
    const bounds = this.getBounds(polygon);
    return bounds.getWest();
  }
  static getEast(polygon: L.LatLngLiteral[]): number {
    const bounds = this.getBounds(polygon);
    return bounds.getEast();
  }
  static getSqmArea(polygon: L.LatLngLiteral[]): number {
    const poly: L.Polygon = new L.Polygon(polygon);
    const geoJsonPoly = poly.toGeoJSON();

    const area = this.turfHelper.getPolygonArea(geoJsonPoly);

    return area;
  }
  static getPerimeter(polygon: L.LatLngLiteral[]): number {
    const poly: L.Polygon = new L.Polygon(polygon);
    const geoJsonPoly = poly.toGeoJSON();

    const perimeter = this.turfHelper.getPolygonPerimeter(geoJsonPoly);

    return perimeter * 1000; // Convert from kilometers to meters to match original behavior
  }
  static getPolygonChecksum(polygon: L.LatLngLiteral[]): number {
    const uniqueLatLngs = polygon.filter((v, i, a) => {
      const found = a.find((x) => x.lat === v.lat && x.lng === v.lng);
      return found ? a.indexOf(found) === i : false;
    });

    return (
      uniqueLatLngs.reduce((a, b) => +a + +b.lat, 0) *
      uniqueLatLngs.reduce((a, b) => +a + +b.lng, 0)
    );
  }
  static getMidPoint(point1: L.LatLngLiteral, point2: L.LatLngLiteral): L.LatLngLiteral {
    const midpoint = this.turfHelper.getMidpoint(point1, point2);

    const returnPoint: L.LatLngLiteral = {
      lat: midpoint.lat,
      lng: midpoint.lng,
    };

    return returnPoint;
  }
  static getBounds(polygon: L.LatLngLiteral[]): L.LatLngBounds {
    const tmpLatLng: L.LatLng[] = [];

    polygon.forEach((ll) => {
      if (isNaN(ll.lat) || isNaN(ll.lng)) {
        /* empty */
      }
      tmpLatLng.push(ll as L.LatLng);
    });

    const polyLine: L.Polyline = new L.Polyline(tmpLatLng);
    const bounds = polyLine.getBounds();

    return bounds;
  }

  /**
   * Calculates the center of mass of the polygon.
   * @param polygon A GeoJSON polygon.
   * @returns The center LatLng.
   */
  static getCenterOfMass(polygon: Feature<Polygon | MultiPolygon>): L.LatLngLiteral {
    const centerOfMass = this.turfHelper.getCenterOfMass(polygon);
    return {
      lat: centerOfMass.geometry.coordinates[1],
      lng: centerOfMass.geometry.coordinates[0],
    };
  }
  static getCenterOfPolygonByIndexWithOffsetFromCenterOfMass(
    polygon: Feature<Polygon | MultiPolygon>,
    index: number,
  ): L.LatLngLiteral {
    const centerOfMass = this.turfHelper.getCenterOfMass(polygon);
    const centerLatLng: L.LatLngLiteral = {
      lat: centerOfMass.geometry.coordinates[1],
      lng: centerOfMass.geometry.coordinates[0],
    };

    const centerOfPolygonMarker = this.getPolygonLatLngAtIndex(polygon, index) ?? centerLatLng;

    const offset = {
      lat: centerOfPolygonMarker.lat - centerLatLng.lat,
      lng: centerOfPolygonMarker.lng - centerLatLng.lng,
    };

    const offsetFraction = 0.5;
    const adjustedLat = centerLatLng.lat + offset.lat * offsetFraction;
    const adjustedLng = centerLatLng.lng + offset.lng * offsetFraction;

    const newCenterOfMass: Feature<Point> = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [adjustedLng, adjustedLat],
      },
      properties: {},
    };

    return {
      lat: newCenterOfMass.geometry.coordinates[1],
      lng: newCenterOfMass.geometry.coordinates[0],
    };
  }

  private static getPolygonLatLngAtIndex(
    polygon: Feature<Polygon | MultiPolygon>,
    index: number,
  ): L.LatLngLiteral | null {
    const geometry = polygon.geometry;
    if (!geometry) {
      return null;
    }

    let coordinates: [number, number][];
    if (geometry.type === 'Polygon') {
      coordinates = geometry.coordinates[0] as [number, number][];
    } else if (geometry.type === 'MultiPolygon') {
      coordinates = geometry.coordinates[0][0] as [number, number][];
    } else {
      return null;
    }

    if (!coordinates || coordinates.length === 0) {
      return null;
    }

    // Remove duplicated closing coordinate if present
    if (coordinates.length > 1) {
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) {
        coordinates = coordinates.slice(0, coordinates.length - 1);
      }
    }

    if (coordinates.length === 0) {
      return null;
    }

    const normalizedIndex =
      ((index % coordinates.length) + coordinates.length) % coordinates.length;
    const selected = coordinates[normalizedIndex];

    return { lat: selected[1], lng: selected[0] };
  }
}
