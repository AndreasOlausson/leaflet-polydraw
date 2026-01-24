import { test, expect } from '@playwright/test';
import { DemoFactory } from './mock-factory';
import { latlngPolys } from './fixtures/polygons';

test.describe('Polygon menu actions', () => {
  test.beforeEach(async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.goto();
    await demo.clearPolygons();
  });

  test('bbox action normalizes polygon to its bounds', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([latlngPolys.diamond]);
    await expect.poll(() => demo.polygonCount()).toBe(1);

    const before = await demo.getPrimaryPolygonBounds();

    await demo.clickMenuAction('bbox');
    await expect.poll(() => demo.polygonCount()).toBe(1);

    const afterCoords = await demo.getPrimaryPolygonCoordinates();
    const after = await demo.getPrimaryPolygonBounds();

    expect(afterCoords.length).toBeGreaterThanOrEqual(5);
    expect(after.minLat).toBeCloseTo(before.minLat, 6);
    expect(after.maxLat).toBeCloseTo(before.maxLat, 6);
    expect(after.minLng).toBeCloseTo(before.minLng, 6);
    expect(after.maxLng).toBeCloseTo(before.maxLng, 6);

    const uniqueLats = new Set(afterCoords.map((coord) => coord[1].toFixed(6)));
    const uniqueLngs = new Set(afterCoords.map((coord) => coord[0].toFixed(6)));
    expect(uniqueLats.size).toBeGreaterThanOrEqual(2);
    expect(uniqueLats.size).toBeLessThanOrEqual(3);
    expect(uniqueLngs.size).toBeGreaterThanOrEqual(2);
    expect(uniqueLngs.size).toBeLessThanOrEqual(3);
    afterCoords.forEach(([lng, lat]) => {
      const latOnEdge = Math.abs(lat - after.minLat) < 1e-6 || Math.abs(lat - after.maxLat) < 1e-6;
      const lngOnEdge = Math.abs(lng - after.minLng) < 1e-6 || Math.abs(lng - after.maxLng) < 1e-6;
      expect(latOnEdge || lngOnEdge).toBe(true);
    });
  });

  test('simplify reduces vertices and undo restores geometry', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([latlngPolys.bigSquareDense]);
    await expect.poll(() => demo.polygonCount()).toBe(1);

    const beforeCount = await demo.getPrimaryPolygonVertexCount();

    await demo.clickMenuAction('simplify');
    await expect.poll(() => demo.polygonCount()).toBe(1);

    await expect.poll(() => demo.getPrimaryPolygonVertexCount()).toBeLessThan(beforeCount);

    await demo.undo();
    await expect.poll(() => demo.polygonCount()).toBe(1);
    await expect.poll(() => demo.getPrimaryPolygonVertexCount()).toBe(beforeCount);
  });
});
