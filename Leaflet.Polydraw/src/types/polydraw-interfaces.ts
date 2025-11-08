import * as L from 'leaflet';
import { DrawMode, MarkerPosition } from '../enums';
import type { Feature, Polygon, MultiPolygon, Position } from 'geojson';

export type { Position };

/**
 * Bounding box data structure compatible with Leaflet's LatLngBounds
 * Uses Leaflet's naming convention: south/north for latitude, west/east for longitude
 */
export type BoundsLiteral = {
  south: number;
  north: number;
  west: number;
  east: number;
};

/**
 * Configuration interface for auto-polygon options
 */
export interface AutoPolygonOptions {
  visualOptimizationLevel?: number; // 0-10, where 0 = no optimization, 10 = maximum optimization
  mergeOnAdd?: boolean;
  simplifyOnAdd?: boolean;
}

/**
 * Marker configuration interface
 */
export interface MarkerConfig {
  type: 'standard' | 'menu' | 'delete' | 'info' | 'hole';
  position: L.LatLngLiteral;
  draggable: boolean;
  zIndex: number;
  styleClasses: string;
  title?: string;
  visible?: boolean;
}

/**
 * Marker options for different marker types
 */
export interface MarkerOptions {
  deleteMarker: boolean;
  infoMarker: boolean;
  menuMarker: boolean;
  coordsTitle: boolean;
  zIndexOffset: number;
  markerIcon: {
    styleClasses: string | string[];
    zIndexOffset: number | null;
  };
  holeIcon: {
    styleClasses: string | string[];
    zIndexOffset: number | null;
  };
  markerInfoIcon: {
    position: MarkerPosition;
    showArea: boolean;
    showPerimeter: boolean;
    useMetrics: boolean;
    usePerimeterMinValue: boolean;
    areaLabel: string;
    perimeterLabel: string;
    values: {
      min: {
        metric: string;
        imperial: string;
      };
      unknown: {
        metric: string;
        imperial: string;
      };
    };
    units: {
      unknownUnit: string;
      metric: {
        onlyMetrics: boolean;
        perimeter: {
          m: string;
          km: string;
        };
        area: {
          m2: string;
          km2: string;
          daa: string;
          ha: string;
        };
      };
      imperial: {
        perimeter: {
          feet: string;
          yards: string;
          miles: string;
        };
        area: {
          feet2: string;
          yards2: string;
          acres: string;
          miles2: string;
        };
      };
    };
    styleClasses: string | string[];
    zIndexOffset: number;
  };
  markerMenuIcon: {
    position: MarkerPosition;
    styleClasses: string | string[];
    zIndexOffset: number;
  };
  markerDeleteIcon: {
    position: MarkerPosition;
    styleClasses: string | string[];
    zIndexOffset: number;
  };
  holeMarkers: {
    menuMarker: boolean;
    deleteMarker: boolean;
    infoMarker: boolean;
  };
  visualOptimization: {
    sharpAngleThreshold: number;
    thresholdBoundingBox: number;
    thresholdDistance: number;
    useDistance: boolean;
    useBoundingBox: boolean;
    useAngles: boolean;
  };
}

/**
 * Polygon style options interface
 */
export interface PolygonStyleOptions {
  weight: number;
  opacity: number;
  fillOpacity: number;
  dashArray?: string;
}

/**
 * Hole style options interface
 */
export interface HoleStyleOptions {
  weight: number;
  opacity: number;
  fillOpacity: number;
  dashArray?: string;
}

export type SimplificationMode = 'simple' | 'dynamic' | 'none';

export interface LegacySimplificationOptions {
  mode?: string;
  tolerance?: number;
  highQuality?: boolean;
}

export interface SimplificationSimpleOptions {
  tolerance: number;
  highQuality: boolean;
}

export interface SimplificationDynamicOptions {
  baseTolerance: number;
  highQuality: boolean;
  fractionGuard: number;
  multiplier: number;
}

export interface SimplificationConfig {
  mode: SimplificationMode;
  simple: SimplificationSimpleOptions;
  dynamic: SimplificationDynamicOptions;
}

/**
 * Polyline style options interface
 */
export interface PolylineStyleOptions {
  weight: number;
  opacity: number;
  dashArray?: string;
}

/**
 * Mode configuration interface
 */
export interface ModeConfig {
  draw: boolean;
  subtract: boolean;
  deleteAll: boolean;
  p2p: boolean;
  p2pSubtract: boolean;
  dragElbow: boolean;
  dragPolygons: boolean;
  attachElbow: boolean;
  edgeDeletion: boolean;
}

/**
 * Drag polygon configuration interface
 */
export interface DragPolygonConfig {
  opacity: number;
  hoverCursor: string;
  dragCursor: string;
  markerBehavior: 'hide' | 'show' | 'fade';
  markerAnimationDuration: number;
  modifierSubtract: {
    keys: {
      windows: string;
      mac: string;
      linux: string;
    };
    hideMarkersOnDrag: boolean;
  };
}

/**
 * Edge deletion configuration interface
 */
export interface EdgeDeletionConfig {
  keys: {
    windows: string;
    mac: string;
    linux: string;
  };
  minVertices: number;
}

/**
 * Menu operations configuration interface
 */
export interface MenuOperationsConfig {
  simplify: {
    enabled: boolean;
    processHoles: boolean;
  };
  doubleElbows: {
    enabled: boolean;
    processHoles: boolean;
  };
  bbox: {
    enabled: boolean;
    processHoles: boolean;
  };
  bezier: {
    enabled: boolean;
  };
  scale: {
    enabled: boolean;
  };
  rotate: {
    enabled: boolean;
  };
}

/**
 * Complete Polydraw configuration interface
 */
export interface PolydrawConfig {
  kinks: boolean;
  mergePolygons: boolean;
  modes: ModeConfig;
  defaultMode: DrawMode;
  dragPolygons: DragPolygonConfig;
  edgeDeletion: EdgeDeletionConfig;
  markers: MarkerOptions;
  polyLineOptions: PolylineStyleOptions;
  subtractLineOptions: PolylineStyleOptions;
  polygonOptions: {
    weight: number;
    opacity: number;
    fillOpacity: number;
    smoothFactor: number;
    noClip: boolean;
  };
  holeOptions: HoleStyleOptions;
  polygonCreation: {
    method: string;
    simplification?: LegacySimplificationOptions;
  };
  simplification: SimplificationConfig;
  menuOperations: MenuOperationsConfig;
  boundingBox: {
    addMidPointMarkers: boolean;
  };
  bezier: {
    resolution: number;
    sharpness: number;
  };
  colors: {
    dragPolygons: {
      subtract: string;
    };
    p2p: {
      closingMarker: string;
    };
    edgeHover: string;
    edgeDeletion: {
      hover: string;
    };
    polyline: string;
    subtractLine: string;
    polygon: {
      border: string;
      fill: string;
    };
    hole: {
      border: string;
      fill: string;
    };
    styles: {
      controlButton: {
        backgroundColor: string;
        color: string;
      };
      controlButtonHover: {
        backgroundColor: string;
      };
      controlButtonActive: {
        backgroundColor: string;
        color: string;
      };
      indicatorActive: {
        backgroundColor: string;
      };
      p2pMarker: {
        backgroundColor: string;
        borderColor: string;
      };
    };
  };
}

/**
 * Event handler function types
 */
export type DrawModeChangeHandler = (mode: DrawMode) => void;
export type MouseEventHandler = (event: L.LeafletMouseEvent) => void;
export type TouchEventHandler = (event: TouchEvent) => void;
export type MarkerEventHandler = (event: L.LeafletEvent) => void;
export type PolygonEventHandler = (event: L.LeafletEvent) => void;

export type PolydrawEvent =
  | 'polydraw:ready'
  | 'polydraw:start'
  | 'polydraw:stop'
  | 'polydraw:mode:change'
  | 'polydraw:polygon:created'
  | 'polydraw:polygon:updated'
  | 'polydraw:polygon:deleted'
  | 'polydraw:marker:click'
  | 'polydraw:marker:dragstart'
  | 'polydraw:marker:dragend'
  | 'polydraw:draw:cancel'
  | 'polydraw:menu:action'
  | 'polydraw:check:intersection'
  | 'polydraw:subtract';

export type PolydrawEventData =
  | undefined
  | DrawMode
  | MenuActionData
  | IntersectionAnalysis
  | PolygonUpdatedEventData
  | GeometricOperationResult
  | { id?: string; polygon?: Feature<Polygon | MultiPolygon> }
  | L.LeafletEvent;

export type PolydrawEventCallback = (data?: PolydrawEventData) => void;

/**
 * Data interface for menu actions
 */
export interface MenuActionData {
  action: 'simplify' | 'bbox' | 'doubleElbows' | 'bezier';
  latLngs: L.LatLngLiteral[];
  featureGroup: L.FeatureGroup;
}

export interface PolygonUpdatedEventData {
  operation: string;
  polygon: Feature<Polygon | MultiPolygon>;
  allowMerge?: boolean;
  intelligentMerge?: boolean;
  optimizationLevel?: number;
}

/**
 * Polygon information interface
 */
export interface PolygonInfo {
  id: string;
  polygon: L.LatLngLiteral[][];
  area: number;
  perimeter: number;
  hasHoles: boolean;
  holeCount: number;
  centroid: L.LatLngLiteral;
  bounds: BoundsLiteral;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Geometric operation result interface
 */
export interface GeometricOperationResult {
  success: boolean;
  result?: Feature<Polygon | MultiPolygon>;
  error?: string;
}

/**
 * Marker visibility calculation result
 */
export interface MarkerVisibilityResult {
  visibleMarkers: number[];
  hiddenMarkers: number[];
  optimizationLevel: number;
  totalMarkers: number;
}

/**
 * Polygon intersection analysis result
 */
export interface IntersectionAnalysis {
  hasIntersection: boolean;
  intersectionType: 'none' | 'partial' | 'complete' | 'contains' | 'contained';
  intersectionArea?: number;
  shouldMerge: boolean;
  shouldCreateHole: boolean;
}

/**
 * Drag operation state interface
 */
export interface DragState {
  isDragging: boolean;
  startPosition: L.LatLngLiteral | null;
  currentPosition: L.LatLngLiteral | null;
  draggedPolygon: L.Polygon | null;
  modifierKeyHeld: boolean;
  dragMode: 'move' | 'subtract';
}

/**
 * Feature group with metadata interface
 */
export interface PolydrawFeatureGroup extends L.FeatureGroup {
  _polydrawMetadata?: {
    id: string;
    optimizationLevel: number;
    hasHoles: boolean;
    createdAt: Date;
    lastModified: Date;
  };
}

/**
 * Enhanced polygon with metadata interface
 */
export interface PolydrawPolygon extends L.Polygon {
  _polydrawOptimizationLevel?: number;
  _polydrawHasHoles?: boolean;
  _polydrawFeatureGroup?: PolydrawFeatureGroup;
  _polydrawLatLngs?: Feature<Polygon | MultiPolygon>;
  _polydrawDragData?: {
    isDragging: boolean;
    startPosition: L.LatLngLiteral | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startLatLngs?: any;
    originalOpacity?: number;
  };
  /**
   * Original marker positions before drag, keyed by marker instance.
   */
  _polydrawOriginalMarkerPositions?: Map<L.Marker, L.LatLng>;
  /**
   * Original hole polyline positions before drag, keyed by polyline instance.
   */
  _polydrawOriginalHoleLinePositions?: Map<L.Polyline, L.LatLng[]>;
  /**
   * Identifier for the current drag session, if any.
   */
  _polydrawCurrentDragSession?: string;
  /**
   * Original GeoJSON coordinates before drag, if any.
   */
  _polydrawOriginalLatLngs?: Feature<Polygon | MultiPolygon>;
}

/**
 * Enhanced marker with metadata interface
 */
export interface PolydrawMarker extends L.Marker {
  _polydrawType?: 'standard' | 'menu' | 'delete' | 'info' | 'hole';
  _polydrawVisible?: boolean;
  _polydrawImportance?: number;
}

/**
 * Enhanced polyline with edge metadata interface
 */
export interface PolydrawEdgePolyline extends L.Polyline {
  _polydrawEdgeInfo?: {
    ringIndex: number;
    edgeIndex: number;
    startPoint: L.LatLngLiteral;
    endPoint: L.LatLngLiteral;
    parentPolygon: L.Polygon;
    parentFeatureGroup: L.FeatureGroup;
  };
}

/**
 * Compass direction interface
 */
export interface CompassDirection {
  lat: number;
  lng: number;
  direction: string;
}

/**
 * Area calculation result interface
 */
export interface AreaResult {
  sqm: number;
  sqft: number;
  hectares: number;
  acres: number;
  metricArea: string;
  imperialArea: string;
  metricUnit: string;
  imperialUnit: string;
}

/**
 * Perimeter calculation result interface
 */
export interface PerimeterResult {
  meters: number;
  feet: number;
  kilometers: number;
  miles: number;
  metricLength: string;
  imperialLength: string;
  metricUnit: string;
  imperialUnit: string;
}

/**
 * Point importance calculation result
 */
export interface PointImportance {
  index: number;
  importance: number;
  angularDeviation: number;
  distanceFromLine: number;
  isExtreme: boolean;
  distanceFromCentroid: number;
}

/**
 * Simplification options interface
 */
export interface SimplificationOptions {
  tolerance: number;
  highQuality: boolean;
  dynamicTolerance: boolean;
}

/**
 * Bezier curve options interface
 */
export interface BezierOptions {
  resolution: number;
  sharpness: number;
}

/**
 * Union operation options interface
 */
export interface UnionOptions {
  tolerance: number;
  preserveHoles: boolean;
}

/**
 * Difference operation options interface
 */
export interface DifferenceOptions {
  tolerance: number;
  createHoles: boolean;
}
