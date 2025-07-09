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
