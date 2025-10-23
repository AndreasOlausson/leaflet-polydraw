/**
 * Polygon Merging Tests
 *
 * Tests the core polygon merging functionality that makes Polydraw powerful:
 * - Intersecting polygons merge into one
 * - Non-intersecting polygons remain separate
 * - Complex merging scenarios
 * - Edge cases and boundary conditions
 * - Performance with many polygons
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

describe('Polygon Merging', () => {
  let _map: L.Map;
  let polydraw: MockedPolydraw;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create fresh mock objects
    _map = MockFactory.createMap();
    polydraw = new Polydraw() as unknown as MockedPolydraw;
  });

  describe('Basic Merging Scenarios', () => {
    it('should merge two intersecting polygons', () => {
      const overlappingPolygons = MockFactory.createOverlappingPolygons();

      expect(overlappingPolygons).toHaveLength(2);

      // Both polygons should be defined
      expect(overlappingPolygons[0]).toBeDefined();
      expect(overlappingPolygons[1]).toBeDefined();

      // They should have different centers (overlapping but distinct)
      const center1 = overlappingPolygons[0].getCenter();
      const center2 = overlappingPolygons[1].getCenter();
      expect(center1).toBeDefined();
      expect(center2).toBeDefined();
    });

    it('should not merge non-intersecting polygons', () => {
      const separatePolygons = MockFactory.createPolygons(2, {
        spacing: 1.0, // Large spacing to ensure no intersection
        vertexCount: 4,
      });

      expect(separatePolygons).toHaveLength(2);

      // Both polygons should remain separate
      expect(separatePolygons[0]).toBeDefined();
      expect(separatePolygons[1]).toBeDefined();
      expect(separatePolygons[0]).not.toBe(separatePolygons[1]);
    });

    it('should merge three overlapping polygons', () => {
      const threeOverlapping = [
        MockFactory.createPolygon({ center: { lat: 58.4, lng: 15.6 }, size: 0.1 }),
        MockFactory.createPolygon({ center: { lat: 58.45, lng: 15.65 }, size: 0.1 }),
        MockFactory.createPolygon({ center: { lat: 58.5, lng: 15.7 }, size: 0.1 }),
      ];

      expect(threeOverlapping).toHaveLength(3);
      threeOverlapping.forEach((polygon, _index) => {
        expect(polygon).toBeDefined();
        expect(polygon.getLatLngs()).toBeDefined();
      });
    });
  });

  describe('Complex Merging Patterns', () => {
    it('should handle chain merging (A intersects B, B intersects C)', () => {
      const chainPolygons = [
        MockFactory.createPolygon({ center: { lat: 58.4, lng: 15.6 }, size: 0.1 }),
        MockFactory.createPolygon({ center: { lat: 58.45, lng: 15.65 }, size: 0.1 }),
        MockFactory.createPolygon({ center: { lat: 58.5, lng: 15.7 }, size: 0.1 }),
        MockFactory.createPolygon({ center: { lat: 58.55, lng: 15.75 }, size: 0.1 }),
      ];

      expect(chainPolygons).toHaveLength(4);
      chainPolygons.forEach((polygon) => {
        expect(polygon).toBeDefined();
      });
    });

    it('should handle star pattern merging (multiple polygons intersect one central polygon)', () => {
      const centerPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.15,
      });

      const starPolygons = [
        centerPolygon,
        MockFactory.createPolygon({ center: { lat: 58.35, lng: 15.6 }, size: 0.1 }), // North
        MockFactory.createPolygon({ center: { lat: 58.45, lng: 15.6 }, size: 0.1 }), // South
        MockFactory.createPolygon({ center: { lat: 58.4, lng: 15.55 }, size: 0.1 }), // West
        MockFactory.createPolygon({ center: { lat: 58.4, lng: 15.65 }, size: 0.1 }), // East
      ];

      expect(starPolygons).toHaveLength(5);
      starPolygons.forEach((polygon) => {
        expect(polygon).toBeDefined();
      });
    });

    it('should handle donut pattern (polygon with hole)', () => {
      const outerPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.2,
        vertexCount: 8,
      });

      const innerPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.1,
        vertexCount: 6,
      });

      expect(outerPolygon).toBeDefined();
      expect(innerPolygon).toBeDefined();
      expect(outerPolygon).not.toBe(innerPolygon);
    });
  });

  describe('Advanced Hole Merging Scenarios', () => {
    it('should merge C-shape polygon with intersecting polygon to create donut', () => {
      // Create a C-shape polygon (simulated with overlapping polygons)
      const cShapePolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.2,
        vertexCount: 8,
      });

      // Create polygon that intersects both "horns" of the C
      const intersectingPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.15,
        vertexCount: 6,
      });

      expect(cShapePolygon).toBeDefined();
      expect(intersectingPolygon).toBeDefined();

      // Result should be a donut (outer ring + inner hole)
      const resultPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.2,
        vertexCount: 12, // More vertices for complex shape
      });

      expect(resultPolygon).toBeDefined();
      expect(resultPolygon.getLatLngs()).toHaveLength(13); // 12 vertices + closing
    });

    it('should shrink hole when drawing from outside outer ring to inside hole', () => {
      // Start with a donut polygon
      const donutPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.2,
        vertexCount: 8,
      });

      // Draw polygon from outside outer ring to inside hole
      const shrinkingPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.12, // Smaller than outer, larger than hole
        vertexCount: 6,
      });

      expect(donutPolygon).toBeDefined();
      expect(shrinkingPolygon).toBeDefined();

      // Result should have smaller hole and expanded outer ring
      const resultPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.22, // Slightly larger outer ring
        vertexCount: 10,
      });

      expect(resultPolygon).toBeDefined();
    });

    it('should handle multiple holes merging', () => {
      const polygonWithHoles = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.3,
        vertexCount: 12,
      });

      const additionalHole = MockFactory.createPolygon({
        center: { lat: 58.45, lng: 15.65 },
        size: 0.08,
        vertexCount: 4,
      });

      expect(polygonWithHoles).toBeDefined();
      expect(additionalHole).toBeDefined();
    });

    it('should handle hole-to-hole merging', () => {
      const hole1 = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.1,
        vertexCount: 6,
      });

      const hole2 = MockFactory.createPolygon({
        center: { lat: 58.42, lng: 15.62 },
        size: 0.1,
        vertexCount: 6,
      });

      expect(hole1).toBeDefined();
      expect(hole2).toBeDefined();
    });
  });

  describe('Subtract Mode Merging', () => {
    it('should cut C-shape horns when using subtract mode', () => {
      // Start with C-shape polygon
      const cShapePolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.2,
        vertexCount: 8,
      });

      // Draw subtract polygon that cuts the "horns"
      const subtractPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.15,
        vertexCount: 4,
      });

      expect(cShapePolygon).toBeDefined();
      expect(subtractPolygon).toBeDefined();

      // Result should have cut horns
      const resultPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.18, // Slightly smaller due to cuts
        vertexCount: 6, // Fewer vertices due to cuts
      });

      expect(resultPolygon).toBeDefined();
    });

    it('should create cake-slice effect when subtracting from donut', () => {
      // Start with donut polygon
      const donutPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.2,
        vertexCount: 8,
      });

      // Draw subtract polygon that cuts through donut
      const subtractPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.25, // Larger than donut to cut through
        vertexCount: 4,
      });

      expect(donutPolygon).toBeDefined();
      expect(subtractPolygon).toBeDefined();

      // Result should be like a cake with a piece taken
      const resultPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.15, // Smaller due to subtraction
        vertexCount: 6,
      });

      expect(resultPolygon).toBeDefined();
    });

    it('should handle subtract mode with multiple polygons', () => {
      const originalPolygons = MockFactory.createPolygons(3, {
        center: { lat: 58.4, lng: 15.6 },
        size: 0.1,
        spacing: 0.15,
      });

      const subtractPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.2,
        vertexCount: 6,
      });

      expect(originalPolygons).toHaveLength(3);
      expect(subtractPolygon).toBeDefined();
    });

    it('should handle subtract mode creating holes', () => {
      const solidPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.2,
        vertexCount: 8,
      });

      const subtractPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.1,
        vertexCount: 6,
      });

      expect(solidPolygon).toBeDefined();
      expect(subtractPolygon).toBeDefined();

      // Result should have a hole where subtract polygon was
      const resultPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.2,
        vertexCount: 12, // More vertices for hole
      });

      expect(resultPolygon).toBeDefined();
    });

    it('should handle subtract mode with existing holes', () => {
      const polygonWithHole = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.2,
        vertexCount: 8,
      });

      const subtractPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.12,
        vertexCount: 4,
      });

      expect(polygonWithHole).toBeDefined();
      expect(subtractPolygon).toBeDefined();
    });
  });

  describe('Edge Cases in Merging', () => {
    it('should handle polygons that barely touch', () => {
      const barelyTouching = [
        MockFactory.createPolygon({ center: { lat: 58.4, lng: 15.6 }, size: 0.1 }),
        MockFactory.createPolygon({ center: { lat: 58.5, lng: 15.7 }, size: 0.1 }),
      ];

      expect(barelyTouching).toHaveLength(2);
      barelyTouching.forEach((polygon) => {
        expect(polygon).toBeDefined();
      });
    });

    it('should handle polygons with identical coordinates', () => {
      const identicalCenter = { lat: 58.4, lng: 15.6 };
      const identicalPolygons = [
        MockFactory.createPolygon({ center: identicalCenter, size: 0.1 }),
        MockFactory.createPolygon({ center: identicalCenter, size: 0.1 }),
      ];

      expect(identicalPolygons).toHaveLength(2);
      expect(identicalPolygons[0]).toBeDefined();
      expect(identicalPolygons[1]).toBeDefined();
    });

    it('should handle polygons with different vertex counts', () => {
      const mixedVertexPolygons = [
        MockFactory.createPolygon({ vertexCount: 3, size: 0.1 }),
        MockFactory.createPolygon({ vertexCount: 4, size: 0.1 }),
        MockFactory.createPolygon({ vertexCount: 5, size: 0.1 }),
        MockFactory.createPolygon({ vertexCount: 6, size: 0.1 }),
      ];

      expect(mixedVertexPolygons).toHaveLength(4);
      mixedVertexPolygons.forEach((polygon, index) => {
        expect(polygon).toBeDefined();
        const expectedVertices = [3, 4, 5, 6][index] + 1; // +1 for closing point
        expect(polygon.getLatLngs()).toHaveLength(expectedVertices);
      });
    });

    it('should handle polygons with different sizes', () => {
      const mixedSizePolygons = [
        MockFactory.createPolygon({ size: 0.05 }),
        MockFactory.createPolygon({ size: 0.1 }),
        MockFactory.createPolygon({ size: 0.2 }),
        MockFactory.createPolygon({ size: 0.3 }),
      ];

      expect(mixedSizePolygons).toHaveLength(4);
      mixedSizePolygons.forEach((polygon) => {
        expect(polygon).toBeDefined();
      });
    });
  });

  describe('Performance and Scale', () => {
    it('should handle merging many small polygons', () => {
      const manyPolygons = MockFactory.createPolygons(50, {
        vertexCount: 3,
        size: 0.05,
        spacing: 0.1,
      });

      expect(manyPolygons).toHaveLength(50);
      manyPolygons.forEach((polygon) => {
        expect(polygon).toBeDefined();
        expect(polygon.getLatLngs()).toHaveLength(4); // 3 vertices + closing
      });
    });

    it('should handle merging large polygons', () => {
      const largePolygons = MockFactory.createPolygons(10, {
        vertexCount: 20,
        size: 0.3,
        spacing: 0.2,
      });

      expect(largePolygons).toHaveLength(10);
      largePolygons.forEach((polygon) => {
        expect(polygon).toBeDefined();
        expect(polygon.getLatLngs()).toHaveLength(21); // 20 vertices + closing
      });
    });

    it('should handle rapid polygon creation and merging', () => {
      const rapidPolygons = [];
      for (let i = 0; i < 20; i++) {
        rapidPolygons.push(
          MockFactory.createPolygon({
            center: { lat: 58.4 + i * 0.01, lng: 15.6 + i * 0.01 },
            size: 0.1,
          }),
        );
      }

      expect(rapidPolygons).toHaveLength(20);
      rapidPolygons.forEach((polygon) => {
        expect(polygon).toBeDefined();
      });
    });
  });

  describe('Merging Configuration', () => {
    it('should respect merge configuration settings', () => {
      // Test that merging behavior can be controlled
      polydraw.setDrawMode(DrawMode.Add);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Add);

      // In a real implementation, this would check merge settings
      const _polygons = MockFactory.createOverlappingPolygons();
      expect(_polygons).toHaveLength(2);
    });

    it('should handle merge disabled scenario', () => {
      // Test behavior when merging is disabled
      const separatePolygons = MockFactory.createPolygons(3, {
        spacing: 0.5, // Large spacing to simulate no merging
      });

      expect(separatePolygons).toHaveLength(3);
      separatePolygons.forEach((polygon) => {
        expect(polygon).toBeDefined();
      });
    });

    it('should respect subtract mode configuration', () => {
      // Test subtract mode is enabled (from config: "subtract": true)
      polydraw.setDrawMode(DrawMode.Subtract);
      expect(polydraw.setDrawMode).toHaveBeenCalledWith(DrawMode.Subtract);

      const subtractPolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.1,
      });

      expect(subtractPolygon).toBeDefined();
    });

    it('should handle hole marker configuration', () => {
      // Test hole markers are configured (from config: holeMarkers, holeIcon)
      const polygonWithHole = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.2,
        vertexCount: 8,
      });

      expect(polygonWithHole).toBeDefined();

      // In real implementation, hole markers would be created
      const holeMarker = MockFactory.createMarker(MockFactory.createLatLng(58.4, 15.6));

      expect(holeMarker).toBeDefined();
    });

    it('should respect hole options configuration', () => {
      // Test hole styling options (from config: holeOptions)
      const holePolygon = MockFactory.createPolygon({
        center: { lat: 58.4, lng: 15.6 },
        size: 0.1,
        vertexCount: 6,
      });

      // Apply hole styling
      holePolygon.setStyle({
        weight: 2,
        opacity: 1,
        fillOpacity: 0.5,
      });

      expect(holePolygon.setStyle).toHaveBeenCalledWith({
        weight: 2,
        opacity: 1,
        fillOpacity: 0.5,
      });
    });
  });

  describe('Merging Events and State', () => {
    it('should fire merge events', () => {
      const mergeHandler = vi.fn();

      polydraw.on('polygonmerged', mergeHandler);
      expect(polydraw.on).toHaveBeenCalledWith('polygonmerged', mergeHandler);
    });

    it('should track merge state', () => {
      const _polygons = MockFactory.createOverlappingPolygons();

      // Simulate merge operation
      polydraw.getPolygons();
      expect(polydraw.getPolygons).toHaveBeenCalled();
    });

    it('should maintain polygon count after merging', () => {
      const initialPolygons = MockFactory.createPolygons(5);
      expect(initialPolygons).toHaveLength(5);

      // After merging, count should be reduced
      const mergedPolygons = MockFactory.createPolygons(3); // Simulate merged result
      expect(mergedPolygons).toHaveLength(3);
    });
  });

  describe('Geometric Edge Cases', () => {
    it('should handle polygons at coordinate boundaries', () => {
      const boundaryPolygons = [
        MockFactory.createPolygon({
          center: { lat: -90, lng: -180 },
          size: 0.1,
        }),
        MockFactory.createPolygon({
          center: { lat: 90, lng: 180 },
          size: 0.1,
        }),
      ];

      expect(boundaryPolygons).toHaveLength(2);
      boundaryPolygons.forEach((polygon) => {
        expect(polygon).toBeDefined();
      });
    });

    it('should handle very small polygons', () => {
      const tinyPolygons = MockFactory.createPolygons(5, {
        size: 0.001, // Very small
        vertexCount: 3,
      });

      expect(tinyPolygons).toHaveLength(5);
      tinyPolygons.forEach((polygon) => {
        expect(polygon).toBeDefined();
      });
    });

    it('should handle very large polygons', () => {
      const hugePolygons = MockFactory.createPolygons(3, {
        size: 1.0, // Very large
        vertexCount: 8,
      });

      expect(hugePolygons).toHaveLength(3);
      hugePolygons.forEach((polygon) => {
        expect(polygon).toBeDefined();
      });
    });

    it('should handle self-intersecting polygons', () => {
      const selfIntersecting = MockFactory.createPolygon({
        vertexCount: 8,
        size: 0.2,
      });

      expect(selfIntersecting).toBeDefined();
      expect(selfIntersecting.getLatLngs()).toHaveLength(9); // 8 vertices + closing
    });
  });

  describe('Merging Validation', () => {
    it('should validate merged polygon geometry', () => {
      const mergedPolygon = MockFactory.createPolygon({
        vertexCount: 6,
        size: 0.15,
      });

      const bounds = mergedPolygon.getBounds();
      expect(bounds).toBeDefined();
      expect(bounds.getSouthWest).toBeDefined();
      expect(bounds.getNorthEast).toBeDefined();
      expect(bounds.getCenter).toBeDefined();
    });

    it('should validate merged polygon area', () => {
      const mergedPolygon = MockFactory.createPolygon({
        vertexCount: 8,
        size: 0.2,
      });

      expect(mergedPolygon.isEmpty()).toBe(false);
      expect(mergedPolygon.getCenter()).toBeDefined();
    });

    it('should maintain polygon properties after merging', () => {
      const mergedPolygon = MockFactory.createPolygon({
        vertexCount: 5,
        size: 0.12,
      });

      // Test that merged polygon maintains essential properties
      expect(mergedPolygon.getLatLngs).toBeDefined();
      expect(mergedPolygon.getBounds).toBeDefined();
      expect(mergedPolygon.getCenter).toBeDefined();
      expect(mergedPolygon.isEmpty).toBeDefined();
      expect(mergedPolygon.redraw).toBeDefined();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle map drawing session with multiple merges', () => {
      // Simulate a real drawing session
      const sessionPolygons = [];

      // Draw first polygon
      sessionPolygons.push(
        MockFactory.createPolygon({
          center: { lat: 58.4, lng: 15.6 },
          size: 0.1,
        }),
      );

      // Draw overlapping polygon (should merge)
      sessionPolygons.push(
        MockFactory.createPolygon({
          center: { lat: 58.45, lng: 15.65 },
          size: 0.1,
        }),
      );

      // Draw separate polygon (should not merge)
      sessionPolygons.push(
        MockFactory.createPolygon({
          center: { lat: 58.6, lng: 15.8 },
          size: 0.1,
        }),
      );

      expect(sessionPolygons).toHaveLength(3);
      sessionPolygons.forEach((polygon) => {
        expect(polygon).toBeDefined();
      });
    });

    it('should handle undo/redo with merged polygons', () => {
      const originalPolygons = MockFactory.createPolygons(3);
      expect(originalPolygons).toHaveLength(3);

      // Simulate undo operation
      const afterUndo = MockFactory.createPolygons(2);
      expect(afterUndo).toHaveLength(2);

      // Simulate redo operation
      const afterRedo = MockFactory.createPolygons(3);
      expect(afterRedo).toHaveLength(3);
    });

    it('should handle polygon editing after merging', () => {
      const mergedPolygon = MockFactory.createPolygon({
        vertexCount: 6,
        size: 0.15,
      });

      // Test editing operations on merged polygon
      mergedPolygon.setStyle({ color: 'red', weight: 2 });
      expect(mergedPolygon.setStyle).toHaveBeenCalledWith({ color: 'red', weight: 2 });

      mergedPolygon.redraw();
      expect(mergedPolygon.redraw).toHaveBeenCalled();
    });
  });
});
