/**
 * Type helper to extract values from const objects
 */
type ValueOf<T> = T[keyof T];

/**
 * Leaflet version compatibility constants
 */
export const leafletVersion = {
  V1: '1.x',
  V2: '2.x',
} as const;

export type LeafletVersion = ValueOf<typeof leafletVersion>;

/**
 * Drawing modes in Polydraw - JavaScript compatible const object
 */
export const drawMode = {
  Off: 0,
  Add: 1,
  Edit: 2,
  Subtract: 4,
  AppendMarker: 8,
  LoadPredefined: 16,
  PointToPoint: 32,
} as const;

export type DrawMode = ValueOf<typeof drawMode>;

/**
 * Marker positions - JavaScript compatible const object
 */
export const markerPosition = {
  SouthWest: 0,
  South: 1,
  SouthEast: 2,
  East: 3,
  NorthEast: 4,
  North: 5,
  NorthWest: 6,
  West: 7,
  Hole: 8,
  // CenterOfMass: 9,
  // BoundingBoxCenter: 10
} as const;

export type MarkerPosition = ValueOf<typeof markerPosition>;

// Legacy enum exports for backward compatibility (deprecated)
/**
 * @deprecated Use `drawMode` const object instead. This enum will be removed in v2.0.0
 */
export enum DrawModeEnum {
  Off = 0,
  Add = 1,
  Edit = 2,
  Subtract = 4,
  AppendMarker = 8,
  LoadPredefined = 16,
  PointToPoint = 32,
}

/**
 * @deprecated Use `markerPosition` const object instead. This enum will be removed in v2.0.0
 */
export enum MarkerPositionEnum {
  SouthWest = 0,
  South = 1,
  SouthEast = 2,
  East = 3,
  NorthEast = 4,
  North = 5,
  NorthWest = 6,
  West = 7,
  Hole = 8,
  // CenterOfMass = 9,
  // BoundingBoxCenter = 10
}

/**
 * @deprecated Use `leafletVersion` const object instead. This enum will be removed in v2.0.0
 */
export enum LeafletVersionEnum {
  V1 = '1.x',
  V2 = '2.x',
}
