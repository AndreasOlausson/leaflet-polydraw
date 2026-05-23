import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as L from 'leaflet';
import { defaultConfig } from '../../../src/config';
import { createPolydrawHarness } from '../helpers/polydraw-harness';
import { MockFactory } from '../mocks/factory';

describe('Layer Color Styling', () => {
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

  it('updates stroke color without forcing fillColor to layer color', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), {
      layer: 'Hazard',
      layerColor: '#ff0000',
    });

    const featureGroup = polydraw.getFeatureGroups()[0];
    const polygonLayer = featureGroup
      .getLayers()
      .find((layer) => layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) as L.Polygon;

    expect((polygonLayer.options.color as string).toLowerCase()).toBe('#ff0000');
    expect((polygonLayer.options.fillColor as string).toLowerCase()).toBe(
      defaultConfig.styles.polygon.fillColor.toLowerCase(),
    );

    polydraw.getLayerManager().setLayerColor('Hazard', '#00ff00');

    expect((polygonLayer.options.color as string).toLowerCase()).toBe('#00ff00');
    expect((polygonLayer.options.fillColor as string).toLowerCase()).toBe(
      defaultConfig.styles.polygon.fillColor.toLowerCase(),
    );
  });
});
