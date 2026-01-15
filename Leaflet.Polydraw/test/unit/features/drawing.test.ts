import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Drawing History Capture', () => {
  let cleanup: () => void;
  let polydraw: ReturnType<typeof createPolydrawHarness>['polydraw'];
  let fixtures: ReturnType<typeof MockFactory.createPredefinedPolygons>;

  beforeEach(() => {
    fixtures = MockFactory.createPredefinedPolygons();
    const harness = createPolydrawHarness({
      history: { capture: { addPredefinedPolygon: false } },
    });
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('skips history when capture is disabled for predefined polygons', async () => {
    const onHistoryChanged = vi.fn();
    polydraw.on('polydraw:history:changed', onHistoryChanged);

    await polydraw.addPredefinedPolygon(fixtures.triangle());

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    expect(onHistoryChanged).not.toHaveBeenCalled();

    await polydraw.undo();
    expect(polydraw.getFeatureGroups()).toHaveLength(1);
  });
});
