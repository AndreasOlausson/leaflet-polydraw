import { describe, it, expect, vi } from 'vitest';
import { TurfHelper } from '../src/turf-helper';
import type { Feature, Polygon } from 'geojson';

describe('Hole Intersection During Splitting', () => {
  describe('Split Line Through Hole', () => {
    it('should create solid polygons when split line goes through hole (holes disappear naturally)', () => {
      const mockConfig = {};
      const turfHelper = new TurfHelper(mockConfig);

      // Create a round polygon with a big hole in the center
      const polygonWithBigHole: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            // Outer ring (round-ish polygon)
            [
              [0, 0], // west
              [0, 4], // northwest
              [2, 6], // north
              [6, 6], // northeast
              [8, 4], // east
              [8, 0], // southeast
              [6, -2], // south
              [2, -2], // southwest
              [0, 0], // close
            ],
            // Big hole in the center
            [
              [2, 1], // hole southwest
              [2, 3], // hole northwest
              [6, 3], // hole northeast
              [6, 1], // hole southeast
              [2, 1], // close hole
            ],
          ],
        },
      };

      // Create a self-intersecting version by dragging a north point through the hole
      // This simulates dragging a marker from north, through the hole, to the south
      const selfIntersectingPolygon: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            // Outer ring with self-intersection (north point dragged through hole to south)
            [
              [0, 0], // west
              [0, 4], // northwest
              [4, -4], // DRAGGED POINT: north point dragged through hole to south
              [6, 6], // northeast
              [8, 4], // east
              [8, 0], // southeast
              [6, -2], // south
              [2, -2], // southwest
              [0, 0], // close
            ],
            // Big hole in the center (unchanged)
            [
              [2, 1], // hole southwest
              [2, 3], // hole northwest
              [6, 3], // hole northeast
              [6, 1], // hole southeast
              [2, 1], // close hole
            ],
          ],
        },
      };

      // Test: Check if polygon has kinks
      const hasKinks = turfHelper.hasKinks(selfIntersectingPolygon);
      expect(hasKinks).toBe(true);

      // Test: Split the polygon and check results
      const splitResults = turfHelper.getKinks(selfIntersectingPolygon);

      // Verify we get multiple polygons (split occurred)
      expect(splitResults.length).toBeGreaterThan(1);

      // Analyze the results
      let solidPolygonsCount = 0;
      let polygonsWithHoles = 0;
      const totalPolygons = splitResults.length;

      for (const result of splitResults) {
        if (result.geometry.type === 'Polygon') {
          const coords = result.geometry.coordinates;

          if (coords.length === 1) {
            // Solid polygon (no holes)
            solidPolygonsCount++;
            console.log(
              'Found solid polygon with area:',
              Math.abs(calculatePolygonArea(coords[0])),
            );
          } else if (coords.length > 1) {
            // Polygon with holes
            polygonsWithHoles++;
            console.log('Found polygon with', coords.length - 1, 'holes');
          }
        }
      }

      console.log('Total polygons:', totalPolygons);
      console.log('Solid polygons:', solidPolygonsCount);
      console.log('Polygons with holes:', polygonsWithHoles);

      // 🎯 THE CORRECT FIX: When split line goes through hole, holes disappear naturally
      // Expected: 3 solid polygons (west, east, south) - all solid because hole area becomes "nothing"
      // NOT: polygons with full holes (which would be geometrically impossible)

      expect(totalPolygons).toBe(3); // Should split into 3 parts
      expect(solidPolygonsCount).toBe(3); // ALL should be solid (holes disappeared naturally)
      expect(polygonsWithHoles).toBe(0); // NO polygons should have holes (they all disappeared)
    });

    it('should preserve holes when split does NOT go through hole', () => {
      const mockConfig = {};
      const turfHelper = new TurfHelper(mockConfig);

      // Create a polygon with hole where split does NOT go through hole
      const polygonWithHole: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            // Outer ring
            [
              [0, 0],
              [0, 6],
              [10, 6],
              [10, 0],
              [0, 0],
            ],
            // Hole on the left side
            [
              [1, 2],
              [1, 4],
              [3, 4],
              [3, 2],
              [1, 2],
            ],
          ],
        },
      };

      // Create self-intersection on the RIGHT side (away from hole)
      const selfIntersectingPolygon: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            // Outer ring with self-intersection on right side
            [
              [0, 0],
              [0, 6],
              [8, -2], // DRAGGED POINT: right side point dragged down
              [10, 6],
              [10, 0],
              [0, 0],
            ],
            // Hole on the left side (unchanged)
            [
              [1, 2],
              [1, 4],
              [3, 4],
              [3, 2],
              [1, 2],
            ],
          ],
        },
      };

      // Test: Split the polygon
      const splitResults = turfHelper.getKinks(selfIntersectingPolygon);

      // Verify we get multiple polygons
      expect(splitResults.length).toBeGreaterThan(1);

      // In this case, one polygon should get the hole (the left one)
      // and the others should be solid
      let polygonsWithHoles = 0;
      let solidPolygons = 0;

      for (const result of splitResults) {
        if (result.geometry.type === 'Polygon') {
          const coords = result.geometry.coordinates;

          if (coords.length > 1) {
            polygonsWithHoles++;
          } else {
            solidPolygons++;
          }
        }
      }

      // Should have exactly one polygon with hole and others solid
      expect(polygonsWithHoles).toBe(1);
      expect(solidPolygons).toBeGreaterThanOrEqual(1);
    });
  });
});

// Helper function to calculate polygon area using shoelace formula
function calculatePolygonArea(coordinates: number[][]): number {
  let area = 0;
  const n = coordinates.length;

  for (let i = 0; i < n - 1; i++) {
    area += coordinates[i][0] * coordinates[i + 1][1];
    area -= coordinates[i + 1][0] * coordinates[i][1];
  }

  return Math.abs(area) / 2;
}
