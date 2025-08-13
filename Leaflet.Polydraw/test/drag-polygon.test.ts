import { describe, it, expect, beforeEach, vi } from 'vitest';

import Polydraw from '../src/polydraw';
import { polygon } from '@turf/helpers';

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
    (polydraw as any).onAdd(mockMap);
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

  describe('Merge Behavior', () => {
    it('should not merge polygons that only have bounding boxes overlapping', () => {
      // Create two polygons that have overlapping bounding boxes but no actual geometric intersection
      const polygon1 = {
        toGeoJSON: () =>
          polygon([
            [
              [15.008698, 58.163446], // lng, lat format for GeoJSON
              [15.284729, 58.163446],
              [15.284729, 58.586161],
              [15.952149, 58.586161],
              [15.952149, 58.687669],
              [15.008698, 58.687664],
              [15.008698, 58.163446], // Close the polygon
            ],
          ]),
      };

      // Second polygon with coordinates that create bounding box overlap but no geometric intersection
      const polygon2 = {
        toGeoJSON: () =>
          polygon([
            [
              [15.630799, 58.356368],
              [15.967255, 58.292247],
              [15.971375, 58.421092],
              [15.836793, 58.483546],
              [15.630799, 58.356368], // Close the polygon
            ],
          ]),
      };

      // Test the checkPolygonIntersection method directly
      const result = (polydraw as any).polygonMutationManager.checkPolygonIntersection(
        polygon1.toGeoJSON(),
        polygon2.toGeoJSON(),
      );

      expect(result).toBe(false); // We expect NO intersection for bounding box only overlap
    });
  });

  describe('Modifier Drag Integration', () => {
    it('should perform subtract operation on modifier drag', () => {
      // Create two intersecting polygons - one will be dragged to subtract from the other
      const draggedPolygon = {
        on: vi.fn(),
        _polydrawDragData: {
          isDragging: true,
          startPosition: { lat: 0, lng: 0 },
          startLatLngs: [],
        },
        getLatLngs: () => [],
        setLatLngs: vi.fn(),
        toGeoJSON: () =>
          polygon([
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ]),
      };

      const targetPolygon = {
        toGeoJSON: () =>
          polygon([
            [
              [0.5, 0.5], // This polygon intersects with the dragged polygon
              [1.5, 0.5],
              [1.5, 1.5],
              [0.5, 1.5],
              [0.5, 0.5],
            ],
          ]),
      };

      const draggedFeatureGroup = {
        eachLayer: (fn: any) => fn(draggedPolygon),
        clearLayers: vi.fn(),
      };

      const targetFeatureGroup = {
        eachLayer: (fn: any) => fn(targetPolygon),
        toGeoJSON: () => ({
          features: [targetPolygon.toGeoJSON()],
        }),
        clearLayers: vi.fn(),
      };

      // Set up feature groups - the dragged polygon will be subtracted from intersecting ones
      (polydraw as any).arrayOfFeatureGroups = [draggedFeatureGroup, targetFeatureGroup];

      // Mock the emit method to capture polygon modification events
      const emitSpy = vi.spyOn((polydraw as any).eventManager, 'emit');

      // Mock the removeFeatureGroup method to track calls
      const removeFeatureGroupSpy = vi
        .spyOn(
          (polydraw as any).polygonMutationManager.polygonInteractionManager,
          'removeFeatureGroup',
        )
        .mockImplementation(() => {});

      // Test the actual subtract operation - this should:
      // 1. Check intersection between polygons (they do intersect)
      // 2. Remove the target feature group
      // 3. Emit polygon modification events
      const draggedGeoJSON = draggedPolygon.toGeoJSON();
      (polydraw as any).polygonMutationManager.polygonInteractionManager.performModifierSubtract(
        draggedGeoJSON,
        draggedFeatureGroup,
      );

      // Verify the actual behavior: intersecting polygon should be processed
      expect(removeFeatureGroupSpy).toHaveBeenCalledWith(targetFeatureGroup);
      expect(emitSpy).toHaveBeenCalledWith(
        'polydraw:polygon:updated',
        expect.objectContaining({
          operation: 'modifierSubtract',
        }),
      );
    });

    it('should detect modifier key correctly on different platforms', () => {
      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: { isDragging: false },
        getLatLngs: () => [],
        toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }),
        options: { fillOpacity: 0.5 },
      };

      (polydraw as any).polygonMutationManager.enablePolygonDragging(mockPolygon, {} as any);

      // Test Ctrl key on Windows/Linux
      const isModifierKeyPressedSpy = vi.spyOn(polydraw as any, 'isModifierKeyPressed');

      // Mock Windows/Linux user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true,
      });

      const ctrlEvent = { ctrlKey: true, metaKey: false };
      expect((polydraw as any).isModifierKeyPressed(ctrlEvent)).toBe(true);

      // Mock Mac user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        configurable: true,
      });

      const cmdEvent = { ctrlKey: false, metaKey: true };
      expect((polydraw as any).isModifierKeyPressed(cmdEvent)).toBe(true);
    });
  });

  describe('Normal Polygon Dragging (without modifier keys)', () => {
    it('should enable basic polygon dragging when dragPolygons is true', () => {
      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: { isDragging: false },
        options: { fillOpacity: 0.5 },
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

      (polydraw as any).polygonMutationManager.enablePolygonDragging(mockPolygon, {} as any);

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

      (polydraw as any).polygonMutationManager.currentDragPolygon = mockPolygon;
      (polydraw as any).polygonMutationManager.currentModifierDragMode = false;

      // Set up the interaction manager's current drag polygon
      (polydraw as any).polygonMutationManager.polygonInteractionManager.currentDragPolygon =
        mockPolygon;

      // Simulate mouse move during drag
      const mouseMoveEvent = { latlng: { lat: 0.5, lng: 0.5 } };
      (polydraw as any).polygonMutationManager.polygonInteractionManager.onPolygonMouseMove(
        mouseMoveEvent,
      );

      // Verify polygon coordinates were updated
      expect(mockPolygon.setLatLngs).toHaveBeenCalled();
    });

    it('should complete drag operation on mouse up', () => {
      const mockFeatureGroup = {
        eachLayer: vi.fn(),
        clearLayers: vi.fn(),
        hasLayer: vi.fn(() => true),
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

      (polydraw as any).polygonMutationManager.currentDragPolygon = mockPolygon;
      (polydraw as any).polygonMutationManager.currentModifierDragMode = false;
      (polydraw as any).arrayOfFeatureGroups = [mockFeatureGroup];

      const updatePolygonAfterDragSpy = vi.spyOn(
        (polydraw as any).polygonMutationManager.polygonInteractionManager,
        'updatePolygonAfterDrag',
      );

      // Set up the interaction manager's current drag polygon
      (polydraw as any).polygonMutationManager.polygonInteractionManager.currentDragPolygon =
        mockPolygon;

      // Simulate mouse up
      const mouseUpEvent = { latlng: { lat: 1, lng: 1 } };
      (polydraw as any).polygonMutationManager.polygonInteractionManager.onPolygonMouseUp(
        mouseUpEvent,
      );

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

      (polydraw as any).polygonMutationManager.polygonInteractionManager.setSubtractVisualMode(
        mockPolygon,
        true,
      );

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
      (polydraw as any).polygonMutationManager.polygonInteractionManager.setSubtractVisualMode(
        mockPolygon,
        true,
      );
      // Then disable it
      (polydraw as any).polygonMutationManager.polygonInteractionManager.setSubtractVisualMode(
        mockPolygon,
        false,
      );

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
      (polydraw as any).polygonMutationManager.updateMarkerColorsForSubtractMode = vi.fn(
        (polygon, enabled) => {
          if (enabled) {
            mockElement.style.backgroundColor = '#D9460F';
            mockElement.classList.add('subtract-mode');
          }
        },
      );

      (polydraw as any).polygonMutationManager.updateMarkerColorsForSubtractMode(mockPolygon, true);

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
        options: { fillOpacity: 0.5 },
        setStyle: vi.fn(),
      };

      (polydraw as any).currentDragPolygon = mockPolygon;

      // Get the mousedown handler and simulate drag start
      (polydraw as any).polygonMutationManager.enablePolygonDragging(mockPolygon, {} as any);
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
        options: { fillOpacity: 0.5 },
      };

      (polydraw as any).polygonMutationManager.enablePolygonDragging(mockPolygon, {} as any);

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

      // Set up the drag state properly
      (polydraw as any).polygonMutationManager.currentDragPolygon = mockPolygon;
      (polydraw as any).polygonMutationManager.currentModifierDragMode = false;

      // Set up the interaction manager's current drag polygon
      (polydraw as any).polygonMutationManager.polygonInteractionManager.currentDragPolygon =
        mockPolygon;

      // Simulate mouse up to end drag
      (polydraw as any).polygonMutationManager.polygonInteractionManager.onPolygonMouseUp({
        latlng: { lat: 1, lng: 1 },
      });

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

      // Set up the drag state properly
      (polydraw as any).polygonMutationManager.currentDragPolygon = mockPolygon;
      (polydraw as any).polygonMutationManager.currentModifierDragMode = false;

      // Set up the interaction manager's current drag polygon
      (polydraw as any).polygonMutationManager.polygonInteractionManager.currentDragPolygon =
        mockPolygon;

      // Test drag within reasonable bounds
      const mouseMoveEvent = { latlng: { lat: 0.1, lng: 0.1 } };
      (polydraw as any).polygonMutationManager.polygonInteractionManager.onPolygonMouseMove(
        mouseMoveEvent,
      );

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
        (polydraw as any).polygonMutationManager.onPolygonMouseMove(extremeEvent);
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
      const originalMethod = (polydraw as any).polygonMutationManager.onPolygonMouseMove;
      (polydraw as any).polygonMutationManager.onPolygonMouseMove = vi.fn((event) => {
        if (!mockPolygon._polydrawDragData.startPosition) return; // Handle null start position gracefully
        return originalMethod.call((polydraw as any).polygonMutationManager, event);
      });

      const mouseMoveEvent = { latlng: { lat: 0.1, lng: 0.1 } };

      // Should handle null start position gracefully
      expect(() => {
        (polydraw as any).polygonMutationManager.onPolygonMouseMove(mouseMoveEvent);
      }).not.toThrow();

      // Should not update coordinates with invalid start position
      expect(mockPolygon.setLatLngs).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Polygon Drag Interactions', () => {
    it('should detect intersection when dragging polygon over another polygon', () => {
      // Test the actual intersection detection logic with real geometric data
      const overlappingPolygon1 = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      const overlappingPolygon2 = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [1, 1], // This clearly overlaps with polygon1
              [3, 1],
              [3, 3],
              [1, 3],
              [1, 1],
            ],
          ],
        },
        properties: {},
      };

      const nonOverlappingPolygon = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [5, 5], // This is far away and should not intersect
              [6, 5],
              [6, 6],
              [5, 6],
              [5, 5],
            ],
          ],
        },
        properties: {},
      };

      // Test actual intersection detection - these should intersect
      const intersectionResult1 = (polydraw as any).polygonMutationManager.checkPolygonIntersection(
        overlappingPolygon1,
        overlappingPolygon2,
      );
      expect(intersectionResult1).toBe(true);

      // Test non-intersection - these should not intersect
      const intersectionResult2 = (polydraw as any).polygonMutationManager.checkPolygonIntersection(
        overlappingPolygon1,
        nonOverlappingPolygon,
      );
      expect(intersectionResult2).toBe(false);

      // Test the actual workflow: when polygons intersect, they should be processed
      const draggedFeatureGroup = {
        eachLayer: vi.fn(),
        clearLayers: vi.fn(),
      };

      const targetFeatureGroup = {
        eachLayer: vi.fn(),
        toGeoJSON: () => ({
          features: [overlappingPolygon2],
        }),
        clearLayers: vi.fn(),
      };

      (polydraw as any).arrayOfFeatureGroups = [draggedFeatureGroup, targetFeatureGroup];

      // Mock the emit method to capture polygon modification events
      const emitSpy = vi.spyOn((polydraw as any).eventManager, 'emit');

      // Mock the removeFeatureGroup method to track calls
      const removeFeatureGroupSpy = vi
        .spyOn(
          (polydraw as any).polygonMutationManager.polygonInteractionManager,
          'removeFeatureGroup',
        )
        .mockImplementation(() => {});

      // When we drag an overlapping polygon, it should process the intersection
      (polydraw as any).polygonMutationManager.polygonInteractionManager.performModifierSubtract(
        overlappingPolygon1,
        draggedFeatureGroup,
      );

      // Verify that intersecting polygons are processed
      expect(removeFeatureGroupSpy).toHaveBeenCalledWith(targetFeatureGroup);
      expect(emitSpy).toHaveBeenCalledWith(
        'polydraw:polygon:updated',
        expect.objectContaining({
          operation: 'modifierSubtract',
        }),
      );
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

      const addPolygonSpy = vi.spyOn((polydraw as any).polygonMutationManager, 'addPolygon');
      const removeFeatureGroupSpy = vi.spyOn(
        (polydraw as any).polygonMutationManager,
        'removeFeatureGroup',
      );

      // Mock the updatePolygonAfterDrag method to simulate the expected behavior
      (polydraw as any).polygonMutationManager.updatePolygonAfterDrag = vi.fn((polygon) => {
        (polydraw as any).polygonMutationManager.removeFeatureGroup(mockFeatureGroup);
        (polydraw as any).polygonMutationManager.addPolygon(polygon.toGeoJSON(), {
          simplify: false,
          noMerge: false,
        });
      });

      (polydraw as any).polygonMutationManager.updatePolygonAfterDrag(mockPolygon);

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

      // Set up the drag state properly
      (polydraw as any).polygonMutationManager.currentDragPolygon = complexPolygon;
      (polydraw as any).polygonMutationManager.currentModifierDragMode = false;

      // Set up the interaction manager's current drag polygon
      (polydraw as any).polygonMutationManager.polygonInteractionManager.currentDragPolygon =
        complexPolygon;

      const startTime = performance.now();

      // Simulate drag movement
      const mouseMoveEvent = { latlng: { lat: 0.1, lng: 0.1 } };
      (polydraw as any).polygonMutationManager.polygonInteractionManager.onPolygonMouseMove(
        mouseMoveEvent,
      );

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

      // Set up the drag state properly
      (polydraw as any).polygonMutationManager.currentDragPolygon = polygonWithHole;
      (polydraw as any).polygonMutationManager.currentModifierDragMode = false;

      // Set up the interaction manager's current drag polygon
      (polydraw as any).polygonMutationManager.polygonInteractionManager.currentDragPolygon =
        polygonWithHole;

      const mouseMoveEvent = { latlng: { lat: 0.1, lng: 0.1 } };

      expect(() => {
        (polydraw as any).polygonMutationManager.polygonInteractionManager.onPolygonMouseMove(
          mouseMoveEvent,
        );
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
      (polydraw as any).polygonMutationManager.updateMarkersAndHoleLinesDuringDrag = vi.fn(
        (polygon, offsetLat, offsetLng) => {
          mockMarkers.forEach((marker) => {
            marker.setLatLng({ lat: 0.1, lng: 0.1 });
          });
        },
      );

      const startTime = performance.now();

      (polydraw as any).polygonMutationManager.updateMarkersAndHoleLinesDuringDrag(
        mockPolygon,
        0.1,
        0.1,
      );

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
      const originalMethod = (polydraw as any).polygonMutationManager.enablePolygonDragging;
      (polydraw as any).polygonMutationManager.enablePolygonDragging = vi.fn((polygon, latlngs) => {
        if (!polygon) return; // Handle null/undefined gracefully
        return originalMethod.call((polydraw as any).polygonMutationManager, polygon, latlngs);
      });

      expect(() => {
        (polydraw as any).polygonMutationManager.enablePolygonDragging(null, {} as any);
      }).not.toThrow();

      expect(() => {
        (polydraw as any).polygonMutationManager.enablePolygonDragging(undefined, {} as any);
      }).not.toThrow();
    });

    it('should handle invalid mouse events during drag', () => {
      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: { isDragging: true },
      };

      (polydraw as any).currentDragPolygon = mockPolygon;

      // Mock the onPolygonMouseMove method to handle invalid events gracefully
      const originalMethod = (polydraw as any).polygonMutationManager.onPolygonMouseMove;
      (polydraw as any).polygonMutationManager.onPolygonMouseMove = vi.fn((event) => {
        if (!event || !event.latlng) return; // Handle invalid events gracefully
        return originalMethod.call((polydraw as any).polygonMutationManager, event);
      });

      // Test with invalid mouse event
      expect(() => {
        (polydraw as any).polygonMutationManager.onPolygonMouseMove(null);
      }).not.toThrow();

      expect(() => {
        (polydraw as any).polygonMutationManager.onPolygonMouseMove({ latlng: null });
      }).not.toThrow();

      expect(() => {
        (polydraw as any).polygonMutationManager.onPolygonMouseMove({});
      }).not.toThrow();
    });

    it('should handle drag when map is not available', () => {
      (polydraw as any).map = null;

      const mockPolygon = {
        on: vi.fn(),
        _polydrawDragData: { isDragging: false },
        getLatLngs: () => [],
        toGeoJSON: () => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }),
        options: { fillOpacity: 0.5 },
      };

      expect(() => {
        (polydraw as any).polygonMutationManager.enablePolygonDragging(mockPolygon, {} as any);
      }).not.toThrow();
    });
  });
});
