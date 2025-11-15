import { test, expect } from '@playwright/test';
import { gotoDemo, openToolbar, selectors, clickToolbarButton, seedPolygon, waitForPolygonCount } from './utils';

test.describe('Polygon management', () => {
  test('indicator appears when polygons exist', async ({ page }) => {
    await gotoDemo(page);
    await openToolbar(page);

    const activateButton = page.locator(selectors.activate);
    await seedPolygon(page);

    // Collapse toolbar to trigger indicator
    await activateButton.click();
    await expect(activateButton).toHaveClass(/polydraw-indicator-active/);

    // Reopen toolbar clears indicator
    await activateButton.click();
    await expect(activateButton).not.toHaveClass(/polydraw-indicator-active/);
  });

  test('erase button removes polygons', async ({ page }) => {
    await gotoDemo(page);
    await openToolbar(page);
    await seedPolygon(page);

    await clickToolbarButton(page, selectors.erase);
    await waitForPolygonCount(page, 0);

    const count = await page.evaluate(() => {
      const control = (window as any).polydrawControl;
      return control?.getFeatureGroups().length ?? 0;
    });
    expect(count).toBe(0);
  });
});
