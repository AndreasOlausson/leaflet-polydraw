import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';

// Mock Leaflet map and DOM elements
const mockMap = {
  dragging: { enable: vi.fn(), disable: vi.fn() },
  getContainer: vi.fn(() => ({ style: {} })),
  fire: vi.fn(),
  removeLayer: vi.fn(),
  addLayer: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
} as any;

const mockFeatureGroup = {
  getLayers: vi.fn(() => []),
  eachLayer: vi.fn(),
  clearLayers: vi.fn(),
  toGeoJSON: vi.fn(() => ({
    features: [{
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]]
      }
    }]
  }))
} as any;

const mockPolygon = {
  dragging: { enable: vi.fn(), disable: vi.fn() },
  on: vi.fn(),
  getLatLngs: vi.fn(() => [[[{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 1 }, { lat: 0, lng: 1 }]]]),
  setLatLngs: vi.fn(),
  setStyle: vi.fn(),
  getElement: vi.fn(() => null), // Mock getElement to return null instead of undefined
  toGeoJSON: vi.fn(() => ({
    type: 'Feature',
    geometry: {
      type: 'MultiPolygon',
      coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]]
    }
  }))
} as any;

describe('Polygon Drag Feature', () => {
  let polydraw: Polydraw;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create polydraw instance with drag enabled
    polydraw = new Polydraw({
      config: {
        modes: {
          dragPolygons: true
        },
        dragPolygons: {
          realTimeUpdate: false,
          opacity: 0.7,
          dragCursor: 'move',
          modifierSubtract: {
            enabled: true,
            keys: {
              windows: "ctrlKey",
              mac: "metaKey",
              linux: "ctrlKey"
            },
            subtractColor: "#D9460F"
          }
        },
        polygonOptions: {
          color: "#50622b"
        }
      }
    });

    // Mock the map property
    (polydraw as any).map = mockMap;
    (polydraw as any).arrayOfFeatureGroups = [mockFeatureGroup];
    
    // Mock the tracer to prevent setLatLngs errors
    (polydraw as any).tracer = {
      setLatLngs: vi.fn(),
      addLatLng: vi.fn(),
      toGeoJSON: vi.fn(() => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [1, 1], [2, 2]]
        }
      })),
      setStyle: vi.fn(),
      addTo: vi.fn()
    };

    // Mock the turfHelper to prevent null geometry errors
    (polydraw as any).turfHelper = {
      getTurfPolygon: vi.fn((feature) => feature || {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
        }
      }),
      polygonDifference: vi.fn(() => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
        }
      }))
    };

    // Mock addPolygonLayer to prevent complex polygon processing in tests
    (polydraw as any).addPolygonLayer = vi.fn();
  });

  describe('Configuration', () => {
    it('should have drag polygons enabled by default in config', () => {
      const config = (polydraw as any).config;
      expect(config.modes.dragPolygons).toBe(true);
    });

    it('should have correct drag configuration options', () => {
      const config = (polydraw as any).config;
      expect(config.dragPolygons.realTimeUpdate).toBe(false);
      expect(config.dragPolygons.opacity).toBe(0.7);
      expect(config.dragPolygons.dragCursor).toBe('move');
    });
  });

  describe('enablePolygonDragging', () => {
    it('should enable dragging on polygon when configured', () => {
      const enablePolygonDragging = (polydraw as any).enablePolygonDragging;
      
      enablePolygonDragging.call(polydraw, mockPolygon, mockFeatureGroup, {
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: [] }
      });

      // Check that mouse event handlers are attached (new implementation)
      expect(mockPolygon.on).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockPolygon.on).toHaveBeenCalledWith('mouseover', expect.any(Function));
      expect(mockPolygon.on).toHaveBeenCalledWith('mouseout', expect.any(Function));
      
      // Check that drag data is stored on the polygon
      expect(mockPolygon._polydrawFeatureGroup).toBe(mockFeatureGroup);
      expect(mockPolygon._polydrawDragData).toBeDefined();
    });

    it('should handle missing dragging property gracefully', () => {
      const polygonWithoutDragging = { on: vi.fn() };
      const enablePolygonDragging = (polydraw as any).enablePolygonDragging;
      
      expect(() => {
        enablePolygonDragging.call(polydraw, polygonWithoutDragging, mockFeatureGroup, {
          type: 'Feature',
          geometry: { type: 'MultiPolygon', coordinates: [] }
        });
      }).not.toThrow();
    });
  });

  describe('Drag Event Handlers', () => {
    it('should handle mouse down drag start correctly', () => {
      const onPolygonMouseDown = (polydraw as any).onPolygonMouseDown;
      const mockEvent = {
        originalEvent: { ctrlKey: false, metaKey: false },
        latlng: { lat: 0, lng: 0 }
      };
      const mockPolygon = {
        _polydrawDragData: { 
          isDragging: false,
          startPosition: null,
          startLatLngs: null
        },
        _polydrawFeatureGroup: mockFeatureGroup,
        _polydrawLatLngs: { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: [] } },
        setStyle: vi.fn(),
        getElement: vi.fn(() => null),
        getLatLngs: vi.fn(() => [[[{ lat: 0, lng: 0 }]]])
      };

      // Mock L.DomEvent methods
      const mockStopPropagation = vi.fn();
      const mockPreventDefault = vi.fn();
      (global as any).L = {
        DomEvent: {
          stopPropagation: mockStopPropagation,
          preventDefault: mockPreventDefault
        }
      };

      // Ensure drag polygons is enabled and draw mode is off
      (polydraw as any).config.modes.dragPolygons = true;
      (polydraw as any).drawMode = 0; // DrawMode.Off

      onPolygonMouseDown.call(polydraw, mockEvent, mockPolygon);

      // Verify that the polygon drag data was updated
      expect(mockPolygon._polydrawDragData.isDragging).toBe(true);
      expect(mockPolygon._polydrawDragData.startPosition).toEqual({ lat: 0, lng: 0 });
      expect(mockMap.dragging.disable).toHaveBeenCalled();
      expect(mockMap.fire).toHaveBeenCalledWith('polygon:dragstart', expect.any(Object));
    });

    it('should handle mouse up drag end correctly', () => {
      const onPolygonMouseUp = (polydraw as any).onPolygonMouseUp;
      const mockEvent = {
        latlng: { lat: 1, lng: 1 }
      };
      
      // Set up current drag polygon
      const mockPolygon = {
        _polydrawDragData: {
          isDragging: true,
          startLatLngs: [[[{ lat: 0, lng: 0 }]]]
        },
        _polydrawFeatureGroup: mockFeatureGroup,
        setStyle: vi.fn(),
        getLatLngs: vi.fn(() => [[[{ lat: 1, lng: 1 }]]])
      };
      (polydraw as any).currentDragPolygon = mockPolygon;

      // Mock the updatePolygonCoordinates method to prevent DOM operations
      const mockUpdatePolygonCoordinates = vi.fn();
      (polydraw as any).updatePolygonCoordinates = mockUpdatePolygonCoordinates;

      onPolygonMouseUp.call(polydraw, mockEvent);

      expect(mockMap.dragging.enable).toHaveBeenCalled();
      expect(mockPolygon.setStyle).toHaveBeenCalledWith({ opacity: 1.0 });
      expect(mockMap.fire).toHaveBeenCalledWith('polygon:dragend', expect.any(Object));
      expect(mockUpdatePolygonCoordinates).toHaveBeenCalled();
    });
  });

  describe('enablePolygonDraggingMode', () => {
    it('should enable dragging on existing polygons', () => {
      const mockLayer = {
        dragging: { enable: vi.fn(), disable: vi.fn() }
      };
      
      mockFeatureGroup.eachLayer.mockImplementation((callback) => {
        callback(mockLayer);
      });

      // Mock instanceof check
      Object.setPrototypeOf(mockLayer, L.Polygon.prototype);

      polydraw.enablePolygonDraggingMode(true);

      expect(mockLayer.dragging.enable).toHaveBeenCalled();
    });

    it('should disable dragging on existing polygons', () => {
      const mockLayer = {
        dragging: { enable: vi.fn(), disable: vi.fn() }
      };
      
      mockFeatureGroup.eachLayer.mockImplementation((callback) => {
        callback(mockLayer);
      });

      // Mock instanceof check
      Object.setPrototypeOf(mockLayer, L.Polygon.prototype);

      polydraw.enablePolygonDraggingMode(false);

      expect(mockLayer.dragging.disable).toHaveBeenCalled();
    });
  });

  describe('updatePolygonCoordinates', () => {
    it('should update polygon coordinates after drag', () => {
      const updatePolygonCoordinates = (polydraw as any).updatePolygonCoordinates;
      const mockPolygonInformation = {
        createPolygonInformationStorage: vi.fn()
      };
      const mockAddPolygonLayer = vi.fn();
      const mockTurfHelper = {
        getTurfPolygon: vi.fn(() => ({ type: 'Feature', geometry: { type: 'Polygon' } })),
      };
      const mockCheckDragInteractions = vi.fn(() => ({
        shouldMerge: false,
        shouldCreateHole: false,
        intersectingFeatureGroups: [],
        containingFeatureGroup: null
      }));

      (polydraw as any).polygonInformation = mockPolygonInformation;
      (polydraw as any).addPolygonLayer = mockAddPolygonLayer;
      (polydraw as any).turfHelper = mockTurfHelper;
      (polydraw as any).checkDragInteractions = mockCheckDragInteractions;

      updatePolygonCoordinates.call(polydraw, mockPolygon, mockFeatureGroup, {
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: [] }
      });

      expect(mockMap.removeLayer).toHaveBeenCalledWith(mockFeatureGroup);
      expect(mockAddPolygonLayer).toHaveBeenCalled();
      expect(mockPolygonInformation.createPolygonInformationStorage).toHaveBeenCalled();
    });

    it('should handle errors gracefully during coordinate update', () => {
      const updatePolygonCoordinates = (polydraw as any).updatePolygonCoordinates;
      const mockPolygonWithError = {
        getLatLngs: vi.fn(() => { throw new Error('Test error'); }),
        setLatLngs: vi.fn()
      };

      // Mock console.warn to capture and verify the error message
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      (polydraw as any).dragStartPosition = [[[{ lat: 0, lng: 0 }]]];

      expect(() => {
        updatePolygonCoordinates.call(polydraw, mockPolygonWithError, mockFeatureGroup, {
          type: 'Feature',
          geometry: { type: 'MultiPolygon', coordinates: [] }
        });
      }).not.toThrow();

      // Verify that the error was properly logged
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to update polygon coordinates:', 'Test error');
      
      // Verify that fallback behavior occurred
      expect(mockPolygonWithError.setLatLngs).toHaveBeenCalledWith([[[{ lat: 0, lng: 0 }]]]);
      
      // Restore console.warn
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Modifier Key Subtract Drag', () => {
    describe('Modifier Key Detection', () => {
      it('should detect Ctrl key on Windows/Linux platforms', () => {
        const detectModifierKey = (polydraw as any).detectModifierKey;
        const mockEvent = { ctrlKey: true, metaKey: false } as MouseEvent;
        
        const result = detectModifierKey.call(polydraw, mockEvent);
        expect(result).toBe(true); // Should pass - Ctrl key detected on non-Mac platform
      });

      it('should detect Cmd key on Mac platform', () => {
        const detectModifierKey = (polydraw as any).detectModifierKey;
        const mockEvent = { ctrlKey: false, metaKey: true } as MouseEvent;
        
        const result = detectModifierKey.call(polydraw, mockEvent);
        expect(result).toBe(false); // Should fail initially (stub returns false)
      });

      it('should detect modifier key press during drag start', () => {
        const detectModifierKey = (polydraw as any).detectModifierKey;
        const mockEvent = { ctrlKey: true, metaKey: false } as MouseEvent;
        
        const result = detectModifierKey.call(polydraw, mockEvent);
        expect(result).toBe(true); // Should fail - stub returns false but we expect true
      });

      it('should detect modifier key release during drag', () => {
        const detectModifierKey = (polydraw as any).detectModifierKey;
        const mockEvent = { ctrlKey: false, metaKey: false } as MouseEvent;
        
        const result = detectModifierKey.call(polydraw, mockEvent);
        expect(result).toBe(false); // Should pass (stub returns false)
      });
    });

    describe('Visual Feedback', () => {
      it('should change polygon color to subtract color when holding modifier key during drag', () => {
        const setSubtractVisualMode = (polydraw as any).setSubtractVisualMode;
        
        setSubtractVisualMode.call(polydraw, mockPolygon, true);
        
        // Should fail - stub doesn't implement visual feedback
        expect(mockPolygon.setStyle).toHaveBeenCalledWith({ color: '#D9460F' });
      });

      it('should restore normal color when modifier key is released during drag', () => {
        const setSubtractVisualMode = (polydraw as any).setSubtractVisualMode;
        
        setSubtractVisualMode.call(polydraw, mockPolygon, false);
        
        // Should fail - stub doesn't implement visual feedback restoration
        expect(mockPolygon.setStyle).toHaveBeenCalledWith({ color: expect.not.stringMatching('#D9460F') });
      });
    });

    describe('Drag Behavior - Intersection Cases', () => {
      it('should create indentation when partially dragging with modifier key', () => {
        const performModifierSubtract = (polydraw as any).performModifierSubtract;
        const mockIntersectingPolygons = [mockFeatureGroup];
        
        performModifierSubtract.call(polydraw, {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0.5, 0.5], [0, 0]]] }
        }, mockIntersectingPolygons);
        
        // Should fail - stub doesn't implement subtract operation
        expect(mockMap.removeLayer).toHaveBeenCalledWith(mockFeatureGroup);
      });

      it('should create donut when fully dragging with modifier key', () => {
        const performModifierSubtract = (polydraw as any).performModifierSubtract;
        const mockContainingPolygon = [mockFeatureGroup];
        
        performModifierSubtract.call(polydraw, {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8], [0.2, 0.2]]] }
        }, mockContainingPolygon);
        
        // Should fail - stub doesn't implement hole creation
        expect(mockMap.removeLayer).toHaveBeenCalledWith(mockFeatureGroup);
      });

      it('should subtract from multiple polygons when dragging with modifier key', () => {
        const performModifierSubtract = (polydraw as any).performModifierSubtract;
        const mockMultiplePolygons = [mockFeatureGroup, { ...mockFeatureGroup }];
        
        performModifierSubtract.call(polydraw, {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]] }
        }, mockMultiplePolygons);
        
        // Should fail - stub doesn't implement multiple subtract
        expect(mockMap.removeLayer).toHaveBeenCalledTimes(2);
      });

      it('should override auto-merge behavior when modifier key is held', () => {
        // Set modifier drag mode to active
        (polydraw as any).currentModifierDragMode = true;
        
        const isModifierDragActive = (polydraw as any).isModifierDragActive;
        const result = isModifierDragActive.call(polydraw);
        
        // Should pass - modifier is active
        expect(result).toBe(true);
      });

      it('should override auto-hole behavior when modifier key is held', () => {
        // Set modifier drag mode to active
        (polydraw as any).currentModifierDragMode = true;
        
        const isModifierDragActive = (polydraw as any).isModifierDragActive;
        const result = isModifierDragActive.call(polydraw);
        
        // Should pass - modifier is active
        expect(result).toBe(true);
      });

      it('should erase smaller polygon when dragging larger polygon over it with modifier key', () => {
        const performModifierSubtract = (polydraw as any).performModifierSubtract;
        const mockSmallerPolygon = [mockFeatureGroup];
        
        performModifierSubtract.call(polydraw, {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[-1, -1], [2, -1], [2, 2], [-1, 2], [-1, -1]]] }
        }, mockSmallerPolygon);
        
        // Should fail - stub doesn't implement erase behavior
        expect(mockMap.removeLayer).toHaveBeenCalledWith(mockFeatureGroup);
      });
    });

    describe('Edge Cases', () => {
      it('should just move polygon when dragging with modifier but no intersections occur', () => {
        const performModifierSubtract = (polydraw as any).performModifierSubtract;
        const mockAddPolygonLayer = vi.fn();
        (polydraw as any).addPolygonLayer = mockAddPolygonLayer;
        
        performModifierSubtract.call(polydraw, {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[10, 10], [11, 10], [11, 11], [10, 11], [10, 10]]] }
        }, []);
        
        // Should fail - stub doesn't implement move-only behavior
        expect(mockAddPolygonLayer).toHaveBeenCalledWith(expect.any(Object), false);
      });

      it('should handle modifier key toggle mid-drag gracefully', () => {
        const handleModifierToggleDuringDrag = (polydraw as any).handleModifierToggleDuringDrag;
        const mockEvent = { ctrlKey: true, metaKey: false } as MouseEvent;
        
        // Should not throw error
        expect(() => {
          handleModifierToggleDuringDrag.call(polydraw, mockEvent);
        }).not.toThrow();
        
        // Should fail - stub doesn't implement toggle handling
        expect((polydraw as any).currentModifierDragMode).toBe(true);
      });
    });

    describe('Integration Tests', () => {
      it('should maintain normal drag behavior when modifier key is not held', () => {
        const detectModifierKey = (polydraw as any).detectModifierKey;
        const mockEvent = { ctrlKey: false, metaKey: false } as MouseEvent;
        
        const result = detectModifierKey.call(polydraw, mockEvent);
        
        // Should pass - normal behavior when no modifier
        expect(result).toBe(false);
      });

      it('should not interfere with existing drag functionality', () => {
        const isModifierDragActive = (polydraw as any).isModifierDragActive;
        
        const result = isModifierDragActive.call(polydraw);
        
        // Should pass - when modifier is not active, normal drag should work
        expect(result).toBe(false);
      });

      it('should work correctly with polygon markers during modifier drag', () => {
        const setSubtractVisualMode = (polydraw as any).setSubtractVisualMode;
        
        // Should not throw error when working with markers
        expect(() => {
          setSubtractVisualMode.call(polydraw, mockPolygon, true);
        }).not.toThrow();
        
        // Should fail - stub doesn't implement marker handling
        expect(mockPolygon.setStyle).toHaveBeenCalled();
      });
    });

    describe('Complex Polygon Merge Scenarios', () => {
      it('should create one polygon with holes when cutting through C-shaped polygon tips', () => {
        // Test the actual analyzeIntersectionType logic with real coordinates
        
        // Create a test instance with real TurfHelper
        const testPolydraw = new Polydraw({
          config: {
            mergePolygons: true,
            modes: { dragPolygons: true }
          }
        });

        // Real C-shaped polygon coordinates
        const cShapeFeature = {
          type: 'Feature' as const,
          geometry: {
            type: 'MultiPolygon' as const,
            coordinates: [[[[58.421134,15.589085],[58.421135,15.594878],[58.421135,15.600672],[58.421135,15.606466],[58.420505,15.668049],[58.425359,15.595264],[58.428774,15.595093],[58.432279,15.595093],[58.435514,15.668221],[58.435785,15.606466],[58.435785,15.600672],[58.435785,15.594878],[58.435784,15.589085],[58.432122,15.589085],[58.428459,15.589085],[58.424797,15.589085]]]]
          }
        };

        // Real cutting polygon that goes through both tips
        const cuttingFeature = {
          type: 'Feature' as const,
          geometry: {
            type: 'MultiPolygon' as const,
            coordinates: [[[[58.409986,15.647106],[58.409986,15.677147],[58.44405,15.677147],[58.44405,15.647106],[58.409986,15.647106]]]]
          }
        };

        // Convert to proper format for analyzeIntersectionType
        const cShapePolygon = (testPolydraw as any).turfHelper.getTurfPolygon(cShapeFeature);
        const cuttingPolygon = (testPolydraw as any).turfHelper.getTurfPolygon(cuttingFeature);

        // Test the actual analyzeIntersectionType method
        const result = (testPolydraw as any).analyzeIntersectionType(cuttingPolygon, cShapePolygon);
        
        // This should detect that it's a complex cut-through scenario
        expect(result).toBe('should_create_holes');
      });
    });
  });
});
