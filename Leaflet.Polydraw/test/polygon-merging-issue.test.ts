import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';
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
      this.feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [],
        },
      };
    }
    toGeoJSON() {
      return this.feature;
    }
  };

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
    DomEvent: {
      ...(actualLeaflet as any).DomEvent,
      on: vi.fn(),
      off: vi.fn(),
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    },
  };

  return leafletMock;
});

describe('Polygon Merging Issue - C to O Shape', () => {
  let map: L.Map;
  let polydraw: Polydraw;
  let mapContainer: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mapContainer = document.createElement('div');
    document.body.appendChild(mapContainer);
    map = new L.Map(mapContainer);
    polydraw = new Polydraw();
    polydraw.addTo(map);
    (polydraw as any).map = map;
    (polydraw as any).tracer = L.polyline([]);
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

  it('should merge C-shaped polygon with closing polygon to create donut (O shape)', () => {
    // Create a C-shaped polygon (like a horseshoe)
    const cShapePolygon: L.LatLng[][][] = [
      [
        [
          L.latLng(58.4, 15.6), // Bottom left
          L.latLng(58.4, 15.65), // Top left
          L.latLng(58.405, 15.65), // Top right
          L.latLng(58.405, 15.63), // Inner top right
          L.latLng(58.402, 15.63), // Inner top left
          L.latLng(58.402, 15.62), // Inner bottom left
          L.latLng(58.405, 15.62), // Inner bottom right
          L.latLng(58.405, 15.6), // Bottom right
          L.latLng(58.4, 15.6), // Close the polygon
        ],
      ],
    ];

    // Add the C-shaped polygon
    polydraw.addAutoPolygon(cShapePolygon);

    // Verify we have one polygon
    expect((polydraw as any).arrayOfFeatureGroups.length).toBe(1);

    // Create a closing polygon that would turn the C into an O
    // This polygon overlaps multiple edges of the C
    const closingPolygon: L.LatLng[][][] = [
      [
        [
          L.latLng(58.401, 15.62), // Start inside the C opening
          L.latLng(58.401, 15.63), // Go up inside the C opening
          L.latLng(58.404, 15.63), // Go right to close the gap
          L.latLng(58.404, 15.62), // Go down to close the gap
          L.latLng(58.401, 15.62), // Close the polygon
        ],
      ],
    ];

    // Add the closing polygon - this should merge with the C to create a donut
    polydraw.addAutoPolygon(closingPolygon);

    // After merging, we should have one merged polygon (not a donut with holes)
    // The user specifically wants small + large overlapping polygons to merge, not create holes
    const featureGroups = (polydraw as any).arrayOfFeatureGroups;

    console.log('Number of feature groups after merge:', featureGroups.length);

    // This should be 1 merged polygon
    expect(featureGroups.length).toBe(1);

    // The resulting polygon should be a simple merged polygon (no holes)
    if (featureGroups.length === 1) {
      const geoJSON = featureGroups[0].toGeoJSON();
      const feature = geoJSON.features[0];

      // A merged polygon should have only one ring (outer ring, no holes)
      // coordinates[0] = outer ring only
      expect(feature.geometry.coordinates.length).toBe(1);
    }
  });

  it('should detect intersection when polygons overlap multiple edges', () => {
    const turfHelper = (polydraw as any).turfHelper;

    // Create two polygons that overlap across multiple edges
    const polygon1 = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [15.6, 58.4], // Bottom left
            [15.65, 58.4], // Bottom right
            [15.65, 58.405], // Top right
            [15.63, 58.405], // Inner top right
            [15.63, 58.402], // Inner top left
            [15.62, 58.402], // Inner bottom left
            [15.62, 58.405], // Inner bottom right
            [15.6, 58.405], // Top left
            [15.6, 58.4], // Close
          ],
        ],
      },
      properties: {},
    };

    const polygon2 = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [15.62, 58.401], // Inside the C opening
            [15.63, 58.401], //
            [15.63, 58.404], //
            [15.62, 58.404], //
            [15.62, 58.401], // Close
          ],
        ],
      },
      properties: {},
    };

    // Test the intersection detection
    const hasIntersection = turfHelper.polygonIntersect(polygon1, polygon2);
    console.log('Intersection detected:', hasIntersection);

    // This should return true since polygon2 is inside the opening of polygon1
    expect(hasIntersection).toBe(true);
  });

  it('should handle complex overlapping scenarios correctly', () => {
    // Test case: Two rectangles that overlap in a way that should create a union
    const rect1: L.LatLng[][][] = [
      [
        [
          L.latLng(58.4, 15.6),
          L.latLng(58.4, 15.62),
          L.latLng(58.41, 15.62),
          L.latLng(58.41, 15.6),
          L.latLng(58.4, 15.6),
        ],
      ],
    ];

    const rect2: L.LatLng[][][] = [
      [
        [
          L.latLng(58.405, 15.605), // Overlaps with rect1
          L.latLng(58.405, 15.625),
          L.latLng(58.415, 15.625),
          L.latLng(58.415, 15.605),
          L.latLng(58.405, 15.605),
        ],
      ],
    ];

    polydraw.addAutoPolygon(rect1);
    expect((polydraw as any).arrayOfFeatureGroups.length).toBe(1);

    polydraw.addAutoPolygon(rect2);

    // Should merge into one larger polygon
    const featureGroups = (polydraw as any).arrayOfFeatureGroups;
    console.log('Feature groups after overlapping rectangles:', featureGroups.length);

    // This should be 1 merged polygon, not 2 separate ones
    expect(featureGroups.length).toBe(1);
  });

  it('should properly detect when polygons share multiple edge intersections', () => {
    const turfHelper = (polydraw as any).turfHelper;

    // Create a scenario where one polygon intersects another at multiple points
    const basePolygon = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [4, 0],
            [4, 4],
            [0, 4],
            [0, 0],
          ],
        ],
      },
      properties: {},
    };

    const intersectingPolygon = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [1, -1],
            [3, -1],
            [3, 5],
            [1, 5],
            [1, -1],
          ],
        ],
      },
      properties: {},
    };

    // This should detect intersection since the polygons clearly overlap
    const hasIntersection = turfHelper.polygonIntersect(basePolygon, intersectingPolygon);
    expect(hasIntersection).toBe(true);

    // Also test the improved intersection method
    const intersection = turfHelper.getIntersection(basePolygon, intersectingPolygon);
    expect(intersection).not.toBeNull();
  });
});
