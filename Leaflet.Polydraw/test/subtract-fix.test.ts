import { describe, it, expect, beforeEach, vi } from 'vitest';
import Polydraw from '../src/polydraw';
import * as L from 'leaflet';
import { JSDOM } from 'jsdom';

// Mock DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="map"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window as any;
global.HTMLElement = dom.window.HTMLElement;

describe('Subtract Fix Test', () => {
  let map: L.Map;
  let polydraw: Polydraw;

  beforeEach(() => {
    // Create a mock map
    map = {
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      addControl: vi.fn(),
      removeControl: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      fire: vi.fn(),
      getContainer: vi.fn(() => document.createElement('div')),
      dragging: { enable: vi.fn(), disable: vi.fn() },
      doubleClickZoom: { enable: vi.fn(), disable: vi.fn() },
      scrollWheelZoom: { enable: vi.fn(), disable: vi.fn() },
      containerPointToLatLng: vi.fn(() => ({ lat: 0, lng: 0 })),
    } as any;

    // Create polydraw instance
    polydraw = new Polydraw();
    polydraw.addTo(map);
  });

  it('should create exactly 2 polygons when cutting overlapping polygons in half', () => {
    console.log('🧪 TEST: Starting subtract fix test');

    // Step 1: Draw first polygon (square)
    const polygon1 = [
      [
        [
          { lat: 0, lng: 0 },
          { lat: 0, lng: 2 },
          { lat: 2, lng: 2 },
          { lat: 2, lng: 0 },
          { lat: 0, lng: 0 },
        ],
      ],
    ];

    polydraw.addAutoPolygon(polygon1 as any);
    console.log('🧪 TEST: Added first polygon');

    // Step 2: Draw overlapping polygon (overlapping square)
    const polygon2 = [
      [
        [
          { lat: 1, lng: 1 },
          { lat: 1, lng: 3 },
          { lat: 3, lng: 3 },
          { lat: 3, lng: 1 },
          { lat: 1, lng: 1 },
        ],
      ],
    ];

    polydraw.addAutoPolygon(polygon2 as any);
    console.log('🧪 TEST: Added overlapping polygon');

    // Check that they merged into 1 polygon
    const arrayOfFeatureGroups = (polydraw as any).arrayOfFeatureGroups;
    console.log('🧪 TEST: After merge, polygon count:', arrayOfFeatureGroups.length);

    // Step 3: Cut in half with subtract polygon
    const subtractPolygon = [
      [
        [
          { lat: -0.5, lng: 1.5 },
          { lat: -0.5, lng: 1.6 },
          { lat: 3.5, lng: 1.6 },
          { lat: 3.5, lng: 1.5 },
          { lat: -0.5, lng: 1.5 },
        ],
      ],
    ];

    // Set to subtract mode and perform subtract
    (polydraw as any).setDrawMode(1); // DrawMode.Subtract

    // Create GeoJSON for subtract operation
    const subtractGeoJSON = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: subtractPolygon[0],
      },
    };

    // Perform subtract operation
    (polydraw as any).subtractPolygon(subtractGeoJSON);
    console.log('🧪 TEST: Performed subtract operation');

    // Check final polygon count - should be exactly 2
    const finalCount = arrayOfFeatureGroups.length;
    console.log('🧪 TEST: Final polygon count:', finalCount);

    // This should be 2 polygons (the merged polygon cut in half)
    expect(finalCount).toBe(2);
  });
});
