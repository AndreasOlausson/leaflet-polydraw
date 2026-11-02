import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as L from 'leaflet';
import { defaultConfig } from '../../../src/config';
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

  it('merges an entire draw layer into another as one undoable action', async () => {
    const [targetPolygon, sourcePolygon] = fixtures.overlappingSquares();
    await polydraw.addPredefinedPolygon([targetPolygon], { layer: 'Target' });
    await polydraw.addPredefinedPolygon([sourcePolygon], { layer: 'Source' });
    polydraw.setActiveLayer('Source');

    const internal = polydraw as unknown as {
      historyManager: {
        saveSnapshot: (...args: unknown[]) => void;
      };
    };
    const saveSnapshotSpy = vi.spyOn(internal.historyManager, 'saveSnapshot');
    saveSnapshotSpy.mockClear();

    await expect(polydraw.mergeLayerInto('Source', 'Target')).resolves.toBe(true);
    expect(saveSnapshotSpy).toHaveBeenCalledTimes(1);
    expect(polydraw.hasLayer('Source')).toBe(false);
    expect(polydraw.getFeatureGroupsByLayer('Target')).toHaveLength(1);
    expect(polydraw.getActiveLayerId()).toBe('Target');

    await polydraw.undo();
    expect(polydraw.getFeatureGroupsByLayer('Source')).toHaveLength(1);
    expect(polydraw.getFeatureGroupsByLayer('Target')).toHaveLength(1);
    expect(polydraw.getActiveLayerId()).toBe('Source');

    await polydraw.redo();
    expect(polydraw.hasLayer('Source')).toBe(false);
    expect(polydraw.getFeatureGroupsByLayer('Target')).toHaveLength(1);
  });

  it('moves every polygon without unioning when whole-layer merge is disabled', async () => {
    const harness = createPolydrawHarness({ mergePolygons: false });
    try {
      const isolatedPolydraw = harness.polydraw;
      const [first, second] = fixtures.overlappingSquares();
      await isolatedPolydraw.addPredefinedPolygon([first], { layer: 'Target' });
      await isolatedPolydraw.addPredefinedPolygon([second], { layer: 'Source' });
      await isolatedPolydraw.addPredefinedPolygon(fixtures.triangle(), {
        layer: 'Source',
        overrides: { merge: 'block' },
      });

      await expect(isolatedPolydraw.mergeLayerInto('Source', 'Target')).resolves.toBe(true);
      expect(isolatedPolydraw.hasLayer('Source')).toBe(false);
      expect(isolatedPolydraw.getFeatureGroupsByLayer('Target')).toHaveLength(3);
    } finally {
      harness.cleanup();
    }
  });

  it('merges a reference source into a draw layer only when explicitly enabled', async () => {
    const harness = createPolydrawHarness({
      layerPanel: {
        enabled: true,
        initialState: 'expanded',
        merge: { allowReferenceSources: true },
      },
    });
    try {
      const isolatedPolydraw = harness.polydraw;
      const [targetPolygon, referencePolygon] = fixtures.overlappingSquares();
      await isolatedPolydraw.addPredefinedPolygon([targetPolygon], { layer: 'Target' });
      await isolatedPolydraw.addPredefinedPolygon([referencePolygon], {
        layer: {
          id: 'Reference',
          role: 'reference',
          interaction: 'readonly',
          color: '#ef4444',
        },
        overrides: {
          style: { color: '#991b1b', fillColor: '#ef4444', fillOpacity: 0.2 },
        },
      });

      await expect(isolatedPolydraw.mergeLayerInto('Reference', 'Target')).resolves.toBe(true);
      expect(isolatedPolydraw.hasLayer('Reference')).toBe(false);
      expect(isolatedPolydraw.getFeatureGroupsByLayer('Target')).toHaveLength(1);
      expect(
        (
          isolatedPolydraw.getFeatureGroupsByLayer('Target')[0] as L.FeatureGroup & {
            _polydrawMetadata?: { styleOverrides?: { fillColor?: string } };
          }
        )._polydrawMetadata?.styleOverrides?.fillColor,
      ).toBe('#ef4444');

      await isolatedPolydraw.undo();
      expect(isolatedPolydraw.getLayerById('Reference')?.role).toBe('reference');
      expect(isolatedPolydraw.getLayerById('Reference')?.interaction).toBe('readonly');
      expect(isolatedPolydraw.getFeatureGroupsByLayer('Reference')).toHaveLength(1);
      expect(isolatedPolydraw.getFeatureGroupsByLayer('Target')).toHaveLength(1);

      await isolatedPolydraw.redo();
      expect(isolatedPolydraw.hasLayer('Reference')).toBe(false);
      expect(isolatedPolydraw.getFeatureGroupsByLayer('Target')).toHaveLength(1);
    } finally {
      harness.cleanup();
    }
  });

  it('can replace moved polygon overrides with the target layer style', async () => {
    const harness = createPolydrawHarness({ mergePolygons: false });
    try {
      const isolatedPolydraw = harness.polydraw;
      isolatedPolydraw.createDrawLayer({ id: 'Target', color: '#3366cc' });
      await isolatedPolydraw.addPredefinedPolygon(fixtures.triangle(), {
        layer: { id: 'Source', role: 'draw', color: '#ef4444' },
        overrides: {
          style: {
            color: '#991b1b',
            fillColor: '#ef4444',
            fillOpacity: 0.15,
            opacity: 0.4,
            weight: 6,
          },
        },
      });

      await expect(
        isolatedPolydraw.mergeLayerInto('Source', 'Target', { useTargetStyle: true }),
      ).resolves.toBe(true);

      const featureGroup = isolatedPolydraw.getFeatureGroupsByLayer(
        'Target',
      )[0] as L.FeatureGroup & {
        _polydrawMetadata?: { styleOverrides?: unknown };
      };
      const polygon = featureGroup
        .getLayers()
        .find(
          (layer) => layer instanceof L.Polygon && !(layer instanceof L.Rectangle),
        ) as L.Polygon;

      expect(featureGroup._polydrawMetadata?.styleOverrides).toBeUndefined();
      expect((polygon.options.fillColor as string).toLowerCase()).toBe('#3366cc');
      expect(polygon.options.fillOpacity).toBe(defaultConfig.styles.polygon.fillOpacity);
      expect(polygon.options.opacity).toBe(defaultConfig.styles.polygon.opacity);
      expect(polygon.options.weight).toBe(defaultConfig.styles.polygon.weight);
    } finally {
      harness.cleanup();
    }
  });

  it('rebuilds every readonly MultiPolygon part when merging into an empty editable layer', async () => {
    const harness = createPolydrawHarness({
      layerPanel: {
        enabled: true,
        initialState: 'expanded',
        merge: { allowReferenceSources: true },
      },
    });
    try {
      const isolatedPolydraw = harness.polydraw;
      const geoJsonFixtures = MockFactory.createGeoJSONFixtures();
      await isolatedPolydraw.addPredefinedGeoJSONs([geoJsonFixtures.multipolygon()], {
        layer: {
          id: 'Flood reference',
          role: 'reference',
          interaction: 'readonly',
          color: '#581c87',
        },
        overrides: {
          style: { color: '#581c87', fillColor: '#c084fc', fillOpacity: 0.38 },
        },
      });

      const referenceGroups = isolatedPolydraw.getFeatureGroupsByLayer('Flood reference');
      expect(referenceGroups).toHaveLength(2);
      referenceGroups.forEach((featureGroup) => {
        expect(featureGroup.getLayers().filter((layer) => layer instanceof L.Marker)).toHaveLength(
          0,
        );
      });

      await expect(
        isolatedPolydraw.mergeLayerInto('Flood reference', 'default', {
          useTargetStyle: true,
        }),
      ).resolves.toBe(true);

      const movedGroups = isolatedPolydraw.getFeatureGroupsByLayer('default');
      expect(movedGroups).toHaveLength(2);
      movedGroups.forEach((featureGroup) => {
        const polygon = featureGroup
          .getLayers()
          .find(
            (layer) => layer instanceof L.Polygon && !(layer instanceof L.Rectangle),
          ) as L.Polygon & { _polydrawDragData?: { originalOpacity?: number } };
        const markers = featureGroup
          .getLayers()
          .filter((layer) => layer instanceof L.Marker) as L.Marker[];
        expect((polygon.options.color as string).toLowerCase()).toBe(
          defaultConfig.styles.polygon.color.toLowerCase(),
        );
        expect((polygon.options.fillColor as string).toLowerCase()).toBe(
          defaultConfig.styles.polygon.fillColor.toLowerCase(),
        );
        expect(polygon._polydrawDragData?.originalOpacity).toBe(
          defaultConfig.styles.polygon.fillOpacity,
        );
        expect(markers.length).toBeGreaterThan(0);
        expect(markers.every((marker) => marker.options.draggable === true)).toBe(true);
      });
    } finally {
      harness.cleanup();
    }
  });

  it('rejects invalid whole-layer merge requests without saving history', async () => {
    polydraw.createDrawLayer({ id: 'Target' });
    polydraw.createLayer({ id: 'Reference', role: 'reference' });
    const internal = polydraw as unknown as {
      historyManager: {
        saveState: (...args: unknown[]) => void;
      };
    };
    const saveStateSpy = vi.spyOn(internal.historyManager, 'saveState');
    saveStateSpy.mockClear();

    await expect(polydraw.mergeLayerInto('missing', 'Target')).resolves.toBe(false);
    await expect(polydraw.mergeLayerInto('Target', 'Target')).resolves.toBe(false);
    await expect(polydraw.mergeLayerInto('Reference', 'Target')).resolves.toBe(false);
    await expect(polydraw.mergeLayerInto('Target', 'Reference')).resolves.toBe(false);
    await expect(polydraw.mergeLayerInto('Target', 'default')).resolves.toBe(false);
    expect(saveStateSpy).not.toHaveBeenCalled();
  });

  it('restores every layer and history stack when a whole-layer merge fails partway', async () => {
    const harness = createPolydrawHarness({ mergePolygons: false });
    try {
      const isolatedPolydraw = harness.polydraw;
      isolatedPolydraw.createDrawLayer({ id: 'Target' });
      await isolatedPolydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Source' });
      await isolatedPolydraw.addPredefinedPolygon(fixtures.octagon(), {
        layer: 'Source',
        overrides: { merge: 'block' },
      });

      const internal = isolatedPolydraw as unknown as {
        moveFeatureGroupToDrawLayer: (
          featureGroup: L.FeatureGroup,
          targetLayerId: string,
          options?: unknown,
        ) => Promise<boolean>;
        historyManager: {
          undoStack: unknown[];
          redoStack: unknown[];
        };
      };
      const originalMove = internal.moveFeatureGroupToDrawLayer.bind(isolatedPolydraw);
      const moveSpy = vi.spyOn(internal, 'moveFeatureGroupToDrawLayer');
      moveSpy.mockImplementationOnce(originalMove).mockResolvedValueOnce(false);
      const undoCountBefore = internal.historyManager.undoStack.length;
      const redoCountBefore = internal.historyManager.redoStack.length;

      await expect(isolatedPolydraw.mergeLayerInto('Source', 'Target')).resolves.toBe(false);

      expect(moveSpy).toHaveBeenCalledTimes(2);
      expect(isolatedPolydraw.getFeatureGroupsByLayer('Source')).toHaveLength(2);
      expect(isolatedPolydraw.getFeatureGroupsByLayer('Target')).toHaveLength(0);
      expect(isolatedPolydraw.hasLayer('Source')).toBe(true);
      expect(internal.historyManager.undoStack).toHaveLength(undoCountBefore);
      expect(internal.historyManager.redoStack).toHaveLength(redoCountBefore);
    } finally {
      harness.cleanup();
    }
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
