import { describe, expect, it } from 'vitest';
import type * as L from 'leaflet';
import { validateDonutCandidate } from '../../src/transform/donut-validation';
import { DonutDirection } from '../../src/enums';

function scaleRing(
  ring: L.LatLngLiteral[],
  scaleX: number,
  scaleY: number,
  center: L.LatLngLiteral = { lat: 0, lng: 0 },
): L.LatLngLiteral[] {
  return ring.map((point) => ({
    lat: center.lat + (point.lat - center.lat) * scaleY,
    lng: center.lng + (point.lng - center.lng) * scaleX,
  }));
}

describe('donut-validation', () => {
  const square: L.LatLngLiteral[] = [
    { lat: -1, lng: -1 },
    { lat: -1, lng: 1 },
    { lat: 1, lng: 1 },
    { lat: 1, lng: -1 },
    { lat: -1, lng: -1 },
  ];

  it('requires scaling before a donut can be confirmed', () => {
    const result = validateDonutCandidate(square, square, 1, 1);

    expect(result.submitEnabled).toBe(false);
    expect(result.validity).toBe('invalid');
    expect(result.reason).toBe('scale-required');
    expect(result.statusText).toBe('Scale to create a donut');
  });

  it('accepts inward donuts when the scaled polygon is fully nested', () => {
    const innerSquare = scaleRing(square, 0.6, 0.6);
    const result = validateDonutCandidate(square, innerSquare, 0.6, 0.6);

    expect(result.submitEnabled).toBe(true);
    expect(result.validity).toBe('valid-inward');
    expect(result.allowMerge).toBe(false);
    expect(result.polygon?.geometry.coordinates).toHaveLength(2);
  });

  it('accepts outward donuts when the original polygon becomes the hole', () => {
    const outerSquare = scaleRing(square, 1.4, 1.4);
    const result = validateDonutCandidate(square, outerSquare, 1.4, 1.4);

    expect(result.submitEnabled).toBe(true);
    expect(result.validity).toBe('valid-outward');
    expect(result.allowMerge).toBe(true);
    expect(result.polygon?.geometry.coordinates).toHaveLength(2);
  });

  it('rejects outward donuts when config only allows inward direction', () => {
    const outerSquare = scaleRing(square, 1.4, 1.4);
    const result = validateDonutCandidate(square, outerSquare, 1.4, 1.4, DonutDirection.Inward);

    expect(result.submitEnabled).toBe(false);
    expect(result.validity).toBe('invalid');
    expect(result.reason).toBe('direction-restricted');
    expect(result.statusText).toBe('Only inward donuts allowed');
  });

  it('rejects concave shapes that only partially overlap after scaling', () => {
    const lShape: L.LatLngLiteral[] = [
      { lat: -2, lng: -2 },
      { lat: -2, lng: 2 },
      { lat: -1, lng: 2 },
      { lat: -1, lng: -1 },
      { lat: 1, lng: -1 },
      { lat: 1, lng: 2 },
      { lat: 2, lng: 2 },
      { lat: 2, lng: -2 },
      { lat: -2, lng: -2 },
    ];
    const scaledLShape = scaleRing(lShape, 0.8, 0.8);
    const result = validateDonutCandidate(lShape, scaledLShape, 0.8, 0.8);

    expect(result.submitEnabled).toBe(false);
    expect(result.validity).toBe('invalid');
    expect(result.reason).toBe('partial-overlap');
    expect(result.statusText).toContain('fully contain');
  });
});
