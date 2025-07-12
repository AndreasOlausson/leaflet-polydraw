import { describe, it, expect, vi } from 'vitest';
import { MarkerManager } from '../src/managers/marker-manager';
import { TurfHelper } from '../src/turf-helper';
import * as L from 'leaflet';

describe('Edge Drag Regression Tests', () => {
  describe('Edge Dragging After Polygon Movement', () => {
    it('should handle edge dragging after polygon has been moved (regression test)', () => {
      // Setup
      const mockConfig = {
        modes: { dragElbow: true },
        markers: {
          markerIcon: { styleClasses: ['test-marker'], zIndexOffset: 1000 },
          markerMenuIcon: { position: 'N', styleClasses: ['test-menu'], zIndexOffset: 1000 },
          markerDeleteIcon: { position: 'S', styleClasses: ['test-delete'], zIndexOffset: 1000 },
          markerInfoIcon: { position: 'E', styleClasses: ['test-info'], zIndexOffset: 1000 },
          holeIcon: { styleClasses: ['test-hole'], zIndexOffset: 1000 },
          zIndexOffset: 1000,
          coordsTitle: true,
          menuMarker: true,
          deleteMarker: true,
          infoMarker: true,
        },
      };

      const mockTurfHelper = {
        hasKinks: vi.fn().mockReturnValue(false),
        getKinks: vi.fn().mockReturnValue([]),
        getTurfPolygon: vi.fn().mockReturnValue({}),
      };

      const mockMap = {
        removeLayer: vi.fn(),
      };

      const markerManager = new MarkerManager(
        mockConfig as any,
        mockTurfHelper as any,
        mockMap as any,
      );

      // Create a polygon with holes (simulating a split polygon)
      const polygonWithHoles = {
        getLatLngs: () => [
          [
            [
              { lat: 0, lng: 0 },
              { lat: 0, lng: 10 },
              { lat: 10, lng: 10 },
              { lat: 10, lng: 0 },
              { lat: 0, lng: 0 },
            ],
            [
              { lat: 3, lng: 3 },
              { lat: 3, lng: 7 },
              { lat: 7, lng: 7 },
              { lat: 7, lng: 3 },
              { lat: 3, lng: 3 },
            ],
          ],
        ],
        _polydrawOriginalStructure: [
          [
            [
              { lat: 0, lng: 0 },
              { lat: 0, lng: 10 },
              { lat: 10, lng: 10 },
              { lat: 10, lng: 0 },
              { lat: 0, lng: 0 },
            ],
            [
              { lat: 3, lng: 3 },
              { lat: 3, lng: 7 },
              { lat: 7, lng: 7 },
              { lat: 7, lng: 3 },
              { lat: 3, lng: 3 },
            ],
          ],
        ],
        _polydrawOptimizationLevel: 0,
      };

      // Create mock markers for all vertices (outer ring + hole)
      const mockMarkers = [
        // Outer ring markers
        { getLatLng: () => ({ lat: 0, lng: 0 }), constructor: { name: 'Marker' } },
        { getLatLng: () => ({ lat: 0, lng: 10 }), constructor: { name: 'Marker' } },
        { getLatLng: () => ({ lat: 10, lng: 10 }), constructor: { name: 'Marker' } },
        { getLatLng: () => ({ lat: 10, lng: 0 }), constructor: { name: 'Marker' } },
        { getLatLng: () => ({ lat: 0, lng: 0 }), constructor: { name: 'Marker' } },
        // Hole markers
        { getLatLng: () => ({ lat: 3, lng: 3 }), constructor: { name: 'Marker' } },
        { getLatLng: () => ({ lat: 3, lng: 7 }), constructor: { name: 'Marker' } },
        { getLatLng: () => ({ lat: 7, lng: 7 }), constructor: { name: 'Marker' } },
        { getLatLng: () => ({ lat: 7, lng: 3 }), constructor: { name: 'Marker' } },
        { getLatLng: () => ({ lat: 3, lng: 3 }), constructor: { name: 'Marker' } },
      ];

      // Make mock objects pass instanceof checks
      Object.setPrototypeOf(polygonWithHoles, L.Polygon.prototype);
      mockMarkers.forEach((marker) => {
        Object.setPrototypeOf(marker, L.Marker.prototype);
      });

      const mockFeatureGroup = {
        getLayers: () => [polygonWithHoles, ...mockMarkers],
      };

      // Mock callbacks
      const onPolygonInfoDelete = vi.fn();
      const onFeatureGroupRemove = vi.fn();
      let capturedGeoJSON: any = null;
      let preservedStructure = false;

      const onPolygonLayerAdd = vi.fn((geoJSON, simplify, dynamicTolerance, optimizationLevel) => {
        capturedGeoJSON = geoJSON;
        // Check if the original structure was preserved
        if ((geoJSON as any)._polydrawOriginalStructure) {
          preservedStructure = true;
        }
      });
      const onPolygonInfoCreate = vi.fn();

      // Test: First edge drag (should work)
      expect(() => {
        markerManager.handleMarkerDragEnd(
          mockFeatureGroup as any,
          onPolygonInfoDelete,
          onFeatureGroupRemove,
          onPolygonLayerAdd,
          onPolygonInfoCreate,
        );
      }).not.toThrow();

      // Verify the structure was preserved
      expect(preservedStructure).toBe(true);
      expect(capturedGeoJSON).toBeDefined();
      expect(onPolygonLayerAdd).toHaveBeenCalled();

      // Reset for second test
      capturedGeoJSON = null;
      preservedStructure = false;
      onPolygonLayerAdd.mockClear();

      // Test: Second edge drag (this used to fail before the fix)
      // Simulate the polygon now having the preserved structure from the first operation
      const updatedPolygon = {
        ...polygonWithHoles,
        _polydrawOriginalStructure: polygonWithHoles._polydrawOriginalStructure,
      };

      const updatedFeatureGroup = {
        getLayers: () => [updatedPolygon, ...mockMarkers],
      };

      expect(() => {
        markerManager.handleMarkerDragEnd(
          updatedFeatureGroup as any,
          onPolygonInfoDelete,
          onFeatureGroupRemove,
          onPolygonLayerAdd,
          onPolygonInfoCreate,
        );
      }).not.toThrow();

      // Verify the structure was preserved again
      expect(preservedStructure).toBe(true);
      expect(capturedGeoJSON).toBeDefined();
      expect(onPolygonLayerAdd).toHaveBeenCalled();
    });

    it('should handle edge dragging on simple polygons after movement', () => {
      // Setup for simple polygon (no holes)
      const mockConfig = {
        modes: { dragElbow: true },
        markers: {
          markerIcon: { styleClasses: ['test-marker'], zIndexOffset: 1000 },
          markerMenuIcon: { position: 'N', styleClasses: ['test-menu'], zIndexOffset: 1000 },
          markerDeleteIcon: { position: 'S', styleClasses: ['test-delete'], zIndexOffset: 1000 },
          markerInfoIcon: { position: 'E', styleClasses: ['test-info'], zIndexOffset: 1000 },
          zIndexOffset: 1000,
          coordsTitle: true,
          menuMarker: true,
          deleteMarker: true,
          infoMarker: true,
        },
      };

      const mockTurfHelper = {
        hasKinks: vi.fn().mockReturnValue(false),
        getKinks: vi.fn().mockReturnValue([]),
        getTurfPolygon: vi.fn().mockReturnValue({}),
      };

      const mockMap = {
        removeLayer: vi.fn(),
      };

      const markerManager = new MarkerManager(
        mockConfig as any,
        mockTurfHelper as any,
        mockMap as any,
      );

      // Create a simple polygon (no holes)
      const simplePolygon = {
        getLatLngs: () => [
          { lat: 0, lng: 0 },
          { lat: 0, lng: 10 },
          { lat: 10, lng: 10 },
          { lat: 10, lng: 0 },
          { lat: 0, lng: 0 },
        ],
        _polydrawOriginalStructure: [
          [
            { lat: 0, lng: 0 },
            { lat: 0, lng: 10 },
            { lat: 10, lng: 10 },
            { lat: 10, lng: 0 },
            { lat: 0, lng: 0 },
          ],
        ],
        _polydrawOptimizationLevel: 0,
      };

      // Create mock markers for vertices
      const mockMarkers = [
        { getLatLng: () => ({ lat: 0, lng: 0 }), constructor: { name: 'Marker' } },
        { getLatLng: () => ({ lat: 0, lng: 10 }), constructor: { name: 'Marker' } },
        { getLatLng: () => ({ lat: 10, lng: 10 }), constructor: { name: 'Marker' } },
        { getLatLng: () => ({ lat: 10, lng: 0 }), constructor: { name: 'Marker' } },
        { getLatLng: () => ({ lat: 0, lng: 0 }), constructor: { name: 'Marker' } },
      ];

      // Make mock objects pass instanceof checks
      Object.setPrototypeOf(simplePolygon, L.Polygon.prototype);
      mockMarkers.forEach((marker) => {
        Object.setPrototypeOf(marker, L.Marker.prototype);
      });

      const mockFeatureGroup = {
        getLayers: () => [simplePolygon, ...mockMarkers],
      };

      // Mock callbacks
      const onPolygonInfoDelete = vi.fn();
      const onFeatureGroupRemove = vi.fn();
      let capturedGeoJSON: any = null;
      let preservedStructure = false;

      const onPolygonLayerAdd = vi.fn((geoJSON, simplify, dynamicTolerance, optimizationLevel) => {
        capturedGeoJSON = geoJSON;
        if ((geoJSON as any)._polydrawOriginalStructure) {
          preservedStructure = true;
        }
      });
      const onPolygonInfoCreate = vi.fn();

      // Test: Multiple edge drags should all work
      for (let i = 0; i < 3; i++) {
        expect(() => {
          markerManager.handleMarkerDragEnd(
            mockFeatureGroup as any,
            onPolygonInfoDelete,
            onFeatureGroupRemove,
            onPolygonLayerAdd,
            onPolygonInfoCreate,
          );
        }).not.toThrow();

        expect(preservedStructure).toBe(true);
        expect(capturedGeoJSON).toBeDefined();

        // Reset for next iteration
        capturedGeoJSON = null;
        preservedStructure = false;
        onPolygonLayerAdd.mockClear();
      }
    });
  });
});
