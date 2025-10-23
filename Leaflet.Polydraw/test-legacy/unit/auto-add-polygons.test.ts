import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../../src/polydraw';
import { createMockMap, suppressConsole } from './utils/mock-factory';
import './setup';

// Minimal Leaflet mock - only what's needed for module-level mocking
vi.mock('leaflet', async () => {
  const actual = await vi.importActual('leaflet');
  return {
    ...actual,
    Control: class {
      addTo() {
        return this;
      }
      onAdd() {
        return document.createElement('div');
      }
      remove() {}
    },
    DomEvent: {
      on: vi.fn(() => ({ on: vi.fn() })),
      off: vi.fn(),
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
      disableClickPropagation: vi.fn(),
    },
    DomUtil: {
      create: vi.fn((tagName: string, className?: string, container?: HTMLElement) => {
        const el = document.createElement(tagName);
        if (className) el.className = className;
        if (container) container.appendChild(el);
        return el;
      }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
      hasClass: vi.fn(() => false),
    },
    geoJSON: vi.fn(() => ({ addTo: vi.fn(), getLayers: vi.fn(() => []) })),
    polyline: vi.fn(() => ({
      addTo: vi.fn(),
      addLatLng: vi.fn(),
      setLatLngs: vi.fn(),
      getLatLngs: vi.fn(() => []),
      toGeoJSON: vi.fn(() => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
      })),
      setStyle: vi.fn(),
      on: vi.fn(),
      remove: vi.fn(),
    })),
    latLng: (lat: number, lng: number) => ({ lat, lng }),
  };
});

describe('Auto-add polygons functionality', () => {
  let map: L.Map;
  let polydraw: Polydraw;
  let mapContainer: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mapContainer = document.createElement('div');
    document.body.appendChild(mapContainer);
    map = createMockMap();
    polydraw = new Polydraw();
    // Manually call onAdd to initialize the mutation manager
    (polydraw as any).onAdd(map);
    (polydraw as any).map = map; // Force assign map
    (polydraw as any).tracer = L.polyline([]); // Initialize tracer
  });

  afterEach(() => {
    if (polydraw) {
      polydraw.removeAllFeatureGroups();
    }
    if (map) {
      map.remove();
    }
    if (mapContainer) {
      mapContainer.remove();
    }
  });

  it('should add a simple polygon without errors', async () => {
    const consoleSuppressor = suppressConsole();

    const octagon: L.LatLng[][][] = [
      [
        [
          L.latLng(58.404493, 15.6),
          L.latLng(58.402928, 15.602928),
          L.latLng(58.4, 15.604493),
          L.latLng(58.397072, 15.602928),
          L.latLng(58.395507, 15.6),
          L.latLng(58.397072, 15.597072),
          L.latLng(58.4, 15.595507),
          L.latLng(58.402928, 15.597072),
          L.latLng(58.404493, 15.6),
        ],
      ],
    ];

    await expect(polydraw.addPredefinedPolygon(octagon)).resolves.not.toThrow();

    consoleSuppressor.restore();
  });

  it('should add a polygon with a hole without errors', async () => {
    const consoleSuppressor = suppressConsole();

    const squareWithHole: L.LatLng[][][] = [
      [
        [
          L.latLng(58.407, 15.597),
          L.latLng(58.407, 15.603),
          L.latLng(58.397, 15.603),
          L.latLng(58.397, 15.597),
          L.latLng(58.407, 15.597),
        ],
        [
          L.latLng(58.403, 15.599),
          L.latLng(58.403, 15.601),
          L.latLng(58.401, 15.601),
          L.latLng(58.401, 15.599),
          L.latLng(58.403, 15.599),
        ],
      ],
    ];

    await expect(polydraw.addPredefinedPolygon(squareWithHole)).resolves.not.toThrow();

    consoleSuppressor.restore();
  });

  it('should throw an error for invalid polygon data', async () => {
    const invalidData: any = [[[L.latLng(58.4, 15.6)]]]; // Not enough points
    await expect(polydraw.addPredefinedPolygon(invalidData)).rejects.toThrow();
  });

  it('should call addPolygon for each polygon group', async () => {
    const consoleSuppressor = suppressConsole();

    const addPolygonSpy = vi.spyOn((polydraw as any).polygonMutationManager, 'addPolygon');
    const polygons: L.LatLng[][][] = [
      [[L.latLng(58.4, 15.6), L.latLng(58.41, 15.6), L.latLng(58.41, 15.61), L.latLng(58.4, 15.6)]],
      [[L.latLng(58.5, 15.7), L.latLng(58.51, 15.7), L.latLng(58.51, 15.71), L.latLng(58.5, 15.7)]],
    ];

    await polydraw.addPredefinedPolygon(polygons);
    expect(addPolygonSpy).toHaveBeenCalledTimes(2);

    consoleSuppressor.restore();
  });
});
