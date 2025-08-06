import * as L from 'leaflet';
import { TurfHelper } from '../turf-helper';
import { DrawMode } from '../enums';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { PolydrawConfig } from '../types/polydraw-interfaces';
import { ModeManager } from './mode-manager';
import { EventManager } from './event-manager';

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
  eventManager: EventManager;
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
  private eventManager: EventManager;
  private tracer: L.Polyline;

  // Point-to-Point drawing state
  private p2pMarkers: L.Marker[] = [];
  private isModifierKeyHeld: boolean = false;
  private markerModifierHandlers = new WeakMap<L.Marker, (e: Event) => void>();

  constructor(dependencies: PolygonDrawManagerDependencies) {
    // console.log('PolygonDrawManager constructor');
    this.turfHelper = dependencies.turfHelper;
    this.map = dependencies.map;
    this.config = dependencies.config;
    this.modeManager = dependencies.modeManager;
    this.eventManager = dependencies.eventManager;
    this.tracer = dependencies.tracer;
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
  async mouseUpLeave(event: L.LeafletMouseEvent | TouchEvent): Promise<DrawResult> {
    // console.log('PolygonDrawManager mouseUpLeave');
    // Get tracer coordinates and validate before processing
    const tracerGeoJSON = this.tracer.toGeoJSON() as ReturnType<L.Polyline['toGeoJSON']>;

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
        error: 'Not enough points to form a valid polygon. Event: ' + JSON.stringify(event),
      };
    }

    let geoPos: Feature<Polygon | MultiPolygon>;
    try {
      geoPos = this.turfHelper.createPolygonFromTrace(tracerGeoJSON);
    } catch (error) {
      // Handle polygon creation errors (e.g., invalid polygon)
      return {
        success: false,
        error:
          (error instanceof Error ? error.message : 'Failed to create polygon from trace') +
          '. Event: ' +
          JSON.stringify(event),
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
        error: 'Invalid polygon created from trace. Event: ' + JSON.stringify(event),
      };
    }

    this.eventManager.emit('polydraw:polygon:created', {
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
  /**
   * Set the modifier key status
   * @param isHeld - Whether the modifier key is held down
   */
  public setModifierKey(isHeld: boolean): void {
    this.isModifierKeyHeld = isHeld;
  }

  /**
   * Handle point-to-point click
   */
  handlePointToPointClick(clickLatLng: L.LatLng): void {
    // console.log('handlePointToPointClick');
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

    // console.log('P2P markers count:', this.p2pMarkers.length);
    // console.log('Map zoom level:', this.map.getZoom());
    // console.log('Map center:', this.map.getCenter());

    // Check if clicking on the first point to close the polygon
    if (this.p2pMarkers.length >= 3) {
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

    // Add a visual marker for the new point
    try {
      const isFirstMarker = this.p2pMarkers.length === 0;
      const markerClassName = isFirstMarker
        ? 'leaflet-polydraw-p2p-marker leaflet-polydraw-p2p-first-marker'
        : 'leaflet-polydraw-p2p-marker';

      const pointMarker = new L.Marker(clickLatLng, {
        icon: L.divIcon({
          className: markerClassName,
          iconSize: isFirstMarker ? [20, 20] : [16, 16],
        }),
        draggable: this.config.modes.dragElbow,
      }).addTo(this.map);

      // Stop propagation on mousedown for all p2p markers to prevent adding new points on top of them
      pointMarker.on('mousedown', (e) => {
        L.DomEvent.stopPropagation(e);
      });

      // Handle marker dragging
      pointMarker.on('drag', () => {
        this.updateP2PTracer();
      });

      // Handle marker deletion on click with modifier key
      pointMarker.on('click', (e) => {
        // console.log('p2p marker click');
        if (this.isModifierKeyHeld && this.config.modes.edgeDeletion) {
          this.deleteP2PMarker(pointMarker);
          L.DomEvent.stopPropagation(e);
        }
      });

      // Add hover listeners for edge deletion feedback
      pointMarker.on('mouseover', () => this.onMarkerHoverForEdgeDeletion(pointMarker, true));
      pointMarker.on('mouseout', () => this.onMarkerHoverForEdgeDeletion(pointMarker, false));

      // Add hover effects and click handler for the first marker when there are enough points to close
      if (isFirstMarker) {
        pointMarker.on('mouseover', () => {
          if (this.p2pMarkers.length >= 3) {
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
          // console.log('p2p first marker click');
          if (this.isModifierKeyHeld && this.config.modes.edgeDeletion) {
            this.deleteP2PMarker(pointMarker);
            L.DomEvent.stopPropagation(e);
            return;
          }

          if (this.p2pMarkers.length >= 3) {
            L.DomEvent.stopPropagation(e);
            this.completePointToPointPolygon();
          }
        });
      }

      this.p2pMarkers.push(pointMarker);
      this.updateP2PTracer();
    } catch (error) {
      // Handle marker creation errors in test environment
    }
  }

  /**
   * Handle double-click to complete point-to-point polygon
   */
  handleDoubleClick(e: L.LeafletMouseEvent): void {
    // console.log('handleDoubleClick');
    // console.log('PolygonDrawManager handleDoubleClick');
    // Only handle double-click in Point-to-Point mode
    if (this.modeManager.getCurrentMode() !== DrawMode.PointToPoint) {
      return;
    }

    // Need at least 3 points to complete a polygon
    if (this.p2pMarkers.length >= 3) {
      this.completePointToPointPolygon();
    }
  }

  /**
   * Complete point-to-point polygon drawing
   */
  completePointToPointPolygon(): void {
    // console.log('PolygonDrawManager completePointToPointPolygon');
    const points = this.p2pMarkers.map((marker) => marker.getLatLng());
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

      this.eventManager.emit('polydraw:polygon:created', {
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
    this.eventManager.emit('polydraw:draw:cancel', {
      mode: DrawMode.PointToPoint,
    });
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
    try {
      this.tracer.setStyle({
        dashArray: null,
      });
    } catch (error) {
      // Handle tracer style errors in test environment
    }
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
   * Update the tracer polyline based on P2P markers
   */
  private updateP2PTracer(): void {
    const latlngs = this.p2pMarkers.map((marker) => marker.getLatLng());
    this.tracer.setLatLngs(latlngs);

    // Update visual style to show dashed line
    if (this.p2pMarkers.length >= 2) {
      try {
        this.tracer.setStyle({
          color: this.config.polyLineOptions.color,
          dashArray: '5, 5',
        });
      } catch (error) {
        // Handle tracer style errors in test environment
      }
    } else {
      // If less than 2 points, clear dash array
      try {
        this.tracer.setStyle({
          dashArray: null,
        });
      } catch (error) {
        // Handle tracer style errors in test environment
      }
    }
  }

  /**
   * Delete a P2P marker
   */
  private deleteP2PMarker(markerToDelete: L.Marker): void {
    const markerIndex = this.p2pMarkers.findIndex((marker) => marker === markerToDelete);
    if (markerIndex > -1) {
      // Remove from array
      this.p2pMarkers.splice(markerIndex, 1);
      // Remove from map
      this.map.removeLayer(markerToDelete);
      // Update the tracer
      this.updateP2PTracer();

      // If the first marker was deleted, transfer its properties to the new first marker
      if (markerIndex === 0 && this.p2pMarkers.length > 0) {
        this.setupFirstMarker();
      }
    }
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

  /**
   * Set up the first marker with special properties
   */
  private setupFirstMarker(): void {
    if (this.p2pMarkers.length === 0) return;

    const firstMarker = this.p2pMarkers[0];
    const element = firstMarker.getElement();
    if (element) {
      element.classList.add('leaflet-polydraw-p2p-first-marker');
      firstMarker.setIcon(
        L.divIcon({
          className: 'leaflet-polydraw-p2p-marker leaflet-polydraw-p2p-first-marker',
          iconSize: [20, 20],
        }),
      );
    }

    // Remove existing listeners to avoid duplicates
    firstMarker.off('mouseover');
    firstMarker.off('mouseout');
    firstMarker.off('click');

    // Add hover effects and click handler for the first marker when there are enough points to close
    firstMarker.on('mouseover', () => {
      if (this.p2pMarkers.length >= 3) {
        const element = firstMarker.getElement();
        if (element) {
          element.style.backgroundColor = '#4CAF50';
          element.style.borderColor = '#4CAF50';
          element.style.cursor = 'pointer';
          element.title = 'Click to close polygon';
        }
      }
    });

    firstMarker.on('mouseout', () => {
      const element = firstMarker.getElement();
      if (element) {
        element.style.backgroundColor = '';
        element.style.borderColor = '';
        element.style.cursor = '';
        element.title = '';
      }
    });

    // Add click handler to complete polygon when clicking first marker
    firstMarker.on('click', (e) => {
      if (this.isModifierKeyHeld && this.config.modes.edgeDeletion) {
        this.deleteP2PMarker(firstMarker);
        L.DomEvent.stopPropagation(e);
        return;
      }

      if (this.p2pMarkers.length >= 3) {
        L.DomEvent.stopPropagation(e);
        this.completePointToPointPolygon();
      }
    });
  }

  /**
   * Handle marker hover for edge deletion feedback
   */
  private onMarkerHoverForEdgeDeletion(marker: L.Marker, isHovering: boolean): void {
    const element = marker.getElement();
    if (!element) return;

    if (isHovering) {
      const checkModifierAndUpdate = (e: KeyboardEvent | MouseEvent) => {
        if (this.isModifierKeyHeld && this.config.modes.edgeDeletion) {
          element.classList.add('edge-deletion-hover');
          try {
            const container = this.map.getContainer();
            container.style.cursor = 'pointer';
          } catch (error) {
            // Handle DOM errors
          }
        } else {
          element.classList.remove('edge-deletion-hover');
          try {
            const container = this.map.getContainer();
            container.style.cursor = '';
          } catch (error) {
            // Handle DOM errors
          }
        }
      };

      this.markerModifierHandlers.set(marker, checkModifierAndUpdate);
      document.addEventListener('keydown', checkModifierAndUpdate);
      document.addEventListener('keyup', checkModifierAndUpdate);
      element.addEventListener('mousemove', checkModifierAndUpdate);
    } else {
      element.classList.remove('edge-deletion-hover');
      try {
        const container = this.map.getContainer();
        container.style.cursor = '';
      } catch (error) {
        // Handle DOM errors
      }
      const handler = this.markerModifierHandlers.get(marker);
      if (handler) {
        document.removeEventListener('keydown', handler);
        document.removeEventListener('keyup', handler);
        element.removeEventListener('mousemove', handler);
        this.markerModifierHandlers.delete(marker);
      }
    }
  }
}
