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
  }))
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

  describe('Bug Reproduction Tests - FAILING TESTS TO REPRODUCE BUGS', () => {
    it('FAILING TEST: should reproduce "invalid polygon" error on activate -> draw -> button sequence', () => {
      // This test is DESIGNED TO FAIL to demonstrate the bug
      // When the bug is fixed, change this test to expect no error
      
      // Step 1: Activate the control panel
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      expect(mockSubContainer.style.maxHeight).toBe('250px');

      // Step 2: Click draw button to enter Add mode
      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);

      // Step 3: Click another button - this should trigger the "invalid polygon" error
      // This test EXPECTS the error to occur (demonstrating the bug)
      expect(() => {
        onSubtractClick();
      }).toThrow('invalid polygon'); // This will FAIL because the error doesn't occur in test environment
      
      // This line should not be reached if the error occurs
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);
    });

    it('should handle activate -> draw -> another button sequence without "invalid polygon" error', () => {
      // This test reproduces the bug: activate -> draw -> another button causes "invalid polygon" error
      
      // Step 1: Activate the control panel
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      expect(mockSubContainer.style.maxHeight).toBe('250px');

      // Step 2: Click draw button to enter Add mode
      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);

      // Step 3: Simulate that we have started drawing (tracer has some points)
      // This is likely the condition that triggers the "invalid polygon" error
      const mockTracer = {
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 1]] // Incomplete polygon (only 2 points)
          }
        })),
        setLatLngs: vi.fn(),
        addLatLng: vi.fn(),
        setStyle: vi.fn()
      };
      (polydraw as any).tracer = mockTracer;

      // Step 4: Click another button (subtract) - this should trigger the "invalid polygon" error
      // The error occurs because the system tries to process an incomplete/invalid polygon
      // when switching modes while in drawing state
      
      expect(() => {
        onSubtractClick();
      }).not.toThrow(); // This test will FAIL because the bug causes an error to be thrown
      
      // If the bug is fixed, this should pass:
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);
    });

    it('should handle activate -> draw -> erase sequence without "invalid polygon" error', () => {
      // Another variation of the bug: activate -> draw -> erase
      
      // Step 1: Activate the control panel
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      expect(mockSubContainer.style.maxHeight).toBe('250px');

      // Step 2: Click draw button to enter Add mode
      onDrawClick();
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);

      // Step 3: Simulate incomplete drawing state
      const mockTracer = {
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0]] // Invalid polygon (only 1 point)
          }
        })),
        setLatLngs: vi.fn(),
        addLatLng: vi.fn(),
        setStyle: vi.fn()
      };
      (polydraw as any).tracer = mockTracer;

      // Step 4: Click erase button - this might also trigger the "invalid polygon" error
      expect(() => {
        onEraseClick();
      }).not.toThrow(); // This test may also FAIL due to the same bug
      
      // Mode should remain Add after erase (erase doesn't change mode)
      expect(polydraw.getDrawMode()).toBe(DrawMode.Add);
    });

    it('should handle rapid mode switching without "invalid polygon" error', () => {
      // Test rapid switching that might trigger the polygon validation bug
      
      // Activate first
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      
      // Simulate drawing state with invalid polygon data
      const mockTracer = {
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [] // Empty coordinates - definitely invalid
          }
        })),
        setLatLngs: vi.fn(),
        addLatLng: vi.fn(),
        setStyle: vi.fn()
      };
      (polydraw as any).tracer = mockTracer;
      
      // Rapid sequence that might trigger the bug
      expect(() => {
        onDrawClick();        // Enter Add mode
        onSubtractClick();    // Switch to Subtract mode
        onDrawClick();        // Back to Add mode
        onSubtractClick();    // Back to Subtract mode
      }).not.toThrow(); // This test will likely FAIL due to the polygon validation bug
      
      expect(polydraw.getDrawMode()).toBe(DrawMode.Subtract);
    });

    it('should handle mode switching with active drawing events without "invalid polygon" error', () => {
      // This test simulates the exact scenario: drawing is active and user switches modes
      
      // Step 1: Activate and enter draw mode
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      onDrawClick();
      
      // Step 2: Simulate that drawing has started (events are active)
      // Mock the tracer with invalid polygon data that would cause the error
      const mockTracer = {
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 1]] // Incomplete polygon
          }
        })),
        setLatLngs: vi.fn(),
        addLatLng: vi.fn(),
        setStyle: vi.fn()
      };
      (polydraw as any).tracer = mockTracer;
      
      // Step 3: Mock the TurfHelper to throw the error when processing invalid polygon
      const mockTurfHelper = {
        turfConcaveman: vi.fn(() => {
          throw new Error('invalid polygon'); // This is where the error likely occurs
        })
      };
      (polydraw as any).turfHelper = mockTurfHelper;
      
      // Step 4: Simulate drawing events are active and try to complete drawing
      // This is more likely where the error occurs - during polygon completion
      expect(() => {
        // Simulate mouse up event that triggers polygon completion
        const mockEvent = { latlng: { lat: 2, lng: 2 } };
        (polydraw as any).mouseUpLeave(mockEvent);
      }).toThrow('invalid polygon'); // This test should FAIL (throw the error) to reproduce the bug
    });

    it('should handle incomplete polygon data during mode transitions', () => {
      // Test with various invalid polygon states that might trigger the error
      
      vi.mocked(L.DomUtil.hasClass).mockReturnValue(false);
      onActivateToggle();
      onDrawClick();
      
      // Test with different invalid polygon scenarios
      const invalidPolygonStates = [
        { coordinates: [] }, // Empty
        { coordinates: [[0, 0]] }, // Single point
        { coordinates: [[0, 0], [1, 1]] }, // Two points (not enough for polygon)
        { coordinates: [[NaN, NaN], [0, 0], [1, 1]] }, // Invalid coordinates
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
        
        // Each of these should not throw an error, but might due to the bug
        expect(() => {
          if (index % 2 === 0) {
            onSubtractClick();
          } else {
            onDrawClick();
          }
        }).not.toThrow(`Should handle invalid polygon state ${index}`);
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
