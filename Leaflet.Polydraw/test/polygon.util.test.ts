import { PolygonUtil } from '../src/polygon.util';
import * as L from 'leaflet';

describe('PolygonUtil', () => {
  it('calculates area correctly', () => {
    const latlngs = [
      L.latLng(0, 0),
      L.latLng(0, 1),
      L.latLng(1, 1),
      L.latLng(1, 0),
      L.latLng(0, 0)
    ];
    const area = PolygonUtil.getSqmArea(latlngs);
    expect(area).toBeGreaterThan(0);
  });

  it('calculates perimeter correctly', () => {
    const latlngs = [
      L.latLng(0, 0),
      L.latLng(0, 1),
      L.latLng(1, 1),
      L.latLng(1, 0),
      L.latLng(0, 0)
    ];
    const perimeter = PolygonUtil.getPerimeter(latlngs);
    expect(perimeter).toBeGreaterThan(0);
  });

  it('calculates center correctly', () => {
    const latlngs = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
      { lat: 0, lng: 0 }
    ];
    const center = PolygonUtil.getCenter(latlngs);
    expect(center.lat).toBeCloseTo(0.4);
    expect(center.lng).toBeCloseTo(0.4);
  });

  it('gets bounds correctly', () => {
    const latlngs = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
      { lat: 0, lng: 0 }
    ];
    const bounds = PolygonUtil.getBounds(latlngs);
    expect(bounds.getSouth()).toBe(0);
    expect(bounds.getNorth()).toBe(1);
    expect(bounds.getWest()).toBe(0);
    expect(bounds.getEast()).toBe(1);
  });

  it('gets cardinal directions correctly', () => {
    const latlngs = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
      { lat: 0, lng: 0 }
    ];
    
    const southWest = PolygonUtil.getSouthWest(latlngs);
    expect(southWest.lat).toBe(0);
    expect(southWest.lng).toBe(0);
    
    const northEast = PolygonUtil.getNorthEast(latlngs);
    expect(northEast.lat).toBe(1);
    expect(northEast.lng).toBe(1);
    
    const northWest = PolygonUtil.getNorthWest(latlngs);
    expect(northWest.lat).toBe(1);
    expect(northWest.lng).toBe(0);
    
    const southEast = PolygonUtil.getSouthEast(latlngs);
    expect(southEast.lat).toBe(0);
    expect(southEast.lng).toBe(1);
  });

  it('gets polygon checksum correctly', () => {
    const latlngs = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
      { lat: 0, lng: 0 }
    ];
    const checksum = PolygonUtil.getPolygonChecksum(latlngs);
    expect(checksum).toBeGreaterThan(0);
  });

  it('gets midpoint correctly', () => {
    const point1 = { lat: 0, lng: 0 };
    const point2 = { lat: 1, lng: 1 };
    const midpoint = PolygonUtil.getMidPoint(point1, point2);
    expect(midpoint.lat).toBeCloseTo(0.5);
    expect(midpoint.lng).toBeCloseTo(0.5);
  });
});
