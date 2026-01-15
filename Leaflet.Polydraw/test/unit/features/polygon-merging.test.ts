import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Polygon Merging', () => {
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

  it('merges overlapping polygons into a single feature group', async () => {
    const [first, second] = fixtures.overlappingSquares();

    await polydraw.addPredefinedPolygon([first]);
    await polydraw.addPredefinedPolygon([second]);

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
  });

  it('keeps separate polygons when they do not intersect', async () => {
    const polygons = fixtures.multipleSimplePolygons();

    for (const polygon of polygons) {
      await polydraw.addPredefinedPolygon([polygon]);
    }

    expect(polydraw.getFeatureGroups()).toHaveLength(polygons.length);
  });
});
