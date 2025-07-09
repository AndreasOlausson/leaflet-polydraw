import * as L from 'leaflet';
import { DrawMode } from '../enums';
import type { ILatLng, PolydrawConfig } from '../types/polydraw-interfaces';
import type { Feature, Polygon, MultiPolygon } from 'geojson';

/**
 * Manages drawing events and interactions for polygon creation
 */
export class DrawingEventsManager {
  constructor(
    private config: PolydrawConfig,
    private map: L.Map,
    private tracer: L.Polyline,
    private getDrawMode: () => DrawMode,
    private onPolygonComplete: (geoPos: Feature<Polygon | MultiPolygon>) => void,
  ) {}

  // /**
  //  * Enable or disable drawing event listeners
  //  */
  // events(onoff: boolean) {
  //   const onoroff = onoff ? 'on' : 'off';
  //   this.map[onoroff]('mousedown', this.mouseDown, this);
  //   if (onoff) {
  //     this.map.getContainer().addEventListener('touchstart', (e) => this.mouseDown(e));
  //   } else {
  //     this.map.getContainer().removeEventListener('touchstart', (e) => this.mouseDown(e), true);
  //   }
  // }

  /**
   * Handle mouse down to start drawing
   */
  private mouseDown(event: L.LeafletMouseEvent | TouchEvent) {
    // Start drawing on mouse down
    let startLatLng;

    if ('latlng' in event && event.latlng) {
      startLatLng = event.latlng;
    } else if ('touches' in event && event.touches && event.touches.length > 0) {
      startLatLng = this.map.containerPointToLatLng([
        event.touches[0].clientX,
        event.touches[0].clientY,
      ]);
    }

    // Only set initial point if we have a valid latlng
    if (startLatLng && startLatLng.lat !== undefined && startLatLng.lng !== undefined) {
      this.tracer.setLatLngs([startLatLng]);
      this.startDraw();
    }
  }

  /**
   * Initialize drawing process
   */
  private startDraw() {
    this.drawStartedEvents(true);
  }

  // /**
  //  * Stop drawing and reset state
  //  */
  // stopDraw() {
  //   this.resetTracker();
  //   this.drawStartedEvents(false);
  // }

  /**
   * Stop drawing and reset state (private version)
   */
  private stopDraw() {
    this.resetTracker();
    this.drawStartedEvents(false);
  }

  /**
   * Reset the tracer polyline
   */
  private resetTracker() {
    this.tracer.setLatLngs([]);
  }

  /**
   * Enable or disable drawing started event listeners
   */
  private drawStartedEvents(onoff: boolean) {
    const onoroff = onoff ? 'on' : 'off';

    this.map[onoroff]('mousemove', this.mouseMove, this);
    this.map[onoroff]('mouseup', this.mouseUpLeave, this);
    if (onoff) {
      this.map.getContainer().addEventListener('touchmove', (e) => this.mouseMove(e));
      this.map.getContainer().addEventListener('touchend', (e) => this.mouseUpLeave(e));
    } else {
      this.map.getContainer().removeEventListener('touchmove', (e) => this.mouseMove(e), true);
      this.map.getContainer().removeEventListener('touchmove', (e) => this.mouseMove(e), true);
      this.map.getContainer().removeEventListener('touchend', (e) => this.mouseUpLeave(e), true);
    }
  }

  /**
   * Handle mouse move during drawing
   */
  private mouseMove(event: L.LeafletMouseEvent | TouchEvent) {
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
   * Handle mouse up/leave to complete drawing
   */
  private mouseUpLeave(event: any, turfHelper?: any) {
    const tracerGeoJSON = this.tracer.toGeoJSON() as GeoJSON.Feature<GeoJSON.LineString>;

    // Check if tracer has valid coordinates before processing
    if (
      !tracerGeoJSON ||
      !tracerGeoJSON.geometry ||
      !tracerGeoJSON.geometry.coordinates ||
      tracerGeoJSON.geometry.coordinates.length < 3
    ) {
      // Not enough points to form a valid polygon, just stop drawing
      this.stopDraw();
      return;
    }

    let geoPos: Feature<Polygon | MultiPolygon>;
    try {
      if (turfHelper && turfHelper.turfConcaveman) {
        geoPos = turfHelper.turfConcaveman(tracerGeoJSON as any);
      } else {
        // Fallback: create a simple polygon from the traced coordinates
        const coordinates = tracerGeoJSON.geometry.coordinates;
        // Close the polygon if not already closed
        if (coordinates.length > 0) {
          const first = coordinates[0];
          const last = coordinates[coordinates.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            coordinates.push(first);
          }
        }

        geoPos = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
        } as Feature<Polygon>;
      }
    } catch (error) {
      // Silently handle polygon creation errors
      this.stopDraw();
      return;
    }

    this.stopDraw();

    // Call the completion callback
    if (this.onPolygonComplete) {
      this.onPolygonComplete(geoPos);
    }
  }

  /**
   * Set Leaflet map interaction states
   */
  setLeafletMapEvents(
    enableDragging: boolean,
    enableDoubleClickZoom: boolean,
    enableScrollWheelZoom: boolean,
  ) {
    enableDragging ? this.map.dragging.enable() : this.map.dragging.disable();
    enableDoubleClickZoom ? this.map.doubleClickZoom.enable() : this.map.doubleClickZoom.disable();
    enableScrollWheelZoom ? this.map.scrollWheelZoom.enable() : this.map.scrollWheelZoom.disable();
  }

  /**
   * Update tracer style based on draw mode
   */
  updateTracerStyle(drawMode: DrawMode) {
    try {
      switch (drawMode) {
        case DrawMode.Off:
          this.tracer.setStyle({
            color: '',
          });
          break;
        case DrawMode.Add:
          this.tracer.setStyle({
            color: this.config.polyLineOptions.color,
          });
          break;
        case DrawMode.Subtract:
          this.tracer.setStyle({
            color: '#D9460F',
          });
          break;
      }
    } catch (error) {
      // Handle case where tracer renderer is not initialized (e.g., in test environment)
    }
  }

  /**
   * Update map cursor based on draw mode
   */
  updateMapCursor(drawMode: DrawMode) {
    if (drawMode === DrawMode.Off) {
      L.DomUtil.removeClass(this.map.getContainer(), 'crosshair-cursor-enabled');
    } else {
      L.DomUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
    }
  }
}
