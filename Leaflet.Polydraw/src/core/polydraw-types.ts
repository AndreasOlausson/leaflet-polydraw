import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { ILatLng } from '../polygon-helpers';
import * as L from 'leaflet';
import { DrawMode } from '../enums';

/**
 * Options for adding auto polygons with visual optimization
 */
export interface AutoPolygonOptions {
  visualOptimizationLevel?: number; // 0-10, where 0 = no optimization, 10 = maximum optimization
}

/**
 * Drag interaction result interface
 */
export interface DragInteractionResult {
  shouldMerge: boolean;
  shouldCreateHole: boolean;
  intersectingFeatureGroups: L.FeatureGroup[];
  containingFeatureGroup: L.FeatureGroup | null;
}

/**
 * Polygon drag data interface
 */
export interface PolygonDragData {
  isDragging: boolean;
  startPosition: L.LatLng | null;
  startLatLngs: any;
}

/**
 * Draw mode change listener type
 */
export type DrawModeListener = (mode: DrawMode) => void;

/**
 * Polygon operation types
 */
export type PolygonOperationType = 'add' | 'subtract' | 'merge' | 'delete';

/**
 * Intersection analysis result
 */
export type IntersectionType = 'should_create_holes' | 'standard_union';

/**
 * Marker visibility calculation result
 */
export interface MarkerVisibilityResult {
  visibility: boolean[];
  hiddenCount: number;
  totalCount: number;
}

/**
 * Point importance calculation result
 */
export interface PointImportance {
  index: number;
  score: number;
  isSpecialMarker: boolean;
}
