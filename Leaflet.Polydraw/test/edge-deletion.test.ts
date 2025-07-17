import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';

describe('Edge Deletion Tests', () => {
  let polydraw: Polydraw;
  let mockMap: any;
  let container: HTMLElement;

  beforeEach(() => {
    // Create a more realistic mock map
    mockMap = {
      dragging: { enable: vi.fn(), disable: vi.fn() },
      doubleClickZoom: { enable: vi.fn(), disable: vi.fn() },
      scrollWheelZoom: { enable: vi.fn(), disable: vi.fn() },
      getContainer: vi.fn(() => ({
        style: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        classList: {
          contains: vi.fn(() => false),
          add: vi.fn(),
          remove: vi.fn(),
        },
      })),
      fire: vi.fn(),
      removeLayer: vi.fn(),
      addLayer: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      containerPointToLatLng: vi.fn(() => ({ lat: 0, lng: 0 })),
    };

    // Create a real DOM container for more realistic testing
    container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '400px';
    document.body.appendChild(container);

    polydraw = new Polydraw({
      config: {
        modes: {
          dragPolygons: true,
          edgeDeletion: true, // New mode for edge deletion
        },
        edgeDeletion: {
          enabled: true,
          modifierKey: 'ctrl', // or 'cmd' on Mac
          hoverColor: '#D9460F', // Reddish color for hover
          confirmDeletion: false, // No confirmation dialog for tests
        },
        markers: {
          markerIcon: {
            styleClasses: 'leaflet-polydraw-marker',
          },
          zIndexOffset: 1000,
          coordsTitle: false,
          menuMarker: false,
          deleteMarker: false,
          infoMarker: false,
        },
      },
    } as any);

    // Initialize the control
    (polydraw as any).map = mockMap;
    (polydraw as any).tracer = {
      setLatLngs: vi.fn(),
    };
  });

  afterEach(() => {
    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Edge Deletion Configuration', () => {
    it('should have edge deletion enabled in config', () => {
      expect((polydraw as any).config.modes.edgeDeletion).toBe(true);
      expect((polydraw as any).config.edgeDeletion.enabled).toBe(true);
    });

    it('should detect correct modifier key based on platform', () => {
      // Mock Windows/Linux user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true,
      });

      const ctrlEvent = { ctrlKey: true, metaKey: false };
      expect((polydraw as any).detectModifierKey(ctrlEvent)).toBe(true);

      // Mock Mac user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        configurable: true,
      });

      const cmdEvent = { ctrlKey: false, metaKey: true };
      expect((polydraw as any).detectModifierKey(cmdEvent)).toBe(true);
    });
  });

  describe('Marker Hover Effects for Edge Deletion', () => {
    it('should change marker color on hover when modifier key is held', () => {
      const mockElement = {
        style: {
          backgroundColor: '',
          borderColor: '',
        },
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn(() => false),
        },
      };

      const mockMarker = {
        getElement: vi.fn(() => mockElement),
        on: vi.fn(),
        off: vi.fn(),
        getLatLng: vi.fn(() => ({ lat: 0, lng: 0 })),
      };

      // Simulate modifier key being held
      (polydraw as any).isModifierKeyHeld = true;

      // Call the hover handler
      (polydraw as any).onMarkerHoverForEdgeDeletion(mockMarker, true);

      expect(mockElement.style.backgroundColor).toBe('#D9460F');
      expect(mockElement.classList.add).toHaveBeenCalledWith('edge-deletion-hover');
    });

    it('should restore normal marker color when hover ends', () => {
      const mockElement = {
        style: {
          backgroundColor: '#D9460F',
          borderColor: '#D9460F',
        },
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn(() => true),
        },
      };

      const mockMarker = {
        getElement: vi.fn(() => mockElement),
        on: vi.fn(),
        off: vi.fn(),
        getLatLng: vi.fn(() => ({ lat: 0, lng: 0 })),
      };

      // Call the hover end handler
      (polydraw as any).onMarkerHoverForEdgeDeletion(mockMarker, false);

      expect(mockElement.style.backgroundColor).toBe('');
      expect(mockElement.style.borderColor).toBe('');
      expect(mockElement.classList.remove).toHaveBeenCalledWith('edge-deletion-hover');
    });

    it('should not change marker color on hover when modifier key is not held', () => {
      const mockElement = {
        style: {
          backgroundColor: '',
          borderColor: '',
        },
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn(() => false),
        },
      };

      const mockMarker = {
        getElement: vi.fn(() => mockElement),
        on: vi.fn(),
        off: vi.fn(),
        getLatLng: vi.fn(() => ({ lat: 0, lng: 0 })),
      };

      // Simulate modifier key NOT being held
      (polydraw as any).isModifierKeyHeld = false;

      // Call the hover handler
      (polydraw as any).onMarkerHoverForEdgeDeletion(mockMarker, true);

      expect(mockElement.style.backgroundColor).toBe('');
      expect(mockElement.classList.add).not.toHaveBeenCalled();
    });
  });

  describe('Edge Deletion Click Handling', () => {
    it('should delete edge when marker is clicked with modifier key', () => {
      const mockPolygon = {
        getLatLngs: vi.fn(() => [
          [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 0 },
            { lat: 1, lng: 1 },
            { lat: 0, lng: 1 },
            { lat: 0, lng: 0 }, // Closing point
          ],
        ]),
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              ],
            ],
          },
        })),
      };

      const mockFeatureGroup = {
        eachLayer: vi.fn((callback) => {
          callback(mockPolygon);
        }),
        clearLayers: vi.fn(),
      };

      const mockMarker = {
        getLatLng: vi.fn(() => ({ lat: 1, lng: 0 })), // Second vertex
        getElement: vi.fn(() => ({
          style: {},
          classList: { add: vi.fn(), remove: vi.fn() },
        })),
      };

      // Mock the edge deletion method
      const deleteEdgeSpy = vi.spyOn(polydraw as any, 'deleteEdgeAtMarker');
      deleteEdgeSpy.mockImplementation(() => {});

      // Simulate modifier key click
      const clickEvent = {
        originalEvent: { ctrlKey: true },
        latlng: { lat: 1, lng: 0 },
      };

      (polydraw as any).arrayOfFeatureGroups = [mockFeatureGroup];
      (polydraw as any).onMarkerClickForEdgeDeletion(mockMarker, clickEvent);

      expect(deleteEdgeSpy).toHaveBeenCalledWith(mockMarker, mockFeatureGroup);
    });

    it('should not delete edge when marker is clicked without modifier key', () => {
      const mockMarker = {
        getLatLng: vi.fn(() => ({ lat: 1, lng: 0 })),
        getElement: vi.fn(() => ({
          style: {},
          classList: { add: vi.fn(), remove: vi.fn() },
        })),
      };

      const deleteEdgeSpy = vi.spyOn(polydraw as any, 'deleteEdgeAtMarker');
      deleteEdgeSpy.mockImplementation(() => {});

      // Simulate normal click (no modifier key)
      const clickEvent = {
        originalEvent: { ctrlKey: false },
        latlng: { lat: 1, lng: 0 },
      };

      (polydraw as any).onMarkerClickForEdgeDeletion(mockMarker, clickEvent);

      expect(deleteEdgeSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Deletion Logic', () => {
    it('should delete edge and reconnect surrounding edges for simple polygon', () => {
      // Create a square polygon
      const originalCoords = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
        { lat: 0, lng: 0 }, // Closing point
      ];

      const mockPolygon = {
        getLatLngs: vi.fn(() => [originalCoords]),
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              ],
            ],
          },
        })),
      };

      const mockFeatureGroup = {
        eachLayer: vi.fn((callback) => {
          callback(mockPolygon);
        }),
        clearLayers: vi.fn(),
      };

      const mockMarker = {
        getLatLng: vi.fn(() => ({ lat: 1, lng: 0 })), // Second vertex (index 1)
      };

      // Mock the polygon reconstruction
      const removeFeatureGroupSpy = vi.spyOn(polydraw as any, 'removeFeatureGroup');
      const addPolygonSpy = vi.spyOn(polydraw as any, 'addPolygon');

      removeFeatureGroupSpy.mockImplementation(() => {});
      addPolygonSpy.mockImplementation(() => {});

      (polydraw as any).deleteEdgeAtMarker(mockMarker, mockFeatureGroup);

      // Verify that the polygon was removed and a new one was added
      expect(removeFeatureGroupSpy).toHaveBeenCalledWith(mockFeatureGroup);
      expect(addPolygonSpy).toHaveBeenCalled();

      // Check that the new polygon has one less vertex
      const addPolygonCall = addPolygonSpy.mock.calls[0];
      const newPolygonGeoJSON = addPolygonCall[0] as any;
      const newCoords = newPolygonGeoJSON.geometry.coordinates[0];

      // Should have 4 coordinates (3 unique vertices + closing point) instead of 5
      expect(newCoords.length).toBe(4);
      // Should not contain the deleted vertex [0, 1]
      expect(newCoords).not.toContainEqual([0, 1]);
    });

    it('should handle edge deletion for polygon with holes', () => {
      // Create a polygon with a hole
      const outerRing = [
        { lat: 0, lng: 0 },
        { lat: 3, lng: 0 },
        { lat: 3, lng: 3 },
        { lat: 0, lng: 3 },
        { lat: 0, lng: 0 },
      ];

      const hole = [
        { lat: 1, lng: 1 },
        { lat: 2, lng: 1 },
        { lat: 2, lng: 2 },
        { lat: 1, lng: 2 },
        { lat: 1, lng: 1 },
      ];

      const mockPolygon = {
        getLatLngs: vi.fn(() => [outerRing, hole]),
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0, 3],
                [3, 3],
                [3, 0],
                [0, 0],
              ],
              [
                [1, 1],
                [2, 1],
                [2, 2],
                [1, 2],
                [1, 1],
              ],
            ],
          },
        })),
      };

      const mockFeatureGroup = {
        eachLayer: vi.fn((callback) => {
          callback(mockPolygon);
        }),
        clearLayers: vi.fn(),
      };

      const mockMarker = {
        getLatLng: vi.fn(() => ({ lat: 2, lng: 1 })), // Hole vertex
      };

      const removeFeatureGroupSpy = vi.spyOn(polydraw as any, 'removeFeatureGroup');
      const addPolygonSpy = vi.spyOn(polydraw as any, 'addPolygon');

      removeFeatureGroupSpy.mockImplementation(() => {});
      addPolygonSpy.mockImplementation(() => {});

      (polydraw as any).deleteEdgeAtMarker(mockMarker, mockFeatureGroup);

      expect(removeFeatureGroupSpy).toHaveBeenCalled();
      expect(addPolygonSpy).toHaveBeenCalled();
    });

    it('should prevent deletion if it would create invalid polygon', () => {
      // Create a triangle (minimum valid polygon)
      const triangleCoords = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 0.5, lng: 1 },
        { lat: 0, lng: 0 }, // Closing point
      ];

      const mockPolygon = {
        getLatLngs: vi.fn(() => [triangleCoords]),
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0, 1],
                [1, 0.5],
                [0, 0],
              ],
            ],
          },
        })),
      };

      const mockFeatureGroup = {
        eachLayer: vi.fn((callback) => {
          callback(mockPolygon);
        }),
        clearLayers: vi.fn(),
      };

      const mockMarker = {
        getLatLng: vi.fn(() => ({ lat: 1, lng: 0 })), // One of the triangle vertices
      };

      const removeFeatureGroupSpy = vi.spyOn(polydraw as any, 'removeFeatureGroup');
      const addPolygonLayerSpy = vi.spyOn(polydraw as any, 'addPolygonLayer');

      removeFeatureGroupSpy.mockImplementation(() => {});
      addPolygonLayerSpy.mockImplementation(() => {});

      (polydraw as any).deleteEdgeAtMarker(mockMarker, mockFeatureGroup);

      // Should not delete the edge because it would create an invalid polygon
      expect(removeFeatureGroupSpy).not.toHaveBeenCalled();
      expect(addPolygonLayerSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Deletion Utility Functions', () => {
    it('should find correct marker index in polygon coordinates', () => {
      const coords = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
        { lat: 0, lng: 0 },
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
        { lat: 0, lng: 0 },
      ];

      const markerLatLng = { lat: 2, lng: 2 }; // Not in the polygon

      const index = (polydraw as any).findMarkerIndexInCoords(coords, markerLatLng);
      expect(index).toBe(-1);
    });

    it('should validate polygon has minimum vertices after deletion', () => {
      // Test with 4 vertices (3 unique + closing) - should be valid
      const validCoords = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 0 },
      ];

      expect((polydraw as any).isValidPolygonAfterDeletion(validCoords, 1)).toBe(true);

      // Test with 3 vertices (2 unique + closing) - should be invalid
      const invalidCoords = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 0, lng: 0 },
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
      expect(newCoords).toEqual([
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
        { lat: 0, lng: 0 },
      ]);
    });
  });

  describe('Edge Deletion Integration', () => {
    it('should integrate edge deletion with existing polygon operations', () => {
      const mockPolygon = {
        getLatLngs: vi.fn(() => [
          [
            { lat: 0, lng: 0 },
            { lat: 2, lng: 0 },
            { lat: 2, lng: 2 },
            { lat: 0, lng: 2 },
            { lat: 0, lng: 0 },
          ],
        ]),
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0, 2],
                [2, 2],
                [2, 0],
                [0, 0],
              ],
            ],
          },
        })),
      };

      const mockFeatureGroup = {
        eachLayer: vi.fn((callback) => {
          callback(mockPolygon);
        }),
        clearLayers: vi.fn(),
      };

      (polydraw as any).arrayOfFeatureGroups = [mockFeatureGroup];

      // Mock polygon information service
      const polygonInfoSpy = vi.spyOn(
        (polydraw as any).polygonInformation,
        'createPolygonInformationStorage',
      );
      polygonInfoSpy.mockImplementation(() => {});

      const mockMarker = {
        getLatLng: vi.fn(() => ({ lat: 2, lng: 0 })), // Delete one vertex
      };

      const removeFeatureGroupSpy = vi.spyOn(polydraw as any, 'removeFeatureGroup');
      const addPolygonLayerSpy = vi.spyOn(polydraw as any, 'addPolygonLayer');

      removeFeatureGroupSpy.mockImplementation(() => {});
      addPolygonLayerSpy.mockImplementation(() => {});

      (polydraw as any).deleteEdgeAtMarker(mockMarker, mockFeatureGroup);

      // Verify integration with polygon information service
      expect(polygonInfoSpy).toHaveBeenCalled();
    });

    it('should handle edge deletion with polygon merging enabled', () => {
      // Enable merging
      (polydraw as any).mergePolygons = true;

      const mockPolygon = {
        getLatLngs: vi.fn(() => [
          [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 0 },
            { lat: 1, lng: 1 },
            { lat: 0, lng: 1 },
            { lat: 0, lng: 0 },
          ],
        ]),
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              ],
            ],
          },
        })),
      };

      const mockFeatureGroup = {
        eachLayer: vi.fn((callback) => {
          callback(mockPolygon);
        }),
        clearLayers: vi.fn(),
      };

      const mockMarker = {
        getLatLng: vi.fn(() => ({ lat: 1, lng: 0 })),
      };

      const addPolygonSpy = vi.spyOn(polydraw as any, 'addPolygon');
      addPolygonSpy.mockImplementation(() => {});

      (polydraw as any).deleteEdgeAtMarker(mockMarker, mockFeatureGroup);

      // Verify that addPolygon is called with merge enabled (noMerge = false)
      expect(addPolygonSpy).toHaveBeenCalledWith(expect.any(Object), false, false);
    });
  });

  describe('Edge Deletion Error Handling', () => {
    it('should handle errors gracefully when polygon data is invalid', () => {
      const mockPolygon = {
        getLatLngs: vi.fn(() => null), // Invalid data
        toGeoJSON: vi.fn(() => null),
      };

      const mockFeatureGroup = {
        eachLayer: vi.fn((callback) => {
          callback(mockPolygon);
        }),
        clearLayers: vi.fn(),
      };

      const mockMarker = {
        getLatLng: vi.fn(() => ({ lat: 1, lng: 0 })),
      };

      expect(() => {
        (polydraw as any).deleteEdgeAtMarker(mockMarker, mockFeatureGroup);
      }).not.toThrow();
    });

    it('should handle errors when marker is not found in polygon', () => {
      const mockPolygon = {
        getLatLngs: vi.fn(() => [
          [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 0 },
            { lat: 1, lng: 1 },
            { lat: 0, lng: 1 },
            { lat: 0, lng: 0 },
          ],
        ]),
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              ],
            ],
          },
        })),
      };

      const mockFeatureGroup = {
        eachLayer: vi.fn((callback) => {
          callback(mockPolygon);
        }),
        clearLayers: vi.fn(),
      };

      const mockMarker = {
        getLatLng: vi.fn(() => ({ lat: 5, lng: 5 })), // Not in polygon
      };

      const removeFeatureGroupSpy = vi.spyOn(polydraw as any, 'removeFeatureGroup');
      removeFeatureGroupSpy.mockImplementation(() => {});

      (polydraw as any).deleteEdgeAtMarker(mockMarker, mockFeatureGroup);

      // Should not remove the polygon if marker is not found
      expect(removeFeatureGroupSpy).not.toHaveBeenCalled();
    });
  });
});
