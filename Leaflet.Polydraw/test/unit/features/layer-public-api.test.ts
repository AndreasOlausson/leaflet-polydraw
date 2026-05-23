import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPolydrawHarness } from '../helpers/polydraw-harness';
import { MockFactory } from '../mocks/factory';

describe('Layer Public API', () => {
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

  const getLayerOrder = () => polydraw.getAllLayers().map((layer) => layer.id);
  const getFeatureLayerIds = () =>
    polydraw
      .getFeatureGroups()
      .map((featureGroup) => polydraw.getLayerForFeatureGroup(featureGroup));

  it('creates and queries layers through high-level API methods', () => {
    const created = polydraw.createLayer({
      id: 'Hazard A',
      label: 'Hazard Zone A',
      color: '#ff0000',
      interaction: 'readonly',
      panel: 'visible',
      metadata: { source: 'qa' },
    });

    expect(created.id).toBe('Hazard A');
    expect(polydraw.hasLayer('Hazard A')).toBe(true);
    expect(polydraw.getLayerById('Hazard A')?.label).toBe('Hazard Zone A');
    expect(polydraw.getLayerById('Hazard A')?.interaction).toBe('readonly');
    expect(polydraw.getAllLayers().some((layer) => layer.id === 'Hazard A')).toBe(true);
  });

  it('updates layer policy and metadata through updateLayer + patchLayerMetadata', () => {
    polydraw.createLayer({
      id: 'Risk',
      panel: 'visible',
      interaction: 'editable',
      metadata: { a: 1, b: 2 },
    });

    const updated = polydraw.updateLayer('Risk', {
      label: 'Risk Layer',
      interaction: 'static',
      visibility: false,
    });

    expect(updated).toBeDefined();
    expect(updated?.label).toBe('Risk Layer');
    expect(updated?.interaction).toBe('static');
    expect(updated?.visible).toBe(false);
    expect(updated?.panel).toBe('hidden');

    const patched = polydraw.patchLayerMetadata('Risk', { b: 3, c: 4 });
    expect(patched).toBe(true);
    expect(polydraw.getLayerById('Risk')?.metadata).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('deletes layers and reports result details', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Delete Me' });

    const result = polydraw.deleteLayer('Delete Me');
    expect(result.success).toBe(true);
    expect(result.removedFeatureGroups).toBeGreaterThanOrEqual(1);
    expect(polydraw.hasLayer('Delete Me')).toBe(false);

    const defaultDelete = polydraw.deleteLayer('default');
    expect(defaultDelete.success).toBe(false);
    expect(defaultDelete.reason).toBe('default-layer');
  });

  it('clears non-default layers and removes their feature groups', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle());
    await polydraw.addPredefinedPolygon(fixtures.octagon(), { layer: 'Layer A' });
    await polydraw.addPredefinedPolygon(fixtures.squareWithHole(), { layer: 'Layer B' });

    expect(polydraw.getFeatureGroups()).toHaveLength(3);

    polydraw.clearLayers();

    expect(getLayerOrder()).toEqual(['default']);
    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    expect(polydraw.getFeatureGroupsByLayer('default')).toHaveLength(1);
    expect(getFeatureLayerIds()).toEqual(['default']);
  });

  it('returns false when patching metadata for missing layer', () => {
    expect(polydraw.patchLayerMetadata('missing', { x: 1 })).toBe(false);
  });

  it('moves layers by index and skips history for no-op or invalid requests', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Layer A' });
    await polydraw.addPredefinedPolygon(fixtures.octagon(), { layer: 'Layer B' });
    await polydraw.addPredefinedPolygon(fixtures.squareWithHole(), { layer: 'Layer C' });

    const internal = polydraw as unknown as {
      historyManager: {
        saveState: (...args: unknown[]) => void;
      };
    };
    const saveStateSpy = vi.spyOn(internal.historyManager, 'saveState');
    saveStateSpy.mockClear();

    expect(polydraw.moveLayerToIndex('Layer A', 1)).toBe(false);
    expect(polydraw.moveLayerToIndex('missing', 1)).toBe(false);
    expect(polydraw.moveLayerToIndex('Layer B', Number.NaN)).toBe(false);
    expect(saveStateSpy).not.toHaveBeenCalled();

    expect(polydraw.moveLayerToIndex('Layer C', 1)).toBe(true);
    expect(saveStateSpy).toHaveBeenCalledTimes(1);
    expect(getLayerOrder()).toEqual(['default', 'Layer C', 'Layer A', 'Layer B']);
    expect(getFeatureLayerIds()).toEqual(['Layer C', 'Layer A', 'Layer B']);

    await polydraw.undo();
    expect(getLayerOrder()).toEqual(['default', 'Layer A', 'Layer B', 'Layer C']);
    expect(getFeatureLayerIds()).toEqual(['Layer A', 'Layer B', 'Layer C']);
  });

  it('sets full layer order and skips history for unchanged or invalid orders', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Layer A' });
    await polydraw.addPredefinedPolygon(fixtures.octagon(), { layer: 'Layer B' });
    await polydraw.addPredefinedPolygon(fixtures.squareWithHole(), { layer: 'Layer C' });

    const internal = polydraw as unknown as {
      historyManager: {
        saveState: (...args: unknown[]) => void;
      };
    };
    const saveStateSpy = vi.spyOn(internal.historyManager, 'saveState');
    saveStateSpy.mockClear();

    expect(polydraw.setLayerOrder(['Layer A', 'Layer B', 'Layer C'])).toBe(false);
    expect(polydraw.setLayerOrder(['Layer A', 'missing'])).toBe(false);
    expect(polydraw.setLayerOrder(['Layer A', 'Layer A'])).toBe(false);
    expect(saveStateSpy).not.toHaveBeenCalled();

    expect(polydraw.setLayerOrder(['Layer C', 'Layer A'])).toBe(true);
    expect(saveStateSpy).toHaveBeenCalledTimes(1);
    expect(getLayerOrder()).toEqual(['default', 'Layer C', 'Layer A', 'Layer B']);
    expect(getFeatureLayerIds()).toEqual(['Layer C', 'Layer A', 'Layer B']);

    await polydraw.undo();
    expect(getLayerOrder()).toEqual(['default', 'Layer A', 'Layer B', 'Layer C']);

    await polydraw.redo();
    expect(getLayerOrder()).toEqual(['default', 'Layer C', 'Layer A', 'Layer B']);
  });

  it('assigns feature groups to layers with undo/redo support', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Layer A' });
    await polydraw.addPredefinedPolygon(fixtures.octagon(), { layer: 'Layer B' });

    const internal = polydraw as unknown as {
      historyManager: {
        saveState: (...args: unknown[]) => void;
      };
    };
    const saveStateSpy = vi.spyOn(internal.historyManager, 'saveState');
    const layerBFeatureGroup = polydraw.getFeatureGroups()[1];
    saveStateSpy.mockClear();

    expect(polydraw.assignFeatureGroupToLayer(layerBFeatureGroup, 'Layer B')).toBe(false);
    expect(saveStateSpy).not.toHaveBeenCalled();

    expect(polydraw.assignFeatureGroupToLayer(layerBFeatureGroup, 'Layer A')).toBe(true);
    expect(saveStateSpy).toHaveBeenCalledTimes(1);
    expect(getFeatureLayerIds()).toEqual(['Layer A', 'Layer A']);

    await polydraw.undo();
    expect(getFeatureLayerIds()).toEqual(['Layer A', 'Layer B']);

    await polydraw.redo();
    expect(getFeatureLayerIds()).toEqual(['Layer A', 'Layer A']);
  });

  it('removes layer assignments cleanly and preserves unassigned state through redo', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Layer A' });

    const internal = polydraw as unknown as {
      historyManager: {
        saveState: (...args: unknown[]) => void;
      };
    };
    const saveStateSpy = vi.spyOn(internal.historyManager, 'saveState');
    const featureGroup = polydraw.getFeatureGroups()[0] as {
      _polydrawMetadata?: { layerId?: string };
    };
    saveStateSpy.mockClear();

    polydraw.removeFeatureGroupFromLayer(featureGroup as never);

    expect(saveStateSpy).toHaveBeenCalledTimes(1);
    expect(polydraw.getLayerForFeatureGroup(featureGroup as never)).toBeUndefined();
    expect(featureGroup._polydrawMetadata?.layerId).toBeUndefined();

    await polydraw.undo();
    expect(polydraw.getLayerForFeatureGroup(polydraw.getFeatureGroups()[0])).toBe('Layer A');

    await polydraw.redo();
    expect(polydraw.getLayerForFeatureGroup(polydraw.getFeatureGroups()[0])).toBeUndefined();
  });
});
