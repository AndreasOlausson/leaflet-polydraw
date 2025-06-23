import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';

// Mock Leaflet map and DOM elements
const mockMap = {
  dragging: { enable: vi.fn(), disable: vi.fn() },
  getContainer: vi.fn(() => ({ style: {} })),
  fire: vi.fn(),
  removeLayer: vi.fn(),
  addLayer: vi.fn()
} as any;

const mockFeatureGroup = {
  getLayers: vi.fn(() => []),
  eachLayer: vi.fn(),
  clearLayers: vi.fn(),
  toGeoJSON: vi.fn(() => ({
    features: [{
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]]
      }
    }]
  }))
} as any;

const mockPolygon = {
  dragging: { enable: vi.fn(), disable: vi.fn() },
  on: vi.fn(),
  getLatLngs: vi.fn(() => [[[{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 1 }, { lat: 0, lng: 1 }]]]),
  setLatLngs: vi.fn(),
  setStyle: vi.fn(),
  toGeoJSON: vi.fn(() => ({
    type: 'Feature',
    geometry: {
      type: 'MultiPolygon',
      coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]]
    }
  }))
} as any;

describe('Polygon Drag Feature', () => {
  let polydraw: Polydraw;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create polydraw instance with drag enabled
    polydraw = new Polydraw({
      config: {
        modes: {
          dragPolygons: true
        },
        dragPolygons: {
          realTimeUpdate: false,
          opacity: 0.7,
          dragCursor: 'move'
        }
      }
    });

    // Mock the map property
    (polydraw as any).map = mockMap;
    (polydraw as any).arrayOfFeatureGroups = [mockFeatureGroup];
  });

  describe('Configuration', () => {
    it('should have drag polygons enabled by default in config', () => {
      const config = (polydraw as any).config;
      expect(config.modes.dragPolygons).toBe(true);
    });

    it('should have correct drag configuration options', () => {
      const config = (polydraw as any).config;
      expect(config.dragPolygons.realTimeUpdate).toBe(false);
      expect(config.dragPolygons.opacity).toBe(0.7);
      expect(config.dragPolygons.dragCursor).toBe('move');
    });
  });

  describe('enablePolygonDragging', () => {
    it('should enable dragging on polygon when configured', () => {
      const enablePolygonDragging = (polydraw as any).enablePolygonDragging;
      
      enablePolygonDragging.call(polydraw, mockPolygon, mockFeatureGroup, {
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: [] }
      });

      // Check that mouse event handlers are attached (new implementation)
      expect(mockPolygon.on).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockPolygon.on).toHaveBeenCalledWith('mouseover', expect.any(Function));
      expect(mockPolygon.on).toHaveBeenCalledWith('mouseout', expect.any(Function));
      
      // Check that drag data is stored on the polygon
      expect(mockPolygon._polydrawFeatureGroup).toBe(mockFeatureGroup);
      expect(mockPolygon._polydrawDragData).toBeDefined();
    });

    it('should handle missing dragging property gracefully', () => {
      const polygonWithoutDragging = { on: vi.fn() };
      const enablePolygonDragging = (polydraw as any).enablePolygonDragging;
      
      expect(() => {
        enablePolygonDragging.call(polydraw, polygonWithoutDragging, mockFeatureGroup, {
          type: 'Feature',
          geometry: { type: 'MultiPolygon', coordinates: [] }
        });
      }).not.toThrow();
    });
  });

  describe('Drag Event Handlers', () => {
    it('should handle drag start correctly', () => {
      const onPolygonDragStart = (polydraw as any).onPolygonDragStart;
      const mockEvent = {
        target: {
          getLatLngs: vi.fn(() => [[[{ lat: 0, lng: 0 }]]]),
          setStyle: vi.fn()
        }
      };

      onPolygonDragStart.call(polydraw, mockEvent, mockFeatureGroup, {
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: [] }
      });

      expect(mockMap.dragging.disable).toHaveBeenCalled();
      expect(mockEvent.target.setStyle).toHaveBeenCalledWith({ opacity: 0.7 });
      expect(mockMap.fire).toHaveBeenCalledWith('polygon:dragstart', expect.any(Object));
    });

    it('should handle drag end correctly', () => {
      const onPolygonDragEnd = (polydraw as any).onPolygonDragEnd;
      const mockEvent = {
        target: {
          getLatLngs: vi.fn(() => [[[{ lat: 1, lng: 1 }]]]),
          setLatLngs: vi.fn(),
          setStyle: vi.fn(),
          toGeoJSON: vi.fn(() => ({
            type: 'Feature',
            geometry: {
              type: 'MultiPolygon',
              coordinates: [[[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]]]
            }
          }))
        }
      };

      // Set up drag start position
      (polydraw as any).dragStartPosition = [[[{ lat: 0, lng: 0 }]]];

      onPolygonDragEnd.call(polydraw, mockEvent, mockFeatureGroup, {
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: [] }
      });

      expect(mockMap.dragging.enable).toHaveBeenCalled();
      expect(mockEvent.target.setStyle).toHaveBeenCalledWith({ opacity: 1.0 });
      expect(mockMap.fire).toHaveBeenCalledWith('polygon:dragend', expect.any(Object));
    });
  });

  describe('enablePolygonDraggingMode', () => {
    it('should enable dragging on existing polygons', () => {
      const mockLayer = {
        dragging: { enable: vi.fn(), disable: vi.fn() }
      };
      
      mockFeatureGroup.eachLayer.mockImplementation((callback) => {
        callback(mockLayer);
      });

      // Mock instanceof check
      Object.setPrototypeOf(mockLayer, L.Polygon.prototype);

      polydraw.enablePolygonDraggingMode(true);

      expect(mockLayer.dragging.enable).toHaveBeenCalled();
    });

    it('should disable dragging on existing polygons', () => {
      const mockLayer = {
        dragging: { enable: vi.fn(), disable: vi.fn() }
      };
      
      mockFeatureGroup.eachLayer.mockImplementation((callback) => {
        callback(mockLayer);
      });

      // Mock instanceof check
      Object.setPrototypeOf(mockLayer, L.Polygon.prototype);

      polydraw.enablePolygonDraggingMode(false);

      expect(mockLayer.dragging.disable).toHaveBeenCalled();
    });
  });

  describe('updatePolygonCoordinates', () => {
    it('should update polygon coordinates after drag', () => {
      const updatePolygonCoordinates = (polydraw as any).updatePolygonCoordinates;
      const mockPolygonInformation = {
        createPolygonInformationStorage: vi.fn()
      };
      const mockAddPolygonLayer = vi.fn();

      (polydraw as any).polygonInformation = mockPolygonInformation;
      (polydraw as any).addPolygonLayer = mockAddPolygonLayer;

      updatePolygonCoordinates.call(polydraw, mockPolygon, mockFeatureGroup, {
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: [] }
      });

      expect(mockMap.removeLayer).toHaveBeenCalledWith(mockFeatureGroup);
      expect(mockAddPolygonLayer).toHaveBeenCalled();
      expect(mockPolygonInformation.createPolygonInformationStorage).toHaveBeenCalled();
    });

    it('should handle errors gracefully during coordinate update', () => {
      const updatePolygonCoordinates = (polydraw as any).updatePolygonCoordinates;
      const mockPolygonWithError = {
        getLatLngs: vi.fn(() => { throw new Error('Test error'); }),
        setLatLngs: vi.fn()
      };

      (polydraw as any).dragStartPosition = [[[{ lat: 0, lng: 0 }]]];

      expect(() => {
        updatePolygonCoordinates.call(polydraw, mockPolygonWithError, mockFeatureGroup, {
          type: 'Feature',
          geometry: { type: 'MultiPolygon', coordinates: [] }
        });
      }).not.toThrow();

      expect(mockPolygonWithError.setLatLngs).toHaveBeenCalledWith([[[{ lat: 0, lng: 0 }]]]);
    });
  });
});
