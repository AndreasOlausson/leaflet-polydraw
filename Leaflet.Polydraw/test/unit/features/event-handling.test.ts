import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Event Handling', () => {
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

  it('emits history events on undo and redo', async () => {
    const onHistoryChanged = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();

    polydraw.on('polydraw:history:changed', onHistoryChanged);
    polydraw.on('polydraw:history:undo', onUndo);
    polydraw.on('polydraw:history:redo', onRedo);

    await polydraw.addPredefinedPolygon(fixtures.triangle());

    expect(onHistoryChanged).toHaveBeenCalled();
    expect(polydraw.getFeatureGroups()).toHaveLength(1);

    await polydraw.undo();
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(polydraw.getFeatureGroups()).toHaveLength(0);

    await polydraw.redo();
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(polydraw.getFeatureGroups()).toHaveLength(1);
  });
});
