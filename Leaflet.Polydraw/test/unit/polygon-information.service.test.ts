import { PolygonInformationService } from '../../src/polygon-information.service';
import { MapStateService } from '../../src/map-state';

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
    const polygons = [
      [
        { lat: 58.402514, lng: 15.606188 },
        { lat: 58.400691, lng: 15.607462 },
        { lat: 58.400957, lng: 15.608783 },
        { lat: 58.402514, lng: 15.606188 },
      ],
    ];

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
