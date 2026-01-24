import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type * as L from 'leaflet';
import Polydraw from '../../../src/polydraw';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Edge Cases and Error Handling', () => {
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

  it('rejects empty polygon input', async () => {
    await expect(
      polydraw.addPredefinedPolygon([] as unknown as L.LatLngLiteral[][][]),
    ).rejects.toThrow('Cannot add empty polygon array');
  });

  it('rejects polygons with fewer than 3 unique vertices', async () => {
    const invalidPolygon: L.LatLngLiteral[][][] = [
      [
        [
          MockFactory.createLatLngLiteral(58.4, 15.6),
          MockFactory.createLatLngLiteral(58.41, 15.61),
          MockFactory.createLatLngLiteral(58.4, 15.6),
        ],
      ],
    ];

    await expect(polydraw.addPredefinedPolygon(invalidPolygon)).rejects.toThrow(
      'Invalid polygon data',
    );
  });

  it('rejects polygon additions when the map is not initialized', async () => {
    const unmounted = new Polydraw();
    const fixtures = MockFactory.createPredefinedPolygons();

    await expect(unmounted.addPredefinedPolygon(fixtures.triangle())).rejects.toThrow(
      'Map not initialized',
    );
  });
});
