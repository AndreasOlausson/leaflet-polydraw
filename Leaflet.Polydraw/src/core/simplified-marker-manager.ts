/**
 * SimplifiedMarkerManager - Handles marker operations with the simplified approach
 *
 * This follows the pattern:
 * 1. Extract coordinates from markers
 * 2. Create GeoJSON
 * 3. Call polygonStateManager.updatePolygon()
 */

import * as L from 'leaflet';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { ILatLng, PolydrawConfig, PolydrawFeatureGroup } from '../types/polydraw-interfaces';
import { PolygonStateManager } from './polygon-state-manager';

export class SimplifiedMarkerManager {
  private isUpdatingPolygon = false;

  constructor(
    private config: PolydrawConfig,
    private polygonStateManager: PolygonStateManager,
  ) {}

  /**
   * Handle marker drag - simplified approach
   */
  handleMarkerDrag(featureGroup: PolydrawFeatureGroup): void {
    // Prevent recursive calls
    if (this.isUpdatingPolygon) {
      return;
    }

    const polygon = this.getPolygonFromFeatureGroup(featureGroup);
    const markers = this.getMarkersFromFeatureGroup(featureGroup);

    if (!polygon || markers.length === 0) {
      return;
    }

    try {
      this.isUpdatingPolygon = true;

      // Simple approach: just map markers to coordinates
      const newCoords = markers.map((marker) => marker.getLatLng());

      if (newCoords.length > 0 && this.isValidCoordinateArray(newCoords)) {
        // Update the polygon directly during drag for visual feedback
        polygon.setLatLngs(newCoords);
      }
    } catch (error) {
      console.error('SimplifiedMarkerManager.handleMarkerDrag: Error:', error);
    } finally {
      this.isUpdatingPolygon = false;
    }
  }

  /**
   * Handle marker drag end - simplified approach
   */
  handleMarkerDragEnd(featureGroup: PolydrawFeatureGroup): void {
    console.log('🔧 SimplifiedMarkerManager.handleMarkerDragEnd() - Processing drag end');

    const markers = this.getMarkersFromFeatureGroup(featureGroup);
    if (markers.length === 0) {
      console.warn('No markers found in feature group');
      return;
    }

    try {
      // Step 1: Extract coordinates from markers
      const markerCoordinates = markers.map((marker) => {
        const latlng = marker.getLatLng();
        return [latlng.lng, latlng.lat]; // GeoJSON format: [lng, lat]
      });

      // Step 2: Ensure polygon is closed
      if (markerCoordinates.length > 0) {
        const first = markerCoordinates[0];
        const last = markerCoordinates[markerCoordinates.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          markerCoordinates.push([first[0], first[1]]);
        }
      }

      // Step 3: Create clean GeoJSON
      const geoJSON: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [markerCoordinates],
        },
      };

      console.log('🔧 SimplifiedMarkerManager.handleMarkerDragEnd() - Created GeoJSON:', geoJSON);

      // Step 4: Find the polygon ID that corresponds to this feature group
      const polygonId = this.findPolygonIdByFeatureGroup(featureGroup);
      if (!polygonId) {
        console.warn('Could not find polygon ID for feature group');
        return;
      }

      // Step 5: Update through polygon state manager (this handles merging automatically)
      this.polygonStateManager.updatePolygon(polygonId, geoJSON);

      console.log('🔧 SimplifiedMarkerManager.handleMarkerDragEnd() - Updated polygon:', polygonId);
    } catch (error) {
      console.error('SimplifiedMarkerManager.handleMarkerDragEnd: Error:', error);
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Get polygon from feature group
   */
  private getPolygonFromFeatureGroup(featureGroup: PolydrawFeatureGroup): L.Polygon | null {
    const layers = featureGroup.getLayers();
    const polygon = layers.find((layer) => layer instanceof L.Polygon) as L.Polygon;
    return polygon || null;
  }

  /**
   * Get markers from feature group
   */
  private getMarkersFromFeatureGroup(featureGroup: PolydrawFeatureGroup): L.Marker[] {
    const layers = featureGroup.getLayers();
    return layers.filter((layer) => layer instanceof L.Marker) as L.Marker[];
  }

  /**
   * Validate coordinate array
   */
  private isValidCoordinateArray(coords: ILatLng[]): boolean {
    if (!Array.isArray(coords) || coords.length === 0) {
      return false;
    }

    for (const coord of coords) {
      if (
        !coord ||
        typeof coord !== 'object' ||
        typeof coord.lat !== 'number' ||
        typeof coord.lng !== 'number' ||
        isNaN(coord.lat) ||
        isNaN(coord.lng)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Find polygon ID by feature group
   */
  private findPolygonIdByFeatureGroup(featureGroup: PolydrawFeatureGroup): string | null {
    const allPolygons = this.polygonStateManager.getAllPolygons();

    for (const polygonData of allPolygons) {
      if (polygonData.featureGroup === featureGroup) {
        return polygonData.id;
      }
    }

    return null;
  }
}
