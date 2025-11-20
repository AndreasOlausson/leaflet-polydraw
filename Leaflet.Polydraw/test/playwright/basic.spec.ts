import { test, expect } from '@playwright/test';

test.describe('Polydraw demo smoke test', () => {
  test('renders map and status panel', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#map')).toBeVisible();
    await expect(page.locator('#polydraw-status')).toBeVisible();
    await expect(page.locator('#leaflet-version-detection')).toContainText('Polydraw Version');
  });
});
