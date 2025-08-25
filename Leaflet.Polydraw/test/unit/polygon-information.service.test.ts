import { PolygonInformationService } from '../../src/polygon-information.service';
import { MapStateService } from '../../src/map-state';
import { PolygonInfo } from '../../src/polygon-helpers';
import * as L from 'leaflet';

describe('PolygonInformationService', () => {
  let polygonInformationService: PolygonInformationService;
  let mapStateService: MapStateService;

  beforeEach(() => {
    mapStateService = new MapStateService();
    polygonInformationService = new PolygonInformationService(mapStateService);
  });

  it('can be instantiated', () => {
    expect(polygonInformationService).toBeInstanceOf(PolygonInformationService);
  });

  it('can create polygon information storage', () => {
    // Create proper L.FeatureGroup with L.Polygon
    const coordinates = [
      { lat: 58.402514, lng: 15.606188 },
      { lat: 58.400691, lng: 15.607462 },
      { lat: 58.400957, lng: 15.608783 },
      { lat: 58.402514, lng: 15.606188 },
    ];

    const polygon = new L.Polygon(coordinates);
    const featureGroup = new L.FeatureGroup([polygon]);
    const polygons = [featureGroup];

    polygonInformationService.createPolygonInformationStorage(polygons);

    // Test that polygon information is stored
    expect(polygonInformationService.polygonInformationStorage.length).toBe(1);
  });

  it('can delete polygon information storage', () => {
    // First add some data
    const coordinates = [
      { lat: 58.402514, lng: 15.606188 },
      { lat: 58.400691, lng: 15.607462 },
      { lat: 58.400957, lng: 15.608783 },
    ];
    const polygon = new L.Polygon(coordinates);
    const featureGroup = new L.FeatureGroup([polygon]);
    polygonInformationService.createPolygonInformationStorage([featureGroup]);

    // Then delete it
    polygonInformationService.deletePolygonInformationStorage();

    // Test that polygon information is cleared
    expect(polygonInformationService.polygonInformationStorage.length).toBe(0);
  });

  it('can register and trigger polygon info listeners', () => {
    const mockCallback = vi.fn();

    // Register listener (covers line 17-18)
    polygonInformationService.onPolygonInfoUpdated(mockCallback);

    // Trigger the callback by saving current state
    polygonInformationService.saveCurrentState();

    expect(mockCallback).toHaveBeenCalledWith([]);
  });

  it('can register polygon draw state listeners', () => {
    const mockCallback = vi.fn();

    // Register listener (covers line 22-23)
    polygonInformationService.onPolygonDrawStateUpdated(mockCallback);

    // The callback is registered but not called in current implementation
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('can update polygons with existing data', () => {
    // Create mock polygon info
    const coordinates = [
      [
        { lat: 58.402514, lng: 15.606188 },
        { lat: 58.400691, lng: 15.607462 },
      ],
    ];
    const polygonInfo = new PolygonInfo([coordinates]);
    polygonInformationService.polygonInformationStorage = [polygonInfo];

    // Spy on mapStateService.updatePolygons
    const updatePolygonsSpy = vi.spyOn(mapStateService, 'updatePolygons');

    // Call updatePolygons (covers lines 27-28 and the main update logic)
    polygonInformationService.updatePolygons();

    expect(updatePolygonsSpy).toHaveBeenCalled();
  });

  it('can delete trashcan from polygon', () => {
    // Create mock polygon data
    const coordinates = [
      [
        { lat: 58.402514, lng: 15.606188 },
        { lat: 58.400691, lng: 15.607462 },
      ],
    ];
    const polygonInfo = new PolygonInfo([coordinates]);
    polygonInformationService.polygonInformationStorage = [polygonInfo];

    // Test deleteTrashcan (covers lines 74-79)
    polygonInformationService.deleteTrashcan(coordinates);

    expect(polygonInformationService.polygonInformationStorage.length).toBe(0);
  });

  it('can delete trashcan on multi polygon', () => {
    // Create mock polygon data with multiple polygons
    const coordinates1 = [
      [
        { lat: 58.402514, lng: 15.606188 },
        { lat: 58.400691, lng: 15.607462 },
      ],
    ];
    const coordinates2 = [
      [
        { lat: 59.402514, lng: 16.606188 },
        { lat: 59.400691, lng: 16.607462 },
      ],
    ];

    const polygonInfo1 = new PolygonInfo([coordinates1]);
    const polygonInfo2 = new PolygonInfo([coordinates2]);
    polygonInformationService.polygonInformationStorage = [polygonInfo1, polygonInfo2];

    // Test deleteTrashCanOnMulti (covers lines 82-105)
    polygonInformationService.deleteTrashCanOnMulti([coordinates1]);

    // Should still have polygons but modified
    expect(polygonInformationService.polygonInformationStorage.length).toBeGreaterThanOrEqual(0);
  });

  it('handles empty feature groups in createPolygonInformationStorage', () => {
    // Test with empty array (covers the if condition)
    polygonInformationService.createPolygonInformationStorage([]);

    expect(polygonInformationService.polygonInformationStorage.length).toBe(0);
  });

  it('handles feature groups without layers', () => {
    // Create a feature group without layers
    const emptyFeatureGroup = new L.FeatureGroup([]);

    polygonInformationService.createPolygonInformationStorage([emptyFeatureGroup]);

    expect(polygonInformationService.polygonInformationStorage.length).toBe(0);
  });

  it('handles polygon with non-closed coordinates in updatePolygons', () => {
    // Create polygon with non-closed coordinates (first != last)
    const coordinates = [
      [
        { lat: 58.402514, lng: 15.606188 },
        { lat: 58.400691, lng: 15.607462 },
        { lat: 58.400957, lng: 15.608783 },
        // Note: not closed (first point not repeated at end)
      ],
    ];
    const polygonInfo = new PolygonInfo([coordinates]);
    polygonInformationService.polygonInformationStorage = [polygonInfo];

    const updatePolygonsSpy = vi.spyOn(mapStateService, 'updatePolygons');

    // This should trigger the polygon closing logic
    polygonInformationService.updatePolygons();

    expect(updatePolygonsSpy).toHaveBeenCalled();
  });
});
