import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as L from 'leaflet';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Layer Marker Readonly', () => {
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

  it('keeps markers draggable in editable layers regardless of active draw target', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Layer A' });
    await polydraw.addPredefinedPolygon(fixtures.octagon(), { layer: 'Layer B' });

    const layerManager = polydraw.getLayerManager();
    const groups = polydraw.getFeatureGroups();

    const layerAGroup = groups.find((fg) => layerManager.getLayerForFeatureGroup(fg) === 'Layer A');
    const layerBGroup = groups.find((fg) => layerManager.getLayerForFeatureGroup(fg) === 'Layer B');

    expect(layerAGroup).toBeDefined();
    expect(layerBGroup).toBeDefined();

    const getMarkers = (featureGroup: L.FeatureGroup): L.Marker[] =>
      featureGroup.getLayers().filter((layer) => layer instanceof L.Marker) as L.Marker[];

    const markersA = getMarkers(layerAGroup!);
    const markersB = getMarkers(layerBGroup!);

    expect(markersA.length).toBeGreaterThan(0);
    expect(markersB.length).toBeGreaterThan(0);

    layerManager.setActiveLayer('Layer A');
    expect(markersA.every((marker) => marker.options.draggable === true)).toBe(true);
    expect(markersB.every((marker) => marker.options.draggable === true)).toBe(true);

    layerManager.setActiveLayer('Layer B');
    expect(markersA.every((marker) => marker.options.draggable === true)).toBe(true);
    expect(markersB.every((marker) => marker.options.draggable === true)).toBe(true);
  });

  it('allows editable reference layers but keeps readonly reference layers non-draggable', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), {
      layer: { id: 'Editable Reference', role: 'reference', interaction: 'editable' },
    });
    await polydraw.addPredefinedPolygon(fixtures.octagon(), {
      layer: { id: 'Readonly Reference', role: 'reference' },
    });

    const layerManager = polydraw.getLayerManager();
    expect(layerManager.setActiveLayer('Editable Reference')).toBe(false);
    expect(layerManager.getActiveLayerId()).toBe('default');

    const groups = polydraw.getFeatureGroups();
    const editableReferenceGroup = groups.find(
      (fg) => layerManager.getLayerForFeatureGroup(fg) === 'Editable Reference',
    );
    const readonlyReferenceGroup = groups.find(
      (fg) => layerManager.getLayerForFeatureGroup(fg) === 'Readonly Reference',
    );

    expect(editableReferenceGroup).toBeDefined();
    expect(readonlyReferenceGroup).toBeDefined();

    const getMarkers = (featureGroup: L.FeatureGroup): L.Marker[] =>
      featureGroup.getLayers().filter((layer) => layer instanceof L.Marker) as L.Marker[];

    expect(
      getMarkers(editableReferenceGroup!).every((marker) => marker.options.draggable === true),
    ).toBe(true);
    expect(getMarkers(readonlyReferenceGroup!)).toHaveLength(0);
  });

  it('does not create editable markers for readonly reference layers after undo and redo', async () => {
    polydraw.beginBatch();
    await polydraw.addPredefinedPolygon(fixtures.triangle(), {
      layer: { id: 'Reference A', role: 'reference', interaction: 'readonly' },
    });
    await polydraw.addPredefinedPolygon(fixtures.octagon(), {
      layer: { id: 'Reference B', role: 'reference', interaction: 'readonly' },
    });
    polydraw.endBatch();

    await polydraw.undo();
    expect(polydraw.getFeatureGroups()).toHaveLength(0);

    await polydraw.redo();

    const layerManager = polydraw.getLayerManager();
    const restoredGroups = polydraw.getFeatureGroups();
    expect(restoredGroups).toHaveLength(2);
    expect(layerManager.getLayer('Reference A')?.interaction).toBe('readonly');
    expect(layerManager.getLayer('Reference B')?.interaction).toBe('readonly');
    restoredGroups.forEach((featureGroup) => {
      expect(featureGroup.getLayers().filter((layer) => layer instanceof L.Marker)).toHaveLength(0);
    });
  });
});
