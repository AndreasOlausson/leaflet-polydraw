import * as L from 'leaflet';
import { TurfHelper } from './turf-helper';
import { defaultConfig } from './config';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
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
}
