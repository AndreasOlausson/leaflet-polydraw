import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';
import { DrawMode } from '../src/enums';

// Mock Leaflet
vi.mock('leaflet', () => ({
  DomUtil: {
    create: vi.fn(),
    hasClass: vi.fn(),
    addClass: vi.fn(),
    removeClass: vi.fn()
  },
  DomEvent: {
    on: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    stopPropagation: vi.fn(),
    preventDefault: vi.fn()
  },
  Control: class MockControl {
    constructor(options?: any) {}
  },
  control: {},
  polyline: vi.fn(() => ({
    addTo: vi.fn(),
    setStyle: vi.fn(),
    setLatLngs: vi.fn(),
    addLatLng: vi.fn(),
    toGeoJSON: vi.fn()
  })),
  FeatureGroup: class MockFeatureGroup {
    constructor() {}
    addLayer = vi.fn()
    clearLayers = vi.fn()
    getLayers = vi.fn(() => [])
    toGeoJSON = vi.fn()
    eachLayer = vi.fn()
  }
}));

// Mock the buttons module
vi.mock('../src/buttons', () => ({
  createButtons: vi.fn()
}));

describe('Button Interactions', () => {
  let polydraw: Polydraw;
  let mockMap: any;
  let mockContainer: any;
  let mockSubContainer: any;
  let mockActivateButton: any;
  let mockDrawButton: any;
  let mockSubtractButton: any;
  let mockEraseButton: any;
  let onActivateToggle: () => void;
  let onDrawClick: () => void;
  let onSubtractClick: () => void;
  let onEraseClick: () => void;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock DOM elements
    mockActivateButton = {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn(),
        contains: vi.fn()
      }
    };

    mockDrawButton = {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn(),
        contains: vi.fn()
      }
    };

    mockSubtractButton = {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn(),
        contains: vi.fn()
      }
    };

    mockEraseButton = {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn(),
        contains: vi.fn()
      }
    };

    mockContainer = {
      style: {},
      querySelector: vi.fn((selector: string) => {
        switch (selector) {
          case '.icon-activate': return mockActivateButton;
          case '.icon-draw': return mockDrawButton;
          case '.icon-subtract': return mockSubtractButton;
          case '.icon-erase': return mockEraseButton;
          default: return null;
        }
      }),
      appendChild: vi.fn()
    };

    mockSubContainer = {
      style: { maxHeight: '0px' },
      appendChild: vi.fn()
    };

    mockMap = {
      getContainer: vi.fn(() => ({
        style: {},
        classList: { add: vi.fn(), remove: vi.fn() },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })),
      dragging: { enable: vi.fn(), disable: vi.fn() },
      doubleClickZoom: { enable: vi.fn(), disable: vi.fn() },
      scrollWheelZoom: { enable: vi.fn(), disable: vi.fn() },
      on: vi.fn(),
      off: vi.fn(),
      fire: vi.fn(),
      removeLayer: vi.fn()
    };

    // Mock DomUtil.create to return our mock elements
    vi.mocked(L.DomUtil.create).mockImplementation((tag: string, className?: string) => {
      if (className === 'leaflet-control leaflet-bar') {
        return mockContainer;
      }
      if (className === 'sub-buttons') {
        return mockSubContainer;
      }
      return {
        tagName: tag.toUpperCase(),
        className: className || '',
        style: {},
        appendChild: vi.fn()
      };
    });

    // Create polydraw instance
    polydraw = new Polydraw();

    // Simulate onAdd to capture button callbacks
    const container = (polydraw as any).onAdd(mockMap);

    // Extract the callback functions that were passed to createButtons
    const { createButtons } = await import('../src/buttons');
    const createButtonsCall = vi.mocked(createButtons).mock.calls[0];
    if (createButtonsCall) {
      onActivateToggle = createButtonsCall[2];
      onDrawClick = createButtonsCall[3];
      onSubtractClick = createButtonsCall[4];
      onEraseClick = createButtonsCall[5];
    }
  });

  describe('Initial State', () => {
    it('should start with all buttons inactive', () => {
      expect(polydraw.getDrawMode()).toBe(DrawMode.Off);
      expect(vi.mocked(L.DomUtil.hasClass)).not.toHaveBeenCalledWith(mockActivateButton, 'active');
    });

    it('should have sub-container initially hidden', () => {
      expect(mockSubContainer.style.maxHeight).toBe('0px');
    });
  });

  describe('Activate Button Behavior', () => {
    it('should open sub-menu when activate button is clicked (inactive -> active)', () => {
      // Mock hasClass to return false (button is inactive)
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);

      onActivateToggle();

      expect(vi.mocked(L.DomUtil.addClass)).toHaveBeenCalledWith(mockActivateButton, 'active');
      expect(mockSubContainer.style.maxHeight).toBe('250px');
    });

    it('should close sub-menu when activate button is clicked again (active -> inactive)', () => {
      // Mock hasClass to return true (button is active)
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(true);

      onActivateToggle();

      expect(vi.mocked(L.DomUtil.removeClass)).toHaveBeenCalledWith(mockActivateButton, 'active');
      expect(mockSubContainer.style.maxHeight).toBe('0px');
    });

    it('should toggle sub-menu visibility on multiple clicks', () => {
      // First click: inactive -> active
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      expect(mockSubContainer.style.maxHeight).toBe('250px');

      // Second click: active -> inactive
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(true);
      onActivateToggle();
      expect(mockSubContainer.style.maxHeight).toBe('0px');

      // Third click: inactive -> active again
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      expect(mockSubContainer.style.maxHeight).toBe('250px');
    });
  });

  describe('Draw Mode Button Behavior', () => {
    it('should enter Add mode when draw button is clicked', () => {
      onDrawClick();

      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);
    });

    it('should enter Subtract mode when subtract button is clicked', () => {
      onSubtractClick();

      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);
    });

    it('should switch from Add to Subtract mode', () => {
      // First click draw
      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);

      // Then click subtract
      onSubtractClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);
    });

    it('should switch from Subtract to Add mode', () => {
      // First click subtract
      onSubtractClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);

      // Then click draw
      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);
    });

    it('should stay in Add mode when draw button is clicked multiple times', () => {
      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);

      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);
    });

    it('should stay in Subtract mode when subtract button is clicked multiple times', () => {
      onSubtractClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);

      onSubtractClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);
    });
  });

  describe('Button Visual State Management', () => {
    it('should update draw button active state when entering Add mode', () => {
      onDrawClick();

      // The draw mode listener should be called and update button states
      // We need to trigger the listener manually since we mocked the DOM
      const drawModeListeners = (polydraw as any).drawModeListeners;
      drawModeListeners.forEach(listener => listener(DrawMode.Add));

      expect(mockDrawButton.classList.toggle).toHaveBeenCalledWith('active', true);
      expect(mockSubtractButton.classList.toggle).toHaveBeenCalledWith('active', false);
    });

    it('should update subtract button active state when entering Subtract mode', () => {
      onSubtractClick();

      // Trigger the draw mode listeners
      const drawModeListeners = (polydraw as any).drawModeListeners;
      drawModeListeners.forEach(listener => listener(DrawMode.Subtract));

      expect(mockDrawButton.classList.toggle).toHaveBeenCalledWith('active', false);
      expect(mockSubtractButton.classList.toggle).toHaveBeenCalledWith('active', true);
    });

    it('should clear all button active states when returning to Off mode', () => {
      // First enter a mode
      onDrawClick();
      const drawModeListeners = (polydraw as any).drawModeListeners;
      drawModeListeners.forEach(listener => listener(DrawMode.Add));

      // Clear mocks
      vi.clearAllMocks();

      // Then return to Off mode (this happens automatically after drawing)
      drawModeListeners.forEach(listener => listener(DrawMode.Off));

      expect(mockDrawButton.classList.toggle).toHaveBeenCalledWith('active', false);
      expect(mockSubtractButton.classList.toggle).toHaveBeenCalledWith('active', false);
    });
  });

  describe('Erase Button Behavior', () => {
    it('should clear all polygons when erase button is clicked', () => {
      // Mock some polygons
      const mockFeatureGroup = { clearLayers: vi.fn() };
      (polydraw as any).arrayOfFeatureGroups = [mockFeatureGroup];

      onEraseClick();

      expect(mockMap.removeLayer).toHaveBeenCalledWith(mockFeatureGroup);
      expect((polydraw as any).arrayOfFeatureGroups).toHaveLength(0);
    });

    it('should work in any draw mode', () => {
      // Test in Add mode
      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);
      
      onEraseClick();
      // Mode should remain the same
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);

      // Test in Subtract mode
      onSubtractClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);
      
      onEraseClick();
      // Mode should remain the same
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);
    });

    it('should not change current draw mode', () => {
      onDrawClick();
      const modeBefore = polydraw.getDrawMode();
      
      onEraseClick();
      
      expect(polydraw.getDrawMode()).toBe(modeBefore);
    });
  });

  describe('Complex Button Interaction Sequences', () => {
    it('should handle rapid button clicking', () => {
      // Rapid clicking sequence
      onDrawClick();
      onSubtractClick();
      onDrawClick();
      onSubtractClick();
      onDrawClick();

      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);
    });

    it('should handle activate -> draw -> subtract -> activate sequence', () => {
      // Open menu
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      expect(mockSubContainer.style.maxHeight).toBe('250px');

      // Enter draw mode
      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);

      // Switch to subtract mode
      onSubtractClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);

      // Close menu
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(true);
      onActivateToggle();
      expect(mockSubContainer.style.maxHeight).toBe('0px');
      // Mode should remain unchanged
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);
    });

    it('should handle erase in the middle of mode switching', () => {
      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);

      onEraseClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add); // Should remain in Add mode

      onSubtractClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);

      onEraseClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract); // Should remain in Subtract mode
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing DOM elements gracefully', () => {
      // Mock querySelector to return null
      mockContainer.querySelector.mockReturnValue(null);

      expect(() => {
        const drawModeListeners = (polydraw as any).drawModeListeners;
        drawModeListeners.forEach(listener => listener(DrawMode.Add));
      }).not.toThrow();
    });

    it('should handle multiple activate toggles in sequence', () => {
      // Multiple rapid toggles
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(true);
      onActivateToggle();
      
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(true);
      onActivateToggle();

      expect(mockSubContainer.style.maxHeight).toBe('0px');
    });

    it('should handle button clicks when polydraw is not properly initialized', () => {
      // Create a new instance without calling onAdd
      const uninitializedPolydraw = new Polydraw();

      // Should not throw errors
      expect(() => {
        uninitializedPolydraw.getDrawMode();
      }).not.toThrow();
    });
  });

  describe('Invalid Polygon Data Handling', () => {
    it('should handle invalid polygon data gracefully during mode switching', () => {
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      expect(mockSubContainer.style.maxHeight).toBe('250px');

      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);

      const mockTracer = {
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 1]]
          }
        })),
        setLatLngs: vi.fn(),
        addLatLng: vi.fn(),
        setStyle: vi.fn()
      };
      (polydraw as any).tracer = mockTracer;

      expect(() => {
        const mockEvent = { latlng: { lat: 2, lng: 2 } };
        (polydraw as any).mouseUpLeave(mockEvent);
      }).not.toThrow();
      
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);
    });

    it('should handle mode switching with incomplete drawing data', () => {
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      expect(mockSubContainer.style.maxHeight).toBe('250px');

      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);

      const mockTracer = {
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 1]]
          }
        })),
        setLatLngs: vi.fn(),
        addLatLng: vi.fn(),
        setStyle: vi.fn()
      };
      (polydraw as any).tracer = mockTracer;

      expect(() => {
        onSubtractClick();
      }).not.toThrow();
      
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);
    });

    it('should handle erase operations with incomplete drawing data', () => {
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      expect(mockSubContainer.style.maxHeight).toBe('250px');

      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);

      const mockTracer = {
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0]]
          }
        })),
        setLatLngs: vi.fn(),
        addLatLng: vi.fn(),
        setStyle: vi.fn()
      };
      (polydraw as any).tracer = mockTracer;

      expect(() => {
        onEraseClick();
      }).not.toThrow();
      
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);
    });

    it('should handle rapid mode switching', () => {
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      
      const mockTracer = {
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        })),
        setLatLngs: vi.fn(),
        addLatLng: vi.fn(),
        setStyle: vi.fn()
      };
      (polydraw as any).tracer = mockTracer;
      
      expect(() => {
        onDrawClick();
        onSubtractClick();
        onDrawClick();
        onSubtractClick();
      }).not.toThrow();
      
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);
    });

    it('should handle polygon completion with insufficient data', () => {
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      onDrawClick();
      
      const mockTracer = {
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 1]]
          }
        })),
        setLatLngs: vi.fn(),
        addLatLng: vi.fn(),
        setStyle: vi.fn()
      };
      (polydraw as any).tracer = mockTracer;
      
      expect(() => {
        const mockEvent = { latlng: { lat: 2, lng: 2 } };
        (polydraw as any).mouseUpLeave(mockEvent);
      }).not.toThrow();
    });

    it('should handle various invalid polygon states', () => {
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      onDrawClick();
      
      const invalidPolygonStates = [
        { coordinates: [] },
        { coordinates: [[0, 0]] },
        { coordinates: [[0, 0], [1, 1]] },
        { coordinates: [[NaN, NaN], [0, 0], [1, 1]] }
      ];
      
      invalidPolygonStates.forEach((invalidState, index) => {
        const mockTracer = {
          toGeoJSON: vi.fn(() => ({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: invalidState.coordinates
            }
          })),
          setLatLngs: vi.fn(),
          addLatLng: vi.fn(),
          setStyle: vi.fn()
        };
        (polydraw as any).tracer = mockTracer;
        
        expect(() => {
          if (index % 2 === 0) {
            onSubtractClick();
          } else {
            onDrawClick();
          }
        }).not.toThrow();
      });
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state between internal mode and button visual state', () => {
      // Enter Add mode
      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);

      // Trigger visual update
      const drawModeListeners = (polydraw as any).drawModeListeners;
      drawModeListeners.forEach(listener => listener(DrawMode.Add));

      // Check that visual state matches internal state
      expect(mockDrawButton.classList.toggle).toHaveBeenCalledWith('active', true);
      expect(mockSubtractButton.classList.toggle).toHaveBeenCalledWith('active', false);

      // Switch to Subtract mode
      onSubtractClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);

      // Trigger visual update
      drawModeListeners.forEach(listener => listener(DrawMode.Subtract));

      // Check that visual state matches internal state
      expect(mockDrawButton.classList.toggle).toHaveBeenCalledWith('active', false);
      expect(mockSubtractButton.classList.toggle).toHaveBeenCalledWith('active', true);
    });

    it('should properly reset to Off mode after polygon operations', () => {
      // Enter Add mode
      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);

      // Simulate polygon creation (which calls setDrawMode(DrawMode.Off))
      (polydraw as any).setDrawMode(DrawMode.Off);
      expect(polydraw.getDrawMode()).toBe(DrawMode.Off);

      // Trigger visual update
      const drawModeListeners = (polydraw as any).drawModeListeners;
      drawModeListeners.forEach(listener => listener(DrawMode.Off));

      // Check that all buttons are inactive
      expect(mockDrawButton.classList.toggle).toHaveBeenCalledWith('active', false);
      expect(mockSubtractButton.classList.toggle).toHaveBeenCalledWith('active', false);
    });
  });
});
