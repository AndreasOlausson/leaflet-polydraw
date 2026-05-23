import booleanWithin from '@turf/boolean-within';
import type { Feature, Polygon, Position } from 'geojson';
import type * as L from 'leaflet';
import { DonutDirection } from '../enums';

export type DonutValidity = 'valid-inward' | 'valid-outward' | 'invalid';

export type DonutValidationReason =
  | 'scale-required'
  | 'nested-inward'
  | 'nested-outward'
  | 'direction-restricted'
  | 'partial-overlap'
  | 'invalid-rings';

export interface DonutValidationResult {
  validity: DonutValidity;
  reason: DonutValidationReason;
  submitEnabled: boolean;
  warning: boolean;
  statusText: string;
  polygon?: Feature<Polygon>;
  allowMerge?: boolean;
}

const SCALE_EPSILON = 0.01;

function toClosedCoordinates(ring: L.LatLngLiteral[]): Position[] {
  const coords: Position[] = ring.map((ll) => [ll.lng, ll.lat]);
  if (coords.length === 0) {
    return coords;
  }
  const [firstLng, firstLat] = coords[0];
  const [lastLng, lastLat] = coords[coords.length - 1];
  if (firstLng !== lastLng || firstLat !== lastLat) {
    coords.push([firstLng, firstLat]);
  }
  return coords;
}

function createPolygonFeature(coordinates: Position[]): Feature<Polygon> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
    properties: {},
  };
}

function invalidResult(reason: DonutValidationReason, statusText: string): DonutValidationResult {
  return {
    validity: 'invalid',
    reason,
    submitEnabled: false,
    warning: true,
    statusText,
  };
}

export function validateDonutCandidate(
  originalOuter: L.LatLngLiteral[],
  scaledOuter: L.LatLngLiteral[],
  scaleX: number,
  scaleY: number,
  direction: DonutDirection = DonutDirection.Both,
): DonutValidationResult {
  if (originalOuter.length < 3 || scaledOuter.length < 3) {
    return invalidResult('invalid-rings', 'Scale to create a donut');
  }

  if (Math.abs(scaleX - 1) < SCALE_EPSILON && Math.abs(scaleY - 1) < SCALE_EPSILON) {
    return invalidResult('scale-required', 'Scale to create a donut');
  }

  const originalCoords = toClosedCoordinates(originalOuter);
  const scaledCoords = toClosedCoordinates(scaledOuter);
  if (originalCoords.length < 4 || scaledCoords.length < 4) {
    return invalidResult('invalid-rings', 'Scale to create a donut');
  }

  const originalFeature = createPolygonFeature(originalCoords);
  const scaledFeature = createPolygonFeature(scaledCoords);

  let inward = false;
  let outward = false;
  try {
    inward = booleanWithin(scaledFeature, originalFeature);
    outward = booleanWithin(originalFeature, scaledFeature);
  } catch {
    return invalidResult('partial-overlap', 'Donut requires one shape to fully contain the other');
  }

  if (!inward && !outward) {
    return invalidResult('partial-overlap', 'Donut requires one shape to fully contain the other');
  }

  if (outward && direction === DonutDirection.Inward) {
    return invalidResult('direction-restricted', 'Only inward donuts allowed');
  }

  const outerCoords = outward ? scaledCoords : originalCoords;
  const innerCoords = outward ? originalCoords : scaledCoords;

  return {
    validity: outward ? 'valid-outward' : 'valid-inward',
    reason: outward ? 'nested-outward' : 'nested-inward',
    submitEnabled: true,
    warning: false,
    statusText: 'Valid donut',
    allowMerge: outward,
    polygon: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [outerCoords, innerCoords],
      },
      properties: {},
    },
  };
}
