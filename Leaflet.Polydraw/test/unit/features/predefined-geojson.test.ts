import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as L from 'leaflet';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Predefined GeoJSON', () => {
  let cleanup: () => void;
  let polydraw: ReturnType<typeof createPolydrawHarness>['polydraw'];
  let fixtures: ReturnType<typeof MockFactory.createGeoJSONFixtures>;

  beforeEach(() => {
    fixtures = MockFactory.createGeoJSONFixtures();
    const harness = createPolydrawHarness();
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('adds MultiPolygon features as separate groups', async () => {
    await polydraw.addPredefinedGeoJSONs([fixtures.multipolygon()]);

    expect(polydraw.getFeatureGroups()).toHaveLength(2);
  });

  it('adds multiple Polygon features and carries optimization metadata', async () => {
    await polydraw.addPredefinedGeoJSONs([fixtures.squarePolygon(), fixtures.trianglePolygon()], {
      visualOptimizationLevel: 4,
    });

    expect(polydraw.getFeatureGroups()).toHaveLength(2);
    const featureGroup = polydraw.getFeatureGroups()[0];
    const polygonLayer = featureGroup
      .getLayers()
      .find((layer) => layer instanceof L.Polygon) as L.Polygon & {
      _polydrawOptimizationLevel?: number;
    };

    expect(polygonLayer._polydrawOptimizationLevel).toBe(4);
  });
});
