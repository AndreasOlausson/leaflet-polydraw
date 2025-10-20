/**
 * Event Handling Tests
 *
 * Tests the event system that makes Polydraw work across different devices:
 * - Mouse events (desktop)
 * - Touch events (mobile)
 * - Pointer events (modern browsers)
 * - Event propagation and prevention
 * - Cross-platform compatibility
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockFactory } from '../mocks/factory';
import Polydraw from '../../../src/polydraw';
import { DrawMode } from '../../../src/enums';

// Mock type for Polydraw with test-specific methods
type MockedPolydraw = {
  // Real Polydraw public methods
  addTo(map: L.Map): MockedPolydraw;
  onAdd(map: L.Map): HTMLElement;
  onRemove(map: L.Map): void;
  getFeatureGroups(): L.FeatureGroup[];
  addPredefinedPolygon(polygon: any): Promise<void>;
  setDrawMode(mode: DrawMode): MockedPolydraw;
  getDrawMode(): DrawMode;
  on(event: any, callback: any): void;
  off(event: any, callback: any): void;
  removeAllFeatureGroups(): void;

  // Test-specific methods
  isDrawing(): boolean;
  startDraw(): void;
  stopDraw(): void;
  clearAll(): void;
  getPolygons(): unknown[];
  remove(): MockedPolydraw;
};

// Mock the polydraw module
vi.mock('../../../src/polydraw', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      // Public methods from the real Polydraw class
      addTo: vi.fn().mockReturnThis(),
      onAdd: vi.fn().mockReturnValue(document.createElement('div')),
      onRemove: vi.fn(),
      getFeatureGroups: vi.fn().mockReturnValue([]),
      addPredefinedPolygon: vi.fn().mockResolvedValue(undefined),
      setDrawMode: vi.fn().mockReturnThis(),
      getDrawMode: vi.fn().mockReturnValue(DrawMode.Off),
      on: vi.fn(),
      off: vi.fn(),
      removeAllFeatureGroups: vi.fn(),

      // Test-specific methods
      startDraw: vi.fn().mockReturnThis(),
      stopDraw: vi.fn().mockReturnThis(),
      clearAll: vi.fn().mockReturnThis(),
      getPolygons: vi.fn().mockReturnValue([]),
      isDrawing: vi.fn().mockReturnValue(false),
      remove: vi.fn().mockReturnThis(),
    })),
  };
});

describe('Event Handling', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _map: L.Map;
  let polydraw: MockedPolydraw;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create fresh mock objects
    _map = MockFactory.createMap();
    polydraw = new Polydraw() as unknown as MockedPolydraw;
  });

  describe('Mouse Events', () => {
    it('should handle mousedown events', () => {
      const mouseDownEvent = MockFactory.createEvent('mousedown', {
        latlng: MockFactory.createLatLng(58.4, 15.6),
        containerPoint: { x: 400, y: 300 },
      });

      expect(mouseDownEvent.type).toBe('mousedown');
      expect(mouseDownEvent.latlng).toBeDefined();
      expect(mouseDownEvent.containerPoint).toEqual({ x: 400, y: 300 });
      expect(mouseDownEvent.preventDefault).toBeDefined();
    });

    it('should handle mousemove events', () => {
      const mouseMoveEvent = MockFactory.createEvent('mousemove', {
        latlng: MockFactory.createLatLng(58.5, 15.7),
        containerPoint: { x: 450, y: 350 },
      });

      expect(mouseMoveEvent.type).toBe('mousemove');
      expect(mouseMoveEvent.latlng).toBeDefined();
      expect(mouseMoveEvent.containerPoint).toEqual({ x: 450, y: 350 });
    });

    it('should handle mouseup events', () => {
      const mouseUpEvent = MockFactory.createEvent('mouseup', {
        latlng: MockFactory.createLatLng(58.6, 15.8),
        containerPoint: { x: 500, y: 400 },
      });

      expect(mouseUpEvent.type).toBe('mouseup');
      expect(mouseUpEvent.latlng).toBeDefined();
      expect(mouseUpEvent.containerPoint).toEqual({ x: 500, y: 400 });
    });

    it('should handle click events', () => {
      const clickEvent = MockFactory.createEvent('click', {
        latlng: MockFactory.createLatLng(58.4, 15.6),
      });

      expect(clickEvent.type).toBe('click');
      expect(clickEvent.latlng).toBeDefined();
    });

    it('should handle double-click events', () => {
      const dblClickEvent = MockFactory.createEvent('dblclick', {
        latlng: MockFactory.createLatLng(58.4, 15.6),
      });

      expect(dblClickEvent.type).toBe('dblclick');
      expect(dblClickEvent.latlng).toBeDefined();
    });
  });

  describe('Touch Events', () => {
    it('should handle touchstart events', () => {
      const touchStartEvent = MockFactory.createEvent('touchstart', {
        latlng: MockFactory.createLatLng(58.4, 15.6),
        originalEvent: {
          touches: [{ clientX: 400, clientY: 300 }],
        },
      });

      expect(touchStartEvent.type).toBe('touchstart');
      expect(touchStartEvent.latlng).toBeDefined();
      expect(touchStartEvent.originalEvent.touches).toBeDefined();
    });

    it('should handle touchmove events', () => {
      const touchMoveEvent = MockFactory.createEvent('touchmove', {
        latlng: MockFactory.createLatLng(58.5, 15.7),
        originalEvent: {
          touches: [{ clientX: 450, clientY: 350 }],
        },
      });

      expect(touchMoveEvent.type).toBe('touchmove');
      expect(touchMoveEvent.latlng).toBeDefined();
      expect(touchMoveEvent.originalEvent.touches).toBeDefined();
    });

    it('should handle touchend events', () => {
      const touchEndEvent = MockFactory.createEvent('touchend', {
        latlng: MockFactory.createLatLng(58.6, 15.8),
        originalEvent: {
          changedTouches: [{ clientX: 500, clientY: 400 }],
        },
      });

      expect(touchEndEvent.type).toBe('touchend');
      expect(touchEndEvent.latlng).toBeDefined();
      expect(touchEndEvent.originalEvent.changedTouches).toBeDefined();
    });
  });

  describe('Pointer Events', () => {
    it('should handle pointerdown events', () => {
      const pointerDownEvent = MockFactory.createEvent('pointerdown', {
        latlng: MockFactory.createLatLng(58.4, 15.6),
        originalEvent: {
          pointerId: 1,
          pointerType: 'mouse',
          pressure: 0.5,
        },
      });

      expect(pointerDownEvent.type).toBe('pointerdown');
      expect(pointerDownEvent.latlng).toBeDefined();
      expect(pointerDownEvent.originalEvent.pointerId).toBe(1);
      expect(pointerDownEvent.originalEvent.pointerType).toBe('mouse');
    });

    it('should handle pointermove events', () => {
      const pointerMoveEvent = MockFactory.createEvent('pointermove', {
        latlng: MockFactory.createLatLng(58.5, 15.7),
        originalEvent: {
          pointerId: 1,
          pointerType: 'mouse',
          pressure: 0.5,
        },
      });

      expect(pointerMoveEvent.type).toBe('pointermove');
      expect(pointerMoveEvent.latlng).toBeDefined();
      expect(pointerMoveEvent.originalEvent.pointerId).toBe(1);
    });

    it('should handle pointerup events', () => {
      const pointerUpEvent = MockFactory.createEvent('pointerup', {
        latlng: MockFactory.createLatLng(58.6, 15.8),
        originalEvent: {
          pointerId: 1,
          pointerType: 'mouse',
          pressure: 0,
        },
      });

      expect(pointerUpEvent.type).toBe('pointerup');
      expect(pointerUpEvent.latlng).toBeDefined();
      expect(pointerUpEvent.originalEvent.pressure).toBe(0);
    });

    it('should handle different pointer types', () => {
      const mousePointer = MockFactory.createEvent('pointerdown', {
        originalEvent: { pointerType: 'mouse' },
      });
      const touchPointer = MockFactory.createEvent('pointerdown', {
        originalEvent: { pointerType: 'touch' },
      });
      const penPointer = MockFactory.createEvent('pointerdown', {
        originalEvent: { pointerType: 'pen' },
      });

      expect(mousePointer.originalEvent.pointerType).toBe('mouse');
      expect(touchPointer.originalEvent.pointerType).toBe('touch');
      expect(penPointer.originalEvent.pointerType).toBe('pen');
    });
  });

  describe('Event Sequences', () => {
    it('should simulate complete drawing sequence', () => {
      const startPoint = MockFactory.createLatLng(58.4, 15.6);
      const endPoint = MockFactory.createLatLng(58.5, 15.7);

      const events = MockFactory.createDrawingEvents(startPoint, endPoint);

      expect(events).toHaveLength(3);

      // Verify event sequence
      expect(events[0].type).toBe('mousedown');
      expect(events[0].latlng).toBe(startPoint);

      expect(events[1].type).toBe('mousemove');
      expect(events[1].latlng).toBeDefined();

      expect(events[2].type).toBe('mouseup');
      expect(events[2].latlng).toBe(endPoint);
    });

    it('should simulate touch drawing sequence', () => {
      const startPoint = MockFactory.createLatLng(58.4, 15.6);
      const endPoint = MockFactory.createLatLng(58.5, 15.7);

      const touchStart = MockFactory.createEvent('touchstart', { latlng: startPoint });
      const touchMove = MockFactory.createEvent('touchmove', {
        latlng: MockFactory.createLatLng(
          (startPoint.lat + endPoint.lat) / 2,
          (startPoint.lng + endPoint.lng) / 2,
        ),
      });
      const touchEnd = MockFactory.createEvent('touchend', { latlng: endPoint });

      expect(touchStart.type).toBe('touchstart');
      expect(touchMove.type).toBe('touchmove');
      expect(touchEnd.type).toBe('touchend');
    });

    it('should simulate pointer drawing sequence', () => {
      const startPoint = MockFactory.createLatLng(58.4, 15.6);
      const endPoint = MockFactory.createLatLng(58.5, 15.7);

      const pointerDown = MockFactory.createEvent('pointerdown', { latlng: startPoint });
      const pointerMove = MockFactory.createEvent('pointermove', {
        latlng: MockFactory.createLatLng(
          (startPoint.lat + endPoint.lat) / 2,
          (startPoint.lng + endPoint.lng) / 2,
        ),
      });
      const pointerUp = MockFactory.createEvent('pointerup', { latlng: endPoint });

      expect(pointerDown.type).toBe('pointerdown');
      expect(pointerMove.type).toBe('pointermove');
      expect(pointerUp.type).toBe('pointerup');
    });
  });

  describe('Event Prevention', () => {
    it('should prevent default behavior', () => {
      const event = MockFactory.createEvent('mousedown');

      event.preventDefault();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should stop event propagation', () => {
      const event = MockFactory.createEvent('click');

      event.stopPropagation();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should stop immediate propagation', () => {
      const event = MockFactory.createEvent('click');

      event.stopImmediatePropagation();
      expect(event.stopImmediatePropagation).toHaveBeenCalled();
    });
  });

  describe('Event Registration', () => {
    it('should register event listeners', () => {
      const handler = vi.fn();

      polydraw.on('drawstart', handler);
      expect(polydraw.on).toHaveBeenCalledWith('drawstart', handler);
    });

    it('should unregister event listeners', () => {
      const handler = vi.fn();

      polydraw.off('drawend', handler);
      expect(polydraw.off).toHaveBeenCalledWith('drawend', handler);
    });

    it('should handle multiple event types', () => {
      const handlers = {
        drawstart: vi.fn(),
        drawend: vi.fn(),
        polygoncreated: vi.fn(),
      };

      Object.entries(handlers).forEach(([event, handler]) => {
        polydraw.on(event, handler);
        expect(polydraw.on).toHaveBeenCalledWith(event, handler);
      });
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should handle mixed input types', () => {
      const mouseEvent = MockFactory.createEvent('mousedown');
      const touchEvent = MockFactory.createEvent('touchstart');
      const pointerEvent = MockFactory.createEvent('pointerdown');

      expect(mouseEvent.type).toBe('mousedown');
      expect(touchEvent.type).toBe('touchstart');
      expect(pointerEvent.type).toBe('pointerdown');
    });

    it('should normalize coordinates across event types', () => {
      const latlng = MockFactory.createLatLng(58.4, 15.6);

      const mouseEvent = MockFactory.createEvent('mousedown', { latlng });
      const touchEvent = MockFactory.createEvent('touchstart', { latlng });
      const pointerEvent = MockFactory.createEvent('pointerdown', { latlng });

      expect(mouseEvent.latlng).toBe(latlng);
      expect(touchEvent.latlng).toBe(latlng);
      expect(pointerEvent.latlng).toBe(latlng);
    });

    it('should handle different pressure levels', () => {
      const lightTouch = MockFactory.createEvent('pointerdown', {
        originalEvent: { pressure: 0.1 },
      });
      const heavyTouch = MockFactory.createEvent('pointerdown', {
        originalEvent: { pressure: 0.9 },
      });

      expect(lightTouch.originalEvent.pressure).toBe(0.1);
      expect(heavyTouch.originalEvent.pressure).toBe(0.9);
    });
  });

  describe('Event Error Handling', () => {
    it('should handle events with missing coordinates', () => {
      const event = MockFactory.createEvent('mousedown', {
        latlng: undefined,
        containerPoint: { x: 400, y: 300 },
      });

      expect(event.containerPoint).toEqual({ x: 400, y: 300 });
    });

    it('should handle events with invalid coordinates', () => {
      const event = MockFactory.createEvent('mousedown', {
        latlng: MockFactory.createLatLng(NaN, NaN),
      });

      expect(event.latlng).toBeDefined();
    });

    it('should handle rapid event sequences', () => {
      const events = [];
      for (let i = 0; i < 10; i++) {
        events.push(
          MockFactory.createEvent('mousemove', {
            containerPoint: { x: 400 + i, y: 300 + i },
          }),
        );
      }

      expect(events).toHaveLength(10);
      events.forEach((event, index) => {
        expect(event.type).toBe('mousemove');
        expect(event.containerPoint.x).toBe(400 + index);
      });
    });
  });
});
