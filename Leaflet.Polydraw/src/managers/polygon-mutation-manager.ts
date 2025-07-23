import * as L from 'leaflet';
import { TurfHelper } from '../turf-helper';
import { PolygonInformationService } from '../polygon-information.service';
import { IconFactory } from '../icon-factory';
import { PolygonUtil } from '../polygon.util';
import { MarkerPosition } from '../enums';
import { Compass, PolyDrawUtil, Perimeter, Area } from '../utils';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type {
  PolydrawConfig,
  PolydrawPolygon,
  PolydrawEdgePolyline,
} from '../types/polydraw-interfaces';

export interface MutationResult {
  success: boolean;
  featureGroups?: L.FeatureGroup[];
  error?: string;
}

export interface AddPolygonOptions {
  simplify?: boolean;
  noMerge?: boolean;
  dynamicTolerance?: boolean;
  visualOptimizationLevel?: number;
}

import { ModeManager } from './mode-manager';

export interface MutationManagerDependencies {
  turfHelper: TurfHelper;
  polygonInformation: PolygonInformationService;
  map: L.Map;
  config: PolydrawConfig;
  modeManager: ModeManager;
}

/**
 * PolygonMutationManager handles all polygon creation, modification, and manipulation operations.
 * This separates the business logic from the user interaction logic in polydraw.ts.
 */
export class PolygonMutationManager {
  private turfHelper: TurfHelper;
  private polygonInformation: PolygonInformationService;
  private map: L.Map;
  private config: PolydrawConfig;
  private modeManager: ModeManager;
  private arrayOfFeatureGroups: L.FeatureGroup[] = [];
  private eventListeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  // Simple polygon drag state
  private currentDragPolygon: any = null;
  private currentModifierDragMode: boolean = false;
  private isModifierKeyHeld: boolean = false;

  constructor(dependencies: MutationManagerDependencies) {
    console.log('PolygonMutationManager constructor');
    this.turfHelper = dependencies.turfHelper;
    this.polygonInformation = dependencies.polygonInformation;
    this.map = dependencies.map;
    this.config = dependencies.config;
    this.modeManager = dependencies.modeManager;
  }

  /**
   * Set the reference to the feature groups array
   */
  setFeatureGroups(featureGroups: L.FeatureGroup[]): void {
    console.log('PolygonMutationManager setFeatureGroups');
    this.arrayOfFeatureGroups = featureGroups;
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (...args: any[]) => void): void {
    console.log('PolygonMutationManager on');
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data?: any): void {
    console.log('PolygonMutationManager emit');
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  /**
   * Add a polygon with optional merging logic
   */
  async addPolygon(
    latlngs: Feature<Polygon | MultiPolygon>,
    options: AddPolygonOptions = {},
  ): Promise<MutationResult> {
    console.log('PolygonMutationManager addPolygon');
    const { simplify = true, noMerge = false } = options;

    try {
      if (
        this.config.mergePolygons &&
        !noMerge &&
        this.arrayOfFeatureGroups.length > 0 &&
        !this.config.kinks
      ) {
        return await this.mergePolygon(latlngs);
      } else {
        return await this.addPolygonLayer(latlngs, options);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in addPolygon',
      };
    }
  }

  /**
   * Subtract a polygon from existing polygons
   */
  async subtractPolygon(latlngs: Feature<Polygon | MultiPolygon>): Promise<MutationResult> {
    console.log('PolygonMutationManager subtractPolygon');
    try {
      // Find only the polygons that actually intersect with the subtract area
      const intersectingFeatureGroups: L.FeatureGroup[] = [];

      this.arrayOfFeatureGroups.forEach((featureGroup) => {
        try {
          const featureCollection = featureGroup.toGeoJSON() as any;
          if (!featureCollection || !featureCollection.features || !featureCollection.features[0]) {
            return;
          }

          const firstFeature = featureCollection.features[0];
          if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
            return;
          }

          const existingPolygon = this.turfHelper.getTurfPolygon(firstFeature);

          // Check if the subtract area intersects with this polygon
          const hasIntersection = this.checkPolygonIntersection(existingPolygon, latlngs);

          if (hasIntersection) {
            intersectingFeatureGroups.push(featureGroup);
          }
        } catch (error) {
          // Continue with other feature groups
        }
      });

      // Only apply subtract to intersecting polygons
      const resultFeatureGroups: L.FeatureGroup[] = [];

      for (const featureGroup of intersectingFeatureGroups) {
        try {
          const featureCollection = featureGroup.toGeoJSON() as any;
          const feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

          // Perform the difference operation (subtract)
          const newPolygon = this.turfHelper.polygonDifference(feature, latlngs);

          // Remove the original polygon
          this.removeFeatureGroup(featureGroup);

          // Add the result (polygon with hole or remaining parts)
          if (newPolygon) {
            const coords = this.turfHelper.getCoords(newPolygon);
            for (const value of coords) {
              const result = await this.addPolygonLayer(this.turfHelper.getMultiPolygon([value]), {
                simplify: true,
              });
              if (result.success && result.featureGroups) {
                resultFeatureGroups.push(...result.featureGroups);
              }
            }
          }
        } catch (error) {
          // Continue with other feature groups
        }
      }

      this.emit('polygonSubtracted', {
        subtractedPolygon: latlngs,
        affectedFeatureGroups: intersectingFeatureGroups,
        resultFeatureGroups,
      });

      // Emit completion event to signal that polygon operation is complete
      this.emit('polygonOperationComplete', {
        operation: 'subtract',
        polygon: latlngs,
        resultFeatureGroups,
      });

      return {
        success: true,
        featureGroups: resultFeatureGroups,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in subtractPolygon',
      };
    }
  }

  /**
   * Create and add a polygon layer with all markers and interactions
   */
  private async addPolygonLayer(
    latlngs: Feature<Polygon | MultiPolygon>,
    options: AddPolygonOptions = {},
  ): Promise<MutationResult> {
    console.log('PolygonMutationManager addPolygonLayer');
    const { simplify = true, dynamicTolerance = false, visualOptimizationLevel = 0 } = options;

    try {
      // Validate input
      if (!latlngs || !latlngs.geometry || !latlngs.geometry.coordinates) {
        return { success: false, error: 'Invalid polygon data' };
      }

      const featureGroup: L.FeatureGroup = new L.FeatureGroup();

      const latLngs = simplify ? this.turfHelper.getSimplified(latlngs, dynamicTolerance) : latlngs;

      let polygon: PolydrawPolygon;
      try {
        polygon = this.getPolygon(latLngs) as PolydrawPolygon;
        if (!polygon) {
          return { success: false, error: 'Failed to create polygon' };
        }
        polygon._polydrawOptimizationLevel = visualOptimizationLevel;
        featureGroup.addLayer(polygon);
      } catch (error) {
        return { success: false, error: 'Failed to create polygon layer' };
      }

      // Safely get marker coordinates
      let markerLatlngs;
      try {
        markerLatlngs = polygon.getLatLngs();
        if (!markerLatlngs || !Array.isArray(markerLatlngs)) {
          markerLatlngs = [];
        }
      } catch (error) {
        markerLatlngs = [];
      }

      // Add markers with error handling
      try {
        markerLatlngs.forEach((polygon) => {
          if (!polygon || !Array.isArray(polygon)) {
            return;
          }
          polygon.forEach((polyElement: L.LatLngLiteral[], i: number) => {
            if (!polyElement || !Array.isArray(polyElement) || polyElement.length === 0) {
              return;
            }

            try {
              if (i === 0) {
                this.addMarker(polyElement, featureGroup);
              } else {
                // Add red polyline overlay for hole rings
                const holePolyline = L.polyline(polyElement, {
                  color: this.config.holeOptions.color,
                  weight: this.config.holeOptions.weight || 2,
                  opacity: this.config.holeOptions.opacity || 1,
                });
                featureGroup.addLayer(holePolyline);

                this.addHoleMarker(polyElement, featureGroup);
              }
            } catch (markerError) {
              // Continue with other elements
            }
          });
        });
      } catch (error) {
        // Continue without markers if they fail
      }

      // Add edge click listeners for polygon edge interactions
      try {
        this.addEdgeClickListeners(polygon, featureGroup);
      } catch (error) {
        // Continue without edge listeners if they fail
      }

      this.arrayOfFeatureGroups.push(featureGroup);

      // Add to map - this should be done after all setup is complete
      try {
        featureGroup.addTo(this.map);
      } catch (error) {
        // The polygon is still added to arrayOfFeatureGroups for functionality
      }

      this.emit('polygonAdded', { polygon: latLngs, featureGroup });

      // Emit completion event to signal that polygon operation is complete
      this.emit('polygonOperationComplete', { operation: 'add', polygon: latLngs, featureGroup });

      return {
        success: true,
        featureGroups: [featureGroup],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in addPolygonLayer',
      };
    }
  }

  /**
   * Merge a polygon with existing intersecting polygons
   */
  private async mergePolygon(latlngs: Feature<Polygon | MultiPolygon>): Promise<MutationResult> {
    console.log('PolygonMutationManager mergePolygon');
    try {
      const polygonFeature = [];
      const intersectingFeatureGroups: L.FeatureGroup[] = [];
      let polyIntersection: boolean = false;

      this.arrayOfFeatureGroups.forEach((featureGroup) => {
        try {
          const featureCollection = featureGroup.toGeoJSON() as any;
          if (!featureCollection || !featureCollection.features || !featureCollection.features[0]) {
            return;
          }

          const firstFeature = featureCollection.features[0];
          if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
            return;
          }

          if (firstFeature.geometry.coordinates.length > 1) {
            firstFeature.geometry.coordinates.forEach((element) => {
              try {
                const feature = this.turfHelper.getMultiPolygon([element]);
                polyIntersection = this.checkPolygonIntersection(feature, latlngs);
                if (polyIntersection) {
                  intersectingFeatureGroups.push(featureGroup);
                  polygonFeature.push(feature);
                }
              } catch (error) {
                // Continue with other elements
              }
            });
          } else {
            try {
              const feature = this.turfHelper.getTurfPolygon(firstFeature);
              polyIntersection = this.checkPolygonIntersection(feature, latlngs);
              if (polyIntersection) {
                intersectingFeatureGroups.push(featureGroup);
                polygonFeature.push(feature);
              }
            } catch (error) {
              // Continue with other features
            }
          }
        } catch (error) {
          // Continue with other feature groups
        }
      });

      if (intersectingFeatureGroups.length > 0) {
        return await this.unionPolygons(intersectingFeatureGroups, latlngs, polygonFeature);
      } else {
        return await this.addPolygonLayer(latlngs, { simplify: true });
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in mergePolygon',
      };
    }
  }

  /**
   * Union multiple polygons together
   */
  private async unionPolygons(
    layers: L.FeatureGroup[],
    latlngs: Feature<Polygon | MultiPolygon>,
    polygonFeature: Feature<Polygon | MultiPolygon>[],
  ): Promise<MutationResult> {
    console.log('PolygonMutationManager unionPolygons');
    try {
      let addNew = latlngs;

      for (let i = 0; i < layers.length; i++) {
        const featureGroup = layers[i];
        const featureCollection = featureGroup.toGeoJSON() as any;
        const layer = featureCollection.features[0];

        // Check if this is a case where we should create a donut instead of a simple union
        const shouldCreateDonut = this.shouldCreateDonutPolygon(addNew, polygonFeature[i]);

        if (shouldCreateDonut) {
          // Create donut polygon by making the smaller polygon a hole in the larger one
          const donutPolygon = this.createDonutPolygon(addNew, polygonFeature[i]);
          if (donutPolygon) {
            this.removeFeatureGroup(featureGroup);
            addNew = donutPolygon;
          } else {
            // Fallback to regular union if donut creation fails
            const union = this.turfHelper.union(addNew, polygonFeature[i]);
            this.removeFeatureGroup(featureGroup);
            addNew = union;
          }
        } else {
          // Regular union operation
          const union = this.turfHelper.union(addNew, polygonFeature[i]);
          this.removeFeatureGroup(featureGroup);
          addNew = union;
        }
      }

      const result = await this.addPolygonLayer(addNew, { simplify: true });

      this.emit('polygonsUnioned', {
        originalPolygons: polygonFeature,
        resultPolygon: addNew,
        featureGroups: result.featureGroups,
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in unionPolygons',
      };
    }
  }

  /**
   * Check if two polygons intersect using multiple detection methods
   */
  private checkPolygonIntersection(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ): boolean {
    console.log('PolygonMutationManager checkPolygonIntersection');
    // Method 1: Check if one polygon is completely within the other (for donut scenarios)
    try {
      const poly1WithinPoly2 = this.turfHelper.isPolygonCompletelyWithin(polygon1, polygon2);
      const poly2WithinPoly1 = this.turfHelper.isPolygonCompletelyWithin(polygon2, polygon1);

      if (poly1WithinPoly2 || poly2WithinPoly1) {
        return true;
      }
    } catch (error) {
      // Continue to next method
    }

    // Method 2: Try the original polygonIntersect
    try {
      const result = this.turfHelper.polygonIntersect(polygon1, polygon2);
      if (result) {
        return true;
      }
    } catch (error) {
      // Continue to next method
    }

    // Method 3: Try direct intersection check with area validation
    try {
      const intersection = this.turfHelper.getIntersection(polygon1, polygon2);
      if (
        intersection &&
        intersection.geometry &&
        (intersection.geometry.type === 'Polygon' || intersection.geometry.type === 'MultiPolygon')
      ) {
        // Check if the intersection has meaningful area (not just touching edges/points)
        const intersectionArea = this.turfHelper.getPolygonArea(intersection);
        if (intersectionArea > 0.000001) {
          // Very small threshold for meaningful intersection
          return true;
        }
      }
    } catch (error) {
      // Continue to next method
    }

    // Method 4: Check for vertex containment (one polygon's vertices inside the other)
    try {
      const coords1 = this.turfHelper.getCoords(polygon1);
      const coords2 = this.turfHelper.getCoords(polygon2);

      // Check if any vertex of polygon2 is inside polygon1
      for (const ring2 of coords2) {
        for (const coord of ring2[0]) {
          // First ring (outer ring)
          const point = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coord },
            properties: {},
          };
          if (this.turfHelper.isPolygonCompletelyWithin(point as any, polygon1)) {
            return true;
          }
        }
      }

      // Check if any vertex of polygon1 is inside polygon2
      for (const ring1 of coords1) {
        for (const coord of ring1[0]) {
          // First ring (outer ring)
          const point = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coord },
            properties: {},
          };
          if (this.turfHelper.isPolygonCompletelyWithin(point as any, polygon2)) {
            return true;
          }
        }
      }
    } catch (error) {
      // Continue to next method
    }

    // Method 5: Bounding box overlap check with distance validation
    try {
      const bbox1 = this.getBoundingBox(polygon1);
      const bbox2 = this.getBoundingBox(polygon2);

      if (bbox1 && bbox2) {
        const overlaps = !(
          bbox1.maxLng < bbox2.minLng ||
          bbox2.maxLng < bbox1.minLng ||
          bbox1.maxLat < bbox2.minLat ||
          bbox2.maxLat < bbox1.minLat
        );

        if (overlaps) {
          // Additional check: only return true if polygons are very close
          const center1 = this.getPolygonCenter(polygon1);
          const center2 = this.getPolygonCenter(polygon2);

          if (center1 && center2) {
            const distance = Math.sqrt(
              Math.pow(center1.lng - center2.lng, 2) + Math.pow(center1.lat - center2.lat, 2),
            );

            // Only consider it an intersection if polygons are very close (within 0.01 degrees)
            if (distance < 0.01) {
              return true;
            }
          }
        }
      }
    } catch (error) {
      // Continue to fallback
    }

    return false;
  }

  /**
   * Helper method to get polygon center - using PolygonUtil for consistency
   */
  private getPolygonCenter(
    polygon: Feature<Polygon | MultiPolygon>,
  ): { lat: number; lng: number } | null {
    console.log('PolygonMutationManager getPolygonCenter');
    try {
      if (!polygon || !polygon.geometry || !polygon.geometry.coordinates) {
        return null;
      }

      let coordinates;
      if (polygon.geometry.type === 'Polygon') {
        coordinates = polygon.geometry.coordinates[0]; // First ring (outer ring)
      } else if (polygon.geometry.type === 'MultiPolygon') {
        coordinates = polygon.geometry.coordinates[0][0]; // First polygon, first ring
      } else {
        return null;
      }

      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        return null;
      }

      // Convert GeoJSON coordinates to LatLng format for PolygonUtil
      const latLngs: L.LatLngLiteral[] = coordinates.map((coord) => ({
        lat: coord[1],
        lng: coord[0],
      }));

      // Use PolygonUtil for the actual center calculation
      const center = PolygonUtil.getCenter(latLngs);
      return center;
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper method to get bounding box from polygon
   */
  private getBoundingBox(
    polygon: Feature<Polygon | MultiPolygon>,
  ): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
    console.log('PolygonMutationManager getBoundingBox');
    try {
      if (!polygon || !polygon.geometry || !polygon.geometry.coordinates) {
        return null;
      }

      let coordinates;
      if (polygon.geometry.type === 'Polygon') {
        coordinates = polygon.geometry.coordinates[0]; // First ring (outer ring)
      } else if (polygon.geometry.type === 'MultiPolygon') {
        coordinates = polygon.geometry.coordinates[0][0]; // First polygon, first ring
      } else {
        return null;
      }

      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        return null;
      }

      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLng = Infinity;
      let maxLng = -Infinity;

      for (const coord of coordinates) {
        if (Array.isArray(coord) && coord.length >= 2) {
          const lng = coord[0];
          const lat = coord[1];

          if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          }
        }
      }

      if (
        minLat === Infinity ||
        maxLat === -Infinity ||
        minLng === Infinity ||
        maxLng === -Infinity
      ) {
        return null;
      }

      return { minLat, maxLat, minLng, maxLng };
    } catch (error) {
      return null;
    }
  }

  /**
   * Determine if two polygons should create a donut instead of a regular union
   */
  private shouldCreateDonutPolygon(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ): boolean {
    console.log('PolygonMutationManager shouldCreateDonutPolygon');
    try {
      // NEVER create donuts - always merge polygons
      // The user specifically reported that small + large surrounding polygons
      // should merge, not create holes. This is the expected behavior.
      return false;
    } catch (error) {
      console.warn('Error in shouldCreateDonutPolygon:', error.message);
      return false;
    }
  }

  /**
   * Create a donut polygon from two intersecting polygons
   */
  private createDonutPolygon(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> | null {
    console.log('PolygonMutationManager createDonutPolygon');
    try {
      // Determine which polygon should be the outer ring and which should be the hole
      const area1 = this.turfHelper.getPolygonArea(polygon1);
      const area2 = this.turfHelper.getPolygonArea(polygon2);

      let outerPolygon: Feature<Polygon | MultiPolygon>;
      let innerPolygon: Feature<Polygon | MultiPolygon>;

      if (area1 > area2) {
        outerPolygon = polygon1;
        innerPolygon = polygon2;
      } else {
        outerPolygon = polygon2;
        innerPolygon = polygon1;
      }

      // Check if the smaller polygon is completely within the larger one
      const innerWithinOuter = this.turfHelper.isPolygonCompletelyWithin(
        innerPolygon,
        outerPolygon,
      );

      if (innerWithinOuter) {
        // Create donut by making inner polygon a hole in outer polygon
        return this.createDonutFromContainment(outerPolygon, innerPolygon);
      } else {
        // Handle C-to-O scenario: create union first, then subtract intersection
        return this.createDonutFromIntersection(outerPolygon, innerPolygon);
      }
    } catch (error) {
      console.warn('Error in createDonutPolygon:', error.message);
      return null;
    }
  }

  /**
   * Create donut when one polygon is completely within another
   */
  private createDonutFromContainment(
    outerPolygon: Feature<Polygon | MultiPolygon>,
    innerPolygon: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> | null {
    console.log('PolygonMutationManager createDonutFromContainment');
    try {
      // Get coordinates from both polygons
      const outerCoords = this.turfHelper.getCoords(outerPolygon);
      const innerCoords = this.turfHelper.getCoords(innerPolygon);

      // Create donut polygon: outer ring + inner ring as hole
      const donutCoords = [
        outerCoords[0][0], // Outer ring
        innerCoords[0][0], // Inner ring as hole
      ];

      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: donutCoords,
        },
        properties: {},
      };
    } catch (error) {
      console.warn('Error in createDonutFromContainment:', error.message);
      return null;
    }
  }

  /**
   * Create donut from intersecting polygons (C-to-O scenario)
   */
  private createDonutFromIntersection(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> | null {
    console.log('PolygonMutationManager createDonutFromIntersection');
    try {
      // First, create union of the two polygons
      const union = this.turfHelper.union(polygon1, polygon2);
      if (!union) {
        return null;
      }

      // Get the intersection area
      const intersection = this.turfHelper.getIntersection(polygon1, polygon2);
      if (!intersection) {
        return union; // No intersection, return regular union
      }

      // Create donut by subtracting intersection from union
      const donut = this.turfHelper.polygonDifference(union, intersection);
      return donut;
    } catch (error) {
      console.warn('Error in createDonutFromIntersection:', error.message);
      return null;
    }
  }

  /**
   * Create a polygon from GeoJSON feature
   */
  private getPolygon(latlngs: Feature<Polygon | MultiPolygon>) {
    console.log('PolygonMutationManager getPolygon');
    const polygon = L.GeoJSON.geometryToLayer(latlngs) as any;
    polygon.setStyle(this.config.polygonOptions);

    // Enable polygon dragging if configured
    if (this.config.modes.dragPolygons) {
      this.enablePolygonDragging(polygon, latlngs);
    }

    return polygon;
  }

  /**
   * Remove a feature group from the map and array
   */
  private removeFeatureGroup(featureGroup: L.FeatureGroup) {
    console.log('PolygonMutationManager removeFeatureGroup');
    featureGroup.clearLayers();
    this.arrayOfFeatureGroups = this.arrayOfFeatureGroups.filter(
      (featureGroups) => featureGroups !== featureGroup,
    );
    this.map.removeLayer(featureGroup);
  }

  // Marker management methods
  private addMarker(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup) {
    console.log('PolygonMutationManager addMarker');
    // Get initial marker positions
    let menuMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerMenuIcon.position);
    let deleteMarkerIdx = this.getMarkerIndex(
      latlngs,
      this.config.markers.markerDeleteIcon.position,
    );
    let infoMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerInfoIcon.position);

    // Apply fallback separation logic to ensure markers don't overlap
    const separatedIndices = this.ensureMarkerSeparation(latlngs.length, {
      menu: { index: menuMarkerIdx, enabled: this.config.markers.menuMarker },
      delete: { index: deleteMarkerIdx, enabled: this.config.markers.deleteMarker },
      info: { index: infoMarkerIdx, enabled: this.config.markers.infoMarker },
    });

    // Update indices with separated values
    menuMarkerIdx = separatedIndices.menu;
    deleteMarkerIdx = separatedIndices.delete;
    infoMarkerIdx = separatedIndices.info;

    latlngs.forEach((latlng, i) => {
      let iconClasses = this.config.markers.markerIcon.styleClasses;
      if (i === menuMarkerIdx && this.config.markers.menuMarker) {
        iconClasses = this.config.markers.markerMenuIcon.styleClasses;
      }
      if (i === deleteMarkerIdx && this.config.markers.deleteMarker) {
        iconClasses = this.config.markers.markerDeleteIcon.styleClasses;
      }
      if (i === infoMarkerIdx && this.config.markers.infoMarker) {
        iconClasses = this.config.markers.markerInfoIcon.styleClasses;
      }

      const processedClasses = Array.isArray(iconClasses) ? iconClasses : [iconClasses];
      const marker = new L.Marker(latlng, {
        icon: this.createDivIcon(processedClasses),
        draggable: this.config.modes.dragElbow,
        title: this.config.markers.coordsTitle ? this.getLatLngInfoString(latlng) : '',
        zIndexOffset:
          this.config.markers.markerIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
      });

      featureGroup.addLayer(marker).addTo(this.map);

      // Set high z-index for special markers to ensure they're always visible on top
      if (i === menuMarkerIdx || i === deleteMarkerIdx || i === infoMarkerIdx) {
        const element = marker.getElement();
        if (element) {
          element.style.zIndex = '10000';
        }
      }

      if (this.config.modes.dragElbow) {
        marker.on('drag', (e) => {
          this.markerDrag(featureGroup);
        });
        marker.on('dragend', (e) => {
          this.markerDragEnd(featureGroup);
        });
      }

      if (i === menuMarkerIdx && this.config.markers.menuMarker) {
        const menuPopup = this.generateMenuMarkerPopup(latlngs, featureGroup);
        marker.options.zIndexOffset =
          this.config.markers.markerMenuIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
        marker.bindPopup(menuPopup, { className: 'alter-marker' });
      }
      if (i === infoMarkerIdx && this.config.markers.infoMarker) {
        // Get the complete polygon GeoJSON to properly handle holes
        const polygonGeoJSON = this.getPolygonGeoJSONFromFeatureGroup(featureGroup);
        const area = this.turfHelper.getPolygonArea(polygonGeoJSON);
        const perimeter = this.getTotalPolygonPerimeter(polygonGeoJSON);
        const infoPopup = this.generateInfoMarkerPopup(area, perimeter);
        marker.options.zIndexOffset =
          this.config.markers.markerInfoIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
        marker.bindPopup(infoPopup, { className: 'info-marker' });
      }

      // Forward mousedown events to the map when in drawing mode
      marker.on('mousedown', (e) => {
        if (!this.modeManager.isInOffMode()) {
          L.DomEvent.stopPropagation(e);
          this.map.fire('mousedown', e);
        }
      });

      // Generic click handler for all markers
      marker.on('click', (e) => {
        if (this.modeManager.isInOffMode()) {
          if (this.isModifierKeyPressed(e.originalEvent)) {
            const poly = (
              featureGroup.getLayers().find((layer) => layer instanceof L.Polygon) as L.Polygon
            )?.toGeoJSON();
            if (poly) {
              this.elbowClicked(e, poly);
            }
          } else {
            // Handle non-modifier clicks for special markers
            if (i === deleteMarkerIdx && this.config.markers.deleteMarker) {
              this.removeFeatureGroup(featureGroup);
              this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
            }
          }
        }
      });

      // Add hover listeners for edge deletion feedback
      marker.on('mouseover', () => this.onMarkerHoverForEdgeDeletion(marker, true));
      marker.on('mouseout', () => this.onMarkerHoverForEdgeDeletion(marker, false));
    });
  }

  private addHoleMarker(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup) {
    console.log('PolygonMutationManager addHoleMarker');
    latlngs.forEach((latlng, i) => {
      // Use holeIcon styles instead of regular markerIcon styles
      const iconClasses = this.config.markers.holeIcon.styleClasses;
      const processedClasses = Array.isArray(iconClasses) ? iconClasses : [iconClasses];
      const marker = new L.Marker(latlng, {
        icon: this.createDivIcon(processedClasses),
        draggable: true,
        title: this.getLatLngInfoString(latlng),
        zIndexOffset: this.config.markers.holeIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
      });
      featureGroup.addLayer(marker).addTo(this.map);

      marker.on('drag', (e) => {
        this.markerDrag(featureGroup);
      });
      marker.on('dragend', (e) => {
        this.markerDragEnd(featureGroup);
      });
    });
  }

  private addEdgeClickListeners(polygon: L.Polygon, featureGroup: L.FeatureGroup): void {
    console.log('PolygonMutationManager addEdgeClickListeners');
    const rawLatLngs = polygon.getLatLngs();

    // Handle different polygon structures
    let processedRings: L.LatLngLiteral[][];

    if (Array.isArray(rawLatLngs) && rawLatLngs.length > 0) {
      if (Array.isArray(rawLatLngs[0])) {
        if (Array.isArray(rawLatLngs[0][0]) && rawLatLngs[0][0].length > 0) {
          const firstCoord = rawLatLngs[0][0][0];
          if (firstCoord && typeof firstCoord === 'object' && 'lat' in firstCoord) {
            processedRings = rawLatLngs[0] as L.LatLngLiteral[][];
          } else {
            processedRings = rawLatLngs[0] as L.LatLngLiteral[][];
          }
        } else if (
          rawLatLngs[0][0] &&
          typeof rawLatLngs[0][0] === 'object' &&
          'lat' in rawLatLngs[0][0]
        ) {
          processedRings = rawLatLngs as L.LatLngLiteral[][];
        } else {
          processedRings = rawLatLngs[0] as L.LatLngLiteral[][];
        }
      } else if (rawLatLngs[0] && typeof rawLatLngs[0] === 'object' && 'lat' in rawLatLngs[0]) {
        processedRings = [rawLatLngs as L.LatLngLiteral[]];
      } else {
        processedRings = [rawLatLngs as L.LatLngLiteral[]];
      }
    } else {
      return;
    }

    processedRings.forEach((ring, ringIndex) => {
      for (let i = 0; i < ring.length; i++) {
        const edgeStart = ring[i];
        const edgeEnd = ring[(i + 1) % ring.length];

        if (edgeStart.lat === edgeEnd.lat && edgeStart.lng === edgeEnd.lng) {
          continue;
        }

        const edgePolyline = L.polyline([edgeStart, edgeEnd], {
          color: 'transparent',
          weight: 10,
          opacity: 0,
          interactive: true,
        });

        (edgePolyline as PolydrawEdgePolyline)._polydrawEdgeInfo = {
          ringIndex,
          edgeIndex: i,
          startPoint: edgeStart,
          endPoint: edgeEnd,
          parentPolygon: polygon,
          parentFeatureGroup: featureGroup,
        };

        edgePolyline.on('click', (e: L.LeafletMouseEvent) => {
          this.onEdgeClick(e, edgePolyline);
        });

        edgePolyline.on('mouseover', () => {
          this.highlightEdgeOnHover(edgePolyline, true);
        });

        edgePolyline.on('mouseout', () => {
          this.highlightEdgeOnHover(edgePolyline, false);
        });

        featureGroup.addLayer(edgePolyline);
      }
    });
  }

  private onEdgeClick(e: L.LeafletMouseEvent, edgePolyline: L.Polyline): void {
    console.log('PolygonMutationManager onEdgeClick');
    if (!this.modeManager.isInOffMode()) {
      return;
    }
    const edgeInfo = (edgePolyline as PolydrawEdgePolyline)._polydrawEdgeInfo;
    if (!edgeInfo) return;
    const newPoint = e.latlng;
    const parentPolygon = edgeInfo.parentPolygon;
    const parentFeatureGroup = edgeInfo.parentFeatureGroup;
    if (parentPolygon && parentFeatureGroup) {
      try {
        if (typeof parentPolygon.toGeoJSON !== 'function') {
          return;
        }
        const poly = parentPolygon.toGeoJSON();
        if (poly.geometry.type === 'MultiPolygon' || poly.geometry.type === 'Polygon') {
          const newPolygon = this.turfHelper.injectPointToPolygon(poly, [
            newPoint.lng,
            newPoint.lat,
          ]);
          if (newPolygon) {
            const polydrawPolygon = parentPolygon as PolydrawPolygon;
            const optimizationLevel = polydrawPolygon._polydrawOptimizationLevel || 0;
            this.removeFeatureGroup(parentFeatureGroup);
            this.addPolygonLayer(newPolygon, {
              simplify: false,
              dynamicTolerance: false,
              visualOptimizationLevel: optimizationLevel,
            });
          }
        }
      } catch (error) {
        // Handle errors
      }
    }
    L.DomEvent.stopPropagation(e);
  }

  private highlightEdgeOnHover(edgePolyline: L.Polyline, isHovering: boolean): void {
    console.log('PolygonMutationManager highlightEdgeOnHover');
    if (isHovering) {
      edgePolyline.setStyle({
        color: '#7a9441',
        weight: 4,
        opacity: 1,
      });
    } else {
      edgePolyline.setStyle({
        color: 'transparent',
        weight: 10,
        opacity: 0,
      });
    }
  }

  private elbowClicked(e: any, poly: Feature<Polygon | MultiPolygon>) {
    console.log('PolygonMutationManager elbowClicked');
    if (!this.isModifierKeyPressed(e.originalEvent)) {
      return;
    }

    const clickedLatLng = e.latlng;
    const allRings = poly.geometry.coordinates[0];

    let targetRingIndex = -1;
    let targetVertexIndex = -1;

    for (let ringIndex = 0; ringIndex < allRings.length; ringIndex++) {
      const ring = allRings[ringIndex];
      const vertexIndex = ring.findIndex(
        (coord) =>
          Math.abs(coord[1] - clickedLatLng.lat) < 0.0001 &&
          Math.abs(coord[0] - clickedLatLng.lng) < 0.0001,
      );

      if (vertexIndex !== -1) {
        targetRingIndex = ringIndex;
        targetVertexIndex = vertexIndex;
        break;
      }
    }

    if (targetRingIndex === -1 || targetVertexIndex === -1) {
      return;
    }

    const targetRing = allRings[targetRingIndex];
    if (targetRing.length <= 4) {
      return;
    }

    const newAllRings = allRings.map((ring, ringIndex) => {
      if (ringIndex === targetRingIndex) {
        const newRing = [...ring];
        newRing.splice(targetVertexIndex, 1);
        return newRing;
      } else {
        return [...ring];
      }
    });

    const currentFeatureGroup = this.findFeatureGroupForPoly(poly);
    if (currentFeatureGroup) {
      this.removeFeatureGroup(currentFeatureGroup);
    }

    const newPolygon = this.turfHelper.getMultiPolygon([newAllRings]);
    this.addPolygonLayer(newPolygon, { simplify: false });
  }

  private findFeatureGroupForPoly(poly: Feature<Polygon | MultiPolygon>): L.FeatureGroup | null {
    console.log('PolygonMutationManager findFeatureGroupForPoly');
    for (const featureGroup of this.arrayOfFeatureGroups) {
      const featureCollection = featureGroup.toGeoJSON() as any;
      if (featureCollection && featureCollection.features && featureCollection.features[0]) {
        const feature = featureCollection.features[0];
        if (
          JSON.stringify(feature.geometry.coordinates) === JSON.stringify(poly.geometry.coordinates)
        ) {
          return featureGroup;
        }
      }
    }
    return null;
  }

  private isModifierKeyPressed(event: MouseEvent): boolean {
    console.log('PolygonMutationManager isModifierKeyPressed');
    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = userAgent.includes('mac');

    if (isMac) {
      return event.metaKey;
    } else {
      return event.ctrlKey;
    }
  }

  // Helper methods
  private getMarkerIndex(latlngs: L.LatLngLiteral[], position: MarkerPosition): number {
    console.log('PolygonMutationManager getMarkerIndex');
    const bounds: L.LatLngBounds = PolyDrawUtil.getBounds(latlngs, Math.sqrt(2) / 2);
    const compass = new Compass(
      bounds.getSouth(),
      bounds.getWest(),
      bounds.getNorth(),
      bounds.getEast(),
    );
    const compassDirection = compass.getDirection(position);
    const latLngPoint: L.LatLngLiteral = {
      lat: compassDirection.lat,
      lng: compassDirection.lng,
    };
    const targetPoint = this.turfHelper.getCoord(latLngPoint);
    const fc = this.turfHelper.getFeaturePointCollection(latlngs);
    const nearestPointIdx = this.turfHelper.getNearestPointIndex(targetPoint, fc as any);
    return nearestPointIdx;
  }

  private ensureMarkerSeparation(
    polygonLength: number,
    markers: {
      menu: { index: number; enabled: boolean };
      delete: { index: number; enabled: boolean };
      info: { index: number; enabled: boolean };
    },
  ): { menu: number; delete: number; info: number } {
    console.log('PolygonMutationManager ensureMarkerSeparation');
    // Get list of enabled markers with their indices
    const enabledMarkers: Array<{ type: string; index: number }> = [];

    if (markers.menu.enabled) {
      enabledMarkers.push({ type: 'menu', index: markers.menu.index });
    }
    if (markers.delete.enabled) {
      enabledMarkers.push({ type: 'delete', index: markers.delete.index });
    }
    if (markers.info.enabled) {
      enabledMarkers.push({ type: 'info', index: markers.info.index });
    }

    // If less than 2 markers enabled, no overlap possible
    if (enabledMarkers.length < 2) {
      return {
        menu: markers.menu.index,
        delete: markers.delete.index,
        info: markers.info.index,
      };
    }

    // Check for overlaps and resolve them
    const resolvedIndices = { ...markers };
    const usedIndices = new Set<number>();

    // Process markers in priority order: info, delete, menu
    const processingOrder = ['info', 'delete', 'menu'];

    for (const markerType of processingOrder) {
      const marker = resolvedIndices[markerType as keyof typeof resolvedIndices];

      if (!marker.enabled) continue;

      // If this index is already used, find a new one
      if (usedIndices.has(marker.index)) {
        const newIndex = this.findAlternativeMarkerPosition(
          polygonLength,
          marker.index,
          usedIndices,
        );
        resolvedIndices[markerType as keyof typeof resolvedIndices].index = newIndex;
        usedIndices.add(newIndex);
      } else {
        usedIndices.add(marker.index);
      }
    }

    return {
      menu: resolvedIndices.menu.index,
      delete: resolvedIndices.delete.index,
      info: resolvedIndices.info.index,
    };
  }

  private findAlternativeMarkerPosition(
    polygonLength: number,
    originalIndex: number,
    usedIndices: Set<number>,
  ): number {
    console.log('PolygonMutationManager findAlternativeMarkerPosition');
    // Strategy: Try positions at regular intervals around the polygon
    // Start with positions that are far from the original
    const maxAttempts = polygonLength;
    const step = Math.max(1, Math.floor(polygonLength / 8)); // Try every 1/8th of polygon

    // Try positions moving away from the original index
    for (let attempt = 1; attempt < maxAttempts; attempt++) {
      // Try both directions from original position
      const candidates = [
        (originalIndex + attempt * step) % polygonLength,
        (originalIndex - attempt * step + polygonLength) % polygonLength,
      ];

      for (const candidate of candidates) {
        if (!usedIndices.has(candidate)) {
          return candidate;
        }
      }
    }

    // Fallback: find any unused index
    for (let i = 0; i < polygonLength; i++) {
      if (!usedIndices.has(i)) {
        return i;
      }
    }

    // Ultimate fallback: return original index (shouldn't happen in practice)
    return originalIndex;
  }

  private createDivIcon(processedClasses: string[]): L.DivIcon {
    console.log('PolygonMutationManager createDivIcon');
    return IconFactory.createDivIcon(processedClasses);
  }

  private getLatLngInfoString(latlng: L.LatLngLiteral): string {
    console.log('PolygonMutationManager getLatLngInfoString');
    return 'Latitude: ' + latlng.lat + ' Longitude: ' + latlng.lng;
  }

  private markerDrag(featureGroup: L.FeatureGroup) {
    console.log('PolygonMutationManager markerDrag');
    const newPos = [];
    let testarray = [];
    let hole = [];
    const layerLength = featureGroup.getLayers() as any;
    const posarrays = layerLength[0].getLatLngs();
    let length = 0;

    // Filter out only markers from the layers (exclude polylines for holes)
    const markers = layerLength.filter((layer: any) => layer instanceof L.Marker);

    if (posarrays.length > 1) {
      for (let index = 0; index < posarrays.length; index++) {
        testarray = [];
        hole = [];
        if (index === 0) {
          if (posarrays[0].length > 1) {
            for (let i = 0; i < posarrays[0].length; i++) {
              for (let j = 0; j < posarrays[0][i].length; j++) {
                if (markers[j]) {
                  testarray.push(markers[j].getLatLng());
                }
              }
              hole.push(testarray);
            }
          } else {
            for (let j = 0; j < posarrays[0][0].length; j++) {
              if (markers[j]) {
                testarray.push(markers[j].getLatLng());
              }
            }
            hole.push(testarray);
          }
          newPos.push(hole);
        } else {
          length += posarrays[index - 1][0].length;
          for (let j = length; j < posarrays[index][0].length + length; j++) {
            if (markers[j]) {
              testarray.push(markers[j].getLatLng());
            }
          }
          hole.push(testarray);
          newPos.push(hole);
        }
      }
    } else {
      hole = [];
      let length2 = 0;
      for (let index = 0; index < posarrays[0].length; index++) {
        testarray = [];
        if (index === 0) {
          if (posarrays[0][index].length > 1) {
            for (let j = 0; j < posarrays[0][index].length; j++) {
              if (markers[j]) {
                testarray.push(markers[j].getLatLng());
              }
            }
          } else {
            for (let j = 0; j < posarrays[0][0].length; j++) {
              if (markers[j]) {
                testarray.push(markers[j].getLatLng());
              }
            }
          }
        } else {
          length2 += posarrays[0][index - 1].length;
          for (let j = length2; j < posarrays[0][index].length + length2; j++) {
            if (markers[j]) {
              testarray.push(markers[j].getLatLng());
            }
          }
        }
        hole.push(testarray);
      }
      newPos.push(hole);
    }
    layerLength[0].setLatLngs(newPos);
  }

  private async markerDragEnd(featureGroup: L.FeatureGroup) {
    console.log('PolygonMutationManager markerDragEnd');
    this.polygonInformation.deletePolygonInformationStorage();
    const featureCollection = featureGroup.toGeoJSON() as any;

    // Remove the current feature group first to avoid duplication
    this.removeFeatureGroup(featureGroup);

    if (featureCollection.features[0].geometry.coordinates.length > 1) {
      for (const element of featureCollection.features[0].geometry.coordinates) {
        const feature = this.turfHelper.getMultiPolygon([element]);

        if (this.turfHelper.hasKinks(feature)) {
          const unkink = this.turfHelper.getKinks(feature);
          for (const polygon of unkink) {
            // Allow merging after marker drag - this enables polygon merging when dragged into each other
            await this.addPolygon(this.turfHelper.getTurfPolygon(polygon), { noMerge: false });
          }
        } else {
          // Allow merging after marker drag - this enables polygon merging when dragged into each other
          await this.addPolygon(feature, { noMerge: false });
        }
      }
    } else {
      const feature = this.turfHelper.getMultiPolygon(
        featureCollection.features[0].geometry.coordinates,
      );

      if (this.turfHelper.hasKinks(feature)) {
        const unkink = this.turfHelper.getKinks(feature);
        for (const polygon of unkink) {
          // Allow merging after marker drag - this enables polygon merging when dragged into each other
          await this.addPolygon(this.turfHelper.getTurfPolygon(polygon), { noMerge: false });
        }
      } else {
        // Allow merging after marker drag - this enables polygon merging when dragged into each other
        await this.addPolygon(feature, { noMerge: false });
      }
    }
    this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
  }

  private generateMenuMarkerPopup(
    latLngs: L.LatLngLiteral[],
    featureGroup: L.FeatureGroup,
  ): HTMLDivElement {
    console.log('PolygonMutationManager generateMenuMarkerPopup');
    const outerWrapper: HTMLDivElement = document.createElement('div');
    outerWrapper.classList.add('alter-marker-outer-wrapper');
    const wrapper: HTMLDivElement = document.createElement('div');
    wrapper.classList.add('alter-marker-wrapper');
    const invertedCorner: HTMLElement = document.createElement('i');
    invertedCorner.classList.add('inverted-corner');
    const markerContent: HTMLDivElement = document.createElement('div');
    markerContent.classList.add('content');
    const markerContentWrapper: HTMLDivElement = document.createElement('div');
    markerContentWrapper.classList.add('marker-menu-content');

    const simplify: HTMLDivElement = document.createElement('div');
    simplify.classList.add('marker-menu-button', 'simplify');
    simplify.title = 'Simplify';

    const doubleElbows: HTMLDivElement = document.createElement('div');
    doubleElbows.classList.add('marker-menu-button', 'double-elbows');
    doubleElbows.title = 'DoubleElbows';

    const bbox: HTMLDivElement = document.createElement('div');
    bbox.classList.add('marker-menu-button', 'bbox');
    bbox.title = 'Bounding box';

    const bezier: HTMLDivElement = document.createElement('div');
    bezier.classList.add('marker-menu-button', 'bezier');
    bezier.title = 'Curve';

    const separator: HTMLDivElement = document.createElement('div');
    separator.classList.add('separator');

    outerWrapper.appendChild(wrapper);
    wrapper.appendChild(invertedCorner);
    wrapper.appendChild(markerContent);
    markerContent.appendChild(markerContentWrapper);
    markerContentWrapper.appendChild(simplify);
    markerContentWrapper.appendChild(separator.cloneNode());
    markerContentWrapper.appendChild(doubleElbows);
    markerContentWrapper.appendChild(separator.cloneNode());
    markerContentWrapper.appendChild(bbox);
    markerContentWrapper.appendChild(separator.cloneNode());
    markerContentWrapper.appendChild(bezier);

    simplify.onclick = () => {
      this.convertToSimplifiedPolygon(latLngs, featureGroup);
    };
    bbox.onclick = () => {
      this.convertToBoundsPolygon(latLngs, featureGroup);
    };
    doubleElbows.onclick = () => {
      this.doubleElbows(latLngs, featureGroup);
    };
    bezier.onclick = () => {
      this.bezierify(latLngs, featureGroup);
    };

    return outerWrapper;
  }

  private getPolygonGeoJSONFromFeatureGroup(
    featureGroup: L.FeatureGroup,
  ): Feature<Polygon | MultiPolygon> {
    console.log('PolygonMutationManager getPolygonGeoJSONFromFeatureGroup');
    try {
      // Find the polygon layer in the feature group
      let polygon: L.Polygon | null = null;
      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          polygon = layer;
        }
      });

      if (!polygon) {
        // Fallback: create a simple polygon from the first ring
        throw new Error('No polygon found in feature group');
      }

      // Get the complete GeoJSON including holes
      return polygon.toGeoJSON() as Feature<Polygon | MultiPolygon>;
    } catch (error) {
      console.warn('Error getting polygon GeoJSON from feature group:', error.message);
      // Fallback: return a simple polygon
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };
    }
  }

  private getTotalPolygonPerimeter(polygonGeoJSON: Feature<Polygon | MultiPolygon>): number {
    console.log('PolygonMutationManager getTotalPolygonPerimeter');
    try {
      if (!polygonGeoJSON || !polygonGeoJSON.geometry) {
        return 0;
      }

      let totalPerimeter = 0;

      if (polygonGeoJSON.geometry.type === 'Polygon') {
        // For a single polygon, sum all ring perimeters
        const coordinates = polygonGeoJSON.geometry.coordinates;

        for (const ring of coordinates) {
          // Create a temporary polygon for each ring to calculate its perimeter
          const ringPolygon: Feature<Polygon> = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [ring],
            },
            properties: {},
          };

          const ringPerimeter = this.turfHelper.getPolygonPerimeter(ringPolygon);
          totalPerimeter += ringPerimeter;
        }
      } else if (polygonGeoJSON.geometry.type === 'MultiPolygon') {
        // For multipolygon, sum all polygons' total perimeters
        const coordinates = polygonGeoJSON.geometry.coordinates;

        for (const polygonCoords of coordinates) {
          for (const ring of polygonCoords) {
            const ringPolygon: Feature<Polygon> = {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [ring],
              },
              properties: {},
            };

            const ringPerimeter = this.turfHelper.getPolygonPerimeter(ringPolygon);
            totalPerimeter += ringPerimeter;
          }
        }
      }

      // Convert from kilometers to meters to match original behavior
      return totalPerimeter * 1000;
    } catch (error) {
      console.warn('Error calculating total polygon perimeter:', error.message);
      // Fallback to turf helper calculation
      return this.turfHelper.getPolygonPerimeter(polygonGeoJSON) * 1000;
    }
  }

  private generateInfoMarkerPopup(area: number, perimeter: number): HTMLDivElement {
    console.log('PolygonMutationManager generateInfoMarkerPopup');
    const _perimeter = new Perimeter(perimeter, this.config as any);
    const _area = new Area(area, this.config as any);

    const outerWrapper: HTMLDivElement = document.createElement('div');
    outerWrapper.classList.add('info-marker-outer-wrapper');
    const wrapper: HTMLDivElement = document.createElement('div');
    wrapper.classList.add('info-marker-wrapper');
    const invertedCorner: HTMLElement = document.createElement('i');
    invertedCorner.classList.add('inverted-corner');
    const markerContent: HTMLDivElement = document.createElement('div');
    markerContent.classList.add('content');

    // Create content wrapper for the info
    const infoContentWrapper: HTMLDivElement = document.createElement('div');
    infoContentWrapper.classList.add('info-marker-content');

    // Add area information
    const areaDiv: HTMLDivElement = document.createElement('div');
    areaDiv.classList.add('info-item', 'area');
    areaDiv.innerHTML = `<strong>Area:</strong> ${_area.metricArea} ${_area.metricUnit}`;

    // Add perimeter information
    const perimeterDiv: HTMLDivElement = document.createElement('div');
    perimeterDiv.classList.add('info-item', 'perimeter');
    perimeterDiv.innerHTML = `<strong>Perimeter:</strong> ${_perimeter.metricLength} ${_perimeter.metricUnit}`;

    // Assemble the popup
    infoContentWrapper.appendChild(areaDiv);
    infoContentWrapper.appendChild(perimeterDiv);
    markerContent.appendChild(infoContentWrapper);

    outerWrapper.appendChild(wrapper);
    wrapper.appendChild(invertedCorner);
    wrapper.appendChild(markerContent);

    return outerWrapper;
  }

  private onMarkerHoverForEdgeDeletion(marker: L.Marker, isHovering: boolean): void {
    console.log('PolygonMutationManager onMarkerHoverForEdgeDeletion');
    const element = marker.getElement();
    if (!element) return;

    if (isHovering && this.isModifierKeyHeld) {
      element.style.backgroundColor = '#D9460F';
      element.style.borderColor = '#D9460F';
      element.classList.add('edge-deletion-hover');
    } else if (!isHovering) {
      element.style.backgroundColor = '';
      element.style.borderColor = '';
      element.classList.remove('edge-deletion-hover');
    }
  }

  private deletePolygon(polygon: L.LatLngLiteral[][]) {
    // TODO: Implement method
  }

  // Menu marker popup button methods
  private async convertToSimplifiedPolygon(
    latlngs: L.LatLngLiteral[],
    featureGroup: L.FeatureGroup,
  ) {
    console.log('PolygonMutationManager convertToSimplifiedPolygon');
    try {
      // Remove the original polygon
      this.removeFeatureGroup(featureGroup);

      // A valid polygon needs at least 4 points (3 unique vertices + closing point)
      if (latlngs.length <= 4) {
        // Cannot simplify, so just add the original polygon back
        const coords = [[latlngs.map((latlng) => [latlng.lng, latlng.lat] as [number, number])]];
        const newPolygon = this.turfHelper.getMultiPolygon(coords);
        await this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), { simplify: false });
        return;
      }

      // Remove every other point to simplify
      const simplifiedLatLngs: L.LatLngLiteral[] = [];
      for (let i = 0; i < latlngs.length; i += 2) {
        simplifiedLatLngs.push(latlngs[i]);
      }

      // Ensure the simplified polygon is closed
      const firstPoint = simplifiedLatLngs[0];
      const lastPoint = simplifiedLatLngs[simplifiedLatLngs.length - 1];
      if (firstPoint.lat !== lastPoint.lat || firstPoint.lng !== lastPoint.lng) {
        simplifiedLatLngs.push(firstPoint);
      }

      // Check if the simplified polygon is still valid
      if (simplifiedLatLngs.length < 4) {
        // Simplification resulted in an invalid polygon, add the original back
        const coords = [[latlngs.map((latlng) => [latlng.lng, latlng.lat] as [number, number])]];
        const newPolygon = this.turfHelper.getMultiPolygon(coords);
        await this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), { simplify: false });
        return;
      }

      const coords = [
        [simplifiedLatLngs.map((latlng) => [latlng.lng, latlng.lat] as [number, number])],
      ];
      const newPolygon = this.turfHelper.getMultiPolygon(coords);
      await this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), { simplify: false });
    } catch (error) {
      console.warn('Error in convertToSimplifiedPolygon:', error.message);
    }
  }

  private async convertToBoundsPolygon(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup) {
    console.log('PolygonMutationManager convertToBoundsPolygon');
    try {
      // Remove the original polygon
      this.removeFeatureGroup(featureGroup);

      const coords = [[latlngs.map((latlng) => [latlng.lng, latlng.lat] as [number, number])]];
      const polygon = this.turfHelper.getMultiPolygon(coords);
      const newPolygon = this.turfHelper.convertToBoundingBoxPolygon(polygon);
      await this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), { simplify: false });
    } catch (error) {
      console.warn('Error in convertToBoundsPolygon:', error.message);
    }
  }

  private async doubleElbows(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup) {
    console.log('PolygonMutationManager doubleElbows');
    try {
      // Remove the original polygon
      this.removeFeatureGroup(featureGroup);

      const doubleLatLngs: L.LatLngLiteral[] = this.turfHelper.getDoubleElbowLatLngs(latlngs);
      const coords = [
        [doubleLatLngs.map((latlng) => [latlng.lng, latlng.lat] as [number, number])],
      ];
      const newPolygon = this.turfHelper.getMultiPolygon(coords);
      await this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), {
        simplify: false,
        dynamicTolerance: false,
      });
    } catch (error) {
      console.warn('Error in doubleElbows:', error.message);
    }
  }

  private async bezierify(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup) {
    console.log('PolygonMutationManager bezierify');
    try {
      // Remove the original polygon
      this.removeFeatureGroup(featureGroup);

      const coords = [[latlngs.map((latlng) => [latlng.lng, latlng.lat] as [number, number])]];
      const newPolygon = this.turfHelper.getBezierMultiPolygon(coords);
      await this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), {
        simplify: false,
        dynamicTolerance: false,
      });
    } catch (error) {
      console.warn('Error in bezierify:', error.message);
    }
  }

  // Polygon dragging methods
  private enablePolygonDragging(polygon: any, latlngs: Feature<Polygon | MultiPolygon>) {
    console.log('PolygonMutationManager enablePolygonDragging');
    if (!this.config.modes.dragPolygons) return;

    polygon._polydrawOriginalLatLngs = latlngs;
    polygon._polydrawDragData = {
      isDragging: false,
      startPosition: null,
      startLatLngs: null,
    };

    polygon.on('mousedown', (e: any) => {
      // If not in off mode, it's a drawing click. Forward to map and stop.
      if (!this.modeManager.isInOffMode()) {
        // Stop this event from becoming a drag, but fire it on the map for drawing.
        L.DomEvent.stopPropagation(e);
        this.map.fire('mousedown', e);
        return;
      }

      if (!this.modeManager.canPerformAction('polygonDrag')) {
        return;
      }
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);

      const isModifierPressed = this.detectModifierKey(e.originalEvent || e);
      this.currentModifierDragMode = isModifierPressed;
      this.isModifierKeyHeld = isModifierPressed;

      polygon._polydrawDragData.isDragging = true;
      polygon._polydrawDragData.startPosition = e.latlng;
      polygon._polydrawDragData.startLatLngs = polygon.getLatLngs();

      if (this.map.dragging) {
        this.map.dragging.disable();
      }

      this.setSubtractVisualMode(polygon, isModifierPressed);

      try {
        const container = this.map.getContainer();
        container.style.cursor = this.config.dragPolygons.dragCursor || 'move';
      } catch (error) {
        // Handle DOM errors
      }

      this.map.on('mousemove', this.onPolygonMouseMove, this);
      this.map.on('mouseup', this.onPolygonMouseUp, this);

      this.currentDragPolygon = polygon;
    });

    polygon.on('mouseover', () => {
      if (!polygon._polydrawDragData.isDragging) {
        try {
          const container = this.map.getContainer();
          container.style.cursor = this.config.dragPolygons.hoverCursor || 'grab';
        } catch (error) {
          // Handle DOM errors
        }
      }
    });

    polygon.on('mouseout', () => {
      if (!polygon._polydrawDragData.isDragging) {
        try {
          const container = this.map.getContainer();
          container.style.cursor = '';
        } catch (error) {
          // Handle DOM errors
        }
      }
    });
  }

  private onPolygonMouseMove = (e: L.LeafletMouseEvent) => {
    console.log('PolygonMutationManager onPolygonMouseMove');
    if (!this.currentDragPolygon || !this.currentDragPolygon._polydrawDragData.isDragging) return;

    const polygon = this.currentDragPolygon;
    const dragData = polygon._polydrawDragData;

    const eventToCheck = e.originalEvent && 'metaKey' in e.originalEvent ? e.originalEvent : e;
    const currentModifierState = this.detectModifierKey(eventToCheck as MouseEvent);
    if (currentModifierState !== this.currentModifierDragMode) {
      this.handleModifierToggleDuringDrag(eventToCheck as MouseEvent);
    }

    const startPos = dragData.startPosition;
    const currentPos = e.latlng;
    const offsetLat = currentPos.lat - startPos.lat;
    const offsetLng = currentPos.lng - startPos.lng;

    const newLatLngs = this.offsetPolygonCoordinates(dragData.startLatLngs, offsetLat, offsetLng);
    polygon.setLatLngs(newLatLngs);

    this.updateMarkersAndHoleLinesDuringDrag(polygon, offsetLat, offsetLng);
  };

  private onPolygonMouseUp = (e: L.LeafletMouseEvent) => {
    console.log('PolygonMutationManager onPolygonMouseUp');
    if (!this.currentDragPolygon || !this.currentDragPolygon._polydrawDragData.isDragging) return;

    const polygon = this.currentDragPolygon;
    const dragData = polygon._polydrawDragData;

    dragData.isDragging = false;

    this.map.off('mousemove', this.onPolygonMouseMove, this);
    this.map.off('mouseup', this.onPolygonMouseUp, this);

    if (this.map.dragging) {
      this.map.dragging.enable();
    }

    try {
      const container = this.map.getContainer();
      container.style.cursor = '';
    } catch (error) {
      // Handle DOM errors
    }

    this.updatePolygonAfterDrag(polygon);

    if (polygon._polydrawOriginalMarkerPositions) {
      polygon._polydrawOriginalMarkerPositions.clear();
      delete polygon._polydrawOriginalMarkerPositions;
    }
    if (polygon._polydrawOriginalHoleLinePositions) {
      polygon._polydrawOriginalHoleLinePositions.clear();
      delete polygon._polydrawOriginalHoleLinePositions;
    }
    if (polygon._polydrawCurrentDragSession) {
      delete polygon._polydrawCurrentDragSession;
    }

    this.currentDragPolygon = null;
  };

  private offsetPolygonCoordinates(latLngs: any, offsetLat: number, offsetLng: number): any {
    console.log('PolygonMutationManager offsetPolygonCoordinates');
    if (!latLngs) return latLngs;

    if (Array.isArray(latLngs[0])) {
      return latLngs.map((ring: any) => this.offsetPolygonCoordinates(ring, offsetLat, offsetLng));
    } else if (latLngs.lat !== undefined && latLngs.lng !== undefined) {
      return {
        lat: latLngs.lat + offsetLat,
        lng: latLngs.lng + offsetLng,
      };
    } else {
      return latLngs.map((coord: any) =>
        this.offsetPolygonCoordinates(coord, offsetLat, offsetLng),
      );
    }
  }

  private updateMarkersAndHoleLinesDuringDrag(polygon: any, offsetLat: number, offsetLng: number) {
    console.log('PolygonMutationManager updateMarkersAndHoleLinesDuringDrag');
    try {
      let featureGroup: L.FeatureGroup | null = null;

      for (const fg of this.arrayOfFeatureGroups) {
        fg.eachLayer((layer) => {
          if (layer === polygon) {
            featureGroup = fg;
          }
        });
        if (featureGroup) break;
      }

      if (!featureGroup) {
        return;
      }

      const dragSessionKey = '_polydrawDragSession_' + Date.now();
      if (!polygon._polydrawCurrentDragSession) {
        polygon._polydrawCurrentDragSession = dragSessionKey;
        polygon._polydrawOriginalMarkerPositions = new Map();
        polygon._polydrawOriginalHoleLinePositions = new Map();

        featureGroup.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            polygon._polydrawOriginalMarkerPositions.set(layer, layer.getLatLng());
          } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            polygon._polydrawOriginalHoleLinePositions.set(layer, layer.getLatLngs());
          }
        });
      }

      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const originalPos = polygon._polydrawOriginalMarkerPositions.get(layer);
          if (originalPos) {
            const newLatLng = {
              lat: originalPos.lat + offsetLat,
              lng: originalPos.lng + offsetLng,
            };
            layer.setLatLng(newLatLng);
          }
        } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
          const originalPositions = polygon._polydrawOriginalHoleLinePositions.get(layer);
          if (originalPositions) {
            const newLatLngs = originalPositions.map((latlng: L.LatLng) => ({
              lat: latlng.lat + offsetLat,
              lng: latlng.lng + offsetLng,
            }));
            layer.setLatLngs(newLatLngs);
          }
        }
      });
    } catch (error) {
      // Silently handle errors
    }
  }

  private async updatePolygonAfterDrag(polygon: any) {
    console.log('PolygonMutationManager updatePolygonAfterDrag');
    try {
      let featureGroup: L.FeatureGroup | null = null;

      for (const fg of this.arrayOfFeatureGroups) {
        fg.eachLayer((layer) => {
          if (layer === polygon) {
            featureGroup = fg;
          }
        });
        if (featureGroup) break;
      }

      if (!featureGroup) {
        return;
      }

      const newGeoJSON = polygon.toGeoJSON();

      if (this.isModifierDragActive()) {
        this.performModifierSubtract(newGeoJSON, featureGroup);
        this.currentModifierDragMode = false;
        this.isModifierKeyHeld = false;
        return;
      }

      this.removeFeatureGroup(featureGroup);

      const feature = this.turfHelper.getTurfPolygon(newGeoJSON);
      await this.addPolygon(feature, { noMerge: false });

      this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
    } catch (error) {
      // Handle errors
    }
  }

  private detectModifierKey(event: MouseEvent): boolean {
    console.log('PolygonMutationManager detectModifierKey');
    if (!this.config.dragPolygons?.modifierSubtract?.enabled) {
      return false;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = userAgent.includes('mac');

    if (isMac) {
      return event.metaKey;
    } else {
      return event.ctrlKey;
    }
  }

  private setSubtractVisualMode(polygon: any, enabled: boolean): void {
    console.log('PolygonMutationManager setSubtractVisualMode');
    if (!polygon || !polygon.setStyle) {
      return;
    }

    try {
      if (enabled) {
        polygon.setStyle({
          color: this.config.dragPolygons.modifierSubtract.subtractColor,
        });
      } else {
        polygon.setStyle({
          color: this.config.polygonOptions.color,
        });
      }
      this.updateMarkerColorsForSubtractMode(polygon, enabled);
    } catch (error) {
      // Handle DOM errors
    }
  }

  private updateMarkerColorsForSubtractMode(polygon: any, subtractMode: boolean): void {
    console.log('PolygonMutationManager updateMarkerColorsForSubtractMode');
    try {
      let featureGroup: L.FeatureGroup | null = null;

      for (const fg of this.arrayOfFeatureGroups) {
        fg.eachLayer((layer) => {
          if (layer === polygon) {
            featureGroup = fg;
          }
        });
        if (featureGroup) break;
      }

      if (!featureGroup) {
        return;
      }

      const hideMarkersOnDrag =
        this.config.dragPolygons?.modifierSubtract?.hideMarkersOnDrag ?? false;

      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const marker = layer as L.Marker;
          const element = marker.getElement();

          if (element) {
            if (subtractMode) {
              if (hideMarkersOnDrag) {
                element.style.display = 'none';
                element.classList.add('subtract-mode-hidden');
              } else {
                element.style.backgroundColor =
                  this.config.dragPolygons.modifierSubtract.subtractColor;
                element.style.borderColor = this.config.dragPolygons.modifierSubtract.subtractColor;
                element.classList.add('subtract-mode');
              }
            } else {
              if (hideMarkersOnDrag) {
                element.style.display = '';
                element.classList.remove('subtract-mode-hidden');
              } else {
                element.style.backgroundColor = '';
                element.style.borderColor = '';
                element.classList.remove('subtract-mode');
              }
            }
          }
        }
      });
    } catch (error) {
      // Handle errors
    }
  }

  private handleModifierToggleDuringDrag(event: MouseEvent): void {
    console.log('PolygonMutationManager handleModifierToggleDuringDrag');
    const isModifierPressed = this.detectModifierKey(event);

    this.currentModifierDragMode = isModifierPressed;
    this.isModifierKeyHeld = isModifierPressed;

    if (this.currentDragPolygon) {
      this.setSubtractVisualMode(this.currentDragPolygon, isModifierPressed);
    }
  }

  private isModifierDragActive(): boolean {
    console.log('PolygonMutationManager isModifierDragActive');
    return this.currentModifierDragMode;
  }

  private performModifierSubtract(draggedGeoJSON: any, originalFeatureGroup: L.FeatureGroup): void {
    console.log('PolygonMutationManager performModifierSubtract');
    try {
      const draggedPolygon = this.turfHelper.getTurfPolygon(draggedGeoJSON);
      const intersectingFeatureGroups: L.FeatureGroup[] = [];

      this.arrayOfFeatureGroups.forEach((featureGroup) => {
        if (featureGroup === originalFeatureGroup) {
          return;
        }

        try {
          const featureCollection = featureGroup.toGeoJSON() as any;
          if (!featureCollection || !featureCollection.features || !featureCollection.features[0]) {
            return;
          }

          const firstFeature = featureCollection.features[0];
          if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
            return;
          }

          const existingPolygon = this.turfHelper.getTurfPolygon(firstFeature);
          const hasIntersection = this.checkPolygonIntersection(existingPolygon, draggedPolygon);

          if (hasIntersection) {
            intersectingFeatureGroups.push(featureGroup);
          }
        } catch (error) {
          // Handle errors
        }
      });

      this.removeFeatureGroup(originalFeatureGroup);

      intersectingFeatureGroups.forEach((featureGroup) => {
        try {
          const featureCollection = featureGroup.toGeoJSON() as any;
          const existingPolygon = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
          const differenceResult = this.turfHelper.polygonDifference(
            existingPolygon,
            draggedPolygon,
          );

          this.removeFeatureGroup(featureGroup);

          if (differenceResult) {
            const coords = this.turfHelper.getCoords(differenceResult);
            coords.forEach((value) => {
              this.addPolygonLayer(this.turfHelper.getMultiPolygon([value]), { simplify: true });
            });
          }
        } catch (error) {
          // Handle errors
        }
      });
    } catch (error) {
      // Handle errors
    }
  }
}
