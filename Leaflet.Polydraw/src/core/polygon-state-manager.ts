/**
 * PolygonStateManager - Simplified polygon operations with single point of truth
 *
 * This class implements the pattern:
 * 1. deletePolygon(oldPolygon)
 * 2. // modify coordinates/geometry
 * 3. addPolygon(newPolygon)
 *
 * All polygon operations go through this centralized system.
 */

import * as L from 'leaflet';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { ILatLng, PolydrawConfig, PolydrawFeatureGroup } from '../types/polydraw-interfaces';
import { TurfHelper } from '../turf-helper';
import { PolydrawStateManager } from './state-manager';

export interface PolygonData {
  id: string;
  geoJSON: Feature<Polygon | MultiPolygon>;
  featureGroup: PolydrawFeatureGroup;
  optimizationLevel: number;
}

export class PolygonStateManager {
  private polygons: Map<string, PolygonData> = new Map();
  private nextId = 1;

  constructor(
    private config: PolydrawConfig,
    private turfHelper: TurfHelper,
    private map: L.Map,
    private stateManager: PolydrawStateManager,
    private createFeatureGroupCallback: (
      geoJSON: Feature<Polygon | MultiPolygon>,
      optimizationLevel: number,
    ) => PolydrawFeatureGroup,
  ) {}

  /**
   * Add a new polygon - the single entry point for all polygon creation
   */
  addPolygon(
    geoJSON: Feature<Polygon | MultiPolygon>,
    optimizationLevel: number = 0,
    skipMergeCheck: boolean = false,
  ): string[] {
    console.log('🔧 PolygonStateManager.addPolygon() - Adding polygon:', geoJSON);

    // Check for merge opportunities first (unless skipped)
    if (!skipMergeCheck && this.config.mergePolygons) {
      const mergeResult = this.checkForMerges(geoJSON);
      if (mergeResult.shouldMerge) {
        console.log('🔧 PolygonStateManager.addPolygon() - Merging with existing polygons');
        return this.performMerge(geoJSON, mergeResult.intersectingIds, optimizationLevel);
      }
    }

    // Handle MultiPolygon by splitting into separate polygons
    if (geoJSON.geometry.type === 'MultiPolygon' && geoJSON.geometry.coordinates.length > 1) {
      console.log('🔧 PolygonStateManager.addPolygon() - Splitting MultiPolygon');
      const ids: string[] = [];

      geoJSON.geometry.coordinates.forEach((polygonCoords) => {
        const singlePolygon: Feature<Polygon> = {
          type: 'Feature',
          properties: geoJSON.properties || {},
          geometry: {
            type: 'Polygon',
            coordinates: polygonCoords,
          },
        };
        const id = this.addSinglePolygon(singlePolygon, optimizationLevel);
        ids.push(id);
      });

      return ids;
    }

    // Add single polygon
    const id = this.addSinglePolygon(geoJSON, optimizationLevel);
    return [id];
  }

  /**
   * Remove a polygon by ID
   */
  removePolygon(id: string): boolean {
    const polygonData = this.polygons.get(id);
    if (!polygonData) {
      return false;
    }

    // Remove from map
    try {
      this.map.removeLayer(polygonData.featureGroup);
    } catch (error) {
      console.warn('Error removing polygon from map:', error);
    }

    // Remove from state manager
    this.stateManager.removeFeatureGroup(polygonData.featureGroup);

    // Remove from our tracking
    this.polygons.delete(id);

    console.log('🔧 PolygonStateManager.removePolygon() - Removed polygon:', id);
    return true;
  }

  /**
   * Update a polygon with new coordinates (from marker drag)
   */
  updatePolygon(id: string, newGeoJSON: Feature<Polygon | MultiPolygon>): string[] {
    console.log('🔧 PolygonStateManager.updatePolygon() - Updating polygon:', id);

    // Remove the old polygon
    if (!this.removePolygon(id)) {
      console.warn('Failed to remove polygon for update:', id);
      return [];
    }

    // Add the updated polygon (this will handle merging automatically)
    return this.addPolygon(newGeoJSON);
  }

  /**
   * Subtract one polygon from others
   */
  subtractPolygon(subtractGeoJSON: Feature<Polygon | MultiPolygon>): string[] {
    console.log('🔧 PolygonStateManager.subtractPolygon() - Subtracting polygon');

    const intersectingIds = this.findIntersectingPolygons(subtractGeoJSON);
    const newIds: string[] = [];

    if (intersectingIds.length === 0) {
      console.log(
        '🔧 PolygonStateManager.subtractPolygon() - No intersections, nothing to subtract',
      );
      return [];
    }

    // Process each intersecting polygon
    intersectingIds.forEach((id) => {
      const polygonData = this.polygons.get(id);
      if (!polygonData) return;

      try {
        // Perform difference operation
        const difference = this.turfHelper.polygonDifference(polygonData.geoJSON, subtractGeoJSON);

        // Remove the original polygon
        this.removePolygon(id);

        // Add the result if it exists
        if (difference) {
          const resultIds = this.addPolygon(difference, polygonData.optimizationLevel, true);
          newIds.push(...resultIds);
        }
      } catch (error) {
        console.error('Error in subtract operation:', error);
        // Keep the original polygon if subtract fails
      }
    });

    return newIds;
  }

  /**
   * Get all polygons
   */
  getAllPolygons(): PolygonData[] {
    return Array.from(this.polygons.values());
  }

  /**
   * Get polygon by ID
   */
  getPolygon(id: string): PolygonData | undefined {
    return this.polygons.get(id);
  }

  /**
   * Clear all polygons
   */
  clearAll(): void {
    const ids = Array.from(this.polygons.keys());
    ids.forEach((id) => this.removePolygon(id));
  }

  /**
   * Get polygon count
   */
  getCount(): number {
    return this.polygons.size;
  }

  // ===== PRIVATE METHODS =====

  /**
   * Add a single polygon without merge checking
   */
  private addSinglePolygon(
    geoJSON: Feature<Polygon | MultiPolygon>,
    optimizationLevel: number,
  ): string {
    const id = this.generateId();

    // Create feature group using callback
    const featureGroup = this.createFeatureGroupCallback(geoJSON, optimizationLevel);

    // Store polygon data
    const polygonData: PolygonData = {
      id,
      geoJSON,
      featureGroup,
      optimizationLevel,
    };

    this.polygons.set(id, polygonData);

    // Add to state manager
    this.stateManager.addFeatureGroup(featureGroup);

    console.log('🔧 PolygonStateManager.addSinglePolygon() - Added polygon:', id);
    return id;
  }

  /**
   * Check if a new polygon should merge with existing ones
   */
  private checkForMerges(newGeoJSON: Feature<Polygon | MultiPolygon>): {
    shouldMerge: boolean;
    intersectingIds: string[];
  } {
    const intersectingIds = this.findIntersectingPolygons(newGeoJSON);

    return {
      shouldMerge: intersectingIds.length > 0,
      intersectingIds,
    };
  }

  /**
   * Find polygons that intersect with the given polygon
   */
  private findIntersectingPolygons(targetGeoJSON: Feature<Polygon | MultiPolygon>): string[] {
    const intersectingIds: string[] = [];

    for (const [id, polygonData] of this.polygons) {
      try {
        // Check for intersection
        let hasIntersection = false;

        // Method 1: Direct intersection check
        try {
          const intersection = this.turfHelper.getIntersection(targetGeoJSON, polygonData.geoJSON);
          if (intersection && intersection.geometry) {
            hasIntersection = true;
          }
        } catch (error) {
          // Method 1 failed, try method 2
        }

        // Method 2: Use polygonIntersect method
        if (!hasIntersection) {
          try {
            hasIntersection = this.turfHelper.polygonIntersect(targetGeoJSON, polygonData.geoJSON);
          } catch (error) {
            // Method 2 failed, continue
          }
        }

        if (hasIntersection) {
          intersectingIds.push(id);
        }
      } catch (error) {
        console.warn('Error checking intersection with polygon:', id, error);
      }
    }

    return intersectingIds;
  }

  /**
   * Perform merge operation
   */
  private performMerge(
    newGeoJSON: Feature<Polygon | MultiPolygon>,
    intersectingIds: string[],
    optimizationLevel: number,
  ): string[] {
    let mergedGeoJSON = newGeoJSON;

    // Merge with all intersecting polygons
    intersectingIds.forEach((id) => {
      const polygonData = this.polygons.get(id);
      if (!polygonData) return;

      try {
        // Check if new polygon is completely contained (should create hole)
        const difference = this.turfHelper.polygonDifference(polygonData.geoJSON, newGeoJSON);
        if (
          difference &&
          difference.geometry.type === 'Polygon' &&
          difference.geometry.coordinates.length > 1
        ) {
          // Create hole - use difference result
          mergedGeoJSON = difference;
        } else {
          // Normal merge - use union
          const union = this.turfHelper.union(mergedGeoJSON, polygonData.geoJSON);
          if (union) {
            mergedGeoJSON = union;
          }
        }

        // Remove the merged polygon
        this.removePolygon(id);
      } catch (error) {
        console.error('Error in merge operation:', error);
      }
    });

    // Add the final merged result
    return this.addPolygon(mergedGeoJSON, optimizationLevel, true);
  }

  /**
   * Generate unique ID for polygons
   */
  private generateId(): string {
    return `polygon_${this.nextId++}`;
  }
}
