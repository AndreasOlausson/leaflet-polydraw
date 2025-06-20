import * as L from "leaflet";
import { type ILatLng } from './polygon-helpers';

/**
 * Service for managing map state and notifying listeners.
 */
export class MapStateService {
  private map: L.Map | null = null;
  private mapListeners: ((map: L.Map) => void)[] = [];

  constructor() {}

  // === Observer-API ===

  onMapUpdated(callback: (map: L.Map) => void): void {
    if (this.map) callback(this.map); // direct call if the map already exists
    this.mapListeners.push(callback);
  }

  private emitMapUpdated(): void {
    if (this.map) {
      for (const cb of this.mapListeners) {
        cb(this.map);
      }
    }
  }

  // === Public API ===

  /**
   * Updates the current map state and notifies listeners.
   * @param map The Leaflet map instance.
   */
  updateMapState(map: L.Map): void {
    this.map = map;
    this.emitMapUpdated();
  }

  /**
   * Updates the polygons in the map state.
   * @param polygons Array of polygons.
   */
  updatePolygons(polygons: ILatLng[][][]): void {
    // Additional polygon handling can be added here if needed
  }
}
