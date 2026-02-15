import type { Page } from '@playwright/test';

type NormalizedPoint = [number, number];
type LatLngLike = { lat: number; lng: number };
type LatLngRing = LatLngLike[];
type LatLngRings = LatLngRing[];
type GeoCoord = [number, number];
type GeoBounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

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

        const getLayerRings = (layer: any): LatLngRings | null => {
          const latLngs = layer?.getLatLngs?.() as unknown;
          if (!Array.isArray(latLngs) || latLngs.length === 0) {
            return null;
          }
          const first = latLngs[0] as unknown;
          if (Array.isArray(first) && Array.isArray(first[0])) {
            return first as LatLngRings;
          }
          if (Array.isArray(first)) {
            return latLngs as LatLngRings;
          }
          return null;
        };

        let targetPolygon: any = null;
        let targetRings: LatLngRings | null = null;
        for (const fg of groups) {
          let polygon: any = null;
          let rings: LatLngRings | null = null;
          fg.eachLayer((layer: any) => {
            if (
              !polygon &&
              typeof layer?.getBounds === 'function' &&
              typeof layer?.getLatLngs === 'function'
            ) {
              const candidate = getLayerRings(layer);
              if (!candidate) {
                return;
              }
              rings = candidate;
              polygon = layer;
            }
          });
          if (!polygon) continue;
          const ringList = rings as unknown as LatLngRings | null;
          if (requireHoles && (!ringList || ringList.length <= 1)) {
            continue;
          }
          targetPolygon = polygon;
          targetRings = ringList;
          break;
        }

        if (!targetPolygon) {
          throw new Error('Target polygon not found for drag');
        }

        let startLatLng = targetPolygon.getBounds().getCenter();
        const ringSet = targetRings as unknown as LatLngRings | null;
        if (requireHoles && ringSet && ringSet.length > 1) {
          const outer = ringSet[0];
          const hole = ringSet[1];
          const mapRect = map.getContainer().getBoundingClientRect();
          const controlRect = ctrl?.getContainer?.()?.getBoundingClientRect?.() ?? null;
          const isCoveredByControl = (point: LatLngLike): boolean => {
            if (!controlRect) return false;
            const pixel = map.latLngToContainerPoint(point);
            const clientX = mapRect.left + pixel.x;
            const clientY = mapRect.top + pixel.y;
            return (
              clientX >= controlRect.left &&
              clientX <= controlRect.right &&
              clientY >= controlRect.top &&
              clientY <= controlRect.bottom
            );
          };

          const candidateCount = Math.min(outer.length, hole.length);
          const candidates: LatLngLike[] = [];
          for (let i = 0; i < candidateCount; i += 1) {
            const outerPt = outer[i] as LatLngLike | undefined;
            const holePt = hole[i] as LatLngLike | undefined;
            if (!outerPt || !holePt) continue;
            if (
              typeof outerPt.lat !== 'number' ||
              typeof outerPt.lng !== 'number' ||
              typeof holePt.lat !== 'number' ||
              typeof holePt.lng !== 'number'
            ) {
              continue;
            }
            candidates.push({
              lat: (outerPt.lat + holePt.lat) / 2,
              lng: (outerPt.lng + holePt.lng) / 2,
            });
          }

          const uncoveredCandidate = candidates.find((point) => !isCoveredByControl(point));
          if (uncoveredCandidate) {
            startLatLng = uncoveredCandidate;
          } else if (candidates.length > 0) {
            startLatLng = candidates[0];
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
        const leafletVersion = String((window as any).L?.version ?? '');
        const usePointer =
          !leafletVersion.startsWith('1.') && typeof window.PointerEvent === 'function';
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

        await new Promise((resolve) => setTimeout(resolve, 100));
      },
      { offsetLat, offsetLng, requireHoles: options.requireHoles ?? false },
    );

    await this.page.waitForTimeout(250);
  }

  /** Ensure draw mode is Off so marker interactions work */
  async ensureOffMode() {
    await this.page.evaluate(() => {
      const ctrl = (window as any).polydrawControl;
      ctrl?.setDrawMode?.(0);
    });
  }

  /** Open the polygon menu for the first menu marker */
  async openMenu() {
    await this.ensureOffMode();
    const menuMarker = this.page.locator('.polygon-marker.menu').first();
    await menuMarker.waitFor({ state: 'visible' });
    await menuMarker.click();
    await this.page
      .locator('.menu-popup .marker-menu-button')
      .first()
      .waitFor({ state: 'visible' });
  }

  /** Click a polygon menu action by data-action-id */
  async clickMenuAction(actionId: string) {
    await this.openMenu();
    const action = this.page.locator(
      `.menu-popup .marker-menu-button[data-action-id="${actionId}"]`,
    );
    await action.first().click();
    await this.page.waitForTimeout(150);
  }

  /** Start a transform mode from the polygon menu */
  async startTransform(mode: 'scale' | 'rotate') {
    await this.clickMenuAction(mode);
    await this.page.locator('.polydraw-transform-handle').first().waitFor({ state: 'visible' });
  }

  /** Drag a transform handle by pixel deltas */
  async dragTransformHandle(handle: string, deltaX: number, deltaY: number) {
    await this.page.evaluate(
      async ({ handle, deltaX, deltaY }) => {
        const el = document.querySelector(
          `.polydraw-transform-handle.handle-${handle}`,
        ) as HTMLElement | null;
        if (!el) {
          throw new Error(`Transform handle not found: ${handle}`);
        }
        const rect = el.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        const endX = startX + deltaX;
        const endY = startY + deltaY;

        const supportsPointer = typeof (window as any).PointerEvent === 'function';
        const pointerId = 1;
        const createPointer = (type: string, x: number, y: number) =>
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            pointerId,
            pointerType: 'mouse',
            isPrimary: true,
            button: type === 'pointerup' ? 0 : 0,
            buttons: type === 'pointerup' ? 0 : 1,
            pressure: type === 'pointerup' ? 0 : 0.5,
          });
        const createMouse = (type: string, x: number, y: number) =>
          new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            button: 0,
            buttons: type === 'mouseup' ? 0 : 1,
          });

        const dispatch = (type: string, x: number, y: number, target: EventTarget) => {
          if (supportsPointer) {
            target.dispatchEvent(createPointer(type, x, y));
            return;
          }
          const mouseType = type.replace('pointer', 'mouse');
          target.dispatchEvent(createMouse(mouseType, x, y));
        };

        const moveTarget = document;
        const mapTarget = document.querySelector('.leaflet-container') ?? document;
        dispatch('pointerdown', startX, startY, el);
        const steps = 8;
        for (let i = 1; i <= steps; i += 1) {
          const t = i / steps;
          const x = startX + (endX - startX) * t;
          const y = startY + (endY - startY) * t;
          dispatch('pointermove', x, y, moveTarget);
          await new Promise((resolve) => setTimeout(resolve, 16));
        }
        dispatch('pointerup', endX, endY, moveTarget);
        if (mapTarget !== moveTarget) {
          dispatch('pointerup', endX, endY, mapTarget);
        }
      },
      { handle, deltaX, deltaY },
    );
    await this.page.waitForTimeout(200);
  }

  /** Rotate by a given angle using the rotate handle */
  async rotateTransformByDegrees(degrees: number) {
    await this.page.evaluate(async (deg) => {
      const handle = document.querySelector(
        '.polydraw-transform-handle.handle-rotate',
      ) as HTMLElement | null;
      const box = document.querySelector('.polydraw-transform-box') as HTMLElement | null;
      if (!handle || !box) {
        throw new Error('Rotate handle or box not found');
      }

      const handleRect = handle.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      const centerX = boxRect.left + boxRect.width / 2;
      const centerY = boxRect.top + boxRect.height / 2;
      const startX = handleRect.left + handleRect.width / 2;
      const startY = handleRect.top + handleRect.height / 2;
      const radius = Math.hypot(startX - centerX, startY - centerY);
      const startAngle = Math.atan2(startY - centerY, startX - centerX);
      const targetAngle = startAngle + (deg * Math.PI) / 180;
      const endX = centerX + radius * Math.cos(targetAngle);
      const endY = centerY + radius * Math.sin(targetAngle);

      const supportsPointer = typeof (window as any).PointerEvent === 'function';
      const pointerId = 1;
      const createPointer = (type: string, x: number, y: number) =>
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          pointerId,
          pointerType: 'mouse',
          isPrimary: true,
          button: type === 'pointerup' ? 0 : 0,
          buttons: type === 'pointerup' ? 0 : 1,
          pressure: type === 'pointerup' ? 0 : 0.5,
        });
      const createMouse = (type: string, x: number, y: number) =>
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 0,
          buttons: type === 'mouseup' ? 0 : 1,
        });
      const dispatch = (type: string, x: number, y: number, target: EventTarget) => {
        if (supportsPointer) {
          target.dispatchEvent(createPointer(type, x, y));
          return;
        }
        const mouseType = type.replace('pointer', 'mouse');
        target.dispatchEvent(createMouse(mouseType, x, y));
      };
      const moveTarget = document;
      const mapTarget = document.querySelector('.leaflet-container') ?? document;
      dispatch('pointerdown', startX, startY, handle);
      const steps = 10;
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        const x = startX + (endX - startX) * t;
        const y = startY + (endY - startY) * t;
        dispatch('pointermove', x, y, moveTarget);
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
      dispatch('pointerup', endX, endY, moveTarget);
      if (mapTarget !== moveTarget) {
        dispatch('pointerup', endX, endY, mapTarget);
      }
    }, degrees);

    await this.page.waitForTimeout(200);
  }

  /** Confirm a transform operation */
  async confirmTransform() {
    const confirm = this.page.locator('.polydraw-transform-confirm');
    await confirm.waitFor({ state: 'visible' });
    await confirm.click();
    await this.page.locator('.polydraw-transform-root').waitFor({ state: 'detached' });
  }

  /** Undo the last operation */
  async undo() {
    await this.page.evaluate(async () => {
      const ctrl = (window as any).polydrawControl;
      await ctrl?.undo?.();
    });
    await this.page.waitForTimeout(150);
  }

  /** Redo the last undone operation */
  async redo() {
    await this.page.evaluate(async () => {
      const ctrl = (window as any).polydrawControl;
      await ctrl?.redo?.();
    });
    await this.page.waitForTimeout(150);
  }

  /** Return the primary polygon coordinates (GeoJSON order: [lng, lat]) */
  async getPrimaryPolygonCoordinates(): Promise<GeoCoord[]> {
    return this.page.evaluate(() => {
      const ctrl = (window as any).polydrawControl;
      const groups = ctrl?.getFeatureGroups?.() ?? [];
      if (!groups.length) return [];
      const geojson = groups[0].toGeoJSON() as any;
      const features = Array.isArray(geojson?.features) ? geojson.features : [geojson];
      const geom = features[0]?.geometry;
      if (!geom || !geom.coordinates) return [];
      if (geom.type === 'Polygon') {
        return Array.isArray(geom.coordinates[0]) ? geom.coordinates[0] : [];
      }
      if (geom.type === 'MultiPolygon') {
        return Array.isArray(geom.coordinates[0]?.[0]) ? geom.coordinates[0][0] : [];
      }
      return [];
    });
  }

  /** Return vertex count for the primary polygon ring */
  async getPrimaryPolygonVertexCount(): Promise<number> {
    const coords = await this.getPrimaryPolygonCoordinates();
    return coords.length;
  }

  /** Return bounds for the primary polygon ring */
  async getPrimaryPolygonBounds(): Promise<GeoBounds> {
    const coords = await this.getPrimaryPolygonCoordinates();
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    coords.forEach(([lng, lat]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
    return { minLat, maxLat, minLng, maxLng };
  }
}

export const selectors = {
  activate: '[data-polydraw="activate-button"]',
  draw: '[data-polydraw="draw-button"]',
};
