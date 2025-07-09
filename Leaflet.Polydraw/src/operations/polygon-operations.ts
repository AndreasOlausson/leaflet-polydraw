import { TurfHelper } from '../turf-helper';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { ILatLng } from '../polygon-helpers';
import * as L from 'leaflet';

/**
 * Handles advanced polygon operations and transformations
 *
 * NOTE: This file is currently unused by polydraw.ts and has been converted to a shell.
 * All functionality has been commented out but preserved for potential future use.
 * polydraw.ts handles polygon operations directly or via PolygonOperationsManager.
 */
export class PolygonOperations {
  // private turfHelper: TurfHelper;

  constructor(turfHelper: TurfHelper) {
    // this.turfHelper = turfHelper;
  }

  // /**
  //  * Convert coordinates to the format expected by turf operations
  //  */
  // convertToCoords(latlngs: ILatLng[][]): any[] {
  //   const coords = [];

  //   if (latlngs.length > 1 && latlngs.length < 3) {
  //     const coordinates = [];
  //     // Coords of last polygon
  //     const within = this.turfHelper.isWithin(
  //       L.GeoJSON.latLngsToCoords(latlngs[latlngs.length - 1]),
  //       L.GeoJSON.latLngsToCoords(latlngs[0]),
  //     );
  //     if (within) {
  //       latlngs.forEach((polygon) => {
  //         coordinates.push(L.GeoJSON.latLngsToCoords(polygon));
  //       });
  //     } else {
  //       latlngs.forEach((polygon) => {
  //         coords.push([L.GeoJSON.latLngsToCoords(polygon)]);
  //       });
  //     }
  //     if (coordinates.length >= 1) {
  //       coords.push(coordinates);
  //     }
  //   } else if (latlngs.length > 2) {
  //     const coordinates = [];
  //     for (let index = 1; index < latlngs.length - 1; index++) {
  //       const within = this.turfHelper.isWithin(
  //         L.GeoJSON.latLngsToCoords(latlngs[index]),
  //         L.GeoJSON.latLngsToCoords(latlngs[0]),
  //       );
  //       if (within) {
  //         latlngs.forEach((polygon) => {
  //           coordinates.push(L.GeoJSON.latLngsToCoords(polygon));
  //         });
  //         coords.push(coordinates);
  //       } else {
  //         latlngs.forEach((polygon) => {
  //           coords.push([L.GeoJSON.latLngsToCoords(polygon)]);
  //         });
  //       }
  //     }
  //   } else {
  //     coords.push([L.GeoJSON.latLngsToCoords(latlngs[0])]);
  //   }

  //   return coords;
  // }

  // /**
  //  * Convert polygon to bounding box
  //  */
  // convertToBoundsPolygon(latlngs: ILatLng[]): Feature<Polygon | MultiPolygon> {
  //   const polygon = this.turfHelper.getMultiPolygon(this.convertToCoords([latlngs]));
  //   const newPolygon = this.turfHelper.convertToBoundingBoxPolygon(polygon);
  //   return this.turfHelper.getTurfPolygon(newPolygon);
  // }

  // /**
  //  * Convert polygon to simplified version
  //  */
  // convertToSimplifiedPolygon(latlngs: ILatLng[]): Feature<Polygon | MultiPolygon> {
  //   const newPolygon = this.turfHelper.getMultiPolygon(this.convertToCoords([latlngs]));
  //   return this.turfHelper.getTurfPolygon(newPolygon);
  // }

  // /**
  //  * Add double elbows (midpoints) to polygon
  //  */
  // doubleElbows(latlngs: ILatLng[]): Feature<Polygon | MultiPolygon> {
  //   const doubleLatLngs: ILatLng[] = this.turfHelper.getDoubleElbowLatLngs(latlngs);
  //   const newPolygon = this.turfHelper.getMultiPolygon(this.convertToCoords([doubleLatLngs]));
  //   return this.turfHelper.getTurfPolygon(newPolygon);
  // }

  // /**
  //  * Apply bezier curve smoothing to polygon
  //  */
  // bezierify(latlngs: ILatLng[]): Feature<Polygon | MultiPolygon> {
  //   const newPolygon = this.turfHelper.getBezierMultiPolygon(this.convertToCoords([latlngs]));
  //   return this.turfHelper.getTurfPolygon(newPolygon);
  // }

  // /**
  //  * Check if a polygon has holes
  //  */
  // polygonHasHoles(feature: Feature<Polygon | MultiPolygon>): boolean {
  //   if (feature.geometry.type === 'Polygon') {
  //     // Polygon has holes if it has more than one ring (first ring is exterior, others are holes)
  //     return feature.geometry.coordinates.length > 1;
  //   } else if (feature.geometry.type === 'MultiPolygon') {
  //     // MultiPolygon has holes if any of its polygons have holes
  //     return feature.geometry.coordinates.some((polygon) => polygon.length > 1);
  //   }
  //   return false;
  // }

  // /**
  //  * Create a Leaflet polygon from GeoJSON with proper styling
  //  */
  // createPolygonFromGeoJSON(
  //   latlngs: Feature<Polygon | MultiPolygon>,
  //   polygonOptions: any,
  // ): L.Polygon {
  //   // Create a Leaflet polygon from GeoJSON
  //   const polygon = L.GeoJSON.geometryToLayer(latlngs) as any;

  //   // Always use normal polygon styling for the main polygon
  //   polygon.setStyle(polygonOptions);

  //   // Store hole information for later use in marker styling
  //   polygon._polydrawHasHoles = this.polygonHasHoles(latlngs);

  //   // Enable dragging by setting the draggable option
  //   // This is a workaround since GeoJSON layers don't have dragging by default
  //   if (polygon.setDraggable) {
  //     polygon.setDraggable(true);
  //   } else {
  //     // Alternative approach: add dragging capability manually
  //     polygon.options = polygon.options || {};
  //     polygon.options.draggable = true;

  //     // Initialize dragging if the method exists
  //     if (polygon._initInteraction) {
  //       polygon._initInteraction();
  //     }
  //   }

  //   return polygon;
  // }

  // /**
  //  * Handle polygon click events for elbow attachment
  //  */
  // handlePolygonClick(
  //   event: any,
  //   poly: Feature<Polygon | MultiPolygon>,
  //   attachElbowEnabled: boolean,
  // ): Feature<Polygon | MultiPolygon> | null {
  //   if (attachElbowEnabled) {
  //     const newPoint = event.latlng;
  //     if (poly.geometry.type === 'MultiPolygon') {
  //       const newPolygon = this.turfHelper.injectPointToPolygon(poly, [newPoint.lng, newPoint.lat]);
  //       return newPolygon;
  //     }
  //   }
  //   return null;
  // }

  // /**
  //  * Process marker drag operations and handle kinks
  //  */
  // processMarkerDragEnd(
  //   featureCollection: any,
  //   optimizationLevel: number = 0,
  // ): {
  //   polygons: Feature<Polygon | MultiPolygon>[];
  //   hasKinks: boolean;
  // } {
  //   const result = {
  //     polygons: [] as Feature<Polygon | MultiPolygon>[],
  //     hasKinks: false,
  //   };

  //   if (featureCollection.features[0].geometry.coordinates.length > 1) {
  //     featureCollection.features[0].geometry.coordinates.forEach((element) => {
  //       const feature = this.turfHelper.getMultiPolygon([element]);

  //       // Check if the current polygon has kinks (self-intersections) after marker drag
  //       if (this.turfHelper.hasKinks(feature)) {
  //         result.hasKinks = true;
  //         const unkink = this.turfHelper.getKinks(feature);
  //         // Handle unkinked polygons - split kinked polygon into valid parts
  //         unkink.forEach((polygon) => {
  //           result.polygons.push(this.turfHelper.getTurfPolygon(polygon));
  //         });
  //       } else {
  //         result.hasKinks = false;
  //         result.polygons.push(this.turfHelper.getTurfPolygon(feature));
  //       }
  //     });
  //   } else {
  //     const feature = this.turfHelper.getMultiPolygon(
  //       featureCollection.features[0].geometry.coordinates,
  //     );

  //     if (this.turfHelper.hasKinks(feature)) {
  //       result.hasKinks = true;
  //       const unkink = this.turfHelper.getKinks(feature);
  //       // Unkink - split kinked polygon into valid parts
  //       unkink.forEach((polygon) => {
  //         result.polygons.push(this.turfHelper.getTurfPolygon(polygon));
  //       });
  //     } else {
  //       result.hasKinks = false;
  //       result.polygons.push(this.turfHelper.getTurfPolygon(feature));
  //     }
  //   }

  //   return result;
  // }

  // /**
  //  * Update marker positions during drag operations
  //  */
  // updateMarkerPositions(featureGroup: L.FeatureGroup): any[] {
  //   const newPos = [];
  //   let testarray = [];
  //   let hole = [];
  //   const allLayers = featureGroup.getLayers() as any;

  //   const polygon = allLayers.find((layer) => layer instanceof L.Polygon);
  //   const markers = allLayers.filter((layer) => layer instanceof L.Marker);

  //   if (!polygon) return newPos;

  //   const posarrays = polygon.getLatLngs();
  //   let markerIndex = 0;

  //   if (posarrays.length > 1) {
  //     for (let index = 0; index < posarrays.length; index++) {
  //       testarray = [];
  //       hole = [];

  //       if (index === 0) {
  //         if (posarrays[0].length > 1) {
  //           for (let i = 0; i < posarrays[0].length; i++) {
  //             for (let j = 0; j < posarrays[0][i].length; j++) {
  //               if (markerIndex < markers.length) {
  //                 testarray.push(markers[markerIndex].getLatLng());
  //                 markerIndex++;
  //               }
  //             }
  //             hole.push(testarray);
  //           }
  //         } else {
  //           for (let j = 0; j < posarrays[0][0].length; j++) {
  //             if (markerIndex < markers.length) {
  //               testarray.push(markers[markerIndex].getLatLng());
  //               markerIndex++;
  //             }
  //           }
  //           hole.push(testarray);
  //         }
  //         newPos.push(hole);
  //       } else {
  //         for (let j = 0; j < posarrays[index][0].length; j++) {
  //           if (markerIndex < markers.length) {
  //             testarray.push(markers[markerIndex].getLatLng());
  //             markerIndex++;
  //           }
  //         }
  //         hole.push(testarray);
  //         newPos.push(hole);
  //       }
  //     }
  //   } else {
  //     hole = [];
  //     for (let index = 0; index < posarrays[0].length; index++) {
  //       testarray = [];

  //       if (index === 0) {
  //         if (posarrays[0][index].length > 1) {
  //           for (let j = 0; j < posarrays[0][index].length; j++) {
  //             if (markerIndex < markers.length) {
  //               testarray.push(markers[markerIndex].getLatLng());
  //               markerIndex++;
  //             }
  //           }
  //         } else {
  //           for (let j = 0; j < posarrays[0][0].length; j++) {
  //             if (markerIndex < markers.length) {
  //               testarray.push(markers[markerIndex].getLatLng());
  //               markerIndex++;
  //             }
  //           }
  //         }
  //       } else {
  //         for (let j = 0; j < posarrays[0][index].length; j++) {
  //           if (markerIndex < markers.length) {
  //             testarray.push(markers[markerIndex].getLatLng());
  //             markerIndex++;
  //           }
  //         }
  //       }
  //       hole.push(testarray);
  //     }
  //     newPos.push(hole);
  //   }

  //   // Update polygon coordinates
  //   polygon.setLatLngs(newPos);

  //   // Update polylines (hole lines)
  //   const polylines = allLayers.filter(
  //     (layer) => layer instanceof L.Polyline && !(layer instanceof L.Polygon),
  //   );
  //   let polylineIndex = 0;

  //   for (let ringIndex = 0; ringIndex < newPos[0].length; ringIndex++) {
  //     const isHoleRing = ringIndex > 0;
  //     if (isHoleRing && polylineIndex < polylines.length) {
  //       polylines[polylineIndex].setLatLngs(newPos[0][ringIndex][0]);
  //       polylineIndex++;
  //     }
  //   }

  //   return newPos;
  // }
}
