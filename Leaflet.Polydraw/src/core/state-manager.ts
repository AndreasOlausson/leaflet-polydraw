/**
 * PolydrawStateManager - Centralized state management for Polydraw
 *
 * This class manages all state for the Polydraw control, providing a single source of truth
 * and ensuring consistent state transitions across all components.
 */

import { DrawMode } from '../enums';
import type {
  ILatLng,
  PolydrawPolygon,
  PolydrawFeatureGroup,
  DrawModeChangeHandler,
} from '../types/polydraw-interfaces';

export interface DragState {
  startPosition: ILatLng | null;
  isDragging: boolean;
  currentPolygon: PolydrawPolygon | null;
  isModifierKeyHeld: boolean;
  modifierDragMode: boolean;
}

export interface PolygonState {
  hasKinks: boolean;
}

export class PolydrawStateManager {
  // Feature Groups State
  private featureGroups: PolydrawFeatureGroup[] = [];

  // Drawing State
  private drawMode: DrawMode = DrawMode.Off;
  private polygonState: PolygonState = {
    hasKinks: false,
  };

  // Drag State
  private dragState: DragState = {
    startPosition: null,
    isDragging: false,
    currentPolygon: null,
    isModifierKeyHeld: false,
    modifierDragMode: false,
  };

  // Event Listeners
  private drawModeListeners: DrawModeChangeHandler[] = [];

  // ===== FEATURE GROUPS MANAGEMENT =====

  /**
   * Get all feature groups
   */
  getFeatureGroups(): PolydrawFeatureGroup[] {
    return [...this.featureGroups]; // Return copy to prevent external mutation
  }

  /**
   * Add a feature group to the collection
   */
  addFeatureGroup(featureGroup: PolydrawFeatureGroup): void {
    this.featureGroups.push(featureGroup);
    // TODO: Emit featureGroupsChanged event
  }

  /**
   * Remove a specific feature group
   */
  removeFeatureGroup(featureGroup: PolydrawFeatureGroup): void {
    const index = this.featureGroups.indexOf(featureGroup);
    if (index > -1) {
      this.featureGroups.splice(index, 1);
      // TODO: Emit featureGroupsChanged event
    }
  }

  /**
   * Clear all feature groups
   */
  clearAllFeatureGroups(): void {
    this.featureGroups = [];
    // TODO: Emit featureGroupsChanged event
  }

  /**
   * Get the count of feature groups
   */
  getFeatureGroupCount(): number {
    return this.featureGroups.length;
  }

  // ===== DRAW MODE MANAGEMENT =====

  /**
   * Set the current draw mode
   */
  setDrawMode(mode: DrawMode): void {
    if (this.dragState.isDragging && mode !== DrawMode.Off) {
      console.warn('Cannot change draw mode while dragging');
      return;
    }

    const previousMode = this.drawMode;
    this.drawMode = mode;

    if (previousMode !== mode) {
      this.emitDrawModeChange(mode);
    }
  }

  /**
   * Get the current draw mode
   */
  getDrawMode(): DrawMode {
    return this.drawMode;
  }

  /**
   * Check if currently in drawing mode
   */
  isDrawing(): boolean {
    return this.drawMode === DrawMode.Add || this.drawMode === DrawMode.Subtract;
  }

  // ===== POLYGON STATE MANAGEMENT =====

  /**
   * Set whether the current polygon has kinks
   */
  setPolygonHasKinks(hasKinks: boolean): void {
    this.polygonState.hasKinks = hasKinks;
  }

  /**
   * Get whether the current polygon has kinks
   */
  getPolygonHasKinks(): boolean {
    return this.polygonState.hasKinks;
  }

  // ===== DRAG STATE MANAGEMENT =====

  /**
   * Start a drag operation
   */
  startDrag(polygon: PolydrawPolygon, position: ILatLng): void {
    this.dragState = {
      startPosition: position,
      isDragging: true,
      currentPolygon: polygon,
      isModifierKeyHeld: this.dragState.isModifierKeyHeld, // Preserve modifier state
      modifierDragMode: this.dragState.isModifierKeyHeld, // Set based on current modifier
    };
    // TODO: Emit dragStateChanged event
  }

  /**
   * Update drag position
   */
  updateDragPosition(position: ILatLng): void {
    if (this.dragState.isDragging) {
      this.dragState.startPosition = position;
      // TODO: Emit dragPositionChanged event
    }
  }

  /**
   * End the current drag operation
   */
  endDrag(): void {
    this.dragState = {
      startPosition: null,
      isDragging: false,
      currentPolygon: null,
      isModifierKeyHeld: this.dragState.isModifierKeyHeld, // Preserve modifier state
      modifierDragMode: false,
    };
    // TODO: Emit dragStateChanged event
  }

  /**
   * Set modifier key state
   */
  setModifierKeyState(isHeld: boolean): void {
    this.dragState.isModifierKeyHeld = isHeld;

    // Update modifier drag mode if currently dragging
    if (this.dragState.isDragging) {
      this.dragState.modifierDragMode = isHeld;
    }
    // TODO: Emit modifierKeyChanged event
  }

  /**
   * Get current drag state
   */
  getDragState(): Readonly<DragState> {
    return { ...this.dragState }; // Return copy to prevent external mutation
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.dragState.isDragging;
  }

  /**
   * Check if modifier drag mode is active
   */
  isModifierDragActive(): boolean {
    return this.dragState.modifierDragMode;
  }

  // ===== EVENT MANAGEMENT =====

  /**
   * Add a draw mode change listener
   */
  onDrawModeChange(callback: DrawModeChangeHandler): void {
    this.drawModeListeners.push(callback);
  }

  /**
   * Remove a draw mode change listener
   */
  offDrawModeChange(callback: DrawModeChangeHandler): void {
    const index = this.drawModeListeners.indexOf(callback);
    if (index > -1) {
      this.drawModeListeners.splice(index, 1);
    }
  }

  /**
   * Emit draw mode change event to all listeners
   */
  private emitDrawModeChange(mode: DrawMode): void {
    this.drawModeListeners.forEach((callback) => {
      try {
        callback(mode);
      } catch (error) {
        console.error('Error in draw mode change listener:', error);
      }
    });
  }

  // ===== UTILITY METHODS =====

  /**
   * Get a summary of current state (useful for debugging)
   */
  getStateSummary(): object {
    return {
      drawMode: this.drawMode,
      featureGroupCount: this.featureGroups.length,
      polygonHasKinks: this.polygonState.hasKinks,
      isDragging: this.dragState.isDragging,
      isModifierDragActive: this.dragState.modifierDragMode,
      listenerCount: this.drawModeListeners.length,
    };
  }

  /**
   * Reset all state to initial values
   */
  reset(): void {
    this.featureGroups = [];
    this.drawMode = DrawMode.Off;
    this.polygonState = { hasKinks: false };
    this.dragState = {
      startPosition: null,
      isDragging: false,
      currentPolygon: null,
      isModifierKeyHeld: false,
      modifierDragMode: false,
    };
    // Note: We don't clear listeners as they might be needed after reset
  }
}
