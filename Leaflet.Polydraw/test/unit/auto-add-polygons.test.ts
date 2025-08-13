import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../../src/polydraw';
import './setup';

// Mock Leaflet to work in JSDOM environment
vi.mock('leaflet', async () => {
  const actualLeaflet = await vi.importActual('leaflet');

  const MockControl = class {
    addTo() {
      return this;
    }
    onAdd() {
      return document.createElement('div');
    }
    remove() {}
  };

  const MockMap = class {
    dragging = { enable: vi.fn(), disable: vi.fn() };
    doubleClickZoom = { enable: vi.fn(), disable: vi.fn() };
    scrollWheelZoom = { enable: vi.fn(), disable: vi.fn() };
    _renderer = new (class {
      _container = document.createElement('div');
      _update() {}
      _removePath() {}
    })();
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
    remove() {}
    containerPointToLatLng() {
      return { lat: 0, lng: 0 };
    }
    latLngToContainerPoint() {
      return { x: 0, y: 0 };
    }
    getCenter() {
      return { lat: 0, lng: 0 };
    }
    getZoom() {
      return 13;
    }
    invalidateSize() {}
  };

  const MockFeatureGroup = class extends (actualLeaflet as any).FeatureGroup {
    constructor() {
      super();
      this._layers = {};
    }
    addLayer(layer: any) {
      const id = layer._leaflet_id || Math.random();
      this._layers[id] = layer;
      return this;
    }
    removeLayer(layer: any) {
      const id = layer._leaflet_id;
      if (id && this._layers[id]) {
        delete this._layers[id];
      }
      return this;
    }
    clearLayers() {
      this._layers = {};
      return this;
    }
    getLayers() {
      return Object.values(this._layers);
    }
    toGeoJSON() {
      return {
        type: 'FeatureCollection',
        features: this.getLayers().map((l: any) => l.toGeoJSON()),
      };
    }
  };

  const MockPolygon = class extends (actualLeaflet as any).Polygon {
    constructor(latlngs: any, options: any) {
      super(latlngs, options);
      this._latlngs = latlngs;
      // Convert latlngs to proper coordinates format
      const coordinates = Array.isArray(latlngs[0])
        ? latlngs.map((ring: any) =>
            ring.map((ll: any) => [ll.lng || ll[1] || 0, ll.lat || ll[0] || 0]),
          )
        : [latlngs.map((ll: any) => [ll.lng || ll[1] || 0, ll.lat || ll[0] || 0])];

      this.feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: coordinates,
        },
      };
    }
    toGeoJSON() {
      return this.feature;
    }
    getLatLngs() {
      return this._latlngs;
    }
  };

  const DomEvent = {
    ...(actualLeaflet as any).DomEvent,
    on: vi.fn(),
    off: vi.fn(),
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
  };
  DomEvent.on.mockReturnValue(DomEvent);

  const leafletMock = {
    ...actualLeaflet,
    Control: MockControl,
    Map: MockMap,
    FeatureGroup: MockFeatureGroup,
    Polygon: MockPolygon,
    geoJSON: () => new MockFeatureGroup(),
    polyline: () => ({
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
    }),
    DomUtil: {
      ...(actualLeaflet as any).DomUtil,
      create: (tagName: string, className: string, container?: HTMLElement) => {
        const el = document.createElement(tagName);
        if (className) el.className = className;
        if (container) container.appendChild(el);
        return el;
      },
    },
    DomEvent,
  };

  return leafletMock;
});

describe('Auto-add polygons functionality', () => {
  let map: L.Map;
  let polydraw: Polydraw;
  let mapContainer: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mapContainer = document.createElement('div');
    document.body.appendChild(mapContainer);
    map = new L.Map(mapContainer);
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
    // Suppress console errors for this test
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    console.error = () => {};
    console.warn = () => {};

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

    // Restore console functions
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  it('should add a polygon with a hole without errors', async () => {
    // Suppress console errors for this test
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    console.error = () => {};
    console.warn = () => {};

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

    // Restore console functions
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  it('should throw an error for invalid polygon data', async () => {
    const invalidData: any = [[[L.latLng(58.4, 15.6)]]]; // Not enough points
    await expect(polydraw.addPredefinedPolygon(invalidData)).rejects.toThrow();
  });

  it('should call addPolygon for each polygon group', async () => {
    // Suppress console errors for this test
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    console.error = () => {};
    console.warn = () => {};

    const addPolygonSpy = vi.spyOn((polydraw as any).polygonMutationManager, 'addPolygon');
    const polygons: L.LatLng[][][] = [
      [[L.latLng(58.4, 15.6), L.latLng(58.41, 15.6), L.latLng(58.41, 15.61), L.latLng(58.4, 15.6)]],
      [[L.latLng(58.5, 15.7), L.latLng(58.51, 15.7), L.latLng(58.51, 15.71), L.latLng(58.5, 15.7)]],
    ];

    await polydraw.addPredefinedPolygon(polygons);
    expect(addPolygonSpy).toHaveBeenCalledTimes(2);

    // Restore console functions
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });
});
