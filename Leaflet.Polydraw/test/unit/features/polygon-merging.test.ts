import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as L from 'leaflet';
import { MockFactory } from '../mocks/factory';
import { createPolydrawHarness } from '../helpers/polydraw-harness';
import { leafletAdapter } from '../../../src/compatibility/leaflet-adapter';

describe('Polygon Merging', () => {
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

  it('merges overlapping polygons into a single feature group', async () => {
    const [first, second] = fixtures.overlappingSquares();

    await polydraw.addPredefinedPolygon([first]);
    await polydraw.addPredefinedPolygon([second]);

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
  });

  it('keeps separate polygons when they do not intersect', async () => {
    const polygons = fixtures.multipleSimplePolygons();

    for (const polygon of polygons) {
      await polydraw.addPredefinedPolygon([polygon]);
    }

    expect(polydraw.getFeatureGroups()).toHaveLength(polygons.length);
  });

  it('merges same-layer polygons when a marker drag creates overlap', async () => {
    const first = [
      [
        leafletAdapter.createLatLng(58.405, 15.595),
        leafletAdapter.createLatLng(58.405, 15.6),
        leafletAdapter.createLatLng(58.4, 15.6),
        leafletAdapter.createLatLng(58.4, 15.595),
        leafletAdapter.createLatLng(58.405, 15.595),
      ],
    ];
    const second = [
      [
        leafletAdapter.createLatLng(58.405, 15.605),
        leafletAdapter.createLatLng(58.405, 15.61),
        leafletAdapter.createLatLng(58.4, 15.61),
        leafletAdapter.createLatLng(58.4, 15.605),
        leafletAdapter.createLatLng(58.405, 15.605),
      ],
    ];
    const secondAfterMarkerDrag = [
      [
        leafletAdapter.createLatLng(58.403, 15.598),
        leafletAdapter.createLatLng(58.403, 15.603),
        leafletAdapter.createLatLng(58.398, 15.603),
        leafletAdapter.createLatLng(58.398, 15.598),
        leafletAdapter.createLatLng(58.403, 15.598),
      ],
    ];

    await polydraw.addPredefinedPolygon([first], { layer: 'Layer 1' });
    await polydraw.addPredefinedPolygon([second], { layer: 'Layer 1' });
    polydraw.setActiveLayer('Layer 1');

    const movingGroup = polydraw.getFeatureGroupsByLayer('Layer 1')[1];
    const movingPolygon = movingGroup
      .getLayers()
      .find((layer): layer is L.Polygon => layer instanceof L.Polygon);

    expect(movingPolygon).toBeDefined();
    movingPolygon!.setLatLngs(secondAfterMarkerDrag);

    const interactionManager = (
      polydraw as unknown as {
        polygonMutationManager: {
          interactionManager: {
            markerDragEnd(featureGroup: L.FeatureGroup): Promise<void>;
          };
        };
      }
    ).polygonMutationManager.interactionManager;

    await interactionManager.markerDragEnd(movingGroup);

    expect(polydraw.getFeatureGroupsByLayer('Layer 1')).toHaveLength(1);
  });
});
