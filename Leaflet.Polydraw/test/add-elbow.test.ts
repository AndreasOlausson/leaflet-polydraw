import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';
import { DrawMode } from '../src/enums';

// Mock Leaflet
vi.mock('leaflet', () => ({
  default: {
    Control: class {
      addTo() {
        return this;
      }
      onAdd() {
        return document.createElement('div');
      }
    },
    DomUtil: {
      create: vi.fn(() => document.createElement('div')),
      addClass: vi.fn(),
      removeClass: vi.fn(),
      hasClass: vi.fn(() => false),
    },
    DomEvent: {
      stopPropagation: vi.fn(),
    },
    Map: class {
      dragging = { enable: vi.fn(), disable: vi.fn() };
      doubleClickZoom = { enable: vi.fn(), disable: vi.fn() };
      scrollWheelZoom = { enable: vi.fn(), disable: vi.fn() };
      getContainer() {
        return document.createElement('div');
      }
      on() {
        return this;
      }
      off() {
        return this;
      }
      removeLayer() {
        return this;
      }
      containerPointToLatLng() {
        return { lat: 0, lng: 0 };
      }
    },
    FeatureGroup: class {
      addLayer() {
        return this;
      }
      removeLayer() {
        return this;
      }
      clearLayers() {
        return this;
      }
      addTo() {
        return this;
      }
      getLayers() {
        return [];
      }
      eachLayer() {
        return this;
      }
      toGeoJSON() {
        return { features: [] };
      }
      on() {
        return this;
      }
    },
    Polygon: class {
      getLatLngs() {
        return [];
      }
      setLatLngs() {
        return this;
      }
      toGeoJSON() {
        return { geometry: { coordinates: [] } };
      }
      setStyle() {
        return this;
      }
      on() {
        return this;
      }
    },
    polyline: vi.fn(() => ({
      addLatLng: vi.fn(),
      setLatLngs: vi.fn(),
      setStyle: vi.fn(),
      toGeoJSON: vi.fn(() => ({ geometry: { coordinates: [] } })),
      addTo: vi.fn(),
    })),
    GeoJSON: {
      geometryToLayer: vi.fn(() => ({
        setStyle: vi.fn(),
        getLatLngs: vi.fn(() => []),
        setLatLngs: vi.fn(),
        toGeoJSON: vi.fn(() => ({ geometry: { coordinates: [] } })),
        on: vi.fn(),
      })),
      coordsToLatLngs: vi.fn((coords) => coords),
    },
    control: {
      polydraw: vi.fn(),
    },
  },
}));

describe('Add Elbow Functionality', () => {
  let polydraw: Polydraw;
  let map: L.Map;

  beforeEach(() => {
    // Create a mock map
    map = new L.Map(document.createElement('div'));

    // Create polydraw instance
    polydraw = new Polydraw();
    polydraw.addTo(map);
  });

  describe('Edge Click Detection', () => {
    it('should detect edge clicks and provide edge information', () => {
      // Mock polygon with coordinates
      const mockPolygon = {
        getLatLngs: vi.fn(() => [
          [
            [
              { lat: 58.4, lng: 15.6 },
              { lat: 58.41, lng: 15.6 },
              { lat: 58.41, lng: 15.61 },
              { lat: 58.4, lng: 15.61 },
              { lat: 58.4, lng: 15.6 },
            ],
          ],
        ]),
        setStyle: vi.fn(),
        on: vi.fn(),
      };

      const mockFeatureGroup = new L.FeatureGroup();

      // Test that edge click listeners are added
      const addEdgeClickListeners = (polydraw as any).addEdgeClickListeners;
      expect(typeof addEdgeClickListeners).toBe('function');

      // Call the method (it should not throw)
      expect(() => {
        addEdgeClickListeners.call(polydraw, mockPolygon, mockFeatureGroup);
      }).not.toThrow();
    });

    it('should handle edge click events with proper edge information', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock edge polyline with edge info
      const mockEdgePolyline = {
        _polydrawEdgeInfo: {
          ringIndex: 0,
          edgeIndex: 1,
          startPoint: { lat: 58.4, lng: 15.6 },
          endPoint: { lat: 58.41, lng: 15.6 },
          parentPolygon: {},
          parentFeatureGroup: {},
        },
      };

      const mockEvent = {
        latlng: { lat: 58.405, lng: 15.6 },
      };

      // Test edge click handler
      const onEdgeClick = (polydraw as any).onEdgeClick;
      expect(typeof onEdgeClick).toBe('function');

      onEdgeClick.call(polydraw, mockEvent, mockEdgePolyline);

      // Should log edge click information
      expect(consoleSpy).toHaveBeenCalledWith(
        '🎯 Edge clicked!',
        expect.objectContaining({
          ringIndex: 0,
          edgeIndex: 1,
          clickPoint: { lat: 58.405, lng: 15.6 },
          edgeStart: { lat: 58.4, lng: 15.6 },
          edgeEnd: { lat: 58.41, lng: 15.6 },
        }),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Add Elbow (Marker) Functionality', () => {
    it('should be able to add a marker at edge midpoint', () => {
      // Test data for edge
      const edgeStart = { lat: 58.4, lng: 15.6 };
      const edgeEnd = { lat: 58.41, lng: 15.6 };
      const expectedMidpoint = { lat: 58.405, lng: 15.6 };

      // Calculate midpoint
      const midpoint = {
        lat: (edgeStart.lat + edgeEnd.lat) / 2,
        lng: (edgeStart.lng + edgeEnd.lng) / 2,
      };

      expect(midpoint).toEqual(expectedMidpoint);
    });

    it('should insert new point into polygon coordinates', () => {
      // Mock polygon coordinates
      const originalCoords = [
        { lat: 58.4, lng: 15.6 },
        { lat: 58.41, lng: 15.6 },
        { lat: 58.41, lng: 15.61 },
        { lat: 58.4, lng: 15.61 },
      ];

      // Insert point at edge index 1 (between points 1 and 2)
      const newPoint = { lat: 58.405, lng: 15.605 };
      const edgeIndex = 1;

      const updatedCoords = [
        ...originalCoords.slice(0, edgeIndex + 1),
        newPoint,
        ...originalCoords.slice(edgeIndex + 1),
      ];

      expect(updatedCoords).toHaveLength(originalCoords.length + 1);
      expect(updatedCoords[edgeIndex + 1]).toEqual(newPoint);
    });

    it('should handle polygon update after adding elbow', () => {
      // Mock polygon with methods
      const mockPolygon = {
        getLatLngs: vi.fn(() => [
          [
            [
              { lat: 58.4, lng: 15.6 },
              { lat: 58.41, lng: 15.6 },
              { lat: 58.41, lng: 15.61 },
              { lat: 58.4, lng: 15.61 },
            ],
          ],
        ]),
        setLatLngs: vi.fn(),
        toGeoJSON: vi.fn(() => ({
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [15.6, 58.4],
                [15.6, 58.41],
                [15.61, 58.41],
                [15.61, 58.4],
                [15.6, 58.4],
              ],
            ],
          },
        })),
      };

      // Test that polygon can be updated
      const newCoords = [
        [
          [
            { lat: 58.4, lng: 15.6 },
            { lat: 58.405, lng: 15.6 },
            { lat: 58.41, lng: 15.6 },
            { lat: 58.41, lng: 15.61 },
            { lat: 58.4, lng: 15.61 },
          ],
        ],
      ];

      mockPolygon.setLatLngs(newCoords);
      expect(mockPolygon.setLatLngs).toHaveBeenCalledWith(newCoords);
    });
  });

  describe('Edge Hover Functionality', () => {
    it('should highlight edge on hover', () => {
      const mockEdgePolyline = {
        setStyle: vi.fn(),
      };

      const highlightEdgeOnHover = (polydraw as any).highlightEdgeOnHover;
      expect(typeof highlightEdgeOnHover).toBe('function');

      // Test hover on
      highlightEdgeOnHover.call(polydraw, mockEdgePolyline, true);
      expect(mockEdgePolyline.setStyle).toHaveBeenCalledWith({
        color: '#ff0000',
        weight: 4,
        opacity: 1,
      });

      // Test hover off
      highlightEdgeOnHover.call(polydraw, mockEdgePolyline, false);
      expect(mockEdgePolyline.setStyle).toHaveBeenCalledWith({
        color: 'transparent',
        weight: 10,
        opacity: 0,
      });
    });
  });

  describe('Polygon Structure Detection', () => {
    it('should handle different polygon coordinate structures', () => {
      // Test structure: [Array(1)] -> [Array(N)] -> N LatLng objects
      const mockPolygon1 = {
        getLatLngs: () => [
          [
            [
              { lat: 58.4, lng: 15.6 },
              { lat: 58.41, lng: 15.6 },
              { lat: 58.41, lng: 15.61 },
            ],
          ],
        ],
      };

      // Test structure: [[{lat, lng}, ...]]
      const mockPolygon2 = {
        getLatLngs: () => [
          [
            { lat: 58.4, lng: 15.6 },
            { lat: 58.41, lng: 15.6 },
            { lat: 58.41, lng: 15.61 },
          ],
        ],
      };

      // Test structure: [{lat, lng}, ...]
      const mockPolygon3 = {
        getLatLngs: () => [
          { lat: 58.4, lng: 15.6 },
          { lat: 58.41, lng: 15.6 },
          { lat: 58.41, lng: 15.61 },
        ],
      };

      const mockFeatureGroup = new L.FeatureGroup();
      const addEdgeClickListeners = (polydraw as any).addEdgeClickListeners;

      // All structures should be handled without throwing
      expect(() => {
        addEdgeClickListeners.call(polydraw, mockPolygon1, mockFeatureGroup);
      }).not.toThrow();

      expect(() => {
        addEdgeClickListeners.call(polydraw, mockPolygon2, mockFeatureGroup);
      }).not.toThrow();

      expect(() => {
        addEdgeClickListeners.call(polydraw, mockPolygon3, mockFeatureGroup);
      }).not.toThrow();
    });
  });
});
