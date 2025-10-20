import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../../src/polydraw';
import { createMockMap, createMockPolygon, createMockFeatureGroup } from './utils/mock-factory';

// Minimal Leaflet mock - only what's needed for module-level mocking
vi.mock('leaflet', async () => {
  const actual = await vi.importActual('leaflet');
  return {
    ...actual,
    Browser: { touch: false, mobile: false },
    Control: class {
      addTo() {
        return this;
      }
      onAdd() {
        return document.createElement('div');
      }
    },
    DomEvent: {
      stopPropagation: vi.fn(),
      disableClickPropagation: vi.fn(),
      on: vi.fn(() => ({ on: vi.fn() })), // Make it chainable
      stop: vi.fn(),
    },
    DomUtil: {
      create: vi.fn(() => document.createElement('div')),
      addClass: vi.fn(),
      removeClass: vi.fn(),
      hasClass: vi.fn(() => false),
    },
    control: { polydraw: vi.fn() },
  };
});

describe('Add Elbow Functionality', () => {
  let polydraw: Polydraw;
  let map: any;

  beforeEach(() => {
    map = createMockMap();
    // Create a custom config for these tests that enables attachElbow
    const testConfig = {
      modes: {
        p2p: true,
        attachElbow: true,
        dragElbow: false,
        dragPolygons: false,
        edgeDeletion: false,
      },
    };
    polydraw = new Polydraw({ config: testConfig as any });
    // Manually call onAdd to initialize the mutation manager, mimicking Leaflet's behavior
    (polydraw as any).onAdd(map);
    (polydraw as any).map = map;
  });

  describe('Basic Edge Click Methods', () => {
    it('should have addEdgeClickListeners method', () => {
      expect(
        typeof (polydraw as any).polygonMutationManager.polygonInteractionManager
          .addEdgeClickListeners,
      ).toBe('function');
    });

    it('should have onEdgeClick method', () => {
      expect(
        typeof (polydraw as any).polygonMutationManager.polygonInteractionManager.onEdgeClick,
      ).toBe('function');
    });

    it('should have highlightEdgeOnHover method', () => {
      expect(
        typeof (polydraw as any).polygonMutationManager.polygonInteractionManager
          .highlightEdgeOnHover,
      ).toBe('function');
    });
  });

  describe('Edge Hover Highlighting', () => {
    it('should handle edge hover highlighting', () => {
      const mockEdgePolyline = { setStyle: vi.fn() };
      const highlightEdgeOnHover = (polydraw as any).polygonMutationManager
        .polygonInteractionManager.highlightEdgeOnHover;

      // Test hover on
      highlightEdgeOnHover.call(
        (polydraw as any).polygonMutationManager.polygonInteractionManager,
        mockEdgePolyline,
        true,
      );
      expect(mockEdgePolyline.setStyle).toHaveBeenCalledWith({
        color: '#7a9441',
        weight: 4,
        opacity: 1,
      });

      // Test hover off
      highlightEdgeOnHover.call(
        (polydraw as any).polygonMutationManager.polygonInteractionManager,
        mockEdgePolyline,
        false,
      );
      expect(mockEdgePolyline.setStyle).toHaveBeenCalledWith({
        color: 'transparent',
        weight: 10,
        opacity: 0,
      });
    });
  });

  describe('Turf Helper Point Injection', () => {
    it('should have working injectPointToPolygon method', () => {
      const turfHelper = (polydraw as any).turfHelper;
      expect(typeof turfHelper.injectPointToPolygon).toBe('function');

      const testPolygon = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [15.6, 58.4],
              [15.61, 58.4],
              [15.61, 58.41],
              [15.6, 58.41],
              [15.6, 58.4],
            ],
          ],
        },
      };

      const newPoint = [15.605, 58.4];
      const result = turfHelper.injectPointToPolygon(testPolygon, newPoint, 0);

      expect(result).toBeDefined();
      expect(result.geometry.coordinates[0].length).toBeGreaterThan(
        testPolygon.geometry.coordinates[0].length,
      );
    });
  });

  describe('Edge Click Handling', () => {
    it('should handle edge clicks without throwing errors', () => {
      const mockEdgePolyline = {
        _polydrawEdgeInfo: {
          ringIndex: 0,
          edgeIndex: 1,
          startPoint: { lat: 58.41, lng: 15.6 },
          endPoint: { lat: 58.41, lng: 15.61 },
          parentPolygon: {},
          parentFeatureGroup: {},
        },
        setStyle: vi.fn(),
      };

      const mockClickEvent = { latlng: { lat: 58.41, lng: 15.605 } };

      expect(() => {
        (polydraw as any).polygonMutationManager.polygonInteractionManager.onEdgeClick(
          mockClickEvent,
          mockEdgePolyline,
        );
      }).not.toThrow();
    });

    it('should process edge information and call toGeoJSON', () => {
      const mockPolygon = createMockPolygon([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]);

      const mockFeatureGroup = createMockFeatureGroup();
      const mockEdgePolyline = {
        _polydrawEdgeInfo: {
          ringIndex: 0,
          edgeIndex: 1,
          startPoint: { lat: 58.41, lng: 15.6 },
          endPoint: { lat: 58.41, lng: 15.61 },
          parentPolygon: mockPolygon,
          parentFeatureGroup: mockFeatureGroup,
        },
      };

      const mockClickEvent = { latlng: { lat: 58.41, lng: 15.605 } };

      (polydraw as any).polygonMutationManager.polygonInteractionManager.onEdgeClick(
        mockClickEvent,
        mockEdgePolyline,
      );

      // This should FAIL when onEdgeClick is commented out
      expect(mockPolygon.toGeoJSON).toHaveBeenCalled();
    });

    it('should call turf helper injectPointToPolygon with correct parameters', () => {
      const mockPolygon = createMockPolygon([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]);

      const mockFeatureGroup = createMockFeatureGroup();
      const mockEdgePolyline = {
        _polydrawEdgeInfo: {
          ringIndex: 0,
          edgeIndex: 1,
          startPoint: { lat: 58.41, lng: 15.6 },
          endPoint: { lat: 58.41, lng: 15.61 },
          parentPolygon: mockPolygon,
          parentFeatureGroup: mockFeatureGroup,
        },
      };

      const mockClickEvent = { latlng: { lat: 58.41, lng: 15.605 } };
      const turfHelper = (polydraw as any).turfHelper;
      const injectSpy = vi.spyOn(turfHelper, 'injectPointToPolygon').mockReturnValue({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [0.5, 0.5],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      });

      (polydraw as any).polygonMutationManager.polygonInteractionManager.onEdgeClick(
        mockClickEvent,
        mockEdgePolyline,
      );

      // This should FAIL when onEdgeClick is commented out
      expect(injectSpy).toHaveBeenCalledWith(
        expect.any(Object),
        [15.605, 58.41], // lng, lat format for turf
        0,
      );

      injectSpy.mockRestore();
    });

    it('should call removeFeatureGroup when polygon is modified', () => {
      const mockPolygon = createMockPolygon([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]);

      const mockFeatureGroup = createMockFeatureGroup();
      const mockEdgePolyline = {
        _polydrawEdgeInfo: {
          ringIndex: 0,
          edgeIndex: 1,
          startPoint: { lat: 58.41, lng: 15.6 },
          endPoint: { lat: 58.41, lng: 15.61 },
          parentPolygon: mockPolygon,
          parentFeatureGroup: mockFeatureGroup,
        },
      };

      const mockClickEvent = { latlng: { lat: 58.41, lng: 15.605 } };
      const turfHelper = (polydraw as any).turfHelper;

      // Mock successful point injection
      vi.spyOn(turfHelper, 'injectPointToPolygon').mockReturnValue({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [0.5, 0.5],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      });

      // Spy on the internal removeFeatureGroupInternal method that's actually called
      const removeFeatureGroupSpy = vi.spyOn(
        (polydraw as any).polygonMutationManager,
        'removeFeatureGroupInternal',
      );

      (polydraw as any).polygonMutationManager.polygonInteractionManager.onEdgeClick(
        mockClickEvent,
        mockEdgePolyline,
      );

      // The interaction manager calls removeFeatureGroup which calls removeFeatureGroupInternal
      expect(removeFeatureGroupSpy).toHaveBeenCalled();

      removeFeatureGroupSpy.mockRestore();
    });

    it('should successfully process edge click with valid polygon data', () => {
      const mockPolygon = createMockPolygon([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]);
      mockPolygon._polydrawOptimizationLevel = 0;

      const mockFeatureGroup = createMockFeatureGroup();
      const mockEdgePolyline = {
        _polydrawEdgeInfo: {
          ringIndex: 0,
          edgeIndex: 1,
          startPoint: { lat: 58.41, lng: 15.6 },
          endPoint: { lat: 58.41, lng: 15.61 },
          parentPolygon: mockPolygon,
          parentFeatureGroup: mockFeatureGroup,
        },
      };

      const mockClickEvent = { latlng: { lat: 58.41, lng: 15.605 } };
      const turfHelper = (polydraw as any).turfHelper;

      const newPolygon = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [0.5, 0.5],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      };

      // Mock successful point injection that returns a valid polygon
      const injectSpy = vi.spyOn(turfHelper, 'injectPointToPolygon').mockReturnValue(newPolygon);

      // The test should not throw and should complete successfully
      expect(() => {
        (polydraw as any).polygonMutationManager.polygonInteractionManager.onEdgeClick(
          mockClickEvent,
          mockEdgePolyline,
        );
      }).not.toThrow();

      // Verify that the required methods were called
      expect(mockPolygon.toGeoJSON).toHaveBeenCalled();
      expect(injectSpy).toHaveBeenCalledWith(
        expect.any(Object),
        [15.605, 58.41], // lng, lat format for turf
        0,
      );

      // The functionality works correctly - the edge click processing completes successfully
      // This verifies that the onEdgeClick method processes the polygon modification correctly
      injectSpy.mockRestore();
    });

    it('should call stopPropagation to prevent polygon click', () => {
      const mockPolygon = createMockPolygon([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]);

      const mockFeatureGroup = createMockFeatureGroup();
      const mockEdgePolyline = {
        _polydrawEdgeInfo: {
          ringIndex: 0,
          edgeIndex: 1,
          startPoint: { lat: 58.41, lng: 15.6 },
          endPoint: { lat: 58.41, lng: 15.61 },
          parentPolygon: mockPolygon,
          parentFeatureGroup: mockFeatureGroup,
        },
      };

      const mockClickEvent = {
        latlng: { lat: 58.41, lng: 15.605 },
      };

      // Mock L.DomEvent.stopPropagation
      const stopPropagationSpy = vi.spyOn(L.DomEvent, 'stopPropagation');

      (polydraw as any).polygonMutationManager.polygonInteractionManager.onEdgeClick(
        mockClickEvent,
        mockEdgePolyline,
      );

      // This should FAIL when onEdgeClick is commented out
      expect(stopPropagationSpy).toHaveBeenCalledWith(mockClickEvent);

      stopPropagationSpy.mockRestore();
    });
  });
});
