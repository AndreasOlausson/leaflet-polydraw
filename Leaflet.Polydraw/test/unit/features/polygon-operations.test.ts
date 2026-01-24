import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Polygon Operations', () => {
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

  it('clears feature groups in-place when removing all polygons', async () => {
    const featureGroups = polydraw.getFeatureGroups();

    await polydraw.addPredefinedPolygon(fixtures.triangle());
    await polydraw.addPredefinedPolygon(fixtures.octagon());

    expect(featureGroups).toHaveLength(2);

    polydraw.removeAllFeatureGroups();

    expect(featureGroups).toHaveLength(0);
    expect(polydraw.getFeatureGroups()).toBe(featureGroups);
  });
});
