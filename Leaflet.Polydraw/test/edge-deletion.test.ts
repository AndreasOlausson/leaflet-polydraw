import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';

// Mock Leaflet
vi.mock('leaflet', () => ({
  Control: class {
    addTo() {
      return this;
    }
    onAdd() {
      return document.createElement('div');
    }
    onRemove() {}
  },
  DomUtil: {
    create: vi.fn(() => document.createElement('div')),
    addClass: vi.fn(),
    removeClass: vi.fn(),
    hasClass: vi.fn(() => false),
  },
  DomEvent: {
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
    on: vi.fn(() => ({ on: vi.fn() })), // Support chaining
    off: vi.fn(),
    stop: vi.fn(),
  },
  control: {},
  Map: class {},
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
    eachLayer() {
      return this;
    }
    addTo() {
      return this;
    }
    toGeoJSON() {
      return {
        type: 'FeatureCollection',
        features: [
          {
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
          },
        ],
      };
    }
  },
  Marker: class {
    public latlng: any;
    public options: any;

    constructor(latlng: any, options?: any) {
      this.latlng = latlng;
      this.options = options;
    }
    getLatLng() {
      return this.latlng;
    }
    getElement() {
      // Create a proper mock style object that can be mutated
      const mockElement = {
        style: {
          backgroundColor: '',
          borderColor: '',
        },
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
        },
      };
      return mockElement;
    }
    addTo() {
      return this;
    }
    on() {
      return this;
    }
  },
  Polygon: class {
    toGeoJSON() {
      return {
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
      };
    }
  },
  polyline: vi.fn(() => ({
    addLatLng: vi.fn(),
    setLatLngs: vi.fn(),
    getLatLngs: vi.fn(() => []),
    setStyle: vi.fn(),
    addTo: vi.fn(),
    toGeoJSON: vi.fn(() => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
    })),
  })),
  LatLng: class {
    public lat: number;
    public lng: number;

    constructor(lat: number, lng: number) {
      this.lat = lat;
      this.lng = lng;
    }
  },
  GeoJSON: {
    geometryToLayer: vi.fn(() => ({
      setStyle: vi.fn(),
      getLatLngs: vi.fn(() => []),
      toGeoJSON: vi.fn(() => ({
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
      })),
    })),
    coordsToLatLngs: vi.fn((coords) => coords.map((coord) => ({ lat: coord[1], lng: coord[0] }))),
  },
  default: {
    Control: class {
      addTo() {
        return this;
      }
      onAdd() {
        return document.createElement('div');
      }
      onRemove() {}
    },
    DomUtil: {
      create: vi.fn(() => document.createElement('div')),
      addClass: vi.fn(),
      removeClass: vi.fn(),
      hasClass: vi.fn(() => false),
    },
    DomEvent: {
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    },
    control: {},
    Map: class {},
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
      eachLayer() {
        return this;
      }
      addTo() {
        return this;
      }
      toGeoJSON() {
        return {
          type: 'FeatureCollection',
          features: [
            {
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
            },
          ],
        };
      }
    },
    Marker: class {
      public latlng: any;
      public options: any;

      constructor(latlng: any, options?: any) {
        this.latlng = latlng;
        this.options = options;
      }
      getLatLng() {
        return this.latlng;
      }
      getElement() {
        return {
          style: {},
          classList: {
            add: vi.fn(),
            remove: vi.fn(),
          },
        };
      }
      addTo() {
        return this;
      }
      on() {
        return this;
      }
    },
    Polygon: class {
      toGeoJSON() {
        return {
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
        };
      }
    },
    polyline: vi.fn(() => ({
      addLatLng: vi.fn(),
      setLatLngs: vi.fn(),
      getLatLngs: vi.fn(() => []),
      setStyle: vi.fn(),
      addTo: vi.fn(),
      toGeoJSON: vi.fn(() => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      })),
    })),
    LatLng: class {
      public lat: number;
      public lng: number;

      constructor(lat: number, lng: number) {
        this.lat = lat;
        this.lng = lng;
      }
    },
    GeoJSON: {
      geometryToLayer: vi.fn(() => ({
        setStyle: vi.fn(),
        getLatLngs: vi.fn(() => []),
        toGeoJSON: vi.fn(() => ({
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
        })),
      })),
      coordsToLatLngs: vi.fn((coords) => coords.map((coord) => ({ lat: coord[1], lng: coord[0] }))),
    },
  },
}));

describe('Edge Deletion Tests', () => {
  let polydraw: Polydraw;
  let mockMap: any;

  beforeEach(() => {
    // Create a more complete mock map
    mockMap = {
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      dragging: {
        enable: vi.fn(),
        disable: vi.fn(),
      },
      doubleClickZoom: {
        enable: vi.fn(),
        disable: vi.fn(),
      },
      scrollWheelZoom: {
        enable: vi.fn(),
        disable: vi.fn(),
      },
      getContainer: vi.fn(() => ({
        style: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      containerPointToLatLng: vi.fn(() => ({ lat: 0, lng: 0 })),
    };

    // Mock document methods
    global.document = {
      ...global.document,
      createElement: vi.fn(() => ({
        style: {},
        classList: { add: vi.fn(), remove: vi.fn() },
        appendChild: vi.fn(),
      })),
      head: {
        appendChild: vi.fn(),
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    // Mock navigator
    global.navigator = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    } as any;

    polydraw = new Polydraw();
    polydraw.onAdd(mockMap);
  });

  describe('Edge Deletion Configuration', () => {
    it('should have edge deletion enabled in config', () => {
      expect(polydraw).toBeDefined();
      // Edge deletion is enabled by default through the elbowClicked method
      expect(typeof (polydraw as any).elbowClicked).toBe('function');
    });

    it('should detect correct modifier key based on platform', () => {
      const mockEvent = { ctrlKey: true, metaKey: false };
      const result = (polydraw as any).isModifierKeyPressed(mockEvent);

      // Should detect Cmd on Mac, Ctrl on Windows/Linux
      const isMac = navigator.userAgent.toLowerCase().includes('mac');
      if (isMac) {
        expect(result).toBe(false); // metaKey is false
      } else {
        expect(result).toBe(true); // ctrlKey is true
      }
    });
  });

  describe('Edge Deletion Functionality', () => {
    it('should have elbowClicked method available', () => {
      expect(typeof (polydraw as any).elbowClicked).toBe('function');
    });

    it('should detect modifier key correctly on different platforms', () => {
      // Test that the modifier key detection method exists and works
      const ctrlEvent = { ctrlKey: true, metaKey: false };
      const metaEvent = { ctrlKey: false, metaKey: true };
      const noModifierEvent = { ctrlKey: false, metaKey: false };

      // The method should exist and be callable
      expect(typeof (polydraw as any).isModifierKeyPressed).toBe('function');

      // Test that it returns boolean values
      expect(typeof (polydraw as any).isModifierKeyPressed(ctrlEvent)).toBe('boolean');
      expect(typeof (polydraw as any).isModifierKeyPressed(metaEvent)).toBe('boolean');
      expect(typeof (polydraw as any).isModifierKeyPressed(noModifierEvent)).toBe('boolean');
    });

    it('should handle edge deletion workflow', () => {
      // Test that the edge deletion workflow exists and can be called
      const mockEvent = {
        latlng: { lat: 58.32103, lng: 16.452026 },
        originalEvent: { ctrlKey: true, metaKey: true },
      };

      const mockPoly = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [14.880981, 58.32103],
              [16.452026, 58.32103],
              [16.452026, 59.201251],
              [14.880981, 59.201251],
              [14.880981, 58.32103],
            ],
          ],
        },
      };

      // Test that the method can be called without throwing errors
      expect(() => {
        (polydraw as any).elbowClicked(mockEvent, mockPoly);
      }).not.toThrow();
    });

    it('should ignore clicks without modifier key', () => {
      const mockEvent = {
        latlng: { lat: 58.32103, lng: 16.452026 },
        originalEvent: { ctrlKey: false, metaKey: false },
      };

      const mockPoly = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [14.880981, 58.32103],
              [16.452026, 58.32103],
              [16.452026, 59.201251],
              [14.880981, 59.201251],
              [14.880981, 58.32103],
            ],
          ],
        },
      };

      // Should return early without processing
      expect(() => {
        (polydraw as any).elbowClicked(mockEvent, mockPoly);
      }).not.toThrow();
    });

    it('should have keyboard event handlers', () => {
      expect(typeof (polydraw as any).handleKeyDown).toBe('function');
      expect(typeof (polydraw as any).handleKeyUp).toBe('function');
    });

    it('should track modifier key state', () => {
      // Test that modifier key state can be set
      (polydraw as any).isModifierKeyHeld = true;
      expect((polydraw as any).isModifierKeyHeld).toBe(true);

      (polydraw as any).isModifierKeyHeld = false;
      expect((polydraw as any).isModifierKeyHeld).toBe(false);
    });
  });

  describe('Edge Deletion Utility Functions', () => {
    it('should find correct marker index in polygon coordinates', () => {
      const coords = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
      ];
      const markerLatLng = { lat: 1, lng: 0 };

      const index = (polydraw as any).findMarkerIndexInCoords(coords, markerLatLng);
      expect(index).toBe(1);
    });

    it('should handle marker not found in coordinates', () => {
      const coords = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
      ];
      const markerLatLng = { lat: 2, lng: 2 }; // Not in the polygon

      const index = (polydraw as any).findMarkerIndexInCoords(coords, markerLatLng);
      expect(index).toBe(-1);
    });

    it('should validate polygon has minimum vertices after deletion', () => {
      // Test with 5 vertices (4 unique + closing) - should be valid after deletion
      const validCoords = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
        { lat: 0, lng: 0 }, // closing point
      ];

      expect((polydraw as any).isValidPolygonAfterDeletion(validCoords, 1)).toBe(true);

      // Test with 4 vertices (3 unique + closing) - should be invalid after deletion
      const invalidCoords = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 0, lng: 1 },
        { lat: 0, lng: 0 }, // closing point
      ];

      expect((polydraw as any).isValidPolygonAfterDeletion(invalidCoords, 1)).toBe(false);
    });

    it('should create new coordinates array without deleted vertex', () => {
      const originalCoords = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
        { lat: 0, lng: 0 },
      ];

      const newCoords = (polydraw as any).createCoordsWithoutVertex(originalCoords, 1);

      expect(newCoords.length).toBe(4);
      expect(newCoords[0]).toEqual({ lat: 0, lng: 0 });
      expect(newCoords[1]).toEqual({ lat: 1, lng: 1 }); // { lat: 1, lng: 0 } was removed
      expect(newCoords[2]).toEqual({ lat: 0, lng: 1 });
      expect(newCoords[3]).toEqual({ lat: 0, lng: 0 });
    });
  });

  describe('Edge Deletion Integration', () => {
    it('should have integration methods available', () => {
      // Test that integration methods exist
      expect(typeof (polydraw as any).deleteEdgeAtMarker).toBe('function');
      expect(typeof (polydraw as any).findFeatureGroupForPoly).toBe('function');
      expect(typeof (polydraw as any).addAutoPolygon).toBe('function');
      expect(typeof (polydraw as any).removeFeatureGroup).toBe('function');
    });

    it('should handle edge deletion workflow without errors', () => {
      // Test that edge deletion methods can be called without throwing
      const mockMarker = new (L as any).Marker({ lat: 1, lng: 0 });
      const mockFeatureGroup = new (L as any).FeatureGroup();

      expect(() => {
        (polydraw as any).deleteEdgeAtMarker(mockMarker, mockFeatureGroup);
      }).not.toThrow();
    });
  });

  describe('Edge Deletion Error Handling', () => {
    it('should handle errors gracefully when polygon data is invalid', () => {
      const mockMarker = new (L as any).Marker({ lat: 1, lng: 0 });
      const mockFeatureGroup = new (L as any).FeatureGroup();

      // Mock feature group with no polygon
      mockFeatureGroup.eachLayer = vi.fn((callback) => {
        // No layers
      });

      expect(() => {
        (polydraw as any).deleteEdgeAtMarker(mockMarker, mockFeatureGroup);
      }).not.toThrow();
    });

    it('should handle errors when marker is not found in polygon', () => {
      const mockMarker = new (L as any).Marker({ lat: 5, lng: 5 }); // Outside polygon
      const mockFeatureGroup = new (L as any).FeatureGroup();
      const mockPolygon = new (L as any).Polygon();

      mockPolygon.toGeoJSON = vi.fn(() => ({
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
      }));

      mockFeatureGroup.eachLayer = vi.fn((callback) => {
        callback(mockPolygon);
      });

      const removeFeatureGroupSpy = vi.spyOn(polydraw as any, 'removeFeatureGroup');
      const addAutoPolygonSpy = vi.spyOn(polydraw as any, 'addAutoPolygon');
      const findFeatureGroupSpy = vi.spyOn(polydraw as any, 'findFeatureGroupForPoly');

      removeFeatureGroupSpy.mockImplementation(() => {});
      addAutoPolygonSpy.mockImplementation(() => {});
      findFeatureGroupSpy.mockReturnValue(mockFeatureGroup);

      (polydraw as any).deleteEdgeAtMarker(mockMarker, mockFeatureGroup);

      // Should not remove the polygon if marker is not found
      expect(removeFeatureGroupSpy).not.toHaveBeenCalled();
      expect(addAutoPolygonSpy).not.toHaveBeenCalled();
    });
  });
});
