import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as L from 'leaflet';
import { leafletAdapter } from '../../../src/compatibility/leaflet-adapter';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Polygon Drag Transform Guard', () => {
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

  it('blocks mousedown drag start while transform mode is active', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle());

    const featureGroup = polydraw.getFeatureGroups()[0];
    const polygonLayer = featureGroup
      .getLayers()
      .find((layer) => layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) as
      | (L.Polygon & { _polydrawDragData?: { isDragging?: boolean } })
      | undefined;
    expect(polygonLayer).toBeTruthy();

    const interactionManager = (
      (polydraw as unknown as { polygonMutationManager?: { polygonInteractionManager?: unknown } })
        .polygonMutationManager as { polygonInteractionManager?: { transformModeActive?: boolean } }
    )?.polygonInteractionManager;
    expect(interactionManager).toBeTruthy();

    interactionManager!.transformModeActive = true;

    polygonLayer!.fire('mousedown', {
      latlng: leafletAdapter.createLatLng(58.4, 15.6),
      originalEvent: new MouseEvent('mousedown', { bubbles: true }),
    });

    expect(polygonLayer!._polydrawDragData?.isDragging).toBe(false);
  });
});
