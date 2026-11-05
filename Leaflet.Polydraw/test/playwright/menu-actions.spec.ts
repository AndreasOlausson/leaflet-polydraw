import { test, expect } from '@playwright/test';
import { DemoFactory } from './mock-factory';
import { latlngPolys } from './fixtures/polygons';

test.describe('Polygon menu actions', () => {
  test.beforeEach(async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.goto();
    await demo.clearPolygons();
  });

  test('uses the compact light action-panel theme', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([latlngPolys.diamond]);
    await demo.openMenu();

    const theme = await page.locator('.alter-marker-outer-wrapper').evaluate((outer) => {
      const wrapper = outer.querySelector<HTMLElement>('.alter-marker-wrapper')!;
      const close = outer.querySelector<HTMLElement>('.marker-menu-close')!;
      const button = outer.querySelector<HTMLElement>('.marker-menu-button')!;
      const outerStyle = getComputedStyle(outer);
      const wrapperStyle = getComputedStyle(wrapper);
      const closeStyle = getComputedStyle(close);
      const buttonStyle = getComputedStyle(button);
      const iconStyle = getComputedStyle(button, '::before');
      return {
        outerBackground: outerStyle.backgroundColor,
        wrapperBackground: wrapperStyle.backgroundColor,
        closeColor: closeStyle.color,
        buttonBackground: buttonStyle.backgroundColor,
        hasButtonIcon: iconStyle.backgroundImage !== 'none',
        iconOpacity: iconStyle.opacity,
        hasNativeTitle: button.hasAttribute('title'),
        tooltipText: button.querySelector('.marker-menu-tooltip')?.textContent,
        borderRadius: outerStyle.borderRadius,
      };
    });

    expect(theme).toEqual({
      outerBackground: 'rgb(248, 250, 252)',
      wrapperBackground: 'rgb(248, 250, 252)',
      closeColor: 'rgb(51, 65, 85)',
      buttonBackground: 'rgb(238, 242, 247)',
      hasButtonIcon: true,
      iconOpacity: '0.72',
      hasNativeTitle: false,
      tooltipText: 'Simplify',
      borderRadius: '8px',
    });

    const button = page.locator('.marker-menu-button').first();
    const tooltip = button.locator('.marker-menu-tooltip');
    await button.hover();
    await expect(tooltip).toHaveCSS('opacity', '1');
    const buttonBox = await button.boundingBox();
    const tooltipBox = await tooltip.boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(tooltipBox).not.toBeNull();
    expect(tooltipBox!.y).toBeGreaterThan(buttonBox!.y + buttonBox!.height);
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

  test('simplify keeps an inactive-layer polygon in its owning layer', async ({ page }) => {
    await page.evaluate(async (polygon) => {
      const control = (window as any).polydrawControl;
      control.createDrawLayer({ id: 'Layer 1', color: '#ef4444' });
      await control.addPredefinedPolygon([[polygon]]);
      const layerOneFeature = control.getFeatureGroupsByLayer('Layer 1')[0];

      control.createDrawLayer({ id: 'Layer 2', color: '#3b82f6' });
      await control.addPredefinedPolygon([[polygon]]);
      control.setDrawMode(0);

      const menuMarker = layerOneFeature.getLayers().find((layer: any) => {
        const className = layer.options?.icon?.options?.className ?? '';
        return typeof layer.fire === 'function' && className.includes('menu');
      });
      if (!menuMarker) {
        throw new Error('Layer 1 menu marker not found');
      }
      const menuElement = menuMarker.getElement?.();
      if (!menuElement) {
        throw new Error('Layer 1 menu marker element not found');
      }
      menuElement.dataset.testLayerMenu = 'layer-1';
    }, latlngPolys.bigSquareDense);

    await page.locator('[data-test-layer-menu="layer-1"]').click();
    const simplify = page.locator('.menu-popup .marker-menu-button[data-action-id="simplify"]');
    await simplify.waitFor({ state: 'visible' });
    await simplify.click();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const control = (window as any).polydrawControl;
          const inspectLayer = (layerId: string) => {
            const groups = control.getFeatureGroupsByLayer(layerId);
            const polygon = groups[0]
              ?.getLayers()
              .find((layer: any) => typeof layer.getLatLngs === 'function');
            return {
              count: groups.length,
              fillColor: polygon?.options.fillColor,
            };
          };
          return {
            activeLayerId: control.getActiveLayerId(),
            total: control.getFeatureGroups().length,
            layerOne: inspectLayer('Layer 1'),
            layerTwo: inspectLayer('Layer 2'),
          };
        }),
      )
      .toEqual({
        activeLayerId: 'Layer 2',
        total: 2,
        layerOne: { count: 1, fillColor: '#ef4444' },
        layerTwo: { count: 1, fillColor: '#3b82f6' },
      });
  });
});
