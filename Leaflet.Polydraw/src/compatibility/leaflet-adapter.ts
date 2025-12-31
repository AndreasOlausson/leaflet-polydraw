/**
 * Leaflet Compatibility Adapter
 * Provides a unified interface for both Leaflet v1.x and v2.x
 */

import * as L from 'leaflet';
import { LeafletVersionDetector } from './version-detector';
import { LeafletVersion } from '../enums';

type UnknownRecord = Record<string, unknown>;
type UnknownFn = (...args: unknown[]) => unknown;
type AnimationFrameCallback = (time: number) => void;

export class LeafletAdapter {
  private version: LeafletVersion;

  constructor() {
    this.version = LeafletVersionDetector.getVersion();
  }

  /**
   * Creates a tile layer compatible with both Leaflet versions
   */
  createTileLayer(urlTemplate: string, options?: L.TileLayerOptions): L.TileLayer {
    return new L.TileLayer(urlTemplate, options);
  }

  /**
   * Creates a map compatible with both Leaflet versions
   */
  createMap(element: string | HTMLElement, options?: L.MapOptions): L.Map {
    return new L.Map(element, options);
  }

  /**
   * Creates a marker compatible with both Leaflet versions
   */
  createMarker(latlng: L.LatLng, options?: L.MarkerOptions): L.Marker {
    return new L.Marker(latlng, options);
  }

  /**
   * Creates a polyline compatible with both Leaflet versions
   */
  createPolyline(latlngs: L.LatLng[], options?: L.PolylineOptions): L.Polyline {
    return new L.Polyline(latlngs, options);
  }

  /**
   * Creates a polygon compatible with both Leaflet versions
   */
  createPolygon(latlngs: L.LatLng[] | L.LatLng[][], options?: L.PolylineOptions): L.Polygon {
    return new L.Polygon(latlngs, options);
  }

  /**
   * Creates a div icon compatible with both Leaflet versions
   */
  createDivIcon(options?: L.DivIconOptions): L.DivIcon {
    return new L.DivIcon(options);
  }

  /**
   * Creates a LatLng object compatible with both Leaflet versions
   */
  createLatLng(lat: number, lng: number, alt?: number): L.LatLng {
    return new L.LatLng(lat, lng, alt);
  }

  /**
   * Creates a LatLngBounds object compatible with both Leaflet versions
   */
  createLatLngBounds(corner1?: L.LatLngExpression, corner2?: L.LatLngExpression): L.LatLngBounds {
    if (corner1 && corner2) {
      return new L.LatLngBounds(corner1, corner2);
    }
    if (corner1) {
      return new L.LatLngBounds(corner1, corner1);
    }
    return new L.LatLngBounds([] as L.LatLngExpression[]);
  }

  /**
   * Creates a Point object compatible with both Leaflet versions
   */
  createPoint(x: number, y: number, round?: boolean): L.Point {
    return new L.Point(x, y, round);
  }

  /**
   * Creates a popup compatible with both Leaflet versions
   */
  createPopup(options?: L.PopupOptions, source?: L.Layer): L.Popup {
    return new L.Popup(options, source);
  }

  /**
   * Creates a feature group compatible with both Leaflet versions
   */
  createFeatureGroup(layers?: L.Layer[]): L.FeatureGroup {
    return new L.FeatureGroup(layers);
  }

  /**
   * Creates a layer group compatible with both Leaflet versions
   */
  createLayerGroup(layers?: L.Layer[]): L.LayerGroup {
    return new L.LayerGroup(layers);
  }

  /**
   * DOM utility methods compatibility
   */
  domUtil = {
    create: (tagName: string, className?: string, container?: HTMLElement): HTMLElement => {
      if (typeof L !== 'undefined' && L.DomUtil) {
        return L.DomUtil.create(tagName, className, container);
      } else {
        // Fallback for when L is not available (ESM imports or test environment)
        const element = document.createElement(tagName);
        if (className) {
          element.className = className;
        }
        if (container) {
          container.appendChild(element);
        }
        return element;
      }
    },

    addClass: (el: HTMLElement, name: string): void => {
      if (this.version === LeafletVersion.V1) {
        L.DomUtil.addClass(el, name);
      } else {
        // In v2, use native classList
        el.classList.add(name);
      }
    },

    removeClass: (el: HTMLElement, name: string): void => {
      if (this.version === LeafletVersion.V1) {
        L.DomUtil.removeClass(el, name);
      } else {
        // In v2, use native classList
        el.classList.remove(name);
      }
    },

    hasClass: (el: HTMLElement, name: string): boolean => {
      if (this.version === LeafletVersion.V1) {
        return L.DomUtil.hasClass(el, name);
      } else {
        // In v2, use native classList
        return el.classList.contains(name);
      }
    },

    setPosition: (el: HTMLElement, point: L.Point): void => {
      L.DomUtil.setPosition(el, point);
    },

    getPosition: (el: HTMLElement): L.Point => {
      return L.DomUtil.getPosition(el);
    },
  };

  /**
   * DOM event methods compatibility
   */
  domEvent = {
    on: (
      obj: HTMLElement,
      types: string,
      fn: (e: Event) => void,
      context?: unknown,
    ): typeof this => {
      L.DomEvent.on(obj, types, fn, context);
      return this;
    },

    off: (
      obj: HTMLElement,
      types: string,
      fn: (e: Event) => void,
      context?: unknown,
    ): typeof this => {
      L.DomEvent.off(obj, types, fn, context);
      return this;
    },

    stopPropagation: (e: Event): typeof this => {
      L.DomEvent.stopPropagation(e);
      return this;
    },

    preventDefault: (e: Event): typeof this => {
      L.DomEvent.preventDefault(e);
      return this;
    },

    stop: (e: Event): typeof this => {
      L.DomEvent.stop(e);
      return this;
    },

    disableClickPropagation: (el: HTMLElement): typeof this => {
      L.DomEvent.disableClickPropagation(el);
      return this;
    },

    disableScrollPropagation: (el: HTMLElement): typeof this => {
      L.DomEvent.disableScrollPropagation(el);
      return this;
    },

    getMousePosition: (e: MouseEvent, container?: HTMLElement): L.Point => {
      if (this.version === LeafletVersion.V1) {
        return L.DomEvent.getMousePosition(e, container);
      } else {
        // In v2, this might be renamed to getPointerPosition
        const domEvent = L.DomEvent as typeof L.DomEvent & {
          getPointerPosition?: (event: MouseEvent, container?: HTMLElement) => L.Point;
        };
        return domEvent.getPointerPosition
          ? domEvent.getPointerPosition(e, container)
          : L.DomEvent.getMousePosition(e, container);
      }
    },
  };

  /**
   * Utility methods compatibility
   */
  util = {
    extend: (dest: UnknownRecord, ...sources: UnknownRecord[]): UnknownRecord => {
      if (this.version === LeafletVersion.V1) {
        return L.Util.extend(dest, ...sources) as UnknownRecord;
      } else {
        // In v2, use native Object.assign
        return Object.assign(dest, ...sources);
      }
    },

    bind: <T extends UnknownFn>(fn: T, obj: unknown): T => {
      if (this.version === LeafletVersion.V1) {
        return L.Util.bind(fn, obj) as T;
      } else {
        // In v2, use native bind
        return fn.bind(obj) as T;
      }
    },

    stamp: (obj: object): number => {
      return L.Util.stamp(obj);
    },

    throttle: (fn: UnknownFn, time: number, context: unknown): UnknownFn => {
      return L.Util.throttle(fn, time, context) as UnknownFn;
    },

    wrapNum: (x: number, range: number[], includeMax?: boolean): number => {
      return L.Util.wrapNum(x, range, includeMax);
    },

    falseFn: (): boolean => {
      return L.Util.falseFn();
    },

    formatNum: (num: number, digits?: number): number => {
      return L.Util.formatNum(num, digits);
    },

    trim: (str: string): string => {
      if (this.version === LeafletVersion.V1) {
        return L.Util.trim(str);
      } else {
        // In v2, use native trim
        return str.trim();
      }
    },

    splitWords: (str: string): string[] => {
      return L.Util.splitWords(str);
    },

    setOptions: (obj: UnknownRecord, options: UnknownRecord): UnknownRecord => {
      return L.Util.setOptions(obj, options) as UnknownRecord;
    },

    getParamString: (
      obj: Record<string, unknown>,
      existingUrl?: string,
      uppercase?: boolean,
    ): string => {
      if (this.version === LeafletVersion.V1) {
        return L.Util.getParamString(obj, existingUrl, uppercase);
      } else {
        // In v2, use URLSearchParams
        const params = new URLSearchParams();
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const paramKey = uppercase ? key.toUpperCase() : key;
            params.set(paramKey, String(obj[key]));
          }
        }
        const paramString = params.toString();
        if (existingUrl) {
          const separator = existingUrl.indexOf('?') === -1 ? '?' : '&';
          return existingUrl + separator + paramString;
        }
        return paramString ? '?' + paramString : '';
      }
    },

    template: (str: string, data: UnknownRecord): string => {
      return L.Util.template(str, data);
    },

    isArray: (obj: unknown): boolean => {
      if (this.version === LeafletVersion.V1) {
        return L.Util.isArray(obj);
      } else {
        // In v2, use native Array.isArray
        return Array.isArray(obj);
      }
    },

    indexOf: (array: unknown[], item: unknown): number => {
      return L.Util.indexOf(array, item);
    },

    requestAnimFrame: (
      fn: AnimationFrameCallback,
      context?: unknown,
      immediate?: boolean,
    ): number => {
      if (this.version === LeafletVersion.V1) {
        return L.Util.requestAnimFrame(fn, context, immediate);
      } else {
        // In v2, use native requestAnimationFrame
        return requestAnimationFrame((context ? fn.bind(context) : fn) as AnimationFrameCallback);
      }
    },

    cancelAnimFrame: (id: number): void => {
      if (this.version === LeafletVersion.V1) {
        L.Util.cancelAnimFrame(id);
      } else {
        // In v2, use native cancelAnimationFrame
        cancelAnimationFrame(id);
      }
    },
  };

  /**
   * Browser detection compatibility
   */

  getBrowser() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const browser = L.Browser as typeof L.Browser & {
      phantom?: boolean;
      touchNative?: boolean;
      passiveEvents?: boolean;
      inlineSvg?: boolean;
    };
    return {
      get ie(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.ie : false; // Removed in v2
      },

      get ielt9(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.ielt9 : false; // Removed in v2
      },

      get edge(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.edge : false; // Removed in v2
      },

      get webkit(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.webkit : false; // Removed in v2
      },

      get android(): boolean {
        return self.version === LeafletVersion.V1
          ? L.Browser.android
          : /Android/.test(navigator.userAgent);
      },

      get android23(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.android23 : false; // Removed in v2
      },

      get androidStock(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.androidStock : false; // Removed in v2
      },

      get opera(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.opera : false; // Removed in v2
      },

      get chrome(): boolean {
        return self.version === LeafletVersion.V1
          ? L.Browser.chrome
          : /Chrome/.test(navigator.userAgent);
      },

      get gecko(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.gecko : false; // Removed in v2
      },

      get safari(): boolean {
        return self.version === LeafletVersion.V1
          ? L.Browser.safari
          : /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      },

      get phantom(): boolean {
        return self.version === LeafletVersion.V1 ? (browser.phantom ?? false) : false; // Removed in v2
      },

      get opera12(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.opera12 : false; // Removed in v2
      },

      get win(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.win : /Win/.test(navigator.platform);
      },

      get ie3d(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.ie3d : false; // Removed in v2
      },

      get webkit3d(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.webkit3d : false; // Removed in v2
      },

      get gecko3d(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.gecko3d : false; // Removed in v2
      },

      get any3d(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.any3d : true; // Assume true in v2
      },

      get mobile(): boolean {
        return L.Browser.mobile;
      },

      get mobileWebkit(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.mobileWebkit : false; // Removed in v2
      },

      get mobileWebkit3d(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.mobileWebkit3d : false; // Removed in v2
      },

      get msPointer(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.msPointer : false; // Removed in v2
      },

      get pointer(): boolean {
        return L.Browser.pointer || true; // Assume true in v2 (pointer events are standard)
      },

      get touch(): boolean {
        return L.Browser.touch;
      },

      get touchNative(): boolean {
        return self.version === LeafletVersion.V1 ? (browser.touchNative ?? false) : false; // Removed in v2
      },

      get mobileOpera(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.mobileOpera : false; // Removed in v2
      },

      get mobileGecko(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.mobileGecko : false; // Removed in v2
      },

      get retina(): boolean {
        return L.Browser.retina;
      },

      get passiveEvents(): boolean {
        return self.version === LeafletVersion.V1 ? (browser.passiveEvents ?? true) : true; // Assume true in v2
      },

      get canvas(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.canvas : true; // Assume true in v2
      },

      get svg(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.svg : true; // Assume true in v2
      },

      get vml(): boolean {
        return self.version === LeafletVersion.V1 ? L.Browser.vml : false; // Removed in v2
      },

      get inlineSvg(): boolean {
        return self.version === LeafletVersion.V1 ? (browser.inlineSvg ?? true) : true; // Assume true in v2
      },
    };
  }

  /**
   * Gets the current Leaflet version being used
   */
  getVersion(): LeafletVersion {
    return this.version;
  }

  /**
   * Checks if we're running Leaflet v1.x
   */
  isV1(): boolean {
    return this.version === LeafletVersion.V1;
  }

  /**
   * Checks if we're running Leaflet v2.x
   */
  isV2(): boolean {
    return this.version === LeafletVersion.V2;
  }
}

// Create a singleton instance
export const leafletAdapter = new LeafletAdapter();
