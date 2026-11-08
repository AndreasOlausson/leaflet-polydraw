import { test, expect } from '@playwright/test';
import { DemoFactory } from './mock-factory';
import { latlngPolys } from './fixtures/polygons';

type BrowserLayer = {
  getElement?: () => Element | undefined;
  _polydrawAuxiliaryLayer?: true;
};

type BrowserFeatureGroup = {
  getLayers: () => unknown[];
};

type BrowserPolydrawControl = {
  getFeatureGroups?: () => BrowserFeatureGroup[];
};

type PolydrawBrowserWindow = Window &
  typeof globalThis & {
    polydrawControl?: BrowserPolydrawControl;
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
          const { polydrawControl: ctrl } = window as PolydrawBrowserWindow;
          const featureGroup = ctrl?.getFeatureGroups?.()[0];
          if (!featureGroup) return 0;
          const helperLines = featureGroup
            .getLayers()
            .filter(
              (layer): layer is BrowserLayer =>
                (layer as BrowserLayer)._polydrawAuxiliaryLayer === true,
            );
          return helperLines.length;
        }),
      )
      .toBeGreaterThan(0);

    await demo.startTransform('rotate');
    await demo.rotateTransformByDegrees(25);

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const { polydrawControl: ctrl } = window as PolydrawBrowserWindow;
          const featureGroup = ctrl?.getFeatureGroups?.()[0];
          if (!featureGroup) return false;
          const helperLines = featureGroup
            .getLayers()
            .filter(
              (layer): layer is BrowserLayer =>
                (layer as BrowserLayer)._polydrawAuxiliaryLayer === true,
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

  test('donut keeps a default-layer polygon styled by its owning layer', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([latlngPolys.square]);
    const originalFillColor = await page.evaluate(() => {
      const control = (window as any).polydrawControl;
      const polygon = control
        .getFeatureGroupsByLayer('default')[0]
        ?.getLayers()
        .find((layer: any) => typeof layer.getLatLngs === 'function');
      return polygon?.options.fillColor;
    });
    await page.evaluate(() => {
      const control = (window as any).polydrawControl;
      control.createDrawLayer({ id: 'Layer 2', color: '#3b82f6' });
    });

    await demo.startTransform('donut');
    await demo.dragTransformHandle('top-right', 120, -120);
    await demo.confirmTransform();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const control = (window as any).polydrawControl;
          const defaultGroups = control.getFeatureGroupsByLayer('default');
          const layerTwoGroups = control.getFeatureGroupsByLayer('Layer 2');
          const polygon = defaultGroups[0]
            ?.getLayers()
            .find((layer: any) => typeof layer.getLatLngs === 'function');
          const rings = polygon?.getLatLngs() ?? [];
          return {
            activeLayerId: control.getActiveLayerId(),
            defaultCount: defaultGroups.length,
            layerTwoCount: layerTwoGroups.length,
            fillColor: polygon?.options.fillColor,
            ringCount: rings.length,
          };
        }),
      )
      .toEqual({
        activeLayerId: 'Layer 2',
        defaultCount: 1,
        layerTwoCount: 0,
        fillColor: originalFillColor,
        ringCount: 2,
      });
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
