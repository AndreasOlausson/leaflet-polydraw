import * as L from 'leaflet';
import { defaultConfig } from './config';
import { DrawMode } from './enums';
import { TurfHelper } from './turf-helper';
import { createButtons } from './buttons';
import { PolygonInformationService } from './polygon-information.service';
import { MapStateService } from './map-state';
import { EventManager } from './managers/event-manager';
import { ModeManager } from './managers/mode-manager';
import { PolygonDrawManager } from './managers/polygon-draw-manager';
import { PolygonMutationManager } from './managers/polygon-mutation-manager';
import { HistoryManager } from './managers/history-manager';
import type { HistorySnapshot } from './managers/history-manager';
import type { Feature, Polygon, MultiPolygon, LineString } from 'geojson';
import './styles/polydraw.css';
import { injectDynamicStyles } from './styles/dynamic-styles';
import { leafletAdapter } from './compatibility/leaflet-adapter';
import { EventAdapter } from './compatibility/event-adapter';
import { LeafletVersionDetector } from './compatibility/version-detector';
import { CoordinateUtils } from './coordinate-utils';
import { deepMerge } from './utils/config-merge.util';

import type { PolydrawConfig, DrawModeChangeHandler } from './types/polydraw-interfaces';

// Create a local interface that extends L.Map for our specific needs
interface ExtendedMap extends L.Map {
  _onResize?: () => void;
  tap?: boolean;
}

// Create a type for the extended browser object
type ExtendedBrowser = typeof L.Browser & {
  touch: boolean;
  mobile: boolean;
};

type PolydrawOptions = L.ControlOptions & {
  config?: Partial<PolydrawConfig>;
  configPath?: string;
};

type PredefinedOptions = {
  visualOptimizationLevel?: number;
};

class Polydraw extends L.Control {
  private map!: L.Map;
  private tracer!: L.Polyline;
  private turfHelper!: TurfHelper;
  private subContainer?: HTMLElement;
  private config: PolydrawConfig;
  private mapStateService!: MapStateService;
  private eventManager!: EventManager;
  private polygonInformation!: PolygonInformationService;
  private modeManager!: ModeManager;
  private polygonDrawManager!: PolygonDrawManager;
  private polygonMutationManager!: PolygonMutationManager;
  private historyManager!: HistoryManager;
  private arrayOfFeatureGroups: L.FeatureGroup[] = [];

  private drawMode: DrawMode = DrawMode.Off;
  private drawModeListeners: DrawModeChangeHandler[] = [];
  private _boundKeyDownHandler!: (e: KeyboardEvent) => void;
  private _boundKeyUpHandler!: (e: KeyboardEvent) => void;
  private isModifierKeyHeld: boolean = false;
  private _boundTouchMove!: (e: TouchEvent) => void;
  private _boundTouchEnd!: (e: TouchEvent) => void;
  private _boundTouchStart!: (e: TouchEvent) => void;
  private _boundPointerDown!: (e: PointerEvent) => void;
  private _boundPointerMove!: (e: PointerEvent) => void;
  private _boundPointerUp!: (e: PointerEvent) => void;
  private _lastTapTime: number = 0;
  private _tapTimeout: number | null = null;
  private pointerEventsHandled: boolean =
    typeof window !== 'undefined' && 'PointerEvent' in window && LeafletVersionDetector.isV2();

  constructor(options?: PolydrawOptions) {
    super(options);

    // Start from a clean clone of the defaults
    const baseDefaults: PolydrawConfig = structuredClone(defaultConfig);

    // Apply inline config via deep merge (partial configs supported)
    this.config = deepMerge<PolydrawConfig>(baseDefaults, options?.config ?? {});
    this.warnIfUsingDeprecatedConfiguration(options?.config);

    // If an external config path is provided, load and merge it (then init)
    if (options?.configPath) {
      this.loadExternalConfig(options.configPath, options?.config);
    } else {
      // Initialize components immediately when no external config is used
      this.initializeComponents();
    }
  }

  /**
   * Method called when the control is added to the map.
   * It initializes the control, creates the UI, and sets up event listeners.
   * @param _map - The map instance.
   * @returns The control's container element.
   */
  public onAdd(_map: L.Map): HTMLElement {
    void _map; // make lint happy
    const extendedMap = _map as ExtendedMap;
    const browser = L.Browser as ExtendedBrowser;

    // Prevent iOS click hijack behavior
    extendedMap._onResize = () => {};

    // Workaround: disable native tap handling on iOS
    if (browser.touch && browser.mobile) {
      extendedMap.tap = false;
    }
    this.map = _map;

    // Add ESC key handler for Point-to-Point mode
    this.setupKeyboardHandlers();

    // Initialize UI and DOM
    const container = leafletAdapter.domUtil.create('div', 'leaflet-control leaflet-bar');
    this.initializeUI(container);

    // Create tracer polyline
    this.createTracer();

    // Initialize managers now that map is available
    this.initializeManagers();

    // Apply initial draw mode now that all managers and tracer are ready
    this.setDrawMode(this.config.defaultMode);

    // Attach event listeners
    this.setupEventListeners();

    return container;
  }

  /**
   * Method called when the control is removed from the map.
   * It handles the cleanup of layers, events, and handlers.
   * @param _map - The map instance, unused but required by the L.Control interface.
   */
  public onRemove(_map: L.Map) {
    void _map; // make lint happy
    this.removeKeyboardHandlers();
    if (this.tracer) {
      this.map.removeLayer(this.tracer);
    }
    this.removeAllFeatureGroups();
  }

  /**
   * Adds the control to the given map.
   * @param map - The map instance.
   * @returns The current instance of the control.
   */
  public addTo(map: L.Map): this {
    super.addTo(map);
    return this;
  }

  /**
   * Returns the array of feature groups currently managed by the control.
   * @returns An array of L.FeatureGroup objects.
   */
  public getFeatureGroups(): L.FeatureGroup[] {
    return this.arrayOfFeatureGroups;
  }

  /**
   * Undo the last action
   */
  public async undo(): Promise<void> {
    if (!this.historyManager.canUndo()) {
      return;
    }

    const snapshot = this.historyManager.undo(this.arrayOfFeatureGroups);
    if (snapshot) {
      await this.restoreFromSnapshot(snapshot);
    }
  }

  /**
   * Redo the last undone action
   */
  public async redo(): Promise<void> {
    if (!this.historyManager.canRedo()) {
      return;
    }

    const snapshot = this.historyManager.redo(this.arrayOfFeatureGroups);
    if (snapshot) {
      await this.restoreFromSnapshot(snapshot);
    }
  }

  /**
   * Adds a predefined polygon to the map.
   * @param geoborders - Flexible coordinate format: objects ({lat, lng}), arrays ([lat, lng] or [lng, lat]), strings ("lat,lng" or "N59 E10")
   * @param options - Optional parameters, including visual optimization level.
   */
  public async addPredefinedPolygon(
    geoborders: unknown[][][],
    options?: PredefinedOptions,
  ): Promise<void> {
    // Convert input to L.LatLng[][][] using smart coordinate detection
    const geographicBorders = CoordinateUtils.convertToLatLngArray(geoborders);

    // Validate input
    if (!geographicBorders || geographicBorders.length === 0) {
      throw new Error('Cannot add empty polygon array');
    }

    // Ensure map is properly initialized
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    // Ensure PolygonMutationManager is initialized
    if (!this.polygonMutationManager) {
      throw new Error('PolygonMutationManager not initialized');
    }

    // Extract options with defaults
    const visualOptimizationLevel = options?.visualOptimizationLevel ?? 0;

    for (const [groupIndex, group] of geographicBorders.entries()) {
      if (!group || !group[0] || group[0].length < 4) {
        throw new Error(
          `Invalid polygon data at index ${groupIndex}: A polygon must have at least 3 unique vertices.`,
        );
      }
      try {
        // Convert L.LatLng[][][] to coordinate format for TurfHelper
        const coords = group.map((ring) => ring.map((latlng) => [latlng.lng, latlng.lat]));

        const polygon2 = this.turfHelper.getMultiPolygon([coords]);

        // Save state before adding polygon
        this.historyManager.saveState(this.arrayOfFeatureGroups, 'addPredefinedPolygon');

        // Use the PolygonMutationManager instead of direct addPolygon
        const result = await this.polygonMutationManager.addPolygon(polygon2, {
          simplify: false,
          noMerge: false,
          visualOptimizationLevel: visualOptimizationLevel,
        });

        if (!result.success) {
          console.error('Error adding polygon via manager:', result.error);
          throw new Error(result.error || 'Failed to add polygon');
        }

        this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
      } catch (error) {
        console.error('Error adding auto polygon:', error);
        throw error;
      }
    }
  }

  /**
   * Adds predefined polygons from GeoJSON to the map.
   * @param geojsonFeatures - An array of GeoJSON Polygon or MultiPolygon features.
   * @param options - Optional parameters, including visual optimization level.
   */
  public async addPredefinedGeoJSONs(
    geojsonFeatures: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[],
    options?: PredefinedOptions,
  ): Promise<void> {
    for (const geojsonFeature of geojsonFeatures) {
      const { type, coordinates } = geojsonFeature.geometry;

      if (type === 'MultiPolygon') {
        // MultiPolygon: coordinates[polygon][ring][point]
        for (const polygonCoords of coordinates) {
          const latLngs = polygonCoords.map((ring) =>
            ring.map((point) => L.latLng(point[1], point[0])),
          );
          await this.addPredefinedPolygon([latLngs], options);
        }
      } else if (type === 'Polygon') {
        // Polygon: coordinates[ring][point]
        const latLngs = coordinates.map((ring) =>
          ring.map((point) => L.latLng(point[1], point[0])),
        );
        await this.addPredefinedPolygon([latLngs], options);
      }
    }
  }

  /**
   * Sets the current drawing mode.
   * @param mode - The drawing mode to set.
   */
  public setDrawMode(mode: DrawMode) {
    const previousMode = this.drawMode;
    this._updateDrawModeState(mode);

    // Only stop draw if we're switching away from PointToPoint modes or going to Off mode
    // Don't reset tracer when entering PointToPoint modes
    if (
      (previousMode === DrawMode.PointToPoint || previousMode === DrawMode.PointToPointSubtract) &&
      mode !== DrawMode.PointToPoint &&
      mode !== DrawMode.PointToPointSubtract
    ) {
      // Clear P2P markers when leaving PointToPoint modes
      this.polygonDrawManager.clearP2pMarkers();
      this.stopDraw();
    } else if (mode === DrawMode.Off) {
      this.stopDraw();
    } else if (mode !== DrawMode.PointToPoint && mode !== DrawMode.PointToPointSubtract) {
      this.stopDraw();
    }

    if (this.map) {
      this._updateUIAfterDrawModeChange(mode);
      this._updateMapInteractions();
    }
  }

  /**
   * Returns the current drawing mode.
   * @returns The current DrawMode.
   */
  public getDrawMode(): DrawMode {
    return this.modeManager.getCurrentMode();
  }

  /**
   * Registers an event listener for a given event type.
   * @param event - The event type to listen for.
   * @param callback - The callback function to execute when the event is triggered.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public on(event: any, callback: any): void {
    this.eventManager.on(event, callback);
  }

  /**
   * Unregisters an event listener for a given event type.
   * @param event - The event type to stop listening for.
   * @param callback - The callback function to remove.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public off(event: any, callback: any): void {
    this.eventManager.off(event, callback);
  }

  /**
   * Removes all feature groups from the map and clears the internal storage.
   */
  public removeAllFeatureGroups() {
    this.arrayOfFeatureGroups.forEach((featureGroups) => {
      try {
        this.map.removeLayer(featureGroups);
      } catch (error) {
        // Silently handle layer removal errors
      }
    });
    this.arrayOfFeatureGroups.length = 0; // Clear the array in-place to preserve the reference
    this.polygonInformation.deletePolygonInformationStorage();
    this.polygonInformation.updatePolygons();
    // Update the indicator state after removing all polygons
    this.updateActivateButtonIndicator();
  }

  /**
   * Initializes the user interface, creates DOM elements, sets up buttons, and injects styles.
   * @param container - The main control container element.
   */
  private initializeUI(container: HTMLElement): void {
    injectDynamicStyles(this.config);

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.on(container, 'mousedown', L.DomEvent.stopPropagation);
    L.DomEvent.on(container, 'touchstart', L.DomEvent.stopPropagation);
    L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
    container.style.display = 'flex';
    container.style.flexDirection = 'column-reverse';

    // Firefox Android fix: Ensure container has proper touch handling
    container.style.pointerEvents = 'auto';
    container.style.position = 'relative';
    container.style.zIndex = '1000';

    this.subContainer = leafletAdapter.domUtil.create('div', 'sub-buttons', container);
    this.subContainer.setAttribute('data-polydraw', 'sub-buttons');
    this.subContainer.style.maxHeight = '0px';
    this.subContainer.style.overflow = 'hidden';
    this.subContainer.style.transition = 'max-height 0.3s ease';

    // Firefox Android fix: Ensure subContainer has proper touch handling
    this.subContainer.style.pointerEvents = 'auto';
    this.subContainer.style.position = 'relative';

    createButtons(
      container,
      this.subContainer,
      this.config,
      this._handleActivateToggle,
      this._handleDrawClick,
      this._handleSubtractClick,
      this._handleEraseClick,
      this._handlePointToPointClick,
      this._handlePointToPointSubtractClick,
      this._handleUndoClick,
      this._handleRedoClick,
      this.eventManager,
      this.historyManager,
    );

    // Firefox Android fix: Ensure all buttons have proper touch handling
    this.ensureButtonTouchResponsiveness(container);

    // Simple UI update listener
    const uiUpdateListener = (mode: DrawMode) => {
      const drawButton = container.querySelector('.icon-draw') as HTMLElement;
      const subtractButton = container.querySelector('.icon-subtract') as HTMLElement;
      if (drawButton) drawButton.classList.toggle('active', mode === DrawMode.Add);
      if (subtractButton) subtractButton.classList.toggle('active', mode === DrawMode.Subtract);
    };
    this.drawModeListeners.push(uiUpdateListener);
  }

  /**
   * Attaches listeners to polygonMutationManager and eventManager.
   */
  private setupEventListeners(): void {
    // Listen for polygon operation completion events to reset draw mode
    this.polygonMutationManager.on('polygonOperationComplete', () => {
      // Update the indicator state after any polygon operation
      this.updateActivateButtonIndicator();
      // Use the interaction state manager to reset to Off mode
      this.modeManager.updateStateForMode(DrawMode.Off);
      this.drawMode = DrawMode.Off;
      this.emitDrawModeChanged();

      // Update UI state
      this.updateMarkerDraggableState();

      // Update map interactions and cursor
      const shouldShowCrosshair = this.modeManager.shouldShowCrosshairCursor();
      const mapDragEnabled = this.modeManager.canPerformAction('mapDrag');
      const mapZoomEnabled = this.modeManager.canPerformAction('mapZoom');
      const mapDoubleClickEnabled = this.modeManager.canPerformAction('mapDoubleClickZoom');

      // Update cursor
      if (shouldShowCrosshair) {
        leafletAdapter.domUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
      } else {
        leafletAdapter.domUtil.removeClass(this.map.getContainer(), 'crosshair-cursor-enabled');
      }

      // Update events and map interactions
      this.events(false); // Turn off drawing events
      this.setLeafletMapEvents(mapDragEnabled, mapDoubleClickEnabled, mapZoomEnabled);

      // Reset tracer style
      this.applyTracerStyle(DrawMode.Off);
    });

    // Listen for polygon deletion events to update the activate button indicator
    this.polygonMutationManager.on('polygonDeleted', () => {
      this.updateActivateButtonIndicator();
    });

    // Listen for drawing completion events from the draw manager
    this.eventManager.on('polydraw:polygon:created', async (data) => {
      this.stopDraw();
      if (data.isPointToPoint) {
        // Save state before P2P operation
        this.historyManager.saveState(this.arrayOfFeatureGroups, 'pointToPoint');

        // For P2P, handle based on the mode
        if (data.mode === DrawMode.PointToPointSubtract) {
          // Use subtraction for P2P subtract mode
          await this.polygonMutationManager.subtractPolygon(data.polygon);
        } else {
          // Use addition for regular P2P mode
          await this.polygonMutationManager.addPolygon(data.polygon, {
            simplify: false,
            noMerge: false,
          });
        }
      } else {
        // For freehand, handle based on mode
        await this.handleFreehandDrawCompletion(data.polygon);
      }
      this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
    });

    // Listen for drawing cancellation events
    this.eventManager.on('polydraw:draw:cancel', () => {
      this.stopDraw();
      this.setDrawMode(this.config.defaultMode);
    });
  }

  /**
   * Initializes and adds the tracer polyline to the map.
   */
  private createTracer(): void {
    this.tracer = leafletAdapter.createPolyline([], {
      ...this.config.polyLineOptions,
      color: this.config.colors.polyline,
    });
    try {
      this.tracer.addTo(this.map);
    } catch (error) {
      // Silently handle tracer initialization in test environment
    }
  }

  /**
   * Applies the correct weight/opacity/color/dash style to the tracer for the given mode.
   */
  private applyTracerStyle(mode: DrawMode): void {
    if (!this.tracer) return;

    try {
      const isSubtractMode = mode === DrawMode.Subtract || mode === DrawMode.PointToPointSubtract;
      const baseStyle = this.getTracerBaseStyle(isSubtractMode);

      let dashArray: string | undefined;
      let color = '';

      switch (mode) {
        case DrawMode.Add:
          color = this.config.colors.polyline;
          dashArray = undefined;
          break;
        case DrawMode.Subtract:
          color = this.config.colors.subtractLine;
          dashArray = undefined;
          break;
        case DrawMode.PointToPoint:
          color = this.config.colors.polyline;
          dashArray = '5, 5';
          break;
        case DrawMode.PointToPointSubtract:
          color = this.config.colors.subtractLine;
          dashArray = '5, 5';
          break;
        case DrawMode.Off:
        default:
          color = '';
          dashArray = undefined;
          break;
      }

      this.tracer.setStyle({
        ...baseStyle,
        color,
        dashArray,
      });
    } catch (error) {
      // Handle case where tracer renderer is not initialized
    }
  }

  /**
   * Returns base tracer styles depending on whether we're in subtract mode.
   */
  private getTracerBaseStyle(isSubtractMode: boolean): Pick<L.PathOptions, 'weight' | 'opacity'> {
    const options = isSubtractMode ? this.config.subtractLineOptions : this.config.polyLineOptions;
    return {
      weight: options.weight,
      opacity: options.opacity,
    };
  }

  /**
   * Sets up PolygonDrawManager and PolygonMutationManager with the map.
   */
  private initializeManagers(): void {
    // Initialize PolygonDrawManager now that map is available
    this.polygonDrawManager = new PolygonDrawManager({
      turfHelper: this.turfHelper,
      map: this.map,
      config: this.config,
      modeManager: this.modeManager,
      eventManager: this.eventManager,
      tracer: this.tracer,
    });

    // Initialize PolygonMutationManager now that map is available
    this.polygonMutationManager = new PolygonMutationManager({
      turfHelper: this.turfHelper,
      polygonInformation: this.polygonInformation,
      map: this.map,
      config: this.config,
      modeManager: this.modeManager,
      eventManager: this.eventManager,
      getFeatureGroups: () => this.arrayOfFeatureGroups,
      saveHistoryState: () => {
        this.historyManager.saveState(this.arrayOfFeatureGroups, 'vertexDrag');
      },
    });
  }

  /**
   * Loads an external configuration file and merges it with the default and inline configs.
   * @param configPath - The path to the external configuration file.
   * @param inlineConfig - An optional inline configuration object.
   */
  private async loadExternalConfig(configPath: string, inlineConfig?: Partial<PolydrawConfig>) {
    try {
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(
          `Failed to load config from ${configPath}: ${response.status} ${response.statusText}`,
        );
      }

      // Expect external to be a partial config
      const externalConfig: Partial<PolydrawConfig> = await response.json();

      this.warnIfUsingDeprecatedConfiguration(externalConfig);
      if (inlineConfig) {
        this.warnIfUsingDeprecatedConfiguration(inlineConfig);
      }

      // Merge precedence: defaults < external < inline
      this.config = deepMerge<PolydrawConfig>(
        structuredClone(defaultConfig),
        externalConfig ?? {},
        inlineConfig ?? {},
      );

      this.initializeComponents();
    } catch (error) {
      console.warn(
        'Failed to load external config, falling back to default + inline config:',
        error,
      );
      // Fallback to defaults < inline
      this.config = deepMerge<PolydrawConfig>(structuredClone(defaultConfig), inlineConfig ?? {});
      this.initializeComponents();
    }
  }

  /**
   * Initializes the core components of the Polydraw control.
   */
  /**
   * Updates the state of the drawing mode.
   * @param mode - The new drawing mode.
   */
  private _updateDrawModeState(mode: DrawMode) {
    this.drawMode = mode;
    this.modeManager.updateStateForMode(mode);
    this.emitDrawModeChanged();
    this.updateMarkerDraggableState();
  }

  /**
   * Updates the UI after a change in the drawing mode.
   * @param mode - The new drawing mode.
   */
  private _updateUIAfterDrawModeChange(mode: DrawMode) {
    const shouldShowCrosshair = this.modeManager.shouldShowCrosshairCursor();
    if (shouldShowCrosshair) {
      leafletAdapter.domUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
    } else {
      leafletAdapter.domUtil.removeClass(this.map.getContainer(), 'crosshair-cursor-enabled');
    }

    this.applyTracerStyle(mode);
  }

  /**
   * Updates map interactions based on the current drawing mode.
   */
  private _handleActivateToggle = () => {
    const container = this.getContainer();
    if (!container) return;

    const activateButton = container.querySelector('.icon-activate') as HTMLElement;
    if (leafletAdapter.domUtil.hasClass(activateButton, 'active')) {
      leafletAdapter.domUtil.removeClass(activateButton, 'active');
      if (this.subContainer) {
        this.subContainer.style.maxHeight = '0px';
      }
    } else {
      leafletAdapter.domUtil.addClass(activateButton, 'active');
      if (this.subContainer) {
        this.subContainer.style.maxHeight = '250px';
      }
    }
    // Update the indicator state whenever the panel is toggled
    this.updateActivateButtonIndicator();
  };

  private _handleDrawClick = (e?: Event) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // If already in Add mode, turn it off instead of ignoring
    if (this.modeManager.getCurrentMode() === DrawMode.Add) {
      this.setDrawMode(DrawMode.Off);
      return;
    }
    this.setDrawMode(DrawMode.Add);
    this.polygonInformation.saveCurrentState();
  };

  private _handleSubtractClick = (e?: Event) => {
    // Prevent multiple rapid clicks
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // If already in Subtract mode, turn it off instead of ignoring
    if (this.modeManager.getCurrentMode() === DrawMode.Subtract) {
      this.setDrawMode(DrawMode.Off);
      return;
    }
    this.setDrawMode(DrawMode.Subtract);
    this.polygonInformation.saveCurrentState();
  };

  private _handleEraseClick = (e?: Event) => {
    // Close any open popup before erasing polygons
    this.map.closePopup();
    // Prevent multiple rapid clicks
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Only erase if there are polygons to erase
    if (this.arrayOfFeatureGroups.length === 0) {
      return;
    }
    // Save state before erasing all
    this.historyManager.saveState(this.arrayOfFeatureGroups, 'eraseAll');
    this.removeAllFeatureGroups();
  };

  private _handlePointToPointClick = (e?: Event) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // If already in PointToPoint mode, turn it off instead of ignoring
    if (this.modeManager.getCurrentMode() === DrawMode.PointToPoint) {
      this.setDrawMode(DrawMode.Off);
      return;
    }
    this.setDrawMode(DrawMode.PointToPoint);
    this.polygonInformation.saveCurrentState();
  };

  private _handlePointToPointSubtractClick = (e?: Event) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // If already in PointToPointSubtract mode, turn it off instead of ignoring
    if (this.modeManager.getCurrentMode() === DrawMode.PointToPointSubtract) {
      this.setDrawMode(DrawMode.Off);
      return;
    }
    this.setDrawMode(DrawMode.PointToPointSubtract);
    this.polygonInformation.saveCurrentState();
  };

  private _handleUndoClick = (e?: Event) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    this.undo();
  };

  private _handleRedoClick = (e?: Event) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    this.redo();
  };

  private _updateMapInteractions() {
    const mapDragEnabled = this.modeManager.canPerformAction('mapDrag');
    const mapZoomEnabled = this.modeManager.canPerformAction('mapZoom');
    const mapDoubleClickEnabled = this.modeManager.canPerformAction('mapDoubleClickZoom');

    this.events(this.drawMode !== DrawMode.Off);
    this.setLeafletMapEvents(mapDragEnabled, mapDoubleClickEnabled, mapZoomEnabled);
  }

  /**
   * Restore the map state from a history snapshot
   */
  private async restoreFromSnapshot(snapshot: HistorySnapshot): Promise<void> {
    // Set restoration flag to prevent saveState during restoration
    this.historyManager.setRestoring(true);

    try {
      // Clear all existing feature groups
      this.removeAllFeatureGroups();

      // Restore each polygon from the snapshot
      for (const feature of snapshot.features) {
        // Add the polygon back to the map using the mutation manager
        // Use noMerge and simplify:false to restore polygons exactly as they were
        await this.polygonMutationManager.addPolygon(feature, {
          noMerge: true,
          simplify: false,
        });
      }

      // Update polygon information
      this.polygonInformation.updatePolygons();
    } finally {
      // Always reset restoration flag
      this.historyManager.setRestoring(false);
    }
  }

  private initializeComponents() {
    this.turfHelper = new TurfHelper(this.config);
    this.mapStateService = new MapStateService();
    this.eventManager = new EventManager();
    this.polygonInformation = new PolygonInformationService(this.mapStateService);
    this.modeManager = new ModeManager(this.config, this.eventManager);
    this.historyManager = new HistoryManager(this.eventManager, this.config.maxHistorySize);
    this.polygonInformation.onPolygonInfoUpdated((_k) => {
      void _k; // make lint happy
      // This is the perfect central place to keep the indicator in sync.
      this.updateActivateButtonIndicator();
    });
    this._boundKeyDownHandler = this.handleKeyDown.bind(this);
  }

  /**
   * Emits an event to notify listeners that the drawing mode has changed.
   */
  private emitDrawModeChanged(): void {
    this.eventManager.emit('polydraw:mode:change', {
      mode: this.modeManager.getCurrentMode(),
    });
    for (const cb of this.drawModeListeners) {
      cb(this.modeManager.getCurrentMode());
    }
  }

  /**
   * Update the draggable state of all existing markers when draw mode changes
   */
  private updateMarkerDraggableState(): void {
    const shouldBeDraggable = this.modeManager.canPerformAction('markerDrag');

    this.arrayOfFeatureGroups.forEach((featureGroup) => {
      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const marker = layer as L.Marker;
          try {
            // Update the draggable option
            marker.options.draggable = shouldBeDraggable;

            // If the marker has dragging capability, update its state
            if (marker.dragging) {
              if (shouldBeDraggable) {
                marker.dragging.enable();
              } else {
                marker.dragging.disable();
              }
            }
          } catch (error) {
            // Handle any errors in updating marker state
          }
        }
      });
    });
  }

  /**
   * Stops the current drawing operation and resets the tracer.
   */
  private stopDraw() {
    this.resetTracker();
    this.drawStartedEvents(false);
  }

  /**
   * Enables or disables Leaflet's default map interactions.
   * @param enableDragging - Whether to enable map dragging.
   * @param enableDoubleClickZoom - Whether to enable double-click zoom.
   * @param enableScrollWheelZoom - Whether to enable scroll wheel zoom.
   */
  private setLeafletMapEvents(
    enableDragging: boolean,
    enableDoubleClickZoom: boolean,
    enableScrollWheelZoom: boolean,
  ) {
    if (enableDragging) {
      this.map.dragging.enable();
    } else {
      this.map.dragging.disable();
    }

    if (enableDoubleClickZoom) {
      this.map.doubleClickZoom.enable();
    } else {
      this.map.doubleClickZoom.disable();
    }

    if (enableScrollWheelZoom) {
      this.map.scrollWheelZoom.enable();
    } else {
      this.map.scrollWheelZoom.disable();
    }
  }

  /**
   * Resets the tracer polyline by clearing its LatLngs.
   */
  private resetTracker() {
    this.tracer.setLatLngs([]);
  }

  /**
   * Attaches or detaches the mouse move and mouse up event listeners for drawing.
   * @param onoff - A boolean indicating whether to attach or detach the events.
   */
  private drawStartedEvents(onoff: boolean) {
    const onoroff = onoff ? 'on' : 'off';

    // Bind move and end events - use specific Leaflet event types
    this.map[onoroff]('mousemove', this.mouseMove, this);
    this.map[onoroff]('mouseup', this.mouseUpLeave, this);

    // Handle touch events separately for backward compatibility
    if (onoff) {
      this._boundTouchMove = (e) => this.mouseMove(e);
      this._boundTouchEnd = (e) => this.mouseUpLeave(e);

      // Add pointer events for Leaflet v2
      if (LeafletVersionDetector.isV2()) {
        this._boundPointerMove = (e) => this.mouseMove(e);
        this._boundPointerUp = (e) => this.mouseUpLeave(e);

        this.map
          .getContainer()
          .addEventListener('pointermove', this._boundPointerMove, { passive: false });
        this.map
          .getContainer()
          .addEventListener('pointerup', this._boundPointerUp, { passive: false });
      }

      this.map
        .getContainer()
        .addEventListener('touchmove', this._boundTouchMove, { passive: false });
      this.map.getContainer().addEventListener('touchend', this._boundTouchEnd, { passive: false });
    } else {
      if (this._boundTouchMove) {
        this.map.getContainer().removeEventListener('touchmove', this._boundTouchMove);
      }
      if (this._boundTouchEnd) {
        this.map.getContainer().removeEventListener('touchend', this._boundTouchEnd);
      }
      if (this._boundPointerMove) {
        this.map.getContainer().removeEventListener('pointermove', this._boundPointerMove);
      }
      if (this._boundPointerUp) {
        this.map.getContainer().removeEventListener('pointerup', this._boundPointerUp);
      }
    }
  }

  /**
   * Attaches or detaches the main drawing event listeners.
   * @param onoff - A boolean indicating whether to attach or detach the events.
   */
  private events(onoff: boolean) {
    const onoroff = onoff ? 'on' : 'off';

    // Bind start events - use specific Leaflet event types
    this.map[onoroff]('mousedown', this.mouseDown, this);

    // Add double-click event for Point-to-Point mode
    this.map[onoroff]('dblclick', this.handleDoubleClick, this);

    // Handle touch and pointer events separately for backward compatibility
    if (onoff) {
      this._boundTouchStart = (e) => this.handleTouchStart(e);

      // Only add pointer events for Leaflet v2
      if (LeafletVersionDetector.isV2()) {
        this._boundPointerDown = (e) => this.mouseDown(e);
        this.map
          .getContainer()
          .addEventListener('pointerdown', this._boundPointerDown, { passive: false });
      }

      this.map
        .getContainer()
        .addEventListener('touchstart', this._boundTouchStart, { passive: false });
    } else {
      if (this._boundTouchStart) {
        this.map.getContainer().removeEventListener('touchstart', this._boundTouchStart);
      }
      if (this._boundPointerDown) {
        this.map.getContainer().removeEventListener('pointerdown', this._boundPointerDown);
      }
    }
  }

  /**
   * Handle touch start events with double-tap detection
   * @param event - The touch event
   */
  private handleTouchStart(event: TouchEvent) {
    const currentTime = Date.now();
    const timeDiff = currentTime - this._lastTapTime;

    // Clear any existing timeout
    if (this._tapTimeout) {
      clearTimeout(this._tapTimeout);
      this._tapTimeout = null;
    }

    // Check for double-tap (within 300ms)
    if (timeDiff < 300 && timeDiff > 0) {
      // Double-tap detected
      this.handleDoubleTap(event);
      this._lastTapTime = 0; // Reset to prevent triple-tap
    } else {
      // Single tap - set timeout to handle as single tap if no second tap comes
      this._lastTapTime = currentTime;
      if (!this.pointerEventsHandled) {
        this._tapTimeout = window.setTimeout(() => {
          this.mouseDown(event);
          this._tapTimeout = null;
        }, 300);
      }
    }
  }

  /**
   * Handle double-tap for touch devices
   * @param event - The touch event
   */
  private handleDoubleTap(event: TouchEvent) {
    // Only handle double-tap in Point-to-Point modes
    if (
      this.modeManager.getCurrentMode() !== DrawMode.PointToPoint &&
      this.modeManager.getCurrentMode() !== DrawMode.PointToPointSubtract
    ) {
      return;
    }

    // Pass to polygon draw manager
    this.polygonDrawManager.handleDoubleTap(event);
  }

  /**
   * Handles the mouse down event to start a drawing operation.
   * @param event - The mouse, touch, or pointer event.
   */
  private mouseDown(event: L.LeafletMouseEvent | TouchEvent | PointerEvent | any) {
    // Normalize event for v1/v2 compatibility
    const normalizedEvent = EventAdapter.normalizeEvent(event);

    // Safeguard against unintended browser actions
    if (EventAdapter.shouldPreventDefault(normalizedEvent)) {
      normalizedEvent.preventDefault();
    }

    // Check if we're still in a drawing mode before processing
    if (this.modeManager.isInOffMode()) {
      return;
    }

    // Extract coordinates using the event adapter
    const clickLatLng = EventAdapter.extractCoordinates(normalizedEvent, this.map);

    if (!clickLatLng) {
      return;
    }

    // Handle Point-to-Point modes differently
    if (
      this.modeManager.getCurrentMode() === DrawMode.PointToPoint ||
      this.modeManager.getCurrentMode() === DrawMode.PointToPointSubtract
    ) {
      this.polygonDrawManager.handlePointToPointClick(clickLatLng);
      return;
    }

    // Handle normal drawing modes (Add, Subtract)
    this.tracer.setLatLngs([clickLatLng]);
    this.startDraw();
  }

  /**
   * Handles the mouse move event to draw the tracer polyline.
   * @param event - The mouse, touch, or pointer event.
   */
  private mouseMove(event: L.LeafletMouseEvent | TouchEvent | PointerEvent | any) {
    // Normalize event for v1/v2 compatibility
    const normalizedEvent = EventAdapter.normalizeEvent(event);

    // Prevent scroll or pull-to-refresh on mobile
    if (EventAdapter.shouldPreventDefault(normalizedEvent)) {
      normalizedEvent.preventDefault();
    }

    // Extract coordinates using the event adapter
    const latlng = EventAdapter.extractCoordinates(normalizedEvent, this.map);
    if (latlng) {
      this.tracer.addLatLng(latlng);
    }
  }

  /**
   * Handles the mouse up event to complete a drawing operation.
   * @param event - The mouse, touch, or pointer event.
   */
  private async mouseUpLeave(event: L.LeafletMouseEvent | TouchEvent | PointerEvent | any) {
    // Normalize event for v1/v2 compatibility
    const normalizedEvent = EventAdapter.normalizeEvent(event);

    // Prevent unintended scroll or refresh on touchend/touchup (mobile)
    if (EventAdapter.shouldPreventDefault(normalizedEvent)) {
      normalizedEvent.preventDefault();
    }
    this.polygonInformation.deletePolygonInformationStorage();

    // Get tracer coordinates and validate before processing
    const tracerGeoJSON = this.tracer.toGeoJSON() as Feature<LineString>;

    // Check if tracer has valid coordinates before processing
    if (
      !tracerGeoJSON ||
      !tracerGeoJSON.geometry ||
      !tracerGeoJSON.geometry.coordinates ||
      tracerGeoJSON.geometry.coordinates.length < 3
    ) {
      // Not enough points to form a valid polygon, just stop drawing
      this.stopDraw();
      return;
    }

    let geoPos: Feature<Polygon | MultiPolygon>;
    try {
      geoPos = this.turfHelper.createPolygonFromTrace(tracerGeoJSON);
    } catch (error) {
      // Handle polygon creation errors (e.g., invalid polygon)
      this.stopDraw();
      return;
    }

    // Additional validation - check if the resulting polygon is valid
    if (
      !geoPos ||
      !geoPos.geometry ||
      !geoPos.geometry.coordinates ||
      geoPos.geometry.coordinates.length === 0
    ) {
      this.stopDraw();
      return;
    }

    this.stopDraw();

    try {
      switch (this.modeManager.getCurrentMode()) {
        case DrawMode.Add: {
          // Use the PolygonMutationManager instead of direct addPolygon
          const result = await this.polygonMutationManager.addPolygon(geoPos, {
            simplify: true,
            noMerge: false,
          });
          if (!result.success) {
            console.error('Error adding polygon via manager:', result.error);
          }
          break;
        }
        case DrawMode.Subtract: {
          // Use the PolygonMutationManager for subtraction
          const subtractResult = await this.polygonMutationManager.subtractPolygon(geoPos);
          if (!subtractResult.success) {
            console.error('Error subtracting polygon via manager:', subtractResult.error);
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error('Error in mouseUpLeave polygon operation:', error);
    }

    this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
  }

  /**
   * Handles the completion of a freehand drawing operation.
   * @param geoPos - The GeoJSON feature representing the drawn polygon.
   */
  private async handleFreehandDrawCompletion(geoPos: Feature<Polygon | MultiPolygon>) {
    try {
      // Save state before freehand operation
      this.historyManager.saveState(this.arrayOfFeatureGroups, 'freehand');

      switch (this.modeManager.getCurrentMode()) {
        case DrawMode.Add: {
          // Use the PolygonMutationManager instead of direct addPolygon
          const result = await this.polygonMutationManager.addPolygon(geoPos, {
            simplify: true,
            noMerge: false,
          });
          if (!result.success) {
            console.error('Error adding polygon via manager:', result.error);
          }
          break;
        }
        case DrawMode.Subtract: {
          // Use the PolygonMutationManager for subtraction
          const subtractResult = await this.polygonMutationManager.subtractPolygon(geoPos);
          if (!subtractResult.success) {
            console.error('Error subtracting polygon via manager:', subtractResult.error);
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error('Error in mouseUpLeave polygon operation:', error);
    }
  }

  /**
   * Starts a drawing operation by attaching the necessary event listeners.
   */
  private startDraw() {
    this.drawStartedEvents(true);
  }

  /**
   * Sets up the keyboard event handlers for the document.
   */
  private setupKeyboardHandlers() {
    this._boundKeyUpHandler = this.handleKeyUp.bind(this);
    document.addEventListener('keydown', this._boundKeyDownHandler);
    document.addEventListener('keyup', this._boundKeyUpHandler);
  }

  /**
   * Removes the keyboard event handlers from the document.
   */
  private removeKeyboardHandlers() {
    document.removeEventListener('keydown', this._boundKeyDownHandler);
    document.removeEventListener('keyup', this._boundKeyUpHandler);
  }

  /**
   * Handles the key down event for keyboard shortcuts.
   * @param e - The keyboard event.
   */
  private handleKeyDown(e: KeyboardEvent) {
    // Handle undo/redo shortcuts
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    if (isCtrlOrCmd && e.key === 'z') {
      e.preventDefault();
      this.undo();
      return;
    }

    if (isCtrlOrCmd && e.key === 'y') {
      e.preventDefault();
      this.redo();
      return;
    }

    if (e.key === 'Escape') {
      if (
        this.modeManager.getCurrentMode() === DrawMode.PointToPoint ||
        this.modeManager.getCurrentMode() === DrawMode.PointToPointSubtract
      ) {
        this.polygonDrawManager.cancelPointToPointDrawing();
      }
    }

    // Track modifier key state for edge deletion visual feedback
    const isModifierPressed = this.isModifierKeyPressed(e);
    if (isModifierPressed && !this.isModifierKeyHeld) {
      this.isModifierKeyHeld = true;
      this.polygonDrawManager.setModifierKey(true);
      this.updateAllMarkersForEdgeDeletion(true);
    }
  }

  /**
   * Handles the key up event for keyboard shortcuts.
   * @param e - The keyboard event.
   */
  private handleKeyUp(e: KeyboardEvent) {
    // Track modifier key state for edge deletion visual feedback
    const isModifierPressed = this.isModifierKeyPressed(e);
    if (!isModifierPressed && this.isModifierKeyHeld) {
      this.isModifierKeyHeld = false;
      this.polygonDrawManager.setModifierKey(false);
      this.updateAllMarkersForEdgeDeletion(false);
    }
  }

  /**
   * Update all markers to show/hide edge deletion visual feedback
   */
  private updateAllMarkersForEdgeDeletion(showFeedback: boolean) {
    this.arrayOfFeatureGroups.forEach((featureGroup) => {
      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          this.updateMarkerForEdgeDeletion(layer, showFeedback);
        }
      });
    });
  }

  /**
   * Update individual marker for edge deletion visual feedback
   */
  private updateMarkerForEdgeDeletion(marker: L.Marker, showFeedback: boolean) {
    const element = marker.getElement();
    if (!element) return;

    if (showFeedback) {
      // Add hover listeners for edge deletion feedback
      element.addEventListener('mouseenter', this.onMarkerHoverForEdgeDeletionEvent);
      element.addEventListener('mouseleave', this.onMarkerLeaveForEdgeDeletionEvent);
    } else {
      // Remove hover listeners and reset style
      element.removeEventListener('mouseenter', this.onMarkerHoverForEdgeDeletionEvent);
      element.removeEventListener('mouseleave', this.onMarkerLeaveForEdgeDeletionEvent);
      element.style.backgroundColor = '';
      element.style.borderColor = '';
    }
  }

  /**
   * Handle marker hover when modifier key is held - event handler version
   */
  private onMarkerHoverForEdgeDeletionEvent = (e: Event) => {
    if (!this.isModifierKeyHeld) return;

    const element = e.target as HTMLElement;
    if (element) {
      element.style.backgroundColor = this.config.colors.edgeDeletion.hover;
      element.style.borderColor = this.config.colors.edgeDeletion.hover;
      element.classList.add('edge-deletion-hover');
    }
  };

  /**
   * Handle marker leave when modifier key is held - event handler version
   */
  private onMarkerLeaveForEdgeDeletionEvent = (e: Event) => {
    const element = e.target as HTMLElement;
    if (element) {
      element.style.backgroundColor = '';
      element.style.borderColor = '';
      element.classList.remove('edge-deletion-hover');
    }
  };

  /**
   * Handles the double-click event for point-to-point drawing.
   * @param e - The mouse event.
   */
  private handleDoubleClick(e: L.LeafletMouseEvent) {
    // Only handle double-click in Point-to-Point modes
    if (
      this.modeManager.getCurrentMode() !== DrawMode.PointToPoint &&
      this.modeManager.getCurrentMode() !== DrawMode.PointToPointSubtract
    ) {
      return;
    }

    L.DomEvent.stop(e);

    this.polygonDrawManager.handleDoubleClick(e);
  }

  /**
   * Detect if modifier key is pressed (Ctrl on Windows/Linux, Cmd on Mac)
   */
  private isModifierKeyPressed(event: MouseEvent | KeyboardEvent): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = userAgent.includes('mac');

    if (isMac) {
      return event.metaKey; // Cmd key on Mac
    } else {
      return event.ctrlKey; // Ctrl key on Windows/Linux
    }
  }

  /**
   * Ensures all buttons have proper touch responsiveness for Firefox Android
   * @param container - The main control container element
   */
  private ensureButtonTouchResponsiveness(container: HTMLElement): void {
    // Find all button elements (both in main container and sub-container)
    const buttons = container.querySelectorAll('a');

    buttons.forEach((button) => {
      // Ensure each button has proper touch handling properties
      button.style.pointerEvents = 'auto';
      button.style.touchAction = 'manipulation';
      button.style.position = 'relative';
      button.style.zIndex = '1';

      // Add additional touch event listeners as backup for Firefox Android
      const touchHandler = (e: Event) => {
        e.stopPropagation();
        // Ensure the button remains responsive
        (e.target as HTMLElement).style.pointerEvents = 'auto';
      };

      // Add passive touch listeners to maintain responsiveness
      button.addEventListener('touchstart', touchHandler, { passive: true });
      button.addEventListener('touchend', touchHandler, { passive: true });
    });
  }

  /**
   * Updates the visual indicator on the activate button to show if there are active polygons.
   */
  private updateActivateButtonIndicator() {
    if (typeof this.getContainer !== 'function') {
      return; // In some test environments, the container may not be available.
    }
    const container = this.getContainer();
    if (!container) return;

    const activateButton = container.querySelector('.icon-activate') as HTMLElement;
    if (!activateButton) return;

    const hasPolygons = this.arrayOfFeatureGroups.length > 0;
    const isPanelClosed = !leafletAdapter.domUtil.hasClass(activateButton, 'active');
    const iconMarkup = leafletAdapter.domUtil.hasClass(activateButton, 'active')
      ? activateButton.dataset.collapsedIcon
      : activateButton.dataset.activeIcon;

    if (iconMarkup) {
      this.applyActivateButtonIcon(activateButton, iconMarkup);
    }

    const hasIndicator = hasPolygons && isPanelClosed;
    if (hasIndicator) {
      leafletAdapter.domUtil.addClass(activateButton, 'polydraw-indicator-active');
    } else {
      leafletAdapter.domUtil.removeClass(activateButton, 'polydraw-indicator-active');
    }

    const baseBackground = this.config.colors.styles.controlButton.backgroundColor;
    const baseColor = this.config.colors.styles.controlButton.color;
    const indicatorBackground = this.config.colors.styles.indicatorActive.backgroundColor;

    activateButton.style.backgroundColor = hasIndicator ? indicatorBackground : baseBackground;
    activateButton.style.color = baseColor;
  }

  private applyActivateButtonIcon(button: HTMLElement, svgMarkup: string): void {
    button.innerHTML = svgMarkup;
    const svgElement = button.querySelector('svg');
    if (!svgElement) return;

    svgElement.setAttribute('width', '24');
    svgElement.setAttribute('height', '24');
    (svgElement as unknown as HTMLElement).style.pointerEvents = 'none';
    svgElement.querySelectorAll('*').forEach((el) => {
      (el as HTMLElement).style.pointerEvents = 'none';
    });
  }

  private warnIfUsingDeprecatedConfiguration(config?: Partial<PolydrawConfig>) {
    if (!config) {
      return;
    }

    const legacyPolygon = config.polygonCreation?.simplification;
    const simplification = config.simplification as
      | {
          simplifyTolerance?: { tolerance?: number; highQuality?: boolean };
          dynamicMode?: { fractionGuard?: number; multiplier?: number };
        }
      | undefined;

    const hasLegacySimplifyTolerance =
      !!simplification &&
      (Object.prototype.hasOwnProperty.call(simplification, 'simplifyTolerance') ||
        Object.prototype.hasOwnProperty.call(simplification, 'dynamicMode'));

    if (legacyPolygon || hasLegacySimplifyTolerance) {
      console.warn(
        '[Leaflet.Polydraw] Legacy simplification settings detected. Please migrate to `config.simplification` with `mode`, `simple`, and `dynamic` blocks.',
      );
    }

    const visualOptimization = config.markers?.visualOptimization;
    const deprecatedVisualOptimizationKeys =
      visualOptimization &&
      (visualOptimization.useAngles !== undefined ||
        visualOptimization.useBoundingBox !== undefined ||
        visualOptimization.useDistance !== undefined ||
        visualOptimization.thresholdBoundingBox !== undefined ||
        visualOptimization.thresholdDistance !== undefined ||
        visualOptimization.sharpAngleThreshold !== undefined);

    if (deprecatedVisualOptimizationKeys) {
      console.warn(
        '[Leaflet.Polydraw] `markers.visualOptimization` is deprecated. Prefer `visualOptimizationLevel` when adding predefined polygons.',
      );
    }
  }
}

// Add the polydraw method to L.control with proper typing (only for v1.x compatibility)
if (typeof L !== 'undefined' && L.control) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (L.control as any).polydraw = function (options?: PolydrawOptions): Polydraw {
    return new Polydraw(options);
  };
}

export default Polydraw;
export { leafletAdapter };
