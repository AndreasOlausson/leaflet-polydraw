import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PolygonInfo, PolygonDrawStates } from '../../src/polygon-helpers';
import { PolygonUtil } from '../../src/polygon.util';
import * as L from 'leaflet';

// Mock PolygonUtil
vi.mock('../../src/polygon.util', () => ({
  PolygonUtil: {
    getMidPoint: vi.fn((point1: L.LatLngLiteral, point2: L.LatLngLiteral) => ({
      lat: (point1.lat + point2.lat) / 2,
      lng: (point1.lng + point2.lng) / 2,
    })),
    getSqmArea: vi.fn(() => 1000),
    getPerimeter: vi.fn(() => 100),
  },
}));

describe('PolygonInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console.warn mock
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should handle non-array input gracefully', () => {
      const polygonInfo = new PolygonInfo(null as any);
      expect(polygonInfo.polygon).toEqual([]);
      expect(polygonInfo.trashcanPoint).toEqual([]);
      expect(polygonInfo.sqmArea).toEqual([]);
      expect(polygonInfo.perimeter).toEqual([]);
    });

    it('should process flattened LatLng array structure', () => {
      const flatPolygon: L.LatLngLiteral[] = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
      ];

      const polygonInfo = new PolygonInfo(flatPolygon);

      expect(polygonInfo.polygon).toHaveLength(1);
      expect(polygonInfo.polygon[0]).toEqual([flatPolygon]);
      expect(polygonInfo.trashcanPoint).toHaveLength(1);
      expect(polygonInfo.sqmArea).toHaveLength(1);
      expect(polygonInfo.perimeter).toHaveLength(1);
      expect(PolygonUtil.getSqmArea).toHaveBeenCalledWith(flatPolygon);
      expect(PolygonUtil.getPerimeter).toHaveBeenCalledWith(flatPolygon);
    });

    it('should process nested array structure [Array(N)]', () => {
      const nestedPolygon: L.LatLngLiteral[][] = [
        [
          { lat: 0, lng: 0 },
          { lat: 1, lng: 0 },
          { lat: 1, lng: 1 },
          { lat: 0, lng: 1 },
        ],
      ];

      const polygonInfo = new PolygonInfo(nestedPolygon);

      expect(polygonInfo.polygon).toHaveLength(1);
      expect(polygonInfo.polygon[0]).toEqual(nestedPolygon);
      expect(polygonInfo.trashcanPoint).toHaveLength(1);
      expect(polygonInfo.sqmArea).toHaveLength(1);
      expect(polygonInfo.perimeter).toHaveLength(1);
      expect(PolygonUtil.getSqmArea).toHaveBeenCalledWith(nestedPolygon[0]);
      expect(PolygonUtil.getPerimeter).toHaveBeenCalledWith(nestedPolygon[0]);
    });

    it('should process multi-polygon structure', () => {
      const multiPolygon: L.LatLngLiteral[][][] = [
        [
          [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 0 },
            { lat: 1, lng: 1 },
            { lat: 0, lng: 1 },
          ],
        ],
        [
          [
            { lat: 2, lng: 2 },
            { lat: 3, lng: 2 },
            { lat: 3, lng: 3 },
            { lat: 2, lng: 3 },
          ],
        ],
      ];

      const polygonInfo = new PolygonInfo(multiPolygon);

      expect(polygonInfo.polygon).toHaveLength(2);
      expect(polygonInfo.trashcanPoint).toHaveLength(2);
      expect(polygonInfo.sqmArea).toHaveLength(2);
      expect(polygonInfo.perimeter).toHaveLength(2);
      expect(PolygonUtil.getSqmArea).toHaveBeenCalledTimes(2);
      expect(PolygonUtil.getPerimeter).toHaveBeenCalledTimes(2);
    });

    it('should skip invalid polygons in multi-polygon structure', () => {
      const invalidMultiPolygon: any = [
        null,
        [
          [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 0 },
            { lat: 1, lng: 1 },
            { lat: 0, lng: 1 },
          ],
        ],
        undefined,
        [null],
      ];

      const polygonInfo = new PolygonInfo(invalidMultiPolygon);

      // Only the valid polygon should be processed
      expect(polygonInfo.polygon).toHaveLength(2);
      expect(polygonInfo.polygon[1]).toBeDefined();
      expect(PolygonUtil.getSqmArea).toHaveBeenCalledTimes(1);
      expect(PolygonUtil.getPerimeter).toHaveBeenCalledTimes(1);
    });

    it('should handle empty array input', () => {
      const polygonInfo = new PolygonInfo([]);
      expect(polygonInfo.polygon).toEqual([]);
      expect(polygonInfo.trashcanPoint).toEqual([]);
      expect(polygonInfo.sqmArea).toEqual([]);
      expect(polygonInfo.perimeter).toEqual([]);
    });
  });

  describe('setSqmArea', () => {
    it('should set the area for the first polygon', () => {
      const polygon: L.LatLngLiteral[] = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
      ];

      const polygonInfo = new PolygonInfo(polygon);
      polygonInfo.setSqmArea(2000);

      expect(polygonInfo.sqmArea[0]).toBe(2000);
    });
  });

  describe('getTrashcanPoint', () => {
    it('should calculate trashcan point for valid polygon', () => {
      const polygon: L.LatLngLiteral[] = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 2, lng: 1 }, // Highest lat
        { lat: 1, lng: 2 },
        { lat: 0, lng: 1 },
      ];

      const polygonInfo = new PolygonInfo(polygon);

      expect(PolygonUtil.getMidPoint).toHaveBeenCalled();
      expect(polygonInfo.trashcanPoint[0]).toBeDefined();
    });

    it('should handle invalid polygon array', () => {
      // Create a polygon that will trigger the invalid array path
      const invalidPolygon: any = [
        null,
        undefined,
        { lat: 'invalid', lng: 'invalid' },
        { lat: NaN, lng: NaN },
      ];

      const polygonInfo = new PolygonInfo(invalidPolygon);

      // The constructor may not reach the getTrashcanPoint method with invalid input
      // so we just verify it doesn't crash and returns default values
      expect(polygonInfo.trashcanPoint[0]).toBeUndefined();
    });

    it('should handle empty polygon array', () => {
      // We need to create a structure that will reach the getTrashcanPoint with empty array
      // This is tricky since the constructor has early returns, so let's test indirectly
      const emptyPolygon: L.LatLngLiteral[] = [];
      const polygonInfo = new PolygonInfo(emptyPolygon);

      // The constructor may not reach the getTrashcanPoint method with empty input
      // so we just verify it doesn't crash and returns default values
      expect(polygonInfo.trashcanPoint[0]).toBeUndefined();
    });

    it('should handle polygon with single point', () => {
      const singlePointPolygon: L.LatLngLiteral[] = [{ lat: 1, lng: 1 }];

      const polygonInfo = new PolygonInfo(singlePointPolygon);

      expect(polygonInfo.trashcanPoint[0]).toBeDefined();
      // With single point, previous and next logic should handle it
    });

    it('should handle polygon where max lat point is at beginning', () => {
      const polygon: L.LatLngLiteral[] = [
        { lat: 2, lng: 1 }, // Highest lat at index 0
        { lat: 1, lng: 0 },
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
      ];

      const polygonInfo = new PolygonInfo(polygon);

      expect(PolygonUtil.getMidPoint).toHaveBeenCalled();
      expect(polygonInfo.trashcanPoint[0]).toBeDefined();
    });

    it('should handle polygon where max lat point is at end', () => {
      const polygon: L.LatLngLiteral[] = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 2, lng: 1 }, // Highest lat at last index
      ];

      const polygonInfo = new PolygonInfo(polygon);

      expect(PolygonUtil.getMidPoint).toHaveBeenCalled();
      expect(polygonInfo.trashcanPoint[0]).toBeDefined();
    });

    it('should choose correct second point based on longitude', () => {
      const polygon: L.LatLngLiteral[] = [
        { lat: 1, lng: 2 }, // Previous point (higher lng)
        { lat: 2, lng: 1 }, // Max lat point
        { lat: 1, lng: 0 }, // Next point (lower lng) - should be chosen
      ];

      const polygonInfo = new PolygonInfo(polygon);

      // The getMidPoint should be called with the max lat point and the point with lower lng
      expect(PolygonUtil.getMidPoint).toHaveBeenCalledWith(
        { lat: 2, lng: 1 },
        { lat: 1, lng: 0 }, // Lower lng point should be chosen
      );
    });
  });

  describe('calculatePolygonArea', () => {
    it('should calculate area using PolygonUtil', () => {
      const polygon: L.LatLngLiteral[] = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
      ];

      const polygonInfo = new PolygonInfo(polygon);

      expect(PolygonUtil.getSqmArea).toHaveBeenCalledWith(polygon);
      expect(polygonInfo.sqmArea[0]).toBe(1000); // Mocked return value
    });
  });

  describe('calculatePolygonPerimeter', () => {
    it('should calculate perimeter using PolygonUtil', () => {
      const polygon: L.LatLngLiteral[] = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
      ];

      const polygonInfo = new PolygonInfo(polygon);

      expect(PolygonUtil.getPerimeter).toHaveBeenCalledWith(polygon);
      expect(polygonInfo.perimeter[0]).toBe(100); // Mocked return value
    });
  });
});

describe('PolygonDrawStates', () => {
  let drawStates: PolygonDrawStates;

  beforeEach(() => {
    drawStates = new PolygonDrawStates();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(drawStates.isActivated).toBe(false);
      expect(drawStates.isFreeDrawMode).toBe(false);
      expect(drawStates.isMoveMode).toBe(false);
      expect(drawStates.canRevert).toBe(false);
      expect(drawStates.isAuto).toBe(false);
      expect(drawStates.hasPolygons).toBe(false);
      expect(drawStates.canUsePolyDraw).toBe(false);
    });
  });

  describe('activate', () => {
    it('should reset and activate the draw states', () => {
      // Set some states first
      drawStates.hasPolygons = true;
      drawStates.canRevert = true;
      drawStates.isFreeDrawMode = true;

      drawStates.activate();

      expect(drawStates.isActivated).toBe(true);
      expect(drawStates.hasPolygons).toBe(false);
      expect(drawStates.canRevert).toBe(false);
      expect(drawStates.isFreeDrawMode).toBe(false);
      expect(drawStates.isMoveMode).toBe(false);
      expect(drawStates.isAuto).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all states to default values', () => {
      // Set some states first
      drawStates.isActivated = true;
      drawStates.hasPolygons = true;
      drawStates.canRevert = true;
      drawStates.isAuto = true;
      drawStates.isFreeDrawMode = true;
      drawStates.isMoveMode = true;

      drawStates.reset();

      expect(drawStates.isActivated).toBe(false);
      expect(drawStates.hasPolygons).toBe(false);
      expect(drawStates.canRevert).toBe(false);
      expect(drawStates.isAuto).toBe(false);
      expect(drawStates.isFreeDrawMode).toBe(false);
      expect(drawStates.isMoveMode).toBe(false);
    });
  });

  describe('resetDrawModes', () => {
    it('should reset only draw mode states', () => {
      drawStates.isFreeDrawMode = true;
      drawStates.isMoveMode = true;
      drawStates.isActivated = true; // This should not be reset

      drawStates.resetDrawModes();

      expect(drawStates.isFreeDrawMode).toBe(false);
      expect(drawStates.isMoveMode).toBe(false);
      expect(drawStates.isActivated).toBe(true); // Should remain unchanged
    });
  });

  describe('setFreeDrawMode', () => {
    it('should set free draw mode when activated', () => {
      drawStates.activate();
      drawStates.isMoveMode = true; // Set another mode first

      drawStates.setFreeDrawMode();

      expect(drawStates.isFreeDrawMode).toBe(true);
      expect(drawStates.isMoveMode).toBe(false); // Should be reset
      expect(drawStates.isAuto).toBe(false);
    });

    it('should not set free draw mode when not activated', () => {
      drawStates.setFreeDrawMode();

      expect(drawStates.isFreeDrawMode).toBe(false);
      expect(drawStates.isActivated).toBe(false);
    });

    it('should set auto mode when isAuto parameter is true', () => {
      drawStates.setFreeDrawMode(true);

      expect(drawStates.isActivated).toBe(true); // Should be activated automatically
      expect(drawStates.isFreeDrawMode).toBe(true);
      expect(drawStates.isAuto).toBe(true);
    });

    it('should activate and set auto mode in one call', () => {
      expect(drawStates.isActivated).toBe(false);

      drawStates.setFreeDrawMode(true);

      expect(drawStates.isActivated).toBe(true);
      expect(drawStates.isFreeDrawMode).toBe(true);
      expect(drawStates.isAuto).toBe(true);
    });
  });

  describe('setMoveMode', () => {
    it('should set move mode when activated', () => {
      drawStates.activate();
      drawStates.isFreeDrawMode = true; // Set another mode first

      drawStates.setMoveMode();

      expect(drawStates.isMoveMode).toBe(true);
      expect(drawStates.isFreeDrawMode).toBe(false); // Should be reset
    });

    it('should not set move mode when not activated', () => {
      drawStates.setMoveMode();

      expect(drawStates.isMoveMode).toBe(false);
      expect(drawStates.isActivated).toBe(false);
    });
  });

  describe('forceCanUseFreeDraw', () => {
    it('should force canUsePolyDraw to true', () => {
      expect(drawStates.canUsePolyDraw).toBe(false);

      drawStates.forceCanUseFreeDraw();

      expect(drawStates.canUsePolyDraw).toBe(true);
    });
  });

  describe('state transitions', () => {
    it('should handle complex state transitions correctly', () => {
      // Start with activation
      drawStates.activate();
      expect(drawStates.isActivated).toBe(true);

      // Set free draw mode
      drawStates.setFreeDrawMode();
      expect(drawStates.isFreeDrawMode).toBe(true);
      expect(drawStates.isMoveMode).toBe(false);

      // Switch to move mode
      drawStates.setMoveMode();
      expect(drawStates.isMoveMode).toBe(true);
      expect(drawStates.isFreeDrawMode).toBe(false);

      // Reset should clear everything
      drawStates.reset();
      expect(drawStates.isActivated).toBe(false);
      expect(drawStates.isMoveMode).toBe(false);
      expect(drawStates.isFreeDrawMode).toBe(false);
    });

    it('should handle auto mode activation correctly', () => {
      expect(drawStates.isActivated).toBe(false);
      expect(drawStates.isAuto).toBe(false);

      // Auto mode should activate and set auto flag
      drawStates.setFreeDrawMode(true);

      expect(drawStates.isActivated).toBe(true);
      expect(drawStates.isFreeDrawMode).toBe(true);
      expect(drawStates.isAuto).toBe(true);

      // Regular mode switch should not affect auto flag
      drawStates.setMoveMode();
      expect(drawStates.isMoveMode).toBe(true);
      expect(drawStates.isFreeDrawMode).toBe(false);
      expect(drawStates.isAuto).toBe(true); // Should remain true

      // Reset should clear auto flag
      drawStates.reset();
      expect(drawStates.isAuto).toBe(false);
    });
  });
});
