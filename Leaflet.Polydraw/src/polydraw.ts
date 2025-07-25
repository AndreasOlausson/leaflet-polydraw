import * as L from 'leaflet';
import defaultConfig from './config.json';
import { DrawMode, MarkerPosition } from './enums';
import { TurfHelper } from './turf-helper';
import { createButtons } from './buttons';
import { PolygonInformationService } from './polygon-information.service';
import { MapStateService } from './map-state';
import { ModeManager } from './managers/mode-manager';
import { PolygonMutationManager } from './managers/polygon-mutation-manager';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import './styles/polydraw.css';

import type { PolydrawConfig, DrawModeChangeHandler } from './types/polydraw-interfaces';

class Polydraw extends L.Control {
  private map: L.Map;
  private tracer: L.Polyline = {} as L.Polyline;
  private turfHelper: TurfHelper;
  private subContainer?: HTMLElement;
  private config: PolydrawConfig;
  private mapStateService: MapStateService;
  private polygonInformation: PolygonInformationService;
  private modeManager: ModeManager;
  private polygonMutationManager: PolygonMutationManager;
  private arrayOfFeatureGroups: L.FeatureGroup[] = [];
  private p2pMarkers: L.Marker[] = [];

  private drawMode: DrawMode = DrawMode.Off;
  private drawModeListeners: DrawModeChangeHandler[] = [];
  private _boundKeyDownHandler: (e: KeyboardEvent) => void;
  private _boundKeyUpHandler: (e: KeyboardEvent) => void;
  private isModifierKeyHeld: boolean = false;

  constructor(options?: L.ControlOptions & { config?: PolydrawConfig; configPath?: string }) {
    console.log('constructor');
    super(options);

    // Initialize with default config first
    this.config = defaultConfig as PolydrawConfig;

    // If configPath is provided, load external config
    if (options?.configPath) {
      this.loadExternalConfig(options.configPath, options?.config);
    } else {
      // Apply inline config if no external config path
      this.config = { ...defaultConfig, ...(options?.config || {}) } as PolydrawConfig;
      this.initializeComponents();
    }
  }

  private async loadExternalConfig(configPath: string, inlineConfig?: PolydrawConfig) {
    try {
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(
          `Failed to load config from ${configPath}: ${response.status} ${response.statusText}`,
        );
      }

      const externalConfig = await response.json();

      // Merge configs: default < external < inline (inline has highest priority)
      this.config = {
        ...defaultConfig,
        ...externalConfig,
        ...(inlineConfig || {}),
      } as PolydrawConfig;

      this.initializeComponents();
    } catch (error) {
      console.warn(
        'Failed to load external config, falling back to default + inline config:',
        error,
      );
      // Fallback to default + inline config if external loading fails
      this.config = { ...defaultConfig, ...(inlineConfig || {}) } as PolydrawConfig;
      this.initializeComponents();
    }
  }

  private initializeComponents() {
    this.turfHelper = new TurfHelper(this.config);
    this.mapStateService = new MapStateService();
    this.polygonInformation = new PolygonInformationService(this.mapStateService);
    this.modeManager = new ModeManager(this.config);
    this.polygonInformation.onPolygonInfoUpdated((_k) => {
      // This is the perfect central place to keep the indicator in sync.
      this.updateActivateButtonIndicator();
    });
    this._boundKeyDownHandler = this.handleKeyDown.bind(this);

    // Initialize PolygonMutationManager - will be properly set up in onAdd when map is available
    this.polygonMutationManager = null as any;
  }

  onAdd(_map: L.Map): HTMLElement {
    console.log('onAdd');
    this.map = _map;
    const style = document.createElement('style');
    style.innerHTML = `
      .leaflet-control a { background-color: #fff; color: #000; display: flex; align-items: center; justify-content: center; }
      .leaflet-control a:hover { background-color: #f4f4f4; }
      .leaflet-control a.active { background-color:rgb(128, 218, 255); color: #fff; }
      .polydraw-indicator-active { background-color: #ffcc00 !important; }
      .crosshair-cursor-enabled { cursor: crosshair !important; }
      .crosshair-cursor-enabled * { cursor: crosshair !important; }
      .leaflet-polydraw-p2p-marker { background-color: #fff; border: 2px solid #50622b; border-radius: 50%; box-sizing: border-box; }
      .leaflet-polydraw-p2p-first-marker { position: relative; }
      .leaflet-polydraw-p2p-first-marker:hover { transform: scale(1.5); transition: all 0.2s ease; }
    `;
    document.head.appendChild(style);

    // Add ESC key handler for Point-to-Point mode
    this.setupKeyboardHandlers();

    const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
    container.style.display = 'flex';
    container.style.flexDirection = 'column-reverse';

    this.subContainer = L.DomUtil.create('div', 'sub-buttons', container);
    this.subContainer.style.maxHeight = '0px';
    this.subContainer.style.overflow = 'hidden';
    this.subContainer.style.transition = 'max-height 0.3s ease';

    const onActivateToggle = () => {
      const activate = container.querySelector('.icon-activate') as HTMLElement;
      if (L.DomUtil.hasClass(activate, 'active')) {
        L.DomUtil.removeClass(activate, 'active');
        if (this.subContainer) {
          this.subContainer.style.maxHeight = '0px';
        }
      } else {
        L.DomUtil.addClass(activate, 'active');
        if (this.subContainer) {
          this.subContainer.style.maxHeight = '250px';
        }
      }
      // Update the indicator state whenever the panel is toggled
      this.updateActivateButtonIndicator();
    };

    const onDrawClick = (e?: Event) => {
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

    const onSubtractClick = (e?: Event) => {
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

    const onEraseClick = (e?: Event) => {
      console.log('onEraseClick called');
      // Prevent multiple rapid clicks
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      console.log('Current feature groups count:', this.arrayOfFeatureGroups.length);

      // Only erase if there are polygons to erase
      if (this.arrayOfFeatureGroups.length === 0) {
        console.log('No polygons to erase');
        return;
      }

      console.log('Calling removeAllFeatureGroups');
      this.removeAllFeatureGroups();
    };

    const onPointToPointClick = (e?: Event) => {
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

    createButtons(
      container,
      this.subContainer,
      this.config,
      onActivateToggle,
      onDrawClick,
      onSubtractClick,
      onEraseClick,
      onPointToPointClick,
    );

    // Simple UI update listener
    const uiUpdateListener = (mode: DrawMode) => {
      const drawButton = container.querySelector('.icon-draw') as HTMLElement;
      const subtractButton = container.querySelector('.icon-subtract') as HTMLElement;
      if (drawButton) drawButton.classList.toggle('active', mode === DrawMode.Add);
      if (subtractButton) subtractButton.classList.toggle('active', mode === DrawMode.Subtract);
    };

    this.drawModeListeners.push(uiUpdateListener);

    this.tracer = L.polyline([], this.config.polyLineOptions);
    try {
      this.tracer.addTo(this.map);
    } catch (error) {
      // Silently handle tracer initialization in test environment
    }

    // Initialize PolygonMutationManager now that map is available
    this.polygonMutationManager = new PolygonMutationManager({
      turfHelper: this.turfHelper,
      polygonInformation: this.polygonInformation,
      map: this.map,
      config: this.config,
      modeManager: this.modeManager,
      getFeatureGroups: () => this.arrayOfFeatureGroups,
    });

    // Listen for polygon operation completion events to reset draw mode
    this.polygonMutationManager.on('polygonOperationComplete', (data) => {
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
        L.DomUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
      } else {
        L.DomUtil.removeClass(this.map.getContainer(), 'crosshair-cursor-enabled');
      }

      // Update events and map interactions
      this.events(false); // Turn off drawing events
      this.setLeafletMapEvents(mapDragEnabled, mapDoubleClickEnabled, mapZoomEnabled);

      // Reset tracer style
      try {
        this.tracer.setStyle({ color: '' });
      } catch (error) {
        // Handle case where tracer renderer is not initialized
      }
    });

    // Listen for polygon deletion events to update the activate button indicator
    this.polygonMutationManager.on('polygonDeleted', () => {
      this.updateActivateButtonIndicator();
    });

    return container;
  }

  public addTo(map: L.Map): this {
    console.log('addTo');
    super.addTo(map);
    return this;
  }

  public getFeatureGroups(): L.FeatureGroup[] {
    return this.arrayOfFeatureGroups;
  }

  onRemove(_map: L.Map) {
    console.log('onRemove');
    this.removeKeyboardHandlers();
    if (this.tracer) {
      this.map.removeLayer(this.tracer);
    }
    this.removeAllFeatureGroups();
  }

  public async addPredefinedPolygon(
    geographicBorders: L.LatLng[][][],
    options?: { visualOptimizationLevel?: number },
  ): Promise<void> {
    console.log('addPredefinedPolygon');
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

  setDrawMode(mode: DrawMode) {
    console.log('setDrawMode');
    const previousMode = this.drawMode;
    this.drawMode = mode;

    // Update interaction state manager
    this.modeManager.updateStateForMode(mode);

    this.emitDrawModeChanged();

    // Update marker draggable state when mode changes
    this.updateMarkerDraggableState();

    // Only stop draw if we're switching away from PointToPoint mode or going to Off mode
    // Don't reset tracer when entering PointToPoint mode
    if (previousMode === DrawMode.PointToPoint && mode !== DrawMode.PointToPoint) {
      // Clear P2P markers when leaving PointToPoint mode
      this.clearP2pMarkers();
      this.stopDraw();
    } else if (mode === DrawMode.Off) {
      this.stopDraw();
    } else if (mode !== DrawMode.PointToPoint) {
      this.stopDraw();
    }

    if (this.map) {
      // Use interaction state manager for UI updates
      const shouldShowCrosshair = this.modeManager.shouldShowCrosshairCursor();
      const mapDragEnabled = this.modeManager.canPerformAction('mapDrag');
      const mapZoomEnabled = this.modeManager.canPerformAction('mapZoom');
      const mapDoubleClickEnabled = this.modeManager.canPerformAction('mapDoubleClickZoom');

      // Update cursor
      if (shouldShowCrosshair) {
        L.DomUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
      } else {
        L.DomUtil.removeClass(this.map.getContainer(), 'crosshair-cursor-enabled');
      }

      // Update events
      this.events(mode !== DrawMode.Off);

      // Update tracer style based on mode
      try {
        switch (mode) {
          case DrawMode.Off:
            this.tracer.setStyle({ color: '' });
            break;
          case DrawMode.Add:
            this.tracer.setStyle({
              color: defaultConfig.polyLineOptions.color,
              dashArray: null, // Reset to solid line
            });
            break;
          case DrawMode.Subtract:
            this.tracer.setStyle({
              color: '#D9460F',
              dashArray: null, // Reset to solid line
            });
            break;
          case DrawMode.PointToPoint:
            this.tracer.setStyle({
              color: defaultConfig.polyLineOptions.color,
              dashArray: '5, 5',
            });
            break;
        }
      } catch (error) {
        // Handle case where tracer renderer is not initialized
      }

      // Update map interactions based on state manager
      this.setLeafletMapEvents(mapDragEnabled, mapDoubleClickEnabled, mapZoomEnabled);
    }
  }

  getDrawMode(): DrawMode {
    console.log('getDrawMode');
    return this.modeManager.getCurrentMode();
  }

  public onDrawModeChangeListener(callback: DrawModeChangeHandler): void {
    console.log('onDrawModeChangeListener');
    this.drawModeListeners.push(callback);
  }

  public offDrawModeChangeListener(callback: DrawModeChangeHandler): void {
    console.log('offDrawModeChangeListener');
    const index = this.drawModeListeners.indexOf(callback);
    if (index > -1) {
      this.drawModeListeners.splice(index, 1);
    }
  }

  private emitDrawModeChanged(): void {
    console.log('emitDrawModeChanged');
    for (const cb of this.drawModeListeners) {
      cb(this.modeManager.getCurrentMode());
    }
  }

  /**
   * Update the draggable state of all existing markers when draw mode changes
   */
  private updateMarkerDraggableState(): void {
    console.log('updateMarkerDraggableState');
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

  removeAllFeatureGroups() {
    console.log('removeAllFeatureGroups');
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

  private stopDraw() {
    console.log('stopDraw');
    this.resetTracker();
    this.drawStartedEvents(false);
  }

  private setLeafletMapEvents(
    enableDragging: boolean,
    enableDoubleClickZoom: boolean,
    enableScrollWheelZoom: boolean,
  ) {
    console.log('setLeafletMapEvents');
    enableDragging ? this.map.dragging.enable() : this.map.dragging.disable();
    enableDoubleClickZoom ? this.map.doubleClickZoom.enable() : this.map.doubleClickZoom.disable();
    enableScrollWheelZoom ? this.map.scrollWheelZoom.enable() : this.map.scrollWheelZoom.disable();
  }

  private resetTracker() {
    console.log('resetTracker');
    this.tracer.setLatLngs([]);
  }

  private drawStartedEvents(onoff: boolean) {
    console.log('drawStartedEvents');
    const onoroff = onoff ? 'on' : 'off';
    this.map[onoroff]('mousemove', this.mouseMove, this);
    this.map[onoroff]('mouseup', this.mouseUpLeave, this);

    if (onoff) {
      try {
        this.map.getContainer().addEventListener('touchmove', (e) => this.mouseMove(e));
        this.map.getContainer().addEventListener('touchend', (e) => this.mouseUpLeave(e));
      } catch (error) {
        // Silently handle DOM errors
      }
    } else {
      try {
        this.map.getContainer().removeEventListener('touchmove', (e) => this.mouseMove(e), true);
        this.map.getContainer().removeEventListener('touchend', (e) => this.mouseUpLeave(e), true);
      } catch (error) {
        // Silently handle DOM errors
      }
    }
  }

  private mouseMove(event: L.LeafletMouseEvent | TouchEvent) {
    console.log('mouseMove');
    if ('latlng' in event && event.latlng) {
      this.tracer.addLatLng(event.latlng);
    } else if ('touches' in event && event.touches && event.touches.length > 0) {
      const latlng = this.map.containerPointToLatLng([
        event.touches[0].clientX,
        event.touches[0].clientY,
      ]);
      this.tracer.addLatLng(latlng);
    }
  }

  private async mouseUpLeave(event: any) {
    console.log('mouseUpLeave');
    this.polygonInformation.deletePolygonInformationStorage();

    // Get tracer coordinates and validate before processing
    const tracerGeoJSON = this.tracer.toGeoJSON() as any;

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

  private events(onoff: boolean) {
    console.log('events');
    const onoroff = onoff ? 'on' : 'off';
    this.map[onoroff]('mousedown', this.mouseDown, this);

    // Add double-click event for Point-to-Point mode
    this.map[onoroff]('dblclick', this.handleDoubleClick, this);

    if (onoff) {
      try {
        this.map.getContainer().addEventListener('touchstart', (e) => this.mouseDown(e));
      } catch (error) {
        // Silently handle DOM errors
      }
    } else {
      try {
        this.map.getContainer().removeEventListener('touchstart', (e) => this.mouseDown(e), true);
      } catch (error) {
        // Silently handle DOM errors
      }
    }
  }

  private mouseDown(event: L.LeafletMouseEvent | TouchEvent) {
    console.log('mouseDown');
    // Check if we're still in a drawing mode before processing
    if (this.modeManager.isInOffMode()) {
      return;
    }

    let clickLatLng;
    if ('latlng' in event && event.latlng) {
      clickLatLng = event.latlng;
    } else if ('touches' in event && event.touches && event.touches.length > 0) {
      clickLatLng = this.map.containerPointToLatLng([
        event.touches[0].clientX,
        event.touches[0].clientY,
      ]);
    }

    if (!clickLatLng) {
      return;
    }

    // Handle Point-to-Point mode differently
    if (this.modeManager.getCurrentMode() === DrawMode.PointToPoint) {
      this.handlePointToPointClick(clickLatLng);
      return;
    }

    // Handle normal drawing modes (Add, Subtract)
    this.tracer.setLatLngs([clickLatLng]);
    this.startDraw();
  }

  private startDraw() {
    console.log('startDraw');
    this.drawStartedEvents(true);
  }

  private setupKeyboardHandlers() {
    console.log('setupKeyboardHandlers');
    this._boundKeyUpHandler = this.handleKeyUp.bind(this);
    document.addEventListener('keydown', this._boundKeyDownHandler);
    document.addEventListener('keyup', this._boundKeyUpHandler);
  }

  private removeKeyboardHandlers() {
    console.log('removeKeyboardHandlers');
    document.removeEventListener('keydown', this._boundKeyDownHandler);
    document.removeEventListener('keyup', this._boundKeyUpHandler);
  }

  private handleKeyDown(e: KeyboardEvent) {
    console.log('handleKeyDown');
    if (e.key === 'Escape') {
      if (this.modeManager.getCurrentMode() === DrawMode.PointToPoint) {
        this.cancelPointToPointDrawing();
      }
    }

    // Track modifier key state for edge deletion visual feedback
    const isModifierPressed = this.isModifierKeyPressed(e as any);
    if (isModifierPressed && !this.isModifierKeyHeld) {
      this.isModifierKeyHeld = true;
      this.updateAllMarkersForEdgeDeletion(true);
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    console.log('handleKeyUp');
    // Track modifier key state for edge deletion visual feedback
    const isModifierPressed = this.isModifierKeyPressed(e as any);
    if (!isModifierPressed && this.isModifierKeyHeld) {
      this.isModifierKeyHeld = false;
      this.updateAllMarkersForEdgeDeletion(false);
    }
  }

  /**
   * Update all markers to show/hide edge deletion visual feedback
   */
  private updateAllMarkersForEdgeDeletion(showFeedback: boolean) {
    console.log('updateAllMarkersForEdgeDeletion');
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
    console.log('updateMarkerForEdgeDeletion');
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
    console.log('onMarkerHoverForEdgeDeletionEvent');
    if (!this.isModifierKeyHeld) return;

    const element = e.target as HTMLElement;
    if (element) {
      element.style.backgroundColor = '#D9460F'; // Reddish color
      element.style.borderColor = '#D9460F';
      element.classList.add('edge-deletion-hover');
    }
  };

  /**
   * Handle marker leave when modifier key is held - event handler version
   */
  private onMarkerLeaveForEdgeDeletionEvent = (e: Event) => {
    console.log('onMarkerLeaveForEdgeDeletionEvent');
    const element = e.target as HTMLElement;
    if (element) {
      element.style.backgroundColor = '';
      element.style.borderColor = '';
      element.classList.remove('edge-deletion-hover');
    }
  };

  private cancelPointToPointDrawing() {
    console.log('cancelPointToPointDrawing');
    this.clearP2pMarkers();
    this.stopDraw();
    this.setDrawMode(DrawMode.Off);
  }

  // Point-to-Point state management
  private handlePointToPointClick(clickLatLng: L.LatLng) {
    console.log('handlePointToPointClick');
    console.log('=== P2P CLICK DEBUG ===');
    console.log('Click coordinates:', {
      lat: clickLatLng.lat,
      lng: clickLatLng.lng,
      precision: {
        lat: clickLatLng.lat.toFixed(10),
        lng: clickLatLng.lng.toFixed(10),
      },
    });

    if (!clickLatLng) {
      console.log('No clickLatLng provided, returning');
      return;
    }

    const currentPoints = this.tracer.getLatLngs() as L.LatLng[];
    console.log('Current points count:', currentPoints.length);
    console.log(
      'Current points:',
      currentPoints.map((p, i) => ({
        index: i,
        lat: p.lat,
        lng: p.lng,
        precision: {
          lat: p.lat.toFixed(10),
          lng: p.lng.toFixed(10),
        },
      })),
    );

    console.log('P2P markers count:', this.p2pMarkers.length);
    console.log('Map zoom level:', this.map.getZoom());
    console.log('Map center:', this.map.getCenter());

    // Check if clicking on the first point to close the polygon
    if (currentPoints.length >= 3 && this.p2pMarkers.length > 0) {
      const firstPoint = this.p2pMarkers[0].getLatLng();
      const isClickingFirst = this.isClickingFirstPoint(clickLatLng, firstPoint);
      console.log('Checking first point click:', {
        firstPoint: {
          lat: firstPoint.lat,
          lng: firstPoint.lng,
          precision: {
            lat: firstPoint.lat.toFixed(10),
            lng: firstPoint.lng.toFixed(10),
          },
        },
        distance: {
          lat: Math.abs(clickLatLng.lat - firstPoint.lat),
          lng: Math.abs(clickLatLng.lng - firstPoint.lng),
        },
        isClickingFirst: isClickingFirst,
      });

      if (isClickingFirst) {
        console.log('Completing polygon by clicking first point');
        this.completePointToPointPolygon();
        return;
      }
    }

    // Add point to tracer - use addLatLng to ensure points accumulate
    console.log('Adding new point to tracer');
    this.tracer.addLatLng(clickLatLng);

    // Add a visual marker for the new point
    try {
      const isFirstMarker = this.p2pMarkers.length === 0;
      const markerClassName = isFirstMarker
        ? 'leaflet-polydraw-p2p-marker leaflet-polydraw-p2p-first-marker'
        : 'leaflet-polydraw-p2p-marker';

      const pointMarker = new L.Marker(clickLatLng, {
        icon: L.divIcon({
          className: markerClassName,
          iconSize: isFirstMarker ? [20, 20] : [10, 10],
        }),
      }).addTo(this.map);

      // Stop propagation on mousedown for all p2p markers to prevent adding new points on top of them
      pointMarker.on('mousedown', (e) => {
        L.DomEvent.stopPropagation(e);
      });

      // Add hover effects and click handler for the first marker when there are enough points to close
      if (isFirstMarker) {
        pointMarker.on('mouseover', () => {
          if (this.tracer.getLatLngs().length >= 3) {
            const element = pointMarker.getElement();
            if (element) {
              element.style.backgroundColor = '#4CAF50';
              element.style.borderColor = '#4CAF50';
              element.style.cursor = 'pointer';
              element.title = 'Click to close polygon';
            }
          }
        });

        pointMarker.on('mouseout', () => {
          const element = pointMarker.getElement();
          if (element) {
            element.style.backgroundColor = '';
            element.style.borderColor = '';
            element.style.cursor = '';
            element.title = '';
          }
        });

        // Add click handler to complete polygon when clicking first marker
        pointMarker.on('click', (e) => {
          if (this.tracer.getLatLngs().length >= 3) {
            L.DomEvent.stopPropagation(e);
            this.completePointToPointPolygon();
          }
        });
      }

      this.p2pMarkers.push(pointMarker);
    } catch (error) {
      // Handle marker creation errors in test environment
    }

    // Update visual style to show dashed line
    if (this.tracer.getLatLngs().length >= 2) {
      try {
        this.tracer.setStyle({
          color: defaultConfig.polyLineOptions.color,
          dashArray: '5, 5',
        });
      } catch (error) {
        // Handle tracer style errors in test environment
      }
    }
  }

  private isClickingFirstPoint(clickLatLng: L.LatLng, firstPoint: L.LatLng): boolean {
    console.log('isClickingFirstPoint');
    if (!firstPoint) return false;

    // Use zoom-dependent tolerance - higher zoom = smaller tolerance
    const zoom = this.map.getZoom();
    // Base tolerance at zoom 10, scale down exponentially for higher zooms
    const baseTolerance = 0.0005;
    const tolerance = baseTolerance / Math.pow(2, Math.max(0, zoom - 10));

    console.log('First point click tolerance check:', {
      zoom: zoom,
      baseTolerance: baseTolerance,
      calculatedTolerance: tolerance,
      clickLatLng: {
        lat: clickLatLng.lat.toFixed(10),
        lng: clickLatLng.lng.toFixed(10),
      },
      firstPoint: {
        lat: firstPoint.lat.toFixed(10),
        lng: firstPoint.lng.toFixed(10),
      },
      distances: {
        lat: Math.abs(clickLatLng.lat - firstPoint.lat),
        lng: Math.abs(clickLatLng.lng - firstPoint.lng),
      },
    });

    const latDiff = Math.abs(clickLatLng.lat - firstPoint.lat);
    const lngDiff = Math.abs(clickLatLng.lng - firstPoint.lng);
    const isClicking = latDiff < tolerance && lngDiff < tolerance;

    console.log('First point click result:', {
      tolerance: tolerance,
      latDiff: latDiff,
      lngDiff: lngDiff,
      isClicking: isClicking,
    });

    return isClicking;
  }

  private handleDoubleClick(e: L.LeafletMouseEvent) {
    console.log('handleDoubleClick');
    // Only handle double-click in Point-to-Point mode
    if (this.modeManager.getCurrentMode() !== DrawMode.PointToPoint) {
      return;
    }

    const currentPoints = this.tracer.getLatLngs() as L.LatLng[];

    // Need at least 3 points to complete a polygon
    if (currentPoints.length >= 3) {
      this.completePointToPointPolygon();
    }
  }

  private completePointToPointPolygon() {
    console.log('completePointToPointPolygon');
    const points = this.tracer.getLatLngs() as L.LatLng[];
    if (points.length < 3) {
      return; // Need at least 3 points
    }

    console.log('=== P2P COMPLETION DEBUG ===');
    console.log(
      'Original points from tracer:',
      points.map((p, i) => ({
        index: i,
        lat: p.lat.toFixed(10),
        lng: p.lng.toFixed(10),
      })),
    );

    // Close the polygon by adding first point at the end if not already closed
    const closedPoints = [...points];
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    if (firstPoint.lat !== lastPoint.lat || firstPoint.lng !== lastPoint.lng) {
      closedPoints.push(firstPoint);
    }

    console.log(
      'Closed points:',
      closedPoints.map((p, i) => ({
        index: i,
        lat: p.lat.toFixed(10),
        lng: p.lng.toFixed(10),
      })),
    );

    // Convert to GeoJSON and create polygon directly (bypass createPolygonFromTrace for P2P)
    try {
      // Create coordinates array directly from points
      const coordinates = closedPoints.map((point) => [point.lng, point.lat] as [number, number]);
      const geoPos = this.turfHelper.getMultiPolygon([[coordinates]]);

      console.log(
        'Direct polygon creation (bypassing createPolygonFromTrace):',
        geoPos.geometry.coordinates[0].map((coord, i) => ({
          index: i,
          lng: typeof coord[0] === 'number' ? coord[0].toFixed(10) : coord[0],
          lat: typeof coord[1] === 'number' ? coord[1].toFixed(10) : coord[1],
        })),
      );

      // Clear P2P markers and stop drawing first
      this.clearP2pMarkers();
      this.stopDraw();

      // Add polygon (disable simplification for P2P - every click is intentional)
      // Allow merging for P2P polygons so they merge with existing polygons
      this.polygonMutationManager.addPolygon(geoPos, { simplify: false, noMerge: false });

      // Update polygon information
      this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
    } catch (error) {
      console.warn('Error completing point-to-point polygon:', error);
      this.clearP2pMarkers();
      this.stopDraw();
    }
  }

  private clearP2pMarkers() {
    console.log('clearP2pMarkers');
    this.p2pMarkers.forEach((marker) => this.map.removeLayer(marker));
    this.p2pMarkers = [];
  }

  /**
   * Detect if modifier key is pressed (Ctrl on Windows/Linux, Cmd on Mac)
   */
  private isModifierKeyPressed(event: MouseEvent): boolean {
    console.log('isModifierKeyPressed');
    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = userAgent.includes('mac');

    if (isMac) {
      return event.metaKey; // Cmd key on Mac
    } else {
      return event.ctrlKey; // Ctrl key on Windows/Linux
    }
  }

  private updateActivateButtonIndicator() {
    if (typeof this.getContainer !== 'function') {
      return; // In some test environments, the container may not be available.
    }
    const container = this.getContainer();
    if (!container) return;

    const activateButton = container.querySelector('.icon-activate') as HTMLElement;
    if (!activateButton) return;

    const hasPolygons = this.arrayOfFeatureGroups.length > 0;
    const isPanelClosed = !L.DomUtil.hasClass(activateButton, 'active');

    if (hasPolygons && isPanelClosed) {
      L.DomUtil.addClass(activateButton, 'polydraw-indicator-active');
    } else {
      L.DomUtil.removeClass(activateButton, 'polydraw-indicator-active');
    }
  }
}

// Add the polydraw method to L.control with proper typing
(L.control as any).polydraw = function (
  options?: L.ControlOptions & { config?: PolydrawConfig; configPath?: string },
): Polydraw {
  return new Polydraw(options);
};

export default Polydraw;
