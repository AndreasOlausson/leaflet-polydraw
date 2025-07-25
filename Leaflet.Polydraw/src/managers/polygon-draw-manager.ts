import * as L from 'leaflet';
import { TurfHelper } from '../turf-helper';
import { DrawMode } from '../enums';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { PolydrawConfig } from '../types/polydraw-interfaces';
import { ModeManager } from './mode-manager';

export interface DrawResult {
  success: boolean;
  polygon?: Feature<Polygon | MultiPolygon>;
  error?: string;
}

export interface PolygonDrawManagerDependencies {
  turfHelper: TurfHelper;
  map: L.Map;
  config: PolydrawConfig;
  modeManager: ModeManager;
  tracer: L.Polyline;
}

/**
 * PolygonDrawManager handles all user-facing drawing actions.
 * This includes freehand drawing and point-to-point drawing functionality.
 */
export class PolygonDrawManager {
  private turfHelper: TurfHelper;
  private map: L.Map;
  private config: PolydrawConfig;
  private modeManager: ModeManager;
  private tracer: L.Polyline;
  private eventListeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  // Point-to-Point drawing state
  private p2pMarkers: L.Marker[] = [];

  constructor(dependencies: PolygonDrawManagerDependencies) {
    // console.log('PolygonDrawManager constructor');
    this.turfHelper = dependencies.turfHelper;
    this.map = dependencies.map;
    this.config = dependencies.config;
    this.modeManager = dependencies.modeManager;
    this.tracer = dependencies.tracer;
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (...args: any[]) => void): void {
    // console.log('PolygonDrawManager on');
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data?: any): void {
    // console.log('PolygonDrawManager emit');
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  /**
   * Handle mouse move during freehand drawing
   */
  mouseMove(event: L.LeafletMouseEvent | TouchEvent): void {
    // console.log('PolygonDrawManager mouseMove');
    if ('latlng' in event && event.latlng) {
      this.tracer.addLatLng(event.latlng);
    } else if ('touches' in event && event.touches && event.touches.length > 0) {
      const latlng = this.map.containerPointToLatLng([
        event.touches[0].clientX,
        event.touches[0].clientY,
      ]);
      this.tracer.addLatLng(latlng);
    }
  }

  /**
   * Handle mouse up/leave to complete freehand drawing
   */
  async mouseUpLeave(event: any): Promise<DrawResult> {
    // console.log('PolygonDrawManager mouseUpLeave');
    // Get tracer coordinates and validate before processing
    const tracerGeoJSON = this.tracer.toGeoJSON() as any;

    // Check if tracer has valid coordinates before processing
    if (
      !tracerGeoJSON ||
      !tracerGeoJSON.geometry ||
      !tracerGeoJSON.geometry.coordinates ||
      tracerGeoJSON.geometry.coordinates.length < 3
    ) {
      // Not enough points to form a valid polygon
      return {
        success: false,
        error: 'Not enough points to form a valid polygon',
      };
    }

    let geoPos: Feature<Polygon | MultiPolygon>;
    try {
      geoPos = this.turfHelper.createPolygonFromTrace(tracerGeoJSON);
    } catch (error) {
      // Handle polygon creation errors (e.g., invalid polygon)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create polygon from trace',
      };
    }

    // Additional validation - check if the resulting polygon is valid
    if (
      !geoPos ||
      !geoPos.geometry ||
      !geoPos.geometry.coordinates ||
      geoPos.geometry.coordinates.length === 0
    ) {
      return {
        success: false,
        error: 'Invalid polygon created from trace',
      };
    }

    this.emit('drawCompleted', {
      polygon: geoPos,
      mode: this.modeManager.getCurrentMode(),
    });

    return {
      success: true,
      polygon: geoPos,
    };
  }

  /**
   * Handle point-to-point click
   */
  handlePointToPointClick(clickLatLng: L.LatLng): void {
    // console.log('PolygonDrawManager handlePointToPointClick');
    // console.log('=== P2P CLICK DEBUG ===');
    // console.log('Click coordinates:', {
    //   lat: clickLatLng.lat,
    //   lng: clickLatLng.lng,
    //   precision: {
    //     lat: clickLatLng.lat.toFixed(10),
    //     lng: clickLatLng.lng.toFixed(10),
    //   },
    // });

    if (!clickLatLng) {
      // console.log('No clickLatLng provided, returning');
      return;
    }

    const currentPoints = this.tracer.getLatLngs() as L.LatLng[];
    // console.log('Current points count:', currentPoints.length);
    // console.log(
    //   'Current points:',
    //   currentPoints.map((p, i) => ({
    //     index: i,
    //     lat: p.lat,
    //     lng: p.lng,
    //     precision: {
    //       lat: p.lat.toFixed(10),
    //       lng: p.lng.toFixed(10),
    //     },
    //   })),
    // );

    // console.log('P2P markers count:', this.p2pMarkers.length);
    // console.log('Map zoom level:', this.map.getZoom());
    // console.log('Map center:', this.map.getCenter());

    // Check if clicking on the first point to close the polygon
    if (currentPoints.length >= 3 && this.p2pMarkers.length > 0) {
      const firstPoint = this.p2pMarkers[0].getLatLng();
      const isClickingFirst = this.isClickingFirstPoint(clickLatLng, firstPoint);
      // console.log('Checking first point click:', {
      //   firstPoint: {
      //     lat: firstPoint.lat,
      //     lng: firstPoint.lng,
      //     precision: {
      //       lat: firstPoint.lat.toFixed(10),
      //       lng: firstPoint.lng.toFixed(10),
      //     },
      //   },
      //   distance: {
      //     lat: Math.abs(clickLatLng.lat - firstPoint.lat),
      //     lng: Math.abs(clickLatLng.lng - firstPoint.lng),
      //   },
      //   isClickingFirst: isClickingFirst,
      // });

      if (isClickingFirst) {
        // console.log('Completing polygon by clicking first point');
        this.completePointToPointPolygon();
        return;
      }
    }

    // Add point to tracer - use addLatLng to ensure points accumulate
    // console.log('Adding new point to tracer');
    this.tracer.addLatLng(clickLatLng);

    // Add a visual marker for the new point
    try {
      const isFirstMarker = this.p2pMarkers.length === 0;
      const markerClassName = isFirstMarker
        ? 'leaflet-polydraw-p2p-marker leaflet-polydraw-p2p-first-marker'
        : 'leaflet-polydraw-p2p-marker';

      const pointMarker = new L.Marker(clickLatLng, {
        icon: L.divIcon({
          className: markerClassName,
          iconSize: isFirstMarker ? [20, 20] : [10, 10],
        }),
      }).addTo(this.map);

      // Stop propagation on mousedown for all p2p markers to prevent adding new points on top of them
      pointMarker.on('mousedown', (e) => {
        L.DomEvent.stopPropagation(e);
      });

      // Add hover effects and click handler for the first marker when there are enough points to close
      if (isFirstMarker) {
        pointMarker.on('mouseover', () => {
          if (this.tracer.getLatLngs().length >= 3) {
            const element = pointMarker.getElement();
            if (element) {
              element.style.backgroundColor = '#4CAF50';
              element.style.borderColor = '#4CAF50';
              element.style.cursor = 'pointer';
              element.title = 'Click to close polygon';
            }
          }
        });

        pointMarker.on('mouseout', () => {
          const element = pointMarker.getElement();
          if (element) {
            element.style.backgroundColor = '';
            element.style.borderColor = '';
            element.style.cursor = '';
            element.title = '';
          }
        });

        // Add click handler to complete polygon when clicking first marker
        pointMarker.on('click', (e) => {
          if (this.tracer.getLatLngs().length >= 3) {
            L.DomEvent.stopPropagation(e);
            this.completePointToPointPolygon();
          }
        });
      }

      this.p2pMarkers.push(pointMarker);
    } catch (error) {
      // Handle marker creation errors in test environment
    }

    // Update visual style to show dashed line
    if (this.tracer.getLatLngs().length >= 2) {
      try {
        this.tracer.setStyle({
          color: this.config.polyLineOptions.color,
          dashArray: '5, 5',
        });
      } catch (error) {
        // Handle tracer style errors in test environment
      }
    }
  }

  /**
   * Handle double-click to complete point-to-point polygon
   */
  handleDoubleClick(e: L.LeafletMouseEvent): void {
    // console.log('PolygonDrawManager handleDoubleClick');
    // Only handle double-click in Point-to-Point mode
    if (this.modeManager.getCurrentMode() !== DrawMode.PointToPoint) {
      return;
    }

    const currentPoints = this.tracer.getLatLngs() as L.LatLng[];

    // Need at least 3 points to complete a polygon
    if (currentPoints.length >= 3) {
      this.completePointToPointPolygon();
    }
  }

  /**
   * Complete point-to-point polygon drawing
   */
  completePointToPointPolygon(): void {
    // console.log('PolygonDrawManager completePointToPointPolygon');
    const points = this.tracer.getLatLngs() as L.LatLng[];
    if (points.length < 3) {
      return; // Need at least 3 points
    }

    // console.log('=== P2P COMPLETION DEBUG ===');
    // console.log(
    //   'Original points from tracer:',
    //   points.map((p, i) => ({
    //     index: i,
    //     lat: p.lat.toFixed(10),
    //     lng: p.lng.toFixed(10),
    //   })),
    // );

    // Close the polygon by adding first point at the end if not already closed
    const closedPoints = [...points];
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    if (firstPoint.lat !== lastPoint.lat || firstPoint.lng !== lastPoint.lng) {
      closedPoints.push(firstPoint);
    }

    // console.log(
    //   'Closed points:',
    //   closedPoints.map((p, i) => ({
    //     index: i,
    //     lat: p.lat.toFixed(10),
    //     lng: p.lng.toFixed(10),
    //   })),
    // );

    // Convert to GeoJSON and create polygon directly (bypass createPolygonFromTrace for P2P)
    try {
      // Create coordinates array directly from points
      const coordinates = closedPoints.map((point) => [point.lng, point.lat] as [number, number]);
      const geoPos = this.turfHelper.getMultiPolygon([[coordinates]]);

      // console.log(
      //   'Direct polygon creation (bypassing createPolygonFromTrace):',
      //   geoPos.geometry.coordinates[0].map((coord, i) => ({
      //     index: i,
      //     lng: typeof coord[0] === 'number' ? coord[0].toFixed(10) : coord[0],
      //     lat: typeof coord[1] === 'number' ? coord[1].toFixed(10) : coord[1],
      //   })),
      // );

      // Clear P2P markers and stop drawing first
      this.clearP2pMarkers();
      this.resetTracer();

      this.emit('drawCompleted', {
        polygon: geoPos,
        mode: DrawMode.PointToPoint,
        isPointToPoint: true,
      });
    } catch (error) {
      console.warn('Error completing point-to-point polygon:', error);
      this.clearP2pMarkers();
      this.resetTracer();
    }
  }

  /**
   * Cancel point-to-point drawing
   */
  cancelPointToPointDrawing(): void {
    // console.log('PolygonDrawManager cancelPointToPointDrawing');
    this.clearP2pMarkers();
    this.resetTracer();
    this.emit('drawCancelled', { mode: DrawMode.PointToPoint });
  }

  /**
   * Clear all P2P markers
   */
  clearP2pMarkers(): void {
    // console.log('PolygonDrawManager clearP2pMarkers');
    this.p2pMarkers.forEach((marker) => this.map.removeLayer(marker));
    this.p2pMarkers = [];
  }

  /**
   * Reset the tracer
   */
  resetTracer(): void {
    // console.log('PolygonDrawManager resetTracer');
    this.tracer.setLatLngs([]);
  }

  /**
   * Check if clicking on the first point to close polygon
   */
  private isClickingFirstPoint(clickLatLng: L.LatLng, firstPoint: L.LatLng): boolean {
    // console.log('PolygonDrawManager isClickingFirstPoint');
    if (!firstPoint) return false;

    // Use zoom-dependent tolerance - higher zoom = smaller tolerance
    const zoom = this.map.getZoom();
    // Base tolerance at zoom 10, scale down exponentially for higher zooms
    const baseTolerance = 0.0005;
    const tolerance = baseTolerance / Math.pow(2, Math.max(0, zoom - 10));

    // console.log('First point click tolerance check:', {
    //   zoom: zoom,
    //   baseTolerance: baseTolerance,
    //   calculatedTolerance: tolerance,
    //   clickLatLng: {
    //     lat: clickLatLng.lat.toFixed(10),
    //     lng: clickLatLng.lng.toFixed(10),
    //   },
    //   firstPoint: {
    //     lat: firstPoint.lat.toFixed(10),
    //     lng: firstPoint.lng.toFixed(10),
    //   },
    //   distances: {
    //     lat: Math.abs(clickLatLng.lat - firstPoint.lat),
    //     lng: Math.abs(clickLatLng.lng - firstPoint.lng),
    //   },
    // });

    const latDiff = Math.abs(clickLatLng.lat - firstPoint.lat);
    const lngDiff = Math.abs(clickLatLng.lng - firstPoint.lng);
    const isClicking = latDiff < tolerance && lngDiff < tolerance;

    // console.log('First point click result:', {
    //   tolerance: tolerance,
    //   latDiff: latDiff,
    //   lngDiff: lngDiff,
    //   isClicking: isClicking,
    // });

    return isClicking;
  }

  /**
   * Get current P2P markers (for external access)
   */
  getP2pMarkers(): L.Marker[] {
    // console.log('PolygonDrawManager getP2pMarkers');
    return [...this.p2pMarkers];
  }

  /**
   * Check if currently in point-to-point drawing mode
   */
  isInPointToPointMode(): boolean {
    // console.log('PolygonDrawManager isInPointToPointMode');
    return this.modeManager.getCurrentMode() === DrawMode.PointToPoint;
  }

  /**
   * Get current tracer points count
   */
  getTracerPointsCount(): number {
    // console.log('PolygonDrawManager getTracerPointsCount');
    const points = this.tracer.getLatLngs() as L.LatLng[];
    return points.length;
  }
}
