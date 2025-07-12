import { describe, it, expect, vi } from 'vitest';
import { TurfHelper } from '../src/turf-helper';
import type { Feature, Polygon } from 'geojson';

describe('Hole Preservation During Splitting', () => {
  describe('Polygon with Holes Splitting', () => {
    it('should preserve hole structure when splitting polygon with self-intersection', () => {
      const mockConfig = {};
      const turfHelper = new TurfHelper(mockConfig);

      // Create a "cigar" shaped polygon with a hole on the east side
      // This simulates the user's scenario: west-to-east polygon with hole on right
      const polygonWithHole: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            // Outer ring (cigar shape from west to east)
            [
              [0, 0], // west
              [0, 2], // northwest
              [8, 2], // northeast
              [8, 0], // east
              [8, -2], // southeast
              [0, -2], // southwest
              [0, 0], // close
            ],
            // Hole on the east side
            [
              [6, -1], // hole southwest
              [6, 1], // hole northwest
              [7, 1], // hole northeast
              [7, -1], // hole southeast
              [6, -1], // close hole
            ],
          ],
        },
      };

      // Create a self-intersecting version by dragging a north point through the polygon
      // This simulates dragging a marker to create a kink
      const selfIntersectingPolygon: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            // Outer ring with self-intersection (north point dragged south)
            [
              [0, 0], // west
              [0, 2], // northwest
              [4, -3], // DRAGGED POINT: north point dragged south through polygon
              [8, 2], // northeast
              [8, 0], // east
              [8, -2], // southeast
              [0, -2], // southwest
              [0, 0], // close
            ],
            // Hole on the east side (unchanged)
            [
              [6, -1], // hole southwest
              [6, 1], // hole northwest
              [7, 1], // hole northeast
              [7, -1], // hole southeast
              [6, -1], // close hole
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

      // Verify that at least one polygon still has a hole
      let foundPolygonWithHole = false;
      let foundStandaloneHole = false;

      for (const result of splitResults) {
        if (result.geometry.type === 'Polygon') {
          const coords = result.geometry.coordinates;

          if (coords.length > 1) {
            // This polygon has holes
            foundPolygonWithHole = true;
            console.log('Found polygon with hole:', coords.length - 1, 'holes');
          } else if (coords.length === 1) {
            // Check if this is a very small polygon (might be the hole)
            const ring = coords[0];
            const area = Math.abs(calculatePolygonArea(ring));

            // If it's a small polygon in the expected hole area, it might be the standalone hole
            if (area < 5) {
              // Small area threshold
              foundStandaloneHole = true;
              console.log('Found potential standalone hole with area:', area);
            }
          }
        }
      }

      // 🎯 THE FIX: We should have a polygon with hole, NOT a standalone hole
      expect(foundPolygonWithHole).toBe(true);
      expect(foundStandaloneHole).toBe(false);

      console.log('Split results:', splitResults.length, 'polygons');
      console.log('Found polygon with hole:', foundPolygonWithHole);
      console.log('Found standalone hole:', foundStandaloneHole);
    });

    it('should handle simple polygon splitting without holes', () => {
      const mockConfig = {};
      const turfHelper = new TurfHelper(mockConfig);

      // Create a simple polygon without holes
      const simplePolygon: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0, 2],
              [4, -3], // Self-intersecting point
              [8, 2],
              [8, 0],
              [0, 0],
            ],
          ],
        },
      };

      // Test: Check if polygon has kinks
      const hasKinks = turfHelper.hasKinks(simplePolygon);
      expect(hasKinks).toBe(true);

      // Test: Split the polygon
      const splitResults = turfHelper.getKinks(simplePolygon);

      // Verify we get multiple polygons
      expect(splitResults.length).toBeGreaterThan(1);

      // Verify all results are simple polygons (no holes)
      for (const result of splitResults) {
        if (result.geometry.type === 'Polygon') {
          expect(result.geometry.coordinates.length).toBe(1);
        }
      }
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
