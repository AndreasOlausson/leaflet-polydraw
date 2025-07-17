import * as L from 'leaflet';
import { DrawMode, MarkerPosition } from '../enums';
import type { Feature, Polygon, MultiPolygon } from 'geojson';

/**
 * Core coordinate interface extending Leaflet's LatLng
 */
export interface ILatLng {
  lat: number;
  lng: number;
}

/**
 * Bounding box interface for geometric calculations
 */
export interface IBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

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
  position: ILatLng;
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
  markerIcon: {
    styleClasses: string;
    zIndexOffset?: number;
  };
  markerMenuIcon: {
    styleClasses: string;
    position: MarkerPosition;
    zIndexOffset?: number;
  };
  markerDeleteIcon: {
    styleClasses: string;
    position: MarkerPosition;
    zIndexOffset?: number;
  };
  markerInfoIcon: {
    styleClasses: string;
    position: MarkerPosition;
    zIndexOffset?: number;
    useMetrics: boolean;
    areaLabel: string;
    perimeterLabel: string;
  };
  holeIcon: {
    styleClasses: string;
    zIndexOffset?: number;
  };
  zIndexOffset: number;
  coordsTitle: boolean;
  menuMarker: boolean;
  deleteMarker: boolean;
  infoMarker: boolean;
}

/**
 * Polygon style options interface
 */
export interface PolygonStyleOptions {
  color: string;
  weight: number;
  opacity: number;
  fillColor: string;
  fillOpacity: number;
  dashArray?: string;
}

/**
 * Hole style options interface
 */
export interface HoleStyleOptions {
  color: string;
  weight: number;
  opacity: number;
  dashArray?: string;
}

/**
 * Polyline style options interface
 */
export interface PolylineStyleOptions {
  color: string;
  weight: number;
  opacity: number;
  dashArray?: string;
}

/**
 * Mode configuration interface
 */
export interface ModeConfig {
  dragElbow: boolean;
  dragPolygons: boolean;
  attachElbow: boolean;
}

/**
 * Drag polygon configuration interface
 */
export interface DragPolygonConfig {
  enabled: boolean;
  opacity: number;
  hoverCursor: string;
  dragCursor: string;
  markerBehavior: 'hide' | 'show' | 'fade';
  markerAnimationDuration: number;
  autoMergeOnIntersect: boolean;
  autoHoleOnContained: boolean;
  modifierSubtract: {
    enabled: boolean;
    subtractColor: string;
    hideMarkersOnDrag: boolean;
  };
}

/**
 * Complete Polydraw configuration interface
 */
export interface PolydrawConfig {
  kinks: boolean;
  mergePolygons: boolean;
  visualOptimizationLevel: number;
  polygonOptions: PolygonStyleOptions;
  holeOptions: HoleStyleOptions;
  polyLineOptions: PolylineStyleOptions;
  markers: MarkerOptions;
  modes: ModeConfig;
  dragPolygons: DragPolygonConfig;
  units: {
    metric: boolean;
    imperial: boolean;
  };
  precision: {
    area: number;
    perimeter: number;
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

/**
 * Polygon information interface
 */
export interface PolygonInfo {
  id: string;
  polygon: ILatLng[][];
  area: number;
  perimeter: number;
  hasHoles: boolean;
  holeCount: number;
  centroid: ILatLng;
  bounds: IBounds;
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
  startPosition: ILatLng | null;
  currentPosition: ILatLng | null;
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
    startPosition: ILatLng | null;
    startLatLngs: any;
  };
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
    startPoint: ILatLng;
    endPoint: ILatLng;
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
