import { test, expect } from '@playwright/test';
import { DemoFactory } from './mock-factory';
import { latlngPolys } from './fixtures/polygons';

test.describe('Layer panel', () => {
  test.beforeEach(async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.goto();
    await demo.clearPolygons();
  });

  test('creates and selects independent draw layers', async ({ page }) => {
    const demo = new DemoFactory(page);
    const panel = page.locator('[data-polydraw="layer-panel"]');

    await expect(panel).toBeVisible();
    await expect(panel.locator('.polydraw-layer-panel-body')).toBeVisible();

    await panel.locator('.polydraw-layer-add-draw').click();
    await panel.locator('.polydraw-layer-add-draw').click();
    await panel.locator('[data-layer-id="Layer 1"]').click();
    await demo.addPredefined([latlngPolys.overlapA]);
    await panel.locator('[data-layer-id="Layer 2"]').click();
    await demo.addPredefined([latlngPolys.overlapB]);

    const state = await page.evaluate(() => {
      const control = (window as any).polydrawControl;
      const manager = control.getLayerManager();
      return {
        activeLayerId: control.getActiveLayerId(),
        featureCount: control.getFeatureGroups().length,
        layer1Features: manager.getFeatureGroupsForLayer('Layer 1').length,
        layer2Features: manager.getFeatureGroupsForLayer('Layer 2').length,
      };
    });

    expect(state).toEqual({
      activeLayerId: 'Layer 2',
      featureCount: 2,
      layer1Features: 1,
      layer2Features: 1,
    });
  });

  test('changes a layer name and color from the layer settings dialog', async ({ page }) => {
    const demo = new DemoFactory(page);
    const panel = page.locator('[data-polydraw="layer-panel"]');

    await panel.locator('.polydraw-layer-add-draw').click();
    await demo.addPredefined([latlngPolys.square]);
    await panel.locator('[data-layer-id="Layer 1"] .polydraw-layer-edit').click();

    const dialog = page.locator('.polydraw-layer-dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type="text"]').fill('Survey edits');
    await dialog.locator('[data-color="#3366cc"]').click();
    await dialog.locator('.polydraw-layer-dialog-apply').click();

    await expect(dialog).toHaveCount(0);
    await expect(panel.locator('[data-layer-id="Layer 1"] .polydraw-layer-name')).toHaveText(
      'Survey edits',
    );

    const updated = await page.evaluate(() => {
      const control = (window as any).polydrawControl;
      const layer = control.getLayerById('Layer 1');
      return { label: layer.label, color: layer.color };
    });
    expect(updated).toEqual({ label: 'Survey edits', color: '#3366cc' });

    await page.evaluate(async () => {
      await (window as any).polydrawControl.undo();
    });
    await expect(panel.locator('[data-layer-id="Layer 1"] .polydraw-layer-name')).toHaveText(
      'Layer 1',
    );
  });

  test('merges a complete draw layer from the layer settings dialog', async ({ page }) => {
    const demo = new DemoFactory(page);
    const panel = page.locator('[data-polydraw="layer-panel"]');

    await page.evaluate(() => {
      (window as any).polydrawControl.createDrawLayer({ id: 'Target' });
    });
    await demo.addPredefined([latlngPolys.overlapA]);
    await page.evaluate(() => {
      (window as any).polydrawControl.createDrawLayer({ id: 'Source' });
    });
    await demo.addPredefined([latlngPolys.overlapB]);

    await panel.locator('[data-layer-id="Source"] .polydraw-layer-edit').click();
    const dialog = page.locator('.polydraw-layer-dialog');
    const settingsActions = dialog.locator(
      '.polydraw-layer-dialog-actions:not(.polydraw-layer-merge-actions)',
    );
    const mergeActions = dialog.locator('.polydraw-layer-merge-actions');
    await expect(settingsActions).toBeVisible();
    await expect(mergeActions).toBeHidden();
    await dialog.locator('.polydraw-layer-dialog-merge').click();
    await expect(dialog.locator('h2')).toHaveText('Merge layer');
    await expect(settingsActions).toBeHidden();
    await expect(mergeActions).toBeVisible();
    await expect(dialog.locator('.polydraw-layer-merge-target-style')).not.toBeChecked();
    await dialog.locator('.polydraw-layer-merge-option[data-layer-id="Target"]').click();
    await dialog.locator('.polydraw-layer-merge-apply').click();

    await expect(dialog).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const control = (window as any).polydrawControl;
          return {
            sourceExists: control.hasLayer('Source'),
            targetFeatures: control.getFeatureGroupsByLayer('Target').length,
            activeLayerId: control.getActiveLayerId(),
          };
        }),
      )
      .toEqual({ sourceExists: false, targetFeatures: 1, activeLayerId: 'Target' });

    await page.evaluate(async () => {
      await (window as any).polydrawControl.undo();
    });
    await expect(panel.locator('[data-layer-id="Source"]')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const control = (window as any).polydrawControl;
          return {
            sourceFeatures: control.getFeatureGroupsByLayer('Source').length,
            targetFeatures: control.getFeatureGroupsByLayer('Target').length,
          };
        }),
      )
      .toEqual({ sourceFeatures: 1, targetFeatures: 1 });
  });

  test('merges an enabled reference source into a draw layer', async ({ page }) => {
    const panel = page.locator('[data-polydraw="layer-panel"]');

    await page.evaluate(
      async (polygons) => {
        const feature = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'MultiPolygon',
            coordinates: polygons.map((ring) => [ring.map(({ lat, lng }) => [lng, lat])]),
          },
        };
        await (window as any).polydrawControl.addPredefinedGeoJSONs([feature], {
          layer: {
            id: 'Reference source',
            role: 'reference',
            interaction: 'readonly',
          },
          overrides: {
            style: { color: '#991b1b', fillColor: '#ef4444', fillOpacity: 0.18 },
          },
        });
      },
      [latlngPolys.square, latlngPolys.smallSquare],
    );

    await panel.locator('[data-layer-id="Reference source"] .polydraw-layer-edit').click();
    const dialog = page.locator('.polydraw-layer-dialog');
    await expect(dialog.locator('.polydraw-layer-dialog-merge')).toBeVisible();
    await dialog.locator('.polydraw-layer-dialog-merge').click();
    await dialog.locator('.polydraw-layer-merge-option[data-layer-id="default"]').click();
    await dialog.locator('.polydraw-layer-merge-target-style').check();
    await dialog.locator('.polydraw-layer-merge-apply').click();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const control = (window as any).polydrawControl;
          const featureGroups = control.getFeatureGroupsByLayer('default');
          const polygon = featureGroups[0]
            ?.getLayers()
            .find((layer: any) => typeof layer?.setStyle === 'function');
          const marker = featureGroups[0]
            ?.getLayers()
            .find((layer: any) => layer?.options?.draggable === true);
          return {
            sourceExists: control.hasLayer('Reference source'),
            defaultFeatures: featureGroups.length,
            editable: featureGroups.every((featureGroup: any) =>
              control.getLayerManager().isFeatureGroupEditable(featureGroup),
            ),
            markerCounts: featureGroups.map(
              (featureGroup: any) =>
                featureGroup.getLayers().filter((layer: any) => layer?.options?.draggable === true)
                  .length,
            ),
            styleOverrides: featureGroups[0]?._polydrawMetadata?.styleOverrides,
            fillColor: polygon?.options.fillColor,
            markerBackground: marker?.getElement()?.style.backgroundColor,
            targetColor: control.getLayerById('default').color,
          };
        }),
      )
      .toEqual({
        sourceExists: false,
        defaultFeatures: 2,
        editable: true,
        markerCounts: [4, 4],
        styleOverrides: undefined,
        fillColor: '#b4cd8a',
        markerBackground: 'rgb(229, 238, 214)',
        targetColor: '#50622b',
      });
  });

  test('promotes a reference source into a new named draw layer', async ({ page }) => {
    const panel = page.locator('[data-polydraw="layer-panel"]');

    await page.evaluate(async (ring) => {
      await (window as any).polydrawControl.addPredefinedGeoJSONs(
        [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [ring.map(({ lat, lng }) => [lng, lat])],
            },
          },
        ],
        {
          layer: {
            id: 'Flood reference',
            role: 'reference',
            interaction: 'readonly',
          },
          overrides: {
            style: { color: '#991b1b', fillColor: '#ef4444', fillOpacity: 0.18 },
          },
        },
      );
    }, latlngPolys.square);

    await panel.locator('[data-layer-id="Flood reference"] .polydraw-layer-edit').click();
    const dialog = page.locator('.polydraw-layer-dialog');
    await dialog.locator('.polydraw-layer-dialog-merge').click();
    await dialog.locator('.polydraw-layer-merge-option-new').click();
    await expect(dialog.locator('.polydraw-layer-merge-style-choice')).toBeHidden();
    await expect(dialog.locator('.polydraw-layer-new-name-input')).toHaveValue('Flood reference');
    await dialog.locator('.polydraw-layer-new-name-input').fill('Flood edits');
    await dialog.locator('.polydraw-layer-merge-apply').click();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const control = (window as any).polydrawControl;
          const target = control
            .getAllLayers()
            .find((candidate: any) => candidate.label === 'Flood edits');
          const featureGroups = target ? control.getFeatureGroupsByLayer(target.id) : [];
          return {
            sourceExists: control.hasLayer('Flood reference'),
            targetId: target?.id,
            targetRole: target?.role,
            targetFeatures: featureGroups.length,
            editable:
              featureGroups.length === 1 &&
              control.getLayerManager().isFeatureGroupEditable(featureGroups[0]),
            activeLayerId: control.getActiveLayerId(),
            fillColor: featureGroups[0]?._polydrawMetadata?.styleOverrides?.fillColor,
          };
        }),
      )
      .toEqual({
        sourceExists: false,
        targetId: 'Layer 1',
        targetRole: 'draw',
        targetFeatures: 1,
        editable: true,
        activeLayerId: 'Layer 1',
        fillColor: '#ef4444',
      });

    await page.evaluate(async () => {
      await (window as any).polydrawControl.undo();
    });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const control = (window as any).polydrawControl;
          return {
            sourceRole: control.getLayerById('Flood reference')?.role,
            sourceFeatures: control.getFeatureGroupsByLayer('Flood reference').length,
            promotedLayerExists: control.hasLayer('Layer 1'),
          };
        }),
      )
      .toEqual({
        sourceRole: 'reference',
        sourceFeatures: 1,
        promotedLayerExists: false,
      });
  });

  test('moves a polygon to another draw layer from its action menu', async ({ page }) => {
    const demo = new DemoFactory(page);
    await page.evaluate(() => {
      (window as any).polydrawControl.createDrawLayer({
        id: 'Source layer',
        color: '#ef4444',
      });
    });
    await demo.addPredefined([latlngPolys.square]);
    await page.evaluate(() => {
      (window as any).polydrawControl.createDrawLayer({
        id: 'Survey edits',
        color: '#3b82f6',
      });
      (window as any).polydrawControl.setActiveLayer('Source layer');
    });

    await demo.clickMenuAction('moveToLayer');
    const picker = page.locator('.polygon-layer-picker');
    await expect(picker).toBeVisible();
    await expect(picker.locator('[data-layer-id="Survey edits"]')).toBeVisible();
    await picker.locator('[data-layer-id="Survey edits"]').click();
    await picker.locator('.polygon-layer-apply').click();

    await expect(picker).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const control = (window as any).polydrawControl;
          return {
            activeLayerId: control.getActiveLayerId(),
            sourceExists: control.hasLayer('Source layer'),
            targetFeatures: control.getFeatureGroupsByLayer('Survey edits').length,
          };
        }),
      )
      .toEqual({ activeLayerId: 'Survey edits', sourceExists: false, targetFeatures: 1 });

    await page.evaluate(async () => {
      await (window as any).polydrawControl.undo();
    });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const control = (window as any).polydrawControl;
          return {
            activeLayerId: control.getActiveLayerId(),
            sourceFeatures: control.getFeatureGroupsByLayer('Source layer').length,
            targetFeatures: control.getFeatureGroupsByLayer('Survey edits').length,
          };
        }),
      )
      .toEqual({ activeLayerId: 'Source layer', sourceFeatures: 1, targetFeatures: 0 });
  });

  test('names a new draw layer while moving a polygon', async ({ page }) => {
    const demo = new DemoFactory(page);
    await demo.addPredefined([latlngPolys.square]);

    await demo.clickMenuAction('moveToLayer');
    const picker = page.locator('.polygon-layer-picker');
    const nameField = picker.locator('.polygon-layer-new-name');
    await expect(nameField).toBeHidden();

    await picker.locator('[data-layer-target="new"]').click();
    await expect(nameField).toBeVisible();
    await picker.locator('.polygon-layer-new-name-input').fill('Survey output');
    await picker.locator('.polygon-layer-apply').click();

    const panel = page.locator('[data-polydraw="layer-panel"]');
    await expect(panel.locator('[data-layer-id="Layer 1"] .polydraw-layer-name')).toHaveText(
      'Survey output',
    );
    await expect
      .poll(() =>
        page.evaluate(() => {
          const control = (window as any).polydrawControl;
          const layer = control.getLayerById('Layer 1');
          return {
            activeLayerId: control.getActiveLayerId(),
            label: layer?.label,
            features: control.getFeatureGroupsByLayer('Layer 1').length,
          };
        }),
      )
      .toEqual({ activeLayerId: 'Layer 1', label: 'Survey output', features: 1 });

    await page.evaluate(async () => {
      await (window as any).polydrawControl.undo();
    });
    await expect(panel.locator('[data-layer-id="Layer 1"]')).toHaveCount(0);

    await page.evaluate(async () => {
      await (window as any).polydrawControl.redo();
    });
    await expect(panel.locator('[data-layer-id="Layer 1"] .polydraw-layer-name')).toHaveText(
      'Survey output',
    );
  });

  test('shows layer, hole area, geometry, and selected metadata in the info panel', async ({
    page,
  }) => {
    await page.evaluate(
      async ({ outer, hole }) => {
        const control = (window as any).polydrawControl;
        control.createDrawLayer({ id: 'Survey', label: 'Survey output', color: '#f59e0b' });
        await control.addPredefinedPolygon([[outer, hole]], {
          metadata: { name: 'Wetland 7', category: 'Flood zone', internal: 'not displayed' },
        });
      },
      { outer: latlngPolys.donutOuter, hole: latlngPolys.donutHole },
    );

    await page.locator('.polygon-marker.info').click({ force: true });
    const info = page.locator('.info-marker-content');
    await expect(info).toBeVisible();
    await expect(info.locator('.info-marker-layer-heading strong')).toHaveText('Survey output');
    await expect(info.locator('.info-marker-layer-heading span')).toHaveText(
      'Draw layer · Editable',
    );
    const primaryArea = info.locator('.area .info-marker-primary-value');
    const holeArea = info.locator('.area .info-marker-secondary-value');
    await expect(holeArea).toContainText('holes');
    await expect(holeArea).not.toContainText('(');
    const primaryAreaBox = await primaryArea.boundingBox();
    const holeAreaBox = await holeArea.boundingBox();
    expect(primaryAreaBox).not.toBeNull();
    expect(holeAreaBox).not.toBeNull();
    expect(holeAreaBox!.y).toBeGreaterThan(primaryAreaBox!.y);

    const horizontalFit = await info.evaluate((content) => {
      const wrapper = content.closest<HTMLElement>('.info-marker-wrapper')!;
      const wrapperStyle = getComputedStyle(wrapper);
      const availableWidth =
        wrapper.clientWidth -
        Number.parseFloat(wrapperStyle.paddingLeft) -
        Number.parseFloat(wrapperStyle.paddingRight);
      return Math.abs(content.getBoundingClientRect().width - availableWidth);
    });
    expect(horizontalFit).toBeLessThanOrEqual(1);

    await expect(info.getByText('Vertices', { exact: true }).locator('..')).toContainText('8');
    await expect(info.getByText('Holes', { exact: true }).locator('..')).toContainText('1');
    await expect(info.getByText('name', { exact: true }).locator('..')).toContainText('Wetland 7');
    await expect(info.getByText('category', { exact: true }).locator('..')).toContainText(
      'Flood zone',
    );
    await expect(info).not.toContainText('not displayed');
  });

  test('toolbar erase removes draw polygons and preserves reference layers', async ({ page }) => {
    await page.evaluate(
      async ({ first, second, reference }) => {
        const control = (window as any).polydrawControl;
        await control.addPredefinedPolygon([[first]]);
        control.createDrawLayer({ id: 'Work layer' });
        await control.addPredefinedPolygon([[second]]);
        await control.addPredefinedPolygon([[reference]], {
          layer: { id: 'Reference layer', role: 'reference', interaction: 'readonly' },
        });
      },
      {
        first: latlngPolys.square,
        second: latlngPolys.smallSquare,
        reference: latlngPolys.overlapA,
      },
    );

    const toolbar = page.locator('.polydraw-toolbar');
    await toolbar.locator('.icon-activate').click();
    await toolbar.locator('.icon-erase').click();

    const state = await page.evaluate(() => {
      const control = (window as any).polydrawControl;
      return {
        defaultFeatures: control.getFeatureGroupsByLayer('default').length,
        workFeatures: control.getFeatureGroupsByLayer('Work layer').length,
        referenceFeatures: control.getFeatureGroupsByLayer('Reference layer').length,
        layers: control.getAllLayers().map((layer: any) => layer.id),
      };
    });
    expect(state).toEqual({
      defaultFeatures: 0,
      workFeatures: 0,
      referenceFeatures: 1,
      layers: ['default', 'Work layer', 'Reference layer'],
    });
  });

  test('places the layer panel beside the drawing toolbar', async ({ page }) => {
    const panel = page.locator('[data-polydraw="layer-panel"]');
    const toolbar = page.locator('.polydraw-toolbar');

    await expect(panel).toBeVisible();
    await expect(toolbar).toBeVisible();

    const layout = await page.evaluate(() => {
      const panelElement = document.querySelector('[data-polydraw="layer-panel"]')!;
      const toolbarElement = document.querySelector('.polydraw-toolbar')!;
      const panelRect = panelElement.getBoundingClientRect();
      const toolbarRect = toolbarElement.getBoundingClientRect();

      return {
        aligned: Math.abs(panelRect.top - toolbarRect.top) <= 1,
        panelBeforeToolbar: panelRect.right <= toolbarRect.left,
        toolbarAbovePanel:
          Number.parseInt(getComputedStyle(toolbarElement).zIndex, 10) >
          Number.parseInt(getComputedStyle(panelElement).zIndex, 10),
      };
    });

    expect(layout).toEqual({
      aligned: true,
      panelBeforeToolbar: true,
      toolbarAbovePanel: true,
    });
  });

  test('keeps disabled toolbar tooltips in the toolbar stacking context', async ({ page }) => {
    const toolbar = page.locator('.polydraw-toolbar');
    await toolbar.locator('.icon-activate').click();

    const erase = toolbar.locator('.icon-erase');
    const redo = toolbar.locator('.icon-redo');

    await expect(erase).toHaveAttribute('aria-disabled', 'true');
    await expect(redo).toHaveAttribute('aria-disabled', 'true');

    const states = await Promise.all(
      [erase, redo].map((button) =>
        button.evaluate((element) => {
          const icon = element.querySelector('svg')!;
          return {
            buttonOpacity: getComputedStyle(element).opacity,
            iconOpacity: getComputedStyle(icon).opacity,
          };
        }),
      ),
    );

    expect(states).toEqual([
      { buttonOpacity: '1', iconOpacity: '0.3' },
      { buttonOpacity: '1', iconOpacity: '0.3' },
    ]);

    await redo.hover();
    expect(await redo.evaluate((element) => getComputedStyle(element, '::after').visibility)).toBe(
      'visible',
    );
  });

  test('scrolls draw and reference layers inside one bounded body', async ({ page }) => {
    await page.evaluate(() => {
      const control = (window as any).polydrawControl;
      for (let index = 1; index <= 12; index += 1) {
        control.createDrawLayer({ id: `Draw ${index}` });
      }
      for (let index = 1; index <= 8; index += 1) {
        control.createLayer({
          id: `Reference ${index}`,
          role: 'reference',
          interaction: 'readonly',
        });
      }
    });

    const panel = page.locator('[data-polydraw="layer-panel"]');
    const body = panel.locator('.polydraw-layer-panel-body');
    await expect(body.locator('[data-layer-role="draw"]')).toHaveCount(13);
    await expect(body.locator('[data-layer-role="reference"]')).toHaveCount(8);

    const geometry = await page.evaluate(() => {
      const map = document.querySelector('#map')!.getBoundingClientRect();
      const panel = document
        .querySelector('[data-polydraw="layer-panel"]')!
        .getBoundingClientRect();
      const body = document.querySelector('.polydraw-layer-panel-body') as HTMLElement;
      const header = document.querySelector('.polydraw-layer-header') as HTMLElement;
      const addButton = document.querySelector('.polydraw-layer-add-draw') as HTMLElement;
      const referenceHeader = document.querySelector(
        '[data-layer-section="reference"]',
      ) as HTMLElement;
      const firstReferenceRow = document.querySelector(
        '[data-layer-role="reference"]',
      ) as HTMLElement;
      const bodyRect = body.getBoundingClientRect();
      const isInsideBody = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return rect.top >= bodyRect.top - 1 && rect.bottom <= bodyRect.bottom + 1;
      };
      return {
        hasOverflow: body.scrollHeight > body.clientHeight,
        panelInsideMap: panel.bottom <= map.bottom + 1,
        headerOutsideScrollBody: header.parentElement !== body,
        boundaryVisible:
          isInsideBody(addButton) &&
          isInsideBody(referenceHeader) &&
          isInsideBody(firstReferenceRow),
        scrolledAwayFromTop: body.scrollTop > 0,
      };
    });

    expect(geometry).toEqual({
      hasOverflow: true,
      panelInsideMap: true,
      headerOutsideScrollBody: true,
      boundaryVisible: true,
      scrolledAwayFromTop: true,
    });
  });

  test('restores the layer marker theme after modifier-key feedback', async ({ page }) => {
    const demo = new DemoFactory(page);
    await page.locator('.polydraw-layer-add-draw').click();
    await demo.addPredefined([latlngPolys.bigSquareDense]);

    const marker = page
      .locator('.polygon-marker:not(.menu):not(.info):not(.delete):not(.hole)')
      .first();
    await expect(marker).toBeVisible();
    const originalTheme = await marker.evaluate((element: HTMLElement) => ({
      backgroundColor: element.style.backgroundColor,
      boxShadow: element.style.boxShadow,
    }));

    await marker.dispatchEvent('mouseover');
    const modifierKey = await page.evaluate(() =>
      navigator.userAgent.toLowerCase().includes('mac') ? 'Meta' : 'Control',
    );
    await page.keyboard.down(modifierKey);
    await page.keyboard.up(modifierKey);
    await page.keyboard.down('Shift');
    await page.keyboard.up('Shift');

    await expect
      .poll(() =>
        marker.evaluate((element: HTMLElement) => ({
          backgroundColor: element.style.backgroundColor,
          boxShadow: element.style.boxShadow,
        })),
      )
      .toEqual(originalTheme);
  });

  test('restores a deleted layer with undo and reflects reordered layers', async ({ page }) => {
    const demo = new DemoFactory(page);
    const panel = page.locator('[data-polydraw="layer-panel"]');

    await panel.locator('.polydraw-layer-add-draw').click();
    await demo.addPredefined([latlngPolys.square]);
    await panel.locator('.polydraw-layer-add-draw').click();
    await demo.addPredefined([latlngPolys.smallSquare]);

    const renderedLayerIds = await page.evaluate(() => {
      const control = (window as any).polydrawControl;
      control.reorderLayer('Layer 2', 'Layer 1');
      const manager = control.getLayerManager();
      return control._lastAppliedVisibleMapOrder.map((featureGroup: unknown) =>
        manager.getLayerForFeatureGroup(featureGroup),
      );
    });
    expect(renderedLayerIds).toEqual(['Layer 1', 'Layer 2']);
    await expect(panel.locator('[data-layer-role="draw"] .polydraw-layer-name')).toHaveText([
      'default',
      'Layer 2',
      'Layer 1',
    ]);

    await panel.locator('[data-layer-id="Layer 1"] .polydraw-layer-delete').click();
    await expect(panel.locator('[data-layer-id="Layer 1"]')).toHaveCount(0);

    await page.evaluate(async () => {
      await (window as any).polydrawControl.undo();
    });
    await expect(panel.locator('[data-layer-id="Layer 1"]')).toBeVisible();

    const restored = await page.evaluate(() => {
      const control = (window as any).polydrawControl;
      return {
        featureCount: control.getFeatureGroups().length,
        layerFeatures: control.getFeatureGroupsByLayer('Layer 1').length,
      };
    });
    expect(restored).toEqual({ featureCount: 2, layerFeatures: 1 });
  });

  test('deletes all reference layers without touching draw layers and restores them with undo', async ({
    page,
  }) => {
    await page.evaluate(
      async ({ first, second, work }) => {
        const control = (window as any).polydrawControl;
        await control.addPredefinedPolygon([[first]], {
          layer: { id: 'Reference A', role: 'reference', interaction: 'readonly' },
        });
        await control.addPredefinedPolygon([[second]], {
          layer: { id: 'Reference B', role: 'reference', interaction: 'readonly' },
        });
        control.createDrawLayer({ id: 'Work layer' });
        await control.addPredefinedPolygon([[work]]);
      },
      {
        first: latlngPolys.square,
        second: latlngPolys.smallSquare,
        work: latlngPolys.overlapA,
      },
    );

    const panel = page.locator('[data-polydraw="layer-panel"]');
    await panel.locator('[data-layer-section="reference"] .polydraw-layer-section-delete').click();

    await expect(panel.locator('[data-layer-role="reference"]')).toHaveCount(0);
    await expect(panel.locator('[data-layer-id="Work layer"]')).toBeVisible();

    const afterDelete = await page.evaluate(() => {
      const control = (window as any).polydrawControl;
      return {
        layers: control.getAllLayers().map((layer: any) => layer.id),
        workFeatures: control.getFeatureGroupsByLayer('Work layer').length,
      };
    });
    expect(afterDelete).toEqual({ layers: ['default', 'Work layer'], workFeatures: 1 });

    await page.evaluate(async () => {
      await (window as any).polydrawControl.undo();
    });

    await expect(panel.locator('[data-layer-role="reference"]')).toHaveCount(2);
    await expect(panel.locator('[data-layer-id="Work layer"]')).toBeVisible();
  });

  test('keeps readonly reference layers markerless after undo and redo', async ({ page }) => {
    await page.evaluate(
      async ({ first, second }) => {
        const control = (window as any).polydrawControl;
        control.beginBatch();
        await control.addPredefinedPolygon([[first]], {
          layer: { id: 'Reference A', role: 'reference', interaction: 'readonly' },
        });
        await control.addPredefinedPolygon([[second]], {
          layer: { id: 'Reference B', role: 'reference', interaction: 'readonly' },
        });
        control.endBatch();
        await control.undo();
        await control.redo();
      },
      { first: latlngPolys.square, second: latlngPolys.smallSquare },
    );

    await expect(page.locator('.polygon-marker')).toHaveCount(0);

    const restored = await page.evaluate(() => {
      const control = (window as any).polydrawControl;
      return control.getAllLayers().map((layer: any) => ({
        id: layer.id,
        role: layer.role,
        interaction: layer.interaction,
        features: control.getFeatureGroupsByLayer(layer.id).length,
      }));
    });
    expect(restored).toEqual([
      { id: 'default', role: 'draw', interaction: 'editable', features: 0 },
      { id: 'Reference A', role: 'reference', interaction: 'readonly', features: 1 },
      { id: 'Reference B', role: 'reference', interaction: 'readonly', features: 1 },
    ]);
  });
});
