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

  /**
   * Approximate serialized size in bytes at save time.
   */
  size?: number;
}

/**
 * HistoryManager handles undo/redo functionality for polygon operations.
 * It stores snapshots of the polygon state as GeoJSON and manages undo/redo stacks.
 */
export class HistoryManager {
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  private maxHistorySize: number = 50;
  private maxSnapshotSize: number = 500000; // 500KB per snapshot
  private maxTotalMemory: number = 5000000; // 5MB total memory budget
  private currentMemoryUsage: number = 0;
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
    const snapshotSize = this.calculateSnapshotSize(snapshot);
    snapshot.size = snapshotSize;

    // Clear redo stack when new action is performed (always, even if we skip saving)
    this.redoStack = [];

    // Check if snapshot exceeds individual size limit
    if (snapshotSize > this.maxSnapshotSize) {
      console.warn(
        `History snapshot too large (${snapshotSize} bytes, limit ${this.maxSnapshotSize} bytes). Skipping save.`,
      );
      return;
    }

    // Add to undo stack
    this.undoStack.push(snapshot);
    this.currentMemoryUsage += snapshotSize;

    // Enforce memory budget
    this.enforceMemoryBudget();

    // Emit history changed event
    this.eventManager.emit('polydraw:history:changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }

  /**
   * Calculate the approximate size of a snapshot in bytes
   */
  private calculateSnapshotSize(snapshot: HistorySnapshot): number {
    try {
      // Use JSON stringification to estimate size
      const jsonString = JSON.stringify(snapshot);
      return jsonString.length * 2; // Approximate UTF-16 character size
    } catch (error) {
      console.warn('Error calculating snapshot size:', error);
      return 0;
    }
  }

  /**
   * Enforce memory budget by removing oldest snapshots if needed
   */
  private enforceMemoryBudget(): void {
    // First, enforce maximum stack size
    while (this.undoStack.length > this.maxHistorySize) {
      const removedSnapshot = this.undoStack.shift();
      if (removedSnapshot) {
        this.currentMemoryUsage -= this.getSnapshotSize(removedSnapshot);
      }
    }

    // Then, enforce total memory budget
    while (this.currentMemoryUsage > this.maxTotalMemory && this.undoStack.length > 0) {
      const removedSnapshot = this.undoStack.shift();
      if (removedSnapshot) {
        this.currentMemoryUsage -= this.getSnapshotSize(removedSnapshot);
      }
    }
  }

  /**
   * Enforce redo stack size (count-based, not byte-based)
   */
  private enforceRedoMemoryBudget(): void {
    // Limit redo stack size to half of max history size
    const maxRedoSize = Math.floor(this.maxHistorySize / 2);
    while (this.redoStack.length > maxRedoSize) {
      this.redoStack.shift();
    }
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
    const currentSnapshotSize = this.calculateSnapshotSize(currentSnapshot);
    currentSnapshot.size = currentSnapshotSize;

    // Check if current snapshot exceeds size limit before adding to redo stack
    if (currentSnapshotSize <= this.maxSnapshotSize) {
      this.redoStack.push(currentSnapshot);
      this.enforceRedoMemoryBudget();
    } else {
      console.warn(`Current state too large (${currentSnapshotSize} bytes) to save to redo stack.`);
    }

    // Get the previous state
    const previousSnapshot = this.undoStack.pop()!;
    this.currentMemoryUsage -= this.getSnapshotSize(previousSnapshot);

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
    const currentSnapshotSize = this.calculateSnapshotSize(currentSnapshot);
    currentSnapshot.size = currentSnapshotSize;

    // Check if current snapshot exceeds size limit before adding to undo stack
    if (currentSnapshotSize <= this.maxSnapshotSize) {
      this.undoStack.push(currentSnapshot);
      this.currentMemoryUsage += currentSnapshotSize;
      this.enforceMemoryBudget();
    } else {
      console.warn(`Current state too large (${currentSnapshotSize} bytes) to save to undo stack.`);
    }

    // Enforce redo stack memory budget
    this.enforceRedoMemoryBudget();

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
    this.currentMemoryUsage = 0;

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
        const layerWithGeoJSON = layer as L.Layer & {
          toGeoJSON?: () => Feature<Polygon | MultiPolygon> | null;
        };
        if (!layerWithGeoJSON?.toGeoJSON) {
          return;
        }
        try {
          const feature = layerWithGeoJSON.toGeoJSON();
          if (!feature) {
            return;
          }
          const geomType = feature?.geometry?.type;
          if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
            features.push(feature);
          }
        } catch (error) {
          console.warn('Error converting polygon to GeoJSON:', error);
        }
      });
    });

    return {
      features,
      timestamp: Date.now(),
      action,
    };
  }

  private getSnapshotSize(snapshot: HistorySnapshot): number {
    if (typeof snapshot.size === 'number') {
      return snapshot.size;
    }
    const size = this.calculateSnapshotSize(snapshot);
    snapshot.size = size;
    return size;
  }
}
