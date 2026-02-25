import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPolydrawHarness } from '../helpers/polydraw-harness';
import { MockFactory } from '../mocks/factory';

describe('Layer Public API', () => {
  let cleanup: () => void;
  let polydraw: ReturnType<typeof createPolydrawHarness>['polydraw'];
  let fixtures: ReturnType<typeof MockFactory.createPredefinedPolygons>;

  beforeEach(() => {
    fixtures = MockFactory.createPredefinedPolygons();
    const harness = createPolydrawHarness();
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('creates and queries layers through high-level API methods', () => {
    const created = polydraw.createLayer({
      id: 'Hazard A',
      label: 'Hazard Zone A',
      color: '#ff0000',
      interaction: 'readonly',
      panel: 'visible',
      metadata: { source: 'qa' },
    });

    expect(created.id).toBe('Hazard A');
    expect(polydraw.hasLayer('Hazard A')).toBe(true);
    expect(polydraw.getLayerById('Hazard A')?.label).toBe('Hazard Zone A');
    expect(polydraw.getLayerById('Hazard A')?.interaction).toBe('readonly');
    expect(polydraw.getAllLayers().some((layer) => layer.id === 'Hazard A')).toBe(true);
  });

  it('updates layer policy and metadata through updateLayer + patchLayerMetadata', () => {
    polydraw.createLayer({
      id: 'Risk',
      panel: 'visible',
      interaction: 'editable',
      metadata: { a: 1, b: 2 },
    });

    const updated = polydraw.updateLayer('Risk', {
      label: 'Risk Layer',
      interaction: 'static',
      visibility: false,
    });

    expect(updated).toBeDefined();
    expect(updated?.label).toBe('Risk Layer');
    expect(updated?.interaction).toBe('static');
    expect(updated?.visible).toBe(false);
    expect(updated?.panel).toBe('hidden');

    const patched = polydraw.patchLayerMetadata('Risk', { b: 3, c: 4 });
    expect(patched).toBe(true);
    expect(polydraw.getLayerById('Risk')?.metadata).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('deletes layers and reports result details', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Delete Me' });

    const result = polydraw.deleteLayer('Delete Me');
    expect(result.success).toBe(true);
    expect(result.removedFeatureGroups).toBeGreaterThanOrEqual(1);
    expect(polydraw.hasLayer('Delete Me')).toBe(false);

    const defaultDelete = polydraw.deleteLayer('default');
    expect(defaultDelete.success).toBe(false);
    expect(defaultDelete.reason).toBe('default-layer');
  });

  it('returns false when patching metadata for missing layer', () => {
    expect(polydraw.patchLayerMetadata('missing', { x: 1 })).toBe(false);
  });
});
