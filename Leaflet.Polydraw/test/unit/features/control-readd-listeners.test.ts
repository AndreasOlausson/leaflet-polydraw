import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DrawMode } from '../../../src/enums';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Control Re-add', () => {
  let cleanup: () => void;
  let polydraw: ReturnType<typeof createPolydrawHarness>['polydraw'];
  let map: ReturnType<typeof createPolydrawHarness>['map'];
  let fixtures: ReturnType<typeof MockFactory.createPredefinedPolygons>;

  beforeEach(() => {
    fixtures = MockFactory.createPredefinedPolygons();
    const harness = createPolydrawHarness();
    polydraw = harness.polydraw;
    map = harness.map;
    cleanup = harness.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('re-attaches internal listeners after remove/add cycles', async () => {
    polydraw.setDrawMode(DrawMode.Add);
    polydraw.remove();
    polydraw.addTo(map);
    polydraw.setDrawMode(DrawMode.Add);

    await polydraw.addPredefinedPolygon(fixtures.triangle(), { layer: 'Layer A' });

    // polygonOperationComplete listener should still reset mode to Off
    expect(polydraw.getDrawMode()).toBe(DrawMode.Off);
  });
});
