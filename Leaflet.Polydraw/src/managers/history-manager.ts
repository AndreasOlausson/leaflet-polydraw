import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { EventManager } from './event-manager';
import * as L from 'leaflet';

/**
 * Represents a snapshot of the entire drawing state
 */
export interface HistorySnapshot {
  /**
   * Array of GeoJSON features representing all polygons
   */
  features: Feature<Polygon | MultiPolygon>[];

  /**
   * Timestamp when this snapshot was created
   */
  timestamp: number;

  /**
   * Optional description of the action that created this snapshot
   */
  action?: string;
}

/**
 * HistoryManager handles undo/redo functionality for polygon operations.
 * It stores snapshots of the polygon state as GeoJSON and manages undo/redo stacks.
 */
export class HistoryManager {
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  private maxHistorySize: number = 50;
  private eventManager: EventManager;
  private isRestoring: boolean = false;

  constructor(eventManager: EventManager, maxHistorySize: number = 50) {
    this.eventManager = eventManager;
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Save the current state to the undo stack
   * @param featureGroups - Array of Leaflet feature groups to save
   * @param action - Optional description of the action
   */
  saveState(featureGroups: L.FeatureGroup[], action?: string): void {
    // Don't save state while restoring to prevent infinite loops
    if (this.isRestoring) {
      return;
    }

    const snapshot = this.createSnapshot(featureGroups, action);

    // Add to undo stack
    this.undoStack.push(snapshot);

    // Limit stack size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift(); // Remove oldest snapshot
    }

    // Clear redo stack when new action is performed
    this.redoStack = [];

    // Emit history changed event
    this.eventManager.emit('polydraw:history:changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }

  /**
   * Undo the last action
   * @param featureGroups - Current array of feature groups
   * @returns The snapshot to restore, or null if undo stack is empty
   */
  undo(featureGroups: L.FeatureGroup[]): HistorySnapshot | null {
    if (!this.canUndo()) {
      return null;
    }

    // Save current state to redo stack before undoing
    const currentSnapshot = this.createSnapshot(featureGroups, 'redo-point');
    this.redoStack.push(currentSnapshot);

    // Get the previous state
    const previousSnapshot = this.undoStack.pop()!;

    // Emit undo event with current state
    this.eventManager.emit('polydraw:history:undo', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      action: previousSnapshot.action,
    });

    return previousSnapshot;
  }

  /**
   * Redo the last undone action
   * @param featureGroups - Current array of feature groups
   * @returns The snapshot to restore, or null if redo stack is empty
   */
  redo(featureGroups: L.FeatureGroup[]): HistorySnapshot | null {
    if (!this.canRedo()) {
      return null;
    }

    // Save current state to undo stack before redoing
    const currentSnapshot = this.createSnapshot(featureGroups, 'undo-point');
    this.undoStack.push(currentSnapshot);

    // Get the next state
    const nextSnapshot = this.redoStack.pop()!;

    // Emit redo event with current state
    this.eventManager.emit('polydraw:history:redo', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      action: nextSnapshot.action,
    });

    return nextSnapshot;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];

    // Emit history changed event
    this.eventManager.emit('polydraw:history:changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }

  /**
   * Set the restoration flag (prevents saving during restore)
   */
  setRestoring(isRestoring: boolean): void {
    this.isRestoring = isRestoring;
  }

  /**
   * Create a snapshot from feature groups
   */
  private createSnapshot(featureGroups: L.FeatureGroup[], action?: string): HistorySnapshot {
    const features: Feature<Polygon | MultiPolygon>[] = [];

    featureGroups.forEach((fg) => {
      fg.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          const polygon = layer as L.Polygon;
          try {
            const feature = polygon.toGeoJSON();
            if (feature) {
              features.push(feature);
            }
          } catch (error) {
            console.warn('Error converting polygon to GeoJSON:', error);
          }
        }
      });
    });

    return {
      features,
      timestamp: Date.now(),
      action,
    };
  }
}
