import * as L from 'leaflet';
import * as turf from '@turf/turf';
import { type ILatLng } from './polygon-helpers';

/**
 * Utility class for polygon calculations.
 */
export class PolygonUtil {
  /**
   * Calculates the center of the polygon.
   * @param polygon Array of LatLng points.
   * @returns The center LatLng.
   */
  static getCenter(polygon: ILatLng[]) {
    const pi = Math.PI;
    let x = 0;
    let y = 0;
    let z = 0;

    polygon.forEach((v) => {
      let lat1 = v.lat;
      let lon1 = v.lng;
      lat1 = (lat1 * pi) / 180;
      lon1 = (lon1 * pi) / 180;
      x += Math.cos(lat1) * Math.cos(lon1);
      y += Math.cos(lat1) * Math.sin(lon1);
      z += Math.sin(lat1);
    });

    let lng = Math.atan2(y, x);
    const hyp = Math.sqrt(x * x + y * y);
    let lat = Math.atan2(z, hyp);
    lat = (lat * 180) / pi;
    lng = (lng * 180) / pi;
    const center: ILatLng = { lat: lat, lng: lng };

    return center;
  }
  /**
   * Gets the southwest point of the polygon bounds.
   * @param polygon Array of LatLng points.
   * @returns The southwest LatLng.
   */
  static getSouthWest(polygon: ILatLng[]): ILatLng {
    const bounds = this.getBounds(polygon);
    return bounds.getSouthWest();
  }
  static getNorthEast(polygon: ILatLng[]): ILatLng {
    const bounds = this.getBounds(polygon);
    return bounds.getNorthEast();
  }
  static getNorthWest(polygon: ILatLng[]): ILatLng {
    const bounds = this.getBounds(polygon);
    return bounds.getNorthWest();
  }
  static getSouthEast(polygon: ILatLng[]): ILatLng {
    const bounds = this.getBounds(polygon);
    return bounds.getSouthEast();
  }
  static getNorth(polygon: ILatLng[]): number {
    const bounds = this.getBounds(polygon);
    return bounds.getNorth();
  }
  static getSouth(polygon: ILatLng[]): number {
    const bounds = this.getBounds(polygon);
    return bounds.getSouth();
  }
  static getWest(polygon: ILatLng[]): number {
    const bounds = this.getBounds(polygon);
    return bounds.getWest();
  }
  static getEast(polygon: ILatLng[]): number {
    const bounds = this.getBounds(polygon);
    return bounds.getEast();
  }
  static getSqmArea(polygon: ILatLng[]): number {
    const poly: L.Polygon = new L.Polygon(polygon);
    const geoJsonPoly = poly.toGeoJSON();

    const area = turf.area(geoJsonPoly as any);

    return area;
  }
  static getPerimeter(polygon: ILatLng[]): number {
    const poly: L.Polygon = new L.Polygon(polygon);
    const geoJsonPoly = poly.toGeoJSON();

    const perimeter = turf.length(geoJsonPoly as any, { units: 'meters' });

    return perimeter;
  }
  static getPolygonChecksum(polygon: ILatLng[]): number {
    const uniqueLatLngs = polygon.filter((v, i, a) => {
      return a.indexOf(a.find((x) => x.lat === v.lat && x.lng === v.lng)) === i;
    });

    return (
      uniqueLatLngs.reduce((a, b) => +a + +b.lat, 0) *
      uniqueLatLngs.reduce((a, b) => +a + +b.lng, 0)
    );
  }
  static getMidPoint(point1: ILatLng, point2: ILatLng): ILatLng {
    const p1 = turf.point([point1.lng, point1.lat]);
    const p2 = turf.point([point2.lng, point2.lat]);

    const midpoint = turf.midpoint(p1, p2);

    const returnPoint: ILatLng = {
      lat: midpoint.geometry.coordinates[1],
      lng: midpoint.geometry.coordinates[0],
    };

    return returnPoint;
  }
  static getBounds(polygon: ILatLng[]): L.LatLngBounds {
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
}
