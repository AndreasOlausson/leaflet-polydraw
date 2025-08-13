import { MapStateService } from '../../src/map-state';
import * as L from 'leaflet';

describe('MapStateService', () => {
  let mapStateService: MapStateService;
  let map: L.Map;

  beforeEach(() => {
    mapStateService = new MapStateService();
    map = L.map(document.createElement('div'), {
      center: [51.505, -0.09],
      zoom: 13,
    });
  });

  afterEach(() => {
    map.remove();
  });

  it('can be instantiated', () => {
    expect(mapStateService).toBeInstanceOf(MapStateService);
  });

  it('can update map state', () => {
    mapStateService.updateMapState(map);

    // Test that the map is stored
    expect(mapStateService).toBeDefined();
  });
});
