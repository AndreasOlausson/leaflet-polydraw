/**
 * Application constants organized by category
 * Centralized location for all hardcoded values used throughout the application
 */

// =============================================================================
// PHYSICAL CONSTANTS
// =============================================================================

/**
 * Earth radius values for distance and area calculations
 */
export const EARTH_RADIUS = {
  /**
   * Mean radius in meters - good enough for this tool's precision requirements
   * Used for distance calculations and area conversions
   */
  MEAN_METERS: 6371000,

  /** Mean radius in kilometers */
  MEAN_KILOMETERS: 6371,

  /** Mean radius in miles */
  MEAN_MILES: 3959,

  // WGS84 ellipsoid values (more precise but overkill for this application)
  // WGS84_SEMI_MAJOR_AXIS: 6378137.0,      // meters
  // WGS84_SEMI_MINOR_AXIS: 6356752.314245, // meters
  // WGS84_FLATTENING: 1 / 298.257223563,
} as const;

// =============================================================================
// MATHEMATICAL CONSTANTS
// =============================================================================

/**
 * Mathematical conversion factors and common values
 */
export const MATH = {
  /** Degrees to radians conversion factor */
  DEG_TO_RAD: Math.PI / 180,

  /** Radians to degrees conversion factor */
  RAD_TO_DEG: 180 / Math.PI,

  /** Full circle in degrees */
  FULL_CIRCLE_DEGREES: 360,

  /** Full circle in radians */
  FULL_CIRCLE_RADIANS: 2 * Math.PI,
} as const;

// =============================================================================
// PRECISION & TOLERANCE CONSTANTS
// =============================================================================

/**
 * Precision values for coordinate comparisons and geometric calculations
 */
export const PRECISION = {
  /** Default decimal places for coordinate precision */
  COORDINATE_DECIMAL_PLACES: 6,

  /** Tolerance for floating point coordinate comparisons */
  COORDINATE_TOLERANCE: 1e-6,

  /** Tolerance for area calculations (square meters) */
  AREA_TOLERANCE: 0.01,

  /** Tolerance for distance calculations (meters) */
  DISTANCE_TOLERANCE: 0.01,
} as const;

// =============================================================================
// GEOMETRY DEFAULTS
// =============================================================================

/**
 * Default values for geometric operations
 */
export const GEOMETRY_DEFAULTS = {
  /** Default simplification tolerance for polygon simplification */
  SIMPLIFY_TOLERANCE: 0.01,

  /** Minimum number of points required for a valid polygon */
  MIN_POLYGON_POINTS: 3,

  /** Default buffer distance for polygon operations (meters) */
  DEFAULT_BUFFER_DISTANCE: 10,
} as const;

// =============================================================================
// UNITS
// =============================================================================

/**
 * Supported unit types for various calculations
 */
export const UNITS = {
  DISTANCE: ['kilometers', 'miles', 'meters'] as const,
  AREA: ['square-meters', 'square-kilometers', 'hectares', 'acres'] as const,
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Type for supported distance units */
export type DistanceUnit = (typeof UNITS.DISTANCE)[number];

/** Type for supported area units */
export type AreaUnit = (typeof UNITS.AREA)[number];
