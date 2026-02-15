import { describe, expect, it } from 'vitest';
import type { Feature, LineString, MultiPolygon, Polygon } from 'geojson';
import { defaultConfig } from '../../src/config';
import { TurfHelper } from '../../src/turf-helper';
import { deepMerge } from '../../src/utils/config-merge.util';

function buildDenseRing(points = 48, radius = 1): [number, number][] {
  const ring: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    ring.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  ring.push(ring[0]);
  return ring;
}

function createDensePolygon(): Feature<Polygon | MultiPolygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPolygon',
      coordinates: [[buildDenseRing()]],
    },
  };
}

function createTraceFeature(): Feature<LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [-0.2, 0.5],
        [0, 0],
      ],
    },
  };
}

function getOuterRingVertexCount(feature: Feature<Polygon | MultiPolygon>): number {
  return feature.geometry.coordinates[0][0].length;
}

describe('TurfHelper config validation', () => {
  it('falls back to simple strategy when simplification.strategy is invalid', () => {
    const polygon = createDensePolygon();

    const simpleConfig = deepMerge(structuredClone(defaultConfig), {
      simplification: {
        strategy: 'simple',
        simple: { tolerance: 0.01, highQuality: false },
        dynamic: { baseTolerance: 0, highQuality: false, fractionGuard: 0.9, multiplier: 2 },
      },
    });

    const dynamicConfig = deepMerge(structuredClone(defaultConfig), {
      simplification: {
        strategy: 'dynamic',
        simple: { tolerance: 0.01, highQuality: false },
        dynamic: { baseTolerance: 0, highQuality: false, fractionGuard: 0.9, multiplier: 2 },
      },
    });

    const invalidStrategyConfig = deepMerge(structuredClone(defaultConfig), {
      simplification: {
        strategy: 'not-a-real-strategy',
        simple: { tolerance: 0.01, highQuality: false },
        dynamic: { baseTolerance: 0, highQuality: false, fractionGuard: 0.9, multiplier: 2 },
      },
    } as any);

    const simpleHelper = new TurfHelper(simpleConfig);
    const dynamicHelper = new TurfHelper(dynamicConfig);
    const invalidHelper = new TurfHelper(invalidStrategyConfig);

    const simpleResult = simpleHelper.getSimplified(polygon, false);
    const dynamicResult = dynamicHelper.getSimplified(polygon, false);
    const invalidResult = invalidHelper.getSimplified(polygon, false);

    expect(getOuterRingVertexCount(invalidResult)).toBe(getOuterRingVertexCount(simpleResult));
    expect(getOuterRingVertexCount(invalidResult)).toBeLessThan(
      getOuterRingVertexCount(dynamicResult),
    );
  });

  it('normalizes invalid numeric simplification values to safe defaults', () => {
    const polygon = createDensePolygon();

    const defaultDynamicConfig = deepMerge(structuredClone(defaultConfig), {
      simplification: {
        strategy: 'dynamic',
        dynamic: {
          baseTolerance: 0.0001,
          highQuality: false,
          fractionGuard: 0.9,
          multiplier: 2,
        },
      },
    });

    const invalidDynamicConfig = deepMerge(structuredClone(defaultConfig), {
      simplification: {
        strategy: 'dynamic',
        dynamic: {
          baseTolerance: Number.NaN,
          highQuality: 'yes',
          fractionGuard: Number.POSITIVE_INFINITY,
          multiplier: 1,
        },
      },
    } as any);

    const expectedHelper = new TurfHelper(defaultDynamicConfig);
    const invalidHelper = new TurfHelper(invalidDynamicConfig);

    const expected = expectedHelper.getSimplified(polygon, false);
    const normalized = invalidHelper.getSimplified(polygon, false);

    expect(getOuterRingVertexCount(normalized)).toBe(getOuterRingVertexCount(expected));
  });

  it('still falls back to concaveman when runtime config uses algorithm="buffer"', () => {
    const trace = createTraceFeature();

    const defaultHelper = new TurfHelper(structuredClone(defaultConfig));
    const bufferHelper = new TurfHelper(
      deepMerge(structuredClone(defaultConfig), {
        polygonCreation: { algorithm: 'buffer' },
      } as any),
    );

    const defaultResult = defaultHelper.createPolygonFromTrace(trace);
    const bufferResult = bufferHelper.createPolygonFromTrace(trace);

    expect(bufferResult.geometry.type).toBe('MultiPolygon');
    expect(getOuterRingVertexCount(bufferResult)).toBe(getOuterRingVertexCount(defaultResult));
  });

  it('deep-merges nested constructor config so partial polygonTools keeps bezier defaults', () => {
    const polygonArray: [number, number][][][] = [[buildDenseRing(12)]];

    const defaultHelper = new TurfHelper(structuredClone(defaultConfig));
    const partialHelper = new TurfHelper({ polygonTools: {} } as any);

    const defaultResult = defaultHelper.getBezierMultiPolygon(polygonArray);
    const partialResult = partialHelper.getBezierMultiPolygon(polygonArray);

    expect(partialResult.geometry.coordinates[0][0].length).toBe(
      defaultResult.geometry.coordinates[0][0].length,
    );
  });
});
