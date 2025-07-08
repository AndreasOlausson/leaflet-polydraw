import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';
import { DrawMode } from '../src/enums';

// Mock only the essential DOM/rendering parts that can't run in Node.js
vi.mock('leaflet', () => {
  const MockControl = class {
    addTo() {
      return this;
    }
    onAdd() {
      return document.createElement('div');
    }
  };

  const MockMap = class {
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
    addLayer() {
      return this;
    }
    containerPointToLatLng() {
      return { lat: 0, lng: 0 };
    }
  };

  const MockFeatureGroup = class {
    layers: any[] = [];
    addLayer(layer: any) {
      this.layers.push(layer);
      return this;
    }
    removeLayer(layer: any) {
      this.layers = this.layers.filter((l) => l !== layer);
      return this;
    }
    clearLayers() {
      this.layers = [];
      return this;
    }
    addTo() {
      return this;
    }
    getLayers() {
      return this.layers;
    }
    eachLayer(fn: any) {
      this.layers.forEach(fn);
      return this;
    }
    toGeoJSON() {
      return {
        type: 'FeatureCollection',
        features: this.layers.map((layer: any) =>
          layer.toGeoJSON
            ? layer.toGeoJSON()
            : {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [] },
              },
        ),
      };
    }
    on() {
      return this;
    }
  };

  const MockPolygon = class {
    latlngs: any;
    options: any;
    constructor(latlngs?: any, options?: any) {
      this.latlngs = latlngs || [];
      this.options = options || {};
    }
    getLatLngs() {
      return this.latlngs;
    }
    setLatLngs(latlngs: any) {
      this.latlngs = latlngs;
      return this;
    }
    toGeoJSON() {
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: this.latlngs.map((ring: any) =>
            ring.map ? ring.map((point: any) => [point.lng, point.lat]) : [[0, 0]],
          ),
        },
      };
    }
    setStyle() {
      return this;
    }
    on() {
      return this;
    }
  };

  return {
    Control: MockControl,
    Map: MockMap,
    FeatureGroup: MockFeatureGroup,
    Polygon: MockPolygon,
    polyline: vi.fn((latlngs, options) => ({
      latlngs: latlngs || [],
      options: options || {},
      addLatLng: vi.fn(),
      setLatLngs: vi.fn(),
      setStyle: vi.fn(),
      toGeoJSON: vi.fn(() => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      })),
      addTo: vi.fn(),
      on: vi.fn(),
    })),
    GeoJSON: {
      geometryToLayer: vi.fn((geojson: any) => {
        const mockPolygon = new MockPolygon();
        mockPolygon.toGeoJSON = () => geojson;
        return mockPolygon;
      }),
      coordsToLatLngs: vi.fn((coords: any) => {
        if (Array.isArray(coords) && Array.isArray(coords[0])) {
          return coords.map((coord: any) => ({ lat: coord[1], lng: coord[0] }));
        }
        return coords;
      }),
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
    control: {
      polydraw: vi.fn(),
    },
    default: {
      Control: MockControl,
      Map: MockMap,
      FeatureGroup: MockFeatureGroup,
      Polygon: MockPolygon,
      polyline: vi.fn((latlngs, options) => ({
        latlngs: latlngs || [],
        options: options || {},
        addLatLng: vi.fn(),
        setLatLngs: vi.fn(),
        setStyle: vi.fn(),
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [],
          },
        })),
        addTo: vi.fn(),
        on: vi.fn(),
      })),
      GeoJSON: {
        geometryToLayer: vi.fn((geojson: any) => {
          const mockPolygon = new MockPolygon();
          mockPolygon.toGeoJSON = () => geojson;
          return mockPolygon;
        }),
        coordsToLatLngs: vi.fn((coords: any) => {
          if (Array.isArray(coords) && Array.isArray(coords[0])) {
            return coords.map((coord: any) => ({ lat: coord[1], lng: coord[0] }));
          }
          return coords;
        }),
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
      control: {
        polydraw: vi.fn(),
      },
    },
  };
});

describe('Add Elbow Functionality', () => {
  let polydraw: Polydraw;
  let map: L.Map;

  beforeEach(() => {
    // Create a mock map
    map = new L.Map(document.createElement('div'));

    // Create polydraw instance with minimal configuration
    polydraw = new Polydraw({
      config: {
        mergePolygons: false, // Disable merging for cleaner tests
        kinks: false,
      } as any, // Use 'as any' to bypass full config validation in tests
    });
    polydraw.addTo(map);
  });

  describe('Edge Click Detection', () => {
    it('should detect edge clicks and provide correct edge information', () => {
      // Create a real polygon using addAutoPolygon
      const squareCoords = [
        [
          [
            { lat: 58.4, lng: 15.6 },
            { lat: 58.41, lng: 15.6 },
            { lat: 58.41, lng: 15.61 },
            { lat: 58.4, lng: 15.61 },
            { lat: 58.4, lng: 15.6 },
          ],
        ],
      ];

      // Add polygon to polydraw (this should work)
      polydraw.addAutoPolygon(squareCoords as any);

      // Verify that addEdgeClickListeners method exists and can be called
      const addEdgeClickListeners = (polydraw as any).addEdgeClickListeners;
      expect(typeof addEdgeClickListeners).toBe('function');

      // Verify that onEdgeClick method exists and handles edge info correctly
      const onEdgeClick = (polydraw as any).onEdgeClick;
      expect(typeof onEdgeClick).toBe('function');

      // Mock edge polyline with realistic edge info
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

      const mockClickEvent = {
        latlng: { lat: 58.41, lng: 15.605 }, // Click on the right edge
      };

      // Spy on console.log to verify edge detection works
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // This should work (existing functionality)
      expect(() => {
        onEdgeClick.call(polydraw, mockClickEvent, mockEdgePolyline);
      }).not.toThrow();

      // Verify edge click was detected and logged
      expect(consoleSpy).toHaveBeenCalledWith(
        '🎯 Edge clicked!',
        expect.objectContaining({
          ringIndex: 0,
          edgeIndex: 1,
          clickPoint: { lat: 58.41, lng: 15.605 },
          edgeStart: { lat: 58.41, lng: 15.6 },
          edgeEnd: { lat: 58.41, lng: 15.61 },
        }),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Add Elbow API', () => {
    it('should expose addElbowAtEdge method', () => {
      expect(typeof (polydraw as any).addElbowAtEdge).toBe('function');
    });

    it('should expose addElbowAtPosition method', () => {
      expect(typeof (polydraw as any).addElbowAtPosition).toBe('function');
    });

    it('should have elbow-related configuration options', () => {
      const config = (polydraw as any).config;
      expect(config.elbowOptions).toBeDefined();
      expect(config.elbowOptions.enabled).toBe(true);
    });
  });

  describe('Edge Click to Elbow Integration', () => {
    it('should add elbow when edge is clicked', () => {
      const triangleCoords = [
        [
          [
            { lat: 58.4, lng: 15.6 },
            { lat: 58.42, lng: 15.6 },
            { lat: 58.41, lng: 15.62 },
            { lat: 58.4, lng: 15.6 },
          ],
        ],
      ];

      polydraw.addAutoPolygon(triangleCoords as any);

      const initialPolygonCount = (polydraw as any).arrayOfFeatureGroups.length;
      const initialPolygon = (polydraw as any).arrayOfFeatureGroups[0]?.getLayers()[0];
      const initialVertexCount = initialPolygon?.getLatLngs()[0]?.length || 0;

      const edgeClickEvent = {
        latlng: { lat: 58.41, lng: 15.6 },
      };

      const mockEdgePolyline = {
        _polydrawEdgeInfo: {
          ringIndex: 0,
          edgeIndex: 0,
          startPoint: { lat: 58.4, lng: 15.6 },
          endPoint: { lat: 58.42, lng: 15.6 },
          parentPolygon: initialPolygon,
          parentFeatureGroup: (polydraw as any).arrayOfFeatureGroups[0],
        },
      };

      const result = (polydraw as any).handleEdgeClickForElbow(edgeClickEvent, mockEdgePolyline);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.newVertexAdded).toBe(true);
      expect(result.insertedAt).toEqual({ lat: 58.41, lng: 15.6 });

      const updatedPolygon = (polydraw as any).arrayOfFeatureGroups[0]?.getLayers()[0];
      const newVertexCount = updatedPolygon?.getLatLngs()[0]?.length || 0;
      expect(newVertexCount).toBe(initialVertexCount + 1);
    });

    it('should insert elbow at correct position in polygon coordinates', () => {
      const squareCoords = [
        [
          [
            { lat: 58.4, lng: 15.6 },
            { lat: 58.4, lng: 15.61 },
            { lat: 58.41, lng: 15.61 },
            { lat: 58.41, lng: 15.6 },
            { lat: 58.4, lng: 15.6 },
          ],
        ],
      ];

      polydraw.addAutoPolygon(squareCoords as any);

      const edgeIndex = 1;
      const clickPosition = { lat: 58.405, lng: 15.61 };

      const result = (polydraw as any).addElbowAtEdge(0, edgeIndex, clickPosition);

      expect(result.success).toBe(true);

      const updatedPolygon = (polydraw as any).arrayOfFeatureGroups[0]?.getLayers()[0];
      const coordinates = updatedPolygon?.getLatLngs()[0];

      expect(coordinates[edgeIndex + 1]).toEqual(clickPosition);
      expect(coordinates.length).toBe(6);
    });

    it('should handle elbow addition to polygons with holes', () => {
      const polygonWithHole = [
        [
          [
            { lat: 58.4, lng: 15.6 },
            { lat: 58.4, lng: 15.62 },
            { lat: 58.42, lng: 15.62 },
            { lat: 58.42, lng: 15.6 },
            { lat: 58.4, lng: 15.6 },
          ],
          [
            { lat: 58.405, lng: 15.605 },
            { lat: 58.405, lng: 15.615 },
            { lat: 58.415, lng: 15.615 },
            { lat: 58.415, lng: 15.605 },
            { lat: 58.405, lng: 15.605 },
          ],
        ],
      ];

      polydraw.addAutoPolygon([polygonWithHole] as any);

      const ringIndex = 1;
      const edgeIndex = 0;
      const clickPosition = { lat: 58.405, lng: 15.61 };

      const result = (polydraw as any).addElbowToRing(ringIndex, edgeIndex, clickPosition);

      expect(result.success).toBe(true);
      expect(result.ringModified).toBe(ringIndex);
    });
  });

  // describe('Elbow Visual Feedback (TO BE IMPLEMENTED)', () => {
  //   it('should highlight edge differently when elbow mode is active', () => {
  //     const mockEdgePolyline = {
  //       setStyle: vi.fn(),
  //     };

  //     // This will FAIL - elbow mode doesn't exist
  //     (polydraw as any).setElbowMode(true);

  //     const highlightEdgeOnHover = (polydraw as any).highlightEdgeOnHover;
  //     highlightEdgeOnHover.call(polydraw, mockEdgePolyline, true);

  //     // Should use elbow-specific highlight color
  //     expect(mockEdgePolyline.setStyle).toHaveBeenCalledWith({
  //       color: '#00ff00', // Green for elbow mode
  //       weight: 4,
  //       opacity: 1,
  //     });
  //   });

  //   it('should show elbow preview on edge hover', () => {
  //     const mockEdgePolyline = {
  //       _polydrawEdgeInfo: {
  //         startPoint: { lat: 58.4, lng: 15.6 },
  //         endPoint: { lat: 58.41, lng: 15.6 },
  //       },
  //       setStyle: vi.fn(),
  //     };

  //     // This will FAIL - preview functionality doesn't exist
  //     const previewMarker = (polydraw as any).showElbowPreview(mockEdgePolyline, {
  //       lat: 58.405,
  //       lng: 15.6,
  //     });

  //     expect(previewMarker).toBeDefined();
  //     expect(previewMarker.getLatLng()).toEqual({ lat: 58.405, lng: 15.6 });
  //   });
  // });

  // describe('Elbow Undo/Redo Support (TO BE IMPLEMENTED)', () => {
  //   it('should support undoing elbow addition', () => {
  //     // Create polygon and add elbow
  //     const coords = [
  //       [
  //         [
  //           { lat: 58.4, lng: 15.6 },
  //           { lat: 58.41, lng: 15.6 },
  //           { lat: 58.41, lng: 15.61 },
  //           { lat: 58.4, lng: 15.6 },
  //         ],
  //       ],
  //     ];

  //     polydraw.addAutoPolygon(coords as any);

  //     // This will FAIL - undo functionality doesn't exist
  //     const undoState = (polydraw as any).saveUndoState();
  //     (polydraw as any).addElbowAtPosition(0, 0, { lat: 58.405, lng: 15.6 });
  //     const undoResult = (polydraw as any).undo();

  //     expect(undoResult.success).toBe(true);
  //     expect(undoResult.actionUndone).toBe('addElbow');
  //   });
  // });

  // describe('Elbow Configuration (TO BE IMPLEMENTED)', () => {
  //   it('should respect elbow configuration settings', () => {
  //     const customConfig = {
  //       mergePolygons: false,
  //       kinks: false,
  //       elbowOptions: {
  //         enabled: true,
  //         snapToMidpoint: true,
  //         minDistanceFromVertex: 0.001,
  //         maxElbowsPerEdge: 3,
  //       },
  //     };

  //     const configuredPolydraw = new Polydraw({ config: customConfig as any });

  //     // This will FAIL - configuration doesn't exist
  //     const config = (configuredPolydraw as any).config.elbowOptions;
  //     expect(config.enabled).toBe(true);
  //     expect(config.snapToMidpoint).toBe(true);
  //     expect(config.minDistanceFromVertex).toBe(0.001);
  //     expect(config.maxElbowsPerEdge).toBe(3);
  //   });
  // });
});
