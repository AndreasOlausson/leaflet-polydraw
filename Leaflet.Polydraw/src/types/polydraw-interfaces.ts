import * as L from 'leaflet';
import { DonutDirection, DrawMode, MarkerPosition } from '../enums';
import type { Feature, Polygon, MultiPolygon, Position } from 'geojson';
import type {
  PolydrawEvent as ManagerPolydrawEvent,
  PolydrawEventCallback as ManagerPolydrawEventCallback,
  PolydrawEventPayloads,
} from '../managers/event-manager';

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
  visualOptimization?: {
    toleranceMin?: number;
    toleranceMax?: number;
    curve?: number;
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

/**
 * Unified styles configuration interface
 */
export interface PolylineStyle {
  weight: number;
  opacity: number;
  color: string;
  dashArray?: string;
}

export interface PolygonStyle {
  weight: number;
  opacity: number;
  fillOpacity: number;
  smoothFactor: number;
  noClip: boolean;
  color: string;
  fillColor: string;
}

export interface HoleStyle {
  weight: number;
  opacity: number;
  fillOpacity: number;
  color: string;
  fillColor: string;
  dashArray?: string;
}

export interface UIStyles {
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
  p2pClosingMarker: {
    color: string;
  };
  edgeHover: {
    color: string;
  };
  edgeDeletion: {
    color: string;
  };
  dragSubtract: {
    color: string;
  };
}

export interface StylesConfig {
  polyline: PolylineStyle;
  subtractLine: PolylineStyle;
  polygon: PolygonStyle;
  hole: HoleStyle;
  ui: UIStyles;
}

export type PolygonCreationAlgorithm = 'concaveman' | 'convex' | 'direct';
export type SimplificationStrategy = 'simple' | 'dynamic' | 'none';
export type ModifierKey = 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey';
export type EraseScope = 'all' | 'defaultLayer';

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
  strategy: SimplificationStrategy;
  simple: SimplificationSimpleOptions;
  dynamic: SimplificationDynamicOptions;
}

/**
 * Tool configuration interface (user-selectable modes)
 */
export interface ToolConfig {
  default: DrawMode;
  draw: boolean;
  subtract: boolean;
  p2p: boolean;
  p2pSubtract: boolean;
  clone: boolean;
  erase: boolean;
  eraseScope?: EraseScope;
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
      windows: ModifierKey;
      mac: ModifierKey;
      linux: ModifierKey;
    };
    hideMarkersOnDrag: boolean;
  };
}

/**
 * Edge deletion configuration interface
 */
export interface EdgeDeletionConfig {
  keys: {
    windows: ModifierKey;
    mac: ModifierKey;
    linux: ModifierKey;
  };
  minVertices: number;
}

/**
 * Interaction configuration interface (drag + edge deletion)
 */
export interface InteractionConfig {
  drag: DragPolygonConfig;
  edgeDeletion: EdgeDeletionConfig;
}

/**
 * Polygon tools configuration interface (per-polygon operations)
 */
export interface PolygonMenuActionContext {
  polygon: Feature<Polygon | MultiPolygon>;
  featureGroup: L.FeatureGroup;
  bounds: L.LatLngBounds;
}

export type PolygonMenuActionResult =
  | Feature<Polygon | MultiPolygon>
  | {
      polygon: Feature<Polygon | MultiPolygon>;
      allowMerge?: boolean;
      simplify?: boolean;
      metadata?: Record<string, unknown>;
    }
  | null
  | undefined;

export interface PolygonMenuAction {
  id: string;
  label: string;
  apply: (
    ctx: PolygonMenuActionContext,
  ) => PolygonMenuActionResult | Promise<PolygonMenuActionResult>;
  className?: string | string[];
  visible?: (ctx: PolygonMenuActionContext) => boolean;
  history?: boolean;
}

export interface PolygonToolsConfig {
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
    addMidPointMarkers: boolean;
  };
  bezier: {
    enabled: boolean;
    resolution: number;
    sharpness: number;
    resampleMultiplier: number;
    maxNodes: number;
    visualOptimizationLevel: number;
    ghostMarkers: boolean;
  };
  scale: {
    enabled: boolean;
  };
  rotate: {
    enabled: boolean;
  };
  donut: {
    enabled: boolean;
    direction: DonutDirection;
  };
  color: {
    enabled: boolean;
    palette: string[];
    defaultFillOpacity: number;
    mergeStrategy: 'source' | 'target' | 'blend';
  };
  visualOptimizationToggle: {
    enabled: boolean;
  };
  menuActions?: PolygonMenuAction[];
}

export type PolygonActionHistory =
  | 'simplify'
  | 'doubleElbows'
  | 'bbox'
  | 'bezier'
  | 'scale'
  | 'rotate'
  | 'donut'
  | 'color'
  | 'toggleOptimization'
  | 'polygonMenuAction';

export type HistoryAction =
  | 'batch'
  | 'freehand'
  | 'pointToPoint'
  | 'addPredefinedPolygon'
  | 'eraseAll'
  | 'markerDrag'
  | 'polygonDrag'
  | 'polygonClone'
  | 'addVertex'
  | 'removeVertex'
  | 'removeHole'
  | 'modifierSubtract'
  | 'deletePolygon'
  | 'layerDelete'
  | 'layerReorder'
  | PolygonActionHistory;

export interface PolygonActionsHistoryCaptureConfig {
  simplify: boolean;
  doubleElbows: boolean;
  bbox: boolean;
  bezier: boolean;
  scale: boolean;
  rotate: boolean;
  donut: boolean;
  color: boolean;
  toggleOptimization: boolean;
  polygonMenuAction: boolean;
}

export interface HistoryCaptureConfig {
  batch: boolean;
  freehand: boolean;
  pointToPoint: boolean;
  addPredefinedPolygon: boolean;
  eraseAll: boolean;
  markerDrag: boolean;
  polygonDrag: boolean;
  polygonClone: boolean;
  addVertex: boolean;
  removeVertex: boolean;
  removeHole: boolean;
  modifierSubtract: boolean;
  deletePolygon: boolean;
  layerDelete?: boolean;
  layerReorder?: boolean;
  polygonActions?: PolygonActionsHistoryCaptureConfig;
}

export interface HistoryConfig {
  capture: HistoryCaptureConfig;
  maxSize: number;
}

export interface TooltipConfig {
  enabled: boolean;
  delayMs: number;
  direction: 'left' | 'right';
  backgroundColor: string;
  color: string;
}

/**
 * Complete Polydraw configuration interface
 */
export interface PolydrawConfig {
  kinks: boolean;
  mergePolygons: boolean;
  tools: ToolConfig;
  modes: ModeConfig;
  modifierSubtractMode: boolean;
  interaction: InteractionConfig;
  markers: MarkerOptions;
  styles: StylesConfig;
  polygonCreation: {
    algorithm: PolygonCreationAlgorithm;
  };
  simplification: SimplificationConfig;
  polygonTools: PolygonToolsConfig;
  tooltips: TooltipConfig;
  history: HistoryConfig;
}

/**
 * Event handler function types
 */
export type DrawModeChangeHandler = (mode: DrawMode) => void;
export type MouseEventHandler = (event: L.LeafletMouseEvent) => void;
export type TouchEventHandler = (event: TouchEvent) => void;
export type MarkerEventHandler = (event: L.LeafletEvent) => void;
export type PolygonEventHandler = (event: L.LeafletEvent) => void;

export type PolydrawEvent = ManagerPolydrawEvent;
export type PolydrawEventData<T extends PolydrawEvent = PolydrawEvent> = PolydrawEventPayloads[T];
export type PolydrawEventCallback<T extends PolydrawEvent = PolydrawEvent> =
  ManagerPolydrawEventCallback<T>;

/**
 * Data interface for menu actions
 */
export interface MenuActionData {
  action: 'simplify' | 'bbox' | 'doubleElbows' | 'bezier' | 'polygonMenuAction';
  menuActionId?: string;
  latLngs: L.LatLngLiteral[];
  featureGroup: L.FeatureGroup;
}

export interface PolygonUpdatedEventData {
  operation: string;
  polygon: Feature<Polygon | MultiPolygon>;
  allowMerge?: boolean;
  intelligentMerge?: boolean;
  optimizationLevel?: number;
  originalOptimizationLevel?: number;
  featureId?: string;
  featureMetadata?: Record<string, unknown>;
  sourceFeatureIds?: string[];
  featureInteractionOverride?: LayerInteraction;
  featureStyleOverrides?: PolygonStyleOverrides;
  targetLayerId?: string;
  featureCreatedAt?: string;
  featureLastModified?: string;
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
    originalOptimizationLevel?: number;
    hasHoles: boolean;
    createdAt: Date;
    lastModified: Date;
    layerId?: string;
    metadata?: Record<string, unknown>;
    sourceFeatureIds?: string[];
    interactionOverride?: LayerInteraction;
    styleOverrides?: PolygonStyleOverrides;
  };
}

/**
 * Enhanced polygon with metadata interface
 */
export interface PolydrawPolygon extends L.Polygon {
  _polydrawOptimizationLevel?: number;
  _polydrawOptimizationOriginalLevel?: number;
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

/**
 * Layer snapshot entry for history serialization
 */
export interface LayerSnapshotEntry {
  id: string;
  label?: string;
  color: string;
  visible: boolean;
  interaction?: LayerInteraction;
  panel?: LayerPanelVisibility;
  metadata?: Record<string, unknown>;
  featureIndices: number[];
}

/**
 * Complete layer snapshot for history
 */
export interface LayerSnapshot {
  layers: LayerSnapshotEntry[];
  activeLayerId: string;
}

export interface FeatureMetadataSnapshotEntry {
  id?: string;
  metadata?: Record<string, unknown>;
  sourceFeatureIds?: string[];
  interactionOverride?: LayerInteraction;
  styleOverrides?: PolygonStyleOverrides;
  optimizationLevel?: number;
  originalOptimizationLevel?: number;
  hasHoles?: boolean;
  layerId?: string;
  createdAt?: string;
  lastModified?: string;
}

export type LayerInteraction = 'editable' | 'readonly' | 'static';
export type LayerPanelVisibility = 'visible' | 'hidden';
export type PolydrawMetadata = Record<string, unknown>;
export type PolygonOverrideInteraction = 'inherit' | LayerInteraction;
export type PolygonOverrideMerge = 'inherit' | 'allow' | 'block';

export interface PolygonStyleOverrides {
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  opacity?: number;
  weight?: number;
}

export interface PolygonOverridesInput {
  interaction?: PolygonOverrideInteraction;
  merge?: PolygonOverrideMerge;
  style?: PolygonStyleOverrides;
}

export interface PredefinedPolygonOptions {
  visualOptimizationLevel?: number;
  layer?: string | PolygonLayerDescriptorInput;
  layerColor?: string;
  metadata?: PolydrawMetadata;
  overrides?: PolygonOverridesInput;
}

export interface PolygonLayerDescriptorInput {
  id: string;
  label?: string;
  color?: string;
  visibility?: boolean;
  panel?: LayerPanelVisibility;
  interaction?: LayerInteraction;
  metadata?: PolydrawMetadata;
}

export interface LayerUpdateInput {
  label?: string;
  color?: string;
  visibility?: boolean;
  panel?: LayerPanelVisibility;
  interaction?: LayerInteraction;
  metadata?: PolydrawMetadata;
}

export interface LayerDeleteResult {
  success: boolean;
  layerId: string;
  removedFeatureGroups: number;
  reason?: 'not-found' | 'default-layer';
}

/**
 * Input format for adding polygon groups with layer information
 */
export interface PolygonGroupInput {
  layer: string | PolygonLayerDescriptorInput;
  polygons: unknown[][][][];
  options?: Omit<PredefinedPolygonOptions, 'layer' | 'layerColor'>;
}
