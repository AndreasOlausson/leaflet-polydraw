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

  it('keeps markers non-draggable in inactive layers', async () => {
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
    expect(markersB.every((marker) => marker.options.draggable === false)).toBe(true);

    layerManager.setActiveLayer('Layer B');
    expect(markersA.every((marker) => marker.options.draggable === false)).toBe(true);
    expect(markersB.every((marker) => marker.options.draggable === true)).toBe(true);
  });
});
