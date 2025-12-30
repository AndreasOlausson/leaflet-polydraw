import type { Page } from '@playwright/test';

type NormalizedPoint = [number, number];

/**
 * DemoFactory centralizes common Playwright actions against the demo app:
 * - loading the demo
 * - clearing polygons
 * - toggling merge
 * - adding polygons via the public API
 * - drawing freehand in screen space (normalized coords)
 *
 * Using this helper keeps tests short and consistent.
 */
export class DemoFactory {
  constructor(private page: Page) {}

  /** Load the demo page and wait for the map */
  async goto() {
    await this.page.goto('http://127.0.0.1:4173/');
    await this.page.waitForSelector('#map');
  }

  /** Remove all polygons from the control */
  async clearPolygons() {
    await this.page.evaluate(() => {
      const ctrl = (window as any).polydrawControl;
      if (!ctrl) return;
      if (typeof ctrl.removeAllFeatureGroups === 'function') {
        ctrl.removeAllFeatureGroups();
        return;
      }
      if (ctrl.arrayOfFeatureGroups && typeof ctrl.removeFeatureGroup === 'function') {
        ctrl.arrayOfFeatureGroups.forEach((fg: any) => ctrl.removeFeatureGroup(fg));
      }
    });
  }

  /** Toggle mergePolygons at runtime */
  async setMerge(enabled: boolean) {
    await this.page.evaluate((val) => {
      const ctrl = (window as any).polydrawControl;
      if (ctrl && ctrl.config) ctrl.config.mergePolygons = val;
    }, enabled);
  }

  /** Click a toolbar button by selector */
  async clickToolbarButton(selector: string) {
    await this.page.locator(selector).click();
  }

  /** Get polygon count from the control */
  async polygonCount(): Promise<number> {
    return this.page.evaluate(() => {
      const ctrl = (window as any).polydrawControl;
      return ctrl?.getFeatureGroups().length ?? 0;
    });
  }

  /** Return array of polygon GeoJSON for inspection */
  async getPolygons(): Promise<any[]> {
    return this.page.evaluate(() => {
      const ctrl = (window as any).polydrawControl;
      const groups = ctrl?.getFeatureGroups() ?? [];
      return groups.map((fg: any) => fg.toGeoJSON());
    });
  }

  /** Draw via pointer moves (normalized viewport points 0-1). Adjust speedMs for slower/faster paths. */
  async drawFreehand(points: NormalizedPoint[], speedMs = 10) {
    const hasControl = await this.page.evaluate(() => !!(window as any).polydrawControl);
    if (!hasControl) {
      throw new Error('polydrawControl not ready');
    }

    // Ensure we are in Add mode before drawing to avoid missing events
    await this.page.evaluate(() => {
      const ctrl = (window as any).polydrawControl;
      ctrl?.setDrawMode?.(1);
    });
    await this.page.waitForTimeout(50);

    const map = this.page.locator('#map');
    const box = await map.boundingBox();
    if (!box) throw new Error('Map bounds not found');
    await map.scrollIntoViewIfNeeded();
    const toScreen = (nx: number, ny: number) => ({
      x: box.x + nx * box.width,
      y: box.y + ny * box.height,
    });

    const [startNx, startNy] = points[0];
    const start = toScreen(startNx, startNy);
    await this.page.mouse.move(start.x, start.y);
    await this.page.mouse.down();
    for (const [nx, ny] of points.slice(1)) {
      const p = toScreen(nx, ny);
      await this.page.mouse.move(p.x, p.y, { steps: 5 });
      await this.page.waitForTimeout(speedMs);
    }
    await this.page.mouse.up();
    await this.page.waitForTimeout(200);
  }

  /** Add a predefined polygon via the public API */
  async addPredefined(rings: { lat: number; lng: number }[][]) {
    await this.page.evaluate(async (poly) => {
      const ctrl = (window as any).polydrawControl;
      if (ctrl?.addPredefinedPolygon) await ctrl.addPredefinedPolygon([poly] as any);
    }, rings);
    await this.page.waitForTimeout(100);
  }
}

export const selectors = {
  activate: '[data-polydraw="activate-button"]',
  draw: '[data-polydraw="draw-button"]',
};
