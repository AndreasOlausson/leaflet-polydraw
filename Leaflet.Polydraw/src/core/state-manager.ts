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

// Event handler types for comprehensive state management
export type FeatureGroupsChangeHandler = (featureGroups: PolydrawFeatureGroup[]) => void;
export type DragStateChangeHandler = (dragState: Readonly<DragState>) => void;
export type DragPositionChangeHandler = (position: ILatLng) => void;
export type ModifierKeyChangeHandler = (isHeld: boolean) => void;

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
  private featureGroupsChangeListeners: FeatureGroupsChangeHandler[] = [];
  private dragStateChangeListeners: DragStateChangeHandler[] = [];
  private dragPositionChangeListeners: DragPositionChangeHandler[] = [];
  private modifierKeyChangeListeners: ModifierKeyChangeHandler[] = [];

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
    this.emitFeatureGroupsChange();
  }

  /**
   * Remove a specific feature group
   */
  removeFeatureGroup(featureGroup: PolydrawFeatureGroup): void {
    const index = this.featureGroups.indexOf(featureGroup);
    if (index > -1) {
      this.featureGroups.splice(index, 1);
      this.emitFeatureGroupsChange();
    }
  }

  /**
   * Clear all feature groups
   */
  clearAllFeatureGroups(): void {
    this.featureGroups = [];
    this.emitFeatureGroupsChange();
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
    this.emitDragStateChange();
  }

  /**
   * Update drag position
   */
  updateDragPosition(position: ILatLng): void {
    if (this.dragState.isDragging) {
      this.dragState.startPosition = position;
      this.emitDragPositionChange(position);
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
    this.emitDragStateChange();
  }

  /**
   * Set modifier key state
   */
  setModifierKeyState(isHeld: boolean): void {
    const previousState = this.dragState.isModifierKeyHeld;
    this.dragState.isModifierKeyHeld = isHeld;

    // Update modifier drag mode - always update, not just when dragging
    this.dragState.modifierDragMode = isHeld;

    // Only emit if state actually changed
    if (previousState !== isHeld) {
      this.emitModifierKeyChange(isHeld);
    }
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

  // ===== FEATURE GROUPS EVENT MANAGEMENT =====

  /**
   * Add a feature groups change listener
   */
  onFeatureGroupsChange(callback: FeatureGroupsChangeHandler): void {
    this.featureGroupsChangeListeners.push(callback);
  }

  /**
   * Remove a feature groups change listener
   */
  offFeatureGroupsChange(callback: FeatureGroupsChangeHandler): void {
    const index = this.featureGroupsChangeListeners.indexOf(callback);
    if (index > -1) {
      this.featureGroupsChangeListeners.splice(index, 1);
    }
  }

  /**
   * Emit feature groups change event to all listeners
   */
  private emitFeatureGroupsChange(): void {
    const featureGroups = this.getFeatureGroups();
    this.featureGroupsChangeListeners.forEach((callback) => {
      try {
        callback(featureGroups);
      } catch (error) {
        console.error('Error in feature groups change listener:', error);
      }
    });
  }

  // ===== DRAG STATE EVENT MANAGEMENT =====

  /**
   * Add a drag state change listener
   */
  onDragStateChange(callback: DragStateChangeHandler): void {
    this.dragStateChangeListeners.push(callback);
  }

  /**
   * Remove a drag state change listener
   */
  offDragStateChange(callback: DragStateChangeHandler): void {
    const index = this.dragStateChangeListeners.indexOf(callback);
    if (index > -1) {
      this.dragStateChangeListeners.splice(index, 1);
    }
  }

  /**
   * Emit drag state change event to all listeners
   */
  private emitDragStateChange(): void {
    const dragState = this.getDragState();
    this.dragStateChangeListeners.forEach((callback) => {
      try {
        callback(dragState);
      } catch (error) {
        console.error('Error in drag state change listener:', error);
      }
    });
  }

  // ===== DRAG POSITION EVENT MANAGEMENT =====

  /**
   * Add a drag position change listener
   */
  onDragPositionChange(callback: DragPositionChangeHandler): void {
    this.dragPositionChangeListeners.push(callback);
  }

  /**
   * Remove a drag position change listener
   */
  offDragPositionChange(callback: DragPositionChangeHandler): void {
    const index = this.dragPositionChangeListeners.indexOf(callback);
    if (index > -1) {
      this.dragPositionChangeListeners.splice(index, 1);
    }
  }

  /**
   * Emit drag position change event to all listeners
   */
  private emitDragPositionChange(position: ILatLng): void {
    this.dragPositionChangeListeners.forEach((callback) => {
      try {
        callback(position);
      } catch (error) {
        console.error('Error in drag position change listener:', error);
      }
    });
  }

  // ===== MODIFIER KEY EVENT MANAGEMENT =====

  /**
   * Add a modifier key change listener
   */
  onModifierKeyChange(callback: ModifierKeyChangeHandler): void {
    this.modifierKeyChangeListeners.push(callback);
  }

  /**
   * Remove a modifier key change listener
   */
  offModifierKeyChange(callback: ModifierKeyChangeHandler): void {
    const index = this.modifierKeyChangeListeners.indexOf(callback);
    if (index > -1) {
      this.modifierKeyChangeListeners.splice(index, 1);
    }
  }

  /**
   * Emit modifier key change event to all listeners
   */
  private emitModifierKeyChange(isHeld: boolean): void {
    this.modifierKeyChangeListeners.forEach((callback) => {
      try {
        callback(isHeld);
      } catch (error) {
        console.error('Error in modifier key change listener:', error);
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
      listenerCounts: {
        drawMode: this.drawModeListeners.length,
        featureGroups: this.featureGroupsChangeListeners.length,
        dragState: this.dragStateChangeListeners.length,
        dragPosition: this.dragPositionChangeListeners.length,
        modifierKey: this.modifierKeyChangeListeners.length,
      },
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
