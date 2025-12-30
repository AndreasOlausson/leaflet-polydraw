import { test, expect } from '@playwright/test';
import { DemoFactory } from './mock-factory';
import { latlngPolys } from './fixtures/polygons';

async function getFirstPolygonVertexCount(page: any): Promise<number> {
  return page.evaluate(() => {
    const ctrl = (window as any).polydrawControl;
    const groups = ctrl?.getFeatureGroups() ?? [];
    if (!groups.length) return 0;
    const gj = groups[0].toGeoJSON() as any;
    const features = Array.isArray(gj?.features) ? gj.features : [gj];
    const geom = features[0]?.geometry;
    if (!geom || !geom.coordinates) return 0;
    if (geom.type === 'Polygon') {
      return Array.isArray(geom.coordinates[0]) ? geom.coordinates[0].length : 0;
    }
    if (geom.type === 'MultiPolygon') {
      return Array.isArray(geom.coordinates[0]?.[0]) ? geom.coordinates[0][0].length : 0;
    }
    return 0;
  });
}

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
    const denseVertices = await getFirstPolygonVertexCount(page);

    // Sparse polygon (fewer vertices)
    await demo.clearPolygons();
    await demo.addPredefined([latlngPolys.bigSquare]);
    await page.waitForFunction(() => {
      const ctrl = (window as any).polydrawControl;
      return (ctrl?.getFeatureGroups().length ?? 0) === 1;
    });
    const sparseVertices = await getFirstPolygonVertexCount(page);

    expect(denseVertices).toBeGreaterThan(sparseVertices);
  });
});
