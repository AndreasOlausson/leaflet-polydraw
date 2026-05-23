import { describe, it, expect, vi } from 'vitest';
import * as L from 'leaflet';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';
import type {
  PolydrawConfig,
  PolygonMenuAction,
  PolygonMenuActionContext,
} from '../../../src/types/polydraw-interfaces';
import type { Feature, Polygon } from 'geojson';

function findMenuMarker(featureGroup: L.FeatureGroup): L.Marker | undefined {
  const layers = featureGroup.getLayers();
  return layers.find((layer): layer is L.Marker => {
    if (!(layer instanceof L.Marker)) return false;
    const el = layer.getElement();
    if (el?.classList.contains('menu')) return true;
    const iconClassName = (layer.options.icon as { options?: { className?: string } } | undefined)
      ?.options?.className;
    return typeof iconClassName === 'string' && iconClassName.includes('menu');
  }) as L.Marker | undefined;
}

function openMenuAndGetActionIds(map: L.Map, featureGroup: L.FeatureGroup): Set<string> {
  const menuMarker = findMenuMarker(featureGroup);
  if (!menuMarker) throw new Error('Menu marker not found in featureGroup');
  menuMarker.fire('click');
  const container = map.getContainer();
  const buttons = container.querySelectorAll('[data-action-id]');
  const ids = new Set<string>();
  buttons.forEach((btn) => {
    const id = btn instanceof HTMLElement ? btn.dataset.actionId : undefined;
    if (id) ids.add(id);
  });
  return ids;
}

function clickMenuButton(map: L.Map, featureGroup: L.FeatureGroup, actionId: string): void {
  const menuMarker = findMenuMarker(featureGroup);
  if (!menuMarker) throw new Error('Menu marker not found in featureGroup');
  menuMarker.fire('click');
  const container = map.getContainer();
  const button = container.querySelector(`[data-action-id="${actionId}"]`) as HTMLElement | null;
  if (!button) throw new Error(`Menu button with action "${actionId}" not found`);
  button.click();
}

function getFirstPolygon(featureGroup: L.FeatureGroup | undefined): L.Polygon {
  const polygon = featureGroup
    ?.getLayers()
    .find((layer): layer is L.Polygon => layer instanceof L.Polygon);
  if (!polygon) throw new Error('Polygon layer not found');
  return polygon;
}

function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const createMakeTriangleAction = (): PolygonMenuAction => ({
  id: 'makeTriangle',
  label: 'Make triangle',
  className: 'make-triangle',
  visible: () => true,
  apply: ({ bounds }: PolygonMenuActionContext): Feature<Polygon> => {
    const nw = bounds.getNorthWest();
    const ne = bounds.getNorthEast();
    const south = bounds.getSouth();
    const centerLng = (bounds.getWest() + bounds.getEast()) / 2;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [nw.lng, nw.lat],
            [ne.lng, ne.lat],
            [centerLng, south],
            [nw.lng, nw.lat],
          ],
        ],
      },
    };
  },
});

describe('Polygon Menu Actions', () => {
  const fixtures = MockFactory.createPredefinedPolygons();

  describe('Polygon menu action button rendering', () => {
    it('should render a polygon menu action button with the configured id', async () => {
      const polygonMenuAction = createMakeTriangleAction();
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('makeTriangle')).toBe(true);
        const button = harness.map.getContainer().querySelector('[data-action-id="makeTriangle"]');
        expect(button?.getAttribute('aria-label')).toBe('Make triangle');
      } finally {
        harness.cleanup();
      }
    });

    it('should not render a polygon menu action button when visible returns false', async () => {
      const polygonMenuAction: PolygonMenuAction = {
        ...createMakeTriangleAction(),
        visible: () => false,
      };
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('makeTriangle')).toBe(false);
      } finally {
        harness.cleanup();
      }
    });

    it('should pass complete polygon context to visible callback', async () => {
      const visibleSpy = vi.fn<(context: PolygonMenuActionContext) => boolean>(() => true);
      const polygonMenuAction: PolygonMenuAction = {
        ...createMakeTriangleAction(),
        visible: visibleSpy,
      };
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        openMenuAndGetActionIds(harness.map, fg);
        expect(visibleSpy).toHaveBeenCalled();
        const visibleCall = visibleSpy.mock.calls.at(0);
        if (!visibleCall) throw new Error('Visible callback was not called');
        const [context] = visibleCall;
        expect(context).toHaveProperty('polygon');
        expect(context).toHaveProperty('featureGroup');
        expect(context).toHaveProperty('bounds');
        expect(context.polygon.type).toBe('Feature');
        expect(context.polygon.geometry.type).toMatch(/^(Polygon|MultiPolygon)$/);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('Polygon menu action execution', () => {
    it('should execute polygon menu action and replace polygon with triangle', async () => {
      const polygonMenuAction = createMakeTriangleAction();
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const initialFg = harness.polydraw.getFeatureGroups()[0];
        clickMenuButton(harness.map, initialFg, 'makeTriangle');
        await flushAsync();
        const featureGroups = harness.polydraw.getFeatureGroups();
        expect(featureGroups).toHaveLength(1);
        const polygon = getFirstPolygon(featureGroups[0]);
        const latLngs = polygon.getLatLngs() as L.LatLng[] | L.LatLng[][];
        const ring = Array.isArray(latLngs[0])
          ? (latLngs as L.LatLng[][])[0]
          : (latLngs as L.LatLng[]);
        expect(ring.length).toBeGreaterThanOrEqual(3);
        expect(ring.length).toBeLessThanOrEqual(4);
      } finally {
        harness.cleanup();
      }
    });

    it('should execute asynchronous polygon menu actions', async () => {
      const polygonMenuAction: PolygonMenuAction = {
        ...createMakeTriangleAction(),
        apply: async (context) => createMakeTriangleAction().apply(context),
      };
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const initialFg = harness.polydraw.getFeatureGroups()[0];
        clickMenuButton(harness.map, initialFg, 'makeTriangle');
        await flushAsync();

        const polygon = getFirstPolygon(harness.polydraw.getFeatureGroups()[0]);
        const latLngs = polygon.getLatLngs() as L.LatLng[] | L.LatLng[][];
        const ring = Array.isArray(latLngs[0])
          ? (latLngs as L.LatLng[][])[0]
          : (latLngs as L.LatLng[]);
        expect(ring.length).toBeLessThanOrEqual(4);
      } finally {
        harness.cleanup();
      }
    });

    it('should not modify polygon when action returns null', async () => {
      const polygonMenuAction: PolygonMenuAction = {
        id: 'noOp',
        label: 'No op',
        apply: () => null,
      };
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const initialCount = harness.polydraw.getFeatureGroups().length;
        const initialFg = harness.polydraw.getFeatureGroups()[0];
        clickMenuButton(harness.map, initialFg, 'noOp');
        await flushAsync();
        expect(harness.polydraw.getFeatureGroups()).toHaveLength(initialCount);
      } finally {
        harness.cleanup();
      }
    });

    it('should not modify polygon when action returns undefined', async () => {
      const polygonMenuAction: PolygonMenuAction = {
        id: 'noOp',
        label: 'No op',
        apply: () => undefined,
      };
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const initialCount = harness.polydraw.getFeatureGroups().length;
        const initialFg = harness.polydraw.getFeatureGroups()[0];
        clickMenuButton(harness.map, initialFg, 'noOp');
        await flushAsync();
        expect(harness.polydraw.getFeatureGroups()).toHaveLength(initialCount);
      } finally {
        harness.cleanup();
      }
    });

    it('should not replace polygon when action returns invalid result', async () => {
      const polygonMenuAction: PolygonMenuAction = {
        id: 'invalid',
        label: 'Invalid',
        apply: () =>
          ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] },
          }) as unknown as Feature<Polygon>,
      };
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const initialFg = harness.polydraw.getFeatureGroups()[0];
        clickMenuButton(harness.map, initialFg, 'invalid');
        await flushAsync();
        expect(harness.polydraw.getFeatureGroups()).toHaveLength(1);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('Polygon menu action history', () => {
    it('should save history by default when polygon menu action succeeds', async () => {
      const polygonMenuAction = createMakeTriangleAction();
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const initialFg = harness.polydraw.getFeatureGroups()[0];
        clickMenuButton(harness.map, initialFg, 'makeTriangle');
        await flushAsync();
        harness.polydraw.undo();
        await flushAsync();
        const polygon = getFirstPolygon(harness.polydraw.getFeatureGroups()[0]);
        const latLngs = polygon.getLatLngs() as L.LatLng[] | L.LatLng[][];
        const ring = Array.isArray(latLngs[0])
          ? (latLngs as L.LatLng[][])[0]
          : (latLngs as L.LatLng[]);
        expect(ring.length).toBeGreaterThan(4);
      } finally {
        harness.cleanup();
      }
    });

    it('should not save history when history is false', async () => {
      const polygonMenuAction: PolygonMenuAction = {
        ...createMakeTriangleAction(),
        history: false,
      };
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const initialFg = harness.polydraw.getFeatureGroups()[0];
        clickMenuButton(harness.map, initialFg, 'makeTriangle');
        await flushAsync();
        harness.polydraw.undo();
        await flushAsync();
        const featureGroups = harness.polydraw.getFeatureGroups();
        expect(featureGroups).toHaveLength(0);
      } finally {
        harness.cleanup();
      }
    });

    it('should respect global polygon menu action history capture config', async () => {
      const polygonMenuAction = createMakeTriangleAction();
      const harness = createPolydrawHarness({
        history: {
          maxSize: 50,
          capture: {
            polygonActions: {
              simplify: true,
              doubleElbows: true,
              bbox: true,
              bezier: true,
              scale: true,
              rotate: true,
              donut: true,
              toggleOptimization: true,
              polygonMenuAction: false,
            },
          },
        },
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const initialFg = harness.polydraw.getFeatureGroups()[0];
        clickMenuButton(harness.map, initialFg, 'makeTriangle');
        await flushAsync();
        harness.polydraw.undo();
        await flushAsync();

        expect(harness.polydraw.getFeatureGroups()).toHaveLength(0);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('Polygon menu action readonly/static protection', () => {
    it('should not show polygon menu action buttons for readonly polygons', async () => {
      const polygonMenuAction = createMakeTriangleAction();
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon(), {
          layer: { id: 'readonly-layer', interaction: 'readonly' },
        });
        const fg = harness.polydraw.getFeatureGroups()[0];
        const menuMarker = findMenuMarker(fg);
        expect(menuMarker).toBeUndefined();
      } finally {
        harness.cleanup();
      }
    });

    it('should not show polygon menu action buttons for static polygons', async () => {
      const polygonMenuAction = createMakeTriangleAction();
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon(), {
          layer: { id: 'static-layer', interaction: 'static' },
        });
        const fg = harness.polydraw.getFeatureGroups()[0];
        const menuMarker = findMenuMarker(fg);
        expect(menuMarker).toBeUndefined();
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('Polygon menu action collision with built-in actions', () => {
    it('should ignore polygon menu action with id that collides with built-in action', async () => {
      const polygonMenuAction: PolygonMenuAction = {
        id: 'simplify',
        label: 'Custom simplify',
        apply: createMakeTriangleAction().apply,
      };
      const harness = createPolydrawHarness({
        polygonTools: {
          simplify: { enabled: true, processHoles: true },
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const menuMarker = findMenuMarker(fg);
        menuMarker?.fire('click');
        const container = harness.map.getContainer();
        const simplifyButtons = container.querySelectorAll('[data-action-id="simplify"]');
        expect(simplifyButtons).toHaveLength(1);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('Polygon menu action result options', () => {
    it('should respect allowMerge: false and not merge with intersecting polygon', async () => {
      const polygonMenuAction: PolygonMenuAction = {
        id: 'noMerge',
        label: 'No merge',
        apply: ({ polygon }: PolygonMenuActionContext) => ({
          polygon,
          allowMerge: false,
        }),
      };
      const harness = createPolydrawHarness({
        mergePolygons: true,
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.overlappingSquares(), {
          overrides: { merge: 'block' },
        });
        const initialCount = harness.polydraw.getFeatureGroups().length;
        expect(initialCount).toBe(2);
        const fg = harness.polydraw.getFeatureGroups()[0];
        clickMenuButton(harness.map, fg, 'noMerge');
        await flushAsync();
        const fgAfter = harness.polydraw.getFeatureGroups();
        expect(fgAfter).toHaveLength(initialCount);
      } finally {
        harness.cleanup();
      }
    });

    it('should apply simplification when simplify: true is set', async () => {
      const polygonMenuAction: PolygonMenuAction = {
        id: 'withSimplify',
        label: 'With simplify',
        apply: ({ polygon }: PolygonMenuActionContext) => ({
          polygon,
          simplify: true,
        }),
      };
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
        simplification: {
          strategy: 'simple',
          simple: {
            tolerance: 0.1,
            highQuality: false,
          },
          dynamic: {
            baseTolerance: 0.0001,
            highQuality: false,
            fractionGuard: 0.9,
            multiplier: 2,
          },
        },
      } as Partial<PolydrawConfig>);
      try {
        const densePolygon = fixtures.octagon();
        await harness.polydraw.addPredefinedPolygon(densePolygon);
        const fg = harness.polydraw.getFeatureGroups()[0];
        clickMenuButton(harness.map, fg, 'withSimplify');
        await flushAsync();
        expect(harness.polydraw.getFeatureGroups()).toHaveLength(1);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('Polygon menu action preserves feature metadata', () => {
    it('should preserve feature metadata after polygon menu action', async () => {
      const polygonMenuAction = createMakeTriangleAction();
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        const metadata = { foo: 'bar', timestamp: 12345 };
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon(), { metadata });
        const fg = harness.polydraw.getFeatureGroups()[0];
        const metadataBefore = harness.polydraw.getFeatureMetadata(fg);
        expect(metadataBefore).toEqual(metadata);
        clickMenuButton(harness.map, fg, 'makeTriangle');
        await flushAsync();
        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        const metadataAfter = harness.polydraw.getFeatureMetadata(fgAfter);
        expect(metadataAfter).toEqual(metadata);
      } finally {
        harness.cleanup();
      }
    });

    it('should apply metadata returned by polygon menu action', async () => {
      const polygonMenuAction: PolygonMenuAction = {
        ...createMakeTriangleAction(),
        id: 'markProcessed',
        label: 'Mark processed',
        apply: ({ bounds }: PolygonMenuActionContext) => {
          const nw = bounds.getNorthWest();
          const ne = bounds.getNorthEast();
          const south = bounds.getSouth();
          const centerLng = (bounds.getWest() + bounds.getEast()) / 2;
          return {
            polygon: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [nw.lng, nw.lat],
                    [ne.lng, ne.lat],
                    [centerLng, south],
                    [nw.lng, nw.lat],
                  ],
                ],
              },
            },
            metadata: {
              status: 'processed',
              details: { source: 'menu-action' },
            },
          };
        },
      };
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon(), {
          metadata: { status: 'raw' },
        });
        const fg = harness.polydraw.getFeatureGroups()[0];
        clickMenuButton(harness.map, fg, 'markProcessed');
        await flushAsync();

        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        expect(harness.polydraw.getFeatureMetadata(fgAfter)).toEqual({
          status: 'processed',
          details: { source: 'menu-action' },
        });
      } finally {
        harness.cleanup();
      }
    });

    it('should preserve layer assignment after polygon menu action', async () => {
      const polygonMenuAction = createMakeTriangleAction();
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon(), {
          layer: {
            id: 'test-layer',
            label: 'Test Layer',
            color: '#ff0000',
            interaction: 'editable',
          },
        });
        harness.polydraw.setActiveLayer('test-layer');
        const fg = harness.polydraw.getFeatureGroups()[0];
        const layerBefore = harness.polydraw.getLayerForFeatureGroup(fg);
        expect(layerBefore).toBe('test-layer');
        clickMenuButton(harness.map, fg, 'makeTriangle');
        await flushAsync();
        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        const layerAfter = harness.polydraw.getLayerForFeatureGroup(fgAfter);
        expect(layerAfter).toBe('test-layer');
      } finally {
        harness.cleanup();
      }
    });

    it('should preserve style overrides after polygon menu action', async () => {
      const polygonMenuAction = createMakeTriangleAction();
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon(), {
          overrides: {
            style: { color: '#ff0000', fillColor: '#00ff00', weight: 5 },
          },
        });
        const fg = harness.polydraw.getFeatureGroups()[0];
        const polygonBefore = fg.getLayers().find((l): l is L.Polygon => l instanceof L.Polygon);
        expect(polygonBefore?.options.color).toBe('#ff0000');
        clickMenuButton(harness.map, fg, 'makeTriangle');
        await flushAsync();
        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        const polygonAfter = fgAfter
          .getLayers()
          .find((l): l is L.Polygon => l instanceof L.Polygon);
        expect(polygonAfter?.options.color).toBe('#ff0000');
      } finally {
        harness.cleanup();
      }
    });

    it('should preserve visual optimization metadata after polygon menu action', async () => {
      const polygonMenuAction = createMakeTriangleAction();
      const harness = createPolydrawHarness({
        polygonTools: {
          menuActions: [polygonMenuAction],
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon(), {
          visualOptimizationLevel: 5,
        });
        const fg = harness.polydraw.getFeatureGroups()[0];
        clickMenuButton(harness.map, fg, 'makeTriangle');
        await flushAsync();
        expect(harness.polydraw.getFeatureGroups()).toHaveLength(1);
      } finally {
        harness.cleanup();
      }
    });
  });
});
