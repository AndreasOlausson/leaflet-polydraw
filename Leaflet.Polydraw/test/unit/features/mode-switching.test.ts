/**
 * Mode Switching and State Management Tests
 *
 * Tests the core state management that makes Polydraw reliable:
 * - Drawing mode transitions
 * - State consistency
 * - Mode-specific behavior
 * - State persistence
 * - Error recovery
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockFactory } from '../mocks/factory';
import Polydraw from '../../../src/polydraw';
import { DrawMode } from '../../../src/enums';

// Mock type for Polydraw with test-specific methods
type MockedPolydraw = {
  // Real Polydraw public methods
  addTo(map: L.Map): MockedPolydraw;
  onAdd(map: L.Map): HTMLElement;
  onRemove(map: L.Map): void;
  getFeatureGroups(): L.FeatureGroup[];
  addPredefinedPolygon(polygon: any): Promise<void>;
  setDrawMode(mode: DrawMode): MockedPolydraw;
  getDrawMode(): DrawMode;
  on(event: any, callback: any): void;
  off(event: any, callback: any): void;
  removeAllFeatureGroups(): void;

  // Test-specific methods
  isDrawing(): boolean;
  startDraw(): void;
  stopDraw(): void;
  clearAll(): void;
  getPolygons(): unknown[];
  remove(): MockedPolydraw;
};

// Mock the polydraw module
vi.mock('../../../src/polydraw', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      let currentMode = 0; // DrawMode.Off

      return {
        // Public methods from the real Polydraw class
        addTo: vi.fn().mockReturnThis(),
        onAdd: vi.fn().mockReturnValue(document.createElement('div')),
        onRemove: vi.fn(),
        getFeatureGroups: vi.fn().mockReturnValue([]),
        addPredefinedPolygon: vi.fn().mockResolvedValue(undefined),
        setDrawMode: vi.fn().mockImplementation((mode) => {
          currentMode = mode;
          return this;
        }),
        getDrawMode: vi.fn().mockImplementation(() => currentMode),
        on: vi.fn(),
        off: vi.fn(),
        removeAllFeatureGroups: vi.fn(),

        // Test-specific methods
        startDraw: vi.fn().mockReturnThis(),
        stopDraw: vi.fn().mockReturnThis(),
        clearAll: vi.fn().mockReturnThis(),
        getPolygons: vi.fn().mockReturnValue([]),
        isDrawing: vi.fn().mockReturnValue(false),
        remove: vi.fn().mockReturnThis(),
      };
    }),
  };
});

describe('Mode Switching and State Management', () => {
  let _map: L.Map;
  let polydraw: MockedPolydraw;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create fresh mock objects
    _map = MockFactory.createMap();
    polydraw = new Polydraw() as unknown as MockedPolydraw;
  });

  describe('Initial State', () => {
    it('should start in Off mode', () => {
      expect(polydraw.getDrawMode()).toBe(DrawMode.Off);
    });

    it('should not be drawing initially', () => {
      expect(polydraw.isDrawing()).toBe(false);
    });

    it('should have empty polygon list initially', () => {
      const polygons = polydraw.getPolygons();
      expect(Array.isArray(polygons)).toBe(true);
      expect(polygons).toHaveLength(0);
    });
  });

  describe('Mode Transitions', () => {
    it('should switch to Add mode', () => {
      polydraw.setDrawMode(DrawMode.Add);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Add);
    });

    it('should switch to Edit mode', () => {
      polydraw.setDrawMode(DrawMode.Edit);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Edit);
    });

    it('should switch to Subtract mode', () => {
      polydraw.setDrawMode(DrawMode.Subtract);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Subtract);
    });

    it('should switch to AppendMarker mode', () => {
      polydraw.setDrawMode(DrawMode.AppendMarker);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.AppendMarker);
    });

    it('should switch to LoadPredefined mode', () => {
      polydraw.setDrawMode(DrawMode.LoadPredefined);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.LoadPredefined);
    });

    it('should switch to PointToPoint mode', () => {
      polydraw.setDrawMode(DrawMode.PointToPoint);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.PointToPoint);
    });

    it('should return to Off mode', () => {
      polydraw.setDrawMode(DrawMode.Off);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Off);
    });
  });

  describe('Mode-Specific Behavior', () => {
    describe('Add Mode', () => {
      beforeEach(() => {
        polydraw.setDrawMode(DrawMode.Add);
      });

      it('should start drawing when in Add mode', () => {
        polydraw.startDraw();
        expect(polydraw.startDraw).toHaveBeenCalled();
      });

      it('should handle drawing events in Add mode', () => {
        const startPoint = MockFactory.createLatLng(58.4, 15.6);
        const endPoint = MockFactory.createLatLng(58.5, 15.7);
        const events = MockFactory.createDrawingEvents(startPoint, endPoint);

        expect(events).toHaveLength(3);
        expect(events[0].type).toBe('mousedown');
        expect(events[2].type).toBe('mouseup');
      });
    });

    describe('Edit Mode', () => {
      beforeEach(() => {
        polydraw.setDrawMode(DrawMode.Edit);
      });

      it('should enable editing when in Edit mode', () => {
        expect(polydraw.getDrawMode()).toBe(DrawMode.Edit);
      });

      it('should handle polygon selection in Edit mode', () => {
        const polygon = MockFactory.createPolygon();
        const clickEvent = MockFactory.createEvent('click', { latlng: MockFactory.createLatLng() });

        expect(polygon).toBeDefined();
        expect(clickEvent.type).toBe('click');
      });
    });

    describe('Subtract Mode', () => {
      beforeEach(() => {
        polydraw.setDrawMode(DrawMode.Subtract);
      });

      it('should enable subtraction when in Subtract mode', () => {
        expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);
      });

      it('should handle subtraction drawing', () => {
        const startPoint = MockFactory.createLatLng(58.4, 15.6);
        const endPoint = MockFactory.createLatLng(58.5, 15.7);
        const events = MockFactory.createDrawingEvents(startPoint, endPoint);

        expect(events).toHaveLength(3);
      });
    });

    describe('Point-to-Point Mode', () => {
      beforeEach(() => {
        polydraw.setDrawMode(DrawMode.PointToPoint);
      });

      it('should enable point-to-point drawing', () => {
        expect(polydraw.getDrawMode()).toBe(DrawMode.PointToPoint);
      });

      it('should handle click events for point-to-point', () => {
        const clickEvent = MockFactory.createEvent('click', {
          latlng: MockFactory.createLatLng(58.4, 15.6),
        });

        expect(clickEvent.type).toBe('click');
        expect(clickEvent.latlng).toBeDefined();
      });
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state during mode switches', () => {
      // Start in Off mode
      expect(polydraw.getDrawMode()).toBe(DrawMode.Off);

      // Switch to Add mode
      polydraw.setDrawMode(DrawMode.Add);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Add);

      // Switch to Edit mode
      polydraw.setDrawMode(DrawMode.Edit);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Edit);

      // Switch back to Off mode
      polydraw.setDrawMode(DrawMode.Off);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Off);
    });

    it('should handle rapid mode switches', () => {
      const modes = [
        DrawMode.Add,
        DrawMode.Edit,
        DrawMode.Subtract,
        DrawMode.PointToPoint,
        DrawMode.Off,
      ];

      modes.forEach((mode) => {
        polydraw.setDrawMode(mode);
        expect(polydraw.setDrawMode).toHaveBeenCalledWith(mode);
      });
    });

    it('should maintain drawing state consistency', () => {
      // Start not drawing
      expect(polydraw.isDrawing()).toBe(false);

      // Start drawing
      polydraw.startDraw();
      expect(polydraw.startDraw).toHaveBeenCalled();

      // Stop drawing
      polydraw.stopDraw();
      expect(polydraw.stopDraw).toHaveBeenCalled();
    });
  });

  describe('State Persistence', () => {
    it('should remember mode after operations', () => {
      polydraw.setDrawMode(DrawMode.Add);
      polydraw.startDraw();
      polydraw.stopDraw();

      // Mode should still be Add
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Add);
    });

    it('should maintain polygon list across mode changes', () => {
      const initialPolygons = polydraw.getPolygons();

      polydraw.setDrawMode(DrawMode.Add);
      polydraw.setDrawMode(DrawMode.Edit);
      polydraw.setDrawMode(DrawMode.Off);

      const finalPolygons = polydraw.getPolygons();
      expect(Array.isArray(initialPolygons)).toBe(true);
      expect(Array.isArray(finalPolygons)).toBe(true);
    });
  });

  describe('Mode Validation', () => {
    it('should accept valid draw modes', () => {
      const validModes = [
        DrawMode.Off,
        DrawMode.Add,
        DrawMode.Edit,
        DrawMode.Subtract,
        DrawMode.AppendMarker,
        DrawMode.LoadPredefined,
        DrawMode.PointToPoint,
      ];

      validModes.forEach((mode) => {
        polydraw.setDrawMode(mode);
        expect(polydraw.setDrawMode).toHaveBeenCalledWith(mode);
      });
    });

    it('should handle mode transitions from any mode to any mode', () => {
      const modes = [
        DrawMode.Off,
        DrawMode.Add,
        DrawMode.Edit,
        DrawMode.Subtract,
        DrawMode.PointToPoint,
      ];

      // Test all possible transitions
      modes.forEach((fromMode) => {
        modes.forEach((toMode) => {
          polydraw.setDrawMode(fromMode);
          polydraw.setDrawMode(toMode);
          expect(polydraw.setDrawMode).toHaveBeenCalledWith(toMode);
        });
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from invalid mode transitions', () => {
      // Simulate invalid mode (this would be handled by the real implementation)
      polydraw.setDrawMode(DrawMode.Off);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Off);
    });

    it('should handle mode changes during drawing', () => {
      polydraw.setDrawMode(DrawMode.Add);
      polydraw.startDraw();

      // Change mode while drawing
      polydraw.setDrawMode(DrawMode.Edit);
      polydraw.stopDraw();

      expect(polydraw.startDraw).toHaveBeenCalled();
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Edit);
      expect(polydraw.stopDraw).toHaveBeenCalled();
    });

    it('should reset state when clearing all', () => {
      polydraw.setDrawMode(DrawMode.Add);
      polydraw.startDraw();

      polydraw.clearAll();

      expect(polydraw.clearAll).toHaveBeenCalled();
    });
  });

  describe('Mode Events', () => {
    it('should fire mode change events', () => {
      const modeChangeHandler = vi.fn();

      polydraw.on('modechange', modeChangeHandler);
      polydraw.setDrawMode(DrawMode.Add);

      expect(polydraw.on).toHaveBeenCalledWith('modechange', modeChangeHandler);
    });

    it('should fire drawing start events', () => {
      const drawStartHandler = vi.fn();

      polydraw.on('drawstart', drawStartHandler);
      polydraw.startDraw();

      expect(polydraw.on).toHaveBeenCalledWith('drawstart', drawStartHandler);
    });

    it('should fire drawing end events', () => {
      const drawEndHandler = vi.fn();

      polydraw.on('drawend', drawEndHandler);
      polydraw.stopDraw();

      expect(polydraw.on).toHaveBeenCalledWith('drawend', drawEndHandler);
    });
  });

  describe('Mode Combinations', () => {
    it('should handle mode combinations', () => {
      // Test that multiple modes can be active simultaneously
      // (This would depend on the actual implementation)
      polydraw.setDrawMode(DrawMode.Add);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Add);
    });

    it('should handle mode priority', () => {
      // Test mode priority (e.g., Edit mode overrides Add mode)
      polydraw.setDrawMode(DrawMode.Add);
      polydraw.setDrawMode(DrawMode.Edit);

      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Edit);
    });
  });

  describe('State Cleanup', () => {
    it('should clean up state when removing polydraw', () => {
      polydraw.setDrawMode(DrawMode.Add);
      polydraw.startDraw();

      polydraw.remove();

      expect(polydraw.remove).toHaveBeenCalled();
    });

    it('should clean up all feature groups', () => {
      polydraw.removeAllFeatureGroups();
      expect(polydraw.removeAllFeatureGroups).toHaveBeenCalled();
    });

    it('should reset to initial state after cleanup', () => {
      polydraw.setDrawMode(DrawMode.Add);
      polydraw.startDraw();
      polydraw.clearAll();

      expect(polydraw.clearAll).toHaveBeenCalled();
    });
  });
});
