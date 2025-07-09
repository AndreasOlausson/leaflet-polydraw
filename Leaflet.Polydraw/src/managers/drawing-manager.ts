import * as L from 'leaflet';
import { DrawMode } from '../enums';
import { TurfHelper } from '../turf-helper';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
// import type { DrawModeListener } from '../core/polydraw-types';

/**
 * Manages drawing operations and mouse events
 *
 * NOTE: This file is currently unused by polydraw.ts and has been converted to a shell.
 * All functionality has been commented out but preserved for potential future use.
 * polydraw.ts uses DrawingEventsManager instead.
 */
export class DrawingManager {
  // private map: L.Map;
  // private tracer: L.Polyline;
  // private drawMode: DrawMode = DrawMode.Off;
  // private drawModeListeners: DrawModeListener[] = [];
  // private turfHelper: TurfHelper;
  // private config: any;

  constructor(map: L.Map, turfHelper: TurfHelper, config: any) {
    // this.map = map;
    // this.turfHelper = turfHelper;
    // this.config = config;
    // this.initializeTracer();
  }

  // /**
  //  * Initialize the drawing tracer
  //  */
  // private initializeTracer(): void {
  //   this.tracer = L.polyline([], this.config.polyLineOptions);
  //   try {
  //     this.tracer.addTo(this.map);
  //   } catch (error) {
  //     // Silently handle tracer initialization in test environment
  //   }
  // }

  // /**
  //  * Set the drawing mode
  //  */
  // setDrawMode(mode: DrawMode): void {
  //   this.drawMode = mode;
  //   this.emitDrawModeChanged();
  //   this.stopDraw();

  //   if (this.map) {
  //     switch (mode) {
  //       case DrawMode.Off:
  //         L.DomUtil.removeClass(this.map.getContainer(), 'crosshair-cursor-enabled');
  //         this.events(false);
  //         this.updateTracerStyle('');
  //         this.setLeafletMapEvents(true, true, true);
  //         break;
  //       case DrawMode.Add:
  //         L.DomUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
  //         this.events(true);
  //         this.updateTracerStyle(this.config.polyLineOptions.color);
  //         this.setLeafletMapEvents(false, false, false);
  //         break;
  //       case DrawMode.Subtract:
  //         L.DomUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
  //         this.events(true);
  //         this.updateTracerStyle('#D9460F');
  //         this.setLeafletMapEvents(false, false, false);
  //         break;
  //     }
  //   }
  // }

  // /**
  //  * Get the current drawing mode
  //  */
  // getDrawMode(): DrawMode {
  //   return this.drawMode;
  // }

  // /**
  //  * Add a draw mode change listener
  //  */
  // addDrawModeListener(listener: DrawModeListener): void {
  //   this.drawModeListeners.push(listener);
  // }

  // /**
  //  * Remove a draw mode change listener
  //  */
  // removeDrawModeListener(listener: DrawModeListener): void {
  //   const index = this.drawModeListeners.indexOf(listener);
  //   if (index > -1) {
  //     this.drawModeListeners.splice(index, 1);
  //   }
  // }

  // /**
  //  * Update tracer style safely
  //  */
  // private updateTracerStyle(color: string): void {
  //   try {
  //     this.tracer.setStyle({ color });
  //   } catch (error) {
  //     // Handle case where tracer renderer is not initialized (e.g., in test environment)
  //   }
  // }

  // /**
  //  * Stop current drawing operation
  //  */
  // private stopDraw(): void {
  //   this.resetTracker();
  //   this.drawStartedEvents(false);
  // }

  // /**
  //  * Reset the tracer
  //  */
  // private resetTracker(): void {
  //   this.tracer.setLatLngs([]);
  // }

  // /**
  //  * Set Leaflet map interaction events
  //  */
  // private setLeafletMapEvents(
  //   enableDragging: boolean,
  //   enableDoubleClickZoom: boolean,
  //   enableScrollWheelZoom: boolean,
  // ): void {
  //   enableDragging ? this.map.dragging.enable() : this.map.dragging.disable();
  //   enableDoubleClickZoom ? this.map.doubleClickZoom.enable() : this.map.doubleClickZoom.disable();
  //   enableScrollWheelZoom ? this.map.scrollWheelZoom.enable() : this.map.scrollWheelZoom.disable();
  // }

  // /**
  //  * Handle drawing events
  //  */
  // private events(onoff: boolean): void {
  //   const onoroff = onoff ? 'on' : 'off';
  //   this.map[onoroff]('mousedown', this.mouseDown, this);
  //   if (onoff) {
  //     this.map.getContainer().addEventListener('touchstart', (e) => this.mouseDown(e));
  //   } else {
  //     this.map.getContainer().removeEventListener('touchstart', (e) => this.mouseDown(e), true);
  //   }
  // }

  // /**
  //  * Handle drawing started events
  //  */
  // private drawStartedEvents(onoff: boolean): void {
  //   const onoroff = onoff ? 'on' : 'off';

  //   this.map[onoroff]('mousemove', this.mouseMove, this);
  //   this.map[onoroff]('mouseup', this.mouseUpLeave, this);
  //   if (onoff) {
  //     this.map.getContainer().addEventListener('touchmove', (e) => this.mouseMove(e));
  //     this.map.getContainer().addEventListener('touchend', (e) => this.mouseUpLeave(e));
  //   } else {
  //     this.map.getContainer().removeEventListener('touchmove', (e) => this.mouseMove(e), true);
  //     this.map.getContainer().removeEventListener('touchmove', (e) => this.mouseMove(e), true);
  //     this.map.getContainer().removeEventListener('touchend', (e) => this.mouseUpLeave(e), true);
  //   }
  // }

  // /**
  //  * Handle mouse down event
  //  */
  // private mouseDown(event: any): void {
  //   let startLatLng;

  //   if (event.originalEvent != null) {
  //     startLatLng = event.latlng;
  //   } else {
  //     startLatLng = this.map.containerPointToLatLng([
  //       event.touches[0].clientX,
  //       event.touches[0].clientY,
  //     ]);
  //   }

  //   // Only set initial point if we have a valid latlng
  //   if (startLatLng && startLatLng.lat !== undefined && startLatLng.lng !== undefined) {
  //     this.tracer.setLatLngs([startLatLng]);
  //     this.startDraw();
  //   }
  // }

  // /**
  //  * Start drawing process
  //  */
  // private startDraw(): void {
  //   this.drawStartedEvents(true);
  // }

  // /**
  //  * Handle mouse move event
  //  */
  // private mouseMove(event: any): void {
  //   if (event.originalEvent != null) {
  //     this.tracer.addLatLng(event.latlng);
  //   } else {
  //     const latlng = this.map.containerPointToLatLng([
  //       event.touches[0].clientX,
  //       event.touches[0].clientY,
  //     ]);
  //     this.tracer.addLatLng(latlng);
  //   }
  // }

  // /**
  //  * Handle mouse up/leave event
  //  */
  // private mouseUpLeave(event: any): Feature<Polygon | MultiPolygon> | null {
  //   const tracerGeoJSON = this.tracer.toGeoJSON() as any;

  //   // Check if tracer has valid coordinates before processing
  //   if (
  //     !tracerGeoJSON ||
  //     !tracerGeoJSON.geometry ||
  //     !tracerGeoJSON.geometry.coordinates ||
  //     tracerGeoJSON.geometry.coordinates.length < 3
  //   ) {
  //     // Not enough points to form a valid polygon, just stop drawing
  //     this.stopDraw();
  //     return null;
  //   }

  //   let geoPos: Feature<Polygon | MultiPolygon>;
  //   try {
  //     geoPos = this.turfHelper.turfConcaveman(tracerGeoJSON);
  //   } catch (error) {
  //     // Silently handle polygon creation errors
  //     this.stopDraw();
  //     return null;
  //   }

  //   this.stopDraw();
  //   return geoPos;
  // }

  // /**
  //  * Emit draw mode changed event
  //  */
  // private emitDrawModeChanged(): void {
  //   for (const cb of this.drawModeListeners) {
  //     cb(this.drawMode);
  //   }
  // }

  // /**
  //  * Get the tracer for external access
  //  */
  // getTracer(): L.Polyline {
  //   return this.tracer;
  // }

  // /**
  //  * Process mouse up event and return the drawn polygon
  //  * This is the public interface for handling drawing completion
  //  */
  // processMouseUp(event: any): Feature<Polygon | MultiPolygon> | null {
  //   return this.mouseUpLeave(event);
  // }
}
