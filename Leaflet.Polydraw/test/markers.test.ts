import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';
import { IconFactory } from '../src/icon-factory';

// Mock DOM environment
const createMockMap = () => {
  const mapContainer = document.createElement('div');
  const map = L.map(mapContainer);
  (map as any).getContainer = () => mapContainer;
  return map;
};

vi.mock('leaflet', async () => {
  const actual = await vi.importActual('leaflet');
  const MockMarker = vi.fn(() => ({
    getLatLng: vi.fn(),
    setLatLng: vi.fn(),
    addTo: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getElement: vi.fn(() => ({ style: {}, classList: { add: vi.fn(), remove: vi.fn() } })),
    bindPopup: vi.fn(),
    options: {},
    addEventParent: vi.fn(),
  }));

  return {
    ...actual,
    Marker: MockMarker,
  };
});

describe('Marker Management and Styling', () => {
  let polydraw: Polydraw;
  let mockMap: L.Map;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMap = createMockMap();
    polydraw = new Polydraw();
    polydraw.onAdd(mockMap);
  });

  it('should add normal markers for the outer ring of a polygon', () => {
    const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker');
    const latlngs = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 0 },
    ];
    const featureGroup = new L.FeatureGroup();

    (polydraw as any).addMarker(latlngs, featureGroup);

    expect(addMarkerSpy).toHaveBeenCalled();
    expect(L.Marker).toHaveBeenCalledTimes(latlngs.length);
  });

  it('should add hole markers for the inner rings of a polygon', () => {
    const addHoleMarkerSpy = vi.spyOn(polydraw as any, 'addHoleMarker');
    const latlngs = [
      { lat: 0.2, lng: 0.2 },
      { lat: 0.8, lng: 0.2 },
      { lat: 0.8, lng: 0.8 },
      { lat: 0.2, lng: 0.2 },
    ];
    const featureGroup = new L.FeatureGroup();

    (polydraw as any).addHoleMarker(latlngs, featureGroup);

    expect(addHoleMarkerSpy).toHaveBeenCalled();
    expect(L.Marker).toHaveBeenCalledTimes(latlngs.length);
  });

  it('should use correct CSS classes for hole markers', () => {
    const createDivIconSpy = vi.spyOn(IconFactory, 'createDivIcon');
    const latlngs = [
      { lat: 0.2, lng: 0.2 },
      { lat: 0.8, lng: 0.2 },
      { lat: 0.8, lng: 0.8 },
      { lat: 0.2, lng: 0.2 },
    ];
    const featureGroup = new L.FeatureGroup();

    (polydraw as any).addHoleMarker(latlngs, featureGroup);

    expect(createDivIconSpy).toHaveBeenCalledWith(['polygon-marker', 'hole']);
  });
});
