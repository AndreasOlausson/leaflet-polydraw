import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as L from 'leaflet';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Predefined Polygons', () => {
  let cleanup: () => void;
  let polydraw: ReturnType<typeof createPolydrawHarness>['polydraw'];
  let fixtures: ReturnType<typeof MockFactory.createPredefinedPolygons>;

  beforeEach(() => {
    fixtures = MockFactory.createPredefinedPolygons();
    const harness = createPolydrawHarness();
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('adds a polygon and emits polygonAdded', async () => {
    const onPolygonAdded = vi.fn();
    polydraw.on('polygonAdded', onPolygonAdded);

    await polydraw.addPredefinedPolygon(fixtures.octagon());

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    expect(onPolygonAdded).toHaveBeenCalledTimes(1);
    const payload = onPolygonAdded.mock.calls[0][0];
    expect(polydraw.getFeatureGroups()).toContain(payload.featureGroup);
  });

  it('preserves holes when adding polygons', async () => {
    await polydraw.addPredefinedPolygon(fixtures.squareWithHole());

    const featureGroup = polydraw.getFeatureGroups()[0];
    const polygonLayer = featureGroup
      .getLayers()
      .find((layer) => layer instanceof L.Polygon) as L.Polygon;

    const latLngs = polygonLayer.getLatLngs() as L.LatLng[][] | L.LatLng[][][];
    const rings =
      Array.isArray(latLngs[0]) && Array.isArray((latLngs as L.LatLng[][][])[0][0])
        ? (latLngs as L.LatLng[][][])[0]
        : (latLngs as L.LatLng[][]);
    expect(rings).toHaveLength(2);
  });

  it('stores visual optimization metadata on the polygon', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { visualOptimizationLevel: 6 });

    const featureGroup = polydraw.getFeatureGroups()[0];
    const polygonLayer = featureGroup
      .getLayers()
      .find((layer) => layer instanceof L.Polygon) as L.Polygon & {
      _polydrawOptimizationLevel?: number;
      _polydrawOptimizationOriginalLevel?: number;
    };

    expect(polygonLayer._polydrawOptimizationLevel).toBe(6);
    expect(polygonLayer._polydrawOptimizationOriginalLevel).toBe(6);
  });
});
