import { drawMode, type DrawMode } from '../enums';
import type { PolydrawConfig } from '../types/polydraw-interfaces';
import { EventManager } from './event-manager';

/**
 * Represents the current state of all user interactions in Polydraw
 */
export interface InteractionState {
  // Core interactions
  polygonDragging: boolean;
  markerDragging: boolean;
  edgeClicking: boolean;
  polygonClicking: boolean;

  // Drawing capabilities
  canStartDrawing: boolean;
  canCompletePolygon: boolean;

  // UI interactions
  mapDragging: boolean;
  mapZooming: boolean;
  mapDoubleClickZoom: boolean;

  // Mode-specific states
  currentMode: DrawMode;
  isDrawingActive: boolean;
  isModifierKeyHeld: boolean;

  // Visual feedback
  showCrosshairCursor: boolean;
  showDragCursor: boolean;
}

/**
 * Centralized manager for all interaction states in Polydraw.
 * Acts as a single source of truth for what interactions are enabled/disabled.
 */
export class ModeManager {
  private state: InteractionState;
  private config: PolydrawConfig;
  private eventManager: EventManager;

  constructor(config: PolydrawConfig, eventManager: EventManager) {
    this.config = config;
    this.eventManager = eventManager;
    this.state = this.createInitialState();
  }

  /**
   * Create the initial interaction state
   */
  private createInitialState(): InteractionState {
    return {
      // Core interactions - initially enabled based on config
      polygonDragging: this.config.modes.dragPolygons ?? false,
      markerDragging: this.config.modes.dragElbow ?? false,
      edgeClicking: true, // Generally always available when not drawing
      polygonClicking: true,

      // Drawing capabilities
      canStartDrawing: true,
      canCompletePolygon: false,

      // UI interactions - initially enabled
      mapDragging: true,
      mapZooming: true,
      mapDoubleClickZoom: true,

      // Mode-specific states
      currentMode: drawMode.Off,
      isDrawingActive: false,
      isModifierKeyHeld: false,

      // Visual feedback
      showCrosshairCursor: false,
      showDragCursor: false,
    };
  }

  /**
   * Update the interaction state when the draw mode changes
   */
  updateStateForMode(mode: DrawMode): void {
    this.state.currentMode = mode;

    switch (mode) {
      case drawMode.Off:
        this.setOffModeState();
        break;
      case drawMode.Add:
        this.setDrawingModeState();
        break;
      case drawMode.Subtract:
        this.setDrawingModeState();
        break;
      case drawMode.PointToPoint:
        this.setPointToPointModeState();
        break;
    }

    // Update drawing active state
    this.state.isDrawingActive = mode !== drawMode.Off;

    this.eventManager.emit('polydraw:mode:change', { mode });
  }

  /**
   * Set interaction state for Off mode (normal editing)
   */
  private setOffModeState(): void {
    // Enable all polygon interactions
    this.state.polygonDragging = this.config.modes.dragPolygons ?? false;
    this.state.markerDragging = this.config.modes.dragElbow ?? false;
    this.state.edgeClicking = true;
    this.state.polygonClicking = true;

    // Enable drawing capabilities
    this.state.canStartDrawing = true;
    this.state.canCompletePolygon = false;

    // Enable map interactions
    this.state.mapDragging = true;
    this.state.mapZooming = true;
    this.state.mapDoubleClickZoom = true;

    // Visual feedback
    this.state.showCrosshairCursor = false;
    this.state.showDragCursor = false;
  }

  /**
   * Set interaction state for drawing modes (Add, Subtract)
   */
  private setDrawingModeState(): void {
    // Disable all polygon interactions during drawing
    this.state.polygonDragging = false;
    this.state.markerDragging = false;
    this.state.edgeClicking = false;
    this.state.polygonClicking = false;

    // Enable drawing capabilities
    this.state.canStartDrawing = true;
    this.state.canCompletePolygon = true;

    // Disable map interactions to prevent conflicts
    this.state.mapDragging = false;
    this.state.mapZooming = false;
    this.state.mapDoubleClickZoom = false;

    // Visual feedback
    this.state.showCrosshairCursor = true;
    this.state.showDragCursor = false;
  }

  /**
   * Set interaction state for Point-to-Point mode
   */
  private setPointToPointModeState(): void {
    // Disable polygon interactions during P2P drawing
    this.state.polygonDragging = false;
    this.state.markerDragging = false;
    this.state.edgeClicking = false;
    this.state.polygonClicking = false;

    // Enable P2P specific capabilities
    this.state.canStartDrawing = true;
    this.state.canCompletePolygon = true;

    // Disable map interactions
    this.state.mapDragging = false;
    this.state.mapZooming = false;
    this.state.mapDoubleClickZoom = false;

    // Visual feedback
    this.state.showCrosshairCursor = true;
    this.state.showDragCursor = false;
  }

  /**
   * Update modifier key state
   */
  setModifierKeyState(isHeld: boolean): void {
    this.state.isModifierKeyHeld = isHeld;

    // Modifier key can affect certain interactions even in Off mode
    if (this.state.currentMode === drawMode.Off && isHeld) {
      // When modifier is held, we might want to change interaction behavior
      // For example, edge deletion mode
    }
  }

  /**
   * Check if a specific action is currently allowed
   */
  canPerformAction(action: InteractionAction): boolean {
    switch (action) {
      case 'polygonDrag':
        return this.state.polygonDragging;
      case 'markerDrag':
        return this.state.markerDragging;
      case 'edgeClick':
        return this.state.edgeClicking;
      case 'polygonClick':
        return this.state.polygonClicking;
      case 'startDrawing':
        return this.state.canStartDrawing;
      case 'completePolygon':
        return this.state.canCompletePolygon;
      case 'mapDrag':
        return this.state.mapDragging;
      case 'mapZoom':
        return this.state.mapZooming;
      case 'mapDoubleClickZoom':
        return this.state.mapDoubleClickZoom;
      default:
        return false;
    }
  }

  /**
   * Check if any drawing mode is active
   */
  isInDrawingMode(): boolean {
    return this.state.isDrawingActive;
  }

  /**
   * Check if currently in Off mode (normal editing)
   */
  isInOffMode(): boolean {
    return this.state.currentMode === drawMode.Off;
  }

  /**
   * Get the current draw mode
   */
  getCurrentMode(): DrawMode {
    return this.state.currentMode;
  }

  /**
   * Get read-only access to the current state
   */
  getState(): Readonly<InteractionState> {
    return { ...this.state };
  }

  /**
   * Check if crosshair cursor should be shown
   */
  shouldShowCrosshairCursor(): boolean {
    return this.state.showCrosshairCursor;
  }

  /**
   * Check if drag cursor should be shown
   */
  shouldShowDragCursor(): boolean {
    return this.state.showDragCursor;
  }

  /**
   * Update configuration and recalculate state
   */
  updateConfig(config: PolydrawConfig): void {
    this.config = config;
    // Recalculate state based on new config
    this.updateStateForMode(this.state.currentMode);
  }
}

/**
 * All possible interaction actions that can be checked
 */
export type InteractionAction =
  | 'polygonDrag'
  | 'markerDrag'
  | 'edgeClick'
  | 'polygonClick'
  | 'startDrawing'
  | 'completePolygon'
  | 'mapDrag'
  | 'mapZoom'
  | 'mapDoubleClickZoom';
