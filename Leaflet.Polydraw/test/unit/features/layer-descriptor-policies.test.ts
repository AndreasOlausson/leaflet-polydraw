import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as L from 'leaflet';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Layer Descriptor Policies', () => {
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

  it('applies static descriptors with hidden panel and no edit markers', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), {
      layer: {
        id: 'Hazard',
        interaction: 'static',
      },
    });

    const layerManager = polydraw.getLayerManager();
    const hazardLayer = layerManager.getLayer('Hazard');
    expect(hazardLayer).toBeDefined();
    expect(hazardLayer?.interaction).toBe('static');
    expect(hazardLayer?.panel).toBe('hidden');

    const hazardGroup = polydraw
      .getFeatureGroups()
      .find((featureGroup) => layerManager.getLayerForFeatureGroup(featureGroup) === 'Hazard');
    expect(hazardGroup).toBeDefined();

    const markers = hazardGroup!
      .getLayers()
      .filter((layer) => layer instanceof L.Marker) as L.Marker[];
    expect(markers).toHaveLength(0);

    const panelElement = document.querySelector('[data-polydraw="layer-panel"]');
    expect(panelElement).toBeNull();
  });

  it('keeps readonly layer polygons non-editable and keeps layer visible in panel', async () => {
    await polydraw.addPredefinedPolygon(fixtures.octagon(), {
      layer: {
        id: 'Readonly Layer',
        interaction: 'readonly',
        panel: 'visible',
      },
    });

    const layerManager = polydraw.getLayerManager();
    const readonlyLayer = layerManager.getLayer('Readonly Layer');
    expect(readonlyLayer?.interaction).toBe('readonly');
    expect(readonlyLayer?.panel).toBe('visible');

    const panelElement = document.querySelector('[data-polydraw="layer-panel"]');
    expect(panelElement).toBeTruthy();
    expect(panelElement?.querySelector('[data-layer-id="Readonly Layer"]')).toBeTruthy();

    const readonlyGroup = polydraw
      .getFeatureGroups()
      .find((featureGroup) => layerManager.getLayerForFeatureGroup(featureGroup) === 'Readonly Layer');
    expect(readonlyGroup).toBeDefined();

    const polygon = readonlyGroup!
      .getLayers()
      .find((layer) => layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) as
      | (L.Polygon & { _polydrawDragData?: unknown })
      | undefined;
    expect(polygon).toBeDefined();
    expect(polygon?._polydrawDragData).toBeUndefined();

    const markers = readonlyGroup!
      .getLayers()
      .filter((layer) => layer instanceof L.Marker) as L.Marker[];
    expect(markers).toHaveLength(0);
  });

  it('accepts mixed group descriptors (string + object)', async () => {
    await polydraw.addPredefinedPolygonGroups([
      {
        layer: 'Layer A',
        polygons: [fixtures.triangle()],
      },
      {
        layer: {
          id: 'Layer B',
          color: '#ff0000',
          interaction: 'static',
        },
        polygons: [fixtures.octagon()],
      },
    ]);

    const layerManager = polydraw.getLayerManager();
    expect(layerManager.getLayer('Layer A')).toBeDefined();
    expect(layerManager.getLayer('Layer B')?.interaction).toBe('static');
    expect(layerManager.getLayer('Layer B')?.panel).toBe('hidden');
  });
});
