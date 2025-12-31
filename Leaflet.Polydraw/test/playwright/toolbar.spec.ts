import { test, expect } from '@playwright/test';
import { DrawMode } from '../../src/enums';
import { gotoDemo, openToolbar, selectors, clickToolbarButton, waitForDrawMode } from './utils';

test.describe('Toolbar interactions', () => {
  test('expands and collapses the toolbar', async ({ page }) => {
    await gotoDemo(page);

    const activateButton = page.locator(selectors.activate);
    const subButtons = page.locator(selectors.subButtons);
    const getMaxHeight = async () =>
      subButtons.evaluate((el) => parseFloat(getComputedStyle(el).maxHeight) || 0);

    await expect.poll(getMaxHeight).toBe(0);

    await activateButton.click();
    await expect.poll(getMaxHeight).toBeGreaterThan(0);
    await expect(activateButton).toHaveClass(/active/);

    await activateButton.click();
    await expect.poll(getMaxHeight).toBe(0);
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
