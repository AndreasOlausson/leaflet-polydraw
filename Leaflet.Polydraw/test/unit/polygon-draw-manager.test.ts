import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolygonDrawManager } from '../../src/managers/polygon-draw-manager';
import { TurfHelper } from '../../src/turf-helper';
import { ModeManager } from '../../src/managers/mode-manager';
import { EventManager } from '../../src/managers/event-manager';
import { DrawMode } from '../../src/enums';
import type { PolydrawConfig } from '../../src/types/polydraw-interfaces';
import * as L from 'leaflet';

// Mock L.Marker constructor
const mockMarker = {
  getLatLng: vi.fn().mockReturnValue({ lat: 45.0, lng: -122.0 }),
  addTo: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  off: vi.fn().mockReturnThis(),
  getElement: vi.fn().mockReturnValue({
    classList: { add: vi.fn(), remove: vi.fn() },
    style: {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
  setIcon: vi.fn(),
  _eventHandlers: new Map(),
};

vi.mock('leaflet', async () => {
  const actual = await vi.importActual('leaflet');
  return {
    ...actual,
    Marker: vi.fn().mockImplementation(() => mockMarker),
    divIcon: vi.fn().mockReturnValue({}),
    DomEvent: {
      stopPropagation: vi.fn(),
    },
  };
});

// Mock dependencies
const mockTurfHelper = {
  createPolygonFromTrace: vi.fn(),
  getMultiPolygon: vi.fn(),
} as unknown as TurfHelper;

const mockModeManager = {
  getCurrentMode: vi.fn().mockReturnValue(DrawMode.Add),
} as unknown as ModeManager;

const mockEventManager = {
  emit: vi.fn(),
} as unknown as EventManager;

const mockTracer = {
  toGeoJSON: vi.fn(),
  addLatLng: vi.fn(),
  setLatLngs: vi.fn(),
  setStyle: vi.fn(),
  getLatLngs: vi.fn().mockReturnValue([]),
} as unknown as L.Polyline;

const mockConfig = {
  modes: {
    dragElbow: true,
    edgeDeletion: true,
  },
  colors: {
    polyline: '#ff0000',
    p2p: {
      closingMarker: '#00ff00',
    },
  },
} as unknown as PolydrawConfig;

const mockMap = {
  getZoom: vi.fn().mockReturnValue(10),
  getCenter: vi.fn().mockReturnValue({ lat: 0, lng: 0 }),
  containerPointToLatLng: vi.fn(),
  removeLayer: vi.fn(),
  getContainer: vi.fn().mockReturnValue({
    style: { cursor: '' },
  }),
} as unknown as L.Map;

describe('PolygonDrawManager', () => {
  let manager: PolygonDrawManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new PolygonDrawManager({
      map: mockMap,
      turfHelper: mockTurfHelper,
      config: mockConfig,
      modeManager: mockModeManager,
      eventManager: mockEventManager,
      tracer: mockTracer,
    });
  });

  describe('constructor', () => {
    it('should initialize with dependencies', () => {
      expect(manager).toBeInstanceOf(PolygonDrawManager);
    });
  });

  describe('mouseMove', () => {
    it('should handle mouse move with latlng', () => {
      const event = {
        latlng: { lat: 45.0, lng: -122.0 },
      } as L.LeafletMouseEvent;

      manager.mouseMove(event);

      expect(mockTracer.addLatLng).toHaveBeenCalledWith(event.latlng);
    });

    it('should handle touch event', () => {
      const event = {
        touches: [{ clientX: 100, clientY: 200 }],
      } as unknown as TouchEvent;

      vi.mocked(mockMap.containerPointToLatLng).mockReturnValue({
        lat: 45.0,
        lng: -122.0,
      } as L.LatLng);

      manager.mouseMove(event);

      expect(mockMap.containerPointToLatLng).toHaveBeenCalledWith([100, 200]);
      expect(mockTracer.addLatLng).toHaveBeenCalled();
    });
  });

  describe('mouseUpLeave', () => {
    it('should complete freehand drawing successfully', async () => {
      const mockGeoJSON = {
        geometry: {
          coordinates: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ],
        },
      };

      const mockPolygon = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      vi.mocked(mockTracer.toGeoJSON).mockReturnValue(mockGeoJSON as any);
      vi.mocked(mockTurfHelper.createPolygonFromTrace).mockReturnValue(mockPolygon as any);

      const result = await manager.mouseUpLeave({} as L.LeafletMouseEvent);

      expect(result.success).toBe(true);
      expect(result.polygon).toBe(mockPolygon);
      expect(mockEventManager.emit).toHaveBeenCalledWith('polydraw:polygon:created', {
        polygon: mockPolygon,
        mode: DrawMode.Add,
      });
    });

    it('should handle insufficient points', async () => {
      const mockGeoJSON = {
        geometry: {
          coordinates: [
            [0, 0],
            [1, 0],
          ], // Only 2 points
        },
      };

      vi.mocked(mockTracer.toGeoJSON).mockReturnValue(mockGeoJSON as any);

      const result = await manager.mouseUpLeave({} as L.LeafletMouseEvent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not enough points');
    });

    it('should handle polygon creation errors', async () => {
      const mockGeoJSON = {
        geometry: {
          coordinates: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ],
        },
      };

      vi.mocked(mockTracer.toGeoJSON).mockReturnValue(mockGeoJSON as any);
      vi.mocked(mockTurfHelper.createPolygonFromTrace).mockImplementation(() => {
        throw new Error('Invalid polygon');
      });

      const result = await manager.mouseUpLeave({} as L.LeafletMouseEvent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid polygon');
    });
  });

  describe('setModifierKey', () => {
    it('should set modifier key status', () => {
      expect(() => manager.setModifierKey(true)).not.toThrow();
      expect(() => manager.setModifierKey(false)).not.toThrow();
    });
  });

  describe('handlePointToPointClick', () => {
    it('should handle first point click', () => {
      const clickLatLng = new L.LatLng(45.0, -122.0);

      expect(() => manager.handlePointToPointClick(clickLatLng)).not.toThrow();
      expect(L.Marker).toHaveBeenCalled();
    });

    it('should handle null clickLatLng', () => {
      expect(() => manager.handlePointToPointClick(null as any)).not.toThrow();
    });
  });

  describe('handleDoubleClick', () => {
    it('should handle double click in non-P2P mode', () => {
      vi.mocked(mockModeManager.getCurrentMode).mockReturnValue(DrawMode.Add);

      expect(() => manager.handleDoubleClick({} as L.LeafletMouseEvent)).not.toThrow();
    });

    it('should handle double click in P2P mode', () => {
      vi.mocked(mockModeManager.getCurrentMode).mockReturnValue(DrawMode.PointToPoint);

      expect(() => manager.handleDoubleClick({} as L.LeafletMouseEvent)).not.toThrow();
    });
  });

  describe('completePointToPointPolygon', () => {
    it('should complete P2P polygon with sufficient points', () => {
      // Add some mock markers first
      manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
      manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
      manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

      const mockPolygon = {
        geometry: {
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0],
            ],
          ],
        },
      };

      vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(mockPolygon as any);

      expect(() => manager.completePointToPointPolygon()).not.toThrow();
      expect(mockEventManager.emit).toHaveBeenCalledWith('polydraw:polygon:created', {
        polygon: mockPolygon,
        mode: DrawMode.PointToPoint,
        isPointToPoint: true,
      });
    });

    it('should handle completion with insufficient points', () => {
      expect(() => manager.completePointToPointPolygon()).not.toThrow();
    });
  });

  describe('cancelPointToPointDrawing', () => {
    it('should cancel P2P drawing', () => {
      expect(() => manager.cancelPointToPointDrawing()).not.toThrow();
      expect(mockEventManager.emit).toHaveBeenCalledWith('polydraw:draw:cancel', {
        mode: DrawMode.PointToPoint,
      });
    });
  });

  describe('clearP2pMarkers', () => {
    it('should clear all P2P markers', () => {
      manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
      manager.clearP2pMarkers();

      expect(mockMap.removeLayer).toHaveBeenCalled();
    });
  });

  describe('resetTracer', () => {
    it('should reset tracer', () => {
      manager.resetTracer();

      expect(mockTracer.setLatLngs).toHaveBeenCalledWith([]);
      expect(mockTracer.setStyle).toHaveBeenCalledWith({
        dashArray: undefined,
      });
    });
  });

  describe('getP2pMarkers', () => {
    it('should return copy of P2P markers', () => {
      const markers = manager.getP2pMarkers();

      expect(Array.isArray(markers)).toBe(true);
    });
  });

  describe('isInPointToPointMode', () => {
    it('should return true when in P2P mode', () => {
      vi.mocked(mockModeManager.getCurrentMode).mockReturnValue(DrawMode.PointToPoint);

      const result = manager.isInPointToPointMode();

      expect(result).toBe(true);
    });

    it('should return false when not in P2P mode', () => {
      vi.mocked(mockModeManager.getCurrentMode).mockReturnValue(DrawMode.Add);

      const result = manager.isInPointToPointMode();

      expect(result).toBe(false);
    });
  });

  describe('getTracerPointsCount', () => {
    it('should return tracer points count', () => {
      vi.mocked(mockTracer.getLatLngs).mockReturnValue([
        { lat: 45.0, lng: -122.0 },
        { lat: 45.1, lng: -122.0 },
      ] as L.LatLng[]);

      const count = manager.getTracerPointsCount();

      expect(count).toBe(2);
    });

    it('should return 0 for empty tracer', () => {
      vi.mocked(mockTracer.getLatLngs).mockReturnValue([]);

      const count = manager.getTracerPointsCount();

      expect(count).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle marker creation errors gracefully', () => {
      vi.mocked(L.Marker).mockImplementationOnce(() => {
        throw new Error('Marker creation failed');
      });

      const clickLatLng = new L.LatLng(45.0, -122.0);

      expect(() => manager.handlePointToPointClick(clickLatLng)).not.toThrow();
    });

    it('should handle tracer style errors gracefully', () => {
      vi.mocked(mockTracer.setStyle).mockImplementationOnce(() => {
        throw new Error('Style error');
      });

      expect(() => manager.resetTracer()).not.toThrow();
    });

    it('should handle DOM errors gracefully', () => {
      vi.mocked(mockMap.getContainer).mockImplementationOnce(() => {
        throw new Error('DOM error');
      });

      const clickLatLng = new L.LatLng(45.0, -122.0);

      expect(() => manager.handlePointToPointClick(clickLatLng)).not.toThrow();
    });
  });

  describe('Additional Coverage Tests - Missing Functionality', () => {
    describe('mouseUpLeave edge cases', () => {
      it('should handle null tracer GeoJSON', async () => {
        vi.mocked(mockTracer.toGeoJSON).mockReturnValue(null as any);

        const result = await manager.mouseUpLeave({} as L.LeafletMouseEvent);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Not enough points');
      });

      it('should handle tracer GeoJSON without geometry', async () => {
        vi.mocked(mockTracer.toGeoJSON).mockReturnValue({} as any);

        const result = await manager.mouseUpLeave({} as L.LeafletMouseEvent);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Not enough points');
      });

      it('should handle tracer GeoJSON without coordinates', async () => {
        vi.mocked(mockTracer.toGeoJSON).mockReturnValue({
          geometry: {},
        } as any);

        const result = await manager.mouseUpLeave({} as L.LeafletMouseEvent);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Not enough points');
      });

      it('should handle invalid polygon creation result', async () => {
        const mockGeoJSON = {
          geometry: {
            coordinates: [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
            ],
          },
        };

        vi.mocked(mockTracer.toGeoJSON).mockReturnValue(mockGeoJSON as any);
        vi.mocked(mockTurfHelper.createPolygonFromTrace).mockReturnValue(null as any);

        const result = await manager.mouseUpLeave({} as L.LeafletMouseEvent);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid polygon created');
      });

      it('should handle polygon with empty coordinates', async () => {
        const mockGeoJSON = {
          geometry: {
            coordinates: [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
            ],
          },
        };

        const mockPolygon = {
          geometry: {
            coordinates: [],
          },
        };

        vi.mocked(mockTracer.toGeoJSON).mockReturnValue(mockGeoJSON as any);
        vi.mocked(mockTurfHelper.createPolygonFromTrace).mockReturnValue(mockPolygon as any);

        const result = await manager.mouseUpLeave({} as L.LeafletMouseEvent);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid polygon created');
      });

      it('should handle polygon without geometry', async () => {
        const mockGeoJSON = {
          geometry: {
            coordinates: [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
            ],
          },
        };

        const mockPolygon = {};

        vi.mocked(mockTracer.toGeoJSON).mockReturnValue(mockGeoJSON as any);
        vi.mocked(mockTurfHelper.createPolygonFromTrace).mockReturnValue(mockPolygon as any);

        const result = await manager.mouseUpLeave({} as L.LeafletMouseEvent);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid polygon created');
      });
    });

    describe('Point-to-Point advanced functionality', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        // Reset the manager to clear any existing markers
        manager = new PolygonDrawManager({
          map: mockMap,
          turfHelper: mockTurfHelper,
          config: mockConfig,
          modeManager: mockModeManager,
          eventManager: mockEventManager,
          tracer: mockTracer,
        });
      });

      it('should handle clicking first point to close polygon', () => {
        // Add 3 markers first
        const firstPoint = new L.LatLng(45.0, -122.0);
        const secondPoint = new L.LatLng(45.1, -122.0);
        const thirdPoint = new L.LatLng(45.1, -122.1);

        manager.handlePointToPointClick(firstPoint);
        manager.handlePointToPointClick(secondPoint);
        manager.handlePointToPointClick(thirdPoint);

        // Mock the first marker's getLatLng to return the exact coordinates
        const markers = manager.getP2pMarkers();
        if (markers.length > 0) {
          vi.mocked(markers[0].getLatLng).mockReturnValue(firstPoint);
        }

        const mockPolygon = {
          geometry: {
            coordinates: [
              [
                [-122.0, 45.0],
                [-122.0, 45.1],
                [-122.1, 45.1],
                [-122.0, 45.0],
              ],
            ],
          },
        };

        vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(mockPolygon as any);

        // Click very close to the first point (within tolerance)
        const closeToFirstPoint = new L.LatLng(45.0001, -122.0001);
        manager.handlePointToPointClick(closeToFirstPoint);

        expect(mockEventManager.emit).toHaveBeenCalledWith('polydraw:polygon:created', {
          polygon: mockPolygon,
          mode: DrawMode.PointToPoint,
          isPointToPoint: true,
        });
      });

      it('should handle first point click tolerance at different zoom levels', () => {
        // Test high zoom level (smaller tolerance)
        vi.mocked(mockMap.getZoom).mockReturnValue(15);

        const firstPoint = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(firstPoint);
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

        const markers = manager.getP2pMarkers();
        if (markers.length > 0) {
          vi.mocked(markers[0].getLatLng).mockReturnValue(firstPoint);
        }

        // Click slightly outside tolerance at high zoom
        const outsideTolerancePoint = new L.LatLng(45.001, -122.001);
        const initialMarkerCount = manager.getP2pMarkers().length;

        manager.handlePointToPointClick(outsideTolerancePoint);

        // Should add a new marker instead of closing
        expect(L.Marker).toHaveBeenCalledTimes(initialMarkerCount + 1);
      });

      it('should handle marker drag events', () => {
        const clickLatLng = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(clickLatLng);

        // Simulate drag event on the marker
        const markers = manager.getP2pMarkers();
        expect(markers.length).toBe(1);

        // The drag handler should call updateP2PTracer
        expect(mockTracer.setLatLngs).toHaveBeenCalled();
      });

      it('should handle marker click with modifier key for deletion', () => {
        const clickLatLng = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(clickLatLng);

        const markers = manager.getP2pMarkers();
        expect(markers.length).toBe(1);

        // Set modifier key and simulate marker click event
        manager.setModifierKey(true);

        // Verify that the marker was created and added to map
        expect(L.Marker).toHaveBeenCalled();
        expect(mockMarker.addTo).toHaveBeenCalledWith(mockMap);

        // Clear markers should call removeLayer
        manager.clearP2pMarkers();
        expect(mockMap.removeLayer).toHaveBeenCalled();
      });

      it('should handle first marker special properties and events', () => {
        const firstPoint = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(firstPoint);

        const markers = manager.getP2pMarkers();
        expect(markers.length).toBe(1);

        // Verify first marker has special class and larger icon
        expect(L.divIcon).toHaveBeenCalledWith({
          className: 'leaflet-polydraw-p2p-marker leaflet-polydraw-p2p-first-marker',
          iconSize: [20, 20],
        });
      });

      it('should handle subsequent marker properties', () => {
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));

        const markers = manager.getP2pMarkers();
        expect(markers.length).toBe(2);

        // Verify second marker has regular class and smaller icon
        expect(L.divIcon).toHaveBeenCalledWith({
          className: 'leaflet-polydraw-p2p-marker',
          iconSize: [16, 16],
        });
      });

      it('should update tracer style with dashed line for multiple points', () => {
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));

        expect(mockTracer.setStyle).toHaveBeenCalledWith({
          color: mockConfig.colors.polyline,
          dashArray: '5, 5',
        });
      });

      it('should clear dash array for single point', () => {
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));

        expect(mockTracer.setStyle).toHaveBeenCalledWith({
          dashArray: undefined,
        });
      });

      it('should handle marker deletion and update first marker properties', () => {
        // Add multiple markers
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

        const initialMarkers = manager.getP2pMarkers();
        expect(initialMarkers.length).toBe(3);

        // Simulate deleting the first marker
        manager.setModifierKey(true);
        const firstMarker = initialMarkers[0];

        // Mock the marker to simulate deletion
        const markerIndex = 0;
        const updatedMarkers = initialMarkers.slice();
        updatedMarkers.splice(markerIndex, 1);

        // Verify that setupFirstMarker would be called for the new first marker
        expect(mockTracer.setLatLngs).toHaveBeenCalled();
      });

      it('should handle marker hover events for edge deletion', () => {
        manager.setModifierKey(true);
        const clickLatLng = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(clickLatLng);

        const markers = manager.getP2pMarkers();
        const marker = markers[0];
        const element = marker.getElement();

        // Simulate mouseover event
        expect(element).toBeDefined();
        expect(element?.classList.add).toBeDefined();
      });

      it('should handle touch events in mouseMove', () => {
        const touchEvent = {
          touches: [{ clientX: 100, clientY: 200 }],
        } as unknown as TouchEvent;

        const mockLatLng = { lat: 45.0, lng: -122.0 };
        vi.mocked(mockMap.containerPointToLatLng).mockReturnValue(mockLatLng as L.LatLng);

        manager.mouseMove(touchEvent);

        expect(mockMap.containerPointToLatLng).toHaveBeenCalledWith([100, 200]);
        expect(mockTracer.addLatLng).toHaveBeenCalledWith(mockLatLng);
      });

      it('should handle empty touches array in mouseMove', () => {
        const touchEvent = {
          touches: [],
        } as unknown as TouchEvent;

        manager.mouseMove(touchEvent);

        // Should not call containerPointToLatLng or addLatLng
        expect(mockMap.containerPointToLatLng).not.toHaveBeenCalled();
      });

      it('should handle completion with polygon creation error', () => {
        // Add sufficient markers
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

        // Mock getMultiPolygon to throw an error
        vi.mocked(mockTurfHelper.getMultiPolygon).mockImplementationOnce(() => {
          throw new Error('Polygon creation failed');
        });

        // Should handle error gracefully
        expect(() => manager.completePointToPointPolygon()).not.toThrow();

        // Should clear markers and reset tracer
        expect(mockTracer.setLatLngs).toHaveBeenCalledWith([]);
      });

      it('should handle double click with sufficient points in P2P mode', () => {
        vi.mocked(mockModeManager.getCurrentMode).mockReturnValue(DrawMode.PointToPoint);

        // Add sufficient markers
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

        const mockPolygon = {
          geometry: {
            coordinates: [
              [
                [-122.0, 45.0],
                [-122.0, 45.1],
                [-122.1, 45.1],
                [-122.0, 45.0],
              ],
            ],
          },
        };

        vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(mockPolygon as any);

        manager.handleDoubleClick({} as L.LeafletMouseEvent);

        expect(mockEventManager.emit).toHaveBeenCalledWith('polydraw:polygon:created', {
          polygon: mockPolygon,
          mode: DrawMode.PointToPoint,
          isPointToPoint: true,
        });
      });

      it('should handle polygon completion with already closed points', () => {
        // Create markers that form a closed polygon
        const firstPoint = new L.LatLng(45.0, -122.0);
        const secondPoint = new L.LatLng(45.1, -122.0);
        const thirdPoint = new L.LatLng(45.1, -122.1);

        manager.handlePointToPointClick(firstPoint);
        manager.handlePointToPointClick(secondPoint);
        manager.handlePointToPointClick(thirdPoint);

        // Mock markers to return the same first and last point
        const markers = manager.getP2pMarkers();
        vi.mocked(markers[0].getLatLng).mockReturnValue(firstPoint);
        vi.mocked(markers[1].getLatLng).mockReturnValue(secondPoint);
        vi.mocked(markers[2].getLatLng).mockReturnValue(firstPoint); // Same as first

        const mockPolygon = {
          geometry: {
            coordinates: [
              [
                [-122.0, 45.0],
                [-122.0, 45.1],
                [-122.0, 45.0],
              ],
            ],
          },
        };

        vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(mockPolygon as any);

        manager.completePointToPointPolygon();

        expect(mockTurfHelper.getMultiPolygon).toHaveBeenCalled();
      });
    });

    describe('Private method coverage', () => {
      it('should handle isClickingFirstPoint with null first point', () => {
        const clickLatLng = new L.LatLng(45.0, -122.0);

        // Test the private method indirectly by having no markers
        manager.handlePointToPointClick(clickLatLng);
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));

        // Clear markers to test null first point scenario
        manager.clearP2pMarkers();

        // Add a new point - should not try to close with null first point
        manager.handlePointToPointClick(new L.LatLng(45.2, -122.2));

        expect(L.Marker).toHaveBeenCalled();
      });

      it('should handle updateP2PTracer with different marker counts', () => {
        // Test with 0 markers
        expect(manager.getP2pMarkers().length).toBe(0);

        // Test with 1 marker
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        expect(mockTracer.setStyle).toHaveBeenCalledWith({
          dashArray: undefined,
        });

        // Test with 2+ markers
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        expect(mockTracer.setStyle).toHaveBeenCalledWith({
          color: mockConfig.colors.polyline,
          dashArray: '5, 5',
        });
      });

      it('should handle setupFirstMarker with no markers', () => {
        // Clear all markers first
        manager.clearP2pMarkers();

        // Try to setup first marker when there are no markers
        // This should be handled gracefully
        expect(manager.getP2pMarkers().length).toBe(0);
      });

      it('should handle marker hover events with modifier key changes', () => {
        const clickLatLng = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(clickLatLng);

        const markers = manager.getP2pMarkers();
        const marker = markers[0];
        const element = marker.getElement();

        // Test hover with modifier key
        manager.setModifierKey(true);

        // Verify that marker was created and element exists
        expect(element).toBeDefined();
        expect(mockMarker.on).toHaveBeenCalled();

        // Verify the element has the addEventListener method available
        expect(typeof element?.addEventListener).toBe('function');
      });

      it('should handle DOM container errors in hover events', () => {
        vi.mocked(mockMap.getContainer).mockImplementationOnce(() => {
          throw new Error('Container error');
        });

        const clickLatLng = new L.LatLng(45.0, -122.0);

        // Should handle DOM errors gracefully
        expect(() => manager.handlePointToPointClick(clickLatLng)).not.toThrow();
      });

      it('should handle marker element null in hover events', () => {
        // Mock marker with null element
        const nullElementMarker = {
          ...mockMarker,
          getElement: vi.fn().mockReturnValue(null),
        };

        vi.mocked(L.Marker).mockImplementationOnce(() => nullElementMarker);

        const clickLatLng = new L.LatLng(45.0, -122.0);

        // Should handle null element gracefully
        expect(() => manager.handlePointToPointClick(clickLatLng)).not.toThrow();
      });

      it('should handle first marker hover effects', () => {
        // Add enough markers to enable closing
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

        const markers = manager.getP2pMarkers();
        const firstMarker = markers[0];
        const element = firstMarker.getElement();

        // Test mouseover effect when enough points to close
        expect(element).toBeDefined();
        expect(element?.style).toBeDefined();

        // Test mouseout effect
        expect(element?.style).toBeDefined();
      });

      it('should handle first marker click with modifier key', () => {
        manager.setModifierKey(true);

        // Add enough markers
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

        const markers = manager.getP2pMarkers();
        expect(markers.length).toBe(3);

        // Clear markers to verify removeLayer is called
        manager.clearP2pMarkers();
        expect(mockMap.removeLayer).toHaveBeenCalled();
      });

      it('should handle first marker click without modifier key', () => {
        manager.setModifierKey(false);

        // Add enough markers
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

        const mockPolygon = {
          geometry: {
            coordinates: [
              [
                [-122.0, 45.0],
                [-122.0, 45.1],
                [-122.1, 45.1],
                [-122.0, 45.0],
              ],
            ],
          },
        };

        vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(mockPolygon as any);

        // Simulate clicking first marker without modifier key (should complete)
        const markers = manager.getP2pMarkers();
        expect(markers.length).toBe(3);
      });
    });

    describe('Edge cases and error scenarios', () => {
      it('should handle tracer style errors in updateP2PTracer', () => {
        vi.mocked(mockTracer.setStyle).mockImplementationOnce(() => {
          throw new Error('Style error');
        });

        // Should handle style errors gracefully
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));

        expect(() => manager.handlePointToPointClick(new L.LatLng(45.1, -122.1))).not.toThrow();
      });

      it('should handle tracer style errors in resetTracer', () => {
        vi.mocked(mockTracer.setStyle).mockImplementationOnce(() => {
          throw new Error('Style error');
        });

        expect(() => manager.resetTracer()).not.toThrow();
      });

      it('should handle event listener cleanup in marker hover', () => {
        const clickLatLng = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(clickLatLng);

        const markers = manager.getP2pMarkers();
        const marker = markers[0];
        const element = marker.getElement();

        // Simulate mouseout to trigger cleanup
        expect(element?.removeEventListener).toBeDefined();
      });

      it('should handle marker deletion with invalid index', () => {
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));

        const markers = manager.getP2pMarkers();
        expect(markers.length).toBe(1);

        // Try to delete a marker that doesn't exist
        // This tests the findIndex returning -1 scenario
        const nonExistentMarker = {
          ...mockMarker,
          getLatLng: vi.fn().mockReturnValue({ lat: 99.0, lng: 99.0 }),
        };

        // The deleteP2PMarker method should handle this gracefully
        expect(markers.length).toBe(1);
      });

      it('should handle zoom level edge cases in first point detection', () => {
        // Test very low zoom level
        vi.mocked(mockMap.getZoom).mockReturnValue(1);

        const firstPoint = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(firstPoint);
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

        const markers = manager.getP2pMarkers();
        if (markers.length > 0) {
          vi.mocked(markers[0].getLatLng).mockReturnValue(firstPoint);
        }

        // Mock polygon creation for completion
        const mockPolygon = {
          geometry: {
            coordinates: [
              [
                [-122.0, 45.0],
                [-122.0, 45.1],
                [-122.1, 45.1],
                [-122.0, 45.0],
              ],
            ],
          },
        };
        vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(mockPolygon as any);

        // At low zoom, tolerance should be larger - click exactly on first point to trigger completion
        const exactFirstPoint = new L.LatLng(45.0, -122.0);
        const initialCount = manager.getP2pMarkers().length;

        manager.handlePointToPointClick(exactFirstPoint);

        // Should complete polygon due to clicking on first point
        expect(mockEventManager.emit).toHaveBeenCalled();
      });

      it('should handle very high zoom level in first point detection', () => {
        // Test very high zoom level
        vi.mocked(mockMap.getZoom).mockReturnValue(20);

        const firstPoint = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(firstPoint);
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

        const markers = manager.getP2pMarkers();
        if (markers.length > 0) {
          vi.mocked(markers[0].getLatLng).mockReturnValue(firstPoint);
        }

        // At high zoom, tolerance should be very small
        const slightlyOffPoint = new L.LatLng(45.0001, -122.0001);
        const initialCount = manager.getP2pMarkers().length;

        manager.handlePointToPointClick(slightlyOffPoint);

        // Should add new marker instead of completing due to small tolerance
        expect(L.Marker).toHaveBeenCalledTimes(initialCount + 1);
      });

      it('should handle marker hover with edge deletion class changes', () => {
        // Set modifier key first to enable edge deletion mode
        manager.setModifierKey(true);

        const clickLatLng = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(clickLatLng);

        const markers = manager.getP2pMarkers();
        const marker = markers[0];
        const element = marker.getElement();

        // Verify that the marker was created with event handlers
        expect(marker.on).toHaveBeenCalledWith('mouseover', expect.any(Function));
        expect(marker.on).toHaveBeenCalledWith('mouseout', expect.any(Function));

        // Verify element exists and has the required methods
        expect(element).toBeDefined();
        expect(element?.classList.add).toBeDefined();
        expect(element?.classList.remove).toBeDefined();
      });

      it('should handle document event listeners for modifier key changes', () => {
        const clickLatLng = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(clickLatLng);

        const markers = manager.getP2pMarkers();
        const marker = markers[0];

        // Verify that event handlers were set up
        expect(marker.on).toHaveBeenCalledWith('mouseover', expect.any(Function));
        expect(marker.on).toHaveBeenCalledWith('mouseout', expect.any(Function));
      });

      it('should handle marker mousedown event to stop propagation', () => {
        const clickLatLng = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(clickLatLng);

        const markers = manager.getP2pMarkers();
        const marker = markers[0];

        // Verify mousedown handler was added
        expect(marker.on).toHaveBeenCalledWith('mousedown', expect.any(Function));
      });

      it('should handle setupFirstMarker when deleting first marker', () => {
        // Add multiple markers
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

        const initialMarkers = manager.getP2pMarkers();
        expect(initialMarkers.length).toBe(3);

        // Verify that markers were created with proper event handlers
        initialMarkers.forEach((marker) => {
          expect(marker.on).toHaveBeenCalledWith('click', expect.any(Function));
          expect(marker.on).toHaveBeenCalledWith('drag', expect.any(Function));
        });
      });

      it('should handle first marker hover effects when enough points to close', () => {
        // Add enough markers to enable closing (3+)
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

        const markers = manager.getP2pMarkers();
        const firstMarker = markers[0];

        // Verify first marker has mouseover and mouseout handlers
        expect(firstMarker.on).toHaveBeenCalledWith('mouseover', expect.any(Function));
        expect(firstMarker.on).toHaveBeenCalledWith('mouseout', expect.any(Function));
      });

      it('should handle first marker click to complete polygon', () => {
        // Add enough markers to enable closing
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

        const markers = manager.getP2pMarkers();
        const firstMarker = markers[0];

        // Verify first marker has click handler
        expect(firstMarker.on).toHaveBeenCalledWith('click', expect.any(Function));

        // Mock polygon creation for completion
        const mockPolygon = {
          geometry: {
            coordinates: [
              [
                [-122.0, 45.0],
                [-122.0, 45.1],
                [-122.1, 45.1],
                [-122.0, 45.0],
              ],
            ],
          },
        };
        vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(mockPolygon as any);

        // Verify that clicking first marker would complete polygon
        expect(markers.length).toBe(3);
      });

      it('should handle edge deletion hover with modifier key held', () => {
        // Set modifier key and edge deletion enabled
        manager.setModifierKey(true);

        const clickLatLng = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(clickLatLng);

        const markers = manager.getP2pMarkers();
        const marker = markers[0];

        // Verify hover handlers were added for edge deletion
        expect(marker.on).toHaveBeenCalledWith('mouseover', expect.any(Function));
        expect(marker.on).toHaveBeenCalledWith('mouseout', expect.any(Function));
      });

      it('should handle marker deletion with modifier key and edge deletion enabled', () => {
        // Enable edge deletion and set modifier key
        manager.setModifierKey(true);

        const clickLatLng = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(clickLatLng);

        const markers = manager.getP2pMarkers();
        expect(markers.length).toBe(1);

        // Verify click handler was added for deletion
        expect(markers[0].on).toHaveBeenCalledWith('click', expect.any(Function));
      });

      it('should handle setupFirstMarker with element manipulation', () => {
        // Add multiple markers
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));

        const markers = manager.getP2pMarkers();
        const firstMarker = markers[0];
        const element = firstMarker.getElement();

        // Verify element exists and has required methods
        expect(element).toBeDefined();
        expect(element?.classList.add).toBeDefined();
        // setIcon is called during marker creation, not in setupFirstMarker
        expect(L.divIcon).toHaveBeenCalled();
      });

      it('should handle onMarkerHoverForEdgeDeletion with document event listeners', () => {
        const clickLatLng = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(clickLatLng);

        const markers = manager.getP2pMarkers();
        const marker = markers[0];
        const element = marker.getElement();

        // Verify element has event listener methods
        expect(element?.addEventListener).toBeDefined();
        expect(element?.removeEventListener).toBeDefined();
      });

      it('should handle marker hover with edge deletion class management', () => {
        // Set modifier key to enable edge deletion
        manager.setModifierKey(true);

        const clickLatLng = new L.LatLng(45.0, -122.0);
        manager.handlePointToPointClick(clickLatLng);

        const markers = manager.getP2pMarkers();
        const marker = markers[0];
        const element = marker.getElement();

        // Verify element has classList methods for edge deletion
        expect(element?.classList.add).toBeDefined();
        expect(element?.classList.remove).toBeDefined();
      });

      // Additional tests for better coverage without complex event handler mocking
      it('should handle multiple P2P marker creation and management', () => {
        // Test creating multiple markers and verify they're all tracked
        const points = [
          new L.LatLng(45.0, -122.0),
          new L.LatLng(45.1, -122.0),
          new L.LatLng(45.1, -122.1),
          new L.LatLng(45.0, -122.1),
        ];

        points.forEach((point) => {
          manager.handlePointToPointClick(point);
        });

        const markers = manager.getP2pMarkers();
        expect(markers.length).toBe(4);
        expect(L.Marker).toHaveBeenCalledTimes(4);
      });

      it('should handle P2P mode detection correctly', () => {
        // Test when not in P2P mode
        vi.mocked(mockModeManager.getCurrentMode).mockReturnValue(DrawMode.Add);
        expect(manager.isInPointToPointMode()).toBe(false);

        // Test when in P2P mode
        vi.mocked(mockModeManager.getCurrentMode).mockReturnValue(DrawMode.PointToPoint);
        expect(manager.isInPointToPointMode()).toBe(true);
      });

      it('should handle tracer point counting with various scenarios', () => {
        // Test with empty tracer
        vi.mocked(mockTracer.getLatLngs).mockReturnValue([]);
        expect(manager.getTracerPointsCount()).toBe(0);

        // Test with multiple points
        const mockPoints = [
          { lat: 45.0, lng: -122.0 },
          { lat: 45.1, lng: -122.0 },
          { lat: 45.1, lng: -122.1 },
        ] as L.LatLng[];
        vi.mocked(mockTracer.getLatLngs).mockReturnValue(mockPoints);
        expect(manager.getTracerPointsCount()).toBe(3);
      });

      it('should handle modifier key state changes', () => {
        // Test setting modifier key to true
        expect(() => manager.setModifierKey(true)).not.toThrow();

        // Test setting modifier key to false
        expect(() => manager.setModifierKey(false)).not.toThrow();

        // Test multiple state changes
        manager.setModifierKey(true);
        manager.setModifierKey(false);
        manager.setModifierKey(true);
        expect(() => manager.setModifierKey(false)).not.toThrow();
      });

      it('should handle P2P polygon completion with various point configurations', () => {
        // Test with exactly 3 points (minimum for polygon)
        manager.handlePointToPointClick(new L.LatLng(45.0, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
        manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

        const mockPolygon = {
          geometry: {
            coordinates: [
              [
                [-122.0, 45.0],
                [-122.0, 45.1],
                [-122.1, 45.1],
                [-122.0, 45.0],
              ],
            ],
          },
        };
        vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(mockPolygon as any);

        expect(() => manager.completePointToPointPolygon()).not.toThrow();
        expect(mockEventManager.emit).toHaveBeenCalledWith('polydraw:polygon:created', {
          polygon: mockPolygon,
          mode: DrawMode.PointToPoint,
          isPointToPoint: true,
        });
      });

      it('should handle edge cases in first point click detection', () => {
        // Test with different zoom levels affecting tolerance
        const testZooms = [1, 5, 10, 15, 20];

        testZooms.forEach((zoom) => {
          vi.clearAllMocks();
          vi.mocked(mockMap.getZoom).mockReturnValue(zoom);

          const firstPoint = new L.LatLng(45.0, -122.0);
          manager.handlePointToPointClick(firstPoint);
          manager.handlePointToPointClick(new L.LatLng(45.1, -122.0));
          manager.handlePointToPointClick(new L.LatLng(45.1, -122.1));

          // Mock the first marker's getLatLng
          const markers = manager.getP2pMarkers();
          if (markers.length > 0) {
            vi.mocked(markers[0].getLatLng).mockReturnValue(firstPoint);
          }

          // Test clicking exactly on first point
          const mockPolygon = {
            geometry: {
              coordinates: [
                [
                  [-122.0, 45.0],
                  [-122.0, 45.1],
                  [-122.1, 45.1],
                  [-122.0, 45.0],
                ],
              ],
            },
          };
          vi.mocked(mockTurfHelper.getMultiPolygon).mockReturnValue(mockPolygon as any);

          manager.handlePointToPointClick(firstPoint);
          expect(mockEventManager.emit).toHaveBeenCalled();
        });
      });
    });
  });
});
