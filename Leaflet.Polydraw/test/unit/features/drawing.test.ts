import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DrawMode } from '../../../src/enums';
import { leafletAdapter } from '../../../src/compatibility/leaflet-adapter';
import { defaultConfig } from '../../../src/config';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Drawing History Capture', () => {
  let cleanup: () => void;
  let polydraw: ReturnType<typeof createPolydrawHarness>['polydraw'];
  let fixtures: ReturnType<typeof MockFactory.createPredefinedPolygons>;

  beforeEach(() => {
    fixtures = MockFactory.createPredefinedPolygons();
    const harness = createPolydrawHarness({
      history: {
        ...defaultConfig.history,
        capture: {
          ...defaultConfig.history.capture,
          addPredefinedPolygon: false,
        },
      },
    });
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('skips history when capture is disabled for predefined polygons', async () => {
    const onHistoryChanged = vi.fn();
    polydraw.on('polydraw:history:changed', onHistoryChanged);

    await polydraw.addPredefinedPolygon(fixtures.triangle());

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    expect(onHistoryChanged).not.toHaveBeenCalled();

    await polydraw.undo();
    expect(polydraw.getFeatureGroups()).toHaveLength(1);
  });

  it('marks point-to-point subtract vertices as subtract markers', () => {
    polydraw.setDrawMode(DrawMode.PointToPointSubtract);

    const drawManager = (polydraw as any).polygonDrawManager;
    drawManager.handlePointToPointClick(leafletAdapter.createLatLng(58.4, 15.6));
    drawManager.handlePointToPointClick(leafletAdapter.createLatLng(58.401, 15.601));

    const markers = Array.from(
      document.querySelectorAll<HTMLElement>('.leaflet-polydraw-p2p-marker'),
    );

    expect(markers).toHaveLength(2);
    expect(markers.map((marker) => marker.dataset.p2pMode)).toEqual(['subtract', 'subtract']);
  });
});
