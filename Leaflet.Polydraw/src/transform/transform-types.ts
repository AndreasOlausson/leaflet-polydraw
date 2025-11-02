/**
 * Types and enums for polygon transform mode (Leaflet v1/v2 compatible).
 */
import type * as L from 'leaflet';

export enum TransformHandleType {
  TopLeft = 'top-left',
  Top = 'top',
  TopRight = 'top-right',
  Right = 'right',
  BottomRight = 'bottom-right',
  Bottom = 'bottom',
  BottomLeft = 'bottom-left',
  Left = 'left',
  Rotate = 'rotate',
  Pivot = 'pivot',
}

export type PixelPoint = { x: number; y: number };

export interface PixelBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface TransformState {
  isActive: boolean;
  originalLatLngs: L.LatLng[] | L.LatLng[][] | L.LatLng[][][];
  originalPixelRings: PixelPoint[][][];
  pivot: PixelPoint;
  scaleX: number;
  scaleY: number;
  rotation: number; // radians
  uniformScale: boolean;
  snapRotation: boolean;
  scaleFromPivot: boolean;
}

export interface TransformOverlayCallbacks {
  onStartHandleDrag: (type: TransformHandleType, start: PixelPoint, evt: MouseEvent) => void;
  onDragHandle: (type: TransformHandleType, current: PixelPoint, evt: MouseEvent) => void;
  onEndHandleDrag: (type: TransformHandleType, end: PixelPoint, evt: MouseEvent) => void;
}
