import { describe, it, expect, vi } from 'vitest';
import { PolygonDragManager } from '../src/managers/polygon-drag-manager';
import { SimplePolygonOperations } from '../src/simple-polygon-operations';

describe('Polygon Drag Hole Functionality', () => {
  describe('Basic Hole Functionality', () => {
    it('should work before moving polygon (baseline test)', () => {
      const mockConfig = {
        dragPolygons: { modifierSubtract: { enabled: false } },
        modes: { dragPolygons: true },
      };
      const mockTurfHelper = {};
      const mockMap = {};
      const mockStateManager = {
        getDrawMode: () => 'Off',
        getDragState: () => ({ currentPolygon: null, isModifierKeyHeld: false }),
        startDrag: vi.fn(),
        endDrag: vi.fn(),
        setModifierKeyState: vi.fn(),
        isModifierDragActive: () => false,
      };
      const mockGetArrayOfFeatureGroups = () => [];

      let capturedGeoJSON: any = null;
      let operationSucceeded = false;

      const mockUpdatePolygonCoordinates = vi.fn((featureGroup: any, newGeoJSON: any) => {
        capturedGeoJSON = newGeoJSON;
        operationSucceeded = true;
      });

      vi.spyOn(SimplePolygonOperations.prototype, 'updatePolygonCoordinates').mockImplementation(
        mockUpdatePolygonCoordinates,
      );

      const polygonDragManager = new PolygonDragManager(
        mockConfig as any,
        mockTurfHelper as any,
        mockMap as any,
        mockStateManager as any,
        mockGetArrayOfFeatureGroups,
      );

      const mockPolygon = {
        toGeoJSON: () => ({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0, 10],
                [10, 10],
                [10, 0],
                [0, 0],
              ],
              [
                [3, 3],
                [3, 7],
                [7, 7],
                [7, 3],
                [3, 3],
              ],
            ],
          },
        }),
        _polydrawOriginalStructure: [
          [
            [
              { lat: 0, lng: 0 },
              { lat: 0, lng: 10 },
              { lat: 10, lng: 10 },
              { lat: 10, lng: 0 },
              { lat: 0, lng: 0 },
            ],
            [
              { lat: 3, lng: 3 },
              { lat: 3, lng: 7 },
              { lat: 7, lng: 7 },
              { lat: 7, lng: 3 },
              { lat: 3, lng: 3 },
            ],
          ],
        ],
      };

      const mockFeatureGroup = {
        getLayers: () => [mockPolygon],
        toGeoJSON: () => mockPolygon.toGeoJSON(),
      };

      try {
        (polygonDragManager as any).updatePolygonCoordinates(
          mockPolygon,
          mockFeatureGroup,
          mockPolygon.toGeoJSON(),
        );

        expect(operationSucceeded).toBe(true);
        expect(capturedGeoJSON).toBeDefined();
      } finally {
        vi.doUnmock('../src/simple-polygon-operations');
      }
    });
  });

  describe('Hole Functionality After Polygon Movement', () => {
    it('should preserve hole functionality after moving polygon - with holes', () => {
      const mockConfig = {
        dragPolygons: { modifierSubtract: { enabled: false } },
        modes: { dragPolygons: true },
      };
      const mockTurfHelper = {};
      const mockMap = {};
      const mockStateManager = {
        getDrawMode: () => 'Off',
        getDragState: () => ({ currentPolygon: null, isModifierKeyHeld: false }),
        startDrag: vi.fn(),
        endDrag: vi.fn(),
        setModifierKeyState: vi.fn(),
        isModifierDragActive: () => false,
      };
      const mockGetArrayOfFeatureGroups = () => [];

      let capturedGeoJSON: any = null;
      let holeStructurePreserved = false;

      const mockUpdatePolygonCoordinates = vi.fn((featureGroup: any, newGeoJSON: any) => {
        capturedGeoJSON = newGeoJSON;
        if ((newGeoJSON as any)._polydrawOriginalStructure) {
          holeStructurePreserved = true;
        }
      });

      vi.spyOn(SimplePolygonOperations.prototype, 'updatePolygonCoordinates').mockImplementation(
        mockUpdatePolygonCoordinates,
      );

      const polygonDragManager = new PolygonDragManager(
        mockConfig as any,
        mockTurfHelper as any,
        mockMap as any,
        mockStateManager as any,
        mockGetArrayOfFeatureGroups,
      );

      const mockPolygon = {
        toGeoJSON: () => ({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [5, 5],
                [5, 15],
                [15, 15],
                [15, 5],
                [5, 5],
              ],
              [
                [8, 8],
                [8, 12],
                [12, 12],
                [12, 8],
                [8, 8],
              ],
            ],
          },
        }),
        _polydrawOriginalStructure: [
          [
            [
              { lat: 0, lng: 0 },
              { lat: 0, lng: 10 },
              { lat: 10, lng: 10 },
              { lat: 10, lng: 0 },
              { lat: 0, lng: 0 },
            ],
            [
              { lat: 3, lng: 3 },
              { lat: 3, lng: 7 },
              { lat: 7, lng: 7 },
              { lat: 7, lng: 3 },
              { lat: 3, lng: 3 },
            ],
          ],
        ],
      };

      const mockFeatureGroup = {
        getLayers: () => [mockPolygon],
        toGeoJSON: () => mockPolygon.toGeoJSON(),
      };

      try {
        (polygonDragManager as any).updatePolygonCoordinates(
          mockPolygon,
          mockFeatureGroup,
          mockPolygon.toGeoJSON(),
        );

        expect(holeStructurePreserved).toBe(true);
        expect(capturedGeoJSON).toBeDefined();
      } finally {
        vi.doUnmock('../src/simple-polygon-operations');
      }
    });

    it('should preserve hole functionality after moving polygon - without holes', () => {
      const mockConfig = {
        dragPolygons: { modifierSubtract: { enabled: false } },
        modes: { dragPolygons: true },
      };
      const mockTurfHelper = {};
      const mockMap = {};
      const mockStateManager = {
        getDrawMode: () => 'Off',
        getDragState: () => ({ currentPolygon: null, isModifierKeyHeld: false }),
        startDrag: vi.fn(),
        endDrag: vi.fn(),
        setModifierKeyState: vi.fn(),
        isModifierDragActive: () => false,
      };
      const mockGetArrayOfFeatureGroups = () => [];

      let capturedGeoJSON: any = null;
      let holeStructurePreserved = false;

      const mockUpdatePolygonCoordinates = vi.fn((featureGroup: any, newGeoJSON: any) => {
        capturedGeoJSON = newGeoJSON;
        if ((newGeoJSON as any)._polydrawOriginalStructure) {
          holeStructurePreserved = true;
        }
      });

      vi.spyOn(SimplePolygonOperations.prototype, 'updatePolygonCoordinates').mockImplementation(
        mockUpdatePolygonCoordinates,
      );

      const polygonDragManager = new PolygonDragManager(
        mockConfig as any,
        mockTurfHelper as any,
        mockMap as any,
        mockStateManager as any,
        mockGetArrayOfFeatureGroups,
      );

      const mockPolygon = {
        toGeoJSON: () => ({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [10, 10],
                [10, 20],
                [20, 20],
                [20, 10],
                [10, 10],
              ],
            ],
          },
        }),
        _polydrawOriginalStructure: [
          [
            [
              { lat: 5, lng: 5 },
              { lat: 5, lng: 15 },
              { lat: 15, lng: 15 },
              { lat: 15, lng: 5 },
              { lat: 5, lng: 5 },
            ],
          ],
        ],
      };

      const mockFeatureGroup = {
        getLayers: () => [mockPolygon],
        toGeoJSON: () => mockPolygon.toGeoJSON(),
      };

      try {
        (polygonDragManager as any).updatePolygonCoordinates(
          mockPolygon,
          mockFeatureGroup,
          mockPolygon.toGeoJSON(),
        );

        expect(holeStructurePreserved).toBe(true);
        expect(capturedGeoJSON).toBeDefined();
      } finally {
        vi.doUnmock('../src/simple-polygon-operations');
      }
    });

    it('should preserve hole functionality after moving polygon - large with holes', () => {
      const mockConfig = {
        dragPolygons: { modifierSubtract: { enabled: false } },
        modes: { dragPolygons: true },
      };
      const mockTurfHelper = {};
      const mockMap = {};
      const mockStateManager = {
        getDrawMode: () => 'Off',
        getDragState: () => ({ currentPolygon: null, isModifierKeyHeld: false }),
        startDrag: vi.fn(),
        endDrag: vi.fn(),
        setModifierKeyState: vi.fn(),
        isModifierDragActive: () => false,
      };
      const mockGetArrayOfFeatureGroups = () => [];

      let capturedGeoJSON: any = null;
      let holeStructurePreserved = false;

      const mockUpdatePolygonCoordinates = vi.fn((featureGroup: any, newGeoJSON: any) => {
        capturedGeoJSON = newGeoJSON;
        if ((newGeoJSON as any)._polydrawOriginalStructure) {
          holeStructurePreserved = true;
        }
      });

      vi.spyOn(SimplePolygonOperations.prototype, 'updatePolygonCoordinates').mockImplementation(
        mockUpdatePolygonCoordinates,
      );

      const polygonDragManager = new PolygonDragManager(
        mockConfig as any,
        mockTurfHelper as any,
        mockMap as any,
        mockStateManager as any,
        mockGetArrayOfFeatureGroups,
      );

      const mockPolygon = {
        toGeoJSON: () => ({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0, 20],
                [20, 20],
                [20, 0],
                [0, 0],
              ],
              [
                [5, 5],
                [5, 15],
                [15, 15],
                [15, 5],
                [5, 5],
              ],
            ],
          },
        }),
        _polydrawOriginalStructure: [
          [
            [
              { lat: 0, lng: 0 },
              { lat: 0, lng: 20 },
              { lat: 20, lng: 20 },
              { lat: 20, lng: 0 },
              { lat: 0, lng: 0 },
            ],
            [
              { lat: 5, lng: 5 },
              { lat: 5, lng: 15 },
              { lat: 15, lng: 15 },
              { lat: 15, lng: 5 },
              { lat: 5, lng: 5 },
            ],
          ],
        ],
      };

      const mockFeatureGroup = {
        getLayers: () => [mockPolygon],
        toGeoJSON: () => mockPolygon.toGeoJSON(),
      };

      try {
        (polygonDragManager as any).updatePolygonCoordinates(
          mockPolygon,
          mockFeatureGroup,
          mockPolygon.toGeoJSON(),
        );

        expect(holeStructurePreserved).toBe(true);
        expect(capturedGeoJSON).toBeDefined();
      } finally {
        vi.doUnmock('../src/simple-polygon-operations');
      }
    });

    it('should preserve hole functionality after moving polygon - large coordinates', () => {
      const mockConfig = {
        dragPolygons: { modifierSubtract: { enabled: false } },
        modes: { dragPolygons: true },
      };
      const mockTurfHelper = {};
      const mockMap = {};
      const mockStateManager = {
        getDrawMode: () => 'Off',
        getDragState: () => ({ currentPolygon: null, isModifierKeyHeld: false }),
        startDrag: vi.fn(),
        endDrag: vi.fn(),
        setModifierKeyState: vi.fn(),
        isModifierDragActive: () => false,
      };
      const mockGetArrayOfFeatureGroups = () => [];

      let capturedGeoJSON: any = null;
      let holeStructurePreserved = false;

      const mockUpdatePolygonCoordinates = vi.fn((featureGroup: any, newGeoJSON: any) => {
        capturedGeoJSON = newGeoJSON;
        if ((newGeoJSON as any)._polydrawOriginalStructure) {
          holeStructurePreserved = true;
        }
      });

      vi.spyOn(SimplePolygonOperations.prototype, 'updatePolygonCoordinates').mockImplementation(
        mockUpdatePolygonCoordinates,
      );

      const polygonDragManager = new PolygonDragManager(
        mockConfig as any,
        mockTurfHelper as any,
        mockMap as any,
        mockStateManager as any,
        mockGetArrayOfFeatureGroups,
      );

      const mockPolygon = {
        toGeoJSON: () => ({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [100, 100],
                [100, 200],
                [200, 200],
                [200, 100],
                [100, 100],
              ],
            ],
          },
        }),
        _polydrawOriginalStructure: [
          [
            [
              { lat: 50, lng: 50 },
              { lat: 50, lng: 150 },
              { lat: 150, lng: 150 },
              { lat: 150, lng: 50 },
              { lat: 50, lng: 50 },
            ],
          ],
        ],
      };

      const mockFeatureGroup = {
        getLayers: () => [mockPolygon],
        toGeoJSON: () => mockPolygon.toGeoJSON(),
      };

      try {
        (polygonDragManager as any).updatePolygonCoordinates(
          mockPolygon,
          mockFeatureGroup,
          mockPolygon.toGeoJSON(),
        );

        expect(holeStructurePreserved).toBe(true);
        expect(capturedGeoJSON).toBeDefined();
      } finally {
        vi.doUnmock('../src/simple-polygon-operations');
      }
    });

    it('should preserve hole functionality after moving polygon - complex with holes', () => {
      const mockConfig = {
        dragPolygons: { modifierSubtract: { enabled: false } },
        modes: { dragPolygons: true },
      };
      const mockTurfHelper = {};
      const mockMap = {};
      const mockStateManager = {
        getDrawMode: () => 'Off',
        getDragState: () => ({ currentPolygon: null, isModifierKeyHeld: false }),
        startDrag: vi.fn(),
        endDrag: vi.fn(),
        setModifierKeyState: vi.fn(),
        isModifierDragActive: () => false,
      };
      const mockGetArrayOfFeatureGroups = () => [];

      let capturedGeoJSON: any = null;
      let holeStructurePreserved = false;

      const mockUpdatePolygonCoordinates = vi.fn((featureGroup: any, newGeoJSON: any) => {
        capturedGeoJSON = newGeoJSON;
        if ((newGeoJSON as any)._polydrawOriginalStructure) {
          holeStructurePreserved = true;
        }
      });

      vi.spyOn(SimplePolygonOperations.prototype, 'updatePolygonCoordinates').mockImplementation(
        mockUpdatePolygonCoordinates,
      );

      const polygonDragManager = new PolygonDragManager(
        mockConfig as any,
        mockTurfHelper as any,
        mockMap as any,
        mockStateManager as any,
        mockGetArrayOfFeatureGroups,
      );

      const mockPolygon = {
        toGeoJSON: () => ({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [30, 30],
                [30, 60],
                [60, 60],
                [60, 30],
                [30, 30],
              ],
              [
                [35, 35],
                [35, 55],
                [55, 55],
                [55, 35],
                [35, 35],
              ],
            ],
          },
        }),
        _polydrawOriginalStructure: [
          [
            [
              { lat: 0, lng: 0 },
              { lat: 0, lng: 30 },
              { lat: 30, lng: 30 },
              { lat: 30, lng: 0 },
              { lat: 0, lng: 0 },
            ],
            [
              { lat: 5, lng: 5 },
              { lat: 5, lng: 25 },
              { lat: 25, lng: 25 },
              { lat: 25, lng: 5 },
              { lat: 5, lng: 5 },
            ],
          ],
        ],
      };

      const mockFeatureGroup = {
        getLayers: () => [mockPolygon],
        toGeoJSON: () => mockPolygon.toGeoJSON(),
      };

      try {
        (polygonDragManager as any).updatePolygonCoordinates(
          mockPolygon,
          mockFeatureGroup,
          mockPolygon.toGeoJSON(),
        );

        expect(holeStructurePreserved).toBe(true);
        expect(capturedGeoJSON).toBeDefined();
      } finally {
        vi.doUnmock('../src/simple-polygon-operations');
      }
    });
  });
});
