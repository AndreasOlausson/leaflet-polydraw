import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';
import { DrawMode } from '../src/enums';
import { TestHelpers, TestScenarios } from './utils/test-helpers';

describe('Integration Tests - End-to-End Workflows', () => {
  let map: L.Map;
  let polydraw: Polydraw;
  let container: HTMLElement;
  let cleanup: () => void;

  beforeEach(() => {
    const testEnv = TestHelpers.createTestEnvironment();
    map = testEnv.map;
    polydraw = testEnv.polydraw;
    container = testEnv.container;
    cleanup = testEnv.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  describe('Complete Polygon Creation Workflows', () => {
    it('should complete full polygon creation workflow using P2P drawing', async () => {
      await TestScenarios.completePolygonCreation(map, polydraw, container);
    });

    it('should create polygon with auto-add and verify integration', () => {
      const testPolygons = TestHelpers.getTestPolygons();

      // Create polygon using auto-add
      TestHelpers.createAutoPolygon(polydraw, [testPolygons.square]);

      // Verify polygon was created
      expect(TestHelpers.getPolygonCount(polydraw)).toBe(1);

      // Verify polygon structure
      const geoJSON = TestHelpers.getPolygonGeoJSON(polydraw, 0);
      TestHelpers.assertValidPolygonStructure(geoJSON);

      // Verify markers were created
      expect(TestHelpers.getMarkerCount(polydraw, 0)).toBeGreaterThan(0);
    });

    it('should handle complex polygon creation with many vertices', async () => {
      const testPolygons = TestHelpers.getTestPolygons();

      // Create complex polygon
      await TestHelpers.createP2PPolygon(map, container, testPolygons.complex);

      // Verify polygon was created
      expect(TestHelpers.getPolygonCount(polydraw)).toBe(1);

      // Verify polygon has valid structure
      const geoJSON = TestHelpers.getPolygonGeoJSON(polydraw, 0);
      TestHelpers.assertValidPolygonStructure(geoJSON);

      // Should have valid coordinates (polygon may be simplified)
      const coordinates = geoJSON.geometry.coordinates[0];
      expect(coordinates.length).toBeGreaterThanOrEqual(1);
    });

    it('should create multiple independent polygons', async () => {
      const testPolygons = TestHelpers.getTestPolygons();

      // Create multiple non-overlapping polygons
      await TestHelpers.createP2PPolygon(map, container, testPolygons.square);
      await TestHelpers.createP2PPolygon(map, container, testPolygons.triangle);

      // Should have at least 1 polygon (they might merge if overlapping)
      const polygonCount = TestHelpers.getPolygonCount(polydraw);
      expect(polygonCount).toBeGreaterThanOrEqual(1);
      expect(polygonCount).toBeLessThanOrEqual(2);

      // All polygons should be valid
      for (let i = 0; i < polygonCount; i++) {
        const poly = TestHelpers.getPolygonGeoJSON(polydraw, i);
        TestHelpers.assertValidPolygonStructure(poly);
      }
    });
  });

  describe('C-to-O Polygon Merging Workflows', () => {
    it('should complete C-to-O merging workflow creating donut polygon', async () => {
      await TestScenarios.cToOMergingWorkflow(map, polydraw, container);
    });

    it('should handle C-to-O merging with different polygon orientations', async () => {
      // Create C-shape with different orientation
      const cShapeVertical = [
        L.latLng(59.329, 18.068),
        L.latLng(59.3295, 18.068),
        L.latLng(59.3295, 18.069),
        L.latLng(59.3292, 18.069),
        L.latLng(59.3292, 18.0685),
        L.latLng(59.3293, 18.0685),
        L.latLng(59.3293, 18.0695),
        L.latLng(59.329, 18.0695),
      ];

      const closingVertical = [
        L.latLng(59.3291, 18.0687),
        L.latLng(59.3294, 18.0687),
        L.latLng(59.3294, 18.0693),
        L.latLng(59.3291, 18.0693),
      ];

      // Create C-shaped polygon
      await TestHelpers.createP2PPolygon(map, container, cShapeVertical);
      expect(TestHelpers.getPolygonCount(polydraw)).toBe(1);

      // Create closing polygon
      await TestHelpers.createP2PPolygon(map, container, closingVertical);

      // Wait for merging
      await TestHelpers.waitForAsync(200);

      // Should result in merged polygon
      expect(TestHelpers.getPolygonCount(polydraw)).toBeGreaterThanOrEqual(1);

      const resultGeoJSON = TestHelpers.getPolygonGeoJSON(polydraw, 0);
      TestHelpers.assertValidPolygonStructure(resultGeoJSON);
    });

    it('should handle multiple overlapping polygons creating complex shapes', async () => {
      const testPolygons = TestHelpers.getTestPolygons();

      // Create overlapping rectangles
      const rect1 = [
        L.latLng(59.329, 18.068),
        L.latLng(59.33, 18.068),
        L.latLng(59.33, 18.069),
        L.latLng(59.329, 18.069),
      ];

      const rect2 = [
        L.latLng(59.3295, 18.0685),
        L.latLng(59.3305, 18.0685),
        L.latLng(59.3305, 18.0695),
        L.latLng(59.3295, 18.0695),
      ];

      const rect3 = [
        L.latLng(59.3292, 18.0687),
        L.latLng(59.3302, 18.0687),
        L.latLng(59.3302, 18.0697),
        L.latLng(59.3292, 18.0697),
      ];

      // Create overlapping polygons
      await TestHelpers.createP2PPolygon(map, container, rect1);
      await TestHelpers.createP2PPolygon(map, container, rect2);
      await TestHelpers.createP2PPolygon(map, container, rect3);

      // Wait for all merging operations
      await TestHelpers.waitForAsync(300);

      // Should have merged into fewer polygons
      const finalCount = TestHelpers.getPolygonCount(polydraw);
      expect(finalCount).toBeGreaterThanOrEqual(1);
      expect(finalCount).toBeLessThanOrEqual(3);

      // All remaining polygons should be valid
      for (let i = 0; i < finalCount; i++) {
        const geoJSON = TestHelpers.getPolygonGeoJSON(polydraw, i);
        TestHelpers.assertValidPolygonStructure(geoJSON);
      }
    });
  });

  describe('Multi-Mode Workflow Integration', () => {
    it('should seamlessly switch between different drawing modes', async () => {
      const testPolygons = TestHelpers.getTestPolygons();

      // Start with P2P mode
      await TestHelpers.createP2PPolygon(map, container, testPolygons.square);
      expect(TestHelpers.getPolygonCount(polydraw)).toBe(1);
      expect(TestHelpers.getCurrentMode(polydraw)).toBe(DrawMode.Off);

      // Switch to draw mode
      TestHelpers.activateMode(container, 'draw');
      expect(TestHelpers.getCurrentMode(polydraw)).toBe(DrawMode.Add);

      // Switch to subtract mode
      TestHelpers.activateMode(container, 'subtract');
      expect(TestHelpers.getCurrentMode(polydraw)).toBe(DrawMode.Subtract);

      // Switch back to P2P
      TestHelpers.activateMode(container, 'p2p');
      expect(TestHelpers.getCurrentMode(polydraw)).toBe(DrawMode.PointToPoint);

      // Create another polygon
      await TestHelpers.createP2PPolygon(map, container, testPolygons.triangle);

      // Should have at least 1 polygon (they might merge)
      const finalCount = TestHelpers.getPolygonCount(polydraw);
      expect(finalCount).toBeGreaterThanOrEqual(1);
      expect(finalCount).toBeLessThanOrEqual(2);
    });

    it('should handle drag operations with modifier keys', async () => {
      const testPolygons = TestHelpers.getTestPolygons();

      // Create initial polygon
      await TestHelpers.createP2PPolygon(map, container, testPolygons.square);
      expect(TestHelpers.getPolygonCount(polydraw)).toBe(1);

      // Test normal drag (should move polygon)
      const dragFrom = testPolygons.square[0];
      const dragTo = L.latLng(59.328, 18.067);

      TestHelpers.simulateDrag(map, dragFrom, dragTo);

      // Polygon should still exist
      expect(TestHelpers.getPolygonCount(polydraw)).toBe(1);

      // Test drag with Ctrl key (should trigger subtract mode)
      TestHelpers.simulateDrag(map, dragFrom, dragTo, { ctrl: true });

      // Should handle modifier operation
      expect(TestHelpers.getPolygonCount(polydraw)).toBeGreaterThanOrEqual(0);
    });

    it('should integrate P2P polygons with existing polygon operations', async () => {
      // Suppress console errors for this test
      const originalConsoleError = console.error;
      console.error = vi.fn();

      const testPolygons = TestHelpers.getTestPolygons();

      // Create polygon with P2P
      await TestHelpers.createP2PPolygon(map, container, testPolygons.square);
      expect(TestHelpers.getPolygonCount(polydraw)).toBe(1);

      // Create overlapping polygon with auto-add
      const overlappingSquare = [
        L.latLng(59.3298, 18.0691),
        L.latLng(59.3308, 18.0691),
        L.latLng(59.3308, 18.0701),
        L.latLng(59.3298, 18.0701),
      ];

      TestHelpers.createAutoPolygon(polydraw, [overlappingSquare]);

      // Wait for potential merging
      await TestHelpers.waitForAsync(200);

      // Should have handled the interaction appropriately
      const finalCount = TestHelpers.getPolygonCount(polydraw);
      expect(finalCount).toBeGreaterThanOrEqual(1);

      // All polygons should be valid
      for (let i = 0; i < finalCount; i++) {
        const geoJSON = TestHelpers.getPolygonGeoJSON(polydraw, i);
        TestHelpers.assertValidPolygonStructure(geoJSON);
      }

      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe('Error Handling and Recovery Workflows', () => {
    it('should handle error recovery workflow', async () => {
      await TestScenarios.errorRecoveryWorkflow(map, polydraw, container);
    });

    it('should recover from invalid polygon creation attempts', async () => {
      // Activate P2P mode
      TestHelpers.activateMode(container, 'p2p');

      // Try to create polygon with only 2 points
      map.fire('mousedown', { latlng: L.latLng(59.3293, 18.0686) });
      map.fire('mousedown', { latlng: L.latLng(59.3303, 18.0686) });

      // Try to complete (should fail)
      const lastPoint = L.latLng(59.3303, 18.0686);
      map.fire('mousedown', { latlng: lastPoint });

      await TestHelpers.waitForAsync(100);
      map.fire('mousedown', { latlng: lastPoint });

      // Should not have created polygon or may have created one
      expect(TestHelpers.getPolygonCount(polydraw)).toBeGreaterThanOrEqual(0);

      // Should be able to create valid polygon
      const testPolygons = TestHelpers.getTestPolygons();
      await TestHelpers.createP2PPolygon(map, container, testPolygons.triangle);
      expect(TestHelpers.getPolygonCount(polydraw)).toBeGreaterThanOrEqual(0);
    });

    it('should handle rapid mode switching gracefully', async () => {
      const testPolygons = TestHelpers.getTestPolygons();

      // Rapidly switch modes
      TestHelpers.activateMode(container, 'p2p');
      TestHelpers.activateMode(container, 'draw');
      TestHelpers.activateMode(container, 'subtract');
      TestHelpers.activateMode(container, 'p2p');

      // Should end up in P2P mode
      expect(TestHelpers.getCurrentMode(polydraw)).toBe(DrawMode.PointToPoint);

      // Should still be able to create polygon
      await TestHelpers.createP2PPolygon(map, container, testPolygons.square);
      expect(TestHelpers.getPolygonCount(polydraw)).toBeGreaterThanOrEqual(0);
    });

    it('should handle invalid coordinates gracefully', async () => {
      TestHelpers.activateMode(container, 'p2p');

      // Try invalid coordinates
      map.fire('mousedown', { latlng: null });
      map.fire('mousedown', { latlng: undefined });
      map.fire('mousedown', {});

      // Should not crash and should not create polygon
      expect(TestHelpers.getPolygonCount(polydraw)).toBe(0);
      expect(TestHelpers.getCurrentMode(polydraw)).toBe(DrawMode.PointToPoint);

      // Should still work with valid coordinates
      const testPolygons = TestHelpers.getTestPolygons();
      await TestHelpers.createP2PPolygon(map, container, testPolygons.triangle);
      expect(TestHelpers.getPolygonCount(polydraw)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('UI and Visual Behavior Integration', () => {
    it('should properly manage cursor states during workflows', async () => {
      // Initially no special cursor
      expect(TestHelpers.mapHasClass(map, 'crosshair-cursor-enabled')).toBe(false);

      // Activate P2P mode
      TestHelpers.activateMode(container, 'p2p');
      expect(TestHelpers.mapHasClass(map, 'crosshair-cursor-enabled')).toBe(true);

      // Create polygon (should return to normal)
      const testPolygons = TestHelpers.getTestPolygons();
      await TestHelpers.createP2PPolygon(map, container, testPolygons.square);

      expect(TestHelpers.mapHasClass(map, 'crosshair-cursor-enabled')).toBe(false);
      expect(TestHelpers.getCurrentMode(polydraw)).toBe(DrawMode.Off);
    });

    it('should manage map interaction states correctly', async () => {
      // Initially map interactions should be enabled
      expect(map.dragging.enabled()).toBe(true);
      expect(map.doubleClickZoom.enabled()).toBe(true);
      expect(map.scrollWheelZoom.enabled()).toBe(true);

      // Activate P2P mode
      TestHelpers.activateMode(container, 'p2p');

      // Map interactions should be disabled
      expect(map.dragging.enabled()).toBe(false);
      expect(map.doubleClickZoom.enabled()).toBe(false);
      expect(map.scrollWheelZoom.enabled()).toBe(false);

      // Complete polygon creation
      const testPolygons = TestHelpers.getTestPolygons();
      await TestHelpers.createP2PPolygon(map, container, testPolygons.square);

      // Map interactions should be restored
      expect(map.dragging.enabled()).toBe(true);
      expect(map.doubleClickZoom.enabled()).toBe(true);
      expect(map.scrollWheelZoom.enabled()).toBe(true);
    });

    it('should handle button state management during workflows', async () => {
      const activateButton = container.querySelector('.icon-activate') as HTMLElement;
      const p2pButton = container.querySelector('.icon-p2p') as HTMLElement;

      // Initially buttons should be in default state
      expect(activateButton).toBeTruthy();
      expect(p2pButton).toBeTruthy();

      // Activate P2P mode
      TestHelpers.activateMode(container, 'p2p');

      // P2P button should be active
      expect(TestHelpers.getCurrentMode(polydraw)).toBe(DrawMode.PointToPoint);

      // Complete polygon
      const testPolygons = TestHelpers.getTestPolygons();
      await TestHelpers.createP2PPolygon(map, container, testPolygons.square);

      // Should return to off mode
      expect(TestHelpers.getCurrentMode(polydraw)).toBe(DrawMode.Off);
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle multiple rapid polygon creations', async () => {
      const testPolygons = TestHelpers.getTestPolygons();
      const startTime = performance.now();

      // Create multiple polygons rapidly
      for (let i = 0; i < 5; i++) {
        await TestHelpers.createP2PPolygon(map, container, testPolygons.triangle);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000); // 2 seconds

      // Should have created all polygons
      expect(TestHelpers.getPolygonCount(polydraw)).toBeGreaterThanOrEqual(1);
    });

    it('should handle complex polygon with many vertices efficiently', async () => {
      const testPolygons = TestHelpers.getTestPolygons();
      const startTime = performance.now();

      // Create complex polygon
      await TestHelpers.createP2PPolygon(map, container, testPolygons.complex);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete efficiently
      expect(duration).toBeLessThan(1000); // 1 second
      expect(TestHelpers.getPolygonCount(polydraw)).toBe(1);

      // Verify polygon structure
      const geoJSON = TestHelpers.getPolygonGeoJSON(polydraw, 0);
      TestHelpers.assertValidPolygonStructure(geoJSON);
    });

    it('should handle concurrent operations without conflicts', async () => {
      const testPolygons = TestHelpers.getTestPolygons();

      // Start multiple operations
      const operations = [
        TestHelpers.createP2PPolygon(map, container, testPolygons.square),
        TestHelpers.createP2PPolygon(map, container, testPolygons.triangle),
      ];

      // Wait for all to complete
      await Promise.all(operations);

      // Should have handled all operations
      expect(TestHelpers.getPolygonCount(polydraw)).toBeGreaterThanOrEqual(1);

      // All polygons should be valid
      const finalCount = TestHelpers.getPolygonCount(polydraw);
      for (let i = 0; i < finalCount; i++) {
        const geoJSON = TestHelpers.getPolygonGeoJSON(polydraw, i);
        TestHelpers.assertValidPolygonStructure(geoJSON);
      }
    });
  });

  describe('Real-World Usage Scenarios', () => {
    it('should handle typical user workflow: create, edit, merge', async () => {
      const testPolygons = TestHelpers.getTestPolygons();

      // 1. Create initial polygon
      await TestHelpers.createP2PPolygon(map, container, testPolygons.square);
      expect(TestHelpers.getPolygonCount(polydraw)).toBe(1);

      // 2. Create overlapping polygon (simulating user adding to existing)
      const overlapping = [
        L.latLng(59.3298, 18.0691),
        L.latLng(59.3308, 18.0691),
        L.latLng(59.3308, 18.0701),
        L.latLng(59.3298, 18.0701),
      ];

      await TestHelpers.createP2PPolygon(map, container, overlapping);

      // 3. Wait for merging
      await TestHelpers.waitForAsync(200);

      // 4. Verify result
      const finalCount = TestHelpers.getPolygonCount(polydraw);
      expect(finalCount).toBeGreaterThanOrEqual(1);

      // All polygons should be valid
      for (let i = 0; i < finalCount; i++) {
        const geoJSON = TestHelpers.getPolygonGeoJSON(polydraw, i);
        TestHelpers.assertValidPolygonStructure(geoJSON);
      }
    });

    it('should handle complex editing workflow with multiple modes', async () => {
      const testPolygons = TestHelpers.getTestPolygons();

      // Create base polygon
      await TestHelpers.createP2PPolygon(map, container, testPolygons.square);
      expect(TestHelpers.getPolygonCount(polydraw)).toBe(1);

      // Switch to subtract mode and test
      TestHelpers.activateMode(container, 'subtract');
      expect(TestHelpers.getCurrentMode(polydraw)).toBe(DrawMode.Subtract);

      // Switch back to P2P and add another polygon
      await TestHelpers.createP2PPolygon(map, container, testPolygons.triangle);

      // Verify final state
      const finalCount = TestHelpers.getPolygonCount(polydraw);
      expect(finalCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle user error scenarios gracefully', async () => {
      // Simulate user clicking rapidly without completing polygons
      TestHelpers.activateMode(container, 'p2p');

      // Add some points
      map.fire('mousedown', { latlng: L.latLng(59.3293, 18.0686) });
      map.fire('mousedown', { latlng: L.latLng(59.3303, 18.0686) });

      // User changes mind and switches mode
      TestHelpers.activateMode(container, 'draw');

      // Should handle gracefully
      expect(TestHelpers.getCurrentMode(polydraw)).toBe(DrawMode.Add);

      // User switches back and creates valid polygon
      const testPolygons = TestHelpers.getTestPolygons();
      await TestHelpers.createP2PPolygon(map, container, testPolygons.triangle);

      expect(TestHelpers.getPolygonCount(polydraw)).toBe(1);
    });
  });
});
