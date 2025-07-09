import * as L from 'leaflet';
import { TurfHelper } from '../turf-helper';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { ILatLng } from '../polygon-helpers';

/**
 * Manages polygon lifecycle operations (add, subtract, merge, delete)
 *
 * NOTE: This file is currently unused by polydraw.ts and has been converted to a shell.
 * All functionality has been commented out but preserved for potential future use.
 * polydraw.ts handles polygon management directly.
 */
export class PolygonManager {
  // private map: L.Map;
  // private turfHelper: TurfHelper;
  // private config: any;
  // private arrayOfFeatureGroups: L.FeatureGroup<L.Layer>[] = [];
  // private currentPolygonHasKinks: boolean = false;

  constructor(
    map: L.Map,
    turfHelper: TurfHelper,
    config: any,
    featureGroups: L.FeatureGroup<L.Layer>[],
  ) {
    // this.map = map;
    // this.turfHelper = turfHelper;
    // this.config = config;
    // this.arrayOfFeatureGroups = featureGroups;
  }

  // /**
  //  * Add a new polygon, potentially merging with existing ones
  //  */
  // addPolygon(
  //   latlngs: Feature<Polygon | MultiPolygon>,
  //   simplify: boolean,
  //   noMerge: boolean = false,
  // ): void {
  //   // Use currentPolygonHasKinks for runtime state, fallback to global kinks config
  //   const hasKinks = this.currentPolygonHasKinks || this.config.kinks;

  //   if (
  //     this.config.mergePolygons &&
  //     !noMerge &&
  //     this.arrayOfFeatureGroups.length > 0 &&
  //     !hasKinks
  //   ) {
  //     this.merge(latlngs);
  //   } else {
  //     // This will be handled by the main class for now
  //     // TODO: Move addPolygonLayer logic here
  //   }
  // }

  // /**
  //  * Subtract a polygon from existing polygons
  //  */
  // subtractPolygon(latlngs: Feature<Polygon | MultiPolygon>): void {
  //   const addHole = latlngs;
  //   const newPolygons = [];

  //   this.arrayOfFeatureGroups.forEach((featureGroup) => {
  //     const featureCollection = featureGroup.toGeoJSON() as any;
  //     const layer = featureCollection.features[0];
  //     const poly = this.getLatLngsFromJson(layer);
  //     const feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
  //     const newPolygon = this.turfHelper.polygonDifference(feature, addHole);

  //     if (newPolygon) {
  //       newPolygons.push(newPolygon);
  //     }

  //     this.deletePolygon(poly);
  //     this.removeFeatureGroupOnMerge(featureGroup);
  //   });

  //   // After subtracting from all, add the remaining polygons
  //   newPolygons.forEach((np) => {
  //     this.addPolygon(np, true, true);
  //   });
  // }

  // /**
  //  * Delete a specific polygon
  //  */
  // deletePolygon(polygon: ILatLng[][]): void {
  //   if (this.arrayOfFeatureGroups.length > 0) {
  //     this.arrayOfFeatureGroups.forEach((featureGroup) => {
  //       const layer = featureGroup.getLayers()[0] as any;
  //       const latlngs = layer.getLatLngs();
  //       const length = latlngs.length;

  //       latlngs.forEach((latlng, index) => {
  //         let polygon3;
  //         const test = [...latlng];

  //         if (latlng.length > 1) {
  //           if (latlng[0][0] !== latlng[0][latlng[0].length - 1]) {
  //             test[0].push(latlng[0][0]);
  //           }
  //           polygon3 = [test[0]];
  //         } else {
  //           if (latlng[0] !== latlng[latlng.length - 1]) {
  //             test.push(latlng[0]);
  //           }
  //           polygon3 = test;
  //         }

  //         const equals = this.polygonArrayEquals(polygon3, polygon);

  //         if (equals && length === 1) {
  //           // TODO: Handle polygon information deletion
  //           this.removeFeatureGroup(featureGroup);
  //         } else if (equals && length > 1) {
  //           // TODO: Handle polygon information deletion for multi
  //           latlngs.splice(index, 1);
  //           layer.setLatLngs(latlngs);
  //           this.removeFeatureGroup(featureGroup);
  //           // TODO: Add polygon layer back
  //         }
  //       });
  //     });
  //   }
  // }

  // /**
  //  * Remove all feature groups
  //  */
  // removeAllFeatureGroups(): void {
  //   this.arrayOfFeatureGroups.forEach((featureGroups) => {
  //     try {
  //       this.map.removeLayer(featureGroups);
  //     } catch (error) {
  //       // Silently handle layer removal errors in test environment
  //     }
  //   });

  //   this.arrayOfFeatureGroups.length = 0;
  //   // TODO: Handle polygon information storage deletion
  // }

  // /**
  //  * Merge polygons with intersecting ones
  //  */
  // private merge(latlngs: Feature<Polygon | MultiPolygon>): void {
  //   const polygonFeature = [];
  //   const newArray: L.FeatureGroup[] = [];
  //   let polyIntersection: boolean = false;

  //   this.arrayOfFeatureGroups.forEach((featureGroup, index) => {
  //     const featureCollection = featureGroup.toGeoJSON() as any;

  //     if (featureCollection.features[0].geometry.coordinates.length > 1) {
  //       featureCollection.features[0].geometry.coordinates.forEach((element) => {
  //         const feature = this.turfHelper.getMultiPolygon([element]);
  //         polyIntersection = this.turfHelper.polygonIntersect(feature, latlngs);
  //         if (polyIntersection) {
  //           newArray.push(featureGroup);
  //           polygonFeature.push(feature);
  //         }
  //       });
  //     } else {
  //       const feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
  //       polyIntersection = this.turfHelper.polygonIntersect(feature, latlngs);

  //       if (!polyIntersection) {
  //         try {
  //           const directIntersection = this.turfHelper.getIntersection(feature, latlngs);
  //           if (
  //             directIntersection &&
  //             directIntersection.geometry &&
  //             (directIntersection.geometry.type === 'Polygon' ||
  //               directIntersection.geometry.type === 'MultiPolygon')
  //           ) {
  //             polyIntersection = true;
  //           }
  //         } catch (error) {
  //           // Silently handle intersection errors
  //         }
  //       }
  //       if (polyIntersection) {
  //         newArray.push(featureGroup);
  //         polygonFeature.push(feature);
  //       }
  //     }
  //   });

  //   if (newArray.length > 0) {
  //     this.unionPolygons(newArray, latlngs, polygonFeature);
  //   } else {
  //     // TODO: Add polygon layer
  //   }
  // }

  // /**
  //  * Union multiple polygons
  //  */
  // private unionPolygons(
  //   layers: L.FeatureGroup[],
  //   latlngs: Feature<Polygon | MultiPolygon>,
  //   polygonFeature: Feature<Polygon | MultiPolygon>[],
  // ): void {
  //   let resultPolygon = latlngs;
  //   const processedFeatureGroups: L.FeatureGroup[] = [];

  //   // Process each intersecting polygon
  //   layers.forEach((featureGroup, i) => {
  //     const featureCollection = featureGroup.toGeoJSON() as any;
  //     const layer = featureCollection.features[0];
  //     const poly = this.getLatLngsFromJson(layer);
  //     const existingPolygon = polygonFeature[i];

  //     // Check the type of intersection to determine the correct operation
  //     const intersectionType = this.analyzeIntersectionType(resultPolygon, existingPolygon);

  //     if (intersectionType === 'should_create_holes') {
  //       const union = this.turfHelper.union(resultPolygon, existingPolygon);
  //       if (union) {
  //         resultPolygon = union;
  //       }
  //     } else {
  //       const union = this.turfHelper.union(resultPolygon, existingPolygon);
  //       if (union) {
  //         resultPolygon = union;
  //       }
  //     }

  //     processedFeatureGroups.push(featureGroup);
  //     try {
  //       this.deletePolygonOnMerge(poly);
  //     } catch (error) {
  //       // Silently handle polygon deletion errors in test environment
  //     }
  //     try {
  //       this.removeFeatureGroup(featureGroup);
  //     } catch (error) {
  //       // Silently handle feature group removal errors in test environment
  //     }
  //   });

  //   // TODO: Add the final result polygon layer
  // }

  // /**
  //  * Analyze intersection type between polygons
  //  */
  // private analyzeIntersectionType(
  //   newPolygon: Feature<Polygon | MultiPolygon>,
  //   existingPolygon: Feature<Polygon | MultiPolygon>,
  // ): string {
  //   try {
  //     // Check if the new polygon is completely contained within the existing polygon
  //     try {
  //       const difference = this.turfHelper.polygonDifference(existingPolygon, newPolygon);

  //       if (
  //         difference &&
  //         difference.geometry.type === 'Polygon' &&
  //         difference.geometry.coordinates.length > 1
  //       ) {
  //         return 'should_create_holes';
  //       }
  //     } catch (error) {
  //       // Silently handle difference operation errors
  //     }

  //     // Additional geometric analysis would go here
  //     return 'standard_union';
  //   } catch (error) {
  //     return 'standard_union';
  //   }
  // }

  // /**
  //  * Extract LatLng coordinates from GeoJSON feature
  //  */
  // private getLatLngsFromJson(feature: Feature<Polygon | MultiPolygon>): ILatLng[][] {
  //   let coord;
  //   if (feature) {
  //     if (feature.geometry.coordinates.length > 1 && feature.geometry.type === 'MultiPolygon') {
  //       coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]);
  //     } else if (
  //       feature.geometry.coordinates[0].length > 1 &&
  //       feature.geometry.type === 'Polygon'
  //     ) {
  //       coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0]);
  //     } else {
  //       coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]);
  //     }
  //   }
  //   return coord;
  // }

  // /**
  //  * Remove feature group during merge operations
  //  */
  // private removeFeatureGroupOnMerge(featureGroup: L.FeatureGroup): void {
  //   if (featureGroup.getLayers()[0]) {
  //     featureGroup.clearLayers();
  //     this.arrayOfFeatureGroups = this.arrayOfFeatureGroups.filter(
  //       (featureGroups) => featureGroups !== featureGroup,
  //     );
  //     this.map.removeLayer(featureGroup);
  //   }
  // }

  // /**
  //  * Remove a feature group from the map
  //  */
  // private removeFeatureGroup(featureGroup: L.FeatureGroup): void {
  //   featureGroup.clearLayers();
  //   this.arrayOfFeatureGroups = this.arrayOfFeatureGroups.filter(
  //     (featureGroups) => featureGroups !== featureGroup,
  //   );
  //   this.map.removeLayer(featureGroup);
  // }

  // /**
  //  * Compare two polygon arrays for equality
  //  */
  // private polygonArrayEquals(poly1: any[], poly2: any[]): boolean {
  //   if (poly1[0][0]) {
  //     if (!poly1[0][0].equals(poly2[0][0])) return false;
  //   } else {
  //     if (!poly1[0].equals(poly2[0])) return false;
  //   }
  //   if (poly1.length !== poly2.length) return false;
  //   return true;
  // }

  // /**
  //  * Delete polygon during merge operations
  //  */
  // private deletePolygonOnMerge(polygon: any): void {
  //   let polygon2 = [];
  //   if (this.arrayOfFeatureGroups.length > 0) {
  //     this.arrayOfFeatureGroups.forEach((featureGroup) => {
  //       const layer = featureGroup.getLayers()[0] as any;
  //       const latlngs = layer.getLatLngs()[0];
  //       polygon2 = [...latlngs[0]];
  //       if (latlngs[0][0] !== latlngs[0][latlngs[0].length - 1]) {
  //         polygon2.push(latlngs[0][0]);
  //       }
  //       const equals = this.polygonArrayEqualsMerge(polygon2, polygon);

  //       if (equals) {
  //         this.removeFeatureGroupOnMerge(featureGroup);
  //         this.deletePolygon(polygon);
  //         // TODO: Handle polygon information deletion
  //       }
  //     });
  //   }
  // }

  // /**
  //  * Compare polygon arrays for merge operations
  //  */
  // private polygonArrayEqualsMerge(poly1: any[], poly2: any[]): boolean {
  //   return poly1.toString() === poly2.toString();
  // }

  // /**
  //  * Set current polygon kinks state
  //  */
  // setCurrentPolygonHasKinks(hasKinks: boolean): void {
  //   this.currentPolygonHasKinks = hasKinks;
  // }

  // /**
  //  * Get current polygon kinks state
  //  */
  // getCurrentPolygonHasKinks(): boolean {
  //   return this.currentPolygonHasKinks;
  // }
}
