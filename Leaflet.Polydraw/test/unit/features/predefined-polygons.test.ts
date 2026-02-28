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

  it('accepts metadata and overrides in predefined options', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), {
      metadata: { category: 'demo', rank: 1 },
      overrides: {
        interaction: 'readonly',
        merge: 'block',
        style: { color: '#ff0000', fillColor: '#ffeeee', fillOpacity: 0.4, weight: 3 },
      },
    });

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    const featureGroup = polydraw.getFeatureGroups()[0];
    expect(polydraw.getFeatureMetadata(featureGroup)).toEqual({
      category: 'demo',
      rank: 1,
    });

    const markers = featureGroup
      .getLayers()
      .filter((layer) => layer instanceof L.Marker) as L.Marker[];
    expect(markers).toHaveLength(0);

    const polygonLayer = featureGroup
      .getLayers()
      .find((layer) => layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) as L.Polygon;
    expect((polygonLayer.options.color as string).toLowerCase()).toBe('#ff0000');
    expect((polygonLayer.options.fillColor as string).toLowerCase()).toBe('#ffeeee');
    expect(polygonLayer.options.fillOpacity).toBe(0.4);
    expect(polygonLayer.options.weight).toBe(3);
  });

  it('supports merge overrides for predefined polygons', async () => {
    const [first, second] = fixtures.overlappingSquares();

    await polydraw.addPredefinedPolygon([first]);
    await polydraw.addPredefinedPolygon([second], {
      overrides: { merge: 'block' },
    });
    expect(polydraw.getFeatureGroups()).toHaveLength(2);

    await polydraw.addPredefinedPolygon([first], {
      layer: {
        id: 'Readonly Merge Layer',
        interaction: 'readonly',
      },
    });
    await polydraw.addPredefinedPolygon([second], {
      layer: {
        id: 'Readonly Merge Layer',
        interaction: 'readonly',
      },
      overrides: { merge: 'allow' },
    });
    const readonlyLayerFeatureGroups = polydraw.getFeatureGroupsByLayer('Readonly Merge Layer');
    expect(readonlyLayerFeatureGroups).toHaveLength(1);
  });
});
