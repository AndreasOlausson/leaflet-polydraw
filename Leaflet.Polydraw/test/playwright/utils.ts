import type { Page } from '@playwright/test';
import { DrawMode } from '../../src/enums';

export const selectors = {
  activate: '[data-polydraw="activate-button"]',
  draw: '[data-polydraw="draw-button"]',
  subtract: '[data-polydraw="subtract-button"]',
  p2p: '[data-polydraw="p2p-button"]',
  p2pSubtract: '[data-polydraw="p2p-subtract-button"]',
  erase: '[data-polydraw="erase-button"]',
  subButtons: '[data-polydraw="sub-buttons"]',
};

type NormalizedPoint = [number, number];

const DEFAULT_P2P_POINTS: NormalizedPoint[] = [
  [0.3, 0.4],
  [0.7, 0.4],
  [0.5, 0.7],
];

function toViewportPoints(
  box: { x: number; y: number; width: number; height: number },
  points: NormalizedPoint[],
) {
  return points.map(([nx, ny]) => ({
    x: box.x + nx * box.width,
    y: box.y + ny * box.height,
  }));
}

export async function gotoDemo(page: Page) {
  await page.goto('/');
  await page.waitForSelector('#map');
}

export async function openToolbar(page: Page) {
  await page.locator(selectors.activate).click();
  await page.locator(selectors.subButtons).waitFor({ state: 'visible' });
}

export async function clickToolbarButton(page: Page, selector: string) {
  await page.locator(selector).click();
}

export async function getPolygonCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const control = (window as any).polydrawControl;
    return control?.getFeatureGroups().length ?? 0;
  });
}

export async function waitForPolygonCount(page: Page, expected: number) {
  await page.waitForFunction((exp) => {
    const control = (window as any).polydrawControl;
    return (control?.getFeatureGroups().length ?? 0) === exp;
  }, expected);
}

async function getMapBox(page: Page) {
  const map = page.locator('#map');
  const box = await map.boundingBox();
  if (!box) {
    throw new Error('Map bounds not found');
  }
  return box;
}

export async function drawPointToPointPolygon(
  page: Page,
  points: NormalizedPoint[] = DEFAULT_P2P_POINTS,
) {
  const box = await getMapBox(page);
  await page.locator('#map').scrollIntoViewIfNeeded();
  const coords = toViewportPoints(box, points);
  for (const point of coords.slice(0, -1)) {
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(50);
  }
  const last = coords[coords.length - 1];
  await page.mouse.dblclick(last.x, last.y);
  await page.waitForTimeout(300);
}

export async function getPrimaryPolygonRingCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const control = (window as any).polydrawControl;
    const groups = control?.getFeatureGroups() ?? [];
    if (!groups.length) return 0;
    let ringCount = 0;
    groups[0].eachLayer((layer: any) => {
      if (typeof layer?.getLatLngs === 'function') {
        const latLngs = layer.getLatLngs();
        if (Array.isArray(latLngs)) {
          ringCount = latLngs.length;
        }
      }
    });
    return ringCount;
  });
}

export async function seedPolygon(page: Page) {
  await page.evaluate(() => {
    const control = (window as any).polydrawControl;
    if (!control) return;
    const ring = [
      { lat: 58.404, lng: 15.595 },
      { lat: 58.404, lng: 15.605 },
      { lat: 58.398, lng: 15.605 },
      { lat: 58.398, lng: 15.595 },
      { lat: 58.404, lng: 15.595 },
    ];
    control.addPredefinedPolygon([[ring]]);
  });
  await waitForPolygonCount(page, 1);
}

export async function waitForDrawMode(page: Page, mode: DrawMode) {
  await page.waitForFunction((expected) => {
    const control = (window as any).polydrawControl;
    return control?.getDrawMode() === expected;
  }, mode);
}
