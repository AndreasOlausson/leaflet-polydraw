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
    this.removeFeatureGroupCallback(featureGroup);
  }

  /**
   * Step 3: Add "the fresh, modified" polygon
   */
  private addPolygon(geoJSON: Feature<Polygon | MultiPolygon>): void {
    console.log('🔧 SimplePolygonOperations.addPolygon() - Adding fresh polygon');
    this.addPolygonLayerCallback(geoJSON, false);
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
