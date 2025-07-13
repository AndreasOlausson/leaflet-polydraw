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
   * Handle marker drag end - update polygon coordinates
   */
  handleMarkerDragEnd(featureGroup: PolydrawFeatureGroup): void {
    try {
      // Get the polygon ID from PolygonStateManager
      const polygonId = this.findPolygonIdByFeatureGroup(featureGroup);
      if (!polygonId) {
        console.warn('Could not find polygon ID for feature group');
        return;
      }

      // Extract new coordinates from markers
      const newCoordinates = this.extractCoordinatesFromMarkers(featureGroup);
      if (!newCoordinates || newCoordinates.length === 0) {
        console.warn('Could not extract valid coordinates from markers');
        return;
      }

      if (newCoordinates.length < 3) {
        console.warn('Not enough coordinates for a valid polygon (need at least 3)');
        return;
      }

      const firstPoint = newCoordinates[0];
      const lastPoint = newCoordinates[newCoordinates.length - 1];

      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        // Close the polygon by adding the first point at the end
        newCoordinates.push([firstPoint[0], firstPoint[1]]);
      }

      if (newCoordinates.length < 4) {
        console.warn('Not enough coordinates for a valid closed polygon (need at least 4)');
        return;
      }

      // Create new GeoJSON
      const newGeoJSON: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [newCoordinates],
        },
      };
    } catch (error) {
      console.error('Error in handleMarkerDragEnd:', error);
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Extract coordinates from markers in feature group
   */
  private extractCoordinatesFromMarkers(featureGroup: PolydrawFeatureGroup): number[][] {
    const markers = this.getMarkersFromFeatureGroup(featureGroup);

    if (markers.length === 0) {
      return [];
    }

    // Extract coordinates from markers
    const coordinates = markers.map((marker) => {
      const latlng = marker.getLatLng();
      return [latlng.lng, latlng.lat]; // GeoJSON format: [lng, lat]
    });

    return coordinates;
  }

  /**
   * Get markers from feature group
   */
  private getMarkersFromFeatureGroup(featureGroup: PolydrawFeatureGroup): L.Marker[] {
    const layers = featureGroup.getLayers();
    return layers.filter((layer) => layer instanceof L.Marker) as L.Marker[];
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

  // ========================================================================
  // POTENTIALLY UNUSED METHODS - TO BE REVIEWED FOR DELETION
  // ========================================================================
  // /**
  //  * Get polygon from feature group
  //  */
  // private getPolygonFromFeatureGroup(featureGroup: PolydrawFeatureGroup): L.Polygon | null {
  //   const layers = featureGroup.getLayers();
  //   const polygon = layers.find((layer) => layer instanceof L.Polygon) as L.Polygon;
  //   return polygon || null;
  // }
  // /**
  //  * Validate coordinate array
  //  */
  // private isValidCoordinateArray(coords: ILatLng[]): boolean {
  //   if (!Array.isArray(coords) || coords.length === 0) {
  //     return false;
  //   }

  //   for (const coord of coords) {
  //     if (
  //       !coord ||
  //       typeof coord !== 'object' ||
  //       typeof coord.lat !== 'number' ||
  //       typeof coord.lng !== 'number' ||
  //       isNaN(coord.lat) ||
  //       isNaN(coord.lng)
  //     ) {
  //       return false;
  //     }
  //   }

  //   return true;
  // }
}
