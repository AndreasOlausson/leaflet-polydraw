import { test, expect } from '@playwright/test';
import { DemoFactory } from './mock-factory';
import { latlngPolys } from './fixtures/polygons';

test.describe('Polydraw basic flows', () => {
  test.beforeEach(async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.goto();
    await demo.clearPolygons();
  });

  test('draw a single polygon yields one polygon', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([
      latlngPolys.square,
    ]);
    expect(await demo.polygonCount()).toBe(1);
  });

  test('draw two disjoint polygons yields two polygons (merge on)', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.setMerge(true);
    await demo.addPredefined([
      latlngPolys.square,
    ]);
    await demo.addPredefined([
      latlngPolys.smallSquare,
    ]);
    expect(await demo.polygonCount()).toBe(2);
  });

  test('draw two overlapping polygons merges when merge=true', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.setMerge(true);
    await demo.addPredefined([
      latlngPolys.overlapA,
    ]);
    await demo.addPredefined([
      latlngPolys.overlapB,
    ]);
    expect(await demo.polygonCount()).toBe(1);
  });

  test('draw two overlapping polygons stay separate when merge=false', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.setMerge(false);
    await demo.addPredefined([
      latlngPolys.overlapA,
    ]);
    await demo.addPredefined([
      latlngPolys.overlapB,
    ]);
    expect(await demo.polygonCount()).toBe(2);
  });
});
