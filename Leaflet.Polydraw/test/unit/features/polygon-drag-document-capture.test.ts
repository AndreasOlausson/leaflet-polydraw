import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as L from 'leaflet';
import { leafletAdapter } from '../../../src/compatibility/leaflet-adapter';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Polygon Drag Document Capture', () => {
  let cleanup: () => void;
  let map: ReturnType<typeof createPolydrawHarness>['map'];
  let polydraw: ReturnType<typeof createPolydrawHarness>['polydraw'];
  let fixtures: ReturnType<typeof MockFactory.createPredefinedPolygons>;

  beforeEach(() => {
    fixtures = MockFactory.createPredefinedPolygons();
    const harness = createPolydrawHarness();
    map = harness.map;
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('updates polygon coordinates from document drag events after body drag start', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle());

    const featureGroup = polydraw.getFeatureGroups()[0];
    const polygonLayer = featureGroup
      .getLayers()
      .find((layer) => layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) as
      | (L.Polygon & { _polydrawDragData?: { isDragging?: boolean } })
      | undefined;

    expect(polygonLayer).toBeTruthy();

    vi.spyOn(map, 'containerPointToLatLng').mockReturnValue(leafletAdapter.createLatLng(58.45, 15.65));
    const setLatLngsSpy = vi.spyOn(polygonLayer!, 'setLatLngs');

    polygonLayer!.fire('mousedown', {
      latlng: leafletAdapter.createLatLng(58.4, 15.6),
      originalEvent: new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 140,
      }),
    });

    expect(polygonLayer!._polydrawDragData?.isDragging).toBe(true);

    document.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 170,
        clientY: 190,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 170,
        clientY: 190,
        pointerType: 'mouse',
      }),
    );

    expect(setLatLngsSpy).toHaveBeenCalled();

    document.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: 170,
        clientY: 190,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        clientX: 170,
        clientY: 190,
        pointerType: 'mouse',
      }),
    );

    expect(polygonLayer!._polydrawDragData?.isDragging).toBe(false);
  });
});
