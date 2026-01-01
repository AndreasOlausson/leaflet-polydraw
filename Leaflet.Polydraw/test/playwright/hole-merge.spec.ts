import { test, expect } from '@playwright/test';
import { DemoFactory } from './mock-factory';
import { latlngPolys } from './fixtures/polygons';

test.describe('Hole merge behavior on drag', () => {
  test.beforeEach(async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.goto();
    await demo.clearPolygons();
    await demo.setMerge(true);
  });

  test('nudging a polygon with holes keeps inner polygon separate', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([latlngPolys.donutOuter, latlngPolys.donutHole]);
    await demo.addPredefined([latlngPolys.holeInner]);

    await expect.poll(() => demo.polygonCount()).toBe(2);

    await demo.dragPolygonByOffset(0, 0.002, { requireHoles: true });

    await expect.poll(() => demo.polygonCount()).toBe(2);
  });

  test('dragging a polygon with holes into another merges when merge=true', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([latlngPolys.donutOuter, latlngPolys.donutHole]);
    await demo.addPredefined([latlngPolys.holeInner]);

    await expect.poll(() => demo.polygonCount()).toBe(2);

    await demo.dragPolygonByOffset(0, 0.008, { requireHoles: true });

    await expect.poll(() => demo.polygonCount()).toBe(1);
  });
});
