import { MapStateService } from '../../src/map-state';
import * as L from 'leaflet';
import { vi } from 'vitest';
import { createMockMap } from './utils/mock-factory';

describe('MapStateService', () => {
  let mapStateService: MapStateService;
  let map: L.Map;

  beforeEach(() => {
    mapStateService = new MapStateService();
    map = createMockMap();
  });

  afterEach(() => {
    // Mock map doesn't need cleanup like real map
  });

  it('can be instantiated', () => {
    expect(mapStateService).toBeInstanceOf(MapStateService);
  });

  it('can update map state', () => {
    mapStateService.updateMapState(map);

    // Test that the map is stored
    expect(mapStateService).toBeDefined();
  });

  it('calls listener immediately if map already exists', () => {
    // Arrange: set the map state first
    mapStateService.updateMapState(map);

    const cb = vi.fn();

    // Act: register listener after map is already set
    mapStateService.onMapUpdated(cb);

    // Assert: callback should be called immediately with current map
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(map);
  });

  it('notifies previously registered listeners when map is set later', () => {
    const cb = vi.fn();

    // Arrange: register listener before map exists
    mapStateService.onMapUpdated(cb);

    // It should not be called yet since map is null
    expect(cb).not.toHaveBeenCalled();

    // Act: set the map, which should emit to listeners
    mapStateService.updateMapState(map);

    // Assert: callback should be called once with the map
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(map);
  });
});
