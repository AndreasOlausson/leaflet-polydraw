import { test, expect } from '@playwright/test';
import { DrawMode } from '../../src/enums';
import { gotoDemo, openToolbar, selectors, clickToolbarButton, waitForDrawMode } from './utils';

test.describe('Toolbar interactions', () => {
  test('expands and collapses the toolbar', async ({ page }) => {
    await gotoDemo(page);

    const activateButton = page.locator(selectors.activate);
    const subButtons = page.locator(selectors.subButtons);

    await expect(subButtons).toHaveCSS('max-height', '0px');

    await activateButton.click();
    await expect(subButtons).toHaveCSS('max-height', '250px');
    await expect(activateButton).toHaveClass(/active/);

    await activateButton.click();
    await expect(subButtons).toHaveCSS('max-height', '0px');
    await expect(activateButton).not.toHaveClass(/active/);
  });

  test('draw and subtract buttons indicate active mode', async ({ page }) => {
    await gotoDemo(page);
    await openToolbar(page);

    const drawButton = page.locator(selectors.draw);
    const subtractButton = page.locator(selectors.subtract);

    await clickToolbarButton(page, selectors.draw);
    await waitForDrawMode(page, DrawMode.Add);
    await expect(drawButton).toHaveClass(/active/);
    await expect(subtractButton).not.toHaveClass(/active/);

    await clickToolbarButton(page, selectors.subtract);
    await waitForDrawMode(page, DrawMode.Subtract);
    await expect(subtractButton).toHaveClass(/active/);
    await expect(drawButton).not.toHaveClass(/active/);
  });
});
