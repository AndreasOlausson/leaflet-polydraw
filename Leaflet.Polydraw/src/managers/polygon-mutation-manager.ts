import * as L from 'leaflet';
import { TurfHelper } from '../turf-helper';
import { PolygonInformationService } from '../polygon-information.service';
import { leafletAdapter } from '../compatibility/leaflet-adapter';
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';
import type {
  PolydrawConfig,
  MenuActionData,
  PolygonUpdatedEventData,
  Position,
  PolydrawFeatureGroup,
  PolydrawPolygon,
  HistoryAction,
  LayerInteraction,
  PolygonStyleOverrides,
  PolygonMenuActionContext,
  PolygonMenuActionResult,
} from '../types/polydraw-interfaces';
import { ModeManager } from './mode-manager';
import {
  EventManager,
  PolydrawEvent,
  PolydrawEventCallback,
  PolydrawEventPayloads,
} from './event-manager';
import { isTestEnvironment } from '../utils';
import { cloneMetadataValue } from '../utils/metadata-clone.util';

// Import the specialized managers
import { PolygonGeometryManager, GeometryOperationResult } from './polygon-geometry-manager';
import { PolygonInteractionManager } from './polygon-interaction-manager';
import type { LayerManager } from './layer-manager';

export interface MutationResult {
  success: boolean;
  featureGroups?: L.FeatureGroup[];
  error?: string;
}

interface AddPolygonOptions {
  simplify?: boolean;
  noMerge?: boolean;
  mergeEditableOnly?: boolean;
  dynamicTolerance?: boolean;
  visualOptimizationLevel?: number;
  originalOptimizationLevel?: number;
  skipKinkProcessing?: boolean;
  targetLayerId?: string;
  layerColor?: string;
  featureId?: string;
  featureMetadata?: Record<string, unknown>;
  sourceFeatureIds?: string[];
  featureInteractionOverride?: LayerInteraction;
  featureStyleOverrides?: PolygonStyleOverrides;
  featureCreatedAt?: string;
  featureLastModified?: string;
}

export interface MutationManagerDependencies {
  turfHelper: TurfHelper;
  polygonInformation: PolygonInformationService;
  map: L.Map;
  config: PolydrawConfig;
  modeManager: ModeManager;
  eventManager: EventManager;
  getFeatureGroups: () => L.FeatureGroup[];
  saveHistoryState?: (action: HistoryAction) => void;
  layerManager?: LayerManager;
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
  private saveHistoryState?: (action: HistoryAction) => void;
  private layerManager?: LayerManager;

  // Specialized managers
  private geometryManager!: PolygonGeometryManager;
  private interactionManager!: PolygonInteractionManager;
  private readonly onDrawCancel = (data: PolydrawEventPayloads['polydraw:draw:cancel']) => {
    this.emit('drawCancelled', data);
  };
  private readonly onPolygonUpdated = (data: PolydrawEventPayloads['polydraw:polygon:updated']) => {
    void this.handlePolygonModified(data as PolygonUpdatedEventData);
  };
  private readonly onMenuAction = (data: PolydrawEventPayloads['polydraw:menu:action']) => {
    void this.handleMenuAction(data as MenuActionData).catch((error) => {
      if (!isTestEnvironment()) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Menu action failed: ${message}`);
      }
    });
  };
  private readonly onCheckIntersection = (
    data: PolydrawEventPayloads['polydraw:check:intersection'],
  ) => {
    const hasIntersection = this.geometryManager.checkPolygonIntersection(
      data.polygon1,
      data.polygon2,
    );
    data.callback(hasIntersection);
  };
  private readonly onSubtract = (data: PolydrawEventPayloads['polydraw:subtract']) => {
    void this.subtractPolygon(data.subtractPolygon);
  };
  private readonly onPolygonDeleted = () => {
    this.emit('polygonDeleted', undefined);
  };

  constructor(dependencies: MutationManagerDependencies) {
    // console.log('PolygonMutationManager constructor');
    this.turfHelper = dependencies.turfHelper;
    this.map = dependencies.map;
    this.config = dependencies.config;
    this.eventManager = dependencies.eventManager;
    this.getFeatureGroups = dependencies.getFeatureGroups;
    this.saveHistoryState = dependencies.saveHistoryState;
    this.layerManager = dependencies.layerManager;

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
        saveHistoryState: dependencies.saveHistoryState,
        layerManager: dependencies.layerManager,
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
    this.eventManager.on('polydraw:draw:cancel', this.onDrawCancel);
    this.eventManager.on('polydraw:polygon:updated', this.onPolygonUpdated);
    this.eventManager.on('polydraw:menu:action', this.onMenuAction);
    this.eventManager.on('polydraw:check:intersection', this.onCheckIntersection);
    this.eventManager.on('polydraw:subtract', this.onSubtract);
    this.eventManager.on('polydraw:polygon:deleted', this.onPolygonDeleted);
  }

  dispose(): void {
    this.eventManager.off('polydraw:draw:cancel', this.onDrawCancel);
    this.eventManager.off('polydraw:polygon:updated', this.onPolygonUpdated);
    this.eventManager.off('polydraw:menu:action', this.onMenuAction);
    this.eventManager.off('polydraw:check:intersection', this.onCheckIntersection);
    this.eventManager.off('polydraw:subtract', this.onSubtract);
    this.eventManager.off('polydraw:polygon:deleted', this.onPolygonDeleted);
    this.interactionManager.dispose();
  }

  /**
   * Handle polygon modification from interaction manager
   */
  private async handlePolygonModified(data: PolygonUpdatedEventData): Promise<void> {
    const skipSimplifyOperations = new Set([
      'addVertex',
      'markerDrag',
      'polygonDrag',
      'polygonClone',
      'toggleOptimization',
      'donut',
    ]);
    const shouldSimplify = !data.operation || !skipSimplifyOperations.has(data.operation);

    // Handle intelligent merging for vertex drag operations
    let allowMerge = data.allowMerge;
    if (data.intelligentMerge && data.operation === 'markerDrag') {
      // For intelligent merging, check if the polygon actually intersects with existing polygons
      allowMerge = this.shouldAllowIntelligentMerge(data.polygon);
    }

    const options: AddPolygonOptions = {
      simplify: shouldSimplify,
      noMerge: !allowMerge,
      visualOptimizationLevel: data.optimizationLevel || 0,
      originalOptimizationLevel: data.originalOptimizationLevel,
      skipKinkProcessing: data.operation === 'markerDrag',
      featureId: data.featureId,
      featureMetadata: data.featureMetadata,
      sourceFeatureIds: data.sourceFeatureIds,
      featureInteractionOverride: data.featureInteractionOverride,
      featureStyleOverrides: data.featureStyleOverrides,
      targetLayerId: data.targetLayerId,
      featureCreatedAt: data.featureCreatedAt,
      featureLastModified: data.featureLastModified,
    };
    await this.addPolygon(data.polygon, options);
  }

  /**
   * Handle menu actions from interaction manager
   */
  private async handleMenuAction(data: MenuActionData): Promise<void> {
    // console.log('PolygonMutationManager handleMenuAction');
    if (!data?.featureGroup) {
      return;
    }
    if (this.layerManager && !this.layerManager.isFeatureGroupEditable(data.featureGroup)) {
      return;
    }

    // Get the complete polygon GeoJSON including holes before removing the feature group
    let completePolygonGeoJSON: Feature<Polygon | MultiPolygon>;
    try {
      completePolygonGeoJSON = this.getCompletePolygonFromFeatureGroup(data.featureGroup);
    } catch (error) {
      if (!isTestEnvironment()) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Menu action skipped: unable to resolve polygon geometry (${message}).`);
      }
      return;
    }

    const { level: optimizationLevel, original: originalOptimizationLevel } =
      this.getOptimizationMetadataFromFeatureGroup(data.featureGroup);
    const sourceMetadata = this.getFeatureMetadataStateFromFeatureGroup(data.featureGroup);

    let result: GeometryOperationResult;
    let shouldSaveHistory = true;

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
      case 'polygonMenuAction': {
        result = await this.executePolygonMenuAction(
          data.menuActionId,
          completePolygonGeoJSON,
          data.featureGroup,
        );
        const polygonMenuAction =
          data.menuActionId && this.config.polygonTools.menuActions
            ? this.config.polygonTools.menuActions.find((a) => a.id === data.menuActionId)
            : undefined;
        shouldSaveHistory = polygonMenuAction?.history !== false;
        break;
      }
      default:
        return;
    }

    if (result.success && result.result) {
      if (this.saveHistoryState && shouldSaveHistory) {
        this.saveHistoryState(data.action);
      }

      // Remove the original polygon only after we know the operation produced a result.
      this.removeFeatureGroupInternal(data.featureGroup);

      const bezierLevel =
        data.action === 'bezier'
          ? (this.config.polygonTools.bezier?.visualOptimizationLevel ?? 10)
          : optimizationLevel;
      const bezierOriginal =
        data.action === 'bezier'
          ? (this.config.polygonTools.bezier?.visualOptimizationLevel ?? 10)
          : originalOptimizationLevel;

      const noMerge = result.allowMerge === false;
      const shouldSimplify = result.simplify === true;
      const resultMetadata = result.metadata ?? sourceMetadata.metadata;

      const addResult = await this.addPolygon(result.result, {
        simplify: shouldSimplify,
        noMerge,
        visualOptimizationLevel: bezierLevel,
        originalOptimizationLevel: bezierOriginal,
        featureId: sourceMetadata.featureId,
        featureMetadata: resultMetadata,
        sourceFeatureIds: sourceMetadata.sourceFeatureIds,
        featureInteractionOverride: sourceMetadata.interactionOverride,
        featureStyleOverrides: sourceMetadata.styleOverrides,
        featureCreatedAt: sourceMetadata.createdAt,
      });
      if (data.action === 'bezier' && this.config.polygonTools.bezier?.ghostMarkers) {
        const ghostOpacity = 0.001;
        addResult.featureGroups?.forEach((featureGroup) => {
          featureGroup.eachLayer((layer) => {
            if (layer instanceof L.Polygon) {
              const polygon = layer as PolydrawPolygon;
              polygon.setStyle({ opacity: ghostOpacity, fillOpacity: ghostOpacity });
              if (polygon._polydrawDragData) {
                polygon._polydrawDragData.originalOpacity = ghostOpacity;
              }
            }
          });
        });
      }
    }
  }

  /**
   * Handle polygon menu action execution
   */
  private async executePolygonMenuAction(
    menuActionId: string | undefined,
    polygon: Feature<Polygon | MultiPolygon>,
    featureGroup: L.FeatureGroup,
  ): Promise<GeometryOperationResult> {
    if (!menuActionId || !this.config.polygonTools.menuActions) {
      return { success: false, error: 'Polygon menu action not found' };
    }

    const polygonMenuAction = this.config.polygonTools.menuActions.find(
      (a) => a.id === menuActionId,
    );
    if (!polygonMenuAction) {
      return { success: false, error: 'Polygon menu action not found' };
    }

    try {
      const actionResult = await polygonMenuAction.apply({
        polygon,
        featureGroup,
        bounds: this.getBoundsForMenuAction(featureGroup, polygon),
      });

      const normalizedResult = this.normalizeMenuActionResult(actionResult);
      if (!normalizedResult) {
        return { success: false, error: 'No change' };
      }

      if (!this.isPolygonFeature(normalizedResult.polygon)) {
        return { success: false, error: 'Invalid polygon geometry' };
      }

      return {
        success: true,
        result: normalizedResult.polygon,
        allowMerge: normalizedResult.allowMerge,
        simplify: normalizedResult.simplify,
        metadata: normalizedResult.metadata,
      };
    } catch (error) {
      if (!isTestEnvironment()) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Polygon menu action failed: ${message}`);
      }
      return { success: false, error: 'Polygon menu action execution failed' };
    }
  }

  private normalizeMenuActionResult(actionResult: PolygonMenuActionResult):
    | {
        polygon: Feature<Polygon | MultiPolygon>;
        allowMerge?: boolean;
        simplify?: boolean;
        metadata?: Record<string, unknown>;
      }
    | undefined {
    if (actionResult === null || actionResult === undefined || typeof actionResult !== 'object') {
      return undefined;
    }

    if (this.isPolygonFeature(actionResult)) {
      return { polygon: actionResult };
    }

    if ('polygon' in actionResult && this.isPolygonFeature(actionResult.polygon)) {
      return {
        polygon: actionResult.polygon,
        allowMerge: actionResult.allowMerge,
        simplify: actionResult.simplify,
        metadata: actionResult.metadata,
      };
    }

    return undefined;
  }

  private isPolygonFeature(value: unknown): value is Feature<Polygon | MultiPolygon> {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const feature = value as Feature;
    return (
      feature.type === 'Feature' &&
      !!feature.geometry &&
      (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
    );
  }

  private getBoundsForMenuAction(
    featureGroup: L.FeatureGroup,
    polygon: Feature<Polygon | MultiPolygon>,
  ): PolygonMenuActionContext['bounds'] {
    const polygonLayer = featureGroup.getLayers().find((layer) => layer instanceof L.Polygon) as
      | L.Polygon
      | undefined;
    if (polygonLayer) {
      return polygonLayer.getBounds();
    }

    const bounds = leafletAdapter.createLatLngBounds();
    const extend = (coord: number[]) => {
      if (typeof coord[0] === 'number' && typeof coord[1] === 'number') {
        bounds.extend(leafletAdapter.createLatLng(coord[1], coord[0]));
      }
    };

    if (polygon.geometry.type === 'Polygon') {
      polygon.geometry.coordinates.forEach((ring) => ring.forEach(extend));
    } else {
      polygon.geometry.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(extend)));
    }

    return bounds;
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
    if (this.layerManager && options.targetLayerId) {
      const targetLayer = this.layerManager.getLayer(options.targetLayerId);
      if (!targetLayer) {
        return {
          success: false,
          error: `Layer "${options.targetLayerId}" does not exist`,
        };
      }
    }

    const { polygons, skipMerge } = this.preparePolygonsForAddition(latlngs, options);
    const aggregatedFeatureGroups: L.FeatureGroup[] = [];

    for (const polygon of polygons) {
      const result = await this.addPolygonWithMergeHandling(polygon, options, skipMerge);
      if (!result.success) {
        return result;
      }

      if (result.featureGroups && result.featureGroups.length > 0) {
        aggregatedFeatureGroups.push(...result.featureGroups);
      }
    }

    return {
      success: true,
      featureGroups: aggregatedFeatureGroups.length > 0 ? aggregatedFeatureGroups : undefined,
    };
  }

  private async addPolygonWithMergeHandling(
    latlngs: Feature<Polygon | MultiPolygon>,
    options: AddPolygonOptions,
    skipMerge: boolean,
  ): Promise<MutationResult> {
    const { noMerge = false } = options;

    try {
      // CRITICAL FIX: When drawing polygons inside holes, they should be standalone
      // Check if this polygon is completely inside a hole of an existing polygon
      const isInsideHole = this.isPolygonInsideExistingHole(latlngs);

      if (isInsideHole) {
        // Force standalone creation - no merging for polygons inside holes
        return await this.addPolygonLayer(latlngs, options);
      }

      if (
        this.config.mergePolygons &&
        !noMerge &&
        this.getFeatureGroups().length > 0 &&
        !skipMerge
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

  private preparePolygonsForAddition(
    latlngs: Feature<Polygon | MultiPolygon>,
    options: AddPolygonOptions = {},
  ): {
    polygons: Feature<Polygon | MultiPolygon>[];
    skipMerge: boolean;
  } {
    let hasSelfIntersections = false;

    try {
      hasSelfIntersections = this.turfHelper.hasKinks(latlngs);
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn(
          'Error detecting polygon kinks:',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    const skipKinks = options.skipKinkProcessing === true;

    if (!skipKinks && !this.config.kinks && hasSelfIntersections) {
      try {
        const kinkFreePolygons = this.turfHelper.getKinks(latlngs);

        if (kinkFreePolygons.length > 0) {
          return {
            polygons: kinkFreePolygons,
            skipMerge: false,
          };
        }
      } catch (error) {
        if (!isTestEnvironment()) {
          console.warn(
            'Error splitting polygon kinks:',
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    return {
      polygons: [latlngs],
      skipMerge: this.config.kinks && hasSelfIntersections,
    };
  }

  /**
   * Subtract a polygon from existing polygons
   */
  async subtractPolygon(
    latlngs: Feature<Polygon | MultiPolygon>,
    options: AddPolygonOptions = {},
  ): Promise<MutationResult> {
    // console.log('PolygonMutationManager subtractPolygon');
    const { simplify = true, visualOptimizationLevel, originalOptimizationLevel } = options;

    try {
      // Find only the polygons that actually intersect with the subtract area
      const intersectingFeatureGroups: L.FeatureGroup[] = [];

      // Scope subtract to active layer's feature groups when layer manager exists
      const layerManager = this.layerManager;
      const targetFgs = layerManager
        ? layerManager
            .getFeatureGroupsForLayer(options.targetLayerId || layerManager.getActiveLayerId())
            .filter((featureGroup) => layerManager.isFeatureGroupEditable(featureGroup))
        : this.getFeatureGroups();

      targetFgs.forEach((featureGroup) => {
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
          if (!isTestEnvironment()) {
            console.warn('Skipping feature group during intersection check:', error);
          }
        }
      });

      // Only apply subtract to intersecting polygons
      const resultFeatureGroups: L.FeatureGroup[] = [];

      for (const featureGroup of intersectingFeatureGroups) {
        try {
          const sourceMetadata = this.getFeatureMetadataStateFromFeatureGroup(featureGroup);
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
              const addResult = await this.addPolygonLayer(resultPolygon, {
                simplify,
                visualOptimizationLevel,
                originalOptimizationLevel,
                featureMetadata: sourceMetadata.metadata,
                sourceFeatureIds: sourceMetadata.sourceFeatureIds,
                featureInteractionOverride: sourceMetadata.interactionOverride,
                featureStyleOverrides: sourceMetadata.styleOverrides,
                featureCreatedAt: sourceMetadata.createdAt,
              });
              if (addResult.success && addResult.featureGroups) {
                resultFeatureGroups.push(...addResult.featureGroups);
              }
            }
          }
        } catch (error) {
          if (!isTestEnvironment()) {
            console.warn('Failed subtract operation for one feature group:', error);
          }
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
    const {
      simplify = true,
      dynamicTolerance = false,
      visualOptimizationLevel = 0,
      originalOptimizationLevel,
      targetLayerId,
      layerColor,
      featureId,
      featureMetadata,
      sourceFeatureIds,
      featureInteractionOverride,
      featureStyleOverrides,
      featureCreatedAt,
      featureLastModified,
    } = options;

    try {
      // Validate input
      if (!latlngs || !latlngs.geometry || !latlngs.geometry.coordinates) {
        return { success: false, error: 'Invalid polygon data' };
      }

      const resolvedLayerId = this.layerManager
        ? targetLayerId || this.layerManager.getActiveLayerId()
        : undefined;
      const isLayerEditable =
        !this.layerManager || !resolvedLayerId
          ? true
          : this.layerManager.isLayerEditable(resolvedLayerId);
      const isEditableLayer =
        featureInteractionOverride === undefined
          ? isLayerEditable
          : featureInteractionOverride === 'editable';

      // Resolve layer color
      let resolvedLayerColor = layerColor;
      if (!resolvedLayerColor && this.layerManager && resolvedLayerId) {
        const layer = this.layerManager.getLayer(resolvedLayerId);
        if (layer) {
          resolvedLayerColor = layer.color;
        }
      } else if (!resolvedLayerColor && this.layerManager) {
        const activeLayer = this.layerManager.getActiveLayer();
        if (activeLayer && this.layerManager.getLayerCount() > 1) {
          resolvedLayerColor = activeLayer.color;
        }
      }

      const featureGroup: L.FeatureGroup = new L.FeatureGroup();

      const latLngs = simplify ? this.turfHelper.getSimplified(latlngs, dynamicTolerance) : latlngs;
      const normalizedLatLngs = this.normalizeSinglePolygonFeature(latLngs);

      let polygon: L.Polygon & Record<string, unknown>;
      let effectiveOriginal = visualOptimizationLevel;
      try {
        polygon = this.getPolygon(normalizedLatLngs, resolvedLayerColor, {
          enableDragging: isEditableLayer,
          styleOverrides: featureStyleOverrides,
        });
        if (!polygon) {
          return { success: false, error: 'Failed to create polygon' };
        }
        polygon._polydrawOptimizationLevel = visualOptimizationLevel;
        effectiveOriginal =
          originalOptimizationLevel ??
          (polygon._polydrawOptimizationOriginalLevel as number | undefined) ??
          visualOptimizationLevel;
        polygon._polydrawOptimizationOriginalLevel = effectiveOriginal || 0;
        featureGroup.addLayer(polygon);
        this.interactionManager.suppressDeleteMarkerClicks(250);
      } catch {
        return { success: false, error: 'Failed to create polygon layer' };
      }

      this.setFeatureGroupMetadata(featureGroup, {
        featureId,
        metadata: featureMetadata,
        sourceFeatureIds,
        interactionOverride: featureInteractionOverride,
        styleOverrides: featureStyleOverrides,
        optimizationLevel: visualOptimizationLevel,
        originalOptimizationLevel: effectiveOriginal,
        hasHoles: this.featureHasHoles(normalizedLatLngs),
        layerId: resolvedLayerId,
        createdAt: featureCreatedAt,
        lastModified: featureLastModified,
      });

      // Safely get marker coordinates with improved structure detection
      let markerLatlngs: L.LatLngExpression[][];
      try {
        const rawLatLngs = polygon.getLatLngs();
        markerLatlngs = this.normalizePolygonCoordinates(rawLatLngs);
      } catch {
        markerLatlngs = [];
      }

      if (isEditableLayer) {
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
              // For newly created polygons, always treat the first ring as the main polygon
              // and subsequent rings as holes. This ensures that polygons drawn inside holes
              // are styled as regular polygons (green), not as holes (red).
              if (ringIndex === 0) {
                this.interactionManager.addMarkers(latLngLiterals, featureGroup, {
                  optimizationLevel: visualOptimizationLevel,
                  originalOptimizationLevel: effectiveOriginal,
                });
              } else {
                // Add red polyline overlay for hole rings
                const holePolyline = leafletAdapter.createPolyline(latLngLiterals as L.LatLng[], {
                  color: this.config.styles.hole.color,
                  weight: this.config.styles.hole.weight || 2,
                  opacity: this.config.styles.hole.opacity || 1,
                  fillColor: this.config.styles.hole.fillColor,
                  fillOpacity: this.config.styles.hole.fillOpacity || 0.5,
                });
                featureGroup.addLayer(holePolyline);

                this.interactionManager.addHoleMarkers(latLngLiterals, featureGroup);
              }
            } catch {
              // Continue with other elements
            }
          });
        } catch {
          // Continue without markers if they fail
        }

        // Add edge click listeners using interaction manager
        try {
          this.interactionManager.addEdgeClickListeners(polygon, featureGroup);
        } catch {
          // Continue without edge listeners if they fail
        }
      }

      this.getFeatureGroups().push(featureGroup);

      // Register with layer manager
      if (this.layerManager) {
        const assignedLayerId = resolvedLayerId || this.layerManager.getActiveLayerId();
        const assigned = this.layerManager.assignFeatureGroupToLayer(featureGroup, assignedLayerId);
        if (!assigned) {
          this.removeFeatureGroupInternal(featureGroup);
          return {
            success: false,
            error: `Failed to assign polygon to layer "${assignedLayerId}"`,
          };
        }
      }

      // Add to map - this should be done after all setup is complete
      try {
        featureGroup.addTo(this.map);
      } catch {
        // The polygon is still added to arrayOfFeatureGroups for functionality
      }

      // Ensure marker draggability reflects current mode + active-layer constraints.
      this.interactionManager.updateMarkerDraggableState();

      this.emit('polygonAdded', { polygon: normalizedLatLngs, featureGroup });

      // Emit completion event to signal that polygon operation is complete
      this.emit('polygonOperationComplete', {
        operation: 'add',
        polygon: normalizedLatLngs,
        featureGroup,
      });

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
      const mergeEditableOnly = options.mergeEditableOnly !== false;

      // Scope merge to active layer's feature groups when layer manager exists
      const layerManager = this.layerManager;
      const targetFgs = layerManager
        ? layerManager
            .getFeatureGroupsForLayer(options.targetLayerId || layerManager.getActiveLayerId())
            .filter((featureGroup) =>
              mergeEditableOnly ? layerManager.isFeatureGroupEditable(featureGroup) : true,
            )
        : this.getFeatureGroups();

      targetFgs.forEach((featureGroup) => {
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
                } catch {
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
            } catch {
              // Continue with other features
            }
          }
        } catch {
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
      const mergedSourceFeatureIds = this.collectSourceFeatureIds(layers, options.sourceFeatureIds);
      const mergedFeatureMetadata =
        options.featureMetadata ?? this.resolvePrimaryFeatureMetadata(layers);
      const mergedInteractionOverride =
        options.featureInteractionOverride ?? this.resolvePrimaryFeatureInteractionOverride(layers);
      const mergedStyleOverrides =
        options.featureStyleOverrides ?? this.resolvePrimaryFeatureStyleOverrides(layers);

      // Remove the intersecting feature groups
      layers.forEach((featureGroup) => {
        this.removeFeatureGroupInternal(featureGroup);
      });

      // Use geometry manager for union operation
      const result = this.geometryManager.unionPolygons(polygonFeature, latlngs);

      if (result.success && result.result) {
        const addResult = await this.addPolygonLayer(result.result, {
          ...options,
          featureMetadata: mergedFeatureMetadata,
          sourceFeatureIds: mergedSourceFeatureIds,
          featureInteractionOverride: mergedInteractionOverride,
          featureStyleOverrides: mergedStyleOverrides,
        });

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
   * Determine if intelligent merging should be allowed for a polygon
   * This checks if the polygon actually intersects with existing polygons
   */
  private shouldAllowIntelligentMerge(polygon: Feature<Polygon | MultiPolygon>): boolean {
    try {
      // Scope to active layer when layer manager exists
      const layerManager = this.layerManager;
      const targetFgs = layerManager
        ? layerManager
            .getFeatureGroupsForLayer(layerManager.getActiveLayerId())
            .filter((featureGroup) => layerManager.isFeatureGroupEditable(featureGroup))
        : this.getFeatureGroups();

      // Check if the polygon intersects with any existing polygons
      for (const featureGroup of targetFgs) {
        try {
          const featureCollection = featureGroup.toGeoJSON() as FeatureCollection<
            Polygon | MultiPolygon
          >;
          if (!featureCollection || !featureCollection.features || !featureCollection.features[0]) {
            continue;
          }

          const existingFeature = featureCollection.features[0];
          if (!existingFeature.geometry || !existingFeature.geometry.coordinates) {
            continue;
          }

          const existingPolygon = this.turfHelper.getTurfPolygon(existingFeature);

          // Check if there's an intersection
          if (this.geometryManager.checkPolygonIntersection(existingPolygon, polygon)) {
            return true; // Allow merging if there's an intersection
          }
        } catch {
          // Continue checking other feature groups
          continue;
        }
      }

      return false; // No intersections found, don't allow merging
    } catch {
      // If there's any error, default to false (don't allow merging)
      return false;
    }
  }

  /**
   * Check if a polygon is completely inside a hole of an existing polygon
   * This prevents incorrect merging when drawing polygons inside holes
   */
  private isPolygonInsideExistingHole(newPolygon: Feature<Polygon | MultiPolygon>): boolean {
    try {
      // Scope to active layer when layer manager exists
      const layerManager = this.layerManager;
      const targetFgs = layerManager
        ? layerManager
            .getFeatureGroupsForLayer(layerManager.getActiveLayerId())
            .filter((featureGroup) => layerManager.isFeatureGroupEditable(featureGroup))
        : this.getFeatureGroups();

      // Check each existing feature group to see if the new polygon is inside any holes
      for (const featureGroup of targetFgs) {
        try {
          const featureCollection = featureGroup.toGeoJSON() as FeatureCollection<
            Polygon | MultiPolygon
          >;
          if (!featureCollection || !featureCollection.features || !featureCollection.features[0]) {
            continue;
          }

          const existingFeature = featureCollection.features[0];
          if (!existingFeature.geometry || !existingFeature.geometry.coordinates) {
            continue;
          }

          // Check if the existing polygon has holes
          let hasHoles = false;
          let holes: number[][][] = [];

          if (existingFeature.geometry.type === 'Polygon') {
            hasHoles = existingFeature.geometry.coordinates.length > 1;
            if (hasHoles) {
              holes = existingFeature.geometry.coordinates.slice(1); // Skip outer ring, get holes
            }
          } else if (existingFeature.geometry.type === 'MultiPolygon') {
            // Check each polygon in the multipolygon for holes
            for (const polygonCoords of existingFeature.geometry.coordinates) {
              if (polygonCoords.length > 1) {
                hasHoles = true;
                holes.push(...polygonCoords.slice(1)); // Add holes from this polygon
              }
            }
          }

          if (hasHoles && holes.length > 0) {
            // Check if the new polygon is completely inside any of the holes
            for (const holeCoords of holes) {
              try {
                const holePolygon = this.turfHelper.createPolygon([holeCoords]);

                // Check if the new polygon is completely within this hole
                if (this.turfHelper.isPolygonCompletelyWithin(newPolygon, holePolygon)) {
                  return true;
                }
              } catch {
                // Continue checking other holes
                continue;
              }
            }
          }
        } catch {
          // Continue checking other feature groups
          continue;
        }
      }

      return false;
    } catch {
      // If there's any error, default to false (allow normal processing)
      return false;
    }
  }

  /**
   * Normalize polygon coordinates to handle complex nested structures
   * This fixes the bug where markers are missing when drawing polygons inside holes
   */
  private normalizePolygonCoordinates(rawLatLngs: unknown): L.LatLngExpression[][] {
    if (!Array.isArray(rawLatLngs) || rawLatLngs.length === 0) {
      return [];
    }

    // Helper function to check if an element is a LatLng-like object
    const isLatLngLike = (obj: unknown): obj is L.LatLng => {
      return (
        obj !== null &&
        typeof obj === 'object' &&
        'lat' in obj &&
        'lng' in obj &&
        typeof (obj as L.LatLng).lat === 'number' &&
        typeof (obj as L.LatLng).lng === 'number'
      );
    };

    // Recursive function to flatten nested coordinate structures
    const flattenToRings = (coords: unknown): L.LatLngExpression[][] => {
      if (!Array.isArray(coords)) {
        return [];
      }

      // If this is an array of LatLng objects, return it as a single ring
      if (coords.length > 0 && isLatLngLike(coords[0])) {
        return [coords as L.LatLngExpression[]];
      }

      // If this is an array of arrays, process each sub-array
      const result: L.LatLngExpression[][] = [];
      for (const item of coords) {
        if (Array.isArray(item)) {
          // If the item is an array of LatLng objects, add it as a ring
          if (item.length > 0 && isLatLngLike(item[0])) {
            result.push(item as L.LatLngExpression[]);
          } else {
            // Otherwise, recursively flatten it
            const flattened = flattenToRings(item);
            result.push(...flattened);
          }
        }
      }

      return result;
    };

    try {
      return flattenToRings(rawLatLngs);
    } catch {
      return [];
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
    layerColor?: string,
    options: { enableDragging?: boolean; styleOverrides?: PolygonStyleOverrides } = {},
  ): L.Polygon & Record<string, unknown> {
    // console.log('PolygonMutationManager getPolygon');
    const polygon = L.GeoJSON.geometryToLayer(latlngs) as L.Polygon & Record<string, unknown>;

    // Force the polygon to always use regular polygon styling (green)
    // This ensures that polygons drawn inside holes are styled correctly
    const effectiveColor = layerColor || this.config.styles.polygon.color;
    const effectiveFillColor = this.config.styles.polygon.fillColor;
    const { styleOverrides } = options;
    const polygonStyle = {
      ...this.config.styles.polygon,
      color: styleOverrides?.color ?? effectiveColor,
      fillColor: styleOverrides?.fillColor ?? effectiveFillColor,
      // Force these values to ensure they override any default styling
      weight: styleOverrides?.weight ?? this.config.styles.polygon.weight ?? 2,
      opacity: this.config.styles.polygon.opacity || 1,
      fillOpacity: styleOverrides?.fillOpacity ?? this.config.styles.polygon.fillOpacity ?? 0.2,
    };

    polygon.setStyle(polygonStyle);

    // Ensure each polygon has a unique identifier to prevent cross-contamination
    polygon._polydrawUniqueId = leafletAdapter.util.stamp(polygon) + '_' + Date.now();

    // Clear any existing drag data to ensure clean state
    delete polygon._polydrawDragData;
    delete polygon._polydrawOriginalLatLngs;
    delete polygon._polydrawCurrentDragSession;
    delete polygon._polydrawOriginalMarkerPositions;
    delete polygon._polydrawOriginalHoleLinePositions;

    // Enable polygon dragging using interaction manager
    const enableDragging = options.enableDragging !== false;
    if (enableDragging && (this.config.modes.dragPolygons || this.config.tools.clone)) {
      this.interactionManager.enablePolygonDragging(polygon, latlngs);
    }

    return polygon;
  }

  private normalizeSinglePolygonFeature(
    feature: Feature<Polygon | MultiPolygon>,
  ): Feature<Polygon | MultiPolygon> {
    if (feature.geometry.type === 'MultiPolygon' && feature.geometry.coordinates.length === 1) {
      const [coordinates] = feature.geometry.coordinates;
      try {
        return this.turfHelper.createPolygon(coordinates);
      } catch {
        return feature;
      }
    }

    return feature;
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

    // Clean up resources before removing
    this.cleanupFeatureGroup(featureGroup);

    // Remove from layer manager
    if (this.layerManager) {
      this.layerManager.removeFeatureGroupFromLayer(featureGroup);
    }

    try {
      featureGroup.clearLayers();
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn('Error clearing layers from feature group:', error);
      }
    }
    const featureGroups = this.getFeatureGroups();
    const index = featureGroups.indexOf(featureGroup);
    if (index > -1) {
      featureGroups.splice(index, 1);
    }
    try {
      this.map.removeLayer(featureGroup);
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn('Error removing feature group layer from map:', error);
      }
    }
  }

  /**
   * Get complete polygon GeoJSON including holes from a feature group
   */
  private getCompletePolygonFromFeatureGroup(
    featureGroup: L.FeatureGroup,
  ): Feature<Polygon | MultiPolygon> {
    try {
      let polygon: L.Polygon | null = null;
      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          polygon = layer;
        }
      });

      if (polygon) {
        return (polygon as L.Polygon).toGeoJSON() as Feature<Polygon | MultiPolygon>;
      }

      const featureCollection = featureGroup.toGeoJSON() as FeatureCollection<
        Polygon | MultiPolygon
      >;
      const polygonFeature = featureCollection.features.find(
        (feature): feature is Feature<Polygon | MultiPolygon> =>
          feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon',
      );
      if (polygonFeature) {
        return polygonFeature;
      }

      throw new Error('No polygon geometry found in feature group');
    } catch (error) {
      if (!isTestEnvironment()) {
        if (error instanceof Error) {
          console.warn('Error getting complete polygon GeoJSON from feature group:', error.message);
        }
      }
      throw error instanceof Error
        ? error
        : new Error('Failed to resolve polygon geometry from feature group');
    }
  }

  private getOptimizationMetadataFromFeatureGroup(featureGroup?: L.FeatureGroup): {
    level: number;
    original: number;
  } {
    if (!featureGroup) {
      return { level: 0, original: 0 };
    }

    let level = 0;
    let original = 0;

    featureGroup.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Polygon) {
        const polygonLayer = layer as PolydrawPolygon;
        if (typeof polygonLayer._polydrawOptimizationLevel === 'number') {
          level = polygonLayer._polydrawOptimizationLevel || 0;
        }
        if (typeof polygonLayer._polydrawOptimizationOriginalLevel === 'number') {
          original = polygonLayer._polydrawOptimizationOriginalLevel || 0;
        }
      }
    });

    if (!original && level > 0) {
      original = level;
    }

    return { level, original };
  }

  private getFeatureMetadataStateFromFeatureGroup(featureGroup?: L.FeatureGroup): {
    featureId?: string;
    metadata: Record<string, unknown>;
    sourceFeatureIds: string[];
    interactionOverride?: LayerInteraction;
    styleOverrides?: PolygonStyleOverrides;
    createdAt?: string;
  } {
    if (!featureGroup) {
      return {
        metadata: {},
        sourceFeatureIds: [],
      };
    }

    const metadata = (featureGroup as PolydrawFeatureGroup)._polydrawMetadata;
    const featureId = metadata?.id;
    const sourceFeatureIds = Array.isArray(metadata?.sourceFeatureIds)
      ? [...metadata.sourceFeatureIds]
      : featureId
        ? [featureId]
        : [];
    const createdAt =
      metadata?.createdAt instanceof Date && !Number.isNaN(metadata.createdAt.getTime())
        ? metadata.createdAt.toISOString()
        : undefined;

    return {
      featureId,
      metadata: this.cloneFeatureMetadata(metadata?.metadata),
      sourceFeatureIds,
      interactionOverride: metadata?.interactionOverride,
      styleOverrides: this.cloneStyleOverrides(metadata?.styleOverrides),
      createdAt,
    };
  }

  private collectSourceFeatureIds(
    featureGroups: L.FeatureGroup[],
    seedSourceFeatureIds?: string[],
  ): string[] {
    const orderedIds: string[] = [];
    const seenIds = new Set<string>();

    const addId = (id?: string) => {
      if (!id || seenIds.has(id)) {
        return;
      }
      seenIds.add(id);
      orderedIds.push(id);
    };

    featureGroups.forEach((featureGroup) => {
      const metadata = (featureGroup as PolydrawFeatureGroup)._polydrawMetadata;
      if (Array.isArray(metadata?.sourceFeatureIds) && metadata.sourceFeatureIds.length > 0) {
        metadata.sourceFeatureIds.forEach((sourceId) => addId(sourceId));
      } else {
        addId(metadata?.id);
      }
    });

    if (Array.isArray(seedSourceFeatureIds)) {
      seedSourceFeatureIds.forEach((sourceId) => addId(sourceId));
    }

    return orderedIds;
  }

  private resolvePrimaryFeatureMetadata(featureGroups: L.FeatureGroup[]): Record<string, unknown> {
    for (const featureGroup of featureGroups) {
      const metadata = (featureGroup as PolydrawFeatureGroup)._polydrawMetadata?.metadata;
      if (metadata && Object.keys(metadata).length > 0) {
        return this.cloneFeatureMetadata(metadata);
      }
    }
    return {};
  }

  private resolvePrimaryFeatureInteractionOverride(
    featureGroups: L.FeatureGroup[],
  ): LayerInteraction | undefined {
    for (const featureGroup of featureGroups) {
      const interaction = (featureGroup as PolydrawFeatureGroup)._polydrawMetadata
        ?.interactionOverride;
      if (interaction) {
        return interaction;
      }
    }
    return undefined;
  }

  private resolvePrimaryFeatureStyleOverrides(
    featureGroups: L.FeatureGroup[],
  ): PolygonStyleOverrides | undefined {
    for (const featureGroup of featureGroups) {
      const styleOverrides = (featureGroup as PolydrawFeatureGroup)._polydrawMetadata
        ?.styleOverrides;
      if (styleOverrides) {
        return this.cloneStyleOverrides(styleOverrides);
      }
    }
    return undefined;
  }

  private cloneFeatureMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
    if (!metadata) {
      return {};
    }
    return cloneMetadataValue(metadata);
  }

  private cloneStyleOverrides(style?: PolygonStyleOverrides): PolygonStyleOverrides | undefined {
    if (!style) {
      return undefined;
    }
    return cloneMetadataValue(style);
  }

  private featureHasHoles(feature: Feature<Polygon | MultiPolygon>): boolean {
    if (!feature?.geometry) {
      return false;
    }
    if (feature.geometry.type === 'Polygon') {
      return feature.geometry.coordinates.length > 1;
    }
    if (feature.geometry.type === 'MultiPolygon') {
      return feature.geometry.coordinates.some((polygonRings) => polygonRings.length > 1);
    }
    return false;
  }

  private setFeatureGroupMetadata(
    featureGroup: L.FeatureGroup,
    options: {
      featureId?: string;
      metadata?: Record<string, unknown>;
      sourceFeatureIds?: string[];
      interactionOverride?: LayerInteraction;
      styleOverrides?: PolygonStyleOverrides;
      optimizationLevel: number;
      originalOptimizationLevel: number;
      hasHoles: boolean;
      layerId?: string;
      createdAt?: string;
      lastModified?: string;
    },
  ): void {
    const now = new Date();
    const parsedCreatedAt = options.createdAt ? new Date(options.createdAt) : now;
    const parsedLastModified = options.lastModified ? new Date(options.lastModified) : now;
    const createdAt = Number.isNaN(parsedCreatedAt.getTime()) ? now : parsedCreatedAt;
    const lastModified = Number.isNaN(parsedLastModified.getTime()) ? now : parsedLastModified;
    const featureId =
      options.featureId ||
      `fg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const sourceFeatureIds =
      options.sourceFeatureIds && options.sourceFeatureIds.length > 0
        ? [...new Set(options.sourceFeatureIds)]
        : [featureId];

    (featureGroup as PolydrawFeatureGroup)._polydrawMetadata = {
      id: featureId,
      optimizationLevel: options.optimizationLevel,
      originalOptimizationLevel: options.originalOptimizationLevel,
      hasHoles: options.hasHoles,
      createdAt,
      lastModified,
      layerId: options.layerId,
      metadata: this.cloneFeatureMetadata(options.metadata),
      sourceFeatureIds,
      interactionOverride: options.interactionOverride,
      styleOverrides: this.cloneStyleOverrides(options.styleOverrides),
    };
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
    } catch {
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
    } catch {
      return null;
    }
  }

  // Legacy methods that are now handled by specialized managers but kept for compatibility

  addMarker(
    latlngs: L.LatLngLiteral[],
    featureGroup: L.FeatureGroup,
    options?: { optimizationLevel?: number; originalOptimizationLevel?: number },
  ): void {
    // console.log('PolygonMutationManager addMarker');
    this.interactionManager.addMarkers(latlngs, featureGroup, options);
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
    return leafletAdapter.createDivIcon({ className: processedClasses.join(' ') });
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

  /**
   * Clean up all resources associated with a feature group
   * This method ensures proper cleanup of event listeners and associated resources
   */
  cleanupFeatureGroup(featureGroup: L.FeatureGroup): void {
    // console.log('PolygonMutationManager cleanupFeatureGroup');

    // Delegate cleanup to interaction manager
    this.interactionManager.cleanupFeatureGroup(featureGroup);
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
        } catch {
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
        } catch {
          // Handle errors
        }
      });
    } catch {
      // Handle errors
    }
  }
}
