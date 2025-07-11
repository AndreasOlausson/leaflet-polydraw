import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';

describe('Modifier Drag Integration Test', () => {
  let polydraw: Polydraw;
  let mockMap: any;

  beforeEach(() => {
    // Create a more realistic mock map
    mockMap = {
      dragging: { enable: vi.fn(), disable: vi.fn() },
      getContainer: vi.fn(() => ({
        style: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      fire: vi.fn(),
      removeLayer: vi.fn(),
      addLayer: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      containerPointToLatLng: vi.fn(() => ({ lat: 0, lng: 0 })),
    };

    polydraw = new Polydraw({
      config: {
        modes: {
          dragPolygons: true,
          dragElbow: true,
          attachElbow: false,
        },
        dragPolygons: {
          enabled: true,
          opacity: 0.7,
          hoverCursor: 'grab',
          dragCursor: 'move',
          markerBehavior: 'hide',
          markerAnimationDuration: 200,
          autoMergeOnIntersect: true,
          autoHoleOnContained: false,
          modifierSubtract: {
            enabled: true,
            subtractColor: '#D9460F',
          },
        },
      },
    } as any);

    // Initialize the control
    (polydraw as any).map = mockMap;
    (polydraw as any).tracer = {
      setLatLngs: vi.fn(),
      addLatLng: vi.fn(),
      toGeoJSON: vi.fn(() => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2],
          ],
        },
      })),
      setStyle: vi.fn(),
      addTo: vi.fn(),
    };

    // Mock TurfHelper with real-like behavior
    (polydraw as any).turfHelper = {
      getTurfPolygon: vi.fn((feature) => feature),
      polygonDifference: vi.fn(() => ({
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
      polygonIntersect: vi.fn(() => true),
    };

    // Mock addPolygonLayer
    (polydraw as any).addPolygonLayer = vi.fn();
  });

  it('should properly detect modifier key and perform subtract operation', () => {
    // Create a mock polygon with proper structure
    const mockPolygon = {
      _polydrawDragData: {
        isDragging: false,
        startPosition: null,
        startLatLngs: null,
      },
      _polydrawFeatureGroup: {
        toGeoJSON: vi.fn(() => ({
          features: [
            {
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
        })),
        eachLayer: vi.fn(),
      },
      setStyle: vi.fn(),
      getElement: vi.fn(() => null),
      getLatLngs: vi.fn(() => [
        [
          [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 0 },
            { lat: 1, lng: 1 },
            { lat: 0, lng: 1 },
          ],
        ],
      ]),
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
    };

    // Mock the array of feature groups
    (polydraw as any).arrayOfFeatureGroups = [mockPolygon._polydrawFeatureGroup];

    // Mock L.DomEvent
    (global as any).L = {
      DomEvent: {
        stopPropagation: vi.fn(),
        preventDefault: vi.fn(),
      },
    };

    // Mock performModifierSubtract BEFORE any operations
    const performModifierSubtractSpy = vi.fn();
    (polydraw as any).performModifierSubtract = performModifierSubtractSpy;

    // Mock findIntersectingPolygons
    (polydraw as any).findIntersectingPolygons = vi.fn(() => [mockPolygon._polydrawFeatureGroup]);

    // Set draw mode to off (required for dragging)
    (polydraw as any).drawMode = 0; // DrawMode.Off

    // Test 1: Mouse down with modifier key should set modifier drag mode
    const mouseDownEvent = {
      originalEvent: {
        ctrlKey: true,
        metaKey: false,
      },
      latlng: { lat: 0, lng: 0 },
    };

    const onPolygonMouseDown = (polydraw as any).onPolygonMouseDown;
    onPolygonMouseDown.call(polydraw, mouseDownEvent, mockPolygon);

    // Verify modifier drag mode is set
    expect((polydraw as any).currentModifierDragMode).toBe(true);
    expect((polydraw as any).isModifierKeyHeld).toBe(true);

    // Test 2: Mouse up should trigger modifier subtract operation
    const mouseUpEvent = {
      latlng: { lat: 1, lng: 1 },
    };

    // Set current drag polygon
    (polydraw as any).currentDragPolygon = mockPolygon;

    const onPolygonMouseUp = (polydraw as any).onPolygonMouseUp;
    onPolygonMouseUp.call(polydraw, mouseUpEvent);

    // Test 3: updatePolygonCoordinates should detect modifier mode and call performModifierSubtract
    const updatePolygonCoordinates = (polydraw as any).updatePolygonCoordinates;

    // Reset modifier mode for this test
    (polydraw as any).currentModifierDragMode = true;
    (polydraw as any).isModifierKeyHeld = true;

    // Also set the State Manager modifier state to ensure both checks pass
    if ((polydraw as any).stateManager) {
      (polydraw as any).stateManager.setModifierKeyState(true);
    }

    updatePolygonCoordinates.call(polydraw, mockPolygon, mockPolygon._polydrawFeatureGroup, {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
    });

    // Verify that performModifierSubtract was called
    expect(performModifierSubtractSpy).toHaveBeenCalled();

    // Verify that modifier state was reset
    expect((polydraw as any).currentModifierDragMode).toBe(false);
    expect((polydraw as any).isModifierKeyHeld).toBe(false);

    // Also verify State Manager state is reset
    expect((polydraw as any).stateManager.isModifierDragActive()).toBe(false);
    expect((polydraw as any).stateManager.getDragState().isModifierKeyHeld).toBe(false);
  });

  it('should detect Mac platform and use metaKey', () => {
    // Mock navigator.userAgent for Mac
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      configurable: true,
    });

    const detectModifierKey = (polydraw as any).detectModifierKey;

    // Test with metaKey on Mac
    const macEvent = { ctrlKey: false, metaKey: true } as MouseEvent;
    const result = detectModifierKey.call(polydraw, macEvent);

    expect(result).toBe(true);
  });

  it('should detect Windows/Linux platform and use ctrlKey', () => {
    // Mock navigator.userAgent for Windows
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      configurable: true,
    });

    const detectModifierKey = (polydraw as any).detectModifierKey;

    // Test with ctrlKey on Windows
    const windowsEvent = { ctrlKey: true, metaKey: false } as MouseEvent;
    const result = detectModifierKey.call(polydraw, windowsEvent);

    expect(result).toBe(true);
  });

  it('should return false when modifier subtract is disabled', () => {
    // Disable modifier subtract
    (polydraw as any).config.dragPolygons.modifierSubtract.enabled = false;

    const detectModifierKey = (polydraw as any).detectModifierKey;
    const event = { ctrlKey: true, metaKey: false } as MouseEvent;

    const result = detectModifierKey.call(polydraw, event);
    expect(result).toBe(false);
  });
});
