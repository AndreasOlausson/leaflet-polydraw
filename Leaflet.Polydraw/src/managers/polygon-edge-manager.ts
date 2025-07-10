import * as L from 'leaflet';
import { TurfHelper } from '../turf-helper';
import type { ILatLng, PolydrawConfig } from '../types/polydraw-interfaces';
import type { Feature, Polygon, MultiPolygon } from 'geojson';

/**
 * PolygonEdgeManager - Manages edge click detection and interactions for polygons
 *
 * This manager handles:
 * - Adding invisible click listeners to polygon edges
 * - Processing edge click events to inject new points
 * - Managing edge hover effects for visual feedback
 */
export class PolygonEdgeManager {
  constructor(
    private config: PolydrawConfig,
    private turfHelper: TurfHelper,
    private map: L.Map,
    private removeFeatureGroup: (featureGroup: L.FeatureGroup) => void,
    private addPolygonLayer: (
      geoJSON: Feature<Polygon | MultiPolygon>,
      simplify: boolean,
      dynamicTolerance: boolean,
      visualOptimizationLevel: number,
    ) => void,
  ) {}

  /**
   * Add click listeners to polygon edges for edge-specific interactions
   */
  addEdgeClickListeners(polygon: L.Polygon, featureGroup: L.FeatureGroup): void {
    const rawLatLngs = polygon.getLatLngs();

    // Handle different polygon structures - Leaflet can return different nesting levels
    let processedRings: ILatLng[][];

    if (Array.isArray(rawLatLngs) && rawLatLngs.length > 0) {
      if (Array.isArray(rawLatLngs[0])) {
        // Check if rawLatLngs[0][0] is an array of LatLng objects
        if (Array.isArray(rawLatLngs[0][0]) && rawLatLngs[0][0].length > 0) {
          const firstCoord = rawLatLngs[0][0][0];

          // Check if it's an array of coordinate objects
          if (firstCoord && typeof firstCoord === 'object' && 'lat' in firstCoord) {
            // This is the case: we have LatLng objects, but they're nested one level too deep
            // The structure is [Array(1)] -> [Array(N)] -> N LatLng objects
            // We need to extract from rawLatLngs[0], not rawLatLngs
            processedRings = rawLatLngs[0] as ILatLng[][];
          } else {
            // Fallback for other structures
            processedRings = rawLatLngs[0] as ILatLng[][];
          }
        } else if (
          rawLatLngs[0][0] &&
          typeof rawLatLngs[0][0] === 'object' &&
          'lat' in rawLatLngs[0][0]
        ) {
          // Structure: [[{lat, lng}, ...]] (single ring wrapped in array)
          processedRings = rawLatLngs as ILatLng[][];
        } else {
          // Fallback: rawLatLngs[0] contains the actual coordinate arrays
          processedRings = rawLatLngs[0] as ILatLng[][];
        }
      } else if (rawLatLngs[0] && typeof rawLatLngs[0] === 'object' && 'lat' in rawLatLngs[0]) {
        // Structure: [{lat, lng}, ...] (direct coordinate array)
        processedRings = [rawLatLngs as ILatLng[]];
      } else {
        processedRings = [rawLatLngs as ILatLng[]];
      }
    } else {
      return;
    }

    // Process each ring (outer ring and holes)
    processedRings.forEach((ring, ringIndex) => {
      // Create invisible polylines for each edge, including the closing edge
      for (let i = 0; i < ring.length; i++) {
        const edgeStart = ring[i];
        const edgeEnd = ring[(i + 1) % ring.length]; // Use modulo to wrap around to first point

        // Skip if start and end are the same (duplicate closing point)
        if (edgeStart.lat === edgeEnd.lat && edgeStart.lng === edgeEnd.lng) {
          continue;
        }

        // Create an invisible polyline for this edge
        const edgePolyline = L.polyline([edgeStart, edgeEnd], {
          color: 'transparent',
          weight: 10, // Wide invisible line for easier clicking
          opacity: 0,
          interactive: true, // Make it clickable
        });

        // Store edge information for later use
        (edgePolyline as any)._polydrawEdgeInfo = {
          ringIndex,
          edgeIndex: i,
          startPoint: edgeStart,
          endPoint: edgeEnd,
          parentPolygon: polygon,
          parentFeatureGroup: featureGroup,
        };

        // Add click listener to the edge
        edgePolyline.on('click', (e: L.LeafletMouseEvent) => {
          this.onEdgeClick(e, edgePolyline);
        });

        // Add hover listeners for visual feedback
        edgePolyline.on('mouseover', () => {
          this.highlightEdgeOnHover(edgePolyline, true);
        });

        edgePolyline.on('mouseout', () => {
          this.highlightEdgeOnHover(edgePolyline, false);
        });

        // Add the invisible edge polyline to the feature group
        featureGroup.addLayer(edgePolyline);
      }
    });
  }

  /**
   * Handle edge click events
   */
  public onEdgeClick(e: L.LeafletMouseEvent, edgePolyline: L.Polyline): void {
    const edgeInfo = (edgePolyline as any)._polydrawEdgeInfo;
    if (!edgeInfo) return;
    const newPoint = e.latlng;
    const parentPolygon = edgeInfo.parentPolygon;
    const parentFeatureGroup = edgeInfo.parentFeatureGroup;
    if (parentPolygon && parentFeatureGroup) {
      try {
        if (typeof parentPolygon.toGeoJSON !== 'function') {
          return;
        }
        // Get the polygon as GeoJSON
        const poly = parentPolygon.toGeoJSON();
        // Process both Polygon and MultiPolygon types
        if (poly.geometry.type === 'MultiPolygon' || poly.geometry.type === 'Polygon') {
          const newPolygon = this.turfHelper.injectPointToPolygon(poly, [
            newPoint.lng,
            newPoint.lat,
          ]);
          if (newPolygon) {
            const optimizationLevel = (parentPolygon as any)._polydrawOptimizationLevel || 0;
            this.removeFeatureGroup(parentFeatureGroup);
            this.addPolygonLayer(newPolygon, false, false, optimizationLevel);
          }
        }
      } catch (error) {
        // TODO: Add proper error handling.
        // Silently handle errors
      }
    }
    // Stop event propagation to prevent polygon click
    L.DomEvent.stopPropagation(e);
  }

  /**
   * Highlight edge on hover
   */
  public highlightEdgeOnHover(edgePolyline: L.Polyline, isHovering: boolean): void {
    if (isHovering) {
      edgePolyline.setStyle({
        color: '#7a9441',
        weight: 4,
        opacity: 1,
      });
    } else {
      edgePolyline.setStyle({
        color: 'transparent',
        weight: 10,
        opacity: 0,
      });
    }
  }
}
