import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('History Batch Reentrancy', () => {
  let cleanup: () => void;
  let polydraw: ReturnType<typeof createPolydrawHarness>['polydraw'];
  let fixtures: ReturnType<typeof MockFactory.createPredefinedPolygons>;
  let geoFixtures: ReturnType<typeof MockFactory.createGeoJSONFixtures>;

  beforeEach(() => {
    fixtures = MockFactory.createPredefinedPolygons();
    geoFixtures = MockFactory.createGeoJSONFixtures();
    const harness = createPolydrawHarness();
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps outer batch suppression when nested batch APIs run', async () => {
    polydraw.beginBatch();
    try {
      await polydraw.addPredefinedGeoJSONs([
        geoFixtures.squarePolygon(),
        geoFixtures.trianglePolygon(),
      ]);
      await polydraw.addPredefinedPolygon(fixtures.octagon());
    } finally {
      polydraw.endBatch();
    }

    expect(polydraw.getFeatureGroups().length).toBeGreaterThan(0);

    await polydraw.undo();
    expect(polydraw.getFeatureGroups()).toHaveLength(0);
  });
});
