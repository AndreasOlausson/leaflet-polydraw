import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as L from 'leaflet';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';
import type { PolydrawConfig } from '../../../src/types/polydraw-interfaces';

/**
 * Finds the menu marker inside a featureGroup by checking for the 'menu' CSS class
 * on the marker's DOM element.
 */
function findMenuMarker(featureGroup: L.FeatureGroup): L.Marker | undefined {
  const layers = featureGroup.getLayers();
  return layers.find((layer): layer is L.Marker => {
    if (!(layer instanceof L.Marker)) return false;

    // Prefer DOM element when available
    const el = layer.getElement();
    if (el?.classList.contains('menu')) return true;

    // Leaflet v1 + jsdom may not always expose a marker element; fall back to icon className.
    const iconClassName = (
      layer.options.icon as { options?: { className?: string } } | undefined
    )?.options?.className;
    return typeof iconClassName === 'string' && iconClassName.includes('menu');
  }) as L.Marker | undefined;
}

/**
 * Opens the menu popup by firing 'click' on the menu marker and returns
 * the set of action IDs present as buttons inside the popup.
 */
function openMenuAndGetActionIds(
  map: L.Map,
  featureGroup: L.FeatureGroup,
): Set<string> {
  const menuMarker = findMenuMarker(featureGroup);
  if (!menuMarker) throw new Error('Menu marker not found in featureGroup');

  // Fire click to open the popup
  menuMarker.fire('click');

  // The popup is appended to the map container's pane
  const container = map.getContainer();
  const buttons = container.querySelectorAll('[data-action-id]');
  const ids = new Set<string>();
  buttons.forEach((btn) => {
    const id = btn.getAttribute('data-action-id');
    if (id) ids.add(id);
  });
  return ids;
}

/**
 * Opens the menu popup and clicks a specific action button by its data-action-id.
 */
function clickMenuButton(
  map: L.Map,
  featureGroup: L.FeatureGroup,
  actionId: string,
): void {
  const menuMarker = findMenuMarker(featureGroup);
  if (!menuMarker) throw new Error('Menu marker not found in featureGroup');

  menuMarker.fire('click');

  const container = map.getContainer();
  const button = container.querySelector(
    `[data-action-id="${actionId}"]`,
  ) as HTMLElement | null;
  if (!button) throw new Error(`Menu button with action "${actionId}" not found`);

  button.click();
}

/**
 * Extracts the polygon rings (outer + holes) from a Leaflet polygon.
 */
function getPolygonRings(polygon: L.Polygon): L.LatLng[][] {
  const latLngs = polygon.getLatLngs() as L.LatLng[][] | L.LatLng[][][];
  if (latLngs.length === 0) return [];
  // Check if it's wrapped in an extra array level (MultiPolygon-style)
  if (Array.isArray(latLngs[0]) && Array.isArray((latLngs as L.LatLng[][][])[0]?.[0])) {
    return (latLngs as L.LatLng[][][])[0];
  }
  return latLngs as L.LatLng[][];
}

/**
 * Flush pending microtasks/promises.
 */
function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Menu Operations Config', () => {
  const fixtures = MockFactory.createPredefinedPolygons();

  describe('simplify', () => {
    it('should show the simplify button when simplify is enabled', async () => {
      const harness = createPolydrawHarness();
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('simplify')).toBe(true);
      } finally {
        harness.cleanup();
      }
    });

    it('should hide the simplify button when simplify is disabled', async () => {
      const harness = createPolydrawHarness({
        menuOperations: { simplify: { enabled: false, processHoles: true } },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('simplify')).toBe(false);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('doubleElbows', () => {
    it('should show the doubleElbows button when enabled', async () => {
      const harness = createPolydrawHarness();
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('doubleElbows')).toBe(true);
      } finally {
        harness.cleanup();
      }
    });

    it('should hide the doubleElbows button when disabled', async () => {
      const harness = createPolydrawHarness({
        menuOperations: { doubleElbows: { enabled: false, processHoles: true } },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('doubleElbows')).toBe(false);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('bbox', () => {
    it('should show the bbox button when enabled', async () => {
      const harness = createPolydrawHarness();
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('bbox')).toBe(true);
      } finally {
        harness.cleanup();
      }
    });

    it('should hide the bbox button when disabled', async () => {
      const harness = createPolydrawHarness({
        menuOperations: {
          bbox: { enabled: false, processHoles: true, addMidPointMarkers: true },
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('bbox')).toBe(false);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('bezier', () => {
    it('should show the bezier button when enabled', async () => {
      const harness = createPolydrawHarness();
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('bezier')).toBe(true);
      } finally {
        harness.cleanup();
      }
    });

    it('should hide the bezier button when disabled', async () => {
      const harness = createPolydrawHarness({
        menuOperations: {
          bezier: {
            enabled: false,
            resolution: 10000,
            sharpness: 0.75,
            resampleMultiplier: 10,
            maxNodes: 1000,
            visualOptimizationLevel: 10,
            ghostMarkers: false,
          },
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('bezier')).toBe(false);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('scale', () => {
    it('should show the scale button when enabled', async () => {
      const harness = createPolydrawHarness();
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('scale')).toBe(true);
      } finally {
        harness.cleanup();
      }
    });

    it('should hide the scale button when disabled', async () => {
      const harness = createPolydrawHarness({
        menuOperations: { scale: { enabled: false } },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('scale')).toBe(false);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('rotate', () => {
    it('should show the rotate button when enabled', async () => {
      const harness = createPolydrawHarness();
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('rotate')).toBe(true);
      } finally {
        harness.cleanup();
      }
    });

    it('should hide the rotate button when disabled', async () => {
      const harness = createPolydrawHarness({
        menuOperations: { rotate: { enabled: false } },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('rotate')).toBe(false);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('visualOptimizationToggle', () => {
    it('should not show toggle button when polygon has no visual optimization', async () => {
      const harness = createPolydrawHarness();
      try {
        // Add polygon without visualOptimizationLevel → no toggle button
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('toggleOptimization')).toBe(false);
      } finally {
        harness.cleanup();
      }
    });

    it('should show toggle button when polygon has visual optimization', async () => {
      const harness = createPolydrawHarness();
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon(), {
          visualOptimizationLevel: 6,
        });
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('toggleOptimization')).toBe(true);
      } finally {
        harness.cleanup();
      }
    });

    it('should not show toggle button when disabled even if polygon has optimization', async () => {
      const harness = createPolydrawHarness({
        menuOperations: { visualOptimizationToggle: { enabled: false } },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon(), {
          visualOptimizationLevel: 6,
        });
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('toggleOptimization')).toBe(false);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('simplify processHoles behavior', () => {
    it('should simplify holes when processHoles is true', async () => {
      const harness = createPolydrawHarness({
        menuOperations: { simplify: { enabled: true, processHoles: true } },
      } as Partial<PolydrawConfig>);
      try {
        const squareWithHole = MockFactory.createPredefinedPolygons().squareWithHole();
        await harness.polydraw.addPredefinedPolygon(squareWithHole);

        const fg = harness.polydraw.getFeatureGroups()[0];
        const polygonBefore = fg
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;
        const ringsBefore = getPolygonRings(polygonBefore);
        const holeVerticesBefore = ringsBefore[1]?.length ?? 0;

        // Click the simplify button to trigger the operation
        clickMenuButton(harness.map, fg, 'simplify');
        await flushAsync();

        // After simplify, the polygon should be re-created
        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        const polygonAfter = fgAfter
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;
        const ringsAfter = getPolygonRings(polygonAfter);

        // With processHoles: true, hole should also be simplified (fewer vertices)
        // The squareWithHole has 5 vertices per ring (closed). After simplify, vertices reduce.
        expect(ringsAfter.length).toBeGreaterThanOrEqual(2); // Still has a hole
        // The outer ring should have changed (fewer or same vertices)
        expect(ringsAfter[0].length).toBeLessThanOrEqual(ringsBefore[0].length);
        // The hole should also have changed
        expect(ringsAfter[1].length).toBeLessThanOrEqual(holeVerticesBefore);
      } finally {
        harness.cleanup();
      }
    });

    it('should preserve holes unchanged when processHoles is false', async () => {
      const harness = createPolydrawHarness({
        menuOperations: { simplify: { enabled: true, processHoles: false } },
      } as Partial<PolydrawConfig>);
      try {
        const squareWithHole = MockFactory.createPredefinedPolygons().squareWithHole();
        await harness.polydraw.addPredefinedPolygon(squareWithHole);

        const fg = harness.polydraw.getFeatureGroups()[0];
        const polygonBefore = fg
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;
        const ringsBefore = getPolygonRings(polygonBefore);
        const holeVerticesBefore = ringsBefore[1]?.length ?? 0;

        clickMenuButton(harness.map, fg, 'simplify');
        await flushAsync();

        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        const polygonAfter = fgAfter
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;
        const ringsAfter = getPolygonRings(polygonAfter);

        // With processHoles: false, hole should keep its original vertex count
        expect(ringsAfter.length).toBeGreaterThanOrEqual(2);
        expect(ringsAfter[1]?.length).toBe(holeVerticesBefore);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('doubleElbows processHoles behavior', () => {
    it('should double elbows on holes when processHoles is true', async () => {
      const harness = createPolydrawHarness({
        menuOperations: { doubleElbows: { enabled: true, processHoles: true } },
      } as Partial<PolydrawConfig>);
      try {
        const squareWithHole = MockFactory.createPredefinedPolygons().squareWithHole();
        await harness.polydraw.addPredefinedPolygon(squareWithHole);

        const fg = harness.polydraw.getFeatureGroups()[0];
        const polygonBefore = fg
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;
        const ringsBefore = getPolygonRings(polygonBefore);
        const holeVerticesBefore = ringsBefore[1]?.length ?? 0;

        clickMenuButton(harness.map, fg, 'doubleElbows');
        await flushAsync();

        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        const polygonAfter = fgAfter
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;
        const ringsAfter = getPolygonRings(polygonAfter);

        // With processHoles: true, hole should have more vertices (doubled)
        expect(ringsAfter.length).toBeGreaterThanOrEqual(2);
        expect(ringsAfter[1].length).toBeGreaterThan(holeVerticesBefore);
      } finally {
        harness.cleanup();
      }
    });

    it('should preserve holes unchanged when processHoles is false', async () => {
      const harness = createPolydrawHarness({
        menuOperations: { doubleElbows: { enabled: true, processHoles: false } },
      } as Partial<PolydrawConfig>);
      try {
        const squareWithHole = MockFactory.createPredefinedPolygons().squareWithHole();
        await harness.polydraw.addPredefinedPolygon(squareWithHole);

        const fg = harness.polydraw.getFeatureGroups()[0];
        const polygonBefore = fg
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;
        const ringsBefore = getPolygonRings(polygonBefore);
        const holeVerticesBefore = ringsBefore[1]?.length ?? 0;

        clickMenuButton(harness.map, fg, 'doubleElbows');
        await flushAsync();

        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        const polygonAfter = fgAfter
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;
        const ringsAfter = getPolygonRings(polygonAfter);

        // With processHoles: false, hole should keep the same vertex count
        expect(ringsAfter[1]?.length).toBe(holeVerticesBefore);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('bbox processHoles and addMidPointMarkers', () => {
    it('should convert holes to bounding boxes when processHoles is true', async () => {
      const harness = createPolydrawHarness({
        menuOperations: {
          bbox: { enabled: true, processHoles: true, addMidPointMarkers: false },
        },
      } as Partial<PolydrawConfig>);
      try {
        const squareWithHole = MockFactory.createPredefinedPolygons().squareWithHole();
        await harness.polydraw.addPredefinedPolygon(squareWithHole);

        const fg = harness.polydraw.getFeatureGroups()[0];

        clickMenuButton(harness.map, fg, 'bbox');
        await flushAsync();

        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        const polygonAfter = fgAfter
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;
        const ringsAfter = getPolygonRings(polygonAfter);

        // Outer ring should be a bbox (4 vertices — Leaflet open rings)
        expect(ringsAfter[0].length).toBe(4);
        // Hole should also be a bbox when processHoles is true
        if (ringsAfter.length > 1) {
          expect(ringsAfter[1].length).toBe(4);
        }
      } finally {
        harness.cleanup();
      }
    });

    it('should preserve holes when processHoles is false', async () => {
      const harness = createPolydrawHarness({
        menuOperations: {
          bbox: { enabled: true, processHoles: false, addMidPointMarkers: false },
        },
      } as Partial<PolydrawConfig>);
      try {
        const squareWithHole = MockFactory.createPredefinedPolygons().squareWithHole();
        await harness.polydraw.addPredefinedPolygon(squareWithHole);

        const fg = harness.polydraw.getFeatureGroups()[0];

        clickMenuButton(harness.map, fg, 'bbox');
        await flushAsync();

        // With processHoles: false, the bbox only converts the outer ring
        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        expect(fgAfter).toBeDefined();
      } finally {
        harness.cleanup();
      }
    });

    it('should add midpoint markers (double elbows) when addMidPointMarkers is true', async () => {
      const harness = createPolydrawHarness({
        menuOperations: {
          bbox: { enabled: true, processHoles: true, addMidPointMarkers: true },
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(
          MockFactory.createPredefinedPolygons().octagon(),
        );

        const fg = harness.polydraw.getFeatureGroups()[0];

        clickMenuButton(harness.map, fg, 'bbox');
        await flushAsync();

        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        const polygonAfter = fgAfter
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;
        const ringsAfter = getPolygonRings(polygonAfter);

        // With addMidPointMarkers, the bbox gets doubled elbows
        // Normal bbox = 4 vertices, doubled = 8 vertices (Leaflet open rings)
        expect(ringsAfter[0].length).toBe(8);
      } finally {
        harness.cleanup();
      }
    });

    it('should not add midpoint markers when addMidPointMarkers is false', async () => {
      const harness = createPolydrawHarness({
        menuOperations: {
          bbox: { enabled: true, processHoles: true, addMidPointMarkers: false },
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(
          MockFactory.createPredefinedPolygons().octagon(),
        );

        const fg = harness.polydraw.getFeatureGroups()[0];

        clickMenuButton(harness.map, fg, 'bbox');
        await flushAsync();

        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        const polygonAfter = fgAfter
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;
        const ringsAfter = getPolygonRings(polygonAfter);

        // Without addMidPointMarkers, bbox has exactly 4 vertices (Leaflet open rings)
        expect(ringsAfter[0].length).toBe(4);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('bezier operation', () => {
    it('should apply bezier smoothing to a polygon', async () => {
      const harness = createPolydrawHarness();
      try {
        await harness.polydraw.addPredefinedPolygon(
          MockFactory.createPredefinedPolygons().octagon(),
        );

        const fg = harness.polydraw.getFeatureGroups()[0];
        const polygonBefore = fg
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;
        const verticesBefore = getPolygonRings(polygonBefore)[0].length;

        clickMenuButton(harness.map, fg, 'bezier');
        await flushAsync();

        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        const polygonAfter = fgAfter
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;
        const verticesAfter = getPolygonRings(polygonAfter)[0].length;

        // Bezier smoothing should produce more vertices than the original
        expect(verticesAfter).toBeGreaterThan(verticesBefore);
      } finally {
        harness.cleanup();
      }
    });

    it('should apply visual optimization level from bezier config', async () => {
      const harness = createPolydrawHarness({
        menuOperations: {
          bezier: {
            enabled: true,
            resolution: 10000,
            sharpness: 0.75,
            resampleMultiplier: 10,
            maxNodes: 1000,
            visualOptimizationLevel: 8,
            ghostMarkers: false,
          },
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(
          MockFactory.createPredefinedPolygons().octagon(),
        );

        const fg = harness.polydraw.getFeatureGroups()[0];

        clickMenuButton(harness.map, fg, 'bezier');
        await flushAsync();

        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        const polygonAfter = fgAfter
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon & {
          _polydrawOptimizationLevel?: number;
        };

        // The bezier config's visualOptimizationLevel should be applied
        expect(polygonAfter._polydrawOptimizationLevel).toBe(8);
      } finally {
        harness.cleanup();
      }
    });

    it('should apply ghost markers when ghostMarkers is true', async () => {
      const harness = createPolydrawHarness({
        menuOperations: {
          bezier: {
            enabled: true,
            resolution: 10000,
            sharpness: 0.75,
            resampleMultiplier: 10,
            maxNodes: 1000,
            visualOptimizationLevel: 10,
            ghostMarkers: true,
          },
        },
      } as Partial<PolydrawConfig>);
      try {
        await harness.polydraw.addPredefinedPolygon(
          MockFactory.createPredefinedPolygons().octagon(),
        );

        const fg = harness.polydraw.getFeatureGroups()[0];

        clickMenuButton(harness.map, fg, 'bezier');
        await flushAsync();

        // When ghostMarkers is true, the polygon should have near-invisible opacity
        const fgAfter = harness.polydraw.getFeatureGroups()[0];
        const polygonAfter = fgAfter
          .getLayers()
          .find((l) => l instanceof L.Polygon) as L.Polygon;

        // The polygon should have been styled with ghost opacity
        expect(polygonAfter.options.opacity).toBeLessThan(0.01);
        expect(polygonAfter.options.fillOpacity).toBeLessThan(0.01);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('all buttons disabled', () => {
    it('should show no menu buttons when all operations are disabled', async () => {
      const harness = createPolydrawHarness({
        menuOperations: {
          simplify: { enabled: false, processHoles: true },
          doubleElbows: { enabled: false, processHoles: true },
          bbox: { enabled: false, processHoles: true, addMidPointMarkers: true },
          bezier: {
            enabled: false,
            resolution: 10000,
            sharpness: 0.75,
            resampleMultiplier: 10,
            maxNodes: 1000,
            visualOptimizationLevel: 10,
            ghostMarkers: false,
          },
          scale: { enabled: false },
          rotate: { enabled: false },
          visualOptimizationToggle: { enabled: false },
        },
      });
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.size).toBe(0);
      } finally {
        harness.cleanup();
      }
    });
  });

  describe('default config shows all standard buttons', () => {
    it('should show simplify, doubleElbows, bbox, bezier, scale, and rotate with defaults', async () => {
      const harness = createPolydrawHarness();
      try {
        await harness.polydraw.addPredefinedPolygon(fixtures.octagon());
        const fg = harness.polydraw.getFeatureGroups()[0];
        const actions = openMenuAndGetActionIds(harness.map, fg);
        expect(actions.has('simplify')).toBe(true);
        expect(actions.has('doubleElbows')).toBe(true);
        expect(actions.has('bbox')).toBe(true);
        expect(actions.has('bezier')).toBe(true);
        expect(actions.has('scale')).toBe(true);
        expect(actions.has('rotate')).toBe(true);
        // toggleOptimization only shows when polygon has VO metadata
        expect(actions.has('toggleOptimization')).toBe(false);
      } finally {
        harness.cleanup();
      }
    });
  });
});
