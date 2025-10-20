/**
 * Test Setup for Leaflet Polydraw
 *
 * This file configures the test environment and provides
 * global mocks and utilities for testing.
 */

import { vi } from 'vitest';
import { MockFactory } from '../mocks/factory';

// Mock Leaflet globally
const mockLeaflet = {
  version: '1.9.4', // Default to v1 for most tests
  Map: vi.fn().mockImplementation(() => MockFactory.createMap()),
  Marker: vi.fn().mockImplementation(() => MockFactory.createMarker()),
  Polygon: vi.fn().mockImplementation(() => MockFactory.createPolygon()),
  Polyline: vi.fn().mockImplementation(() => MockFactory.createPolyline()),
  DivIcon: vi.fn().mockImplementation(() => MockFactory.createDivIcon()),
  Popup: vi.fn().mockImplementation(() => MockFactory.createPopup()),
  FeatureGroup: vi.fn().mockImplementation(() => MockFactory.createFeatureGroup()),
  LatLng: vi.fn().mockImplementation(() => MockFactory.createLatLng()),
  LatLngBounds: vi.fn().mockImplementation(() => MockFactory.createLatLngBounds()),
  Point: vi.fn().mockImplementation(() => MockFactory.createPoint()),

  // Factory methods (v1 style)
  map: vi.fn().mockImplementation(() => MockFactory.createMap()),
  marker: vi.fn().mockImplementation(() => MockFactory.createMarker()),
  polygon: vi.fn().mockImplementation(() => MockFactory.createPolygon()),
  polyline: vi.fn().mockImplementation(() => MockFactory.createPolyline()),
  divIcon: vi.fn().mockImplementation(() => MockFactory.createDivIcon()),
  popup: vi.fn().mockImplementation(() => MockFactory.createPopup()),
  featureGroup: vi.fn().mockImplementation(() => MockFactory.createFeatureGroup()),
  latLng: vi.fn().mockImplementation(() => MockFactory.createLatLng()),
  latLngBounds: vi.fn().mockImplementation(() => MockFactory.createLatLngBounds()),
  point: vi.fn().mockImplementation(() => MockFactory.createPoint()),

  // Utilities
  DomUtil: MockFactory.createDomUtil(),
  Util: MockFactory.createUtil(),
  Browser: MockFactory.createBrowser(),

  // Control
  Control: vi.fn().mockImplementation(() => ({
    onAdd: vi.fn().mockReturnValue(document.createElement('div')),
    onRemove: vi.fn(),
    getPosition: vi.fn().mockReturnValue('topright'),
    setPosition: vi.fn().mockReturnThis(),
    getContainer: vi.fn().mockReturnValue(document.createElement('div')),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
  })),

  // Event handling
  DomEvent: {
    on: vi.fn(),
    off: vi.fn(),
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
    stop: vi.fn(),
  },
};

// Make Leaflet available globally
(global as any).L = mockLeaflet;

// Mock DOM APIs that might be needed
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock PointerEvent
global.PointerEvent = class PointerEvent extends Event {
  pointerId: number;
  clientX: number;
  clientY: number;
  pressure: number;
  pointerType: string;

  constructor(type: string, options: any = {}) {
    super(type);
    this.pointerId = options.pointerId || 1;
    this.clientX = options.clientX || 0;
    this.clientY = options.clientY || 0;
    this.pressure = options.pressure || 0.5;
    this.pointerType = options.pointerType || 'mouse';
  }
} as any;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Export mock factory for use in tests
export { MockFactory };
