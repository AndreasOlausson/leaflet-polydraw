import * as L from 'leaflet';
import { TurfHelper } from '../turf-helper';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { ILatLng, PolydrawConfig, PolydrawFeatureGroup } from '../types/polydraw-interfaces';

/**
 * Manages polygon operations including merge, union, subtract, and intersection analysis
 */
export class PolygonOperationsManager {
  constructor(
    private config: PolydrawConfig,
    private turfHelper: TurfHelper,
    private map: L.Map,
    private getArrayOfFeatureGroups: () => PolydrawFeatureGroup[],
    private addPolygonLayerCallback: (geoJSON: any, simplify: boolean, noMerge?: boolean) => void,
    private deletePolygonCallback: (polygon: ILatLng[][]) => void,
    private removeFeatureGroupCallback: (featureGroup: L.FeatureGroup) => void,
    private getLatLngsFromJsonCallback: (feature: Feature<Polygon | MultiPolygon>) => ILatLng[][],
  ) {}

  /**
   * Subtract polygon from all existing polygons
   */
  subtract(latlngs: Feature<Polygon | MultiPolygon>) {
    const addHole = latlngs;
    const newPolygons = [];

    this.getArrayOfFeatureGroups().forEach((featureGroup) => {
      try {
        const featureCollection = featureGroup.toGeoJSON() as any;

        // Validate feature collection before accessing features[0]
        if (
          !featureCollection ||
          !featureCollection.features ||
          featureCollection.features.length === 0 ||
          !featureCollection.features[0] ||
          !featureCollection.features[0].geometry
        ) {
          console.warn('DEBUG: subtract() - skipping invalid feature group:', featureCollection);
          return; // Skip this feature group
        }

        const layer = featureCollection.features[0];
        const poly = this.getLatLngsFromJsonCallback(layer);
        const feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
        const newPolygon = this.turfHelper.polygonDifference(feature, addHole);

        if (newPolygon) {
          newPolygons.push(newPolygon);
        }
        this.deletePolygonCallback(poly);
        this.removeFeatureGroupOnMerge(featureGroup);
      } catch (error) {
        console.warn('DEBUG: subtract() - error processing feature group:', error.message);
        // Continue with next feature group
      }
    });

    // After subtracting from all, add the remaining polygons
    newPolygons.forEach((np) => {
      this.addPolygonLayerCallback(np, true, true);
    });

    // Clean up any empty feature groups that might remain
    this.cleanupEmptyFeatureGroups();
  }

  // /**
  //  * Add a new polygon, potentially merging with existing ones
  //  */
  // addPolygon(
  //   latlngs: Feature<Polygon | MultiPolygon>,
  //   simplify: boolean,
  //   noMerge: boolean = false,
  //   hasKinks: boolean = false,
  // ) {
  //   if (
  //     this.config.mergePolygons &&
  //     !noMerge &&
  //     this.getArrayOfFeatureGroups().length > 0 &&
  //     !hasKinks
  //   ) {
  //     this.merge(latlngs);
  //   } else {
  //     this.addPolygonLayerCallback(latlngs, simplify);
  //   }
  // }

  // /**
  //  * Merge polygon with intersecting existing polygons
  //  */
  // private merge(latlngs: Feature<Polygon | MultiPolygon>) {
  //   // Clean up any empty feature groups before starting
  //   this.cleanupEmptyFeatureGroups();

  //   const polygonFeature = [];
  //   const newArray: L.FeatureGroup[] = [];
  //   let polyIntersection: boolean = false;

  //   this.getArrayOfFeatureGroups().forEach((featureGroup, index) => {
  //     try {
  //       const featureCollection = featureGroup.toGeoJSON() as any;

  //       // Validate feature collection before accessing features[0]
  //       if (
  //         !featureCollection ||
  //         !featureCollection.features ||
  //         featureCollection.features.length === 0 ||
  //         !featureCollection.features[0] ||
  //         !featureCollection.features[0].geometry
  //       ) {
  //         console.warn('DEBUG: merge() - skipping invalid feature group:', featureCollection);
  //         return; // Skip this feature group
  //       }

  //       if (featureCollection.features[0].geometry.coordinates.length > 1) {
  //         featureCollection.features[0].geometry.coordinates.forEach((element) => {
  //           const feature = this.turfHelper.getMultiPolygon([element]);
  //           polyIntersection = this.turfHelper.polygonIntersect(feature, latlngs);
  //           if (polyIntersection) {
  //             newArray.push(featureGroup);
  //             polygonFeature.push(feature);
  //           }
  //         });
  //       } else {
  //         const feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
  //         polyIntersection = this.turfHelper.polygonIntersect(feature, latlngs);

  //         if (!polyIntersection) {
  //           try {
  //             const directIntersection = this.turfHelper.getIntersection(feature, latlngs);
  //             if (
  //               directIntersection &&
  //               directIntersection.geometry &&
  //               (directIntersection.geometry.type === 'Polygon' ||
  //                 directIntersection.geometry.type === 'MultiPolygon')
  //             ) {
  //               polyIntersection = true;
  //             }
  //           } catch (error) {
  //             // Silently handle intersection errors
  //           }
  //         }
  //         if (polyIntersection) {
  //           newArray.push(featureGroup);
  //           polygonFeature.push(feature);
  //         }
  //       }
  //     } catch (error) {
  //       console.warn('DEBUG: merge() - error processing feature group:', error.message);
  //       // Continue with next feature group
  //     }
  //   });

  //   if (newArray.length > 0) {
  //     this.unionPolygons(newArray, latlngs, polygonFeature);
  //   } else {
  //     this.addPolygonLayerCallback(latlngs, true);
  //   }
  // }

  // /**
  //  * Perform union operations on intersecting polygons
  //  */
  // private unionPolygons(
  //   layers: L.FeatureGroup[],
  //   latlngs: Feature<Polygon | MultiPolygon>,
  //   polygonFeature: Feature<Polygon | MultiPolygon>[],
  // ) {
  //   // Enhanced union logic to handle complex merge scenarios including holes

  //   let resultPolygon = latlngs;
  //   const processedFeatureGroups: L.FeatureGroup[] = [];

  //   // Process each intersecting polygon
  //   layers.forEach((featureGroup, i) => {
  //     const featureCollection = featureGroup.toGeoJSON() as any;
  //     const layer = featureCollection.features[0];
  //     const poly = this.getLatLngsFromJsonCallback(layer);
  //     const existingPolygon = polygonFeature[i];

  //     // Check the type of intersection to determine the correct operation
  //     const intersectionType = this.analyzeIntersectionType(resultPolygon, existingPolygon);

  //     if (intersectionType === 'should_create_holes') {
  //       // For complex cut-through scenarios, we actually want to MERGE (union) the polygons
  //       // The "should_create_holes" name is misleading - it means "complex intersection detected"
  //       const union = this.turfHelper.union(resultPolygon, existingPolygon);
  //       if (union) {
  //         resultPolygon = union;
  //       }
  //     } else {
  //       // Standard union operation for normal merges
  //       const union = this.turfHelper.union(resultPolygon, existingPolygon);
  //       if (union) {
  //         resultPolygon = union;
  //       }
  //     }

  //     // Mark for removal
  //     processedFeatureGroups.push(featureGroup);
  //     try {
  //       this.deletePolygonOnMerge(poly);
  //     } catch (error) {
  //       // Silently handle polygon deletion errors in test environment
  //     }
  //     try {
  //       this.removeFeatureGroupCallback(featureGroup);
  //     } catch (error) {
  //       // Silently handle feature group removal errors in test environment
  //     }
  //   });

  //   // Add the final result
  //   try {
  //     this.addPolygonLayerCallback(resultPolygon, true);
  //   } catch (error) {
  //     // In test environment, still add to array even if map rendering fails
  //     this.getArrayOfFeatureGroups().push(new L.FeatureGroup());
  //   }
  // }

  // /**
  //  * Get LatLng coordinates from GeoJSON feature
  //  */
  // private getLatLngsFromJson(feature: Feature<Polygon | MultiPolygon>): ILatLng[][] {
  //   // Extract LatLng coordinates from GeoJSON feature
  //   let coord: ILatLng[][];
  //   if (feature) {
  //     if (feature.geometry.coordinates.length > 1 && feature.geometry.type === 'MultiPolygon') {
  //       coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]) as ILatLng[][];
  //     } else if (
  //       feature.geometry.coordinates[0].length > 1 &&
  //       feature.geometry.type === 'Polygon'
  //     ) {
  //       coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0]) as ILatLng[][];
  //     } else {
  //       coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]) as ILatLng[][];
  //     }
  //   }

  //   return coord;
  // }

  // /**
  //  * Analyze intersection type between two polygons
  //  */
  // private analyzeIntersectionType(
  //   newPolygon: Feature<Polygon | MultiPolygon>,
  //   existingPolygon: Feature<Polygon | MultiPolygon>,
  // ): string {
  //   try {
  //     // Check if the new polygon is completely contained within the existing polygon
  //     // This is the primary case where we want to create holes
  //     try {
  //       const difference = this.turfHelper.polygonDifference(existingPolygon, newPolygon);

  //       if (
  //         difference &&
  //         difference.geometry.type === 'Polygon' &&
  //         difference.geometry.coordinates.length > 1
  //       ) {
  //         // If difference creates a polygon with holes, the new polygon was likely contained
  //         return 'should_create_holes';
  //       }
  //     } catch (error) {
  //       // Silently handle difference operation errors
  //     }

  //     // Check if this is a complex cutting scenario using proper geometric analysis
  //     // instead of arbitrary vertex count
  //     try {
  //       // Method 1: Check convexity - complex shapes are usually non-convex
  //       const convexHull = this.turfHelper.getConvexHull(existingPolygon);
  //       if (convexHull) {
  //         const convexArea = this.turfHelper.getPolygonArea(convexHull);
  //         const actualArea = this.turfHelper.getPolygonArea(existingPolygon);
  //         const convexityRatio = actualArea / convexArea;

  //         // If shape is significantly non-convex (< 0.7), it might be complex
  //         if (convexityRatio < 0.7) {
  //           const difference = this.turfHelper.polygonDifference(existingPolygon, newPolygon);
  //           if (difference && difference.geometry.type === 'MultiPolygon') {
  //             return 'should_create_holes';
  //           }
  //         }
  //       }

  //       // Method 2: Check intersection complexity
  //       const intersection = this.turfHelper.getIntersection(newPolygon, existingPolygon);
  //       if (intersection && intersection.geometry.type === 'MultiPolygon') {
  //         // Multiple intersection areas = complex cut-through scenario
  //         return 'should_create_holes';
  //       }

  //       // Method 3: Area ratio analysis for partial overlaps
  //       if (intersection) {
  //         const intersectionArea = this.turfHelper.getPolygonArea(intersection);
  //         const newArea = this.turfHelper.getPolygonArea(newPolygon);
  //         const existingArea = this.turfHelper.getPolygonArea(existingPolygon);

  //         // Check if it's a significant but partial overlap (not full containment)
  //         const overlapRatioExisting = intersectionArea / existingArea;
  //         const overlapRatioNew = intersectionArea / newArea;

  //         if (
  //           overlapRatioExisting > 0.1 &&
  //           overlapRatioExisting < 0.9 &&
  //           overlapRatioNew > 0.1 &&
  //           overlapRatioNew < 0.9
  //         ) {
  //           // Significant partial overlap might indicate cut-through
  //           const difference = this.turfHelper.polygonDifference(existingPolygon, newPolygon);
  //           if (difference && difference.geometry.type === 'MultiPolygon') {
  //             return 'should_create_holes';
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       // Silently handle geometric analysis errors
  //     }

  //     // Default to standard union for normal merging cases
  //     return 'standard_union';
  //   } catch (error) {
  //     // Silently handle intersection analysis errors
  //     return 'standard_union';
  //   }
  // }

  // /**
  //  * Delete polygon during merge operations
  //  */
  // private deletePolygonOnMerge(polygon: any) {
  //   let polygon2 = [];
  //   const arrayOfFeatureGroups = this.getArrayOfFeatureGroups();
  //   if (arrayOfFeatureGroups.length > 0) {
  //     arrayOfFeatureGroups.forEach((featureGroup) => {
  //       const layer = featureGroup.getLayers()[0] as any;
  //       const latlngs = layer.getLatLngs()[0];
  //       polygon2 = [...latlngs[0]];
  //       if (latlngs[0][0] !== latlngs[0][latlngs[0].length - 1]) {
  //         polygon2.push(latlngs[0][0]);
  //       }
  //       const equals = this.polygonArrayEqualsMerge(polygon2, polygon);

  //       if (equals) {
  //         this.removeFeatureGroupOnMerge(featureGroup);
  //         this.deletePolygonCallback(polygon);
  //       }
  //     });
  //   }
  // }

  /**
   * Remove a feature group during merge operations
   */
  private removeFeatureGroupOnMerge(featureGroup: L.FeatureGroup) {
    if (featureGroup.getLayers()[0]) {
      featureGroup.clearLayers();
      this.map.removeLayer(featureGroup);
    }
  }

  // /**
  //  * Compare two polygon arrays for equality in merge operations
  //  */
  // private polygonArrayEqualsMerge(poly1: any[], poly2: any[]): boolean {
  //   return poly1.toString() === poly2.toString();
  // }

  /**
   * Clean up any empty feature groups that remain after operations
   */
  private cleanupEmptyFeatureGroups(): void {
    const arrayOfFeatureGroups = this.getArrayOfFeatureGroups();

    // Filter out feature groups that have no features or invalid features
    const validFeatureGroups = arrayOfFeatureGroups.filter((featureGroup) => {
      try {
        const featureCollection = featureGroup.toGeoJSON() as any;

        const hasValidFeatures =
          featureCollection &&
          featureCollection.features &&
          featureCollection.features.length > 0 &&
          featureCollection.features[0] &&
          featureCollection.features[0].geometry;

        if (!hasValidFeatures) {
          // Remove from map if it exists
          try {
            this.map.removeLayer(featureGroup);
          } catch (error) {
            // Silently handle removal errors
          }
          return false;
        }
        return true;
      } catch (error) {
        // Remove problematic feature groups
        try {
          this.map.removeLayer(featureGroup);
        } catch (removeError) {
          // Silently handle removal errors
        }
        return false;
      }
    });

    // Update the array with only valid feature groups
    arrayOfFeatureGroups.length = 0;
    arrayOfFeatureGroups.push(...validFeatureGroups);
  }
}
