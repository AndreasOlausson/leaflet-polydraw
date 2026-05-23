import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  it('resets visible-map-order cache when removing all polygons', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle());

    const internal = polydraw as unknown as { _lastAppliedVisibleMapOrder: unknown[] };
    internal._lastAppliedVisibleMapOrder = [...polydraw.getFeatureGroups()];
    expect(internal._lastAppliedVisibleMapOrder.length).toBeGreaterThan(0);

    polydraw.removeAllFeatureGroups();

    expect(internal._lastAppliedVisibleMapOrder).toHaveLength(0);
  });

  it('emits delete events when removing all polygons', async () => {
    const legacyDeleted = vi.fn();
    const namespacedDeleted = vi.fn();
    polydraw.on('polygonDeleted', legacyDeleted);
    polydraw.on('polydraw:polygon:deleted', namespacedDeleted);

    await polydraw.addPredefinedPolygon(fixtures.triangle());

    polydraw.removeAllFeatureGroups();

    expect(legacyDeleted).toHaveBeenCalledTimes(1);
    expect(namespacedDeleted).toHaveBeenCalledTimes(1);
  });

  it('can scope toolbar erase to the default layer', async () => {
    cleanup();
    const harness = createPolydrawHarness({
      tools: {
        eraseScope: 'defaultLayer',
      },
    });
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;

    await polydraw.addPredefinedPolygon(fixtures.triangle());
    await polydraw.addPredefinedPolygon(fixtures.octagon(), { layer: 'Scenario Layer' });

    (polydraw as unknown as { _handleEraseClick: () => void })._handleEraseClick();

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    expect(polydraw.getFeatureGroupsByLayer('default')).toHaveLength(0);
    expect(polydraw.getFeatureGroupsByLayer('Scenario Layer')).toHaveLength(1);
  });
});
