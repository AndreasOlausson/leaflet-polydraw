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
    const harness = createPolydrawHarness();
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
    expect(getLayerPanel()).toBeNull();
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
