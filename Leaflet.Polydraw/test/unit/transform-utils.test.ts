import { describe, it, expect } from 'vitest';
import type * as L from 'leaflet';
import {
  applyTransform,
  ensureClosedLatLngRing,
  getPixelBBox,
  getPixelCentroid,
  normalizeLatLngs,
  rotatePointAround,
  scalePointAround,
  snapAngleRadians,
  squareBBox,
} from '../../src/transform/transform-utils';
import type { PixelPoint } from '../../src/transform/transform-types';

const createPoint = (x: number, y: number): PixelPoint => ({ x, y });

describe('transform-utils', () => {
  it('computes pixel bounding boxes', () => {
    const rings = [
      [
        [createPoint(0, 0), createPoint(2, 4)] as PixelPoint[],
        [createPoint(-1, 3), createPoint(1, 5)] as PixelPoint[],
      ],
    ];

    const bbox = getPixelBBox(rings);

    expect(bbox).toEqual({ minX: -1, minY: 0, maxX: 2, maxY: 5 });
  });

  it('computes pixel bounding boxes with all positive coordinates', () => {
    const rings = [
      [
        [createPoint(10, 20), createPoint(30, 40)] as PixelPoint[],
        [createPoint(15, 25), createPoint(25, 35)] as PixelPoint[],
      ],
    ];

    const bbox = getPixelBBox(rings);

    expect(bbox).toEqual({ minX: 10, minY: 20, maxX: 30, maxY: 40 });
  });

  it('computes pixel bounding boxes with unordered points', () => {
    const rings = [[[createPoint(5, 10), createPoint(1, 8), createPoint(3, 12)] as PixelPoint[]]];

    const bbox = getPixelBBox(rings);

    expect(bbox).toEqual({ minX: 1, minY: 8, maxX: 5, maxY: 12 });
  });

  it('derives pixel centroid from bbox', () => {
    const bbox = { minX: -2, minY: -4, maxX: 6, maxY: 8 };
    const centroid = getPixelCentroid(bbox);

    expect(centroid).toEqual({ x: 2, y: 2 });
  });

  it('expands bbox into a square with same centre', () => {
    const bbox = { minX: 0, minY: 0, maxX: 4, maxY: 2 };

    const square = squareBBox(bbox);

    expect(square).toEqual({ minX: 0, minY: -1, maxX: 4, maxY: 3 });
  });

  it('rotates point around pivot', () => {
    const pivot = createPoint(1, 1);
    const rotated = rotatePointAround(createPoint(2, 1), pivot, Math.PI / 2);

    expect(rotated.x).toBeCloseTo(1);
    expect(rotated.y).toBeCloseTo(2);
  });

  it('scales point around pivot', () => {
    const pivot = createPoint(0, 0);
    const scaled = scalePointAround(createPoint(2, 3), pivot, 2, 0.5);

    expect(scaled).toEqual({ x: 4, y: 1.5 });
  });

  it('applies scale and rotation across rings', () => {
    const rings = [[[createPoint(1, 0)]]];
    const transformed = applyTransform(rings, createPoint(0, 0), 2, 2, Math.PI / 2);

    expect(transformed[0][0][0].x).toBeCloseTo(0);
    expect(transformed[0][0][0].y).toBeCloseTo(2);
  });

  it('applies non-uniform scaling (different scaleX and scaleY)', () => {
    const rings = [[[createPoint(2, 1)]]];
    const transformed = applyTransform(rings, createPoint(0, 0), 3, 0.5, 0);

    expect(transformed[0][0][0].x).toBeCloseTo(6);
    expect(transformed[0][0][0].y).toBeCloseTo(0.5);
  });

  it('ensures closed rings only when needed', () => {
    const open: L.LatLngLiteral[] = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
    ];
    const closed: L.LatLngLiteral[] = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
      { lat: 0, lng: 0 },
    ];

    expect(ensureClosedLatLngRing(open)).toHaveLength(3);
    expect(ensureClosedLatLngRing(closed)).toHaveLength(3);
  });

  it('does not close ring when first and last points differ by floating point precision', () => {
    const almostClosed: L.LatLngLiteral[] = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
      { lat: 0.0000001, lng: 0.0000001 }, // Very close but not exactly equal
    ];

    const result = ensureClosedLatLngRing(almostClosed);
    // Should add the closing point since first and last are not exactly equal
    expect(result).toHaveLength(4);
    expect(result[3]).toEqual({ lat: 0, lng: 0 });
  });

  it('normalises LatLng arrays to polygon structure', () => {
    const singlePoint = { lat: 0, lng: 0 } as unknown as L.LatLng;
    const singleRing = [[singlePoint]] as unknown as L.LatLng[][];
    const polygon = [[[singlePoint]]] as unknown as L.LatLng[][][];

    const normalizedPoint = normalizeLatLngs(singlePoint as unknown as L.LatLng[]);
    expect(normalizedPoint).toHaveLength(1);
    expect(normalizedPoint[0]).toHaveLength(1);
    expect(normalizedPoint[0][0]).toEqual(singlePoint);

    const normalizedRing = normalizeLatLngs(singleRing);
    expect(normalizedRing).toHaveLength(1);
    expect(normalizedRing[0]).toBe(singleRing);

    const normalizedPolygon = normalizeLatLngs(polygon);
    expect(normalizedPolygon).toBe(polygon);
  });

  it('normalises polygon with multiple rings (outer + holes)', () => {
    const outerPoint = { lat: 0, lng: 0 } as unknown as L.LatLng;
    const holePoint = { lat: 0.5, lng: 0.5 } as unknown as L.LatLng;
    const polygonWithHoles = [[[outerPoint], [holePoint]]] as unknown as L.LatLng[][][];

    const normalized = normalizeLatLngs(polygonWithHoles);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toHaveLength(2); // Outer + hole
    expect(normalized[0][0]).toBe(polygonWithHoles[0][0]);
    expect(normalized[0][1]).toBe(polygonWithHoles[0][1]);
  });

  it('snaps angles to nearest increment', () => {
    const snapped = snapAngleRadians((20 * Math.PI) / 180, 15);
    expect(snapped).toBeCloseTo((15 * Math.PI) / 180);
  });

  it('snaps negative angles correctly', () => {
    const snapped = snapAngleRadians((-20 * Math.PI) / 180, 15);
    expect(snapped).toBeCloseTo((-15 * Math.PI) / 180);
  });

  it('snaps angles that are not divisible by increment (rounds to nearest)', () => {
    const snapped = snapAngleRadians((13 * Math.PI) / 180, 15);
    expect(snapped).toBeCloseTo((15 * Math.PI) / 180);
  });

  it('snaps angles that are exactly halfway between increments (rounds up)', () => {
    const snapped = snapAngleRadians((7.5 * Math.PI) / 180, 15);
    expect(snapped).toBeCloseTo((15 * Math.PI) / 180);
  });
});
