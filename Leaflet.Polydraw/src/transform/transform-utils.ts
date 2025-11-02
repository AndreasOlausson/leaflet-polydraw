/**
 * Math and conversion helpers for transform mode.
 * All transforms happen in pixel space and then convert back to lat/lng.
 */
import * as L from 'leaflet';
import { leafletAdapter } from '../compatibility/leaflet-adapter';
import type { PixelPoint, PixelBBox } from './transform-types';

export function latLngToPixel(map: L.Map, ll: L.LatLngLiteral): PixelPoint {
  const p = map.latLngToLayerPoint(ll as L.LatLng);
  return { x: p.x, y: p.y };
}

export function pixelToLatLng(map: L.Map, p: PixelPoint): L.LatLngLiteral {
  const ll = map.layerPointToLatLng(leafletAdapter.createPoint(p.x, p.y));
  return { lat: ll.lat, lng: ll.lng };
}

export function getPixelBBox(rings: PixelPoint[][][]): PixelBBox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const poly of rings) {
    for (const ring of poly) {
      for (const pt of ring) {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

export function getPixelCentroid(bbox: PixelBBox): PixelPoint {
  return { x: (bbox.minX + bbox.maxX) / 2, y: (bbox.minY + bbox.maxY) / 2 };
}

/**
 * Converts a bounding box to a square, centering the original content.
 */
export function squareBBox(bbox: PixelBBox): PixelBBox {
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  const size = Math.max(width, height);
  const centerX = (bbox.minX + bbox.maxX) / 2;
  const centerY = (bbox.minY + bbox.maxY) / 2;
  const halfSize = size / 2;
  return {
    minX: centerX - halfSize,
    minY: centerY - halfSize,
    maxX: centerX + halfSize,
    maxY: centerY + halfSize,
  };
}

export function rotatePointAround(p: PixelPoint, pivot: PixelPoint, radians: number): PixelPoint {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
}

export function scalePointAround(
  p: PixelPoint,
  pivot: PixelPoint,
  scaleX: number,
  scaleY: number,
): PixelPoint {
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return { x: pivot.x + dx * scaleX, y: pivot.y + dy * scaleY };
}

export function applyTransform(
  rings: PixelPoint[][][],
  pivot: PixelPoint,
  scaleX: number,
  scaleY: number,
  rotation: number,
): PixelPoint[][][] {
  return rings.map((poly) =>
    poly.map((ring) =>
      ring.map((pt) =>
        rotatePointAround(scalePointAround(pt, pivot, scaleX, scaleY), pivot, rotation),
      ),
    ),
  );
}

export function ensureClosedLatLngRing(ll: L.LatLngLiteral[]): L.LatLngLiteral[] {
  if (ll.length === 0) return ll;
  const first = ll[0];
  const last = ll[ll.length - 1];
  if (first.lat === last.lat && first.lng === last.lng) return ll;
  return [...ll, { lat: first.lat, lng: first.lng }];
}

export function normalizeLatLngs(
  input: L.LatLng[] | L.LatLng[][] | L.LatLng[][][],
): L.LatLng[][][] {
  if (!Array.isArray(input)) {
    return [[input as unknown as L.LatLng[]]];
  }
  const a = input as unknown[];
  if (a.length === 0) return [] as unknown as L.LatLng[][][];
  if (!Array.isArray(a[0])) {
    // LatLng[] -> wrap as [ [ LatLng[] ] ]
    return [[input as unknown as L.LatLng[]]];
  }
  if (!Array.isArray((a[0] as unknown[])[0])) {
    // LatLng[][] -> wrap as [ LatLng[][] ]
    return [input as unknown as L.LatLng[][]];
  }
  return input as unknown as L.LatLng[][][];
}

export function projectLatLngs(
  map: L.Map,
  latLngs: L.LatLng[][][],
): { rings: PixelPoint[][][]; ringLengths: number[][] } {
  const rings: PixelPoint[][][] = [];
  const ringLengths: number[][] = [];
  for (const poly of latLngs) {
    const polyRings: PixelPoint[][] = [];
    const lengths: number[] = [];
    for (const ring of poly) {
      const pts = ring.map((ll) => latLngToPixel(map, { lat: ll.lat, lng: ll.lng }));
      polyRings.push(pts);
      lengths.push(ring.length);
    }
    rings.push(polyRings);
    ringLengths.push(lengths);
  }
  return { rings, ringLengths };
}

export function unprojectToLatLngs(
  map: L.Map,
  rings: PixelPoint[][][],
  templateLatLngs: L.LatLng[][][],
): L.LatLngLiteral[][][] {
  const out: L.LatLngLiteral[][][] = [];
  for (let i = 0; i < rings.length; i++) {
    const poly: L.LatLngLiteral[][] = [];
    for (let j = 0; j < rings[i].length; j++) {
      const ringPts = rings[i][j];
      const ll = ringPts.map((p) => pixelToLatLng(map, p));
      const templ = templateLatLngs[i][j];
      const isClosed =
        templ.length > 2 &&
        templ[0].lat === templ[templ.length - 1].lat &&
        templ[0].lng === templ[templ.length - 1].lng;
      poly.push(isClosed ? ensureClosedLatLngRing(ll) : ll);
    }
    out.push(poly);
  }
  return out;
}

export function snapAngleRadians(angle: number, stepDeg = 15): number {
  const step = (stepDeg * Math.PI) / 180;
  return Math.round(angle / step) * step;
}
