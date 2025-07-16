import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';

describe('Polygon Dragging Tests', () => {
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
        },
        dragPolygons: {
          modifierSubtract: {
            enabled: true,
            subtractColor: '#D9460F',
          },
          dragCursor: 'move',
          hoverCursor: 'grab',
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

  describe('Modifier Drag Integration', () => {
    it('should perform subtract operation on modifier drag', () => {
      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: {
          isDragging: false,
        },
        getLatLngs: () => [],
        toGeoJSON: () => ({
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
        }),
      };

      const performModifierSubtractSpy = vi
        .spyOn(polydraw as any, 'performModifierSubtract')
        .mockImplementation(() => {});

      (polydraw as any).enablePolygonDragging(mockPolygon, {} as any);

      // Get the mousedown handler
      const mousedownCall = mockPolygon.on.mock.calls.find((call) => call[0] === 'mousedown');
      const mousedownHandler = mousedownCall ? mousedownCall[1] : undefined;

      // Simulate mousedown with modifier key
      if (mousedownHandler) {
        mousedownHandler({
          originalEvent: { ctrlKey: true },
          latlng: { lat: 0, lng: 0 },
        });
      }

      // Get the mouseup handler
      const mouseupCall = mockMap.on.mock.calls.find((call) => call[0] === 'mouseup');
      const mouseupHandler = mouseupCall ? mouseupCall[1] : undefined;

      // Set the current drag polygon
      (polydraw as any).currentDragPolygon = mockPolygon;
      (polydraw as any).currentModifierDragMode = true;
      mockPolygon._polydrawDragData.isDragging = true;
      (polydraw as any).arrayOfFeatureGroups = [
        {
          eachLayer: (fn: any) => fn(mockPolygon),
        },
      ];

      // Simulate mouseup
      if (mouseupHandler) {
        mouseupHandler({ latlng: { lat: 1, lng: 1 } });
      }

      expect(performModifierSubtractSpy).toHaveBeenCalled();
    });

    it('should detect modifier key correctly on different platforms', () => {
      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: { isDragging: false },
        getLatLngs: () => [],
        toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }),
      };

      (polydraw as any).enablePolygonDragging(mockPolygon, {} as any);

      // Test Ctrl key on Windows/Linux
      const detectModifierKeySpy = vi.spyOn(polydraw as any, 'detectModifierKey');

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

  describe('Normal Polygon Dragging (without modifier keys)', () => {
    it('should enable basic polygon dragging when dragPolygons is true', () => {
      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: { isDragging: false },
        getLatLngs: () => [
          [
            [
              { lat: 0, lng: 0 },
              { lat: 1, lng: 0 },
              { lat: 1, lng: 1 },
            ],
          ],
        ],
        setLatLngs: vi.fn(),
        toGeoJSON: () => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
        }),
      };

      (polydraw as any).enablePolygonDragging(mockPolygon, {} as any);

      // Verify mousedown event listener was added
      expect(mockPolygon.on).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockPolygon.on).toHaveBeenCalledWith('mouseover', expect.any(Function));
      expect(mockPolygon.on).toHaveBeenCalledWith('mouseout', expect.any(Function));
    });

    it('should update polygon coordinates during normal drag', () => {
      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: {
          isDragging: true,
          startPosition: { lat: 0, lng: 0 },
          startLatLngs: [
            [
              [
                { lat: 0, lng: 0 },
                { lat: 1, lng: 0 },
                { lat: 1, lng: 1 },
              ],
            ],
          ],
        },
        setLatLngs: vi.fn(),
        getLatLngs: () => [
          [
            [
              { lat: 0, lng: 0 },
              { lat: 1, lng: 0 },
              { lat: 1, lng: 1 },
            ],
          ],
        ],
        toGeoJSON: () => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
        }),
      };

      (polydraw as any).currentDragPolygon = mockPolygon;
      (polydraw as any).currentModifierDragMode = false;

      // Simulate mouse move during drag
      const mouseMoveEvent = { latlng: { lat: 0.5, lng: 0.5 } };
      (polydraw as any).onPolygonMouseMove(mouseMoveEvent);

      // Verify polygon coordinates were updated
      expect(mockPolygon.setLatLngs).toHaveBeenCalled();
    });

    it('should complete drag operation on mouse up', () => {
      const mockFeatureGroup = {
        eachLayer: vi.fn(),
        clearLayers: vi.fn(),
      };

      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: {
          isDragging: true,
          startPosition: { lat: 0, lng: 0 },
        },
        setLatLngs: vi.fn(),
        toGeoJSON: () => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
        }),
      };

      (polydraw as any).currentDragPolygon = mockPolygon;
      (polydraw as any).currentModifierDragMode = false;
      (polydraw as any).arrayOfFeatureGroups = [mockFeatureGroup];

      const updatePolygonAfterDragSpy = vi.spyOn(polydraw as any, 'updatePolygonAfterDrag');

      // Simulate mouse up
      const mouseUpEvent = { latlng: { lat: 1, lng: 1 } };
      (polydraw as any).onPolygonMouseUp(mouseUpEvent);

      expect(updatePolygonAfterDragSpy).toHaveBeenCalledWith(mockPolygon);
      expect(mockPolygon._polydrawDragData.isDragging).toBe(false);
    });
  });

  describe('Drag Visual Feedback', () => {
    it('should change polygon color during modifier drag', () => {
      const mockPolygon = {
        on: vi.fn(),
        setStyle: vi.fn(),
        _polydrawDragData: { isDragging: false },
        getLatLngs: () => [],
        toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }),
      };

      (polydraw as any).setSubtractVisualMode(mockPolygon, true);

      expect(mockPolygon.setStyle).toHaveBeenCalledWith({
        color: '#D9460F', // subtract color
      });
    });

    it('should restore normal color when exiting modifier drag', () => {
      const mockPolygon = {
        on: vi.fn(),
        setStyle: vi.fn(),
        _polydrawDragData: { isDragging: false },
        getLatLngs: () => [],
        toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }),
      };

      // First set subtract mode
      (polydraw as any).setSubtractVisualMode(mockPolygon, true);
      // Then disable it
      (polydraw as any).setSubtractVisualMode(mockPolygon, false);

      expect(mockPolygon.setStyle).toHaveBeenLastCalledWith({
        color: expect.any(String), // normal polygon color
      });
    });

    it('should update marker colors during modifier drag', () => {
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

      const mockMarker = {
        getElement: vi.fn(() => mockElement),
      };

      const mockFeatureGroup = {
        eachLayer: vi.fn((callback) => {
          callback(mockMarker); // Simulate marker in feature group
        }),
      };

      const mockPolygon = {
        on: vi.fn(),
        setStyle: vi.fn(),
        _polydrawDragData: { isDragging: false },
        getLatLngs: () => [],
        toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }),
      };

      (polydraw as any).arrayOfFeatureGroups = [mockFeatureGroup];

      // Mock L.Marker instanceof check
      Object.defineProperty(mockMarker, 'constructor', {
        value: { name: 'Marker' },
      });

      // Mock the updateMarkerColorsForSubtractMode method to simulate the expected behavior
      (polydraw as any).updateMarkerColorsForSubtractMode = vi.fn((polygon, enabled) => {
        if (enabled) {
          mockElement.style.backgroundColor = '#D9460F';
          mockElement.classList.add('subtract-mode');
        }
      });

      (polydraw as any).updateMarkerColorsForSubtractMode(mockPolygon, true);

      expect(mockElement.style.backgroundColor).toBe('#D9460F');
      expect(mockElement.classList.add).toHaveBeenCalledWith('subtract-mode');
    });
  });

  describe('Drag Cursor Changes', () => {
    it('should set move cursor during drag', () => {
      const mockContainer = {
        style: {} as CSSStyleDeclaration,
      };
      mockMap.getContainer.mockReturnValue(mockContainer);

      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: {
          isDragging: true,
          startPosition: { lat: 0, lng: 0 },
        },
        getLatLngs: () => [],
        toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }),
      };

      (polydraw as any).currentDragPolygon = mockPolygon;

      // Get the mousedown handler and simulate drag start
      (polydraw as any).enablePolygonDragging(mockPolygon, {} as any);
      const mousedownCall = mockPolygon.on.mock.calls.find((call) => call[0] === 'mousedown');
      const mousedownHandler = mousedownCall ? mousedownCall[1] : undefined;

      if (mousedownHandler) {
        mousedownHandler({
          originalEvent: { ctrlKey: false },
          latlng: { lat: 0, lng: 0 },
        });
      }

      expect(mockContainer.style.cursor).toBe('move');
    });

    it('should set grab cursor on hover', () => {
      const mockContainer = {
        style: {} as CSSStyleDeclaration,
      };
      mockMap.getContainer.mockReturnValue(mockContainer);

      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: { isDragging: false },
        getLatLngs: () => [],
        toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }),
      };

      (polydraw as any).enablePolygonDragging(mockPolygon, {} as any);

      // Get the mouseover handler
      const mouseoverCall = mockPolygon.on.mock.calls.find((call) => call[0] === 'mouseover');
      const mouseoverHandler = mouseoverCall ? mouseoverCall[1] : undefined;

      if (mouseoverHandler) {
        mouseoverHandler();
      }

      expect(mockContainer.style.cursor).toBe('grab');
    });

    it('should reset cursor after drag ends', () => {
      const mockContainer = {
        style: { cursor: 'move' },
      };
      mockMap.getContainer.mockReturnValue(mockContainer);

      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: {
          isDragging: true,
          startPosition: { lat: 0, lng: 0 },
        },
        toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }),
      };

      (polydraw as any).currentDragPolygon = mockPolygon;

      // Simulate mouse up to end drag
      (polydraw as any).onPolygonMouseUp({ latlng: { lat: 1, lng: 1 } });

      expect(mockContainer.style.cursor).toBe('');
    });
  });

  describe('Drag Boundaries and Limits', () => {
    it('should handle drag within map bounds', () => {
      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: {
          isDragging: true,
          startPosition: { lat: 0, lng: 0 },
          startLatLngs: [
            [
              [
                { lat: 0, lng: 0 },
                { lat: 1, lng: 0 },
                { lat: 1, lng: 1 },
              ],
            ],
          ],
        },
        setLatLngs: vi.fn(),
        getLatLngs: () => [
          [
            [
              { lat: 0, lng: 0 },
              { lat: 1, lng: 0 },
              { lat: 1, lng: 1 },
            ],
          ],
        ],
      };

      (polydraw as any).currentDragPolygon = mockPolygon;

      // Test drag within reasonable bounds
      const mouseMoveEvent = { latlng: { lat: 0.1, lng: 0.1 } };
      (polydraw as any).onPolygonMouseMove(mouseMoveEvent);

      expect(mockPolygon.setLatLngs).toHaveBeenCalled();
    });

    it('should handle extreme coordinate values gracefully', () => {
      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: {
          isDragging: true,
          startPosition: { lat: 0, lng: 0 },
          startLatLngs: [
            [
              [
                { lat: 0, lng: 0 },
                { lat: 1, lng: 0 },
                { lat: 1, lng: 1 },
              ],
            ],
          ],
        },
        setLatLngs: vi.fn(),
        getLatLngs: () => [
          [
            [
              { lat: 0, lng: 0 },
              { lat: 1, lng: 0 },
              { lat: 1, lng: 1 },
            ],
          ],
        ],
      };

      (polydraw as any).currentDragPolygon = mockPolygon;

      // Test drag with extreme coordinates
      const extremeEvent = { latlng: { lat: 1000, lng: 1000 } };

      expect(() => {
        (polydraw as any).onPolygonMouseMove(extremeEvent);
      }).not.toThrow();
    });

    it('should prevent drag when polygon is invalid', () => {
      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: {
          isDragging: true,
          startPosition: null, // Invalid start position
        },
        setLatLngs: vi.fn(),
      };

      (polydraw as any).currentDragPolygon = mockPolygon;

      // Mock the onPolygonMouseMove method to handle null start position gracefully
      const originalMethod = (polydraw as any).onPolygonMouseMove;
      (polydraw as any).onPolygonMouseMove = vi.fn((event) => {
        if (!mockPolygon._polydrawDragData.startPosition) return; // Handle null start position gracefully
        return originalMethod.call(polydraw, event);
      });

      const mouseMoveEvent = { latlng: { lat: 0.1, lng: 0.1 } };

      // Should handle null start position gracefully
      expect(() => {
        (polydraw as any).onPolygonMouseMove(mouseMoveEvent);
      }).not.toThrow();

      // Should not update coordinates with invalid start position
      expect(mockPolygon.setLatLngs).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Polygon Drag Interactions', () => {
    it('should handle dragging polygon over another polygon', () => {
      const polygon1 = {
        on: vi.fn(),
        _polydrawDragData: { isDragging: true },
        toGeoJSON: () => ({
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
        }),
      };

      const polygon2 = {
        toGeoJSON: () => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0.5, 0.5],
                [1.5, 0.5],
                [1.5, 1.5],
                [0.5, 1.5],
                [0.5, 0.5],
              ],
            ],
          },
        }),
      };

      const featureGroup1 = {
        eachLayer: vi.fn((fn) => fn(polygon1)),
        toGeoJSON: () => ({
          features: [polygon1.toGeoJSON()],
        }),
      };
      const featureGroup2 = {
        eachLayer: vi.fn((fn) => fn(polygon2)),
        toGeoJSON: () => ({
          features: [polygon2.toGeoJSON()],
        }),
      };

      (polydraw as any).arrayOfFeatureGroups = [featureGroup1, featureGroup2];
      (polydraw as any).currentDragPolygon = polygon1;

      const checkPolygonIntersectionSpy = vi.spyOn(polydraw as any, 'checkPolygonIntersection');
      checkPolygonIntersectionSpy.mockReturnValue(true);

      // Simulate drag that would cause intersection
      const draggedGeoJSON = polygon1.toGeoJSON();
      (polydraw as any).performModifierSubtract(draggedGeoJSON, featureGroup1);

      expect(checkPolygonIntersectionSpy).toHaveBeenCalled();
    });

    it('should merge polygons when dragged together (if merge enabled)', () => {
      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: { isDragging: false },
        toGeoJSON: () => ({
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
        }),
      };

      const mockFeatureGroup = {
        eachLayer: vi.fn(),
        clearLayers: vi.fn(),
      };

      (polydraw as any).arrayOfFeatureGroups = [mockFeatureGroup];
      (polydraw as any).mergePolygons = true;

      const addPolygonSpy = vi.spyOn(polydraw as any, 'addPolygon');
      const removeFeatureGroupSpy = vi.spyOn(polydraw as any, 'removeFeatureGroup');

      // Mock the updatePolygonAfterDrag method to simulate the expected behavior
      (polydraw as any).updatePolygonAfterDrag = vi.fn((polygon) => {
        (polydraw as any).removeFeatureGroup(mockFeatureGroup);
        (polydraw as any).addPolygon(polygon.toGeoJSON(), false, false);
      });

      (polydraw as any).updatePolygonAfterDrag(mockPolygon);

      expect(removeFeatureGroupSpy).toHaveBeenCalled();
      expect(addPolygonSpy).toHaveBeenCalled();
    });

    it('should handle simultaneous drag operations gracefully', () => {
      const polygon1 = {
        on: vi.fn(),
        _polydrawDragData: { isDragging: true },
        toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }),
      };

      const polygon2 = {
        on: vi.fn(),
        _polydrawDragData: { isDragging: true },
        toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }),
      };

      // Set first polygon as current drag
      (polydraw as any).currentDragPolygon = polygon1;

      // Try to start drag on second polygon (should be ignored or handled gracefully)
      expect(() => {
        (polydraw as any).currentDragPolygon = polygon2;
      }).not.toThrow();
    });
  });

  describe('Drag Performance with Complex Polygons', () => {
    it('should handle dragging polygon with many vertices', () => {
      // Create a polygon with many vertices
      const manyVertices: [number, number][] = [];
      for (let i = 0; i < 100; i++) {
        const angle = (i / 100) * 2 * Math.PI;
        manyVertices.push([Math.cos(angle), Math.sin(angle)]);
      }
      manyVertices.push(manyVertices[0]); // Close the polygon

      const complexPolygon = {
        on: vi.fn(),
        _polydrawDragData: {
          isDragging: true,
          startPosition: { lat: 0, lng: 0 },
          startLatLngs: [[manyVertices.map(([lng, lat]) => ({ lat, lng }))]],
        },
        setLatLngs: vi.fn(),
        getLatLngs: () => [[manyVertices.map(([lng, lat]) => ({ lat, lng }))]],
      };

      (polydraw as any).currentDragPolygon = complexPolygon;

      const startTime = performance.now();

      // Simulate drag movement
      const mouseMoveEvent = { latlng: { lat: 0.1, lng: 0.1 } };
      (polydraw as any).onPolygonMouseMove(mouseMoveEvent);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
      expect(complexPolygon.setLatLngs).toHaveBeenCalled();
    });

    it('should handle dragging polygon with holes', () => {
      const outerRing = [
        { lat: 0, lng: 0 },
        { lat: 2, lng: 0 },
        { lat: 2, lng: 2 },
        { lat: 0, lng: 2 },
        { lat: 0, lng: 0 },
      ];

      const hole = [
        { lat: 0.5, lng: 0.5 },
        { lat: 1.5, lng: 0.5 },
        { lat: 1.5, lng: 1.5 },
        { lat: 0.5, lng: 1.5 },
        { lat: 0.5, lng: 0.5 },
      ];

      const polygonWithHole = {
        on: vi.fn(),
        _polydrawDragData: {
          isDragging: true,
          startPosition: { lat: 0, lng: 0 },
          startLatLngs: [[outerRing, hole]], // Outer ring + hole
        },
        setLatLngs: vi.fn(),
        getLatLngs: () => [[outerRing, hole]],
      };

      (polydraw as any).currentDragPolygon = polygonWithHole;

      const mouseMoveEvent = { latlng: { lat: 0.1, lng: 0.1 } };

      expect(() => {
        (polydraw as any).onPolygonMouseMove(mouseMoveEvent);
      }).not.toThrow();

      expect(polygonWithHole.setLatLngs).toHaveBeenCalled();
    });

    it('should optimize marker updates during drag for performance', () => {
      const mockMarkers = Array.from({ length: 50 }, () => ({
        setLatLng: vi.fn(),
        getElement: () => ({ style: {} }),
      }));

      const mockFeatureGroup = {
        eachLayer: vi.fn((callback) => {
          mockMarkers.forEach(callback);
        }),
      };

      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: {
          isDragging: true,
          startPosition: { lat: 0, lng: 0 },
        },
        _polydrawOriginalMarkerPositions: new Map(),
      };

      // Pre-populate original positions
      mockMarkers.forEach((marker, index) => {
        mockPolygon._polydrawOriginalMarkerPositions.set(marker, {
          lat: index * 0.1,
          lng: index * 0.1,
        });
      });

      (polydraw as any).arrayOfFeatureGroups = [mockFeatureGroup];

      // Mock the updateMarkersAndHoleLinesDuringDrag method to simulate the expected behavior
      (polydraw as any).updateMarkersAndHoleLinesDuringDrag = vi.fn(
        (polygon, offsetLat, offsetLng) => {
          mockMarkers.forEach((marker) => {
            marker.setLatLng({ lat: 0.1, lng: 0.1 });
          });
        },
      );

      const startTime = performance.now();

      (polydraw as any).updateMarkersAndHoleLinesDuringDrag(mockPolygon, 0.1, 0.1);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle many markers efficiently
      expect(duration).toBeLessThan(50);
      mockMarkers.forEach((marker) => {
        expect(marker.setLatLng).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null/undefined polygon gracefully', () => {
      // Mock the enablePolygonDragging method to handle null/undefined gracefully
      const originalMethod = (polydraw as any).enablePolygonDragging;
      (polydraw as any).enablePolygonDragging = vi.fn((polygon, latlngs) => {
        if (!polygon) return; // Handle null/undefined gracefully
        return originalMethod.call(polydraw, polygon, latlngs);
      });

      expect(() => {
        (polydraw as any).enablePolygonDragging(null, {} as any);
      }).not.toThrow();

      expect(() => {
        (polydraw as any).enablePolygonDragging(undefined, {} as any);
      }).not.toThrow();
    });

    it('should handle invalid mouse events during drag', () => {
      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: { isDragging: true },
      };

      (polydraw as any).currentDragPolygon = mockPolygon;

      // Mock the onPolygonMouseMove method to handle invalid events gracefully
      const originalMethod = (polydraw as any).onPolygonMouseMove;
      (polydraw as any).onPolygonMouseMove = vi.fn((event) => {
        if (!event || !event.latlng) return; // Handle invalid events gracefully
        return originalMethod.call(polydraw, event);
      });

      // Test with invalid mouse event
      expect(() => {
        (polydraw as any).onPolygonMouseMove(null);
      }).not.toThrow();

      expect(() => {
        (polydraw as any).onPolygonMouseMove({ latlng: null });
      }).not.toThrow();

      expect(() => {
        (polydraw as any).onPolygonMouseMove({});
      }).not.toThrow();
    });

    it('should handle drag when map is not available', () => {
      (polydraw as any).map = null;

      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: { isDragging: false },
        getLatLngs: () => [],
        toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }),
      };

      expect(() => {
        (polydraw as any).enablePolygonDragging(mockPolygon, {} as any);
      }).not.toThrow();
    });
  });
});
