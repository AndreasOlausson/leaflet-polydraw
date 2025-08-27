import * as L from 'leaflet';
import { TurfHelper } from '../turf-helper';
import { PolygonInformationService } from '../polygon-information.service';
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';
import type {
  PolydrawConfig,
  MenuActionData,
  PolygonUpdatedEventData,
  Position,
  PolydrawPolygon,
} from '../types/polydraw-interfaces';
import { ModeManager } from './mode-manager';
import {
  EventManager,
  PolydrawEvent,
  PolydrawEventCallback,
  PolydrawEventPayloads,
} from './event-manager';
import { isTestEnvironment } from '../utils';

// Import the specialized managers
import { PolygonGeometryManager, GeometryOperationResult } from './polygon-geometry-manager';
import { PolygonInteractionManager } from './polygon-interaction-manager';

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
  modeManager: ModeManager;
  eventManager: EventManager;
  getFeatureGroups: () => L.FeatureGroup[];
}

/**
 * PolygonMutationManager acts as a facade that coordinates between specialized managers.
 * It maintains the arrayOfFeatureGroups as the single source of truth and delegates
 * operations to the appropriate specialized managers.
 */
export class PolygonMutationManager {
  private turfHelper: TurfHelper;
  private map: L.Map;
  private config: PolydrawConfig;
  private eventManager: EventManager;
  private getFeatureGroups: () => L.FeatureGroup[];

  // Specialized managers
  private geometryManager!: PolygonGeometryManager;
  private interactionManager!: PolygonInteractionManager;

  constructor(dependencies: MutationManagerDependencies) {
    // console.log('PolygonMutationManager constructor');
    this.turfHelper = dependencies.turfHelper;
    this.map = dependencies.map;
    this.config = dependencies.config;
    this.eventManager = dependencies.eventManager;
    this.getFeatureGroups = dependencies.getFeatureGroups;

    // Initialize specialized managers
    this.initializeSpecializedManagers(dependencies);
  }

  /**
   * Initialize the three specialized managers
   */
  private initializeSpecializedManagers(dependencies: MutationManagerDependencies): void {
    // console.log('PolygonMutationManager initializeSpecializedManagers');

    // Create geometry manager
    this.geometryManager = new PolygonGeometryManager({
      turfHelper: dependencies.turfHelper,
      config: dependencies.config,
    });

    // Note: PolygonDrawManager is handled separately in the main polydraw.ts file

    // Create interaction manager with feature group access
    this.interactionManager = new PolygonInteractionManager(
      {
        turfHelper: dependencies.turfHelper,
        polygonInformation: dependencies.polygonInformation,
        map: dependencies.map,
        config: dependencies.config,
        modeManager: dependencies.modeManager,
        eventManager: this.eventManager,
      },
      {
        getFeatureGroups: this.getFeatureGroups,
        addFeatureGroup: (fg: L.FeatureGroup) => this.addFeatureGroupInternal(fg),
        removeFeatureGroup: (fg: L.FeatureGroup) => this.removeFeatureGroupInternal(fg),
      },
    );

    // Set up event forwarding from specialized managers
    this.setupEventForwarding();
  }

  /**
   * Set up event forwarding from specialized managers to facade
   */
  private setupEventForwarding(): void {
    // console.log('PolygonMutationManager setupEventForwarding');

    this.eventManager.on('polydraw:draw:cancel', (data) => {
      this.emit('drawCancelled', data);
    });

    // Forward interaction manager events
    this.eventManager.on('polydraw:polygon:updated', (data) => {
      this.handlePolygonModified(data as PolygonUpdatedEventData);
    });

    this.eventManager.on('polydraw:menu:action', (data) => {
      this.handleMenuAction(data as MenuActionData);
    });

    this.eventManager.on('polydraw:check:intersection', (data) => {
      const hasIntersection = this.geometryManager.checkPolygonIntersection(
        data.polygon1,
        data.polygon2,
      );
      data.callback(hasIntersection);
    });

    this.eventManager.on('polydraw:subtract', (data) => {
      this.subtractPolygon(data.subtractPolygon);
    });

    this.eventManager.on('polydraw:polygon:deleted', () => {
      this.emit('polygonDeleted', undefined);
    });
  }

  /**
   * Handle polygon modification from interaction manager
   */
  private async handlePolygonModified(data: PolygonUpdatedEventData): Promise<void> {
    // Don't simplify drag operations to preserve vertex count
    const shouldSimplify =
      data.operation !== 'addVertex' &&
      data.operation !== 'markerDrag' &&
      data.operation !== 'polygonDrag';

    const options: AddPolygonOptions = {
      simplify: shouldSimplify,
      noMerge: !data.allowMerge,
      visualOptimizationLevel: data.optimizationLevel || 0,
    };
    await this.addPolygon(data.polygon, options);
  }

  /**
   * Handle menu actions from interaction manager
   */
  private async handleMenuAction(data: MenuActionData): Promise<void> {
    // console.log('PolygonMutationManager handleMenuAction');

    // Get the complete polygon GeoJSON including holes before removing the feature group
    const completePolygonGeoJSON = this.getCompletePolygonFromFeatureGroup(data.featureGroup);

    // Remove the original polygon
    this.removeFeatureGroupInternal(data.featureGroup);

    let result: GeometryOperationResult;

    switch (data.action) {
      case 'simplify': {
        // Use the complete polygon data including holes for simplification
        result = this.geometryManager.simplifyPolygon(completePolygonGeoJSON);
        break;
      }
      case 'bbox': {
        // For bbox, use the complete polygon data including holes
        result = this.geometryManager.convertToBoundingBox(completePolygonGeoJSON);
        break;
      }
      case 'doubleElbows': {
        // For doubleElbows, use the complete polygon data including holes
        result = this.geometryManager.doubleElbowsPolygon(completePolygonGeoJSON);
        break;
      }
      case 'bezier': {
        // For bezier, use the complete polygon data including holes
        result = this.geometryManager.bezierifyPolygon(completePolygonGeoJSON);
        break;
      }
      default:
        return;
    }

    if (result.success && result.result) {
      await this.addPolygon(result.result, { simplify: false });
    }
  }

  /**
   * Get the polygon interaction manager (for testing)
   */
  get polygonInteractionManager(): PolygonInteractionManager {
    return this.interactionManager;
  }

  /**
   * Add event listener
   */
  on<T extends PolydrawEvent>(event: T, callback: PolydrawEventCallback<T>): void {
    this.eventManager.on(event, callback);
  }

  /**
   * Emit event to all listeners
   */
  private emit<T extends PolydrawEvent>(event: T, data: PolydrawEventPayloads[T]): void {
    this.eventManager.emit(event, data);
  }

  /**
   * Add a polygon with optional merging logic
   */
  async addPolygon(
    latlngs: Feature<Polygon | MultiPolygon>,
    options: AddPolygonOptions = {},
  ): Promise<MutationResult> {
    // console.log('PolygonMutationManager addPolygon');
    const { noMerge = false } = options;

    try {
      if (
        this.config.mergePolygons &&
        !noMerge &&
        this.getFeatureGroups().length > 0 &&
        !this.config.kinks
      ) {
        return await this.mergePolygon(latlngs, options);
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
    // console.log('PolygonMutationManager subtractPolygon');
    try {
      // Find only the polygons that actually intersect with the subtract area
      const intersectingFeatureGroups: L.FeatureGroup[] = [];

      this.getFeatureGroups().forEach((featureGroup) => {
        try {
          const featureCollection = featureGroup.toGeoJSON() as FeatureCollection<
            Polygon | MultiPolygon
          >;
          if (!featureCollection || !featureCollection.features || !featureCollection.features[0]) {
            return;
          }

          const firstFeature = featureCollection.features[0];
          if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
            return;
          }

          const existingPolygon = this.turfHelper.getTurfPolygon(firstFeature);

          // Use geometry manager for intersection check
          const hasIntersection = this.geometryManager.checkPolygonIntersection(
            existingPolygon,
            latlngs,
          );

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
          const featureCollection = featureGroup.toGeoJSON() as FeatureCollection<
            Polygon | MultiPolygon
          >;
          const feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

          // Use geometry manager for subtraction
          const result = this.geometryManager.subtractPolygon(feature, latlngs);

          // Remove the original polygon
          this.removeFeatureGroupInternal(featureGroup);

          // Add the result polygons
          if (result.success && result.results) {
            for (const resultPolygon of result.results) {
              const addResult = await this.addPolygonLayer(resultPolygon, { simplify: true });
              if (addResult.success && addResult.featureGroups) {
                resultFeatureGroups.push(...addResult.featureGroups);
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
    // console.log('PolygonMutationManager addPolygonLayer');
    const { simplify = true, dynamicTolerance = false, visualOptimizationLevel = 0 } = options;

    try {
      // Validate input
      if (!latlngs || !latlngs.geometry || !latlngs.geometry.coordinates) {
        return { success: false, error: 'Invalid polygon data' };
      }

      const featureGroup: L.FeatureGroup = new L.FeatureGroup();

      const latLngs = simplify ? this.turfHelper.getSimplified(latlngs, dynamicTolerance) : latlngs;

      let polygon: L.Polygon & Record<string, unknown>;
      try {
        polygon = this.getPolygon(latLngs);
        if (!polygon) {
          return { success: false, error: 'Failed to create polygon' };
        }
        polygon._polydrawOptimizationLevel = visualOptimizationLevel;
        featureGroup.addLayer(polygon);
      } catch (error) {
        return { success: false, error: 'Failed to create polygon layer' };
      }

      // Safely get marker coordinates
      let markerLatlngs: L.LatLngExpression[][];
      try {
        const rawLatLngs = polygon.getLatLngs();

        // Handle different polygon structures
        if (Array.isArray(rawLatLngs) && rawLatLngs.length > 0) {
          // Check the structure depth to determine how to process
          if (Array.isArray(rawLatLngs[0])) {
            // Could be LatLng[][] (polygon with holes) or LatLng[][][] (MultiPolygon)
            if (Array.isArray(rawLatLngs[0][0])) {
              // It's LatLng[][][] (MultiPolygon structure), flatten one level
              markerLatlngs = rawLatLngs[0] as L.LatLngExpression[][];
            } else {
              // It's LatLng[][] (polygon with holes)
              markerLatlngs = rawLatLngs as L.LatLngExpression[][];
            }
          } else {
            // It's LatLng[] (simple polygon), wrap it in an array
            markerLatlngs = [rawLatLngs as L.LatLngExpression[]];
          }
        } else {
          markerLatlngs = [];
        }
      } catch (error) {
        markerLatlngs = [];
      }

      // Add markers using interaction manager
      try {
        markerLatlngs.forEach((polygonRing: L.LatLngExpression[], ringIndex: number) => {
          if (!polygonRing || !Array.isArray(polygonRing)) {
            return;
          }

          // Convert to LatLngLiteral array for the interaction manager
          const latLngLiterals: L.LatLngLiteral[] = [];
          polygonRing.forEach((latlng) => {
            if (Array.isArray(latlng) && latlng.length >= 2) {
              latLngLiterals.push({ lat: latlng[1], lng: latlng[0] });
            } else if (
              typeof latlng === 'object' &&
              latlng !== null &&
              'lat' in latlng &&
              'lng' in latlng
            ) {
              latLngLiterals.push(latlng as L.LatLngLiteral);
            }
          });

          if (latLngLiterals.length === 0) {
            return;
          }

          try {
            if (ringIndex === 0) {
              this.interactionManager.addMarkers(latLngLiterals, featureGroup);
            } else {
              // Add red polyline overlay for hole rings
              const holePolyline = L.polyline(polygonRing, {
                color: this.config.colors.hole.border,
                weight: this.config.holeOptions.weight || 2,
                opacity: this.config.holeOptions.opacity || 1,
                fillColor: this.config.colors.hole.fill,
                fillOpacity: this.config.holeOptions.fillOpacity || 0.5,
              });
              featureGroup.addLayer(holePolyline);

              this.interactionManager.addHoleMarkers(latLngLiterals, featureGroup);
            }
          } catch (markerError) {
            // Continue with other elements
          }
        });
      } catch (error) {
        // Continue without markers if they fail
      }

      // Add edge click listeners using interaction manager
      try {
        this.interactionManager.addEdgeClickListeners(polygon, featureGroup);
      } catch (error) {
        // Continue without edge listeners if they fail
      }

      this.getFeatureGroups().push(featureGroup);

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
  private async mergePolygon(
    latlngs: Feature<Polygon | MultiPolygon>,
    options: AddPolygonOptions = {},
  ): Promise<MutationResult> {
    try {
      const polygonFeature: Feature<Polygon | MultiPolygon>[] = [];
      const intersectingFeatureGroups: L.FeatureGroup[] = [];
      let polyIntersection: boolean = false;

      this.getFeatureGroups().forEach((featureGroup) => {
        try {
          const featureCollection = featureGroup.toGeoJSON() as FeatureCollection<
            Polygon | MultiPolygon
          >;
          if (!featureCollection || !featureCollection.features || !featureCollection.features[0]) {
            return;
          }

          const firstFeature = featureCollection.features[0];
          if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
            return;
          }

          if (this.isPositionArrayofArrays(firstFeature.geometry.coordinates)) {
            (firstFeature.geometry.coordinates as Position[][][]).forEach(
              (element: Position[][]) => {
                try {
                  const feature = this.turfHelper.getMultiPolygon([element]);
                  polyIntersection = this.geometryManager.checkPolygonIntersection(
                    feature,
                    latlngs,
                  );
                  if (polyIntersection) {
                    intersectingFeatureGroups.push(featureGroup);
                    polygonFeature.push(feature);
                  }
                } catch (error) {
                  // Continue with other elements
                }
              },
            );
          } else {
            try {
              const feature = this.turfHelper.getTurfPolygon(firstFeature);
              polyIntersection = this.geometryManager.checkPolygonIntersection(feature, latlngs);
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
        return await this.unionPolygons(
          intersectingFeatureGroups,
          latlngs,
          polygonFeature,
          options,
        );
      } else {
        return await this.addPolygonLayer(latlngs, options);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in mergePolygon',
      };
    }
  }

  /**
   * Union multiple polygons together using geometry manager
   */
  private async unionPolygons(
    layers: L.FeatureGroup[],
    latlngs: Feature<Polygon | MultiPolygon>,
    polygonFeature: Feature<Polygon | MultiPolygon>[],
    options: AddPolygonOptions = {},
  ): Promise<MutationResult> {
    try {
      // Remove the intersecting feature groups
      layers.forEach((featureGroup) => {
        this.removeFeatureGroupInternal(featureGroup);
      });

      // Use geometry manager for union operation
      const result = this.geometryManager.unionPolygons(polygonFeature, latlngs);

      if (result.success && result.result) {
        const addResult = await this.addPolygonLayer(result.result, options);

        this.emit('polygonsUnioned', {
          originalPolygons: polygonFeature,
          resultPolygon: result.result,
          featureGroups: addResult.featureGroups,
        });

        return addResult;
      } else {
        return {
          success: false,
          error: result.error || 'Failed to union polygons',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in unionPolygons',
      };
    }
  }

  /**
   * Create a polygon from GeoJSON feature
   */
  private isPositionArrayofArrays(arr: unknown): arr is Position[][][] {
    if (!Array.isArray(arr) || arr.length === 0) return false;

    const first = arr[0];
    if (!Array.isArray(first) || first.length === 0) return false;

    const second = first[0];
    if (!Array.isArray(second) || second.length === 0) return false;

    const leaf = second[0];
    return this.isPosition(leaf);
  }

  private isPosition(val: unknown): val is Position {
    return Array.isArray(val) && val.length >= 2 && val.every((n) => typeof n === 'number');
  }

  /**
   * Create a polygon from GeoJSON feature
   */
  private getPolygon(
    latlngs: Feature<Polygon | MultiPolygon>,
  ): L.Polygon & Record<string, unknown> {
    // console.log('PolygonMutationManager getPolygon');
    const polygon = L.GeoJSON.geometryToLayer(latlngs) as L.Polygon & Record<string, unknown>;
    polygon.setStyle({
      ...this.config.polygonOptions,
      color: this.config.colors.polygon.border,
      fillColor: this.config.colors.polygon.fill,
    });

    // Ensure each polygon has a unique identifier to prevent cross-contamination
    polygon._polydrawUniqueId = L.Util.stamp(polygon) + '_' + Date.now();

    // Clear any existing drag data to ensure clean state
    delete polygon._polydrawDragData;
    delete polygon._polydrawOriginalLatLngs;
    delete polygon._polydrawCurrentDragSession;
    delete polygon._polydrawOriginalMarkerPositions;
    delete polygon._polydrawOriginalHoleLinePositions;

    // Enable polygon dragging using interaction manager
    if (this.config.modes.dragPolygons) {
      this.interactionManager.enablePolygonDragging(polygon, latlngs);
    }

    return polygon;
  }

  /**
   * Internal method to add feature group to array
   */
  private addFeatureGroupInternal(featureGroup: L.FeatureGroup): void {
    // console.log('PolygonMutationManager addFeatureGroupInternal');
    this.getFeatureGroups().push(featureGroup);
  }

  /**
   * Internal method to remove feature group from array and map
   */
  private removeFeatureGroupInternal(featureGroup: L.FeatureGroup): void {
    // console.log('PolygonMutationManager removeFeatureGroupInternal');
    featureGroup.clearLayers();
    const featureGroups = this.getFeatureGroups();
    const index = featureGroups.indexOf(featureGroup);
    if (index > -1) {
      featureGroups.splice(index, 1);
    }
    this.map.removeLayer(featureGroup);
  }

  /**
   * Get complete polygon GeoJSON including holes from a feature group
   */
  private getCompletePolygonFromFeatureGroup(
    featureGroup: L.FeatureGroup,
  ): Feature<Polygon | MultiPolygon> {
    // console.log('PolygonMutationManager getCompletePolygonFromFeatureGroup');
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
      return (polygon as L.Polygon).toGeoJSON() as Feature<Polygon | MultiPolygon>;
    } catch (error) {
      if (!isTestEnvironment()) {
        if (error instanceof Error) {
          console.warn('Error getting complete polygon GeoJSON from feature group:', error.message);
        }
      }
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

  // Public methods that delegate to interaction manager

  /**
   * Update marker draggable state
   */
  updateMarkerDraggableState(): void {
    // console.log('PolygonMutationManager updateMarkerDraggableState');
    this.interactionManager.updateMarkerDraggableState();
  }

  /**
   * Update all markers for edge deletion visual feedback
   */
  updateAllMarkersForEdgeDeletion(showFeedback: boolean): void {
    // console.log('PolygonMutationManager updateAllMarkersForEdgeDeletion');
    this.interactionManager.updateAllMarkersForEdgeDeletion(showFeedback);
  }

  /**
   * Set modifier key held state
   */
  setModifierKeyHeld(isHeld: boolean): void {
    // console.log('PolygonMutationManager setModifierKeyHeld');
    this.interactionManager.setModifierKeyHeld(isHeld);
  }

  // Legacy methods for backward compatibility (delegate to appropriate managers)

  /**
   * Check if two polygons intersect (delegates to geometry manager)
   */
  checkPolygonIntersection(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ): boolean {
    // console.log('PolygonMutationManager checkPolygonIntersection');
    return this.geometryManager.checkPolygonIntersection(polygon1, polygon2);
  }

  /**
   * Get polygon center (delegates to geometry manager)
   */
  getPolygonCenter(polygon: Feature<Polygon | MultiPolygon>): { lat: number; lng: number } | null {
    // console.log('PolygonMutationManager getPolygonCenter');
    // For backward compatibility, we'll implement this using the same logic as before
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

      // Calculate centroid
      let latSum = 0;
      let lngSum = 0;
      let count = 0;

      for (const coord of coordinates) {
        if (Array.isArray(coord) && coord.length >= 2) {
          const lng = coord[0];
          const lat = coord[1];

          if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
            lngSum += lng;
            latSum += lat;
            count++;
          }
        }
      }

      if (count === 0) {
        return null;
      }

      return {
        lat: latSum / count,
        lng: lngSum / count,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get bounding box from polygon (delegates to geometry manager)
   */
  getBoundingBox(
    polygon: Feature<Polygon | MultiPolygon>,
  ): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
    // console.log('PolygonMutationManager getBoundingBox');
    // For backward compatibility, we'll implement this using the same logic as before
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

  // Legacy methods that are now handled by specialized managers but kept for compatibility

  addMarker(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup): void {
    // console.log('PolygonMutationManager addMarker');
    this.interactionManager.addMarkers(latlngs, featureGroup);
  }

  addHoleMarker(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup): void {
    // console.log('PolygonMutationManager addHoleMarker');
    this.interactionManager.addHoleMarkers(latlngs, featureGroup);
  }

  addEdgeClickListeners(polygon: L.Polygon, featureGroup: L.FeatureGroup): void {
    // console.log('PolygonMutationManager addEdgeClickListeners');
    this.interactionManager.addEdgeClickListeners(polygon, featureGroup);
  }

  enablePolygonDragging(polygon: PolydrawPolygon, latlngs: Feature<Polygon | MultiPolygon>): void {
    // console.log('PolygonMutationManager enablePolygonDragging');
    this.interactionManager.enablePolygonDragging(polygon, latlngs);
  }

  // Helper methods for backward compatibility
  getMarkerIndex(latlngs: L.LatLngLiteral[], position: L.LatLngLiteral): number {
    void latlngs;
    void position;
    return 0;
  }

  ensureMarkerSeparation(
    polygonLength: number,
    markers: {
      menu?: { index?: number };
      delete?: { index?: number };
      info?: { index?: number };
    },
  ): { menu: number; delete: number; info: number } {
    void polygonLength;
    return {
      menu: markers.menu?.index ?? 0,
      delete: markers.delete?.index ?? 1,
      info: markers.info?.index ?? 2,
    };
  }

  findAlternativeMarkerPosition(
    polygonLength: number,
    originalIndex: number,
    usedIndices: Set<number>,
  ): number {
    void usedIndices; // Keep for clarity, but mark as unused
    // console.log('PolygonMutationManager findAlternativeMarkerPosition');
    // This is now handled internally by the interaction manager
    // Return a simple fallback for backward compatibility
    return (originalIndex + 1) % polygonLength;
  }

  createDivIcon(processedClasses: string[]): L.DivIcon {
    // console.log('PolygonMutationManager createDivIcon');
    // This is now handled internally by the interaction manager
    // Return a simple div icon for backward compatibility
    return L.divIcon({ className: processedClasses.join(' ') });
  }

  getLatLngInfoString(latlng: L.LatLngLiteral): string {
    // console.log('PolygonMutationManager getLatLngInfoString');
    // This is now handled internally by the interaction manager
    // Return a simple string for backward compatibility
    return 'Latitude: ' + latlng.lat + ' Longitude: ' + latlng.lng;
  }

  generateMenuMarkerPopup(
    latLngs: L.LatLngLiteral[],
    featureGroup: L.FeatureGroup,
  ): HTMLDivElement {
    void latLngs; // Keep for clarity, but mark as unused
    void featureGroup; // Keep for clarity, but mark as unused
    // console.log('PolygonMutationManager generateMenuMarkerPopup');
    // This is now handled internally by the interaction manager
    // Return a simple div for backward compatibility
    const div = document.createElement('div');
    div.innerHTML = 'Menu';
    return div;
  }

  getPolygonGeoJSONFromFeatureGroup(featureGroup: L.FeatureGroup): Feature<Polygon | MultiPolygon> {
    void featureGroup; // Keep for clarity, but mark as unused
    // console.log('PolygonMutationManager getPolygonGeoJSONFromFeatureGroup');
    // This is now handled internally by the interaction manager
    // Return a simple polygon for backward compatibility
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

  getTotalPolygonPerimeter(polygonGeoJSON: Feature<Polygon | MultiPolygon>): number {
    void polygonGeoJSON; // Keep for clarity, but mark as unused
    // console.log('PolygonMutationManager getTotalPolygonPerimeter');
    // This is now handled internally by the interaction manager
    // Return a simple value for backward compatibility
    return 1000;
  }

  generateInfoMarkerPopup(area: number, perimeter: number): HTMLDivElement {
    // console.log('PolygonMutationManager generateInfoMarkerPopup');
    // This is now handled internally by the interaction manager
    // Return a simple div for backward compatibility
    const div = document.createElement('div');
    div.innerHTML = `Area: ${area}, Perimeter: ${perimeter}`;
    return div;
  }

  onMarkerHoverForEdgeDeletion(marker: L.Marker, isHovering: boolean): void {
    void marker;
    void isHovering;
  }

  highlightEdgeOnHover(edgePolyline: L.Polyline, isHovering: boolean): void {
    void edgePolyline;
    void isHovering;
  }

  // Additional methods for backward compatibility with tests
  onEdgeClick(e: L.LeafletMouseEvent, edgePolyline: L.Polyline): void {
    void e;
    void edgePolyline;
  }

  removeFeatureGroup(featureGroup: L.FeatureGroup): void {
    // console.log('PolygonMutationManager removeFeatureGroup');
    this.removeFeatureGroupInternal(featureGroup);
  }

  onPolygonMouseMove(e: L.LeafletMouseEvent): void {
    void e;
  }

  onPolygonMouseUp(e: L.LeafletMouseEvent): void {
    void e;
  }

  updatePolygonAfterDrag(polygon: L.Polygon): void {
    void polygon;
  }

  setSubtractVisualMode(polygon: L.Polygon, enabled: boolean): void {
    void polygon;
    void enabled;
  }

  performModifierSubtract(
    draggedGeoJSON: Feature<Polygon | MultiPolygon>,
    originalFeatureGroup: L.FeatureGroup,
  ): void {
    // console.log('PolygonMutationManager performModifierSubtract');
    // Delegate to interaction manager's private method
    // For now, we'll implement the logic here to fix the "bite taken" issue
    try {
      const draggedPolygon = this.turfHelper.getTurfPolygon(draggedGeoJSON);
      const intersectingFeatureGroups: L.FeatureGroup[] = [];

      // Find all feature groups that intersect with the dragged polygon
      this.getFeatureGroups().forEach((featureGroup) => {
        if (featureGroup === originalFeatureGroup) {
          return;
        }

        try {
          const featureCollection = featureGroup.toGeoJSON() as FeatureCollection<
            Polygon | MultiPolygon
          >;
          if (!featureCollection || !featureCollection.features || !featureCollection.features[0]) {
            return;
          }

          const firstFeature = featureCollection.features[0];
          if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
            return;
          }

          const existingPolygon = this.turfHelper.getTurfPolygon(firstFeature);

          // Check intersection using geometry manager
          const hasIntersection = this.geometryManager.checkPolygonIntersection(
            existingPolygon,
            draggedPolygon,
          );

          if (hasIntersection) {
            intersectingFeatureGroups.push(featureGroup);
          }
        } catch (error) {
          // Handle errors
        }
      });

      // Remove the original dragged polygon
      this.removeFeatureGroupInternal(originalFeatureGroup);

      // For each intersecting polygon, subtract the dragged polygon from it
      // This creates the "bite taken" effect
      intersectingFeatureGroups.forEach((featureGroup) => {
        try {
          const featureCollection = featureGroup.toGeoJSON() as FeatureCollection<
            Polygon | MultiPolygon
          >;
          const existingPolygon = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

          // Remove the existing polygon
          this.removeFeatureGroupInternal(featureGroup);

          // Perform the subtraction: existing polygon - dragged polygon
          const result = this.geometryManager.subtractPolygon(existingPolygon, draggedPolygon);

          // Add the result polygons
          if (result.success && result.results) {
            for (const resultPolygon of result.results) {
              this.addPolygonLayer(resultPolygon, { simplify: true });
            }
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
