import { test, expect } from '@playwright/test';
import { DemoFactory } from './mock-factory';
import { latlngPolys } from './fixtures/polygons';

test.describe('Simplification sensitivity', () => {
  test.beforeEach(async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.goto();
    await demo.clearPolygons();
  });

  test('dense vs sparse polygons yield different vertex counts', async ({ page }) => {
    const demo = new DemoFactory(page);

    // Dense polygon (more vertices)
    await demo.addPredefined([latlngPolys.bigSquareDense]);
    await page.waitForFunction(() => {
      const ctrl = (window as any).polydrawControl;
      return (ctrl?.getFeatureGroups().length ?? 0) === 1;
    });
    const denseVertices = await demo.getPrimaryPolygonVertexCount();

    // Sparse polygon (fewer vertices)
    await demo.clearPolygons();
    await demo.addPredefined([latlngPolys.bigSquare]);
    await page.waitForFunction(() => {
      const ctrl = (window as any).polydrawControl;
      return (ctrl?.getFeatureGroups().length ?? 0) === 1;
    });
    const sparseVertices = await demo.getPrimaryPolygonVertexCount();

    expect(denseVertices).toBeGreaterThan(sparseVertices);
  });
});
