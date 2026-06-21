import { test, expect } from '@playwright/test';
import { DemoFactory } from './mock-factory';
import { latlngPolys } from './fixtures/polygons';

const expectMapStayedPut = (
  before: { lat: number; lng: number },
  after: { lat: number; lng: number },
) => {
  expect(Math.abs(after.lat - before.lat)).toBeLessThan(0.0001);
  expect(Math.abs(after.lng - before.lng)).toBeLessThan(0.0001);
};

test.describe('Polygon dragging', () => {
  test.beforeEach(async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.goto();
    await demo.clearPolygons();
    await demo.addPredefined([latlngPolys.bigSquare]);
  });

  test('polygon drag moves the polygon', async ({ page }) => {
    const demo = new DemoFactory(page);
    const boundsBefore = await demo.firstPolygonBounds();

    await demo.dragPolygonByOffset(0, 0.006);

    const boundsAfter = await demo.firstPolygonBounds();

    expect(boundsAfter.minLng).toBeGreaterThan(boundsBefore.minLng + 0.003);
  });

  test('real mouse clone drag creates a copy instead of panning the map', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Mouse-driven clone regression is covered in Chromium; other projects use the stable polygon-drag coverage.',
    );

    const demo = new DemoFactory(page);
    await demo.setMerge(false);
    const mapCenterBefore = await demo.mapCenter();

    await demo.dragFirstPolygonByOffsetWithMouse(0, 0.02, true);

    await expect.poll(() => demo.polygonCount()).toBe(2);
    const mapCenterAfter = await demo.mapCenter();
    expectMapStayedPut(mapCenterBefore, mapCenterAfter);
  });
});
