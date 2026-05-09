import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import * as L from 'leaflet';
import { createPolydrawHarness } from '../helpers/polydraw-harness';
import { MockFactory } from '../mocks/factory';
import type {
  PolydrawConfig,
  PolygonMenuAction,
  PolygonMenuActionContext,
} from '../../../src/types/polydraw-interfaces';
import type { Feature, MultiPolygon, Polygon } from 'geojson';

const BUILD_TYPES_PROCESS_TIMEOUT_MS = 25_000;
const BUILD_TYPES_TEST_TIMEOUT_MS = 30_000;

function findMenuMarker(featureGroup: L.FeatureGroup): L.Marker | undefined {
  return featureGroup.getLayers().find((layer): layer is L.Marker => {
    if (!(layer instanceof L.Marker)) return false;

    const element = layer.getElement();
    if (element?.classList.contains('menu')) return true;

    const iconClassName = (layer.options.icon as { options?: { className?: string } } | undefined)
      ?.options?.className;
    return typeof iconClassName === 'string' && iconClassName.includes('menu');
  }) as L.Marker | undefined;
}

function openMenu(map: L.Map, featureGroup: L.FeatureGroup): HTMLElement {
  const menuMarker = findMenuMarker(featureGroup);
  if (!menuMarker) throw new Error('Menu marker not found in featureGroup');

  menuMarker.fire('click');
  return map.getContainer();
}

function getActionButton(map: L.Map, featureGroup: L.FeatureGroup, actionId: string): HTMLElement {
  const container = openMenu(map, featureGroup);
  const button = container.querySelector(`[data-action-id="${actionId}"]`) as HTMLElement | null;
  if (!button) throw new Error(`Menu button with action "${actionId}" not found`);
  return button;
}

function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function makeTriangleFromBounds(bounds: L.LatLngBounds): Feature<Polygon> {
  const north = bounds.getNorth();
  const south = bounds.getSouth();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const southCenterLng = (west + east) / 2;

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [west, north],
          [east, north],
          [southCenterLng, south],
          [west, north],
        ],
      ],
    },
  };
}

function withPolygonMenuActions(menuActions: PolygonMenuAction[]): Partial<PolydrawConfig> {
  return {
    polygonTools: {
      menuActions,
    },
  } as unknown as Partial<PolydrawConfig>;
}

function getFirstPolygon(featureGroup: L.FeatureGroup): L.Polygon {
  const polygon = featureGroup
    .getLayers()
    .find((layer): layer is L.Polygon => layer instanceof L.Polygon);
  if (!polygon) throw new Error('Polygon layer not found');
  return polygon;
}

function expectGeometryHasHole(feature: Feature<Polygon | MultiPolygon>): void {
  if (feature.geometry.type === 'Polygon') {
    expect(feature.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
    return;
  }

  expect(feature.geometry.coordinates.some((polygon) => polygon.length >= 2)).toBe(true);
}

describe('Polygon menu action verifier', () => {
  const fixtures = MockFactory.createPredefinedPolygons();

  it(
    'exports polygon menu action types from the built package root declarations',
    () => {
      execFileSync('npm', ['run', 'build:types'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: BUILD_TYPES_PROCESS_TIMEOUT_MS,
      });

      const rootDeclaration = readFileSync(join(process.cwd(), 'dist/types/index.d.ts'), 'utf8');

      expect(rootDeclaration).toContain('PolygonMenuAction');
      expect(rootDeclaration).toContain('PolygonMenuActionContext');
      expect(rootDeclaration).toContain('PolygonMenuActionResult');
    },
    BUILD_TYPES_TEST_TIMEOUT_MS,
  );

  it('passes complete polygon geometry with holes to visible and apply callbacks', async () => {
    const visibleSpy = vi.fn<(context: PolygonMenuActionContext) => boolean>(() => true);
    const applySpy = vi.fn<(context: PolygonMenuActionContext) => Feature<Polygon | MultiPolygon>>(
      ({ polygon }) => polygon,
    );
    const polygonMenuAction: PolygonMenuAction = {
      id: 'preserveHole',
      label: 'Preserve hole',
      visible: visibleSpy,
      apply: applySpy,
    };
    const harness = createPolydrawHarness(withPolygonMenuActions([polygonMenuAction]));

    try {
      await harness.polydraw.addPredefinedPolygon(fixtures.squareWithHole(), {
        overrides: { merge: 'block' },
      });
      const featureGroup = harness.polydraw.getFeatureGroups()[0];

      const button = getActionButton(harness.map, featureGroup, 'preserveHole');
      expect(visibleSpy).toHaveBeenCalled();
      const visibleCall = visibleSpy.mock.calls.at(0);
      if (!visibleCall) throw new Error('Visible callback was not called');
      const [visibleContext] = visibleCall;
      expectGeometryHasHole(visibleContext.polygon);

      button.click();
      await flushAsync();

      expect(applySpy).toHaveBeenCalled();
      const applyCall = applySpy.mock.calls.at(0);
      if (!applyCall) throw new Error('Apply callback was not called');
      const [applyContext] = applyCall;
      expectGeometryHasHole(applyContext.polygon);
    } finally {
      harness.cleanup();
    }
  });

  it('does not execute a stale polygon menu action after its layer becomes readonly', async () => {
    const applySpy = vi.fn(({ bounds }: PolygonMenuActionContext) =>
      makeTriangleFromBounds(bounds),
    );
    const polygonMenuAction: PolygonMenuAction = {
      id: 'makeTriangle',
      label: 'Make triangle',
      apply: applySpy,
    };
    const harness = createPolydrawHarness(withPolygonMenuActions([polygonMenuAction]));

    try {
      await harness.polydraw.addPredefinedPolygon(fixtures.octagon(), {
        layer: {
          id: 'editable-layer',
          interaction: 'editable',
        },
      });
      harness.polydraw.setActiveLayer('editable-layer');
      const featureGroup = harness.polydraw.getFeatureGroups()[0];
      const staleButton = getActionButton(harness.map, featureGroup, 'makeTriangle');

      harness.polydraw.updateLayer('editable-layer', { interaction: 'readonly' });
      staleButton.click();
      await flushAsync();

      expect(applySpy).not.toHaveBeenCalled();
      expect(harness.polydraw.getFeatureGroups()[0]).toBe(featureGroup);
    } finally {
      harness.cleanup();
    }
  });

  it('preserves metadata, layer assignment, style overrides, and optimization metadata', async () => {
    const polygonMenuAction: PolygonMenuAction = {
      id: 'makeTriangle',
      label: 'Make triangle',
      apply: ({ bounds }) => makeTriangleFromBounds(bounds),
    };
    const harness = createPolydrawHarness(withPolygonMenuActions([polygonMenuAction]));

    try {
      await harness.polydraw.addPredefinedPolygon(fixtures.octagon(), {
        layer: {
          id: 'custom-layer',
          label: 'Custom Layer',
          color: '#ff0000',
          interaction: 'editable',
        },
        metadata: {
          source: 'verifier',
          risk: 'high',
        },
        overrides: {
          style: {
            color: '#123456',
            fillColor: '#abcdef',
            weight: 5,
          },
        },
        visualOptimizationLevel: 5,
      });
      harness.polydraw.setActiveLayer('custom-layer');
      const featureGroup = harness.polydraw.getFeatureGroups()[0];

      getActionButton(harness.map, featureGroup, 'makeTriangle').click();
      await flushAsync();

      const updatedFeatureGroup = harness.polydraw.getFeatureGroups()[0];
      const polygon = getFirstPolygon(updatedFeatureGroup) as L.Polygon & {
        _polydrawOptimizationLevel?: number;
        _polydrawOptimizationOriginalLevel?: number;
      };

      expect(harness.polydraw.getFeatureMetadata(updatedFeatureGroup)).toEqual({
        source: 'verifier',
        risk: 'high',
      });
      expect(harness.polydraw.getLayerForFeatureGroup(updatedFeatureGroup)).toBe('custom-layer');
      expect(polygon.options.color).toBe('#123456');
      expect(polygon.options.fillColor).toBe('#abcdef');
      expect(polygon.options.weight).toBe(5);
      expect(polygon._polydrawOptimizationLevel).toBe(5);
      expect(polygon._polydrawOptimizationOriginalLevel).toBe(5);
    } finally {
      harness.cleanup();
    }
  });
});
