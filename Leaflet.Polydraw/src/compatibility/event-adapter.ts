/**
 * Event Compatibility Adapter
 * Handles differences in event systems between Leaflet v1.x and v2.x
 */

import { LeafletVersionDetector } from './version-detector';
import { LeafletVersion } from '../enums';

export class EventAdapter {
  /**
   * Normalizes events to handle differences between v1 and v2
   * @param event - The event to normalize
   * @returns The normalized event
   */
  static normalizeEvent(event: any): any {
    const version = LeafletVersionDetector.getVersion();

    if (version === LeafletVersion.V2) {
      // In v2, 'layer' property was renamed to 'propagatedFrom'
      if (event.layer && !event.propagatedFrom) {
        event.propagatedFrom = event.layer;
      }

      // Handle pointer events vs mouse/touch events
      if (event.type === 'mousedown' || event.type === 'touchstart') {
        // In v2, these might be pointer events
        event._isPointerEvent = true;
      }
    }

    return event;
  }

  /**
   * Gets the appropriate event name for the current Leaflet version
   * @param eventName - The base event name
   * @returns The version-appropriate event name
   */
  static getEventName(eventName: string): string {
    const version = LeafletVersionDetector.getVersion();

    if (version === LeafletVersion.V2) {
      // Map v1 event names to v2 equivalents if needed
      switch (eventName) {
        case 'mousedown':
          return 'pointerdown';
        case 'mouseup':
          return 'pointerup';
        case 'mousemove':
          return 'pointermove';
        case 'touchstart':
          return 'pointerdown';
        case 'touchend':
          return 'pointerup';
        case 'touchmove':
          return 'pointermove';
        default:
          return eventName;
      }
    }

    return eventName;
  }

  /**
   * Checks if pointer events are supported/preferred
   * @returns true if pointer events should be used
   */
  static shouldUsePointerEvents(): boolean {
    const version = LeafletVersionDetector.getVersion();
    return version === LeafletVersion.V2 && 'PointerEvent' in window;
  }

  /**
   * Extracts coordinates from various event types (mouse, touch, pointer)
   * @param event - The event to extract coordinates from
   * @param map - The map instance for coordinate conversion
   * @returns The LatLng coordinates or null if not available
   */
  static extractCoordinates(event: any, map: any): any {
    // Handle Leaflet mouse events
    if (event.latlng) {
      return event.latlng;
    }

    // Handle touch events
    if (event.touches && event.touches.length > 0) {
      const rect = map.getContainer().getBoundingClientRect();
      return map.containerPointToLatLng([
        event.touches[0].clientX - rect.x,
        event.touches[0].clientY - rect.y,
      ]);
    }

    // Handle pointer events (v2)
    if (event.pointerType && event.clientX !== undefined) {
      const rect = map.getContainer().getBoundingClientRect();
      return map.containerPointToLatLng([event.clientX - rect.x, event.clientY - rect.y]);
    }

    // Handle regular mouse events
    if (event.clientX !== undefined) {
      const rect = map.getContainer().getBoundingClientRect();
      return map.containerPointToLatLng([event.clientX - rect.x, event.clientY - rect.y]);
    }

    return null;
  }

  /**
   * Checks if an event should be prevented from default behavior
   * @param event - The event to check
   * @returns true if preventDefault should be called
   */
  static shouldPreventDefault(event: any): boolean {
    // Always prevent default for touch events to avoid scrolling
    if (event.type && event.type.startsWith('touch')) {
      return true;
    }

    // For pointer events, check if it's a primary pointer
    if (event.pointerType && event.isPrimary === false) {
      return false;
    }

    // For mouse events, check if cancelable
    if ('cancelable' in event && event.cancelable) {
      return true;
    }

    return false;
  }

  /**
   * Gets the appropriate event listener names for the current version
   * @returns Object with event names for different actions
   */
  static getEventNames(): {
    start: string[];
    move: string[];
    end: string[];
  } {
    const version = LeafletVersionDetector.getVersion();

    if (version === LeafletVersion.V2 && this.shouldUsePointerEvents()) {
      return {
        start: ['pointerdown'],
        move: ['pointermove'],
        end: ['pointerup'],
      };
    } else {
      return {
        start: ['mousedown', 'touchstart'],
        move: ['mousemove', 'touchmove'],
        end: ['mouseup', 'touchend'],
      };
    }
  }
}
