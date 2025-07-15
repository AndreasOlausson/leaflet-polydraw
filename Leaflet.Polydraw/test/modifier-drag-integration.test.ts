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
        },
        dragPolygons: {
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
    };
  });

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
});
