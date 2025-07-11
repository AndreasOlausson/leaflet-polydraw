import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import * as L from 'leaflet';
import Polydraw from '../src/polydraw';
import { IconFactory } from '../src/icon-factory';

// Mock DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="map"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window as any;
global.HTMLElement = dom.window.HTMLElement;
global.navigator = { userAgent: 'test' } as any;

// Mock Leaflet map
const createMockMap = () => {
  const mockMap = {
    getContainer: vi.fn(() => ({
      style: {},
      classList: { add: vi.fn(), remove: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    dragging: { enable: vi.fn(), disable: vi.fn() },
    doubleClickZoom: { enable: vi.fn(), disable: vi.fn() },
    scrollWheelZoom: { enable: vi.fn(), disable: vi.fn() },
    on: vi.fn(),
    off: vi.fn(),
    fire: vi.fn(),
    removeLayer: vi.fn(),
    addLayer: vi.fn(),
    containerPointToLatLng: vi.fn(),
  };
  return mockMap as any;
};

// Mock FeatureGroup for testing
const createMockFeatureGroup = () => {
  const layers: any[] = [];
  const mockFeatureGroup = {
    addLayer: vi.fn((layer) => {
      layers.push(layer);
      return mockFeatureGroup; // Return self for chaining
    }),
    getLayers: vi.fn(() => layers),
    clearLayers: vi.fn(() => (layers.length = 0)),
    eachLayer: vi.fn((callback) => layers.forEach(callback)),
    addTo: vi.fn(() => mockFeatureGroup),
  };
  return mockFeatureGroup as any;
};

// Mock Leaflet constructors
const createMockMarker = () => ({
  getLatLng: vi.fn(),
  setLatLng: vi.fn(),
  addTo: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  getElement: vi.fn(() => ({ style: {}, classList: { add: vi.fn(), remove: vi.fn() } })),
  bindPopup: vi.fn(),
  options: {},
});

const createMockPolyline = () => ({
  addTo: vi.fn(),
  setLatLngs: vi.fn(),
  getLatLngs: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
});

// Mock Leaflet namespace
vi.mock('leaflet', async () => {
  const actual = await vi.importActual('leaflet');
  return {
    ...actual,
    Marker: vi.fn().mockImplementation(() => createMockMarker()),
    polyline: vi.fn().mockImplementation(() => createMockPolyline()),
  };
});

describe('Marker Management and Styling', () => {
  let polydraw: Polydraw;
  let mockMap: L.Map;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '<div id="map"></div>';

    // Create mock map
    mockMap = createMockMap();

    // Create Polydraw instance
    polydraw = new Polydraw();

    // Mock the onAdd method to avoid full Leaflet initialization
    vi.spyOn(polydraw, 'onAdd').mockImplementation(() => {
      (polydraw as any).map = mockMap;
      const container = document.createElement('div');
      container.className = 'leaflet-control leaflet-bar';
      return container;
    });

    // Initialize the control
    polydraw.onAdd(mockMap);
  });

  describe('Ring Index Based Marker Type Detection', () => {
    it('should correctly identify outer ring (index 0) for normal markers', () => {
      const testStructures = [
        // Nested structure: [[[outer, inner]]]
        [
          [
            [
              { lat: 58.391747, lng: 15.613276 },
              { lat: 58.396747, lng: 15.617276 },
              { lat: 58.398747, lng: 15.609276 },
              { lat: 58.391747, lng: 15.613276 },
            ],
            [
              { lat: 58.393, lng: 15.615 },
              { lat: 58.395, lng: 15.616 },
              { lat: 58.394, lng: 15.614 },
              { lat: 58.393, lng: 15.615 },
            ],
          ],
        ],
        // Flattened structure: [outer, inner]
        [
          [
            { lat: 58.391747, lng: 15.613276 },
            { lat: 58.396747, lng: 15.617276 },
            { lat: 58.398747, lng: 15.609276 },
            { lat: 58.391747, lng: 15.613276 },
          ],
          [
            { lat: 58.393, lng: 15.615 },
            { lat: 58.395, lng: 15.616 },
            { lat: 58.394, lng: 15.614 },
            { lat: 58.393, lng: 15.615 },
          ],
        ],
      ];

      testStructures.forEach((markerLatlngs, structureIndex) => {
        const featureGroup = createMockFeatureGroup();
        const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker').mockImplementation(() => {});
        const addHoleMarkerSpy = vi
          .spyOn(polydraw as any, 'addHoleMarker')
          .mockImplementation(() => {});

        // Call the method under test
        (polydraw as any).addMarkersToFeatureGroup(markerLatlngs, featureGroup, 0);

        // For nested structure, it processes the nested rings
        if (structureIndex === 0) {
          // Nested structure: [[[outer, inner]]] - processes markerLatlngs[0][0] and markerLatlngs[0][1]
          expect(addMarkerSpy).toHaveBeenCalledWith(markerLatlngs[0][0], featureGroup, 0);
          expect(addHoleMarkerSpy).toHaveBeenCalledWith(markerLatlngs[0][1], featureGroup, 0);
        } else {
          // Flattened structure: [outer, inner] - processes markerLatlngs[0] and markerLatlngs[1]
          expect(addMarkerSpy).toHaveBeenCalledWith(markerLatlngs[0], featureGroup, 0);
          expect(addHoleMarkerSpy).toHaveBeenCalledWith(markerLatlngs[1], featureGroup, 0);
        }

        addMarkerSpy.mockRestore();
        addHoleMarkerSpy.mockRestore();
      });
    });

    it('should correctly identify hole rings (index > 0) for hole markers', () => {
      // Test with multiple hole rings
      const markerLatlngs = [
        // Outer ring (index 0)
        [
          { lat: 58.391747, lng: 15.613276 },
          { lat: 58.396747, lng: 15.617276 },
          { lat: 58.398747, lng: 15.609276 },
          { lat: 58.391747, lng: 15.613276 },
        ],
        // First hole (index 1)
        [
          { lat: 58.393, lng: 15.615 },
          { lat: 58.395, lng: 15.616 },
          { lat: 58.394, lng: 15.614 },
          { lat: 58.393, lng: 15.615 },
        ],
        // Second hole (index 2)
        [
          { lat: 58.392, lng: 15.614 },
          { lat: 58.394, lng: 15.615 },
          { lat: 58.393, lng: 15.613 },
          { lat: 58.392, lng: 15.614 },
        ],
      ];

      const featureGroup = createMockFeatureGroup();
      const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker').mockImplementation(() => {});
      const addHoleMarkerSpy = vi
        .spyOn(polydraw as any, 'addHoleMarker')
        .mockImplementation(() => {});

      // Call the method under test
      (polydraw as any).addMarkersToFeatureGroup(markerLatlngs, featureGroup, 0);

      // Ring 0 should use addMarker
      expect(addMarkerSpy).toHaveBeenCalledWith(markerLatlngs[0], featureGroup, 0);

      // Ring 1 and 2 should use addHoleMarker
      expect(addHoleMarkerSpy).toHaveBeenCalledWith(markerLatlngs[1], featureGroup, 0);
      expect(addHoleMarkerSpy).toHaveBeenCalledWith(markerLatlngs[2], featureGroup, 0);

      // Verify call counts
      expect(addMarkerSpy).toHaveBeenCalledTimes(1);
      expect(addHoleMarkerSpy).toHaveBeenCalledTimes(2);

      addMarkerSpy.mockRestore();
      addHoleMarkerSpy.mockRestore();
    });
  });

  describe('Structure Detection and Handling', () => {
    it('should detect flattened structure correctly', () => {
      const flattenedStructure = [
        // Ring 0 - direct LatLng array
        [
          { lat: 58.391747, lng: 15.613276 },
          { lat: 58.396747, lng: 15.617276 },
          { lat: 58.398747, lng: 15.609276 },
          { lat: 58.391747, lng: 15.613276 },
        ],
        // Ring 1 - direct LatLng array
        [
          { lat: 58.393, lng: 15.615 },
          { lat: 58.395, lng: 15.616 },
          { lat: 58.394, lng: 15.614 },
          { lat: 58.393, lng: 15.615 },
        ],
      ];

      const featureGroup = createMockFeatureGroup();
      const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker').mockImplementation(() => {});
      const addHoleMarkerSpy = vi
        .spyOn(polydraw as any, 'addHoleMarker')
        .mockImplementation(() => {});

      // Call the method under test
      (polydraw as any).addMarkersToFeatureGroup(flattenedStructure, featureGroup, 0);

      // Should use ringGroupIndex to determine marker type
      // Ring 0 (ringGroupIndex = 0) should use addMarker
      expect(addMarkerSpy).toHaveBeenCalledWith(flattenedStructure[0], featureGroup, 0);

      // Ring 1 (ringGroupIndex = 1) should use addHoleMarker
      expect(addHoleMarkerSpy).toHaveBeenCalledWith(flattenedStructure[1], featureGroup, 0);

      addMarkerSpy.mockRestore();
      addHoleMarkerSpy.mockRestore();
    });

    it('should handle flattened structure with multiple holes', () => {
      const flattenedWithMultipleHoles = [
        // Outer ring
        [
          { lat: 58.391747, lng: 15.613276 },
          { lat: 58.396747, lng: 15.617276 },
          { lat: 58.398747, lng: 15.609276 },
          { lat: 58.391747, lng: 15.613276 },
        ],
        // First hole
        [
          { lat: 58.393, lng: 15.615 },
          { lat: 58.395, lng: 15.616 },
          { lat: 58.394, lng: 15.614 },
          { lat: 58.393, lng: 15.615 },
        ],
        // Second hole
        [
          { lat: 58.392, lng: 15.614 },
          { lat: 58.394, lng: 15.615 },
          { lat: 58.393, lng: 15.613 },
          { lat: 58.392, lng: 15.614 },
        ],
      ];

      const featureGroup = createMockFeatureGroup();
      const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker').mockImplementation(() => {});
      const addHoleMarkerSpy = vi
        .spyOn(polydraw as any, 'addHoleMarker')
        .mockImplementation(() => {});

      // Call the method under test
      (polydraw as any).addMarkersToFeatureGroup(flattenedWithMultipleHoles, featureGroup, 0);

      // Ring 0 should use addMarker
      expect(addMarkerSpy).toHaveBeenCalledWith(flattenedWithMultipleHoles[0], featureGroup, 0);

      // Rings 1 and 2 should use addHoleMarker
      expect(addHoleMarkerSpy).toHaveBeenCalledWith(flattenedWithMultipleHoles[1], featureGroup, 0);
      expect(addHoleMarkerSpy).toHaveBeenCalledWith(flattenedWithMultipleHoles[2], featureGroup, 0);

      // Verify call counts
      expect(addMarkerSpy).toHaveBeenCalledTimes(1);
      expect(addHoleMarkerSpy).toHaveBeenCalledTimes(2);

      addMarkerSpy.mockRestore();
      addHoleMarkerSpy.mockRestore();
    });

    it('should detect nested structure correctly', () => {
      const nestedStructure = [
        [
          // Ring 0 - outer ring
          [
            { lat: 58.391747, lng: 15.613276 },
            { lat: 58.396747, lng: 15.617276 },
            { lat: 58.398747, lng: 15.609276 },
            { lat: 58.391747, lng: 15.613276 },
          ],
          // Ring 1 - hole ring
          [
            { lat: 58.393, lng: 15.615 },
            { lat: 58.395, lng: 15.616 },
            { lat: 58.394, lng: 15.614 },
            { lat: 58.393, lng: 15.615 },
          ],
        ],
      ];

      const featureGroup = createMockFeatureGroup();
      const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker').mockImplementation(() => {});
      const addHoleMarkerSpy = vi
        .spyOn(polydraw as any, 'addHoleMarker')
        .mockImplementation(() => {});

      // Call the method under test
      (polydraw as any).addMarkersToFeatureGroup(nestedStructure, featureGroup, 0);

      // Should use sub-ring index (i) to determine marker type
      // Ring 0 (i = 0) should use addMarker
      expect(addMarkerSpy).toHaveBeenCalledWith(nestedStructure[0][0], featureGroup, 0);

      // Ring 1 (i = 1) should use addHoleMarker
      expect(addHoleMarkerSpy).toHaveBeenCalledWith(nestedStructure[0][1], featureGroup, 0);

      addMarkerSpy.mockRestore();
      addHoleMarkerSpy.mockRestore();
    });
  });

  describe('Red Polyline Overlay for Holes', () => {
    it('should add red polyline overlay for hole rings in flattened structure', () => {
      const flattenedStructure = [
        // Outer ring
        [
          { lat: 58.391747, lng: 15.613276 },
          { lat: 58.396747, lng: 15.617276 },
          { lat: 58.398747, lng: 15.609276 },
          { lat: 58.391747, lng: 15.613276 },
        ],
        // Hole ring
        [
          { lat: 58.393, lng: 15.615 },
          { lat: 58.395, lng: 15.616 },
          { lat: 58.394, lng: 15.614 },
          { lat: 58.393, lng: 15.615 },
        ],
      ];

      const featureGroup = createMockFeatureGroup();
      const polylineSpy = vi.spyOn(L, 'polyline');

      // Call the method under test
      (polydraw as any).addMarkersToFeatureGroup(flattenedStructure, featureGroup, 0);

      // Should create polyline for hole ring (index 1)
      expect(polylineSpy).toHaveBeenCalledWith(
        flattenedStructure[1],
        expect.objectContaining({
          color: expect.any(String),
          weight: expect.any(Number),
          opacity: expect.any(Number),
        }),
      );

      // Should not create polyline for outer ring (index 0)
      expect(polylineSpy).toHaveBeenCalledTimes(1);

      polylineSpy.mockRestore();
    });

    it('should add red polyline overlay for hole rings in nested structure', () => {
      const nestedStructure = [
        [
          // Ring 0 - outer ring
          [
            { lat: 58.391747, lng: 15.613276 },
            { lat: 58.396747, lng: 15.617276 },
            { lat: 58.398747, lng: 15.609276 },
            { lat: 58.391747, lng: 15.613276 },
          ],
          // Ring 1 - hole ring
          [
            { lat: 58.393, lng: 15.615 },
            { lat: 58.395, lng: 15.616 },
            { lat: 58.394, lng: 15.614 },
            { lat: 58.393, lng: 15.615 },
          ],
        ],
      ];

      const featureGroup = createMockFeatureGroup();
      const polylineSpy = vi.spyOn(L, 'polyline');

      // Call the method under test
      (polydraw as any).addMarkersToFeatureGroup(nestedStructure, featureGroup, 0);

      // Should create polyline for hole ring (i = 1)
      expect(polylineSpy).toHaveBeenCalledWith(
        nestedStructure[0][1],
        expect.objectContaining({
          color: expect.any(String),
          weight: expect.any(Number),
          opacity: expect.any(Number),
        }),
      );

      // Should not create polyline for outer ring (i = 0)
      expect(polylineSpy).toHaveBeenCalledTimes(1);

      polylineSpy.mockRestore();
    });

    it('should use correct hole options for polyline styling', () => {
      const holeRing = [
        { lat: 58.393, lng: 15.615 },
        { lat: 58.395, lng: 15.616 },
        { lat: 58.394, lng: 15.614 },
        { lat: 58.393, lng: 15.615 },
      ];

      const flattenedStructure = [
        [{ lat: 58.391747, lng: 15.613276 }], // Outer ring
        holeRing, // Hole ring
      ];

      const featureGroup = createMockFeatureGroup();
      const polylineSpy = vi.spyOn(L, 'polyline');

      // Call the method under test
      (polydraw as any).addMarkersToFeatureGroup(flattenedStructure, featureGroup, 0);

      // Verify polyline is created with correct hole options
      expect(polylineSpy).toHaveBeenCalledWith(
        holeRing,
        expect.objectContaining({
          color: (polydraw as any).config.holeOptions.color,
          weight: (polydraw as any).config.holeOptions.weight || 2,
          opacity: (polydraw as any).config.holeOptions.opacity || 1,
        }),
      );

      polylineSpy.mockRestore();
    });
  });

  describe('Marker Configuration', () => {
    it('should verify hole markers have correct CSS classes', () => {
      const config = (polydraw as any).config;

      // Verify hole icon configuration
      expect(config.markers.holeIcon.styleClasses).toEqual(['polygon-marker', 'hole']);

      // Verify normal marker icon configuration
      expect(config.markers.markerIcon.styleClasses).toEqual(['polygon-marker']);
    });

    it('should have correct special marker configurations', () => {
      const config = (polydraw as any).config;

      // Check that special markers are enabled
      expect(config.markers.menuMarker).toBe(true);
      expect(config.markers.deleteMarker).toBe(true);
      expect(config.markers.infoMarker).toBe(true);

      // Check that special marker style classes are arrays
      expect(Array.isArray(config.markers.markerMenuIcon.styleClasses)).toBe(true);
      expect(Array.isArray(config.markers.markerDeleteIcon.styleClasses)).toBe(true);
      expect(Array.isArray(config.markers.markerInfoIcon.styleClasses)).toBe(true);
    });

    it('should have correct hole marker configuration', () => {
      const config = (polydraw as any).config;

      // Verify hole icon configuration
      expect(config.markers.holeIcon.styleClasses).toEqual(['polygon-marker', 'hole']);

      // Verify normal marker icon configuration
      expect(config.markers.markerIcon.styleClasses).toEqual(['polygon-marker']);

      // Verify hole options exist
      expect(config.holeOptions).toBeDefined();
      expect(config.holeOptions.color).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle single ring polygon (no holes)', () => {
      const singleRingStructure = [
        [
          { lat: 58.391747, lng: 15.613276 },
          { lat: 58.396747, lng: 15.617276 },
          { lat: 58.398747, lng: 15.609276 },
          { lat: 58.391747, lng: 15.613276 },
        ],
      ];

      const featureGroup = createMockFeatureGroup();
      const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker').mockImplementation(() => {});
      const addHoleMarkerSpy = vi
        .spyOn(polydraw as any, 'addHoleMarker')
        .mockImplementation(() => {});

      // Call the method under test
      (polydraw as any).addMarkersToFeatureGroup(singleRingStructure, featureGroup, 0);

      // Should only call addMarker for the single ring
      expect(addMarkerSpy).toHaveBeenCalledTimes(1);
      expect(addHoleMarkerSpy).not.toHaveBeenCalled();

      addMarkerSpy.mockRestore();
      addHoleMarkerSpy.mockRestore();
    });

    it('should handle empty rings gracefully', () => {
      const structureWithEmptyRing = [
        [
          { lat: 58.391747, lng: 15.613276 },
          { lat: 58.396747, lng: 15.617276 },
          { lat: 58.391747, lng: 15.613276 },
        ],
        [], // Empty hole ring
      ];

      const featureGroup = createMockFeatureGroup();
      const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker').mockImplementation(() => {});
      const addHoleMarkerSpy = vi
        .spyOn(polydraw as any, 'addHoleMarker')
        .mockImplementation(() => {});

      // Should not throw error and should handle gracefully
      expect(() => {
        (polydraw as any).addMarkersToFeatureGroup(structureWithEmptyRing, featureGroup, 0);
      }).not.toThrow();

      // Should only call addMarker for non-empty ring
      expect(addMarkerSpy).toHaveBeenCalledTimes(1);
      expect(addHoleMarkerSpy).not.toHaveBeenCalled();

      addMarkerSpy.mockRestore();
      addHoleMarkerSpy.mockRestore();
    });

    it('should handle invalid ring data gracefully', () => {
      const structureWithInvalidRing = [
        [
          { lat: 58.391747, lng: 15.613276 },
          { lat: 58.396747, lng: 15.617276 },
          { lat: 58.391747, lng: 15.613276 },
        ],
        null, // Invalid hole ring
      ];

      const featureGroup = createMockFeatureGroup();
      const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker').mockImplementation(() => {});
      const addHoleMarkerSpy = vi
        .spyOn(polydraw as any, 'addHoleMarker')
        .mockImplementation(() => {});

      // Should not throw error
      expect(() => {
        (polydraw as any).addMarkersToFeatureGroup(structureWithInvalidRing, featureGroup, 0);
      }).not.toThrow();

      addMarkerSpy.mockRestore();
      addHoleMarkerSpy.mockRestore();
    });
  });

  describe('Integration Tests: Complete Workflow', () => {
    it('should demonstrate the complete hole marker styling workflow', () => {
      // This test demonstrates the complete workflow that was fixed:
      // 1. Initial creation with correct marker types
      // 2. After reconstruction, still correct marker types

      const testCases = [
        {
          name: 'Initial nested structure',
          structure: [
            [
              // Outer ring
              [
                { lat: 58.391747, lng: 15.613276 },
                { lat: 58.396747, lng: 15.617276 },
                { lat: 58.398747, lng: 15.609276 },
                { lat: 58.391747, lng: 15.613276 },
              ],
              // Hole ring
              [
                { lat: 58.393, lng: 15.615 },
                { lat: 58.395, lng: 15.616 },
                { lat: 58.394, lng: 15.614 },
                { lat: 58.393, lng: 15.615 },
              ],
            ],
          ],
        },
        {
          name: 'After reconstruction (flattened structure)',
          structure: [
            // Outer ring
            [
              { lat: 58.391747, lng: 15.613276 },
              { lat: 58.396747, lng: 15.617276 },
              { lat: 58.398747, lng: 15.609276 },
              { lat: 58.391747, lng: 15.613276 },
            ],
            // Hole ring
            [
              { lat: 58.393, lng: 15.615 },
              { lat: 58.395, lng: 15.616 },
              { lat: 58.394, lng: 15.614 },
              { lat: 58.393, lng: 15.615 },
            ],
          ],
        },
      ];

      testCases.forEach(({ name, structure }) => {
        const featureGroup = createMockFeatureGroup();
        const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker').mockImplementation(() => {});
        const addHoleMarkerSpy = vi
          .spyOn(polydraw as any, 'addHoleMarker')
          .mockImplementation(() => {});
        const polylineSpy = vi.spyOn(L, 'polyline');

        // Call the method under test
        (polydraw as any).addMarkersToFeatureGroup(structure, featureGroup, 0);

        // Verify correct marker types are used
        expect(addMarkerSpy).toHaveBeenCalledTimes(1); // Outer ring
        expect(addHoleMarkerSpy).toHaveBeenCalledTimes(1); // Hole ring

        // Verify red polyline overlay is added for hole
        expect(polylineSpy).toHaveBeenCalledTimes(1);

        // Verify polyline uses hole styling
        expect(polylineSpy).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            color: expect.any(String),
            weight: expect.any(Number),
            opacity: expect.any(Number),
          }),
        );

        addMarkerSpy.mockRestore();
        addHoleMarkerSpy.mockRestore();
        polylineSpy.mockRestore();
      });
    });

    it('should verify the simple ring index approach works consistently', () => {
      // This test verifies that the simple approach (using ring index) works
      // consistently regardless of structure complexity

      const structures = [
        // Complex nested structure
        [
          [
            [
              { lat: 1, lng: 1 },
              { lat: 2, lng: 2 },
              { lat: 1, lng: 1 },
            ], // Ring 0
            [
              { lat: 1.1, lng: 1.1 },
              { lat: 1.2, lng: 1.2 },
              { lat: 1.1, lng: 1.1 },
            ], // Ring 1
            [
              { lat: 1.3, lng: 1.3 },
              { lat: 1.4, lng: 1.4 },
              { lat: 1.3, lng: 1.3 },
            ], // Ring 2
          ],
        ],
        // Simple flattened structure
        [
          [
            { lat: 1, lng: 1 },
            { lat: 2, lng: 2 },
            { lat: 1, lng: 1 },
          ], // Ring 0
          [
            { lat: 1.1, lng: 1.1 },
            { lat: 1.2, lng: 1.2 },
            { lat: 1.1, lng: 1.1 },
          ], // Ring 1
          [
            { lat: 1.3, lng: 1.3 },
            { lat: 1.4, lng: 1.4 },
            { lat: 1.3, lng: 1.3 },
          ], // Ring 2
        ],
      ];

      structures.forEach((structure, structureIndex) => {
        const featureGroup = createMockFeatureGroup();
        const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker').mockImplementation(() => {});
        const addHoleMarkerSpy = vi
          .spyOn(polydraw as any, 'addHoleMarker')
          .mockImplementation(() => {});

        // Call the method under test
        (polydraw as any).addMarkersToFeatureGroup(structure, featureGroup, 0);

        // Both structures should produce the same result:
        // 1 call to addMarker (ring 0)
        // 2 calls to addHoleMarker (rings 1 and 2)
        expect(addMarkerSpy).toHaveBeenCalledTimes(1);
        expect(addHoleMarkerSpy).toHaveBeenCalledTimes(2);

        addMarkerSpy.mockRestore();
        addHoleMarkerSpy.mockRestore();
      });
    });

    it('should demonstrate the explode-update-reconstruct workflow maintains correct marker styling', () => {
      // This test simulates the complete workflow:
      // 1. Draw polygon → Subtract hole → Drag marker → Reconstruct
      // The reconstructed polygon should maintain correct marker styling

      // Step 1: Initial polygon with hole (nested structure)
      const initialStructure = [
        [
          // Outer ring
          [
            { lat: 58.391747, lng: 15.613276 },
            { lat: 58.396747, lng: 15.617276 },
            { lat: 58.398747, lng: 15.609276 },
            { lat: 58.391747, lng: 15.613276 },
          ],
          // Hole ring
          [
            { lat: 58.393, lng: 15.615 },
            { lat: 58.395, lng: 15.616 },
            { lat: 58.394, lng: 15.614 },
            { lat: 58.393, lng: 15.615 },
          ],
        ],
      ];

      // Step 2: After drag and reconstruction (flattened structure)
      const reconstructedStructure = [
        // Outer ring (updated coordinates from drag)
        [
          { lat: 58.391747, lng: 15.613276 },
          { lat: 58.396747, lng: 15.617276 },
          { lat: 58.398747, lng: 15.609276 },
          { lat: 58.391747, lng: 15.613276 },
        ],
        // Hole ring (preserved coordinates)
        [
          { lat: 58.393, lng: 15.615 },
          { lat: 58.395, lng: 15.616 },
          { lat: 58.394, lng: 15.614 },
          { lat: 58.393, lng: 15.615 },
        ],
      ];

      // Test both structures produce the same marker styling
      [initialStructure, reconstructedStructure].forEach((structure, index) => {
        const featureGroup = createMockFeatureGroup();
        const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker').mockImplementation(() => {});
        const addHoleMarkerSpy = vi
          .spyOn(polydraw as any, 'addHoleMarker')
          .mockImplementation(() => {});

        // Call the method under test
        (polydraw as any).addMarkersToFeatureGroup(structure, featureGroup, 0);

        // Both should produce identical results:
        // Ring 0 → addMarker (green markers with special buttons)
        // Ring 1 → addHoleMarker (red markers without special buttons)
        expect(addMarkerSpy).toHaveBeenCalledTimes(1);
        expect(addHoleMarkerSpy).toHaveBeenCalledTimes(1);

        addMarkerSpy.mockRestore();
        addHoleMarkerSpy.mockRestore();
      });
    });
  });

  describe('Regression Tests', () => {
    it('should prevent the original bug where hole markers were created as normal markers', () => {
      // This test specifically prevents regression of the bug where
      // reconstructed polygons had all green markers instead of red hole markers

      const reconstructedFlattenedStructure = [
        // Ring 0 - should get GREEN markers
        [
          { lat: 58.391747, lng: 15.613276 },
          { lat: 58.396747, lng: 15.617276 },
          { lat: 58.398747, lng: 15.609276 },
          { lat: 58.391747, lng: 15.613276 },
        ],
        // Ring 1 - should get RED markers (this was the bug - it was getting green)
        [
          { lat: 58.393, lng: 15.615 },
          { lat: 58.395, lng: 15.616 },
          { lat: 58.394, lng: 15.614 },
          { lat: 58.393, lng: 15.615 },
        ],
      ];

      const featureGroup = createMockFeatureGroup();
      const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker').mockImplementation(() => {});
      const addHoleMarkerSpy = vi
        .spyOn(polydraw as any, 'addHoleMarker')
        .mockImplementation(() => {});

      // Call the method under test
      (polydraw as any).addMarkersToFeatureGroup(reconstructedFlattenedStructure, featureGroup, 0);

      // The fix ensures:
      // Ring 0 (ringGroupIndex = 0) → addMarker (GREEN markers)
      expect(addMarkerSpy).toHaveBeenCalledWith(
        reconstructedFlattenedStructure[0],
        featureGroup,
        0,
      );

      // Ring 1 (ringGroupIndex = 1) → addHoleMarker (RED markers) - this was broken before
      expect(addHoleMarkerSpy).toHaveBeenCalledWith(
        reconstructedFlattenedStructure[1],
        featureGroup,
        0,
      );

      // Verify the bug is fixed: hole ring should NOT use addMarker
      expect(addMarkerSpy).not.toHaveBeenCalledWith(
        reconstructedFlattenedStructure[1],
        featureGroup,
        0,
      );

      addMarkerSpy.mockRestore();
      addHoleMarkerSpy.mockRestore();
    });

    it('should verify the simple ring index approach prevents complex structure detection issues', () => {
      // The original bug was caused by complex structure detection failing
      // The fix uses simple ring index logic that always works

      const problematicStructures = [
        // Structure that would fail complex detection
        [
          [
            { lat: 1, lng: 1 },
            { lat: 2, lng: 2 },
            { lat: 1, lng: 1 },
          ],
          [
            { lat: 1.1, lng: 1.1 },
            { lat: 1.2, lng: 1.2 },
            { lat: 1.1, lng: 1.1 },
          ],
        ],
        // Another structure that would fail complex detection
        [
          [
            { lat: 3, lng: 3 },
            { lat: 4, lng: 4 },
            { lat: 3, lng: 3 },
          ],
          [
            { lat: 3.1, lng: 3.1 },
            { lat: 3.2, lng: 3.2 },
            { lat: 3.1, lng: 3.1 },
          ],
        ],
      ];

      problematicStructures.forEach((structure) => {
        const featureGroup = createMockFeatureGroup();
        const addMarkerSpy = vi.spyOn(polydraw as any, 'addMarker').mockImplementation(() => {});
        const addHoleMarkerSpy = vi
          .spyOn(polydraw as any, 'addHoleMarker')
          .mockImplementation(() => {});

        // Should not throw error and should use correct marker types
        expect(() => {
          (polydraw as any).addMarkersToFeatureGroup(structure, featureGroup, 0);
        }).not.toThrow();

        // Simple ring index approach always works:
        // ringGroupIndex 0 → addMarker
        // ringGroupIndex 1 → addHoleMarker
        expect(addMarkerSpy).toHaveBeenCalledTimes(1);
        expect(addHoleMarkerSpy).toHaveBeenCalledTimes(1);

        addMarkerSpy.mockRestore();
        addHoleMarkerSpy.mockRestore();
      });
    });
  });
});
