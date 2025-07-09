import * as L from 'leaflet';
import { TurfHelper } from '../turf-helper';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { ILatLng, PolydrawConfig, PolydrawFeatureGroup } from '../types/polydraw-interfaces';
import type { PolydrawStateManager } from '../core/state-manager';

/**
 * Manages polygon lifecycle operations (add, subtract, merge, delete)
 * Integrated with State Manager for centralized state management
 */
export class PolygonManager {
  private map: L.Map;
  private turfHelper: TurfHelper;
  private config: PolydrawConfig;
  private stateManager: PolydrawStateManager;

  // Callbacks to main polydraw class for operations that need UI updates
  private addPolygonLayerCallback: (
    geoJSON: any,
    simplify: boolean,
    dynamicTolerance?: boolean,
    visualOptimizationLevel?: number,
  ) => void;
  private deletePolygonCallback: (polygon: ILatLng[][]) => void;
  private removeFeatureGroupCallback: (featureGroup: L.FeatureGroup) => void;
  private getArrayOfFeatureGroupsCallback: () => PolydrawFeatureGroup[];

  constructor(
    map: L.Map,
    turfHelper: TurfHelper,
    config: PolydrawConfig,
    stateManager: PolydrawStateManager,
    addPolygonLayerCallback: (
      geoJSON: any,
      simplify: boolean,
      dynamicTolerance?: boolean,
      visualOptimizationLevel?: number,
    ) => void,
    deletePolygonCallback: (polygon: ILatLng[][]) => void,
    removeFeatureGroupCallback: (featureGroup: L.FeatureGroup) => void,
    getArrayOfFeatureGroupsCallback: () => PolydrawFeatureGroup[],
  ) {
    this.map = map;
    this.turfHelper = turfHelper;
    this.config = config;
    this.stateManager = stateManager;
    this.addPolygonLayerCallback = addPolygonLayerCallback;
    this.deletePolygonCallback = deletePolygonCallback;
    this.removeFeatureGroupCallback = removeFeatureGroupCallback;
    this.getArrayOfFeatureGroupsCallback = getArrayOfFeatureGroupsCallback;
  }

  /**
   * Add a new polygon, potentially merging with existing ones
   */
  addPolygon(
    latlngs: Feature<Polygon | MultiPolygon>,
    simplify: boolean,
    noMerge: boolean = false,
  ): void {
    // Use State Manager for polygon kinks state
    const hasKinks = this.stateManager.getPolygonHasKinks();

    if (
      this.config.mergePolygons &&
      !noMerge &&
      this.getArrayOfFeatureGroupsCallback().length > 0 &&
      !hasKinks
    ) {
      this.merge(latlngs);
    } else {
      this.addPolygonLayerCallback(latlngs, simplify);
    }
  }

  /**
   * Subtract a polygon from existing polygons
   */
  subtractPolygon(latlngs: Feature<Polygon | MultiPolygon>): void {
    const addHole = latlngs;
    const newPolygons = [];
    const arrayOfFeatureGroups = this.getArrayOfFeatureGroupsCallback();

    arrayOfFeatureGroups.forEach((featureGroup) => {
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
          console.warn(
            'PolygonManager: subtractPolygon() - skipping invalid feature group:',
            featureCollection,
          );
          return; // Skip this feature group
        }

        const layer = featureCollection.features[0];
        const poly = this.getLatLngsFromJson(layer);
        const feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
        const newPolygon = this.turfHelper.polygonDifference(feature, addHole);

        if (newPolygon) {
          newPolygons.push(newPolygon);
        }

        this.deletePolygonCallback(poly);
        this.removeFeatureGroupCallback(featureGroup);
      } catch (error) {
        console.warn(
          'PolygonManager: subtractPolygon() - error processing feature group:',
          error.message,
        );
        // Continue with next feature group
      }
    });

    // After subtracting from all, add the remaining polygons
    newPolygons.forEach((np) => {
      this.addPolygonLayerCallback(np, true, false, 0);
    });
  }

  /**
   * Delete a specific polygon
   */
  deletePolygon(polygon: ILatLng[][]): void {
    const arrayOfFeatureGroups = this.getArrayOfFeatureGroupsCallback();

    if (arrayOfFeatureGroups.length > 0) {
      arrayOfFeatureGroups.forEach((featureGroup) => {
        const layer = featureGroup.getLayers()[0] as any;
        const latlngs = layer.getLatLngs();
        const length = latlngs.length;

        latlngs.forEach((latlng, index) => {
          let polygon3;
          const test = [...latlng];

          if (latlng.length > 1) {
            if (latlng[0][0] !== latlng[0][latlng[0].length - 1]) {
              test[0].push(latlng[0][0]);
            }
            polygon3 = [test[0]];
          } else {
            if (latlng[0] !== latlng[latlng.length - 1]) {
              test.push(latlng[0]);
            }
            polygon3 = test;
          }

          const equals = this.polygonArrayEquals(polygon3, polygon);

          if (equals && length === 1) {
            this.removeFeatureGroupCallback(featureGroup);
          } else if (equals && length > 1) {
            latlngs.splice(index, 1);
            layer.setLatLngs(latlngs);
            this.removeFeatureGroupCallback(featureGroup);
            this.addPolygonLayerCallback(layer.toGeoJSON(), false);
          }
        });
      });
    }
  }

  /**
   * Remove all feature groups
   */
  removeAllFeatureGroups(): void {
    const arrayOfFeatureGroups = this.getArrayOfFeatureGroupsCallback();

    arrayOfFeatureGroups.forEach((featureGroups) => {
      try {
        this.map.removeLayer(featureGroups);
      } catch (error) {
        // Silently handle layer removal errors in test environment
      }
    });

    // Clear the array through the callback
    // Note: This will be handled by the main polydraw class
  }

  /**
   * Merge polygons with intersecting ones
   */
  private merge(latlngs: Feature<Polygon | MultiPolygon>): void {
    const polygonFeature = [];
    const newArray: L.FeatureGroup[] = [];
    let polyIntersection: boolean = false;
    const arrayOfFeatureGroups = this.getArrayOfFeatureGroupsCallback();

    arrayOfFeatureGroups.forEach((featureGroup, index) => {
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
          console.warn(
            'PolygonManager: merge() - skipping invalid feature group:',
            featureCollection,
          );
          return; // Skip this feature group
        }

        if (featureCollection.features[0].geometry.coordinates.length > 1) {
          featureCollection.features[0].geometry.coordinates.forEach((element) => {
            const feature = this.turfHelper.getMultiPolygon([element]);
            polyIntersection = this.turfHelper.polygonIntersect(feature, latlngs);
            if (polyIntersection) {
              newArray.push(featureGroup);
              polygonFeature.push(feature);
            }
          });
        } else {
          const feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
          polyIntersection = this.turfHelper.polygonIntersect(feature, latlngs);

          if (!polyIntersection) {
            try {
              const directIntersection = this.turfHelper.getIntersection(feature, latlngs);
              if (
                directIntersection &&
                directIntersection.geometry &&
                (directIntersection.geometry.type === 'Polygon' ||
                  directIntersection.geometry.type === 'MultiPolygon')
              ) {
                polyIntersection = true;
              }
            } catch (error) {
              // Silently handle intersection errors
            }
          }
          if (polyIntersection) {
            newArray.push(featureGroup);
            polygonFeature.push(feature);
          }
        }
      } catch (error) {
        console.warn('PolygonManager: merge() - error processing feature group:', error.message);
        // Continue with next feature group
      }
    });

    if (newArray.length > 0) {
      this.unionPolygons(newArray, latlngs, polygonFeature);
    } else {
      this.addPolygonLayerCallback(latlngs, true);
    }
  }

  /**
   * Union multiple polygons
   */
  private unionPolygons(
    layers: L.FeatureGroup[],
    latlngs: Feature<Polygon | MultiPolygon>,
    polygonFeature: Feature<Polygon | MultiPolygon>[],
  ): void {
    let resultPolygon = latlngs;
    const processedFeatureGroups: L.FeatureGroup[] = [];

    // Process each intersecting polygon
    layers.forEach((featureGroup, i) => {
      const featureCollection = featureGroup.toGeoJSON() as any;
      const layer = featureCollection.features[0];
      const poly = this.getLatLngsFromJson(layer);
      const existingPolygon = polygonFeature[i];

      // Check the type of intersection to determine the correct operation
      const intersectionType = this.analyzeIntersectionType(resultPolygon, existingPolygon);

      if (intersectionType === 'should_create_holes') {
        const union = this.turfHelper.union(resultPolygon, existingPolygon);
        if (union) {
          resultPolygon = union;
        }
      } else {
        const union = this.turfHelper.union(resultPolygon, existingPolygon);
        if (union) {
          resultPolygon = union;
        }
      }

      processedFeatureGroups.push(featureGroup);
      try {
        this.deletePolygonOnMerge(poly);
      } catch (error) {
        // Silently handle polygon deletion errors in test environment
      }
      try {
        this.removeFeatureGroupCallback(featureGroup);
      } catch (error) {
        // Silently handle feature group removal errors in test environment
      }
    });

    // Add the final result
    try {
      this.addPolygonLayerCallback(resultPolygon, true);
    } catch (error) {
      // In test environment, still add to array even if map rendering fails
      console.warn('PolygonManager: unionPolygons() - error adding result polygon:', error.message);
    }
  }

  /**
   * Analyze intersection type between polygons
   */
  private analyzeIntersectionType(
    newPolygon: Feature<Polygon | MultiPolygon>,
    existingPolygon: Feature<Polygon | MultiPolygon>,
  ): string {
    try {
      // Check if the new polygon is completely contained within the existing polygon
      try {
        const difference = this.turfHelper.polygonDifference(existingPolygon, newPolygon);

        if (
          difference &&
          difference.geometry.type === 'Polygon' &&
          difference.geometry.coordinates.length > 1
        ) {
          return 'should_create_holes';
        }
      } catch (error) {
        // Silently handle difference operation errors
      }

      // Check if this is a complex cutting scenario using proper geometric analysis
      try {
        // Method 1: Check convexity - complex shapes are usually non-convex
        const convexHull = this.turfHelper.getConvexHull(existingPolygon);
        if (convexHull) {
          const convexArea = this.turfHelper.getPolygonArea(convexHull);
          const actualArea = this.turfHelper.getPolygonArea(existingPolygon);
          const convexityRatio = actualArea / convexArea;

          // If shape is significantly non-convex (< 0.7), it might be complex
          if (convexityRatio < 0.7) {
            const difference = this.turfHelper.polygonDifference(existingPolygon, newPolygon);
            if (difference && difference.geometry.type === 'MultiPolygon') {
              return 'should_create_holes';
            }
          }
        }

        // Method 2: Check intersection complexity
        const intersection = this.turfHelper.getIntersection(newPolygon, existingPolygon);
        if (intersection && intersection.geometry.type === 'MultiPolygon') {
          // Multiple intersection areas = complex cut-through scenario
          return 'should_create_holes';
        }

        // Method 3: Area ratio analysis for partial overlaps
        if (intersection) {
          const intersectionArea = this.turfHelper.getPolygonArea(intersection);
          const newArea = this.turfHelper.getPolygonArea(newPolygon);
          const existingArea = this.turfHelper.getPolygonArea(existingPolygon);

          // Check if it's a significant but partial overlap (not full containment)
          const overlapRatioExisting = intersectionArea / existingArea;
          const overlapRatioNew = intersectionArea / newArea;

          if (
            overlapRatioExisting > 0.1 &&
            overlapRatioExisting < 0.9 &&
            overlapRatioNew > 0.1 &&
            overlapRatioNew < 0.9
          ) {
            // Significant partial overlap might indicate cut-through
            const difference = this.turfHelper.polygonDifference(existingPolygon, newPolygon);
            if (difference && difference.geometry.type === 'MultiPolygon') {
              return 'should_create_holes';
            }
          }
        }
      } catch (error) {
        // Silently handle geometric analysis errors
      }

      return 'standard_union';
    } catch (error) {
      return 'standard_union';
    }
  }

  /**
   * Extract LatLng coordinates from GeoJSON feature
   */
  private getLatLngsFromJson(feature: Feature<Polygon | MultiPolygon>): ILatLng[][] {
    let coord: ILatLng[][];
    if (feature) {
      if (feature.geometry.coordinates.length > 1 && feature.geometry.type === 'MultiPolygon') {
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]) as ILatLng[][];
      } else if (
        feature.geometry.coordinates[0].length > 1 &&
        feature.geometry.type === 'Polygon'
      ) {
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0]) as ILatLng[][];
      } else {
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]) as ILatLng[][];
      }
    }
    return coord;
  }

  /**
   * Compare two polygon arrays for equality
   */
  private polygonArrayEquals(poly1: any[], poly2: any[]): boolean {
    if (poly1[0][0]) {
      if (!poly1[0][0].equals(poly2[0][0])) return false;
    } else {
      if (!poly1[0].equals(poly2[0])) return false;
    }
    if (poly1.length !== poly2.length) return false;
    return true;
  }

  /**
   * Delete polygon during merge operations
   */
  private deletePolygonOnMerge(polygon: any): void {
    let polygon2 = [];
    const arrayOfFeatureGroups = this.getArrayOfFeatureGroupsCallback();

    if (arrayOfFeatureGroups.length > 0) {
      arrayOfFeatureGroups.forEach((featureGroup) => {
        const layer = featureGroup.getLayers()[0] as any;
        const latlngs = layer.getLatLngs()[0];
        polygon2 = [...latlngs[0]];
        if (latlngs[0][0] !== latlngs[0][latlngs[0].length - 1]) {
          polygon2.push(latlngs[0][0]);
        }
        const equals = this.polygonArrayEqualsMerge(polygon2, polygon);

        if (equals) {
          this.removeFeatureGroupCallback(featureGroup);
          this.deletePolygonCallback(polygon);
        }
      });
    }
  }

  /**
   * Compare polygon arrays for merge operations
   */
  private polygonArrayEqualsMerge(poly1: any[], poly2: any[]): boolean {
    return poly1.toString() === poly2.toString();
  }

  /**
   * Set current polygon kinks state (delegates to State Manager)
   */
  setCurrentPolygonHasKinks(hasKinks: boolean): void {
    this.stateManager.setPolygonHasKinks(hasKinks);
  }

  /**
   * Get current polygon kinks state (delegates to State Manager)
   */
  getCurrentPolygonHasKinks(): boolean {
    return this.stateManager.getPolygonHasKinks();
  }
}
