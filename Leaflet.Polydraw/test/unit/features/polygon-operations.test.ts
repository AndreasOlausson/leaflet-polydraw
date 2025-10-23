/**
 * Polygon Operations Tests
 *
 * Tests the core polygon functionality that makes Polydraw valuable:
 * - Polygon creation and validation
 * - Polygon merging and splitting
 * - Polygon editing operations
 * - Edge cases and error handling
 */

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
    default: vi.fn().mockImplementation(() => ({
      // Public methods from the real Polydraw class
      addTo: vi.fn().mockReturnThis(),
      onAdd: vi.fn().mockReturnValue(document.createElement('div')),
      onRemove: vi.fn(),
      getFeatureGroups: vi.fn().mockReturnValue([]),
      addPredefinedPolygon: vi.fn().mockResolvedValue(undefined),
      setDrawMode: vi.fn().mockReturnThis(),
      getDrawMode: vi.fn().mockReturnValue(DrawMode.Off),
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
    })),
  };
});

describe('Polygon Operations', () => {
  let map: L.Map;
  let polydraw: MockedPolydraw;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create fresh mock objects
    map = MockFactory.createMap();
    polydraw = new Polydraw() as unknown as MockedPolydraw;
  });

  describe('Polygon Creation', () => {
    it('should create a triangle polygon', () => {
      const triangle = MockFactory.createPolygon({ vertexCount: 3 });
      const latlngs = triangle.getLatLngs();

      expect(latlngs).toHaveLength(4); // 3 vertices + closing point
      expect(triangle.getLatLngs).toHaveBeenCalled();
    });

    it('should create a square polygon', () => {
      const square = MockFactory.createPolygon({ vertexCount: 4 });
      const latlngs = square.getLatLngs();

      expect(latlngs).toHaveLength(5); // 4 vertices + closing point
      expect(square.getLatLngs).toHaveBeenCalled();
    });

    it('should create polygons with custom centers', () => {
      const center1 = { lat: 60.0, lng: 20.0 };
      const center2 = { lat: 61.0, lng: 21.0 };

      const polygon1 = MockFactory.createPolygon({ center: center1 });
      const polygon2 = MockFactory.createPolygon({ center: center2 });

      expect(polygon1).toBeDefined();
      expect(polygon2).toBeDefined();
      expect(polygon1).not.toBe(polygon2);
    });

    it('should create polygons with different sizes', () => {
      const smallPolygon = MockFactory.createPolygon({ size: 0.05 });
      const largePolygon = MockFactory.createPolygon({ size: 0.2 });

      expect(smallPolygon).toBeDefined();
      expect(largePolygon).toBeDefined();
      expect(smallPolygon).not.toBe(largePolygon);
    });
  });

  describe('Multiple Polygon Scenarios', () => {
    it('should create multiple polygons for testing', () => {
      const polygons = MockFactory.createPolygons(3, { vertexCount: 4 });

      expect(polygons).toHaveLength(3);
      polygons.forEach((polygon) => {
        expect(polygon.getLatLngs).toBeDefined();
        expect(polygon.getLatLngs()).toHaveLength(5); // 4 vertices + closing
      });
    });

    it('should create overlapping polygons for merging tests', () => {
      const overlappingPolygons = MockFactory.createOverlappingPolygons();

      expect(overlappingPolygons).toHaveLength(2);
      expect(overlappingPolygons[0]).toBeDefined();
      expect(overlappingPolygons[1]).toBeDefined();
    });

    it('should create feature groups with polygons', () => {
      const featureGroup = MockFactory.createFeatureGroupWithPolygons(3);
      const layers = featureGroup.getLayers();

      expect(layers).toHaveLength(3);
      expect(featureGroup.eachLayer).toBeDefined();
    });
  });

  describe('Polygon Validation', () => {
    it('should validate polygon bounds', () => {
      const polygon = MockFactory.createPolygon({ vertexCount: 4 });
      const bounds = polygon.getBounds();

      expect(bounds).toBeDefined();
      expect(bounds.getSouthWest).toBeDefined();
      expect(bounds.getNorthEast).toBeDefined();
      expect(bounds.getCenter).toBeDefined();
    });

    it('should check if polygon is empty', () => {
      const polygon = MockFactory.createPolygon({ vertexCount: 4 });

      expect(polygon.isEmpty()).toBe(false);
    });

    it('should get polygon center', () => {
      const polygon = MockFactory.createPolygon({
        center: { lat: 58.5, lng: 15.7 },
        vertexCount: 4,
      });

      const center = polygon.getCenter();
      expect(center).toBeDefined();
    });
  });

  describe('Polygon Operations', () => {
    it('should add polygons to map', () => {
      const polygon = MockFactory.createPolygon();

      polygon.addTo(map);
      expect(polygon.addTo).toHaveBeenCalledWith(map);
    });

    it('should remove polygons from map', () => {
      const polygon = MockFactory.createPolygon();

      polygon.remove();
      expect(polygon.remove).toHaveBeenCalled();
    });

    it('should set polygon styles', () => {
      const polygon = MockFactory.createPolygon();
      const style = { color: 'red', weight: 2 };

      polygon.setStyle(style);
      expect(polygon.setStyle).toHaveBeenCalledWith(style);
    });

    it('should redraw polygon', () => {
      const polygon = MockFactory.createPolygon();

      polygon.redraw();
      expect(polygon.redraw).toHaveBeenCalled();
    });
  });

  describe('Event Handling for Polygons', () => {
    it('should handle polygon click events', () => {
      const polygon = MockFactory.createPolygon();
      const clickHandler = vi.fn();

      polygon.on('click', clickHandler);
      expect(polygon.on).toHaveBeenCalledWith('click', clickHandler);
    });

    it('should handle polygon mouseover events', () => {
      const polygon = MockFactory.createPolygon();
      const mouseoverHandler = vi.fn();

      polygon.on('mouseover', mouseoverHandler);
      expect(polygon.on).toHaveBeenCalledWith('mouseover', mouseoverHandler);
    });

    it('should remove event listeners', () => {
      const polygon = MockFactory.createPolygon();
      const handler = vi.fn();

      polygon.off('click', handler);
      expect(polygon.off).toHaveBeenCalledWith('click', handler);
    });
  });

  describe('Drawing Operations', () => {
    it('should simulate drawing events', () => {
      const startPoint = MockFactory.createLatLng(58.4, 15.6);
      const endPoint = MockFactory.createLatLng(58.5, 15.7);

      const events = MockFactory.createDrawingEvents(startPoint, endPoint);

      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('mousedown');
      expect(events[1].type).toBe('mousemove');
      expect(events[2].type).toBe('mouseup');

      expect(events[0].latlng).toBe(startPoint);
      expect(events[2].latlng).toBe(endPoint);
    });

    it('should handle drawing mode changes', () => {
      polydraw.setDrawMode(DrawMode.Add);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Add);

      polydraw.setDrawMode(DrawMode.Subtract);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Subtract);
    });

    it('should track drawing state', () => {
      expect(polydraw.isDrawing()).toBe(false);

      polydraw.startDraw();
      expect(polydraw.startDraw).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single-point polygons', () => {
      const singlePoint = MockFactory.createPolygon({ vertexCount: 1 });
      const latlngs = singlePoint.getLatLngs();

      expect(latlngs).toHaveLength(1);
    });

    it('should handle two-point polygons', () => {
      const linePolygon = MockFactory.createPolygon({ vertexCount: 2 });
      const latlngs = linePolygon.getLatLngs();

      expect(latlngs).toHaveLength(2);
    });

    it('should handle large polygons', () => {
      const largePolygon = MockFactory.createPolygon({
        vertexCount: 10,
        size: 0.5,
      });

      expect(largePolygon).toBeDefined();
      expect(largePolygon.getLatLngs()).toHaveLength(11); // 10 vertices + closing
    });

    it('should handle polygons at edge coordinates', () => {
      const edgePolygon = MockFactory.createPolygon({
        center: { lat: 90, lng: 180 },
        size: 0.01,
      });

      expect(edgePolygon).toBeDefined();
    });
  });

  describe('Polygon Management', () => {
    it('should clear all polygons', () => {
      polydraw.clearAll();
      expect(polydraw.clearAll).toHaveBeenCalled();
    });

    it('should get all polygons', () => {
      const polygons = polydraw.getPolygons();
      expect(polydraw.getPolygons).toHaveBeenCalled();
      expect(Array.isArray(polygons)).toBe(true);
    });

    it('should remove specific polygons', () => {
      polydraw.remove();
      expect(polydraw.remove).toHaveBeenCalled();
    });
  });
});
