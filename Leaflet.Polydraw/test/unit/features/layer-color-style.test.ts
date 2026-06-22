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

  it('uses source polygon color overrides when merging by default', async () => {
    const [first, second] = fixtures.overlappingSquares();

    await polydraw.addPredefinedPolygon([first], {
      overrides: { style: { color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.3 } },
    });
    await polydraw.addPredefinedPolygon([second], {
      overrides: { style: { color: '#0000ff', fillColor: '#0000ff', fillOpacity: 0.7 } },
    });

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    const featureGroup = polydraw.getFeatureGroups()[0];
    const polygonLayer = featureGroup
      .getLayers()
      .find((layer) => layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) as L.Polygon;

    expect((polygonLayer.options.color as string).toLowerCase()).toBe('#0000ff');
    expect((polygonLayer.options.fillColor as string).toLowerCase()).toBe('#0000ff');
    expect(polygonLayer.options.fillOpacity).toBe(0.7);
  });

  it('does not carry target color overrides into an unstyled source merge by default', async () => {
    const [first, second] = fixtures.overlappingSquares();

    await polydraw.addPredefinedPolygon([first], {
      overrides: { style: { color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.3 } },
    });
    await polydraw.addPredefinedPolygon([second]);

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    const featureGroup = polydraw.getFeatureGroups()[0] as L.FeatureGroup & {
      _polydrawMetadata?: { styleOverrides?: unknown };
    };
    const polygonLayer = featureGroup
      .getLayers()
      .find((layer) => layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) as L.Polygon;

    expect((polygonLayer.options.color as string).toLowerCase()).toBe(
      defaultConfig.styles.polygon.color.toLowerCase(),
    );
    expect((polygonLayer.options.fillColor as string).toLowerCase()).toBe(
      defaultConfig.styles.polygon.fillColor.toLowerCase(),
    );
    expect(featureGroup._polydrawMetadata?.styleOverrides).toBeUndefined();
  });

  it('can keep target polygon color overrides when configured for target merge strategy', async () => {
    cleanup();
    const harness = createPolydrawHarness({
      polygonTools: {
        ...defaultConfig.polygonTools,
        color: {
          ...defaultConfig.polygonTools.color,
          mergeStrategy: 'target',
        },
      },
    });
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;

    const [first, second] = fixtures.overlappingSquares();
    await polydraw.addPredefinedPolygon([first], {
      overrides: { style: { color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.3 } },
    });
    await polydraw.addPredefinedPolygon([second], {
      overrides: { style: { color: '#0000ff', fillColor: '#0000ff', fillOpacity: 0.7 } },
    });

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    const featureGroup = polydraw.getFeatureGroups()[0];
    const polygonLayer = featureGroup
      .getLayers()
      .find((layer) => layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) as L.Polygon;

    expect((polygonLayer.options.color as string).toLowerCase()).toBe('#ff0000');
    expect((polygonLayer.options.fillColor as string).toLowerCase()).toBe('#ff0000');
    expect(polygonLayer.options.fillOpacity).toBe(0.3);
  });

  it('can blend polygon color overrides when configured for blend merge strategy', async () => {
    cleanup();
    const harness = createPolydrawHarness({
      polygonTools: {
        ...defaultConfig.polygonTools,
        color: {
          ...defaultConfig.polygonTools.color,
          mergeStrategy: 'blend',
        },
      },
    });
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;

    const [first, second] = fixtures.overlappingSquares();
    await polydraw.addPredefinedPolygon([first], {
      overrides: { style: { color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.3 } },
    });
    await polydraw.addPredefinedPolygon([second], {
      overrides: { style: { color: '#0000ff', fillColor: '#0000ff', fillOpacity: 0.7 } },
    });

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    const featureGroup = polydraw.getFeatureGroups()[0];
    const polygonLayer = featureGroup
      .getLayers()
      .find((layer) => layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) as L.Polygon;

    expect((polygonLayer.options.color as string).toLowerCase()).toBe('#800080');
    expect((polygonLayer.options.fillColor as string).toLowerCase()).toBe('#800080');
    expect(polygonLayer.options.fillOpacity).toBe(0.5);
  });
});
