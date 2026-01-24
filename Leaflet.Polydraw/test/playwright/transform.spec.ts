import { test, expect } from '@playwright/test';
import { DemoFactory } from './mock-factory';
import { latlngPolys } from './fixtures/polygons';

test.describe('Polygon transforms', () => {
  test.beforeEach(async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.goto();
    await demo.clearPolygons();
  });

  test('scale transform expands polygon bounds', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([latlngPolys.square]);
    await expect.poll(() => demo.polygonCount()).toBe(1);

    const before = await demo.getPrimaryPolygonBounds();
    const beforeArea = (before.maxLat - before.minLat) * (before.maxLng - before.minLng);

    await demo.startTransform('scale');
    await demo.dragTransformHandle('top-right', 120, -120);
    await demo.confirmTransform();

    await expect.poll(() => demo.polygonCount()).toBe(1);
    await expect
      .poll(async () => {
        const after = await demo.getPrimaryPolygonBounds();
        return (after.maxLat - after.minLat) * (after.maxLng - after.minLng);
      })
      .toBeGreaterThan(beforeArea);
  });

  test('rotate transform updates polygon coordinates', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([latlngPolys.rectangle]);
    await expect.poll(() => demo.polygonCount()).toBe(1);

    const beforeCoords = await demo.getPrimaryPolygonCoordinates();

    await demo.startTransform('rotate');
    await demo.rotateTransformByDegrees(25);
    await demo.confirmTransform();

    await expect.poll(() => demo.polygonCount()).toBe(1);
    const afterCoords = await demo.getPrimaryPolygonCoordinates();

    expect(afterCoords).toHaveLength(beforeCoords.length);
    const changed = afterCoords.some((coord, index) => {
      const before = beforeCoords[index];
      if (!before) return true;
      return Math.abs(coord[0] - before[0]) > 0.00001 || Math.abs(coord[1] - before[1]) > 0.00001;
    });
    expect(changed).toBe(true);
  });
});
