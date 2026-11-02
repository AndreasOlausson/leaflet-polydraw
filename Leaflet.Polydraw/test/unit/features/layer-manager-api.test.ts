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

  it('does not activate reference layers as draw targets', () => {
    const layerManager = polydraw.getLayerManager();
    const referenceLayer = layerManager.getOrCreateLayer('Reference Layer', {
      role: 'reference',
      interaction: 'editable',
    });

    expect(referenceLayer.role).toBe('reference');
    expect(referenceLayer.interaction).toBe('editable');
    expect(layerManager.setActiveLayerWithResult('Reference Layer')).toBe('not-draw-layer');
    expect(layerManager.getActiveLayerId()).toBe('default');
    expect(layerManager.setActiveLayer('Reference Layer')).toBe(false);
  });

  it('defaults reference layers to readonly without preventing explicit editable references', () => {
    const layerManager = polydraw.getLayerManager();

    const defaultReference = layerManager.getOrCreateLayer('Readonly Reference', {
      role: 'reference',
    });
    const editableReference = layerManager.getOrCreateLayer('Editable Reference', {
      role: 'reference',
      interaction: 'editable',
    });

    expect(defaultReference.interaction).toBe('readonly');
    expect(editableReference.interaction).toBe('editable');
  });

  it('assigns 21 deterministic draw-layer colors before cycling the palette', () => {
    const expectedColors = [
      '#ef4444',
      '#f97316',
      '#eab308',
      '#22c55e',
      '#3b82f6',
      '#4f46e5',
      '#8b5cf6',
      '#fca5a5',
      '#fdba74',
      '#fde047',
      '#86efac',
      '#93c5fd',
      '#a5b4fc',
      '#c4b5fd',
      '#b91c1c',
      '#c2410c',
      '#a16207',
      '#15803d',
      '#1d4ed8',
      '#4338ca',
      '#6d28d9',
    ];

    const colors = expectedColors.map(
      (_, index) => polydraw.createDrawLayer({ id: `Layer ${index + 1}` }).color,
    );

    expect(colors).toEqual(expectedColors);
    expect(polydraw.createDrawLayer({ id: 'Layer 22' }).color).toBe(expectedColors[0]);
  });

  it('reuses the first available palette color after a draw layer is deleted', () => {
    polydraw.createDrawLayer({ id: 'Layer 1' });
    polydraw.createDrawLayer({ id: 'Layer 2' });
    polydraw.createDrawLayer({ id: 'Layer 3' });

    expect(polydraw.deleteLayer('Layer 2').success).toBe(true);
    expect(polydraw.createDrawLayer({ id: 'Layer 4' }).color).toBe('#f97316');
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

  it('does not restore a reference layer as the active draw target', () => {
    const layerManager = polydraw.getLayerManager();
    const snapshot: LayerSnapshot = {
      layers: [
        { id: 'default', color: '#50622b', visible: true, role: 'draw', featureIndices: [] },
        {
          id: 'Reference Visible',
          color: '#ff0000',
          visible: true,
          role: 'reference',
          interaction: 'editable',
          featureIndices: [],
        },
      ],
      activeLayerId: 'Reference Visible',
    };

    layerManager.restoreFromLayerSnapshot(snapshot, []);

    expect(layerManager.getActiveLayerId()).toBe('default');
    expect(layerManager.getActiveLayer()?.role).toBe('draw');
  });

  it('infers reference role for legacy readonly/static snapshots', () => {
    const layerManager = polydraw.getLayerManager();
    const snapshot: LayerSnapshot = {
      layers: [
        { id: 'default', color: '#50622b', visible: true, featureIndices: [] },
        {
          id: 'Legacy Readonly',
          color: '#ff0000',
          visible: true,
          interaction: 'readonly',
          featureIndices: [],
        },
      ],
      activeLayerId: 'Legacy Readonly',
    };

    layerManager.restoreFromLayerSnapshot(snapshot, []);

    expect(layerManager.getLayer('Legacy Readonly')?.role).toBe('reference');
    expect(layerManager.getActiveLayerId()).toBe('default');
  });
});
