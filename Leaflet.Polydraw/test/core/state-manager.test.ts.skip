/**
 * Tests for PolydrawStateManager
 *
 * These tests focus on state management functionality and ensure
 * the state manager provides a reliable single source of truth.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { PolydrawStateManager } from '../../src/core/state-manager';
import { DrawMode } from '../../src/enums';
import type {
  PolydrawFeatureGroup,
  PolydrawPolygon,
  ILatLng,
} from '../../src/types/polydraw-interfaces';

// Helper function to create mock feature groups
function createMockFeatureGroup(id: string): PolydrawFeatureGroup {
  return {
    id,
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    clearLayers: vi.fn(),
    hasLayer: vi.fn(),
    eachLayer: vi.fn(),
    getLayers: vi.fn(),
    toGeoJSON: vi.fn(),
    addTo: vi.fn(),
    remove: vi.fn(),
  } as unknown as PolydrawFeatureGroup;
}

// Helper function to create mock polygons
function createMockPolygon(id: string): PolydrawPolygon {
  return {
    id,
    toGeoJSON: vi.fn(),
    getLatLngs: vi.fn(),
    setLatLngs: vi.fn(),
    addTo: vi.fn(),
    remove: vi.fn(),
  } as unknown as PolydrawPolygon;
}

describe('PolydrawStateManager', () => {
  let stateManager: PolydrawStateManager;

  beforeEach(() => {
    stateManager = new PolydrawStateManager();
  });

  describe('Feature Groups Management', () => {
    test('should start with empty feature groups', () => {
      expect(stateManager.getFeatureGroups()).toEqual([]);
      expect(stateManager.getFeatureGroupCount()).toBe(0);
    });

    test('should add feature groups correctly', () => {
      const mockFeatureGroup = createMockFeatureGroup('test-group');

      stateManager.addFeatureGroup(mockFeatureGroup);

      expect(stateManager.getFeatureGroups()).toHaveLength(1);
      expect(stateManager.getFeatureGroupCount()).toBe(1);
      expect(stateManager.getFeatureGroups()[0]).toBe(mockFeatureGroup);
    });

    test('should remove feature groups correctly', () => {
      const mockFeatureGroup1 = createMockFeatureGroup('test-group-1');
      const mockFeatureGroup2 = createMockFeatureGroup('test-group-2');

      stateManager.addFeatureGroup(mockFeatureGroup1);
      stateManager.addFeatureGroup(mockFeatureGroup2);
      expect(stateManager.getFeatureGroupCount()).toBe(2);

      stateManager.removeFeatureGroup(mockFeatureGroup1);
      expect(stateManager.getFeatureGroupCount()).toBe(1);
      expect(stateManager.getFeatureGroups()[0]).toBe(mockFeatureGroup2);
    });

    test('should clear all feature groups', () => {
      const mockFeatureGroup1 = createMockFeatureGroup('test-group-1');
      const mockFeatureGroup2 = createMockFeatureGroup('test-group-2');

      stateManager.addFeatureGroup(mockFeatureGroup1);
      stateManager.addFeatureGroup(mockFeatureGroup2);
      expect(stateManager.getFeatureGroupCount()).toBe(2);

      stateManager.clearAllFeatureGroups();
      expect(stateManager.getFeatureGroupCount()).toBe(0);
      expect(stateManager.getFeatureGroups()).toEqual([]);
    });

    test('should return copy of feature groups to prevent external mutation', () => {
      const mockFeatureGroup = createMockFeatureGroup('test-group');
      stateManager.addFeatureGroup(mockFeatureGroup);

      const featureGroups = stateManager.getFeatureGroups();
      featureGroups.push(createMockFeatureGroup('external-group'));

      // Original should be unchanged
      expect(stateManager.getFeatureGroupCount()).toBe(1);
    });

    test('should push feature groups (alias for addFeatureGroup)', () => {
      const mockFeatureGroup = createMockFeatureGroup('test-group');

      stateManager.pushFeatureGroup(mockFeatureGroup);

      expect(stateManager.getFeatureGroupCount()).toBe(1);
      expect(stateManager.getFeatureGroups()[0]).toBe(mockFeatureGroup);
    });

    test('should filter feature groups correctly', () => {
      const mockFeatureGroup1 = createMockFeatureGroup('keep-this');
      const mockFeatureGroup2 = createMockFeatureGroup('remove-this');
      const mockFeatureGroup3 = createMockFeatureGroup('keep-this-too');

      stateManager.addFeatureGroup(mockFeatureGroup1);
      stateManager.addFeatureGroup(mockFeatureGroup2);
      stateManager.addFeatureGroup(mockFeatureGroup3);

      // Filter to keep only groups with 'keep' in the id
      stateManager.filterFeatureGroups((fg) => (fg as any).id.includes('keep'));

      expect(stateManager.getFeatureGroupCount()).toBe(2);
      expect(stateManager.getFeatureGroups()).toContain(mockFeatureGroup1);
      expect(stateManager.getFeatureGroups()).toContain(mockFeatureGroup3);
      expect(stateManager.getFeatureGroups()).not.toContain(mockFeatureGroup2);
    });

    test('should not emit event when filter does not change array', () => {
      const mockFeatureGroup = createMockFeatureGroup('test-group');
      const mockCallback = vi.fn();

      stateManager.addFeatureGroup(mockFeatureGroup);
      stateManager.onFeatureGroupsChange(mockCallback);

      // Reset call count
      mockCallback.mockClear();

      // Filter that keeps all items
      stateManager.filterFeatureGroups(() => true);

      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should splice feature groups correctly', () => {
      const mockFeatureGroup1 = createMockFeatureGroup('group-1');
      const mockFeatureGroup2 = createMockFeatureGroup('group-2');
      const mockFeatureGroup3 = createMockFeatureGroup('group-3');
      const mockFeatureGroup4 = createMockFeatureGroup('group-4');

      stateManager.addFeatureGroup(mockFeatureGroup1);
      stateManager.addFeatureGroup(mockFeatureGroup2);
      stateManager.addFeatureGroup(mockFeatureGroup3);

      // Remove 1 item at index 1 and insert 1 new item
      const removed = stateManager.spliceFeatureGroups(1, 1, mockFeatureGroup4);

      expect(removed).toEqual([mockFeatureGroup2]);
      expect(stateManager.getFeatureGroupCount()).toBe(3);
      expect(stateManager.getFeatureGroups()).toEqual([
        mockFeatureGroup1,
        mockFeatureGroup4,
        mockFeatureGroup3,
      ]);
    });

    test('should not emit event when splice makes no changes', () => {
      const mockFeatureGroup = createMockFeatureGroup('test-group');
      const mockCallback = vi.fn();

      stateManager.addFeatureGroup(mockFeatureGroup);
      stateManager.onFeatureGroupsChange(mockCallback);

      // Reset call count
      mockCallback.mockClear();

      // Splice that removes 0 items and adds 0 items
      stateManager.spliceFeatureGroups(0, 0);

      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should find feature group index correctly', () => {
      const mockFeatureGroup1 = createMockFeatureGroup('group-1');
      const mockFeatureGroup2 = createMockFeatureGroup('group-2');
      const mockFeatureGroup3 = createMockFeatureGroup('group-3');

      stateManager.addFeatureGroup(mockFeatureGroup1);
      stateManager.addFeatureGroup(mockFeatureGroup2);
      stateManager.addFeatureGroup(mockFeatureGroup3);

      expect(stateManager.findFeatureGroupIndex(mockFeatureGroup1)).toBe(0);
      expect(stateManager.findFeatureGroupIndex(mockFeatureGroup2)).toBe(1);
      expect(stateManager.findFeatureGroupIndex(mockFeatureGroup3)).toBe(2);

      // Non-existent group should return -1
      const nonExistentGroup = createMockFeatureGroup('non-existent');
      expect(stateManager.findFeatureGroupIndex(nonExistentGroup)).toBe(-1);
    });

    test('should set feature groups array', () => {
      const mockFeatureGroup1 = createMockFeatureGroup('group-1');
      const mockFeatureGroup2 = createMockFeatureGroup('group-2');
      const newGroups = [mockFeatureGroup1, mockFeatureGroup2];

      stateManager.setFeatureGroups(newGroups);

      expect(stateManager.getFeatureGroupCount()).toBe(2);
      expect(stateManager.getFeatureGroups()).toEqual(newGroups);
    });

    test('should create copy when setting feature groups to prevent external mutation', () => {
      const mockFeatureGroup1 = createMockFeatureGroup('group-1');
      const mockFeatureGroup2 = createMockFeatureGroup('group-2');
      const newGroups = [mockFeatureGroup1, mockFeatureGroup2];

      stateManager.setFeatureGroups(newGroups);

      // Mutate the original array
      newGroups.push(createMockFeatureGroup('external-group'));

      // State manager should be unchanged
      expect(stateManager.getFeatureGroupCount()).toBe(2);
    });

    test('should execute forEach on feature groups', () => {
      const mockFeatureGroup1 = createMockFeatureGroup('group-1');
      const mockFeatureGroup2 = createMockFeatureGroup('group-2');
      const mockCallback = vi.fn();

      stateManager.addFeatureGroup(mockFeatureGroup1);
      stateManager.addFeatureGroup(mockFeatureGroup2);

      stateManager.forEachFeatureGroup(mockCallback);

      expect(mockCallback).toHaveBeenCalledTimes(2);
      expect(mockCallback).toHaveBeenCalledWith(mockFeatureGroup1, 0);
      expect(mockCallback).toHaveBeenCalledWith(mockFeatureGroup2, 1);
    });

    test('should check if has feature groups', () => {
      expect(stateManager.hasFeatureGroups()).toBe(false);

      const mockFeatureGroup = createMockFeatureGroup('test-group');
      stateManager.addFeatureGroup(mockFeatureGroup);

      expect(stateManager.hasFeatureGroups()).toBe(true);

      stateManager.clearAllFeatureGroups();
      expect(stateManager.hasFeatureGroups()).toBe(false);
    });

    test('should get feature group at specific index', () => {
      const mockFeatureGroup1 = createMockFeatureGroup('group-1');
      const mockFeatureGroup2 = createMockFeatureGroup('group-2');

      stateManager.addFeatureGroup(mockFeatureGroup1);
      stateManager.addFeatureGroup(mockFeatureGroup2);

      expect(stateManager.getFeatureGroupAt(0)).toBe(mockFeatureGroup1);
      expect(stateManager.getFeatureGroupAt(1)).toBe(mockFeatureGroup2);
      expect(stateManager.getFeatureGroupAt(2)).toBeUndefined();
      expect(stateManager.getFeatureGroupAt(-1)).toBeUndefined();
    });

    test('should replace all feature groups efficiently', () => {
      const mockFeatureGroup1 = createMockFeatureGroup('group-1');
      const mockFeatureGroup2 = createMockFeatureGroup('group-2');
      const mockFeatureGroup3 = createMockFeatureGroup('group-3');
      const mockCallback = vi.fn();

      stateManager.addFeatureGroup(mockFeatureGroup1);
      stateManager.addFeatureGroup(mockFeatureGroup2);
      stateManager.onFeatureGroupsChange(mockCallback);

      // Reset call count
      mockCallback.mockClear();

      // Replace with same groups - should not emit
      stateManager.replaceAllFeatureGroups([mockFeatureGroup1, mockFeatureGroup2]);
      expect(mockCallback).not.toHaveBeenCalled();

      // Replace with different groups - should emit
      stateManager.replaceAllFeatureGroups([mockFeatureGroup3]);
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(stateManager.getFeatureGroups()).toEqual([mockFeatureGroup3]);
    });

    test('should batch feature group operations', () => {
      const mockFeatureGroup1 = createMockFeatureGroup('group-1');
      const mockFeatureGroup2 = createMockFeatureGroup('group-2');
      const mockFeatureGroup3 = createMockFeatureGroup('group-3');
      const mockCallback = vi.fn();

      stateManager.onFeatureGroupsChange(mockCallback);

      // Batch multiple operations
      stateManager.batchFeatureGroupOperations(() => {
        stateManager.addFeatureGroup(mockFeatureGroup1);
        stateManager.addFeatureGroup(mockFeatureGroup2);
        stateManager.addFeatureGroup(mockFeatureGroup3);
        stateManager.removeFeatureGroup(mockFeatureGroup2);
      });

      // Should only emit once at the end
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(stateManager.getFeatureGroupCount()).toBe(2);
      expect(stateManager.getFeatureGroups()).toEqual([mockFeatureGroup1, mockFeatureGroup3]);
    });

    test('should handle errors in batch operations gracefully', () => {
      const mockFeatureGroup = createMockFeatureGroup('test-group');
      const mockCallback = vi.fn();

      stateManager.onFeatureGroupsChange(mockCallback);

      // Batch operation that throws an error
      expect(() => {
        stateManager.batchFeatureGroupOperations(() => {
          stateManager.addFeatureGroup(mockFeatureGroup);
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // Should still emit the change that occurred before the error
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(stateManager.getFeatureGroupCount()).toBe(1);
    });

    test('should emit feature groups change events for all operations', () => {
      const mockFeatureGroup1 = createMockFeatureGroup('group-1');
      const mockFeatureGroup2 = createMockFeatureGroup('group-2');
      const mockCallback = vi.fn();

      stateManager.onFeatureGroupsChange(mockCallback);

      // Test all operations that should emit events
      stateManager.addFeatureGroup(mockFeatureGroup1);
      expect(mockCallback).toHaveBeenCalledTimes(1);

      stateManager.pushFeatureGroup(mockFeatureGroup2);
      expect(mockCallback).toHaveBeenCalledTimes(2);

      stateManager.removeFeatureGroup(mockFeatureGroup1);
      expect(mockCallback).toHaveBeenCalledTimes(3);

      stateManager.setFeatureGroups([mockFeatureGroup1, mockFeatureGroup2]);
      expect(mockCallback).toHaveBeenCalledTimes(4);

      stateManager.filterFeatureGroups((fg) => (fg as any).id === 'group-1');
      expect(mockCallback).toHaveBeenCalledTimes(5);

      stateManager.spliceFeatureGroups(0, 1, mockFeatureGroup2);
      expect(mockCallback).toHaveBeenCalledTimes(6);

      stateManager.clearAllFeatureGroups();
      expect(mockCallback).toHaveBeenCalledTimes(7);
    });
  });

  describe('Draw Mode Management', () => {
    test('should start with DrawMode.Off', () => {
      expect(stateManager.getDrawMode()).toBe(DrawMode.Off);
      expect(stateManager.isDrawing()).toBe(false);
    });

    test('should set draw mode correctly', () => {
      stateManager.setDrawMode(DrawMode.Add);
      expect(stateManager.getDrawMode()).toBe(DrawMode.Add);
      expect(stateManager.isDrawing()).toBe(true);
    });

    test('should detect drawing modes correctly', () => {
      stateManager.setDrawMode(DrawMode.Add);
      expect(stateManager.isDrawing()).toBe(true);

      stateManager.setDrawMode(DrawMode.Subtract);
      expect(stateManager.isDrawing()).toBe(true);

      stateManager.setDrawMode(DrawMode.Off);
      expect(stateManager.isDrawing()).toBe(false);
    });

    test('should emit draw mode change events', () => {
      const mockCallback = vi.fn();
      stateManager.onDrawModeChange(mockCallback);

      stateManager.setDrawMode(DrawMode.Add);
      expect(mockCallback).toHaveBeenCalledWith(DrawMode.Add);

      stateManager.setDrawMode(DrawMode.Subtract);
      expect(mockCallback).toHaveBeenCalledWith(DrawMode.Subtract);
    });

    test('should not emit event if mode does not change', () => {
      const mockCallback = vi.fn();
      stateManager.onDrawModeChange(mockCallback);

      stateManager.setDrawMode(DrawMode.Add);
      expect(mockCallback).toHaveBeenCalledTimes(1);

      stateManager.setDrawMode(DrawMode.Add); // Same mode
      expect(mockCallback).toHaveBeenCalledTimes(1); // Should not be called again
    });

    test('should prevent mode change while dragging', () => {
      const mockPolygon = createMockPolygon('test-polygon');
      const mockPosition = { lat: 0, lng: 0 } as ILatLng;

      // Start dragging
      stateManager.startDrag(mockPolygon, mockPosition);
      expect(stateManager.isDragging()).toBe(true);

      // Try to change mode while dragging
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      stateManager.setDrawMode(DrawMode.Add);

      expect(consoleSpy).toHaveBeenCalledWith('Cannot change draw mode while dragging');
      expect(stateManager.getDrawMode()).toBe(DrawMode.Off); // Should remain unchanged

      consoleSpy.mockRestore();
    });

    test('should allow mode change to Off while dragging', () => {
      const mockPolygon = createMockPolygon('test-polygon');
      const mockPosition = { lat: 0, lng: 0 } as ILatLng;

      stateManager.setDrawMode(DrawMode.Add);
      stateManager.startDrag(mockPolygon, mockPosition);

      // Should allow changing to Off even while dragging
      stateManager.setDrawMode(DrawMode.Off);
      expect(stateManager.getDrawMode()).toBe(DrawMode.Off);
    });
  });

  describe('Polygon State Management', () => {
    test('should start with no kinks', () => {
      expect(stateManager.getPolygonHasKinks()).toBe(false);
    });

    test('should set and get polygon kinks state', () => {
      stateManager.setPolygonHasKinks(true);
      expect(stateManager.getPolygonHasKinks()).toBe(true);

      stateManager.setPolygonHasKinks(false);
      expect(stateManager.getPolygonHasKinks()).toBe(false);
    });
  });

  describe('Drag State Management', () => {
    const mockPolygon = createMockPolygon('test-polygon');
    const mockPosition = { lat: 10, lng: 20 } as ILatLng;

    test('should start with no drag state', () => {
      expect(stateManager.isDragging()).toBe(false);
      expect(stateManager.isModifierDragActive()).toBe(false);

      const dragState = stateManager.getDragState();
      expect(dragState.startPosition).toBeNull();
      expect(dragState.currentPolygon).toBeNull();
      expect(dragState.isDragging).toBe(false);
    });

    test('should start drag correctly', () => {
      stateManager.startDrag(mockPolygon, mockPosition);

      expect(stateManager.isDragging()).toBe(true);

      const dragState = stateManager.getDragState();
      expect(dragState.startPosition).toEqual(mockPosition);
      expect(dragState.currentPolygon).toBe(mockPolygon);
      expect(dragState.isDragging).toBe(true);
    });

    test('should update drag position', () => {
      const newPosition = { lat: 30, lng: 40 } as ILatLng;

      stateManager.startDrag(mockPolygon, mockPosition);
      stateManager.updateDragPosition(newPosition);

      const dragState = stateManager.getDragState();
      expect(dragState.startPosition).toEqual(newPosition);
    });

    test('should not update position if not dragging', () => {
      const newPosition = { lat: 30, lng: 40 } as ILatLng;

      stateManager.updateDragPosition(newPosition);

      const dragState = stateManager.getDragState();
      expect(dragState.startPosition).toBeNull();
    });

    test('should end drag correctly', () => {
      stateManager.startDrag(mockPolygon, mockPosition);
      expect(stateManager.isDragging()).toBe(true);

      stateManager.endDrag();
      expect(stateManager.isDragging()).toBe(false);

      const dragState = stateManager.getDragState();
      expect(dragState.startPosition).toBeNull();
      expect(dragState.currentPolygon).toBeNull();
      expect(dragState.isDragging).toBe(false);
    });

    test('should handle modifier key state', () => {
      stateManager.setModifierKeyState(true);

      const dragState = stateManager.getDragState();
      expect(dragState.isModifierKeyHeld).toBe(true);
    });

    test('should activate modifier drag mode when dragging with modifier', () => {
      stateManager.setModifierKeyState(true);
      stateManager.startDrag(mockPolygon, mockPosition);

      expect(stateManager.isModifierDragActive()).toBe(true);
    });

    test('should preserve modifier state when ending drag', () => {
      stateManager.setModifierKeyState(true);
      stateManager.startDrag(mockPolygon, mockPosition);
      stateManager.endDrag();

      const dragState = stateManager.getDragState();
      expect(dragState.isModifierKeyHeld).toBe(true); // Should be preserved
      expect(dragState.modifierDragMode).toBe(false); // Should be reset
    });

    test('should return copy of drag state to prevent external mutation', () => {
      stateManager.startDrag(mockPolygon, mockPosition);

      const dragState = stateManager.getDragState();
      // Try to mutate the returned object (this should not affect the original)
      const mutableDragState = dragState as any;
      mutableDragState.isDragging = false;

      // Original should be unchanged
      expect(stateManager.isDragging()).toBe(true);
    });
  });

  describe('Event Management', () => {
    test('should add and remove draw mode listeners', () => {
      const mockCallback1 = vi.fn();
      const mockCallback2 = vi.fn();

      stateManager.onDrawModeChange(mockCallback1);
      stateManager.onDrawModeChange(mockCallback2);

      stateManager.setDrawMode(DrawMode.Add);
      expect(mockCallback1).toHaveBeenCalledWith(DrawMode.Add);
      expect(mockCallback2).toHaveBeenCalledWith(DrawMode.Add);

      stateManager.offDrawModeChange(mockCallback1);
      stateManager.setDrawMode(DrawMode.Subtract);

      expect(mockCallback1).toHaveBeenCalledTimes(1); // Should not be called again
      expect(mockCallback2).toHaveBeenCalledWith(DrawMode.Subtract);
    });

    test('should handle errors in listeners gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      stateManager.onDrawModeChange(errorCallback);
      stateManager.onDrawModeChange(normalCallback);

      stateManager.setDrawMode(DrawMode.Add);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in draw mode change listener:',
        expect.any(Error),
      );
      expect(normalCallback).toHaveBeenCalledWith(DrawMode.Add); // Should still be called

      consoleSpy.mockRestore();
    });
  });

  describe('Utility Methods', () => {
    test('should provide state summary', () => {
      const mockFeatureGroup = createMockFeatureGroup('test-group');
      const mockCallback = vi.fn();

      stateManager.addFeatureGroup(mockFeatureGroup);
      stateManager.setDrawMode(DrawMode.Add);
      stateManager.setPolygonHasKinks(true);
      stateManager.onDrawModeChange(mockCallback);

      const summary = stateManager.getStateSummary();

      expect(summary).toEqual({
        drawMode: DrawMode.Add,
        featureGroupCount: 1,
        polygonHasKinks: true,
        isDragging: false,
        isModifierDragActive: false,
        listenerCounts: {
          drawMode: 1,
          featureGroups: 0,
          dragState: 0,
          dragPosition: 0,
          modifierKey: 0,
        },
      });
    });

    test('should reset all state', () => {
      const mockFeatureGroup = createMockFeatureGroup('test-group');
      const mockPolygon = createMockPolygon('test-polygon');
      const mockPosition = { lat: 0, lng: 0 } as ILatLng;
      const mockCallback = vi.fn();

      // Set up some state
      stateManager.addFeatureGroup(mockFeatureGroup);
      stateManager.setDrawMode(DrawMode.Add);
      stateManager.setPolygonHasKinks(true);
      stateManager.startDrag(mockPolygon, mockPosition);
      stateManager.setModifierKeyState(true);
      stateManager.onDrawModeChange(mockCallback);

      // Reset
      stateManager.reset();

      // Verify reset
      expect(stateManager.getFeatureGroupCount()).toBe(0);
      expect(stateManager.getDrawMode()).toBe(DrawMode.Off);
      expect(stateManager.getPolygonHasKinks()).toBe(false);
      expect(stateManager.isDragging()).toBe(false);
      expect(stateManager.isModifierDragActive()).toBe(false);

      const dragState = stateManager.getDragState();
      expect(dragState.isModifierKeyHeld).toBe(false);

      // Listeners should be preserved (not reset)
      stateManager.setDrawMode(DrawMode.Add);
      expect(mockCallback).toHaveBeenCalledWith(DrawMode.Add);
    });
  });
});
