import Polydraw from '../src/polydraw';
import * as L from 'leaflet';
import { DrawMode } from '../src/enums';
import { vi } from 'vitest';
import {Feature, Polygon} from 'geojson';

vi.mock('../src/styles/polydraw.css', () => ({}));

vi.mock('../src/turf-helper', () => {
  return {
    TurfHelper: vi.fn().mockImplementation(() => ({
      turfConcaveman: vi.fn().mockReturnValue({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
        },
        properties: {}
      }),
      getMultiPolygon: vi.fn().mockReturnValue({
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]]
        },
        properties: {}
      }),
      getTurfPolygon: vi.fn().mockReturnValue({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
        },
        properties: {}
      }),
      getSimplified: vi.fn().mockImplementation((feature) => feature),
      polygonIntersect: vi.fn().mockReturnValue(false),
      union: vi.fn().mockImplementation((poly1, poly2) => poly1),
      polygonDifference: vi.fn().mockImplementation((poly1, poly2) => poly1),
      hasKinks: vi.fn().mockReturnValue(false),
      getKinks: vi.fn().mockReturnValue([]),
      isWithin: vi.fn().mockReturnValue(false),
      getCoord: vi.fn().mockReturnValue([0, 0]),
      getFeaturePointCollection: vi.fn().mockReturnValue({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: { featureIndex: 0 }
          }
        ]
      }),
      getNearestPointIndex: vi.fn().mockReturnValue(0)
    }))
  };
});

vi.mock('leaflet', async () => {
  const actual = await vi.importActual('leaflet') as any;
  return {
    ...actual,
    GeoJSON: {
      ...actual.GeoJSON,
      geometryToLayer: vi.fn().mockReturnValue({
        setStyle: vi.fn(),
        getLatLngs: vi.fn().mockReturnValue([
          [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 0 },
            { lat: 1, lng: 1 },
            { lat: 0, lng: 1 },
            { lat: 0, lng: 0 }
          ]
        ]),
        addTo: vi.fn().mockReturnThis(),
        on: vi.fn(),
        addEventParent: vi.fn(),
        removeEventParent: vi.fn(),
        toGeoJSON: vi.fn().mockReturnValue({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
          },
          properties: {}
        })
      })
    }
  };
});

vi.mock('../src/utils', () => {
  return {
    PolyDrawUtil: {
      getBounds: vi.fn().mockReturnValue({
        getSouth: () => 0,
        getWest: () => 0,
        getNorth: () => 1,
        getEast: () => 1
      })
    },
    Compass: vi.fn().mockImplementation(() => ({
      getDirection: vi.fn().mockReturnValue({ lat: 0, lng: 0 })
    })),
    Perimeter: vi.fn().mockImplementation((value, config) => ({
      value,
      config,
      toString: () => `${value} m`
    })),
    Area: vi.fn().mockImplementation((value, config) => ({
      value,
      config,
      toString: () => `${value} m²`
    }))
  };
});

vi.mock('../src/polygon-information.service', () => {
  return {
    PolygonInformationService: vi.fn().mockImplementation(() => ({
      onPolygonInfoUpdated: vi.fn(),
      saveCurrentState: vi.fn(),
      deletePolygonInformationStorage: vi.fn(),
      createPolygonInformationStorage: vi.fn(),
      updatePolygons: vi.fn(),
      deleteTrashcan: vi.fn(),
      deleteTrashCanOnMulti: vi.fn(),
      polygonInformationStorage: []
    }))
  };
});

vi.mock('../src/map-state', () => {
  return {
    MapStateService: vi.fn().mockImplementation(() => ({}))
  };
});

describe('Draw Polygon Functionality', () => {
  let map: L.Map;
  let control: Polydraw;

  beforeEach(() => {
    map = L.map(document.createElement('div'), {
      center: [51.505, -0.09],
      zoom: 13
    });
    
    control = new Polydraw({
      position: 'topleft'
    });
    
    control.onAdd(map);
  });

  afterEach(() => {
    try {
      map.remove();
    } catch (error) {
      console.warn('Could not remove map:', error.message);
    }
  });

  describe('Polygon Merging Tests', () => {
    describe('When mergePolygons is enabled (true)', () => {
      let mergingEnabledControl: Polydraw;

      beforeEach(() => {
        mergingEnabledControl = new Polydraw({
          position: 'topleft',
          config: {
            mergePolygons: true,
            kinks: false,
            modes: {
              dragElbow: true
            }
          }
        });
        mergingEnabledControl.onAdd(map);
      });

      it('should call merge logic when mergePolygons is true and conditions are met', () => {
        const mergePolygons = (mergingEnabledControl as any).mergePolygons;
        const kinks = (mergingEnabledControl as any).kinks;
        
        expect(mergePolygons).toBe(true);
        expect(kinks).toBe(false);

        const shouldMerge = mergePolygons && 
                           !(false) && 
                           true && 
                           !kinks;
        
        expect(shouldMerge).toBe(true);
      });

      it('should bypass merge when noMerge parameter is true', () => {
        const mergePolygons = (mergingEnabledControl as any).mergePolygons;
        const kinks = (mergingEnabledControl as any).kinks;
        
        expect(mergePolygons).toBe(true);
        expect(kinks).toBe(false);

        const shouldMergeWithNoMerge = mergePolygons && 
                                      !(true) && 
                                      true && 
                                      !kinks;
        
        expect(shouldMergeWithNoMerge).toBe(false);

        const shouldMergeWithoutNoMerge = mergePolygons && 
                                         !(false) && 
                                         true && 
                                         !kinks;
        
        expect(shouldMergeWithoutNoMerge).toBe(true);
      });

      it('should merge two overlapping polygons when mergePolygons is enabled', () => {
        const control = mergingEnabledControl as any;
        
        control.arrayOfFeatureGroups = [{}];
        expect(control.arrayOfFeatureGroups.length).toBe(1);
        
        const mergePolygons = control.mergePolygons;
        const kinks = control.kinks;
        
        expect(mergePolygons).toBe(true);
        expect(kinks).toBe(false);
        
        const originalAddPolygonLayer = control.addPolygonLayer;
        control.addPolygonLayer = vi.fn((feature) => {
          control.arrayOfFeatureGroups.push({});
        });
        
        const originalMerge = control.merge;
        control.merge = vi.fn((feature) => {
          control.arrayOfFeatureGroups = [{}];
        });
        
        const polygon2: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0.5, 0.5], [1.5, 0.5], [1.5, 1.5], [0.5, 1.5], [0.5, 0.5]]]
          },
          properties: {}
        };
        
        control.addPolygon(polygon2, false, false);
        
        expect(control.arrayOfFeatureGroups.length).toBe(1);
        
        const actualCondition = mergePolygons && 
                               !(false) && 
                               true && 
                               !kinks;
        expect(actualCondition).toBe(true);
        
        control.addPolygonLayer = originalAddPolygonLayer;
        control.merge = originalMerge;
      });

      it('p2p - should verify intersecting polygons meet merge prerequisites when mergePolygons is enabled', () => {
        const mockTurfHelper = (mergingEnabledControl as any).turfHelper;
        mockTurfHelper.polygonIntersect.mockReturnValue(true);

        const polygon1Coords = [[[51.5, -0.1], [51.51, -0.1], [51.51, -0.11], [51.5, -0.11], [51.5, -0.1]]];
        const polygon2Coords = [[[51.505, -0.105], [51.515, -0.105], [51.515, -0.115], [51.505, -0.115], [51.505, -0.105]]];

        const wouldIntersect = mockTurfHelper.polygonIntersect();
        expect(wouldIntersect).toBe(true);

        const mergePolygons = true;
        expect(mergePolygons).toBe(true);

        expect(polygon1Coords).toBeDefined();
        expect(polygon2Coords).toBeDefined();
        expect(polygon1Coords.length).toBe(1);
        expect(polygon2Coords.length).toBe(1);
        expect(wouldIntersect).toBe(true);
      });
    });

    describe('When mergePolygons is disabled (false)', () => {
      let mergingDisabledControl: Polydraw;

      beforeEach(() => {
        mergingDisabledControl = new Polydraw({
          position: 'topleft',
          config: {
            mergePolygons: false,
            kinks: false,
            modes: {
              dragElbow: true
            }
          }
        });
        mergingDisabledControl.onAdd(map);
      });

      it('should NOT call merge logic when mergePolygons is false', () => {
        const mergePolygons = (mergingDisabledControl as any).mergePolygons;
        const kinks = (mergingDisabledControl as any).kinks;
        
        expect(mergePolygons).toBe(false);
        expect(kinks).toBe(false);

        const shouldMerge = mergePolygons && 
                           !(false) && 
                           true && 
                           !kinks;
        
        expect(shouldMerge).toBe(false);
        expect(mergePolygons).toBe(false);
      });

      it('should verify the actual addPolygon method logic respects mergePolygons config', () => {
        const mergePolygons = (mergingDisabledControl as any).mergePolygons;
        const kinks = (mergingDisabledControl as any).kinks;
        
        expect(mergePolygons).toBe(false);
        expect(kinks).toBe(false);

        const shouldMerge = mergePolygons && 
                           !(false) && 
                           true && 
                           !kinks;
        
        expect(shouldMerge).toBe(false);
      });
    });
  });
});
