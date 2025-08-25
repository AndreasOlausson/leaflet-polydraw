import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as L from 'leaflet';
import {
  PolygonMutationManager,
  MutationManagerDependencies,
} from '../../src/managers/polygon-mutation-manager';
import { TurfHelper } from '../../src/turf-helper';
import { PolygonInformationService } from '../../src/polygon-information.service';
import { ModeManager } from '../../src/managers/mode-manager';
import { EventManager } from '../../src/managers/event-manager';
import { PolygonGeometryManager } from '../../src/managers/polygon-geometry-manager';
import { PolygonInteractionManager } from '../../src/managers/polygon-interaction-manager';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { PolydrawConfig } from '../../src/types/polydraw-interfaces';

// Mock Leaflet
vi.mock('leaflet', () => ({
  Map: vi.fn(() => ({
    removeLayer: vi.fn(),
    addLayer: vi.fn(),
  })),
  FeatureGroup: vi.fn(() => ({
    addLayer: vi.fn(),
    clearLayers: vi.fn(),
    addTo: vi.fn(),
    getLayers: vi.fn(() => [
      {
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
          properties: {},
        })),
      },
    ]),
    toGeoJSON: vi.fn(() => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
          properties: {},
        },
      ],
    })),
    eachLayer: vi.fn((callback) => {
      const mockPolygon = {
        toGeoJSON: vi.fn(() => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
          properties: {},
        })),
      };
      callback(mockPolygon);
    }),
  })),
  Polygon: vi.fn(() => ({
    setStyle: vi.fn(),
    getLatLngs: vi.fn(() => [
      [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
      ],
    ]),
    toGeoJSON: vi.fn(() => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
      properties: {},
    })),
  })),
  GeoJSON: {
    geometryToLayer: vi.fn(() => ({
      setStyle: vi.fn(),
      getLatLngs: vi.fn(() => [
        [
          { lat: 0, lng: 0 },
          { lat: 1, lng: 0 },
          { lat: 1, lng: 1 },
          { lat: 0, lng: 1 },
        ],
      ]),
      toGeoJSON: vi.fn(() => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
        properties: {},
      })),
    })),
  },
  Util: {
    stamp: vi.fn(() => 123),
  },
  polyline: vi.fn(() => ({
    addTo: vi.fn(),
  })),
  divIcon: vi.fn(() => ({})),
}));

// Mock specialized managers
vi.mock('../../src/managers/polygon-geometry-manager', () => ({
  PolygonGeometryManager: vi.fn(() => ({
    checkPolygonIntersection: vi.fn(() => true),
    unionPolygons: vi.fn(() => ({ success: true, result: mockPolygonFeature })),
    subtractPolygon: vi.fn(() => ({ success: true, results: [mockPolygonFeature] })),
    simplifyPolygon: vi.fn(() => ({ success: true, result: mockPolygonFeature })),
    convertToBoundingBox: vi.fn(() => ({ success: true, result: mockPolygonFeature })),
    doubleElbowsPolygon: vi.fn(() => ({ success: true, result: mockPolygonFeature })),
    bezierifyPolygon: vi.fn(() => ({ success: true, result: mockPolygonFeature })),
  })),
}));

vi.mock('../../src/managers/polygon-interaction-manager', () => ({
  PolygonInteractionManager: vi.fn(() => ({
    addMarkers: vi.fn(),
    addHoleMarkers: vi.fn(),
    addEdgeClickListeners: vi.fn(),
    enablePolygonDragging: vi.fn(),
    updateMarkerDraggableState: vi.fn(),
    updateAllMarkersForEdgeDeletion: vi.fn(),
    setModifierKeyHeld: vi.fn(),
  })),
}));

// Mock dependencies
const mockTurfHelper = {
  getTurfPolygon: vi.fn(() => mockPolygonFeature),
  getMultiPolygon: vi.fn(() => mockPolygonFeature),
  getSimplified: vi.fn((feature) => feature),
} as any;

const mockPolygonInformation = {
  getArea: vi.fn(() => 100),
  getPerimeter: vi.fn(() => 40),
} as any;

const mockMap = {
  removeLayer: vi.fn(),
  addLayer: vi.fn(),
} as any;

const mockConfig: PolydrawConfig = {
  mergePolygons: true,
  kinks: false,
  modes: {
    dragPolygons: true,
  },
  colors: {
    polygon: {
      border: '#000',
      fill: '#fff',
    },
    hole: {
      border: '#f00',
      fill: '#f00',
    },
  },
  polygonOptions: {
    weight: 2,
    opacity: 1,
  },
  holeOptions: {
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5,
  },
} as any;

const mockModeManager = {
  getCurrentMode: vi.fn(() => 'edit'),
} as any;

const mockEventManager = {
  on: vi.fn(),
  emit: vi.fn(),
  off: vi.fn(),
} as any;

const mockPolygonFeature: Feature<Polygon> = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  },
  properties: {},
};

const mockMultiPolygonFeature: Feature<MultiPolygon> = {
  type: 'Feature',
  geometry: {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    ],
  },
  properties: {},
};

describe('PolygonMutationManager', () => {
  let mutationManager: PolygonMutationManager;
  let mockFeatureGroups: L.FeatureGroup[];
  let dependencies: MutationManagerDependencies;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFeatureGroups = [];

    dependencies = {
      turfHelper: mockTurfHelper,
      polygonInformation: mockPolygonInformation,
      map: mockMap,
      config: mockConfig,
      modeManager: mockModeManager,
      eventManager: mockEventManager,
      getFeatureGroups: () => mockFeatureGroups,
    };

    mutationManager = new PolygonMutationManager(dependencies);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with dependencies', () => {
      expect(mutationManager).toBeDefined();
      expect(PolygonGeometryManager).toHaveBeenCalledWith({
        turfHelper: mockTurfHelper,
        config: mockConfig,
      });
      expect(PolygonInteractionManager).toHaveBeenCalled();
    });

    it('should set up event forwarding', () => {
      expect(mockEventManager.on).toHaveBeenCalledWith(
        'polydraw:draw:cancel',
        expect.any(Function),
      );
      expect(mockEventManager.on).toHaveBeenCalledWith(
        'polydraw:polygon:updated',
        expect.any(Function),
      );
      expect(mockEventManager.on).toHaveBeenCalledWith(
        'polydraw:menu:action',
        expect.any(Function),
      );
      expect(mockEventManager.on).toHaveBeenCalledWith(
        'polydraw:check:intersection',
        expect.any(Function),
      );
      expect(mockEventManager.on).toHaveBeenCalledWith('polydraw:subtract', expect.any(Function));
      expect(mockEventManager.on).toHaveBeenCalledWith(
        'polydraw:polygon:deleted',
        expect.any(Function),
      );
    });
  });

  describe('addPolygon', () => {
    it('should add polygon without merging when mergePolygons is false', async () => {
      mockConfig.mergePolygons = false;
      const result = await mutationManager.addPolygon(mockPolygonFeature);

      expect(result.success).toBe(true);
      expect(result.featureGroups).toHaveLength(1);
      expect(mockFeatureGroups).toHaveLength(1);
    });

    it('should add polygon without merging when noMerge option is true', async () => {
      const result = await mutationManager.addPolygon(mockPolygonFeature, { noMerge: true });

      expect(result.success).toBe(true);
      expect(result.featureGroups).toHaveLength(1);
    });

    it('should add polygon without merging when no existing polygons', async () => {
      const result = await mutationManager.addPolygon(mockPolygonFeature);

      expect(result.success).toBe(true);
      expect(result.featureGroups).toHaveLength(1);
    });

    it('should add polygon without merging when kinks are enabled', async () => {
      mockConfig.kinks = true;
      mockFeatureGroups.push(new L.FeatureGroup());

      const result = await mutationManager.addPolygon(mockPolygonFeature);

      expect(result.success).toBe(true);
    });

    it('should merge polygon when conditions are met', async () => {
      mockFeatureGroups.push(new L.FeatureGroup());

      const result = await mutationManager.addPolygon(mockPolygonFeature);

      expect(result.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockTurfHelper.getSimplified.mockImplementation(() => {
        throw new Error('Simplification error');
      });

      const result = await mutationManager.addPolygon(mockPolygonFeature);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Simplification error');
    });

    it('should apply simplification when simplify option is true', async () => {
      await mutationManager.addPolygon(mockPolygonFeature, { simplify: true });

      expect(mockTurfHelper.getSimplified).toHaveBeenCalledWith(mockPolygonFeature, false);
    });

    it('should skip simplification when simplify option is false', async () => {
      await mutationManager.addPolygon(mockPolygonFeature, { simplify: false });

      expect(mockTurfHelper.getSimplified).not.toHaveBeenCalled();
    });
  });

  describe('subtractPolygon', () => {
    beforeEach(() => {
      const mockFeatureGroup = new L.FeatureGroup();
      mockFeatureGroups.push(mockFeatureGroup);
    });

    it('should subtract polygon from intersecting polygons', async () => {
      const result = await mutationManager.subtractPolygon(mockPolygonFeature);

      expect(result.success).toBe(true);
      expect(result.featureGroups).toBeDefined();
    });

    it('should handle no intersecting polygons', async () => {
      (mutationManager as any).geometryManager.checkPolygonIntersection.mockReturnValue(false);

      const result = await mutationManager.subtractPolygon(mockPolygonFeature);

      expect(result.success).toBe(true);
      expect(result.featureGroups).toEqual([]);
    });

    it('should handle subtraction errors gracefully', async () => {
      (mutationManager as any).geometryManager.subtractPolygon.mockReturnValue({
        success: false,
        error: 'Subtraction failed',
      });

      const result = await mutationManager.subtractPolygon(mockPolygonFeature);

      expect(result.success).toBe(true); // Still succeeds even if individual subtractions fail
    });

    it('should emit polygonSubtracted event', async () => {
      await mutationManager.subtractPolygon(mockPolygonFeature);

      expect(mockEventManager.emit).toHaveBeenCalledWith('polygonSubtracted', expect.any(Object));
    });

    it('should emit polygonOperationComplete event', async () => {
      await mutationManager.subtractPolygon(mockPolygonFeature);

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        'polygonOperationComplete',
        expect.objectContaining({
          operation: 'subtract',
        }),
      );
    });

    it('should handle invalid feature group data', async () => {
      const mockFeatureGroup = {
        toGeoJSON: vi.fn(() => ({ features: [] })),
      } as any;
      mockFeatureGroups.push(mockFeatureGroup);

      const result = await mutationManager.subtractPolygon(mockPolygonFeature);

      expect(result.success).toBe(true);
    });
  });

  describe('handleMenuAction', () => {
    let mockFeatureGroup: L.FeatureGroup;

    beforeEach(() => {
      mockFeatureGroup = new L.FeatureGroup();
      mockFeatureGroups.push(mockFeatureGroup);
    });

    it('should handle simplify action', async () => {
      const menuData = {
        action: 'simplify' as const,
        featureGroup: mockFeatureGroup,
      };

      await (mutationManager as any).handleMenuAction(menuData);

      expect((mutationManager as any).geometryManager.simplifyPolygon).toHaveBeenCalled();
    });

    it('should handle bbox action', async () => {
      const menuData = {
        action: 'bbox' as const,
        featureGroup: mockFeatureGroup,
      };

      await (mutationManager as any).handleMenuAction(menuData);

      expect((mutationManager as any).geometryManager.convertToBoundingBox).toHaveBeenCalled();
    });

    it('should handle doubleElbows action', async () => {
      const menuData = {
        action: 'doubleElbows' as const,
        featureGroup: mockFeatureGroup,
      };

      await (mutationManager as any).handleMenuAction(menuData);

      expect((mutationManager as any).geometryManager.doubleElbowsPolygon).toHaveBeenCalled();
    });

    it('should handle bezier action', async () => {
      const menuData = {
        action: 'bezier' as const,
        featureGroup: mockFeatureGroup,
      };

      await (mutationManager as any).handleMenuAction(menuData);

      expect((mutationManager as any).geometryManager.bezierifyPolygon).toHaveBeenCalled();
    });

    it('should ignore unknown actions', async () => {
      const menuData = {
        action: 'unknown' as any,
        featureGroup: mockFeatureGroup,
      };

      await (mutationManager as any).handleMenuAction(menuData);

      // Should not call any geometry operations
      expect((mutationManager as any).geometryManager.simplifyPolygon).not.toHaveBeenCalled();
    });

    it('should remove original feature group before processing', async () => {
      const initialLength = mockFeatureGroups.length;
      const menuData = {
        action: 'simplify' as const,
        featureGroup: mockFeatureGroup,
      };

      await (mutationManager as any).handleMenuAction(menuData);

      expect(mockFeatureGroups.length).toBe(initialLength); // Should be restored after adding result
    });
  });

  describe('mergePolygon', () => {
    it('should merge with intersecting polygons', async () => {
      const mockFeatureGroup = new L.FeatureGroup();
      mockFeatureGroups.push(mockFeatureGroup);

      const result = await (mutationManager as any).mergePolygon(mockPolygonFeature, {});

      expect(result.success).toBe(true);
    });

    it('should add polygon directly when no intersections', async () => {
      (mutationManager as any).geometryManager.checkPolygonIntersection.mockReturnValue(false);

      const result = await (mutationManager as any).mergePolygon(mockPolygonFeature, {});

      expect(result.success).toBe(true);
    });

    it('should handle MultiPolygon coordinates', async () => {
      const mockFeatureGroup = {
        toGeoJSON: vi.fn(() => ({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [0, 0],
                    [1, 0],
                    [1, 1],
                    [0, 1],
                    [0, 0],
                  ],
                ],
              },
              properties: {},
            },
          ],
        })),
      } as any;
      mockFeatureGroups.push(mockFeatureGroup);

      // Mock the geometry manager to return false for intersection check
      (mutationManager as any).geometryManager.checkPolygonIntersection.mockReturnValue(false);

      const result = await (mutationManager as any).mergePolygon(mockPolygonFeature, {});

      expect(result.success).toBe(true);
    });

    it('should handle errors in intersection checking', async () => {
      const mockFeatureGroup = {
        toGeoJSON: vi.fn(() => {
          throw new Error('GeoJSON error');
        }),
      } as any;
      mockFeatureGroups.push(mockFeatureGroup);

      const result = await (mutationManager as any).mergePolygon(mockPolygonFeature, {});

      expect(result.success).toBe(true); // Should continue despite errors
    });
  });

  describe('unionPolygons', () => {
    it('should union polygons successfully', async () => {
      const mockFeatureGroup = new L.FeatureGroup();
      const layers = [mockFeatureGroup];
      const polygonFeatures = [mockPolygonFeature];

      const result = await (mutationManager as any).unionPolygons(
        layers,
        mockPolygonFeature,
        polygonFeatures,
        {},
      );

      expect(result.success).toBe(true);
      expect(mockEventManager.emit).toHaveBeenCalledWith('polygonsUnioned', expect.any(Object));
    });

    it('should handle union failure', async () => {
      (mutationManager as any).geometryManager.unionPolygons.mockReturnValue({
        success: false,
        error: 'Union failed',
      });

      const result = await (mutationManager as any).unionPolygons([], mockPolygonFeature, [], {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Union failed');
    });
  });

  describe('getPolygon', () => {
    it('should create polygon with correct styling', () => {
      const polygon = (mutationManager as any).getPolygon(mockPolygonFeature);

      expect(L.GeoJSON.geometryToLayer).toHaveBeenCalledWith(mockPolygonFeature);
      expect(polygon.setStyle).toHaveBeenCalledWith(
        expect.objectContaining({
          color: mockConfig.colors.polygon.border,
          fillColor: mockConfig.colors.polygon.fill,
        }),
      );
    });

    it('should set unique identifier', () => {
      const polygon = (mutationManager as any).getPolygon(mockPolygonFeature);

      expect(polygon._polydrawUniqueId).toBeDefined();
      expect(polygon._polydrawUniqueId).toContain('123_');
    });

    it('should clear existing drag data', () => {
      const polygon = (mutationManager as any).getPolygon(mockPolygonFeature);

      expect(polygon._polydrawDragData).toBeUndefined();
      expect(polygon._polydrawOriginalLatLngs).toBeUndefined();
      expect(polygon._polydrawCurrentDragSession).toBeUndefined();
    });

    it('should enable polygon dragging when configured', () => {
      mockConfig.modes.dragPolygons = true;

      (mutationManager as any).getPolygon(mockPolygonFeature);

      expect((mutationManager as any).interactionManager.enablePolygonDragging).toHaveBeenCalled();
    });

    it('should not enable polygon dragging when disabled', () => {
      mockConfig.modes.dragPolygons = false;

      (mutationManager as any).getPolygon(mockPolygonFeature);

      expect(
        (mutationManager as any).interactionManager.enablePolygonDragging,
      ).not.toHaveBeenCalled();
    });
  });

  describe('addPolygonLayer', () => {
    it('should create and add polygon layer successfully', async () => {
      const result = await (mutationManager as any).addPolygonLayer(mockPolygonFeature, {});

      expect(result.success).toBe(true);
      expect(result.featureGroups).toHaveLength(1);
      expect(mockFeatureGroups).toHaveLength(1);
    });

    it('should handle invalid polygon data', async () => {
      const invalidFeature = {
        type: 'Feature',
        geometry: null,
        properties: {},
      } as any;

      const result = await (mutationManager as any).addPolygonLayer(invalidFeature, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid polygon data');
    });

    it('should apply simplification when enabled', async () => {
      await (mutationManager as any).addPolygonLayer(mockPolygonFeature, { simplify: true });

      expect(mockTurfHelper.getSimplified).toHaveBeenCalledWith(mockPolygonFeature, false);
    });

    it('should use dynamic tolerance when specified', async () => {
      await (mutationManager as any).addPolygonLayer(mockPolygonFeature, {
        simplify: true,
        dynamicTolerance: true,
      });

      expect(mockTurfHelper.getSimplified).toHaveBeenCalledWith(mockPolygonFeature, true);
    });

    it('should set optimization level on polygon', async () => {
      const mockPolygon = {
        setStyle: vi.fn(),
        getLatLngs: vi.fn(() => [[{ lat: 0, lng: 0 }]]),
        _polydrawOptimizationLevel: undefined,
      } as any;
      (L.GeoJSON.geometryToLayer as any).mockReturnValue(mockPolygon);

      await (mutationManager as any).addPolygonLayer(mockPolygonFeature, {
        visualOptimizationLevel: 2,
      });

      expect(mockPolygon._polydrawOptimizationLevel).toBe(2);
    });

    it('should handle polygon creation failure', async () => {
      (L.GeoJSON.geometryToLayer as any).mockReturnValue(null);

      const result = await (mutationManager as any).addPolygonLayer(mockPolygonFeature, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create polygon layer');
    });

    it('should handle marker creation errors gracefully', async () => {
      const mockPolygon = {
        setStyle: vi.fn(),
        getLatLngs: vi.fn(() => {
          throw new Error('LatLngs error');
        }),
      };
      (L.GeoJSON.geometryToLayer as any).mockReturnValue(mockPolygon);

      const result = await (mutationManager as any).addPolygonLayer(mockPolygonFeature, {});

      expect(result.success).toBe(true); // Should continue despite marker errors
    });

    it('should emit polygonAdded event', async () => {
      await (mutationManager as any).addPolygonLayer(mockPolygonFeature, {});

      expect(mockEventManager.emit).toHaveBeenCalledWith('polygonAdded', expect.any(Object));
    });

    it('should emit polygonOperationComplete event', async () => {
      await (mutationManager as any).addPolygonLayer(mockPolygonFeature, {});

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        'polygonOperationComplete',
        expect.objectContaining({
          operation: 'add',
        }),
      );
    });
  });

  describe('getCompletePolygonFromFeatureGroup', () => {
    it('should extract polygon from feature group', () => {
      const expectedFeature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };

      const mockPolygon = {
        toGeoJSON: vi.fn(() => expectedFeature),
      };
      const mockFeatureGroup = {
        eachLayer: vi.fn((callback) => callback(mockPolygon)),
      } as any;

      const result = (mutationManager as any).getCompletePolygonFromFeatureGroup(mockFeatureGroup);

      expect(result).toEqual(expectedFeature);
    });

    it('should return fallback polygon when no polygon found', () => {
      const mockFeatureGroup = {
        eachLayer: vi.fn((callback) => {
          callback({
            /* not a polygon */
          });
        }),
      } as any;

      const result = (mutationManager as any).getCompletePolygonFromFeatureGroup(mockFeatureGroup);

      expect(result.type).toBe('Feature');
      expect(result.geometry.type).toBe('Polygon');
    });

    it('should handle errors and return fallback', () => {
      const mockFeatureGroup = {
        eachLayer: vi.fn(() => {
          throw new Error('Layer error');
        }),
      } as any;

      const result = (mutationManager as any).getCompletePolygonFromFeatureGroup(mockFeatureGroup);

      expect(result.type).toBe('Feature');
      expect(result.geometry.type).toBe('Polygon');
    });
  });

  describe('utility methods', () => {
    it('should check if array is Position array of arrays', () => {
      const validArray = [
        [
          [0, 0],
          [1, 1],
        ],
      ];
      const invalidArray = [[0, 1]];

      expect((mutationManager as any).isPositionArrayofArrays(validArray)).toBe(false);
      expect((mutationManager as any).isPositionArrayofArrays(invalidArray)).toBe(false);
      expect((mutationManager as any).isPositionArrayofArrays(null)).toBe(false);
      expect((mutationManager as any).isPositionArrayofArrays([])).toBe(false);
    });

    it('should check if value is Position', () => {
      expect((mutationManager as any).isPosition([0, 1])).toBe(true);
      expect((mutationManager as any).isPosition([0, 1, 2])).toBe(true);
      expect((mutationManager as any).isPosition([0])).toBe(false);
      expect((mutationManager as any).isPosition(['a', 'b'])).toBe(false);
      expect((mutationManager as any).isPosition(null)).toBe(false);
    });
  });

  describe('delegation methods', () => {
    it('should delegate updateMarkerDraggableState to interaction manager', () => {
      mutationManager.updateMarkerDraggableState();

      expect(
        (mutationManager as any).interactionManager.updateMarkerDraggableState,
      ).toHaveBeenCalled();
    });

    it('should delegate updateAllMarkersForEdgeDeletion to interaction manager', () => {
      mutationManager.updateAllMarkersForEdgeDeletion(true);

      expect(
        (mutationManager as any).interactionManager.updateAllMarkersForEdgeDeletion,
      ).toHaveBeenCalledWith(true);
    });

    it('should delegate setModifierKeyHeld to interaction manager', () => {
      mutationManager.setModifierKeyHeld(true);

      expect((mutationManager as any).interactionManager.setModifierKeyHeld).toHaveBeenCalledWith(
        true,
      );
    });

    it('should delegate checkPolygonIntersection to geometry manager', () => {
      const result = mutationManager.checkPolygonIntersection(
        mockPolygonFeature,
        mockPolygonFeature,
      );

      expect(
        (mutationManager as any).geometryManager.checkPolygonIntersection,
      ).toHaveBeenCalledWith(mockPolygonFeature, mockPolygonFeature);
      expect(result).toBe(true);
    });
  });

  describe('legacy compatibility methods', () => {
    it('should provide getPolygonCenter method', () => {
      const center = mutationManager.getPolygonCenter(mockPolygonFeature);

      expect(center).toEqual({ lat: 0.4, lng: 0.4 });
    });

    it('should handle invalid polygon in getPolygonCenter', () => {
      const invalidFeature = {
        type: 'Feature',
        geometry: null,
        properties: {},
      } as any;

      const center = mutationManager.getPolygonCenter(invalidFeature);

      expect(center).toBeNull();
    });

    it('should provide getBoundingBox method', () => {
      const bbox = mutationManager.getBoundingBox(mockPolygonFeature);

      expect(bbox).toEqual({
        minLat: 0,
        maxLat: 1,
        minLng: 0,
        maxLng: 1,
      });
    });

    it('should handle MultiPolygon in getPolygonCenter', () => {
      const center = mutationManager.getPolygonCenter(mockMultiPolygonFeature);

      expect(center).toEqual({ lat: 0.4, lng: 0.4 });
    });

    it('should handle invalid MultiPolygon in getBoundingBox', () => {
      const invalidFeature = {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [],
        },
        properties: {},
      } as any;

      const bbox = mutationManager.getBoundingBox(invalidFeature);

      expect(bbox).toBeNull();
    });

    it('should delegate legacy methods to interaction manager', () => {
      const mockFeatureGroup = new L.FeatureGroup();
      const mockLatLngs = [{ lat: 0, lng: 0 }];

      mutationManager.addMarker(mockLatLngs, mockFeatureGroup);
      expect((mutationManager as any).interactionManager.addMarkers).toHaveBeenCalledWith(
        mockLatLngs,
        mockFeatureGroup,
      );

      mutationManager.addHoleMarker(mockLatLngs, mockFeatureGroup);
      expect((mutationManager as any).interactionManager.addHoleMarkers).toHaveBeenCalledWith(
        mockLatLngs,
        mockFeatureGroup,
      );
    });

    it('should provide backward compatibility methods', () => {
      const mockFeatureGroup = new L.FeatureGroup();
      const mockPolygon = new L.Polygon([]);

      // These methods should exist for backward compatibility
      expect(typeof mutationManager.getMarkerIndex).toBe('function');
      expect(typeof mutationManager.ensureMarkerSeparation).toBe('function');
      expect(typeof mutationManager.findAlternativeMarkerPosition).toBe('function');
      expect(typeof mutationManager.createDivIcon).toBe('function');
      expect(typeof mutationManager.getLatLngInfoString).toBe('function');
      expect(typeof mutationManager.generateMenuMarkerPopup).toBe('function');
      expect(typeof mutationManager.getPolygonGeoJSONFromFeatureGroup).toBe('function');
      expect(typeof mutationManager.getTotalPolygonPerimeter).toBe('function');
      expect(typeof mutationManager.generateInfoMarkerPopup).toBe('function');
      expect(typeof mutationManager.removeFeatureGroup).toBe('function');
      expect(typeof mutationManager.performModifierSubtract).toBe('function');
    });

    it('should handle performModifierSubtract correctly', () => {
      const mockFeatureGroup = new L.FeatureGroup();
      mockFeatureGroups.push(mockFeatureGroup);

      // This should not throw an error
      expect(() => {
        mutationManager.performModifierSubtract(mockPolygonFeature, mockFeatureGroup);
      }).not.toThrow();
    });

    it('should provide access to polygon interaction manager', () => {
      const interactionManager = mutationManager.polygonInteractionManager;
      expect(interactionManager).toBeDefined();
    });

    it('should handle event forwarding correctly', () => {
      // Test that events are properly forwarded
      expect(mockEventManager.on).toHaveBeenCalledWith(
        'polydraw:draw:cancel',
        expect.any(Function),
      );
      expect(mockEventManager.on).toHaveBeenCalledWith(
        'polydraw:polygon:updated',
        expect.any(Function),
      );
      expect(mockEventManager.on).toHaveBeenCalledWith(
        'polydraw:menu:action',
        expect.any(Function),
      );
    });
  });

  describe('error handling', () => {
    it('should handle errors in addPolygon gracefully', async () => {
      const invalidFeature = null as any;

      const result = await mutationManager.addPolygon(invalidFeature);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle errors in subtractPolygon gracefully', async () => {
      const invalidFeature = null as any;

      const result = await mutationManager.subtractPolygon(invalidFeature);

      expect(result.success).toBe(true);
      expect(result.featureGroups).toEqual([]);
    });

    it('should handle feature group removal errors', () => {
      const mockFeatureGroup = {
        clearLayers: vi.fn(() => {
          throw new Error('Clear layers error');
        }),
      } as any;

      // Should throw the error
      expect(() => {
        (mutationManager as any).removeFeatureGroupInternal(mockFeatureGroup);
      }).toThrow('Clear layers error');
    });
  });
});
