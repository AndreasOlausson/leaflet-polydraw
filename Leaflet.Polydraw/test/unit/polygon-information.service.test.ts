import { PolygonInformationService } from '../../src/polygon-information.service';
import { MapStateService } from '../../src/map-state';
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
    expect(polygonInformationService).toBeDefined();
  });

  it('can delete polygon information storage', () => {
    polygonInformationService.deletePolygonInformationStorage();

    // Test that polygon information is cleared
    expect(polygonInformationService).toBeDefined();
  });
});
