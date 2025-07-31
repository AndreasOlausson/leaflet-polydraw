import { vi } from 'vitest';

vi.mock('./src/utils', async () => {
  const actual = await vi.importActual('./src/utils');
  return {
    ...actual,
    isTouchDevice: () => false,
  };
});

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

// Mock Canvas and CanvasRenderingContext2D for JSDOM
if (typeof HTMLCanvasElement !== 'undefined') {
  // Mock getContext method with proper typing
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextType: string) => {
    if (contextType === '2d') {
      // Return a mock 2D context with essential methods that Leaflet uses
      return {
        save: vi.fn(),
        restore: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        setTransform: vi.fn(),
        transform: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        clip: vi.fn(),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createPattern: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        isPointInPath: vi.fn(() => false),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(4),
          width: 1,
          height: 1,
        })),
        putImageData: vi.fn(),
        drawImage: vi.fn(),
        // Properties that Leaflet might access
        canvas: null as any,
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        lineCap: 'butt' as CanvasLineCap,
        lineJoin: 'miter' as CanvasLineJoin,
        miterLimit: 10,
        lineDashOffset: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowBlur: 0,
        shadowColor: 'rgba(0, 0, 0, 0)',
        globalAlpha: 1,
        globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
        font: '10px sans-serif',
        textAlign: 'start' as CanvasTextAlign,
        textBaseline: 'alphabetic' as CanvasTextBaseline,
        direction: 'inherit' as CanvasDirection,
        imageSmoothingEnabled: true,
      } as any; // Use 'as any' to bypass strict typing for mock
    }
    return null;
  });

  // Mock other canvas methods
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,');
  HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
    if (callback) callback(new Blob());
  });
}
