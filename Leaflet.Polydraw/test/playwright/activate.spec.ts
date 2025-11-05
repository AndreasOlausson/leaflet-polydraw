import { test, expect } from '@playwright/test';

test.describe('Polydraw activation', () => {
  test('activates the toolbar', async ({ page }) => {
    await page.goto('/');

    const activateButton = page.locator('.icon-activate');
    await expect(activateButton).toBeVisible();
    await activateButton.click();

    const subButtons = page.locator('.sub-buttons');
    await expect(subButtons).toBeVisible();
    await expect(subButtons).toHaveCSS('max-height', '250px');
    await expect(activateButton).toHaveClass(/active/);
  });
});
