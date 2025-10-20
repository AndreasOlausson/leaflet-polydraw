import { vi } from 'vitest';
import * as L from 'leaflet';

/**
 * Mock Factory for Leaflet Polydraw Tests
 *
 * Provides centralized mock creation to reduce duplication across test files.
 * All mocks are designed to be compatible with existing test expectations.
 */

// ============================================================================
// LEAFLET OBJECT MOCKS
// ============================================================================

export interface MockMapOptions {
  containerPointToLatLng?: (point: [number, number]) => L.LatLng;
  getContainer?: () => HTMLElement;
  closePopup?: () => void;
}

/**
 * Creates a mock Leaflet Map with commonly used methods
 */
export function createMockMap(options: MockMapOptions = {}): any {
  const mockContainer = document.createElement('div');
  mockContainer.addEventListener = vi.fn();
  mockContainer.removeEventListener = vi.fn();
  (mockContainer.classList as any) = {
    add: vi.fn(),
    remove: vi.fn(),
  };

  return {
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
    getContainer: options.getContainer || vi.fn(() => mockContainer),
    containerPointToLatLng:
      options.containerPointToLatLng || vi.fn((point) => ({ lat: point[1], lng: point[0] })),
    latLngToContainerPoint: vi.fn(() => ({ x: 0, y: 0 })),
    getCenter: vi.fn(() => ({ lat: 0, lng: 0 })),
    getZoom: vi.fn(() => 13),
    invalidateSize: vi.fn(),
    closePopup: options.closePopup || vi.fn(),
    remove: vi.fn(),
    _renderer: {
      _container: document.createElement('div'),
      _update: vi.fn(),
      _removePath: vi.fn(),
    },
  } as unknown as L.Map;
}

export interface MockPolylineOptions {
  toGeoJSON?: () => any;
  getLatLngs?: () => L.LatLng[];
}

/**
 * Creates a mock Leaflet Polyline with commonly used methods
 */
export function createMockPolyline(options: MockPolylineOptions = {}): any {
  return {
    addTo: vi.fn(),
    setLatLngs: vi.fn(),
    addLatLng: vi.fn(),
    setStyle: vi.fn(),
    getLatLngs: options.getLatLngs || vi.fn(() => []),
    toGeoJSON:
      options.toGeoJSON ||
      vi.fn(() => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2],
            [0, 0],
          ],
        },
        properties: {},
      })),
    on: vi.fn(),
    remove: vi.fn(),
  } as unknown as L.Polyline;
}

export interface MockFeatureGroupOptions {
  layers?: any[];
  eachLayerCallback?: (layer: any) => void;
}

/**
 * Creates a mock Leaflet FeatureGroup with commonly used methods
 */
export function createMockFeatureGroup(options: MockFeatureGroupOptions = {}): any {
  const layers = options.layers || [];

  const mockFeatureGroup = {
    addTo: vi.fn(),
    addLayer: vi.fn((layer: any) => {
      const id = layer._leaflet_id || Math.random();
      (layers as any)[id] = layer;
      return mockFeatureGroup;
    }),
    removeLayer: vi.fn((layer: any) => {
      const id = layer._leaflet_id;
      if (id && (layers as any)[id]) {
        delete (layers as any)[id];
      }
      return mockFeatureGroup;
    }),
    clearLayers: vi.fn(() => {
      layers.length = 0;
      return mockFeatureGroup;
    }),
    getLayers: vi.fn(() => Object.values(layers)),
    hasLayer: vi.fn((layer: any) => {
      const id = layer._leaflet_id;
      return id ? !!(layers as any)[id] : Object.values(layers).includes(layer);
    }),
    eachLayer: vi.fn((callback: any) => {
      if (options.eachLayerCallback) {
        options.eachLayerCallback(callback);
      } else {
        Object.values(layers).forEach(callback);
      }
    }),
    toGeoJSON: vi.fn(() => ({
      type: 'FeatureCollection',
      features: Object.values(layers).map((l: any) => l.toGeoJSON?.() || {}),
    })),
  };

  return mockFeatureGroup as unknown as L.FeatureGroup;
}

export interface MockMarkerOptions {
  draggable?: boolean;
  element?: HTMLElement;
}

/**
 * Creates a mock Leaflet Marker with commonly used methods
 */
export function createMockMarker(options: MockMarkerOptions = {}): any {
  const mockElement = options.element || document.createElement('div');
  (mockElement as any).addEventListener = vi.fn();
  (mockElement as any).removeEventListener = vi.fn();
  (mockElement as any).style = mockElement.style || {};
  (mockElement as any).classList = mockElement.classList || {
    add: vi.fn(),
    remove: vi.fn(),
  };

  const mockMarker = {
    // Core Leaflet Layer methods
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    removeFrom: vi.fn().mockReturnThis(),
    addEventParent: vi.fn().mockReturnThis(),
    removeEventParent: vi.fn().mockReturnThis(),

    // Event methods
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    fire: vi.fn().mockReturnThis(),
    listens: vi.fn(() => false),
    addEventListener: vi.fn().mockReturnThis(),
    removeEventListener: vi.fn().mockReturnThis(),
    clearAllEventListeners: vi.fn().mockReturnThis(),
    addOneTimeEventListener: vi.fn().mockReturnThis(),
    fireEvent: vi.fn().mockReturnThis(),
    hasEventListeners: vi.fn(() => false),

    // Marker-specific methods
    getLatLng: vi.fn(() => ({ lat: 0, lng: 0 })),
    setLatLng: vi.fn().mockReturnThis(),
    setZIndexOffset: vi.fn().mockReturnThis(),
    getIcon: vi.fn(() => ({})),
    setIcon: vi.fn().mockReturnThis(),
    setOpacity: vi.fn().mockReturnThis(),
    getElement: vi.fn(() => mockElement),

    // GeoJSON methods
    toGeoJSON: vi.fn(() => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {},
    })),

    // Popup methods
    bindPopup: vi.fn().mockReturnThis(),
    unbindPopup: vi.fn().mockReturnThis(),
    openPopup: vi.fn().mockReturnThis(),
    closePopup: vi.fn().mockReturnThis(),
    togglePopup: vi.fn().mockReturnThis(),
    isPopupOpen: vi.fn(() => false),
    setPopupContent: vi.fn().mockReturnThis(),
    getPopup: vi.fn(() => null),

    // Tooltip methods
    bindTooltip: vi.fn().mockReturnThis(),
    unbindTooltip: vi.fn().mockReturnThis(),
    openTooltip: vi.fn().mockReturnThis(),
    closeTooltip: vi.fn().mockReturnThis(),
    toggleTooltip: vi.fn().mockReturnThis(),
    isTooltipOpen: vi.fn(() => false),
    setTooltipContent: vi.fn().mockReturnThis(),
    getTooltip: vi.fn(() => null),

    // Properties and options
    options: {
      draggable: options.draggable || false,
      keyboard: true,
      title: '',
      alt: '',
      zIndexOffset: 0,
      opacity: 1,
      riseOnHover: false,
      riseOffset: 250,
    },

    // Dragging functionality
    dragging: {
      enable: vi.fn(),
      disable: vi.fn(),
      enabled: vi.fn(() => options.draggable || false),
    },

    // Internal properties that might be accessed
    _leaflet_id: Math.random(),
    _eventHandlers: new Map(),
    _events: {},
    _eventsCount: 0,
    _map: null,
    _mapToAdd: null,
    _zoomAnimated: true,

    // Additional methods that might be called
    getPane: vi.fn(() => mockElement),
    _getPane: vi.fn(() => mockElement),
    _resetView: vi.fn(),
    _update: vi.fn(),
    _updatePath: vi.fn(),
    _project: vi.fn(),
    _reset: vi.fn(),
    _onAdd: vi.fn(),
    _onRemove: vi.fn(),
  };

  return mockMarker as unknown as L.Marker;
}

/**
 * Creates a mock Leaflet Polygon with commonly used methods
 */
export function createMockPolygon(latlngs?: any, options?: any): any {
  const _latlngs = latlngs || [];

  // Convert latlngs to proper coordinates format for GeoJSON
  const coordinates = Array.isArray(_latlngs[0])
    ? _latlngs.map((ring: any) =>
        ring.map((ll: any) => [ll.lng || ll[1] || 0, ll.lat || ll[0] || 0]),
      )
    : [_latlngs.map((ll: any) => [ll.lng || ll[1] || 0, ll.lat || ll[0] || 0])];

  const feature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: coordinates,
    },
  };

  return {
    _latlngs,
    feature,
    options: options || {},
    setLatLngs: vi.fn(),
    getLatLngs: vi.fn(() => _latlngs),
    setStyle: vi.fn(),
    addTo: vi.fn(),
    remove: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    toGeoJSON: vi.fn(() => feature),
    _polydrawDragData: {
      isDragging: false,
      startPosition: null,
    },
    _polydrawOriginalMarkerPositions: new Map(),
  };
}

// ============================================================================
// LEAFLET MODULE MOCK
// ============================================================================

/**
 * Creates a comprehensive Leaflet module mock for vi.mock('leaflet')
 * This replaces the need for individual files to mock the entire Leaflet module
 */
export function createLeafletModuleMock() {
  const mockPolyline = createMockPolyline();
  const mockFeatureGroup = createMockFeatureGroup();
  const mockMarker = createMockMarker();

  return {
    polyline: vi.fn(() => mockPolyline),
    featureGroup: vi.fn(() => mockFeatureGroup),
    marker: vi.fn(() => mockMarker),
    geoJSON: vi.fn(() => mockFeatureGroup),
    DomUtil: {
      create: vi.fn((tag, className, container) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (container) container.appendChild(element);
        return element;
      }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
      hasClass: vi.fn(() => false),
    },
    DomEvent: {
      disableClickPropagation: vi.fn(),
      on: vi.fn(() => ({ on: vi.fn() })), // Chain-able for .on().on() calls
      off: vi.fn(),
      stopPropagation: vi.fn(),
      stop: vi.fn(),
      preventDefault: vi.fn(),
    },
    Browser: {
      touch: false,
      mobile: false,
    },
    Control: class MockControl {
      options: any;
      constructor(options?: any) {
        this.options = options || {};
      }
      addTo() {
        return this;
      }
      onAdd() {
        return document.createElement('div');
      }
      getContainer() {
        return document.createElement('div');
      }
      remove() {}
    },
    Map: class MockMap {
      dragging = { enable: vi.fn(), disable: vi.fn() };
      doubleClickZoom = { enable: vi.fn(), disable: vi.fn() };
      scrollWheelZoom = { enable: vi.fn(), disable: vi.fn() };
      _renderer = {
        _container: document.createElement('div'),
        _update: vi.fn(),
        _removePath: vi.fn(),
      };
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
    },
    FeatureGroup: class MockFeatureGroup {
      _layers: any = {};
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
      eachLayer(callback: (layer: any) => void) {
        Object.values(this._layers).forEach(callback);
      }
    },
    Polygon: createMockPolygon,
    latLng: (lat: number, lng: number) => ({ lat, lng }),
  };
}

// ============================================================================
// EVENT MOCKS
// ============================================================================

export interface MockMouseEventOptions {
  latlng?: L.LatLng;
  preventDefault?: () => void;
  stopPropagation?: () => void;
  cancelable?: boolean;
}

/**
 * Creates a mock mouse event for testing
 */
export function createMockMouseEvent(options: MockMouseEventOptions = {}): any {
  return {
    latlng: options.latlng || { lat: 0, lng: 0 },
    cancelable: options.cancelable !== false,
    preventDefault: options.preventDefault || vi.fn(),
    stopPropagation: options.stopPropagation || vi.fn(),
  };
}

export interface MockTouchEventOptions {
  clientX?: number;
  clientY?: number;
  preventDefault?: () => void;
  cancelable?: boolean;
}

/**
 * Creates a mock touch event for testing
 */
export function createMockTouchEvent(options: MockTouchEventOptions = {}): any {
  return {
    touches: [
      {
        clientX: options.clientX || 0,
        clientY: options.clientY || 0,
      },
    ],
    cancelable: options.cancelable !== false,
    preventDefault: options.preventDefault || vi.fn(),
  } as unknown as TouchEvent;
}

export interface MockKeyboardEventOptions {
  key?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

/**
 * Creates a mock keyboard event for testing
 */
export function createMockKeyboardEvent(options: MockKeyboardEventOptions = {}): KeyboardEvent {
  return {
    key: options.key || '',
    ctrlKey: options.ctrlKey || false,
    metaKey: options.metaKey || false,
    shiftKey: options.shiftKey || false,
  } as KeyboardEvent;
}

// ============================================================================
// CONSOLE MOCKS
// ============================================================================

/**
 * Suppresses console output for tests that expect errors/warnings
 */
export function suppressConsole() {
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = vi.fn();
  console.warn = vi.fn();

  return {
    restore: () => {
      console.error = originalError;
      console.warn = originalWarn;
    },
  };
}

/**
 * Creates spies for console methods that can be restored
 */
export function createConsoleSpy() {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  return {
    error: errorSpy,
    warn: warnSpy,
    restore: () => {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    },
  };
}

// ============================================================================
// TEST HELPERS
// ============================================================================

export interface PolydrawTestSetupOptions {
  mapOptions?: MockMapOptions;
  suppressConsole?: boolean;
}

/**
 * Sets up a complete Polydraw test environment with mocks
 */
export function setupPolydrawTest(options: PolydrawTestSetupOptions = {}) {
  const mockMap = createMockMap(options.mapOptions);
  const mockPolyline = createMockPolyline();
  const mockFeatureGroup = createMockFeatureGroup();
  const mockMarker = createMockMarker();

  const consoleMock = options.suppressConsole ? suppressConsole() : null;

  // Mock global fetch if needed
  const originalFetch = (globalThis as any).fetch;
  (globalThis as any).fetch = vi.fn();

  // Mock document methods
  const originalAddEventListener = document.addEventListener;
  const originalRemoveEventListener = document.removeEventListener;

  Object.defineProperty(document, 'addEventListener', {
    value: vi.fn(),
    writable: true,
  });

  Object.defineProperty(document, 'removeEventListener', {
    value: vi.fn(),
    writable: true,
  });

  return {
    mocks: {
      map: mockMap,
      polyline: mockPolyline,
      featureGroup: mockFeatureGroup,
      marker: mockMarker,
    },
    cleanup: () => {
      consoleMock?.restore();
      (globalThis as any).fetch = originalFetch;
      document.addEventListener = originalAddEventListener;
      document.removeEventListener = originalRemoveEventListener;
      vi.clearAllMocks();
    },
  };
}

/**
 * Creates a mock configuration object with default values
 */
export function createMockConfig(overrides: any = {}) {
  const defaultConfig = {
    touchSupport: false,
    kinks: false,
    mergePolygons: false,
    visualOptimizationLevel: 0,
    modes: {
      draw: true,
      subtract: false,
      deleteAll: true,
      p2p: false,
      attachElbow: false,
      dragElbow: false,
      dragPolygons: false,
      edgeDeletion: false,
    },
    styles: {
      default: {},
      hover: {},
      selected: {},
    },
    icons: {},
    tooltips: {},
    ui: {},
  };

  return {
    ...defaultConfig,
    ...overrides,
    modes: {
      ...defaultConfig.modes,
      ...(overrides.modes || {}),
    },
    styles: {
      ...defaultConfig.styles,
      ...(overrides.styles || {}),
    },
  };
}

/**
 * Creates a mock TurfHelper with commonly used methods
 */
export function createMockTurfHelper() {
  return {
    isWithin: vi.fn(),
    createPolygonFromTrace: vi.fn(),
    // Add other TurfHelper methods as needed
  };
}

/**
 * Creates a mock PolygonUtil with commonly used methods
 */
export function createMockPolygonUtil() {
  return {
    getCenter: vi.fn(),
    // Add other PolygonUtil methods as needed
  };
}
