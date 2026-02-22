import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defaultConfig } from '../../../src/config';
import type { LayerSnapshot } from '../../../src/types/polydraw-interfaces';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Layer Manager API', () => {
  let cleanup: () => void;
  let polydraw: ReturnType<typeof createPolydrawHarness>['polydraw'];

  beforeEach(() => {
    const harness = createPolydrawHarness();
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('returns explicit active-layer status and preserves boolean compatibility', () => {
    const layerManager = polydraw.getLayerManager();
    layerManager.getOrCreateLayer('Layer A');

    expect(layerManager.setActiveLayerWithResult('missing')).toBe('not-found');
    expect(layerManager.setActiveLayer('missing')).toBe(false);

    expect(layerManager.setActiveLayerWithResult('Layer A')).toBe('activated');
    expect(layerManager.getActiveLayerId()).toBe('Layer A');

    expect(layerManager.setActiveLayerWithResult('Layer A')).toBe('already-active');
    expect(layerManager.setActiveLayer('Layer A')).toBe(false);
  });

  it('keeps getOrCreateLayer side-effect free for existing layer colors', () => {
    const layerManager = polydraw.getLayerManager();

    const first = layerManager.getOrCreateLayer('Layer A', '#ff0000');
    expect(first.color).toBe('#ff0000');

    const second = layerManager.getOrCreateLayer('Layer A', '#00ff00');
    expect(second.color).toBe('#ff0000');
    expect(layerManager.getLayer('Layer A')?.color).toBe('#ff0000');
  });

  it('falls back to safe color defaults for invalid color inputs', () => {
    const layerManager = polydraw.getLayerManager();

    const created = layerManager.getOrCreateLayer('Layer B', 'banana');
    expect(created.color).toBe(defaultConfig.styles.polygon.color);

    expect(layerManager.setLayerColor('Layer B', 'still-not-a-color')).toBe(false);
    expect(layerManager.getLayer('Layer B')?.color).toBe(defaultConfig.styles.polygon.color);
  });

  it('does not activate hidden layers', () => {
    const layerManager = polydraw.getLayerManager();
    layerManager.getOrCreateLayer('Layer C');

    expect(layerManager.setLayerVisibility('Layer C', false)).toBe(true);
    expect(layerManager.setActiveLayerWithResult('Layer C')).toBe('not-visible');
    expect(layerManager.getActiveLayerId()).toBe('default');
    expect(layerManager.setActiveLayer('Layer C')).toBe(false);
  });

  it('restores to a visible active layer when snapshot active layer is hidden', () => {
    const layerManager = polydraw.getLayerManager();
    const snapshot: LayerSnapshot = {
      layers: [
        { id: 'default', color: '#50622b', visible: false, featureIndices: [] },
        { id: 'Layer Hidden', color: '#ff0000', visible: false, featureIndices: [] },
        { id: 'Layer Visible', color: '#00ff00', visible: true, featureIndices: [] },
      ],
      activeLayerId: 'Layer Hidden',
    };

    layerManager.restoreFromLayerSnapshot(snapshot, []);

    expect(layerManager.getActiveLayerId()).toBe('Layer Visible');
    expect(layerManager.getActiveLayer()?.visible).toBe(true);
  });
});
