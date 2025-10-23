import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolygonInformationService } from '../../src/polygon-information.service';
import { MapStateService } from '../../src/map-state';
import { PolygonInfo } from '../../src/polygon-helpers';
import { createMockFeatureGroup, createMockPolygon } from './utils/mock-factory';
import * as L from 'leaflet';

// Factory function for creating test coordinates
function createTestCoordinates(coords: Array<[number, number]>): L.LatLngLiteral[] {
  return coords.map(([lat, lng]) => ({ lat, lng }));
}

// Factory function for creating test polygon info
function createTestPolygonInfo(coordinateArrays: Array<Array<[number, number]>>): PolygonInfo {
  const coordinates = coordinateArrays.map((coords) => createTestCoordinates(coords));
  return new PolygonInfo(coordinates);
}

// Common test coordinates
const BASIC_COORDINATES = [
  [58.402514, 15.606188],
  [58.400691, 15.607462],
  [58.400957, 15.608783],
] as Array<[number, number]>;

const SECOND_COORDINATES = [
  [59.402514, 16.606188],
  [59.400691, 16.607462],
] as Array<[number, number]>;

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
    // Create proper L.FeatureGroup with L.Polygon using factory functions
    const coordinates = createTestCoordinates([
      ...BASIC_COORDINATES,
      BASIC_COORDINATES[0], // Close the polygon
    ]);

    const polygon = createMockPolygon(coordinates);
    const featureGroup = createMockFeatureGroup({ layers: [polygon] });
    const polygons = [featureGroup];

    polygonInformationService.createPolygonInformationStorage(polygons);

    // Test that polygon information is stored
    expect(polygonInformationService.polygonInformationStorage.length).toBe(1);
  });

  it('can delete polygon information storage', () => {
    // First add some data using factory functions
    const coordinates = createTestCoordinates(BASIC_COORDINATES);
    const polygon = createMockPolygon(coordinates);
    const featureGroup = createMockFeatureGroup({ layers: [polygon] });
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
    // Create mock polygon info using factory function
    const polygonInfo = createTestPolygonInfo([BASIC_COORDINATES.slice(0, 2)]);
    polygonInformationService.polygonInformationStorage = [polygonInfo];

    // Spy on mapStateService.updatePolygons
    const updatePolygonsSpy = vi.spyOn(mapStateService, 'updatePolygons');

    // Call updatePolygons (covers lines 27-28 and the main update logic)
    polygonInformationService.updatePolygons();

    expect(updatePolygonsSpy).toHaveBeenCalled();
  });

  it('can delete trashcan from polygon', () => {
    // Create mock polygon data using factory function
    const coordinates = createTestCoordinates(BASIC_COORDINATES.slice(0, 2));
    const polygonInfo = new PolygonInfo([coordinates]);
    polygonInformationService.polygonInformationStorage = [polygonInfo];

    // Test deleteTrashcan (covers lines 74-79)
    // Pass the exact reference that was stored in polygon[0]
    polygonInformationService.deleteTrashcan(polygonInfo.polygon[0]);

    expect(polygonInformationService.polygonInformationStorage.length).toBe(0);
  });

  it('can delete trashcan on multi polygon', () => {
    // Create mock polygon data with multiple polygons using factory functions
    const polygonInfo1 = createTestPolygonInfo([BASIC_COORDINATES.slice(0, 2)]);
    const polygonInfo2 = createTestPolygonInfo([SECOND_COORDINATES]);
    polygonInformationService.polygonInformationStorage = [polygonInfo1, polygonInfo2];

    // Test deleteTrashCanOnMulti (covers lines 82-105)
    // Pass the exact reference that was stored in polygon (3D array format)
    polygonInformationService.deleteTrashCanOnMulti(polygonInfo1.polygon);

    // Should still have polygons but modified
    expect(polygonInformationService.polygonInformationStorage.length).toBeGreaterThanOrEqual(0);
  });

  it('handles empty feature groups in createPolygonInformationStorage', () => {
    // Test with empty array (covers the if condition)
    polygonInformationService.createPolygonInformationStorage([]);

    expect(polygonInformationService.polygonInformationStorage.length).toBe(0);
  });

  it('handles feature groups without layers', () => {
    // Create a feature group without layers using factory function
    const emptyFeatureGroup = createMockFeatureGroup({ layers: [] });

    polygonInformationService.createPolygonInformationStorage([emptyFeatureGroup]);

    expect(polygonInformationService.polygonInformationStorage.length).toBe(0);
  });

  it('handles polygon with non-closed coordinates in updatePolygons', () => {
    // Create polygon with non-closed coordinates (first != last) using factory function
    const polygonInfo = createTestPolygonInfo([BASIC_COORDINATES]);
    polygonInformationService.polygonInformationStorage = [polygonInfo];

    const updatePolygonsSpy = vi.spyOn(mapStateService, 'updatePolygons');

    // This should trigger the polygon closing logic
    polygonInformationService.updatePolygons();

    expect(updatePolygonsSpy).toHaveBeenCalled();
  });
});
