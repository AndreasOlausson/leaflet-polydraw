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

  /** Drag a polygon by a lat/lng offset (optionally target polygons with holes). */
  async dragPolygonByOffset(
    offsetLat: number,
    offsetLng: number,
    options: { requireHoles?: boolean } = {},
  ) {
    await this.page.evaluate(
      async ({ offsetLat: latOffset, offsetLng: lngOffset, requireHoles }) => {
        const ctrl = (window as any).polydrawControl;
        ctrl?.setDrawMode?.(0);

        const map = ctrl?.map ?? ctrl?._map;
        const groups = ctrl?.getFeatureGroups?.() ?? [];
        if (!map || !groups.length) {
          throw new Error('Map or feature groups not ready');
        }

        let targetPolygon: any = null;
        let targetRings: any[] | null = null;
        for (const fg of groups) {
          let polygon: any = null;
          let rings: any[] | null = null;
          fg.eachLayer((layer: any) => {
            if (
              !polygon &&
              typeof layer?.getBounds === 'function' &&
              typeof layer?.getLatLngs === 'function'
            ) {
              const latLngs = layer.getLatLngs?.();
              if (!Array.isArray(latLngs) || latLngs.length === 0) {
                return;
              }
              // Normalize: MultiPolygon -> first polygon rings; Polygon -> rings
              if (Array.isArray(latLngs[0]) && Array.isArray(latLngs[0][0])) {
                rings = latLngs[0];
              } else if (Array.isArray(latLngs[0])) {
                rings = latLngs;
              } else {
                return;
              }
              polygon = layer;
            }
          });
          if (!polygon) continue;
          if (requireHoles && (!rings || rings.length <= 1)) {
            continue;
          }
          targetPolygon = polygon;
          targetRings = rings;
          break;
        }

        if (!targetPolygon) {
          throw new Error('Target polygon not found for drag');
        }

        let startLatLng = targetPolygon.getBounds().getCenter();
        if (requireHoles && targetRings && targetRings.length > 1) {
          const outer = targetRings[0];
          const hole = targetRings[1];
          const outerPt = outer?.[0];
          const holePt = hole?.[0];
          if (outerPt && holePt && typeof outerPt.lat === 'number' && typeof holePt.lat === 'number') {
            startLatLng = {
              lat: (outerPt.lat + holePt.lat) / 2,
              lng: (outerPt.lng + holePt.lng) / 2,
            };
          }
        }

        const target = { lat: startLatLng.lat + latOffset, lng: startLatLng.lng + lngOffset };
        const startPt = map.latLngToContainerPoint(startLatLng);
        const endPt = map.latLngToContainerPoint(target);
        const rect = map.getContainer().getBoundingClientRect();
        const start = { x: rect.left + startPt.x, y: rect.top + startPt.y };
        const end = { x: rect.left + endPt.x, y: rect.top + endPt.y };

        const pathTarget = targetPolygon._path as HTMLElement | undefined;
        const downTarget =
          pathTarget ?? document.elementFromPoint(start.x, start.y) ?? map.getContainer();
        const moveTarget = map.getContainer();
        const usePointer = typeof window.PointerEvent === 'function';
        const isTouch = (navigator.maxTouchPoints || 0) > 0;

        const dispatchPointer = (type: string, x: number, y: number, targetEl: Element) => {
          if (usePointer) {
            const event = new PointerEvent(type, {
              clientX: x,
              clientY: y,
              bubbles: true,
              cancelable: true,
              pointerType: isTouch ? 'touch' : 'mouse',
              isPrimary: true,
              button: 0,
              buttons: type === 'pointerup' ? 0 : 1,
            });
            targetEl.dispatchEvent(event);
          } else {
            const mouseType = type.replace('pointer', 'mouse');
            const event = new MouseEvent(mouseType, {
              clientX: x,
              clientY: y,
              bubbles: true,
              cancelable: true,
              button: 0,
              buttons: type === 'pointerup' ? 0 : 1,
            });
            targetEl.dispatchEvent(event);
          }
        };

        dispatchPointer('pointerdown', start.x, start.y, downTarget);
        const steps = 8;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const x = start.x + (end.x - start.x) * t;
          const y = start.y + (end.y - start.y) * t;
          dispatchPointer('pointermove', x, y, moveTarget);
          await new Promise((resolve) => setTimeout(resolve, 16));
        }
        dispatchPointer('pointerup', end.x, end.y, moveTarget);
      },
      { offsetLat, offsetLng, requireHoles: options.requireHoles ?? false },
    );

    await this.page.waitForTimeout(250);
  }
}

export const selectors = {
  activate: '[data-polydraw="activate-button"]',
  draw: '[data-polydraw="draw-button"]',
};
