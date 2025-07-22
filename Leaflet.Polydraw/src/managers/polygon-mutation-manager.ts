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

export interface MutationManagerDependencies {
  turfHelper: TurfHelper;
  polygonInformation: PolygonInformationService;
  map: L.Map;
  config: PolydrawConfig;
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
    // TODO: Implement method
    return { success: false, error: 'Not implemented' };
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
      if (i === deleteMarkerIdx && this.config.markers.deleteMarker) {
        marker.options.zIndexOffset =
          this.config.markers.markerInfoIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
        marker.on('click', (e) => {
          // Find the feature group containing this marker and delete it
          let targetFeatureGroup: L.FeatureGroup | null = null;
          for (const fg of this.arrayOfFeatureGroups) {
            fg.eachLayer((layer) => {
              if (layer === marker) {
                targetFeatureGroup = fg;
              }
            });
            if (targetFeatureGroup) break;
          }

          if (targetFeatureGroup) {
            this.removeFeatureGroup(targetFeatureGroup);
            this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
          }
        });
      }
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

  private addEdgeClickListeners(polygon: L.Polygon, featureGroup: L.FeatureGroup) {
    console.log('PolygonMutationManager addEdgeClickListeners');
    // This is a complex method that would need significant refactoring
    // For now, keep it as a placeholder to avoid breaking functionality
    // TODO: Implement edge click listeners in MutationManager
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
    // TODO: Implement method
  }

  private markerDragEnd(featureGroup: L.FeatureGroup) {
    // TODO: Implement method
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

  private deletePolygon(polygon: L.LatLngLiteral[][]) {
    // TODO: Implement method
  }

  // Menu marker popup button methods
  private convertToSimplifiedPolygon(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup) {
    // TODO: Implement method
  }

  private convertToBoundsPolygon(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup) {
    // TODO: Implement method
  }

  private doubleElbows(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup) {
    // TODO: Implement method
  }

  private bezierify(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup) {
    // TODO: Implement method
  }

  // Polygon dragging methods
  private enablePolygonDragging(polygon: any, latlngs: Feature<Polygon | MultiPolygon>) {
    // TODO: Implement method
  }

  private onPolygonMouseMove = (e: L.LeafletMouseEvent) => {
    // TODO: Implement method
  };

  private onPolygonMouseUp = (e: L.LeafletMouseEvent) => {
    // TODO: Implement method
  };

  private offsetPolygonCoordinates(latLngs: any, offsetLat: number, offsetLng: number): any {
    // TODO: Implement method
    return latLngs;
  }

  private updateMarkersAndHoleLinesDuringDrag(polygon: any, offsetLat: number, offsetLng: number) {
    // TODO: Implement method
  }

  private updatePolygonAfterDrag(polygon: any) {
    // TODO: Implement method
  }

  /**
   * Detect if modifier key is pressed during drag operation
   */
  private detectModifierKey(event: MouseEvent): boolean {
    // TODO: Implement method
    return false;
  }

  /**
   * Set visual feedback for subtract mode during drag
   */
  private setSubtractVisualMode(polygon: any, enabled: boolean): void {
    // TODO: Implement method
  }

  /**
   * Update marker colors when entering/exiting subtract mode
   */
  private updateMarkerColorsForSubtractMode(polygon: any, subtractMode: boolean): void {
    // TODO: Implement method
  }

  /**
   * Handle modifier key toggle during active drag operation
   */
  private handleModifierToggleDuringDrag(event: MouseEvent): void {
    // TODO: Implement method
  }

  /**
   * Check if modifier drag mode is currently active
   */
  private isModifierDragActive(): boolean {
    // TODO: Implement method
    return false;
  }

  /**
   * Perform subtract operation when modifier key is held during drag
   */
  private performModifierSubtract(draggedGeoJSON: any, originalFeatureGroup: L.FeatureGroup): void {
    // TODO: Implement method
  }
}
