import { vi } from 'vitest';

// Suppress console warnings and errors from Leaflet in test environment
const originalWarn = console.warn;
const originalError = console.error;

console.warn = vi.fn((message: string, ...args: any[]) => {
  // Suppress specific Leaflet-related warnings
  if (
    typeof message === 'string' && (
      message.includes('Could not add tracer to map') ||
      message.includes('Could not remove map') ||
      message.includes('_leaflet_id') ||
      message.includes('_removePath')
    )
  ) {
    return;
  }
  originalWarn(message, ...args);
});

console.error = vi.fn((message: string, ...args: any[]) => {
  // Suppress Leaflet-specific errors
  if (
    typeof message === 'string' && (
      message.includes('_leaflet_id') ||
      message.includes('_removePath') ||
      message.includes('Cannot use \'in\' operator') ||
      message.includes('Cannot read properties of undefined')
    )
  ) {
    return;
  }
  originalError(message, ...args);
});

// Enhanced DOM setup for better Leaflet compatibility
Object.defineProperty(window, 'HTMLCanvasElement', {
  value: class HTMLCanvasElement {
    getContext() {
      return {
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Array(4) })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => ({ data: new Array(4) })),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        transform: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
      };
    }
    toDataURL() {
      return '';
    }
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
      };
    }
  },
});

// Mock requestAnimationFrame for smoother test execution
Object.defineProperty(window, 'requestAnimationFrame', {
  value: (callback: FrameRequestCallback) => {
    return setTimeout(callback, 16);
  },
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: (id: number) => {
    clearTimeout(id);
  },
});

// Enhanced DOM element creation with proper dimensions
const originalCreateElement = document.createElement.bind(document);
document.createElement = function(tagName: string, options?: ElementCreationOptions) {
  const element = originalCreateElement(tagName, options);
  
  // Add proper dimensions to div elements (commonly used by Leaflet)
  if (tagName.toLowerCase() === 'div') {
    Object.defineProperty(element, 'offsetWidth', { value: 800, configurable: true });
    Object.defineProperty(element, 'offsetHeight', { value: 600, configurable: true });
    Object.defineProperty(element, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(element, 'clientHeight', { value: 600, configurable: true });
    
    // Mock getBoundingClientRect for proper positioning
    element.getBoundingClientRect = vi.fn(() => ({
      top: 0,
      left: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
  }
  
  return element;
};

// Fix the specific Leaflet _leaflet_id issue
// This patches Leaflet's Util.stamp function to handle null objects
const patchLeafletUtil = () => {
  // Wait for Leaflet to be available
  const checkAndPatch = () => {
    if (typeof window !== 'undefined' && (window as any).L && (window as any).L.Util) {
      const L = (window as any).L;
      
      // Patch Util.stamp to handle null objects
      if (L.Util.stamp) {
        const originalStamp = L.Util.stamp;
        L.Util.stamp = (obj: any) => {
          if (!obj || typeof obj !== 'object') return 0;
          if (!obj._leaflet_id) {
            obj._leaflet_id = Math.floor(Math.random() * 1000000);
          }
          return obj._leaflet_id;
        };
      }
      
      // Mock map renderer to prevent null reference errors
      if (L.Map && L.Map.prototype && !(L.Map.prototype as any)._testRendererPatched) {
        L.Map.prototype.getRenderer = function(layer: any) {
          return {
            _container: document.createElement('div'),
            _layers: new Map(),
            hasLayer: () => false,
            addLayer: () => {},
            removeLayer: () => {},
            _removePath: () => {},
            _addPath: () => {},
            _updatePath: () => {},
            _initPath: () => {},
            options: { tolerance: 0 }
          };
        };
        (L.Map.prototype as any)._testRendererPatched = true;
      }
      
      return true;
    }
    return false;
  };
  
  // Try immediately and with delays
  if (!checkAndPatch()) {
    setTimeout(checkAndPatch, 0);
    setTimeout(checkAndPatch, 10);
    setTimeout(checkAndPatch, 50);
  }
};

// Start patching process
patchLeafletUtil();
