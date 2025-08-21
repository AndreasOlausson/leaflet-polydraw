import { PolygonUtil } from './polygon.util';
import * as L from 'leaflet';

/**
 * Class to hold information about a polygon, including area, perimeter, and trashcan point.
 */
export class PolygonInfo {
  polygon: L.LatLngLiteral[][][] = [];
  trashcanPoint: L.LatLngLiteral[] = [];
  sqmArea: number[] = [];
  perimeter: number[] = [];
  constructor(polygon: L.LatLngLiteral[][][] | L.LatLngLiteral[] | L.LatLngLiteral[][]) {
    if (!Array.isArray(polygon)) {
      return; // Skip processing if not an array
    }

    // Check if polygon[0] is an array of LatLng objects (structure: [Array(N)])
    if (
      polygon.length > 0 &&
      Array.isArray(polygon[0]) &&
      polygon[0].length > 0 &&
      typeof polygon[0][0] === 'object' &&
      'lat' in polygon[0][0]
    ) {
      // This is the structure: [Array(N)] where Array(N) = [LatLng, LatLng, LatLng, ...]
      // We can process polygon[0] directly as the coordinate array
      const coordinateArray = polygon[0] as L.LatLngLiteral[];

      // Process the coordinate array directly
      this.trashcanPoint[0] = this.getTrashcanPoint(coordinateArray);
      this.sqmArea[0] = this.calculatePolygonArea(coordinateArray);
      this.perimeter[0] = this.calculatePolygonPerimeter(coordinateArray);
      this.polygon[0] = [coordinateArray]; // Store as [Array(N)] format

      return; // Exit early - we've handled the flattened structure
    }

    // Check if polygon[0] is a LatLng object directly (structure: [LatLng, LatLng, ...])
    if (polygon.length > 0 && polygon[0] && typeof polygon[0] === 'object' && 'lat' in polygon[0]) {
      // This is a flattened structure: [LatLng, LatLng, LatLng, ...]
      // We need to wrap it in the expected format: [[[LatLng, LatLng, LatLng, ...]]]
      const currentPolygon = polygon as L.LatLngLiteral[];
      const wrappedPolygon = [[currentPolygon]]; // Wrap in proper nesting

      // Process the wrapped polygon
      this.trashcanPoint[0] = this.getTrashcanPoint(currentPolygon);
      this.sqmArea[0] = this.calculatePolygonArea(currentPolygon);
      this.perimeter[0] = this.calculatePolygonPerimeter(currentPolygon);
      this.polygon[0] = wrappedPolygon[0]; // Store as [[LatLng, LatLng, ...]]

      return; // Exit early - we've handled the flattened structure
    }

    // Process each polygon (normal nested structure)
    const multiPolygon = polygon as L.LatLngLiteral[][][];
    multiPolygon.forEach((polygons, i) => {
      if (!polygons || !Array.isArray(polygons)) {
        return; // Skip this polygon
      }

      if (!polygons[0] || !Array.isArray(polygons[0])) {
        return; // Skip this polygon
      }

      this.trashcanPoint[i] = this.getTrashcanPoint(polygons[0]);
      this.sqmArea[i] = this.calculatePolygonArea(polygons[0]);
      this.perimeter[i] = this.calculatePolygonPerimeter(polygons[0]);
      this.polygon[i] = polygons;
    });
  }
  setSqmArea(area: number): void {
    this.sqmArea[0] = area;
  }
  private getTrashcanPoint(polygon: L.LatLngLiteral[]): L.LatLngLiteral {
    if (!Array.isArray(polygon) || polygon.length === 0) {
      console.warn('getTrashcanPoint: Invalid polygon array:', polygon);
      return { lat: 0, lng: 0 }; // Return default coordinates
    }

    const validCoords = polygon.filter(
      (coord) =>
        coord &&
        typeof coord === 'object' &&
        typeof coord.lat === 'number' &&
        typeof coord.lng === 'number' &&
        !isNaN(coord.lat) &&
        !isNaN(coord.lng),
    );

    if (validCoords.length === 0) {
      console.warn('getTrashcanPoint: No valid coordinates found:', polygon);
      return { lat: 0, lng: 0 }; // Return default coordinates
    }

    const res = Math.max(...validCoords.map((o) => o.lat));
    const idx = validCoords.findIndex((o) => o.lat === res);

    if (idx === -1) {
      console.warn('getTrashcanPoint: Could not find max lat coordinate');
      return { lat: 0, lng: 0 }; // Return default coordinates
    }

    let previousPoint: L.LatLngLiteral;
    let nextPoint: L.LatLngLiteral;

    if (idx > 0) {
      previousPoint = validCoords[idx - 1];
      if (idx < validCoords.length - 1) {
        nextPoint = validCoords[idx + 1];
      } else {
        nextPoint = validCoords[0];
      }
    } else {
      previousPoint = validCoords[validCoords.length - 1];
      nextPoint = validCoords[idx + 1];
    }

    if (!previousPoint || !nextPoint) {
      console.warn('getTrashcanPoint: Could not determine previous/next points');
      return validCoords[idx] || { lat: 0, lng: 0 };
    }

    const secondPoint = previousPoint.lng < nextPoint.lng ? previousPoint : nextPoint;

    const midpoint = PolygonUtil.getMidPoint(validCoords[idx], secondPoint);

    return midpoint;
  }
  private calculatePolygonArea(polygon: L.LatLngLiteral[]): number {
    const area = PolygonUtil.getSqmArea(polygon);
    return area;
  }
  private calculatePolygonPerimeter(polygon: L.LatLngLiteral[]): number {
    const perimeter = PolygonUtil.getPerimeter(polygon);
    return perimeter;
  }
}

/**
 * Class to manage the state of polygon drawing.
 */
export class PolygonDrawStates {
  isActivated: boolean = false;
  isFreeDrawMode: boolean = false;
  isMoveMode: boolean = false;
  canRevert: boolean = false;
  isAuto: boolean = false;
  hasPolygons: boolean = false;
  canUsePolyDraw: boolean;

  constructor() {
    this.canUsePolyDraw = false;
    this.reset();
  }

  activate(): void {
    this.reset();
    this.isActivated = true;
  }

  reset(): void {
    this.isActivated = false;
    this.hasPolygons = false;
    this.canRevert = false;
    this.isAuto = false;

    this.resetDrawModes();
  }

  resetDrawModes(): void {
    this.isFreeDrawMode = false;
    this.isMoveMode = false;
  }

  setFreeDrawMode(isAuto: boolean = false): void {
    if (isAuto) {
      this.isActivated = true;
    }
    if (this.isActivated) {
      this.resetDrawModes();
      this.isFreeDrawMode = true;
      if (isAuto) {
        this.isAuto = true;
      }
    }
  }

  setMoveMode(): void {
    if (this.isActivated) {
      this.resetDrawModes();
      this.isMoveMode = true;
    }
  }

  forceCanUseFreeDraw(): void {
    this.canUsePolyDraw = true;
  }
}
