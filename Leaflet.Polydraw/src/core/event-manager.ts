import * as L from 'leaflet';
import { DrawMode } from '../enums';
import type {
  DrawModeChangeHandler,
  MouseEventHandler,
  TouchEventHandler,
  MarkerEventHandler,
  PolygonEventHandler,
} from '../types/polydraw-interfaces';

/**
 * Event management utilities following single responsibility principle
 *
 * NOTE: This file is currently unused by polydraw.ts and has been converted to a shell.
 * All functionality has been commented out but preserved for potential future use.
 */
export class EventManager {
  // private map: L.Map;
  // private drawModeListeners: DrawModeChangeHandler[] = [];

  constructor(map: L.Map) {
    // this.map = map;
  }

  // /**
  //  * Add draw mode change listener
  //  * @param callback Function to call when draw mode changes
  //  */
  // addDrawModeListener(callback: DrawModeChangeHandler): void {
  //   this.drawModeListeners.push(callback);
  // }

  // /**
  //  * Remove draw mode change listener
  //  * @param callback Function to remove
  //  */
  // removeDrawModeListener(callback: DrawModeChangeHandler): void {
  //   const index = this.drawModeListeners.indexOf(callback);
  //   if (index > -1) {
  //     this.drawModeListeners.splice(index, 1);
  //   }
  // }

  // /**
  //  * Emit draw mode change event to all listeners
  //  * @param mode New draw mode
  //  */
  // emitDrawModeChanged(mode: DrawMode): void {
  //   for (const callback of this.drawModeListeners) {
  //     try {
  //       callback(mode);
  //     } catch (error) {
  //       console.warn('Error in draw mode listener:', error);
  //     }
  //   }
  // }

  // /**
  //  * Set up map event listeners for drawing
  //  * @param enable Whether to enable or disable events
  //  * @param mouseDown Mouse down handler
  //  * @param mouseMove Mouse move handler
  //  * @param mouseUp Mouse up handler
  //  */
  // setupDrawingEvents(
  //   enable: boolean,
  //   mouseDown?: MouseEventHandler,
  //   mouseMove?: MouseEventHandler,
  //   mouseUp?: MouseEventHandler,
  // ): void {
  //   const action = enable ? 'on' : 'off';

  //   if (mouseDown) {
  //     this.map[action]('mousedown', mouseDown);
  //   }

  //   if (enable && mouseMove && mouseUp) {
  //     this.setupDrawingMoveEvents(true, mouseMove, mouseUp);
  //   } else if (!enable) {
  //     this.setupDrawingMoveEvents(false);
  //   }

  //   // Handle touch events
  //   this.setupTouchEvents(enable, mouseDown, mouseMove, mouseUp);
  // }

  // /**
  //  * Set up mouse move and up events during drawing
  //  * @param enable Whether to enable events
  //  * @param mouseMove Mouse move handler
  //  * @param mouseUp Mouse up handler
  //  */
  // setupDrawingMoveEvents(
  //   enable: boolean,
  //   mouseMove?: (event: any) => void,
  //   mouseUp?: (event: any) => void,
  // ): void {
  //   const action = enable ? 'on' : 'off';

  //   if (mouseMove) {
  //     this.map[action]('mousemove', mouseMove);
  //   }
  //   if (mouseUp) {
  //     this.map[action]('mouseup', mouseUp);
  //   }
  // }

  // /**
  //  * Set up touch event handlers
  //  * @param enable Whether to enable events
  //  * @param touchStart Touch start handler
  //  * @param touchMove Touch move handler
  //  * @param touchEnd Touch end handler
  //  */
  // private setupTouchEvents(
  //   enable: boolean,
  //   touchStart?: (event: any) => void,
  //   touchMove?: (event: any) => void,
  //   touchEnd?: (event: any) => void,
  // ): void {
  //   const container = this.map.getContainer();

  //   if (enable) {
  //     if (touchStart) {
  //       container.addEventListener('touchstart', touchStart);
  //     }
  //     if (touchMove) {
  //       container.addEventListener('touchmove', touchMove);
  //     }
  //     if (touchEnd) {
  //       container.addEventListener('touchend', touchEnd);
  //     }
  //   } else {
  //     // Remove all touch event listeners
  //     if (touchStart) {
  //       container.removeEventListener('touchstart', touchStart);
  //     }
  //     if (touchMove) {
  //       container.removeEventListener('touchmove', touchMove);
  //     }
  //     if (touchEnd) {
  //       container.removeEventListener('touchend', touchEnd);
  //     }
  //   }
  // }

  // /**
  //  * Set up polygon drag event handlers
  //  * @param polygon Polygon to add events to
  //  * @param onMouseDown Mouse down handler
  //  * @param onMouseOver Mouse over handler
  //  * @param onMouseOut Mouse out handler
  //  */
  // setupPolygonDragEvents(
  //   polygon: any,
  //   onMouseDown?: (event: any) => void,
  //   onMouseOver?: () => void,
  //   onMouseOut?: () => void,
  // ): void {
  //   if (onMouseDown) {
  //     polygon.on('mousedown', onMouseDown);
  //   }
  //   if (onMouseOver) {
  //     polygon.on('mouseover', onMouseOver);
  //   }
  //   if (onMouseOut) {
  //     polygon.on('mouseout', onMouseOut);
  //   }
  // }

  // /**
  //  * Set up marker event handlers
  //  * @param marker Marker to add events to
  //  * @param onDrag Drag handler
  //  * @param onDragEnd Drag end handler
  //  * @param onClick Click handler
  //  */
  // setupMarkerEvents(
  //   marker: L.Marker,
  //   onDrag?: (event: any) => void,
  //   onDragEnd?: (event: any) => void,
  //   onClick?: (event: any) => void,
  // ): void {
  //   if (onDrag) {
  //     marker.on('drag', onDrag);
  //   }
  //   if (onDragEnd) {
  //     marker.on('dragend', onDragEnd);
  //   }
  //   if (onClick) {
  //     marker.on('click', onClick);
  //   }
  // }

  // /**
  //  * Set up feature group event handlers
  //  * @param featureGroup Feature group to add events to
  //  * @param onClick Click handler
  //  */
  // setupFeatureGroupEvents(featureGroup: L.FeatureGroup, onClick?: (event: any) => void): void {
  //   if (onClick) {
  //     featureGroup.on('click', onClick);
  //   }
  // }

  // /**
  //  * Enable or disable map interactions
  //  * @param dragging Enable map dragging
  //  * @param doubleClickZoom Enable double click zoom
  //  * @param scrollWheelZoom Enable scroll wheel zoom
  //  */
  // setMapInteractions(dragging: boolean, doubleClickZoom: boolean, scrollWheelZoom: boolean): void {
  //   if (dragging) {
  //     this.map.dragging.enable();
  //   } else {
  //     this.map.dragging.disable();
  //   }

  //   if (doubleClickZoom) {
  //     this.map.doubleClickZoom.enable();
  //   } else {
  //     this.map.doubleClickZoom.disable();
  //   }

  //   if (scrollWheelZoom) {
  //     this.map.scrollWheelZoom.enable();
  //   } else {
  //     this.map.scrollWheelZoom.disable();
  //   }
  // }

  // /**
  //  * Fire custom map event
  //  * @param eventName Name of the event
  //  * @param data Event data
  //  */
  // fireMapEvent(eventName: string, data?: any): void {
  //   try {
  //     this.map.fire(eventName, data);
  //   } catch (error) {
  //     console.warn(`Error firing map event ${eventName}:`, error);
  //   }
  // }

  // /**
  //  * Clean up all event listeners
  //  */
  // cleanup(): void {
  //   this.drawModeListeners = [];
  //   // Additional cleanup can be added here if needed
  // }
}
