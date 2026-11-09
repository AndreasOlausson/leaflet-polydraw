import { expect, test, type Locator } from '@playwright/test';
import { latlngPolys, polys } from './fixtures/polygons';
import { DemoFactory } from './mock-factory';

const expectMapStayedPut = (
  before: { lat: number; lng: number },
  after: { lat: number; lng: number },
) => {
  expect(Math.abs(after.lat - before.lat)).toBeLessThan(0.0001);
  expect(Math.abs(after.lng - before.lng)).toBeLessThan(0.0001);
};

test.describe('BrowserStack smoke', () => {
  test.beforeEach(async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.goto();
    await demo.clearPolygons();
  });

  test('loads Polydraw and performs an overlapping merge', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.setMerge(true);
    await demo.addPredefined([latlngPolys.overlapA]);
    await demo.addPredefined([latlngPolys.overlapB]);

    await expect.poll(() => demo.polygonCount()).toBe(1);
  });

  test('keeps polygons in independent draw layers', async ({ page }) => {
    const demo = new DemoFactory(page);

    await page.evaluate(() => {
      (window as any).polydrawControl.createDrawLayer({ id: 'Layer 1' });
    });
    await demo.addPredefined([latlngPolys.overlapA]);
    await page.evaluate(() => {
      (window as any).polydrawControl.createDrawLayer({ id: 'Layer 2' });
    });
    await demo.addPredefined([latlngPolys.overlapB]);

    const layerCounts = await page.evaluate(() => {
      const control = (window as any).polydrawControl;
      return ['Layer 1', 'Layer 2'].map(
        (layerId) => control.getFeatureGroupsByLayer(layerId).length,
      );
    });
    expect(layerCounts).toEqual([1, 1]);
  });

  test('dragging a polygon moves it without panning the map', async ({ page }, testInfo) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([latlngPolys.bigSquare]);
    const boundsBefore = await demo.firstPolygonBounds();
    const mapCenterBefore = await demo.mapCenter();

    if (testInfo.project.name.includes('touch')) {
      await demo.dragFirstPolygonByOffsetWithTouch(0, 0.02);
    } else {
      await demo.dragPolygonByOffset(0, 0.02);
    }

    const boundsAfter = await demo.firstPolygonBounds();
    const mapCenterAfter = await demo.mapCenter();
    expect(boundsAfter.minLng).toBeGreaterThan(boundsBefore.minLng + 0.015);
    expectMapStayedPut(mapCenterBefore, mapCenterAfter);
  });

  test('draws a freehand polygon without panning the map', async ({ page }, testInfo) => {
    const demo = new DemoFactory(page);
    const mapCenterBefore = await demo.mapCenter();

    if (testInfo.project.name.includes('touch')) {
      await demo.drawFreehandWithTouch(polys.bottomRightSquare);
    } else {
      await demo.drawFreehand(polys.bottomRightSquare);
    }

    await expect.poll(() => demo.polygonCount()).toBe(1);
    expectMapStayedPut(mapCenterBefore, await demo.mapCenter());
  });

  test('opens the toolbar and polygon controls', async ({ page }, testInfo) => {
    const demo = new DemoFactory(page);
    const useTouch = testInfo.project.name.includes('touch');
    const press = async (target: Locator) => {
      if (useTouch) {
        await target.tap();
      } else {
        await target.click();
      }
    };

    const toolbarToggle = page.locator('[data-polydraw="activate-button"]');
    const toolbarTools = page.locator('[data-polydraw="sub-buttons"]');
    const getToolbarHeight = () =>
      toolbarTools.evaluate(
        (element) => Number.parseFloat(getComputedStyle(element).maxHeight) || 0,
      );

    await press(toolbarToggle);
    await expect.poll(getToolbarHeight).toBeGreaterThan(0);
    await expect(page.locator('[data-polydraw="draw-button"]')).toBeVisible();

    await demo.addPredefined([latlngPolys.bigSquare]);
    await demo.ensureOffMode();
    await page.evaluate(() => {
      const control = (window as any).polydrawControl;
      const featureGroup = control?.getFeatureGroups?.()[0];
      const polygon = featureGroup
        ?.getLayers?.()
        .find((layer: any) => typeof layer?.getBounds === 'function');
      const map = control?.map ?? control?._map;
      if (!map || !polygon) {
        throw new Error('Polygon bounds are unavailable for UI smoke test');
      }
      map.fitBounds(polygon.getBounds(), { padding: [100, 100], animate: false });
    });

    await press(page.locator('.polygon-marker.info').first());
    const infoPanel = page.locator('.info-marker-content');
    await expect(infoPanel).toBeVisible();
    await expect(infoPanel.getByText('Area', { exact: true })).toBeVisible();
    await press(page.locator('.leaflet-popup-close-button'));
    await expect(infoPanel).not.toBeVisible();

    await press(page.locator('.polygon-marker.menu').first());
    const actionMenu = page.locator('.alter-marker-outer-wrapper');
    await expect(actionMenu).toBeVisible();
    const firstAction = actionMenu.locator('.marker-menu-button').first();
    await expect(firstAction).toBeVisible();
    if (!useTouch) {
      await firstAction.hover();
      await expect(firstAction.locator('.marker-menu-tooltip')).toBeVisible();
    }
    await press(actionMenu.locator('.marker-menu-close'));
    await expect(actionMenu).not.toBeVisible();

    const deleteMarker = page.locator('.polygon-marker.delete').first();
    await expect(deleteMarker).toBeVisible();
    if (useTouch) {
      await press(deleteMarker);
      await expect.poll(() => demo.polygonCount()).toBe(0);
    }
  });

  test('shows toolbar tooltips on hover', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('touch'), 'Touch devices do not expose hover');

    const toolbarToggle = page.locator('[data-polydraw="activate-button"]');
    await toolbarToggle.click();
    const drawButton = page.locator('[data-polydraw="draw-button"]');
    await drawButton.hover();

    await expect
      .poll(() => drawButton.evaluate((element) => getComputedStyle(element, '::after').visibility))
      .toBe('visible');
  });
});
