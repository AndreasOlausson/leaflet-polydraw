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
      } as TouchEvent;

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
});
