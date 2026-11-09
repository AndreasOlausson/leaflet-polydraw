import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Layer Panel Lifecycle', () => {
  let cleanup: () => void;
  let polydraw: ReturnType<typeof createPolydrawHarness>['polydraw'];
  let fixtures: ReturnType<typeof MockFactory.createPredefinedPolygons>;

  const getLayerPanel = () => (polydraw as unknown as { layerPanel: unknown }).layerPanel;

  beforeEach(() => {
    fixtures = MockFactory.createPredefinedPolygons();
    const harness = createPolydrawHarness({
      layerPanel: { enabled: true, initialState: 'expanded' },
    });
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('reuses the same panel instance across refreshes and removes it when hidden', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Layer A' });
    await polydraw.addPredefinedPolygon(fixtures.octagon(), { layer: 'Layer B' });

    const layerManager = polydraw.getLayerManager();
    const initialPanel = getLayerPanel();
    expect(initialPanel).toBeTruthy();

    layerManager.setActiveLayer('Layer A');
    expect(getLayerPanel()).toBe(initialPanel);

    layerManager.setLayerVisibility('Layer B', false);
    expect(getLayerPanel()).toBe(initialPanel);

    polydraw.removeAllFeatureGroups();
    expect(getLayerPanel()).toBe(initialPanel);
  });

  it('separates draw and reference layers and creates a new draw layer from the panel', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), {
      layer: { id: 'Parcels', role: 'reference', interaction: 'readonly' },
    });

    const panelEl = document.querySelector('[data-polydraw="layer-panel"]') as HTMLElement;
    expect(panelEl).toBeTruthy();
    expect(panelEl.textContent).toContain('Draw layers');
    expect(panelEl.textContent).toContain('Reference layers');
    expect(
      panelEl.querySelector('[data-layer-id="default"]')?.getAttribute('data-layer-role'),
    ).toBe('draw');
    expect(
      panelEl.querySelector('[data-layer-id="Parcels"]')?.getAttribute('data-layer-role'),
    ).toBe('reference');

    const activeBefore = polydraw.getActiveLayerId();
    (panelEl.querySelector('[data-layer-id="Parcels"]') as HTMLElement).click();
    expect(polydraw.getActiveLayerId()).toBe(activeBefore);

    (panelEl.querySelector('.polydraw-layer-add-draw') as HTMLElement).click();
    expect(polydraw.getActiveLayerId()).toBe('Layer 1');
    expect(polydraw.getLayerById('Layer 1')?.role).toBe('draw');
  });

  it('deletes every reference layer as one undoable panel action', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), {
      layer: { id: 'Reference A', role: 'reference', interaction: 'readonly' },
    });
    await polydraw.addPredefinedPolygon(fixtures.octagon(), {
      layer: { id: 'Reference B', role: 'reference', interaction: 'readonly' },
    });
    polydraw.createDrawLayer({ id: 'Work layer' });
    await polydraw.addPredefinedPolygon(fixtures.squareWithHole());

    const panelEl = document.querySelector('[data-polydraw="layer-panel"]') as HTMLElement;
    const deleteReferences = panelEl.querySelector(
      '[data-layer-section="reference"] .polydraw-layer-section-delete',
    ) as HTMLButtonElement;

    expect(deleteReferences.getAttribute('aria-label')).toBe('Delete all reference layers');
    deleteReferences.click();

    expect(polydraw.getLayerById('Reference A')).toBeUndefined();
    expect(polydraw.getLayerById('Reference B')).toBeUndefined();
    expect(polydraw.getLayerById('Work layer')).toBeTruthy();
    expect(polydraw.getFeatureGroupsByLayer('Work layer')).toHaveLength(1);

    await polydraw.undo();

    expect(polydraw.getFeatureGroupsByLayer('Reference A')).toHaveLength(1);
    expect(polydraw.getFeatureGroupsByLayer('Reference B')).toHaveLength(1);
    expect(polydraw.getFeatureGroupsByLayer('Work layer')).toHaveLength(1);
  });

  it('updates a layer name and color from the settings dialog with undo support', async () => {
    polydraw.createDrawLayer({ id: 'Work layer', label: 'Initial name', color: '#ef4444' });
    await polydraw.addPredefinedPolygon(fixtures.triangle());

    const panelEl = document.querySelector('[data-polydraw="layer-panel"]') as HTMLElement;
    const editButton = panelEl.querySelector(
      '[data-layer-id="Work layer"] .polydraw-layer-edit',
    ) as HTMLButtonElement;
    editButton.click();

    const dialog = document.querySelector('.polydraw-layer-dialog') as HTMLFormElement;
    const nameInput = dialog.querySelector('input[type="text"]') as HTMLInputElement;
    nameInput.value = 'Renamed layer';
    (dialog.querySelector('[data-color="#3366cc"]') as HTMLButtonElement).click();
    (dialog.querySelector('.polydraw-layer-dialog-apply') as HTMLButtonElement).click();

    expect(document.querySelector('.polydraw-layer-dialog')).toBeNull();
    expect(polydraw.getLayerById('Work layer')?.label).toBe('Renamed layer');
    expect(polydraw.getLayerById('Work layer')?.color).toBe('#3366cc');

    await polydraw.undo();

    expect(polydraw.getLayerById('Work layer')?.label).toBe('Initial name');
    expect(polydraw.getLayerById('Work layer')?.color).toBe('#ef4444');
  });

  it('offers draw-layer targets for reference sources only when enabled', async () => {
    cleanup();
    const harness = createPolydrawHarness({
      layerPanel: {
        enabled: true,
        initialState: 'expanded',
        merge: { allowReferenceSources: true },
      },
    });
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;

    polydraw.createDrawLayer({ id: 'Work layer' });
    await polydraw.addPredefinedPolygon(fixtures.triangle(), {
      layer: { id: 'Reference A', role: 'reference', interaction: 'readonly' },
    });
    polydraw.createLayer({ id: 'Reference B', role: 'reference', interaction: 'readonly' });

    const editButton = document.querySelector(
      '[data-layer-id="Reference A"] .polydraw-layer-edit',
    ) as HTMLButtonElement;
    editButton.click();

    const dialog = document.querySelector('.polydraw-layer-dialog') as HTMLFormElement;
    (dialog.querySelector('.polydraw-layer-dialog-merge') as HTMLButtonElement).click();
    const targets = Array.from(
      dialog.querySelectorAll<HTMLElement>('.polydraw-layer-merge-option[data-layer-id]'),
    ).map((target) => target.dataset.layerId);

    expect(targets).toEqual(['default', 'Work layer']);
    expect(targets).not.toContain('Reference B');
    expect(dialog.querySelector<HTMLElement>('.polydraw-layer-merge-option-new')?.textContent).toBe(
      '+ New editable layer',
    );
  });

  it('preselects the target when only one merge destination is available', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Source' });

    const editButton = document.querySelector(
      '[data-layer-id="Source"] .polydraw-layer-edit',
    ) as HTMLButtonElement;
    editButton.click();

    const dialog = document.querySelector('.polydraw-layer-dialog') as HTMLFormElement;
    (dialog.querySelector('.polydraw-layer-dialog-merge') as HTMLButtonElement).click();

    const targets = dialog.querySelectorAll<HTMLElement>('.polydraw-layer-merge-option');
    const mergeButton = dialog.querySelector('.polydraw-layer-merge-apply') as HTMLButtonElement;
    expect(targets).toHaveLength(1);
    expect(targets[0].dataset.layerId).toBe('default');
    expect(targets[0].classList.contains('selected')).toBe(true);
    expect(targets[0].getAttribute('aria-checked')).toBe('true');
    expect(mergeButton.disabled).toBe(false);
  });

  it('can disable the layer panel through configuration', () => {
    cleanup();
    const harness = createPolydrawHarness({
      layerPanel: { enabled: false, initialState: 'expanded' },
    });
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;

    expect(document.querySelector('[data-polydraw="layer-panel"]')).toBeNull();
    polydraw.createDrawLayer();
    expect(document.querySelector('[data-polydraw="layer-panel"]')).toBeNull();
  });

  it('can start with the layer panel collapsed', () => {
    cleanup();
    const harness = createPolydrawHarness({
      layerPanel: { enabled: true, initialState: 'collapsed' },
    });
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;

    const panelEl = document.querySelector('[data-polydraw="layer-panel"]') as HTMLElement;
    expect(panelEl.classList.contains('polydraw-layer-panel-collapsed')).toBe(true);
    expect(panelEl.querySelector('.polydraw-layer-panel-body')).toBeNull();
    expect(panelEl.querySelector('.polydraw-layer-header-toggle')?.getAttribute('aria-label')).toBe(
      'Expand layer panel',
    );
  });

  it('keeps draw and reference layers in one bounded panel body', () => {
    for (let index = 1; index <= 12; index += 1) {
      polydraw.createDrawLayer({ id: `Draw ${index}` });
    }
    for (let index = 1; index <= 8; index += 1) {
      polydraw.createLayer({
        id: `Reference ${index}`,
        role: 'reference',
        interaction: 'readonly',
      });
    }

    const panelEl = document.querySelector('[data-polydraw="layer-panel"]') as HTMLElement;
    const panelBody = panelEl.querySelector('.polydraw-layer-panel-body') as HTMLElement;
    expect(panelBody).toBeTruthy();
    expect(panelBody.querySelectorAll('[data-layer-role="draw"]')).toHaveLength(13);
    expect(panelBody.querySelectorAll('[data-layer-role="reference"]')).toHaveLength(8);
    expect(panelEl.style.getPropertyValue('--polydraw-layer-panel-available-height')).toBe('556px');
  });

  it('preserves the panel scroll position during ordinary refreshes', () => {
    for (let index = 1; index <= 12; index += 1) {
      polydraw.createDrawLayer({ id: `Draw ${index}` });
    }

    const panelEl = document.querySelector('[data-polydraw="layer-panel"]') as HTMLElement;
    const initialBody = panelEl.querySelector('.polydraw-layer-panel-body') as HTMLElement;
    initialBody.scrollTop = 96;

    polydraw.getLayerManager().setLayerVisibility('Draw 1', false);

    const refreshedBody = panelEl.querySelector('.polydraw-layer-panel-body') as HTMLElement;
    expect(refreshedBody).not.toBe(initialBody);
    expect(refreshedBody.scrollTop).toBe(96);
  });

  it('keeps empty draw layers when a polygon is created in another draw layer', async () => {
    const layerIds = Array.from({ length: 7 }, (_, index) => `Layer ${index + 1}`);
    layerIds.forEach((id) => polydraw.createDrawLayer({ id }));
    polydraw.setActiveLayer('Layer 4');

    await polydraw.addPredefinedPolygon(fixtures.triangle());

    expect(polydraw.getAllLayers().map((layer) => layer.id)).toEqual(['default', ...layerIds]);
    expect(polydraw.getFeatureGroupsByLayer('Layer 4')).toHaveLength(1);
    expect(polydraw.getActiveLayerId()).toBe('Layer 4');
  });

  it('defers rerender while dragging and applies pending refresh on drag end', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Layer A' });
    await polydraw.addPredefinedPolygon(fixtures.octagon(), { layer: 'Layer B' });

    const layerManager = polydraw.getLayerManager();
    const panelEl = document.querySelector('[data-polydraw="layer-panel"]') as HTMLElement;
    expect(panelEl).toBeTruthy();

    const row = panelEl.querySelector('[data-layer-id="Layer A"]') as HTMLElement;
    expect(row).toBeTruthy();

    row.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));

    // Triggers panel refresh through the layer color changed event.
    layerManager.setLayerColor('Layer B', '#123456');

    // Active drag should keep current row node alive (no innerHTML replacement).
    expect(row.isConnected).toBe(true);

    row.dispatchEvent(new Event('dragend', { bubbles: true, cancelable: true }));

    // Pending refresh is applied once drag ends.
    const rowAfter = panelEl.querySelector('[data-layer-id="Layer A"]') as HTMLElement;
    expect(rowAfter).toBeTruthy();
    expect(rowAfter).not.toBe(row);
  });
});
