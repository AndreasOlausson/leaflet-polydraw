import { test, expect } from '@playwright/test';
import { DrawMode } from '../../src/enums';
import {
  gotoDemo,
  openToolbar,
  selectors,
  clickToolbarButton,
  drawPointToPointPolygon,
  drawPointToPointPolygonWithOffsetDoubleTap,
  waitForPolygonCount,
  waitForDrawMode,
  seedPolygon,
} from './utils';

test.describe('Point-to-point modes', () => {
  test('point-to-point draw adds a polygon', async ({ page }) => {
    await gotoDemo(page);
    await openToolbar(page);

    await clickToolbarButton(page, selectors.p2p);
    await waitForDrawMode(page, DrawMode.PointToPoint);
    await drawPointToPointPolygon(page);
    await waitForPolygonCount(page, 1);
  });

  test('point-to-point subtract removes existing polygon', async ({ page }) => {
    await gotoDemo(page);
    await openToolbar(page);

    await seedPolygon(page);

    await clickToolbarButton(page, selectors.p2pSubtract);
    await waitForDrawMode(page, DrawMode.PointToPointSubtract);
    await drawPointToPointPolygon(page, [
      [0.45, 0.45],
      [0.55, 0.45],
      [0.5, 0.55],
    ]);

    await waitForPolygonCount(page, 0);
  });
});

test.describe('Point-to-point touch close', () => {
  test.use({ hasTouch: true });

  test('double-tap near last point closes polygon', async ({ page }) => {
    await gotoDemo(page);
    await openToolbar(page);

    await clickToolbarButton(page, selectors.p2p);
    await waitForDrawMode(page, DrawMode.PointToPoint);

    await drawPointToPointPolygonWithOffsetDoubleTap(page, { offsetPx: 24, tapDelayMs: 80 });
    await waitForPolygonCount(page, 1);
  });
});
