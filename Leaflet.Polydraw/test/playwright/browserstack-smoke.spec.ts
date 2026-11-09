import { expect, test } from '@playwright/test';
import { latlngPolys } from './fixtures/polygons';
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
});
