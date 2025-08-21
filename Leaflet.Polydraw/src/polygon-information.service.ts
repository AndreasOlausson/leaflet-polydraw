import { PolygonInfo, PolygonDrawStates } from './polygon-helpers';
import { MapStateService } from './map-state';
import * as L from 'leaflet';

/**
 * Service for managing polygon information and draw states.
 */
export class PolygonInformationService {
  private polygonInfoListeners: ((info: PolygonInfo[]) => void)[] = [];
  private polygonDrawStateListeners: ((state: PolygonDrawStates) => void)[] = [];

  polygonInformationStorage: PolygonInfo[] = [];

  constructor(public mapStateService: MapStateService) {}

  onPolygonInfoUpdated(callback: (info: PolygonInfo[]) => void): void {
    this.polygonInfoListeners.push(callback);
  }

  private emitPolygonInfoUpdated(): void {
    for (const cb of this.polygonInfoListeners) {
      cb(this.polygonInformationStorage);
    }
  }

  onPolygonDrawStateUpdated(callback: (state: PolygonDrawStates) => void): void {
    this.polygonDrawStateListeners.push(callback);
  }

  // === Functions ===

  /**
   * Updates the polygons and notifies the map state service.
   */
  updatePolygons(): void {
    const newPolygons: L.LatLngLiteral[][][] = [];

    if (this.polygonInformationStorage.length > 0) {
      this.polygonInformationStorage.forEach((v) => {
        const test: L.LatLngLiteral[][] = [];

        v.polygon.forEach((poly) => {
          poly.forEach((polygon) => {
            const closedPolygon = [...polygon];

            if (
              polygon.length > 0 &&
              polygon[0].toString() !== polygon[polygon.length - 1].toString()
            ) {
              closedPolygon.push(polygon[0]);
            }

            test.push(closedPolygon);
          });
        });

        newPolygons.push(test);
      });

      // If you want to emit any draw state later, you can do it here
      // this.emitPolygonDrawStateUpdated(...);
    }

    this.mapStateService.updatePolygons(newPolygons);
    this.saveCurrentState();
  }

  saveCurrentState(): void {
    this.emitPolygonInfoUpdated();
    // State saved
  }

  deleteTrashcan(polygon: L.LatLngLiteral[][]): void {
    const idx = this.polygonInformationStorage.findIndex((v) => v.polygon[0] === polygon);
    if (idx !== -1) {
      this.polygonInformationStorage.splice(idx, 1);
      this.updatePolygons();
    }
  }

  deleteTrashCanOnMulti(polygon: L.LatLngLiteral[][][]): void {
    let index = 0;

    // DeleteTrashCan
    // deleteTrashCanOnMulti

    this.polygonInformationStorage.forEach((v, i) => {
      const id = v.polygon.findIndex((poly) => poly.toString() === polygon.toString());
      if (id >= 0) {
        index = i;
        v.trashcanPoint.splice(id, 1);
        v.sqmArea.splice(id, 1);
        v.perimeter.splice(id, 1);
        v.polygon.splice(id, 1);
      }
    });

    this.updatePolygons();

    if (this.polygonInformationStorage.length > 1) {
      this.polygonInformationStorage.splice(index, 1);
    }

    // deleteTrashCanOnMulti after
  }

  deletePolygonInformationStorage(): void {
    this.polygonInformationStorage = [];
  }

  createPolygonInformationStorage(arrayOfFeatureGroups: L.FeatureGroup[]): void {
    // Create Info

    if (arrayOfFeatureGroups.length > 0) {
      arrayOfFeatureGroups.forEach((featureGroup) => {
        const layers = featureGroup.getLayers?.();
        if (layers?.[0]) {
          // Type assertion needed because Layer doesn't guarantee getLatLngs method
          const latLngs = (layers[0] as L.Polygon).getLatLngs();
          const polyInfo = new PolygonInfo(latLngs);
          this.polygonInformationStorage.push(polyInfo);
        }
      });

      this.updatePolygons();
    }
  }
}
