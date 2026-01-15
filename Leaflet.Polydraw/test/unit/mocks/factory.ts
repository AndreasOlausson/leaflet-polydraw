/**
 * Mock Factory for Leaflet Polydraw Tests
 *
 * This factory provides consistent mock objects for testing,
 * supporting both Leaflet v1 and v2 compatibility.
 */

import * as L from 'leaflet';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
// import { LeafletVersionDetector } from '../../src/compatibility/version-detector';

export class MockFactory {
  /**
   * Creates a mock Leaflet Map
   */
  static createMap(): L.Map {
    const map = {
      // Map properties
      getContainer: vi.fn().mockReturnValue({
        getBoundingClientRect: vi.fn().mockReturnValue({
          x: 0,
          y: 0,
          width: 800,
          height: 600,
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),

      // Map methods
      on: vi.fn(),
      off: vi.fn(),
      setView: vi.fn().mockReturnThis(),
      addLayer: vi.fn().mockReturnThis(),
      removeLayer: vi.fn().mockReturnThis(),
      hasLayer: vi.fn().mockReturnValue(false),
      getZoom: vi.fn().mockReturnValue(10),
      getCenter: vi.fn().mockReturnValue(this.createLatLng()),

      // Coordinate conversion methods
      containerPointToLatLng: vi.fn().mockImplementation((point: any) => {
        return this.createLatLng(point[1] / 100, point[0] / 100);
      }),
      latLngToContainerPoint: vi.fn().mockImplementation((latlng: any) => {
        return { x: latlng.lng * 100, y: latlng.lat * 100 };
      }),

      // Event methods
      fire: vi.fn(),
      once: vi.fn(),

      // Layer group methods
      eachLayer: vi.fn(),
      getLayers: vi.fn().mockReturnValue([]),
      getLayerId: vi.fn().mockReturnValue('mock-layer-id'),
    } as any;

    return map;
  }

  /**
   * Creates a mock LatLng
   */
  static createLatLng(lat: number = 58.4, lng: number = 15.6): L.LatLng {
    const bounds = {
      getSouthWest: vi.fn().mockReturnValue({ lat: lat - 0.1, lng: lng - 0.1 }),
      getNorthEast: vi.fn().mockReturnValue({ lat: lat + 0.1, lng: lng + 0.1 }),
      getCenter: vi.fn().mockReturnValue({ lat, lng }),
      contains: vi.fn().mockReturnValue(true),
      intersects: vi.fn().mockReturnValue(false),
      extend: vi.fn().mockReturnThis(),
      isValid: vi.fn().mockReturnValue(true),
    };

    return {
      lat,
      lng,
      equals: vi.fn().mockReturnValue(false),
      distanceTo: vi.fn().mockReturnValue(1000),
      wrap: vi.fn().mockReturnThis(),
      toBounds: vi.fn().mockReturnValue(bounds),
      clone: vi.fn().mockReturnThis(),
      toString: vi.fn().mockReturnValue(`LatLng(${lat}, ${lng})`),
    } as any;
  }

  /**
   * Creates a LatLng literal for production-code inputs
   */
  static createLatLngLiteral(lat: number = 58.4, lng: number = 15.6): L.LatLngLiteral {
    return { lat, lng };
  }

  /**
   * Creates a mock LatLngBounds
   */
  static createLatLngBounds(): L.LatLngBounds {
    const southWest = this.createLatLng(58.3, 15.5);
    const northEast = this.createLatLng(58.5, 15.7);
    const center = this.createLatLng();

    return {
      getSouthWest: vi.fn().mockReturnValue(southWest),
      getNorthEast: vi.fn().mockReturnValue(northEast),
      getCenter: vi.fn().mockReturnValue(center),
      contains: vi.fn().mockReturnValue(true),
      intersects: vi.fn().mockReturnValue(false),
      extend: vi.fn().mockReturnThis(),
      isValid: vi.fn().mockReturnValue(true),
    } as any;
  }

  /**
   * Creates a mock Polygon with flexible parameters
   */
  static createPolygon(options?: {
    latlngs?: L.LatLng[];
    vertexCount?: number;
    center?: { lat: number; lng: number };
    size?: number;
  }): L.Polygon {
    const { vertexCount = 4, center = { lat: 58.4, lng: 15.6 }, size = 0.1 } = options || {};

    let latlngs: L.LatLng[];

    if (options?.latlngs) {
      latlngs = options.latlngs;
    } else {
      // Generate polygon vertices in a circle
      latlngs = [];
      for (let i = 0; i < vertexCount; i++) {
        const angle = (2 * Math.PI * i) / vertexCount;
        const lat = center.lat + size * Math.cos(angle);
        const lng = center.lng + size * Math.sin(angle);
        latlngs.push(this.createLatLng(lat, lng));
      }
      // Close the polygon
      if (vertexCount > 2) {
        latlngs.push(latlngs[0]);
      }
    }

    return {
      getLatLngs: vi.fn().mockReturnValue(latlngs),
      setLatLngs: vi.fn().mockReturnThis(),
      addLatLng: vi.fn().mockReturnThis(),
      getBounds: vi.fn().mockReturnValue(this.createLatLngBounds()),
      getCenter: vi.fn().mockReturnValue(this.createLatLng()),
      isEmpty: vi.fn().mockReturnValue(false),
      redraw: vi.fn().mockReturnThis(),
      setStyle: vi.fn().mockReturnThis(),
      bringToFront: vi.fn().mockReturnThis(),
      bringToBack: vi.fn().mockReturnThis(),

      // Layer methods
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),
      removeFrom: vi.fn().mockReturnThis(),

      // Event methods
      on: vi.fn(),
      off: vi.fn(),
      fire: vi.fn(),

      // Feature methods
      toGeoJSON: vi.fn().mockReturnValue({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [15.6, 58.4],
              [15.7, 58.5],
              [15.8, 58.6],
              [15.6, 58.4],
            ],
          ],
        },
        properties: {},
      }),
    } as any;
  }

  /**
   * Creates a mock Polyline
   */
  static createPolyline(latlngs?: L.LatLng[]): L.Polyline {
    const defaultLatLngs = [
      this.createLatLng(58.4, 15.6),
      this.createLatLng(58.5, 15.7),
      this.createLatLng(58.6, 15.8),
    ];

    return {
      getLatLngs: vi.fn().mockReturnValue(latlngs || defaultLatLngs),
      setLatLngs: vi.fn().mockReturnThis(),
      addLatLng: vi.fn().mockReturnThis(),
      getBounds: vi.fn().mockReturnValue(this.createLatLngBounds()),
      getCenter: vi.fn().mockReturnValue(this.createLatLng()),
      isEmpty: vi.fn().mockReturnValue(false),
      redraw: vi.fn().mockReturnThis(),
      setStyle: vi.fn().mockReturnThis(),

      // Layer methods
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),

      // Event methods
      on: vi.fn(),
      off: vi.fn(),
      fire: vi.fn(),

      // Feature methods
      toGeoJSON: vi.fn().mockReturnValue({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [15.6, 58.4],
            [15.7, 58.5],
            [15.8, 58.6],
          ],
        },
        properties: {},
      }),
    } as any;
  }

  /**
   * Creates a mock Marker
   */
  static createMarker(latlng?: L.LatLng): L.Marker {
    return {
      getLatLng: vi.fn().mockReturnValue(latlng || this.createLatLng()),
      setLatLng: vi.fn().mockReturnThis(),
      getIcon: vi.fn().mockReturnValue(this.createDivIcon()),
      setIcon: vi.fn().mockReturnThis(),
      getPopup: vi.fn().mockReturnValue(this.createPopup()),
      bindPopup: vi.fn().mockReturnThis(),
      openPopup: vi.fn().mockReturnThis(),
      closePopup: vi.fn().mockReturnThis(),

      // Layer methods
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),

      // Event methods
      on: vi.fn(),
      off: vi.fn(),
      fire: vi.fn(),
    } as any;
  }

  /**
   * Creates a mock DivIcon
   */
  static createDivIcon(options?: L.DivIconOptions): L.DivIcon {
    return {
      options: {
        className: 'test-icon',
        html: '<div>Test</div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        ...options,
      },
      createIcon: vi.fn().mockReturnValue(document.createElement('div')),
      createShadow: vi.fn().mockReturnValue(null),
    } as any;
  }

  /**
   * Creates a mock Popup
   */
  static createPopup(options?: L.PopupOptions): L.Popup {
    return {
      options: {
        maxWidth: 300,
        minWidth: 50,
        maxHeight: null,
        autoPan: true,
        keepInView: false,
        closeButton: true,
        autoClose: true,
        closeOnClick: false,
        className: '',
        ...options,
      },
      setContent: vi.fn().mockReturnThis(),
      getContent: vi.fn().mockReturnValue('Test content'),
      setLatLng: vi.fn().mockReturnThis(),
      getLatLng: vi.fn().mockReturnValue(this.createLatLng()),
      openOn: vi.fn().mockReturnThis(),
      isOpen: vi.fn().mockReturnValue(false),

      // Layer methods
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),

      // Event methods
      on: vi.fn(),
      off: vi.fn(),
      fire: vi.fn(),
    } as any;
  }

  /**
   * Creates a mock FeatureGroup
   */
  static createFeatureGroup(): L.FeatureGroup {
    return {
      addLayer: vi.fn().mockReturnThis(),
      removeLayer: vi.fn().mockReturnThis(),
      hasLayer: vi.fn().mockReturnValue(false),
      clearLayers: vi.fn().mockReturnThis(),
      getLayers: vi.fn().mockReturnValue([]),
      eachLayer: vi.fn(),
      getBounds: vi.fn().mockReturnValue(this.createLatLngBounds()),
      setStyle: vi.fn().mockReturnThis(),

      // Layer methods
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),

      // Event methods
      on: vi.fn(),
      off: vi.fn(),
      fire: vi.fn(),
    } as any;
  }

  /**
   * Creates a real DOM container for Leaflet map tests
   */
  static createMapContainer(options?: { width?: number; height?: number }): HTMLDivElement {
    const { width = 800, height = 600 } = options || {};
    const container = document.createElement('div');
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    Object.defineProperty(container, 'clientWidth', { value: width });
    Object.defineProperty(container, 'clientHeight', { value: height });
    container.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        width,
        height,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
        toJSON: () => '',
      }) as DOMRect;

    document.body.appendChild(container);
    return container;
  }

  /**
   * Creates a mock LeafletMouseEvent
   */
  static createMouseEvent(type: string = 'mousedown', latlng?: L.LatLng): L.LeafletMouseEvent {
    return {
      type,
      latlng: latlng || this.createLatLng(),
      layerPoint: { x: 100, y: 200 },
      containerPoint: { x: 150, y: 250 },
      originalEvent: new MouseEvent(type),
      propagatedFrom: null,
      target: this.createMap(),
      sourceTarget: this.createMap(),
    } as any;
  }

  /**
   * Creates a mock TouchEvent
   */
  static createTouchEvent(type: string = 'touchstart'): TouchEvent {
    const event = new TouchEvent(type, {
      touches: [
        {
          clientX: 100,
          clientY: 200,
          identifier: 1,
        } as Touch,
      ],
    });
    return event;
  }

  /**
   * Creates a mock PointerEvent
   */
  static createPointerEvent(type: string = 'pointerdown'): PointerEvent {
    const event = new PointerEvent(type, {
      pointerId: 1,
      clientX: 100,
      clientY: 200,
      pressure: 0.5,
      pointerType: 'mouse',
    });
    return event;
  }

  /**
   * Creates a mock Point
   */
  static createPoint(x: number = 100, y: number = 200): L.Point {
    return {
      x,
      y,
      add: vi.fn().mockReturnThis(),
      subtract: vi.fn().mockReturnThis(),
      multiplyBy: vi.fn().mockReturnThis(),
      divideBy: vi.fn().mockReturnThis(),
      round: vi.fn().mockReturnThis(),
      floor: vi.fn().mockReturnThis(),
      distanceTo: vi.fn().mockReturnValue(100),
      equals: vi.fn().mockReturnValue(false),
      contains: vi.fn().mockReturnValue(false),
      toString: vi.fn().mockReturnValue(`Point(${x}, ${y})`),
    } as any;
  }

  /**
   * Creates mock DOM utilities
   */
  static createDomUtil() {
    return {
      create: vi
        .fn()
        .mockImplementation((tagName: string, className?: string, container?: HTMLElement) => {
          const element = document.createElement(tagName);
          if (className) element.className = className;
          if (container) container.appendChild(element);
          return element;
        }),
      get: vi.fn().mockReturnValue(document.createElement('div')),
      getStyle: vi.fn().mockReturnValue(''),
      setStyle: vi.fn(),
      addClass: vi.fn(),
      removeClass: vi.fn(),
      hasClass: vi.fn().mockReturnValue(false),
      setClass: vi.fn(),
      getClass: vi.fn().mockReturnValue(''),
      empty: vi.fn(),
      remove: vi.fn(),
      disableTextSelection: vi.fn(),
      enableTextSelection: vi.fn(),
      disableImageDrag: vi.fn(),
      enableImageDrag: vi.fn(),
      preventOutline: vi.fn(),
      restoreOutline: vi.fn(),
      getSizedParentNode: vi.fn().mockReturnValue(document.createElement('div')),
      getScale: vi.fn().mockReturnValue({ x: 1, y: 1 }),
      getPosition: vi.fn().mockReturnValue(this.createPoint()),
      setPosition: vi.fn(),
      getTranslateString: vi.fn().mockReturnValue('translate(0px, 0px)'),
      setTransform: vi.fn(),
      testProp: vi.fn().mockReturnValue('transform'),
      setOpacity: vi.fn(),
      getOpacity: vi.fn().mockReturnValue(1),
    };
  }

  /**
   * Creates mock utility functions
   */
  static createUtil() {
    return {
      stamp: vi.fn().mockReturnValue('mock-stamp'),
      falseFn: vi.fn().mockReturnValue(false),
      formatNum: vi.fn().mockImplementation((num: number) => num.toString()),
      trim: vi.fn().mockImplementation((str: string) => str.trim()),
      splitWords: vi.fn().mockImplementation((str: string) => str.split(' ')),
      setOptions: vi.fn(),
      bind: vi.fn().mockImplementation((fn: (...args: any[]) => any) => fn),
      getParamString: vi.fn().mockReturnValue(''),
      template: vi.fn().mockImplementation((str: string, _data: any) => str),
      isArray: vi.fn().mockImplementation(Array.isArray),
      extend: vi.fn().mockImplementation(Object.assign),
      create: vi.fn().mockImplementation(Object.create),
      inherit: vi.fn().mockImplementation((Child: any, Parent: any) => {
        Child.prototype = Object.create(Parent.prototype);
        Child.prototype.constructor = Child;
        return Child;
      }),
    };
  }

  /**
   * Creates mock browser detection
   */
  static createBrowser() {
    return {
      ie: false,
      ielt9: false,
      edge: false,
      webkit: true,
      android: false,
      android23: false,
      androidStock: false,
      opera: false,
      chrome: true,
      gecko: false,
      safari: false,
      phantom: false,
      opera12: false,
      win: false,
      ie3d: false,
      webkit3d: true,
      gecko3d: false,
      any3d: true,
      mobile: false,
      mobileWebkit: false,
      mobileOpera: false,
      mobileGecko: false,
      touch: false,
      msPointer: false,
      pointer: true,
      retina: false,
    };
  }

  /**
   * Creates multiple polygons for testing scenarios
   */
  static createPolygons(
    count: number,
    options?: {
      vertexCount?: number;
      center?: { lat: number; lng: number };
      size?: number;
      spacing?: number;
    },
  ): L.Polygon[] {
    const {
      vertexCount = 4,
      center = { lat: 58.4, lng: 15.6 },
      size = 0.1,
      spacing = 0.3,
    } = options || {};
    const polygons: L.Polygon[] = [];

    for (let i = 0; i < count; i++) {
      const polygonCenter = {
        lat: center.lat + (i % 3) * spacing,
        lng: center.lng + Math.floor(i / 3) * spacing,
      };
      polygons.push(this.createPolygon({ vertexCount, center: polygonCenter, size }));
    }

    return polygons;
  }

  /**
   * Creates overlapping polygons for testing merging scenarios
   */
  static createOverlappingPolygons(): L.Polygon[] {
    const center = { lat: 58.4, lng: 15.6 };
    return [
      this.createPolygon({ vertexCount: 4, center, size: 0.1 }),
      this.createPolygon({
        vertexCount: 3,
        center: { lat: center.lat + 0.05, lng: center.lng + 0.05 },
        size: 0.1,
      }),
    ];
  }

  /**
   * Creates a mock event with flexible properties
   */
  static createEvent(
    type: string,
    options?: {
      latlng?: L.LatLng;
      containerPoint?: { x: number; y: number };
      originalEvent?: any;
      target?: any;
    },
  ): any {
    const { latlng, containerPoint, originalEvent, target } = options || {};

    return {
      type,
      latlng: latlng || this.createLatLng(),
      containerPoint: containerPoint || { x: 400, y: 300 },
      originalEvent: originalEvent || {},
      target: target || this.createMap(),
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      stopImmediatePropagation: vi.fn(),
    };
  }

  /**
   * Creates mock drawing events sequence
   */
  static createDrawingEvents(startPoint: L.LatLng, endPoint: L.LatLng): any[] {
    return [
      this.createEvent('mousedown', { latlng: startPoint }),
      this.createEvent('mousemove', {
        latlng: this.createLatLng(
          (startPoint.lat + endPoint.lat) / 2,
          (startPoint.lng + endPoint.lng) / 2,
        ),
      }),
      this.createEvent('mouseup', { latlng: endPoint }),
    ];
  }

  /**
   * Creates mock FeatureGroup with polygons
   */
  static createFeatureGroupWithPolygons(polygonCount: number = 2): L.FeatureGroup {
    const polygons = this.createPolygons(polygonCount);
    const featureGroup = this.createFeatureGroup();

    // Mock the getLayers method to return our polygons
    featureGroup.getLayers = vi.fn().mockReturnValue(polygons);
    featureGroup.eachLayer = vi.fn().mockImplementation((callback: any) => {
      polygons.forEach(callback);
    });

    return featureGroup;
  }

  /**
   * Creates predefined polygon shapes for testing
   */
  static createPredefinedPolygons() {
    return {
      /**
       * Creates an octagon-shaped polygon
       */
      octagon: (): L.LatLngLiteral[][][] => [
        [
          [
            this.createLatLngLiteral(58.404493, 15.6),
            this.createLatLngLiteral(58.402928, 15.602928),
            this.createLatLngLiteral(58.4, 15.604493),
            this.createLatLngLiteral(58.397072, 15.602928),
            this.createLatLngLiteral(58.395507, 15.6),
            this.createLatLngLiteral(58.397072, 15.597072),
            this.createLatLngLiteral(58.4, 15.595507),
            this.createLatLngLiteral(58.402928, 15.597072),
            this.createLatLngLiteral(58.404493, 15.6), // Close the polygon
          ],
        ],
      ],

      /**
       * Creates a square with a hole (donut shape)
       */
      squareWithHole: (): L.LatLngLiteral[][][] => [
        [
          // Outer square (counter-clockwise)
          [
            this.createLatLngLiteral(58.407, 15.597),
            this.createLatLngLiteral(58.407, 15.603),
            this.createLatLngLiteral(58.397, 15.603),
            this.createLatLngLiteral(58.397, 15.597),
            this.createLatLngLiteral(58.407, 15.597),
          ],
          // Inner square (clockwise, as hole)
          [
            this.createLatLngLiteral(58.403, 15.599),
            this.createLatLngLiteral(58.403, 15.601),
            this.createLatLngLiteral(58.401, 15.601),
            this.createLatLngLiteral(58.401, 15.599),
            this.createLatLngLiteral(58.403, 15.599),
          ],
        ],
      ],

      /**
       * Creates overlapping squares (for merging tests)
       */
      overlappingSquares: (): L.LatLngLiteral[][][] => [
        [
          [
            this.createLatLngLiteral(58.405, 15.595),
            this.createLatLngLiteral(58.405, 15.6),
            this.createLatLngLiteral(58.4, 15.6),
            this.createLatLngLiteral(58.4, 15.595),
            this.createLatLngLiteral(58.405, 15.595),
          ],
        ],
        [
          [
            this.createLatLngLiteral(58.403, 15.598),
            this.createLatLngLiteral(58.403, 15.603),
            this.createLatLngLiteral(58.398, 15.603),
            this.createLatLngLiteral(58.398, 15.598),
            this.createLatLngLiteral(58.403, 15.598),
          ],
        ],
      ],

      /**
       * Creates a triangle (3 vertices)
       */
      triangle: (): L.LatLngLiteral[][][] => [
        [
          [
            this.createLatLngLiteral(58.41, 15.59),
            this.createLatLngLiteral(58.41, 15.595),
            this.createLatLngLiteral(58.405, 15.592),
            this.createLatLngLiteral(58.41, 15.59), // Closing point
          ],
        ],
      ],

      /**
       * Creates a complex polygon with multiple holes
       */
      complexWithMultipleHoles: (): L.LatLngLiteral[][][] => [
        [
          // Outer boundary
          [
            this.createLatLngLiteral(58.41, 15.59),
            this.createLatLngLiteral(58.41, 15.61),
            this.createLatLngLiteral(58.39, 15.61),
            this.createLatLngLiteral(58.39, 15.59),
            this.createLatLngLiteral(58.41, 15.59),
          ],
          // First hole
          [
            this.createLatLngLiteral(58.405, 15.595),
            this.createLatLngLiteral(58.405, 15.6),
            this.createLatLngLiteral(58.4, 15.6),
            this.createLatLngLiteral(58.4, 15.595),
            this.createLatLngLiteral(58.405, 15.595),
          ],
          // Second hole
          [
            this.createLatLngLiteral(58.402, 15.598),
            this.createLatLngLiteral(58.402, 15.602),
            this.createLatLngLiteral(58.398, 15.602),
            this.createLatLngLiteral(58.398, 15.598),
            this.createLatLngLiteral(58.402, 15.598),
          ],
        ],
      ],

      /**
       * Creates a C-shape polygon (for merging tests)
       */
      cShape: (): L.LatLngLiteral[][][] => [
        [
          [
            this.createLatLngLiteral(58.41, 15.59),
            this.createLatLngLiteral(58.41, 15.61),
            this.createLatLngLiteral(58.405, 15.61),
            this.createLatLngLiteral(58.405, 15.605),
            this.createLatLngLiteral(58.395, 15.605),
            this.createLatLngLiteral(58.395, 15.595),
            this.createLatLngLiteral(58.405, 15.595),
            this.createLatLngLiteral(58.405, 15.59),
            this.createLatLngLiteral(58.41, 15.59),
          ],
        ],
      ],

      /**
       * Creates a star-shaped polygon
       */
      star: (): L.LatLngLiteral[][][] => [
        [
          [
            this.createLatLngLiteral(58.4, 15.61), // Top point
            this.createLatLngLiteral(58.402, 15.605), // Right upper
            this.createLatLngLiteral(58.408, 15.605), // Right outer
            this.createLatLngLiteral(58.403, 15.6), // Right inner
            this.createLatLngLiteral(58.405, 15.595), // Bottom right
            this.createLatLngLiteral(58.4, 15.598), // Bottom center
            this.createLatLngLiteral(58.395, 15.595), // Bottom left
            this.createLatLngLiteral(58.397, 15.6), // Left inner
            this.createLatLngLiteral(58.392, 15.605), // Left outer
            this.createLatLngLiteral(58.398, 15.605), // Left upper
            this.createLatLngLiteral(58.4, 15.61), // Close
          ],
        ],
      ],

      /**
       * Creates multiple separate polygons
       */
      multipleSimplePolygons: (): L.LatLngLiteral[][][] => [
        [
          [
            this.createLatLngLiteral(58.41, 15.59),
            this.createLatLngLiteral(58.41, 15.595),
            this.createLatLngLiteral(58.405, 15.592),
            this.createLatLngLiteral(58.41, 15.59),
          ],
        ],
        [
          [
            this.createLatLngLiteral(58.42, 15.6),
            this.createLatLngLiteral(58.42, 15.605),
            this.createLatLngLiteral(58.415, 15.602),
            this.createLatLngLiteral(58.42, 15.6),
          ],
        ],
        [
          [
            this.createLatLngLiteral(58.43, 15.61),
            this.createLatLngLiteral(58.43, 15.615),
            this.createLatLngLiteral(58.425, 15.612),
            this.createLatLngLiteral(58.43, 15.61),
          ],
        ],
      ],

      /**
       * Creates a very complex polygon with many vertices
       */
      complexPolygon: (): L.LatLngLiteral[][][] => [
        [
          [
            this.createLatLngLiteral(58.41, 15.59),
            this.createLatLngLiteral(58.411, 15.592),
            this.createLatLngLiteral(58.412, 15.595),
            this.createLatLngLiteral(58.413, 15.598),
            this.createLatLngLiteral(58.414, 15.601),
            this.createLatLngLiteral(58.413, 15.604),
            this.createLatLngLiteral(58.412, 15.607),
            this.createLatLngLiteral(58.411, 15.61),
            this.createLatLngLiteral(58.41, 15.613),
            this.createLatLngLiteral(58.409, 15.61),
            this.createLatLngLiteral(58.408, 15.607),
            this.createLatLngLiteral(58.407, 15.604),
            this.createLatLngLiteral(58.406, 15.601),
            this.createLatLngLiteral(58.407, 15.598),
            this.createLatLngLiteral(58.408, 15.595),
            this.createLatLngLiteral(58.409, 15.592),
            this.createLatLngLiteral(58.41, 15.59),
          ],
        ],
      ],
    };
  }

  /**
   * Creates reusable GeoJSON fixtures
   */
  static createGeoJSONFixtures() {
    return {
      squarePolygon: (): Feature<Polygon> => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [15.597, 58.397],
              [15.603, 58.397],
              [15.603, 58.403],
              [15.597, 58.403],
              [15.597, 58.397],
            ],
          ],
        },
        properties: {},
      }),
      octagonPolygon: (): Feature<Polygon> => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [15.6, 58.404493],
              [15.602928, 58.402928],
              [15.604493, 58.4],
              [15.602928, 58.397072],
              [15.6, 58.395507],
              [15.597072, 58.397072],
              [15.595507, 58.4],
              [15.597072, 58.402928],
              [15.6, 58.404493],
            ],
          ],
        },
        properties: {},
      }),
      trianglePolygon: (): Feature<Polygon> => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [15.6, 58.43],
              [15.605, 58.42],
              [15.595, 58.42],
              [15.6, 58.43],
            ],
          ],
        },
        properties: {},
      }),
      multipolygon: (): Feature<MultiPolygon> => ({
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [15.59, 58.39],
                [15.595, 58.39],
                [15.595, 58.395],
                [15.59, 58.395],
                [15.59, 58.39],
              ],
            ],
            [
              [
                [15.605, 58.39],
                [15.61, 58.39],
                [15.61, 58.395],
                [15.605, 58.395],
                [15.605, 58.39],
              ],
            ],
          ],
        },
        properties: {},
      }),
    };
  }
}

// Mock vi for Vitest
declare const vi: any;
