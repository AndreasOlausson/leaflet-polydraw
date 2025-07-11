import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { ILatLng, PolydrawFeatureGroup } from './types/polydraw-interfaces';

/**
 * Simple polygon operations following the pattern:
 * 1. Delete polygon
 * 2. Modify using input
 * 3. Add "the fresh, modified" polygon
 */
export class SimplePolygonOperations {
  constructor(
    private arrayOfFeatureGroups: PolydrawFeatureGroup[],
    private map: L.Map,
    private addPolygonLayerCallback: (
      geoJSON: Feature<Polygon | MultiPolygon>,
      simplify: boolean,
    ) => void,
    private removeFeatureGroupCallback: (featureGroup: PolydrawFeatureGroup) => void,
    private addPolygonWithMergeCallback?: (
      geoJSON: Feature<Polygon | MultiPolygon>,
      simplify: boolean,
      noMerge: boolean,
    ) => void,
  ) {}

  /**
   * Update polygon coordinates using the simple approach
   * @param targetFeatureGroup The feature group to update
   * @param newCoordinates New coordinates in GeoJSON format
   */
  updatePolygonCoordinates(
    targetFeatureGroup: PolydrawFeatureGroup,
    newCoordinates: Feature<Polygon | MultiPolygon>,
  ): void {
    console.log('🔧 SimplePolygonOperations.updatePolygonCoordinates() - Starting simple update');
    console.log(
      '🔧 Input coordinates structure:',
      this.analyzeCoordinateStructure(newCoordinates.geometry.coordinates),
    );

    // Step 1: Delete the old polygon
    this.deletePolygon(targetFeatureGroup);

    // Step 2: Modify is already done (newCoordinates contains the modified data)

    // Step 3: Add the fresh, modified polygon
    this.addPolygon(newCoordinates);

    console.log('🔧 SimplePolygonOperations.updatePolygonCoordinates() - Completed simple update');
  }

  /**
   * Step 1: Delete polygon
   */
  private deletePolygon(featureGroup: PolydrawFeatureGroup): void {
    console.log('🔧 SimplePolygonOperations.deletePolygon() - Removing old polygon');
    console.log(
      '🔧 SimplePolygonOperations.deletePolygon() - Array length before callback:',
      this.arrayOfFeatureGroups.length,
    );
    this.removeFeatureGroupCallback(featureGroup);
    console.log(
      '🔧 SimplePolygonOperations.deletePolygon() - Array length after callback:',
      this.arrayOfFeatureGroups.length,
    );
  }

  /**
   * Step 3: Add "the fresh, modified" polygon
   */
  private addPolygon(geoJSON: Feature<Polygon | MultiPolygon>): void {
    console.log('🔧 SimplePolygonOperations.addPolygon() - Adding fresh polygon');

    // 🎯 FIX: Check for merge conditions when adding the dragged polygon
    console.log('🔧 SimplePolygonOperations.addPolygon() - Checking for merge conditions');

    // Check if there are other polygons to potentially merge with
    if (this.arrayOfFeatureGroups.length > 0) {
      console.log(
        '🔧 SimplePolygonOperations.addPolygon() - Found',
        this.arrayOfFeatureGroups.length,
        'existing polygons, checking for intersections',
      );

      // Use the same merge logic as the main addPolygon method
      this.checkAndPerformMerge(geoJSON);
    } else {
      console.log(
        '🔧 SimplePolygonOperations.addPolygon() - No existing polygons, adding directly',
      );
      this.addPolygonLayerCallback(geoJSON, false);
    }
  }

  /**
   * Check for merge conditions and perform merge if needed
   */
  private checkAndPerformMerge(geoJSON: Feature<Polygon | MultiPolygon>): void {
    console.log('🔧 SimplePolygonOperations.checkAndPerformMerge() - Checking for intersections');

    // 🎯 FIX: Use the addPolygonWithMergeCallback if available (includes merge logic)
    if (this.addPolygonWithMergeCallback) {
      console.log(
        '🔧 SimplePolygonOperations.checkAndPerformMerge() - Using addPolygon with merge logic',
      );
      this.addPolygonWithMergeCallback(geoJSON, false, false); // false = simplify, false = noMerge (allow merge)
    } else {
      console.log(
        '🔧 SimplePolygonOperations.checkAndPerformMerge() - No merge callback, adding directly',
      );
      this.addPolygonLayerCallback(geoJSON, false);
    }
  }

  /**
   * Analyze coordinate structure for debugging
   */
  private analyzeCoordinateStructure(coords: any): string {
    if (!Array.isArray(coords)) return 'NOT_ARRAY';

    let structure = '[';
    if (coords.length > 0) {
      if (Array.isArray(coords[0])) {
        structure += '[';
        if (coords[0].length > 0) {
          if (Array.isArray(coords[0][0])) {
            structure += '[';
            if (coords[0][0].length > 0) {
              if (typeof coords[0][0][0] === 'number') {
                structure += 'NUMBER';
              } else {
                structure += 'OTHER';
              }
            }
            structure += ']';
          } else {
            structure += 'NOT_ARRAY';
          }
        }
        structure += ']';
      } else {
        structure += 'NOT_ARRAY';
      }
    }
    structure += ']';

    return `${structure} (length: ${coords.length})`;
  }
}
