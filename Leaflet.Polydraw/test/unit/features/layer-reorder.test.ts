import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Layer Reordering', () => {
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

  it('reorders feature-group sequence when layers are reordered', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Layer A' });
    await polydraw.addPredefinedPolygon(fixtures.octagon(), { layer: 'Layer B' });
    await polydraw.addPredefinedPolygon(fixtures.squareWithHole(), { layer: 'Layer C' });

    const layerManager = polydraw.getLayerManager();
    const layerIdsBefore = polydraw
      .getFeatureGroups()
      .map((featureGroup) => layerManager.getLayerForFeatureGroup(featureGroup));
    expect(layerIdsBefore).toEqual(['Layer A', 'Layer B', 'Layer C']);

    const moved = polydraw.reorderLayer('Layer C', 'Layer A');
    expect(moved).toBe(true);

    const layerIdsAfter = polydraw
      .getFeatureGroups()
      .map((featureGroup) => layerManager.getLayerForFeatureGroup(featureGroup));
    expect(layerIdsAfter).toEqual(['Layer C', 'Layer A', 'Layer B']);

    const layerOrder = layerManager.getAllLayers().map((layer) => layer.id);
    expect(layerOrder).toEqual(['default', 'Layer C', 'Layer A', 'Layer B']);

    expect(polydraw.reorderLayer('Layer A', 'default')).toBe(false);
  });

  it('takes the target slot when dragging downward in layer order', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Layer A' });
    await polydraw.addPredefinedPolygon(fixtures.octagon(), { layer: 'Layer B' });
    await polydraw.addPredefinedPolygon(fixtures.squareWithHole(), { layer: 'Layer C' });

    const moved = polydraw.reorderLayer('Layer A', 'Layer C');
    expect(moved).toBe(true);

    const layerOrder = polydraw
      .getLayerManager()
      .getAllLayers()
      .map((layer) => layer.id);
    expect(layerOrder).toEqual(['default', 'Layer B', 'Layer C', 'Layer A']);
  });

  it('keeps feature-group order aligned after undo/redo restore', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Layer A' });
    await polydraw.addPredefinedPolygon(fixtures.octagon(), { layer: 'Layer B' });
    await polydraw.addPredefinedPolygon(fixtures.squareWithHole(), { layer: 'Layer C' });

    const layerManager = polydraw.getLayerManager();
    const getFeatureLayerIds = () =>
      polydraw
        .getFeatureGroups()
        .map((featureGroup) => layerManager.getLayerForFeatureGroup(featureGroup));

    expect(polydraw.reorderLayer('Layer C', 'Layer A')).toBe(true);
    expect(getFeatureLayerIds()).toEqual(['Layer C', 'Layer A', 'Layer B']);

    await polydraw.undo();
    expect(getFeatureLayerIds()).toEqual(['Layer A', 'Layer B', 'Layer C']);

    await polydraw.redo();
    expect(getFeatureLayerIds()).toEqual(['Layer C', 'Layer A', 'Layer B']);
  });
});
