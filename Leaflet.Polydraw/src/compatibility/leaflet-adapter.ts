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
type LegacyBrowser = Partial<
  Record<
    | 'ie'
    | 'ielt9'
    | 'edge'
    | 'webkit'
    | 'android'
    | 'android23'
    | 'androidStock'
    | 'opera'
    | 'chrome'
    | 'gecko'
    | 'safari'
    | 'phantom'
    | 'opera12'
    | 'win'
    | 'ie3d'
    | 'webkit3d'
    | 'gecko3d'
    | 'any3d'
    | 'mobile'
    | 'mobileWebkit'
    | 'mobileWebkit3d'
    | 'msPointer'
    | 'pointer'
    | 'touch'
    | 'touchNative'
    | 'mobileOpera'
    | 'mobileGecko'
    | 'retina'
    | 'passiveEvents'
    | 'canvas'
    | 'svg'
    | 'vml'
    | 'inlineSvg',
    boolean
  >
>;

const getLegacyBrowser = (): LegacyBrowser =>
  (Reflect.get(L, 'Browser') as LegacyBrowser | undefined) ?? {};

const getNavigator = (): Navigator | undefined =>
  typeof navigator === 'undefined' ? undefined : navigator;

export class LeafletAdapter {
  private get version(): LeafletVersion {
    return LeafletVersionDetector.getVersion();
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
  createPolygon(
    latlngs: L.LatLng[] | L.LatLng[][] | L.LatLng[][][],
    options?: L.PolylineOptions,
  ): L.Polygon {
    return new L.Polygon(latlngs as L.LatLngExpression[] | L.LatLngExpression[][], options);
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
      el.classList.add(name);
    },

    removeClass: (el: HTMLElement, name: string): void => {
      el.classList.remove(name);
    },

    hasClass: (el: HTMLElement, name: string): boolean => {
      return el.classList.contains(name);
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

    stopPropagation: (e: unknown): typeof this => {
      const stopPropagation = L.DomEvent.stopPropagation as unknown as (event: unknown) => void;
      stopPropagation(e);
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
      const rect = container?.getBoundingClientRect();
      return new L.Point(e.clientX - (rect?.left ?? 0), e.clientY - (rect?.top ?? 0));
    },
  };

  /**
   * Utility methods compatibility
   */
  util = {
    extend: (dest: UnknownRecord, ...sources: UnknownRecord[]): UnknownRecord => {
      return Object.assign(dest, ...sources);
    },

    bind: <T extends UnknownFn>(fn: T, obj: unknown): T => {
      return fn.bind(obj) as T;
    },

    stamp: (obj: object): number => {
      return L.Util.stamp(obj);
    },

    throttle: (fn: UnknownFn, time: number, context?: object): UnknownFn => {
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
      return str.trim();
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
    },

    template: (str: string, data: UnknownRecord): string => {
      return L.Util.template(str, data);
    },

    isArray: (obj: unknown): boolean => {
      return Array.isArray(obj);
    },

    indexOf: (array: unknown[], item: unknown): number => {
      return array.indexOf(item);
    },

    requestAnimFrame: (
      fn: AnimationFrameCallback,
      context?: unknown,
      immediate?: boolean,
    ): number => {
      void immediate;
      return requestAnimationFrame((context ? fn.bind(context) : fn) as AnimationFrameCallback);
    },

    cancelAnimFrame: (id: number): void => {
      cancelAnimationFrame(id);
    },
  };

  /**
   * Browser detection compatibility
   */

  getBrowser() {
    const browser = getLegacyBrowser();
    const currentNavigator = getNavigator();
    const userAgent = currentNavigator?.userAgent ?? '';
    const platform = currentNavigator?.platform ?? '';
    const coarsePointer =
      typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    return {
      get ie(): boolean {
        return browser.ie ?? false;
      },

      get ielt9(): boolean {
        return browser.ielt9 ?? false;
      },

      get edge(): boolean {
        return browser.edge ?? false;
      },

      get webkit(): boolean {
        return browser.webkit ?? /AppleWebKit/.test(userAgent);
      },

      get android(): boolean {
        return browser.android ?? /Android/.test(userAgent);
      },

      get android23(): boolean {
        return browser.android23 ?? false;
      },

      get androidStock(): boolean {
        return browser.androidStock ?? false;
      },

      get opera(): boolean {
        return browser.opera ?? false;
      },

      get chrome(): boolean {
        return browser.chrome ?? /(?:Chrome|CriOS)/.test(userAgent);
      },

      get gecko(): boolean {
        return browser.gecko ?? /Gecko\//.test(userAgent);
      },

      get safari(): boolean {
        return browser.safari ?? (/Safari/.test(userAgent) && !/(?:Chrome|CriOS)/.test(userAgent));
      },

      get phantom(): boolean {
        return browser.phantom ?? false;
      },

      get opera12(): boolean {
        return browser.opera12 ?? false;
      },

      get win(): boolean {
        return browser.win ?? /Win/.test(platform);
      },

      get ie3d(): boolean {
        return browser.ie3d ?? false;
      },

      get webkit3d(): boolean {
        return browser.webkit3d ?? false;
      },

      get gecko3d(): boolean {
        return browser.gecko3d ?? false;
      },

      get any3d(): boolean {
        return browser.any3d ?? true;
      },

      get mobile(): boolean {
        return browser.mobile ?? coarsePointer;
      },

      get mobileWebkit(): boolean {
        return browser.mobileWebkit ?? false;
      },

      get mobileWebkit3d(): boolean {
        return browser.mobileWebkit3d ?? false;
      },

      get msPointer(): boolean {
        return browser.msPointer ?? false;
      },

      get pointer(): boolean {
        return browser.pointer ?? typeof PointerEvent !== 'undefined';
      },

      get touch(): boolean {
        return browser.touch ?? coarsePointer;
      },

      get touchNative(): boolean {
        return browser.touchNative ?? coarsePointer;
      },

      get mobileOpera(): boolean {
        return browser.mobileOpera ?? false;
      },

      get mobileGecko(): boolean {
        return browser.mobileGecko ?? false;
      },

      get retina(): boolean {
        return browser.retina ?? (typeof devicePixelRatio !== 'undefined' && devicePixelRatio > 1);
      },

      get passiveEvents(): boolean {
        return browser.passiveEvents ?? true;
      },

      get canvas(): boolean {
        return browser.canvas ?? true;
      },

      get svg(): boolean {
        return browser.svg ?? true;
      },

      get vml(): boolean {
        return browser.vml ?? false;
      },

      get inlineSvg(): boolean {
        return browser.inlineSvg ?? true;
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
