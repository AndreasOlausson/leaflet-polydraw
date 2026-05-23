import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Feature, Polygon } from 'geojson';
import { createPolydrawHarness } from '../helpers/polydraw-harness';
import { MockFactory } from '../mocks/factory';

describe('Feature Metadata Lifecycle', () => {
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

  it('supports setting and patching feature metadata through public API', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle());

    const featureGroup = polydraw.getFeatureGroups()[0];
    expect(featureGroup).toBeDefined();

    expect(polydraw.getFeatureMetadata(featureGroup)).toEqual({});
    expect(polydraw.setFeatureMetadata(featureGroup, { hazard: 'erosion', risk: 'high' })).toBe(
      true,
    );
    expect(polydraw.patchFeatureMetadata(featureGroup, { risk: 'medium', source: 'manual' })).toBe(
      true,
    );
    expect(polydraw.getFeatureMetadata(featureGroup)).toEqual({
      hazard: 'erosion',
      risk: 'medium',
      source: 'manual',
    });
  });

  it('preserves feature metadata through undo/redo snapshot restores', async () => {
    await polydraw.addPredefinedPolygon(fixtures.triangle(), {
      metadata: { risk: 'high', source: 'seed' },
    });
    await polydraw.addPredefinedPolygon(fixtures.octagon());

    await polydraw.undo();

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    expect(polydraw.getFeatureMetadata(polydraw.getFeatureGroups()[0])).toEqual({
      risk: 'high',
      source: 'seed',
    });

    await polydraw.redo();

    const restoredFeatureGroup = polydraw
      .getFeatureGroups()
      .find((featureGroup) => polydraw.getFeatureMetadata(featureGroup)?.risk === 'high');
    expect(restoredFeatureGroup).toBeDefined();
    expect(polydraw.getFeatureMetadata(restoredFeatureGroup!)).toEqual({
      risk: 'high',
      source: 'seed',
    });
  });

  it('deep-clones feature metadata across public access and history restores', async () => {
    const metadata = {
      risk: 'high',
      details: {
        owner: 'seed',
        tags: ['initial'],
      },
    };

    await polydraw.addPredefinedPolygon(fixtures.triangle(), { metadata });

    const featureGroup = polydraw.getFeatureGroups()[0];
    const returnedMetadata = polydraw.getFeatureMetadata(featureGroup)!;
    (returnedMetadata.details as { owner: string }).owner = 'mutated-return';

    expect(polydraw.getFeatureMetadata(featureGroup)).toEqual({
      risk: 'high',
      details: {
        owner: 'seed',
        tags: ['initial'],
      },
    });

    await polydraw.addPredefinedPolygon(fixtures.octagon());
    metadata.details.owner = 'mutated-source';
    metadata.details.tags.push('external');

    await polydraw.undo();

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    expect(polydraw.getFeatureMetadata(polydraw.getFeatureGroups()[0])).toEqual({
      risk: 'high',
      details: {
        owner: 'seed',
        tags: ['initial'],
      },
    });
  });

  it('uses incoming metadata when overlapping polygons merge', async () => {
    const [existingPolygon, incomingPolygon] = fixtures.overlappingSquares();

    await polydraw.addPredefinedPolygon([existingPolygon], {
      metadata: { source: 'existing', priority: 1 },
    });
    await polydraw.addPredefinedPolygon([incomingPolygon], {
      metadata: { source: 'incoming', priority: 2 },
    });

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    expect(polydraw.getFeatureMetadata(polydraw.getFeatureGroups()[0])).toEqual({
      source: 'incoming',
      priority: 2,
    });
  });

  it('hydrates metadata from GeoJSON properties when explicit metadata is not provided', async () => {
    const geojsonFeature = MockFactory.createGeoJSONFixtures().squarePolygon() as Feature<Polygon>;
    geojsonFeature.properties = {
      hazard: 'flood',
      confidence: 'high',
    };

    await polydraw.addPredefinedGeoJSONs([geojsonFeature]);

    expect(polydraw.getFeatureGroups()).toHaveLength(1);
    expect(polydraw.getFeatureMetadata(polydraw.getFeatureGroups()[0])).toEqual({
      hazard: 'flood',
      confidence: 'high',
    });
  });
});
