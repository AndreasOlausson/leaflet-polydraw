import { vi } from 'vitest';

// Mock for requestAnimationFrame
if (typeof window !== 'undefined') {
  window.requestAnimationFrame = vi.fn((cb) => {
    cb(0);
    return 0;
  });

  // Mock for PointerEvent, which is not available in JSDOM
  if (!window.PointerEvent) {
    class PointerEvent extends MouseEvent {}
    (window as any).PointerEvent = PointerEvent;
  }
}

// Mock for SVG/Canvas element methods that are not implemented in JSDOM
if (typeof SVGElement === 'undefined') {
  class SVGElement extends HTMLElement {}
  (global as any).SVGElement = SVGElement;
}

if (typeof (SVGElement.prototype as any).getBBox === 'undefined') {
  (SVGElement.prototype as any).getBBox = () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  });
}
