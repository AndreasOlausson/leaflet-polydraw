import { test, expect } from '@playwright/test';
import { DemoFactory } from './mock-factory';
import { latlngPolys } from './fixtures/polygons';

type BrowserLayer = {
  getElement?: () => Element | undefined;
};

type BrowserFeatureGroup = {
  getLayers: () => unknown[];
};

type BrowserPolydrawControl = {
  getFeatureGroups?: () => BrowserFeatureGroup[];
};

type BrowserLeaflet = {
  Polyline: new (...args: never[]) => unknown;
  Polygon: new (...args: never[]) => unknown;
};

type PolydrawBrowserWindow = Window &
  typeof globalThis & {
    polydrawControl?: BrowserPolydrawControl;
    L?: BrowserLeaflet;
  };

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

  test('rotate transform hides stale hole helper lines while previewing polygon with holes', async ({
    page,
  }) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([latlngPolys.donutOuter, latlngPolys.donutHole]);
    await expect.poll(() => demo.polygonCount()).toBe(1);
    await expect.poll(() => demo.getPrimaryPolygonRingCount()).toBe(2);

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const { polydrawControl: ctrl, L } = window as PolydrawBrowserWindow;
          const featureGroup = ctrl?.getFeatureGroups?.()[0];
          if (!featureGroup || !L) return 0;
          const helperLines = featureGroup
            .getLayers()
            .filter((layer) => layer instanceof L.Polyline && !(layer instanceof L.Polygon));
          return helperLines.length;
        }),
      )
      .toBeGreaterThan(0);

    await demo.startTransform('rotate');
    await demo.rotateTransformByDegrees(25);

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const { polydrawControl: ctrl, L } = window as PolydrawBrowserWindow;
          const featureGroup = ctrl?.getFeatureGroups?.()[0];
          if (!featureGroup || !L) return false;
          const helperLines = featureGroup
            .getLayers()
            .filter(
              (layer): layer is BrowserLayer =>
                layer instanceof L.Polyline && !(layer instanceof L.Polygon),
            );
          return (
            helperLines.length > 0 &&
            helperLines.every((layer) => {
              const element = layer.getElement?.() as HTMLElement | SVGElement | undefined;
              return element?.style.display === 'none';
            })
          );
        }),
      )
      .toBe(true);

    await demo.confirmTransform();

    await expect.poll(() => demo.polygonCount()).toBe(1);
    await expect.poll(() => demo.getPrimaryPolygonRingCount()).toBe(2);
  });

  test('donut transform only enables confirm for valid donuts', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([latlngPolys.square]);
    await expect.poll(() => demo.polygonCount()).toBe(1);

    await demo.startTransform('donut');
    await expect.poll(() => demo.isTransformConfirmDisabled()).toBe(true);
    await expect.poll(() => demo.getTransformStatusText()).toBe('');

    await demo.dragTransformHandle('top-right', 120, -120);

    await expect.poll(() => demo.isTransformConfirmDisabled()).toBe(false);
    await expect.poll(() => demo.getTransformStatusText()).toBe('');

    await demo.confirmTransform();

    await expect.poll(() => demo.polygonCount()).toBe(1);
    await expect.poll(() => demo.getPrimaryPolygonRingCount()).toBe(2);
  });

  test('undo after deleting a donut hole restores the polygon with its hole', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([latlngPolys.square]);
    await expect.poll(() => demo.polygonCount()).toBe(1);

    await demo.startTransform('donut');
    await demo.dragTransformHandle('top-right', 120, -120);
    await demo.confirmTransform();

    await expect.poll(() => demo.polygonCount()).toBe(1);
    await expect.poll(() => demo.getPrimaryPolygonRingCount()).toBe(2);

    await demo.clickFirstHoleDeleteMarker();

    await expect.poll(() => demo.polygonCount()).toBe(1);
    await expect.poll(() => demo.getPrimaryPolygonRingCount()).toBe(1);

    await demo.undo();

    await expect.poll(() => demo.polygonCount()).toBe(1);
    await expect.poll(() => demo.getPrimaryPolygonRingCount()).toBe(2);
  });
});
