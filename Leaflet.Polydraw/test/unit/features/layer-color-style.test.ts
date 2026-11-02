import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as L from 'leaflet';
import { defaultConfig } from '../../../src/config';
import { createPolydrawHarness } from '../helpers/polydraw-harness';
import { MockFactory } from '../mocks/factory';

describe('Layer Color Styling', () => {
  let cleanup: () => void;
  let map: L.Map;
  let polydraw: ReturnType<typeof createPolydrawHarness>['polydraw'];
  let fixtures: ReturnType<typeof MockFactory.createPredefinedPolygons>;

  beforeEach(() => {
    fixtures = MockFactory.createPredefinedPolygons();
    const harness = createPolydrawHarness();
    map = harness.map;
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  const getVertexMarkerElement = (featureGroup: L.FeatureGroup): HTMLElement => {
    const marker = featureGroup.getLayers().find((layer) => {
      if (!(layer instanceof L.Marker)) return false;
      const className = ((layer.options.icon as L.DivIcon | undefined)?.options.className ?? '')
        .split(' ')
        .filter(Boolean);
      return !className.some((name) => ['menu', 'delete', 'info'].includes(name));
    }) as L.Marker | undefined;

    if (marker && !marker.getElement()) {
      marker.addTo(map);
    }
    if (marker && !marker.getElement()) {
      // Leaflet v1 + jsdom may register the marker without materializing its icon.
      const markerWithIcon = marker as L.Marker & { _icon?: HTMLElement };
      markerWithIcon._icon = marker.options.icon?.createIcon() as HTMLElement;
      marker.fire('add');
    }
    const element = marker?.getElement();
    if (!(element instanceof HTMLElement)) {
      throw new Error('Expected a rendered vertex marker');
    }
    return element;
  };

  it('uses layer color as a polygon theme for stroke and fill', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), {
      layer: 'Hazard',
      layerColor: '#ff0000',
    });

    const featureGroup = polydraw.getFeatureGroups()[0];
    const polygonLayer = featureGroup
      .getLayers()
      .find((layer) => layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) as L.Polygon;

    expect((polygonLayer.options.color as string).toLowerCase()).toBe('#8c0000');
    expect((polygonLayer.options.fillColor as string).toLowerCase()).toBe('#ff0000');

    polydraw.getLayerManager().setLayerColor('Hazard', '#00ff00');

    expect((polygonLayer.options.color as string).toLowerCase()).toBe('#008c00');
    expect((polygonLayer.options.fillColor as string).toLowerCase()).toBe('#00ff00');
  });

  it('uses a softened opaque layer color for vertex markers', async () => {
    polydraw.createDrawLayer({ id: 'Red Draw Layer', color: '#ef4444' });
    await polydraw.addPredefinedPolygon(fixtures.octagon());

    const markerElement = getVertexMarkerElement(
      polydraw.getFeatureGroupsByLayer('Red Draw Layer')[0],
    );

    expect(markerElement.style.backgroundColor).toBe('rgb(249, 190, 190)');
    expect(markerElement.style.boxShadow).toContain('#832525');
    expect(markerElement.style.opacity).toBe('');
  });

  it('restores each marker layer color after modifier feedback', async () => {
    polydraw.createDrawLayer({ id: 'Blue Draw Layer', color: '#3b82f6' });
    await polydraw.addPredefinedPolygon(fixtures.octagon());

    const markerElement = getVertexMarkerElement(
      polydraw.getFeatureGroupsByLayer('Blue Draw Layer')[0],
    );
    const expectedBackground = markerElement.style.backgroundColor;
    const expectedShadow = markerElement.style.boxShadow;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }));
    markerElement.dispatchEvent(new MouseEvent('mouseenter'));
    markerElement.dispatchEvent(new MouseEvent('mouseleave'));
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));

    expect(markerElement.style.backgroundColor).toBe(expectedBackground);
    expect(markerElement.style.boxShadow).toBe(expectedShadow);
  });

  it('keeps the layer marker color when unrelated keys are pressed while hovering', async () => {
    polydraw.createDrawLayer({ id: 'Indigo Draw Layer', color: '#4f46e5' });
    await polydraw.addPredefinedPolygon(fixtures.octagon());

    const featureGroup = polydraw.getFeatureGroupsByLayer('Indigo Draw Layer')[0];
    const marker = featureGroup.getLayers().find((layer) => {
      if (!(layer instanceof L.Marker)) return false;
      const className = (layer.options.icon as L.DivIcon | undefined)?.options.className ?? '';
      return className === 'polygon-marker';
    }) as L.Marker;
    const markerElement = getVertexMarkerElement(featureGroup);
    const expectedBackground = markerElement.style.backgroundColor;
    const expectedShadow = markerElement.style.boxShadow;

    marker.fire('mouseover');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true }));
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
    marker.fire('mouseout');

    expect(markerElement.style.backgroundColor).toBe(expectedBackground);
    expect(markerElement.style.boxShadow).toBe(expectedShadow);
  });

  it('keeps explicit polygon style overrides when layer color changes', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), {
      layer: 'Hazard',
      layerColor: '#ff0000',
      overrides: { style: { color: '#111111', fillColor: '#222222', fillOpacity: 0.6 } },
    });

    const featureGroup = polydraw.getFeatureGroups()[0];
    const polygonLayer = featureGroup
      .getLayers()
      .find((layer) => layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) as L.Polygon;

    polydraw.getLayerManager().setLayerColor('Hazard', '#00ff00');

    expect((polygonLayer.options.color as string).toLowerCase()).toBe('#111111');
    expect((polygonLayer.options.fillColor as string).toLowerCase()).toBe('#222222');
    expect(polygonLayer.options.fillOpacity).toBe(0.6);
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
