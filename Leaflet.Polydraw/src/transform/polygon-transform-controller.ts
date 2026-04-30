/**
 * Orchestrates polygon Transform Mode: capture original geometry, apply scale/rotation in pixel space,
 * preview updates on the polygon, and support apply/cancel.
 */
import * as L from 'leaflet';
import { TransformOverlay } from './transform-overlay';
import { DonutDirection } from '../enums';
import {
  TransformState,
  TransformHandleType,
  type PixelPoint,
  type PixelBBox,
  type TransformHandleEvent,
} from './transform-types';

type MapDraggingHandler = {
  enabled?: () => boolean;
  disable?: () => void;
  enable?: () => void;
};
import {
  applyTransform,
  getPixelBBox,
  getPixelCentroid,
  normalizeLatLngs,
  projectLatLngs,
  scalePointAround,
  unprojectToLatLngs,
  snapAngleRadians,
} from './transform-utils';
import { validateDonutCandidate, type DonutValidationResult } from './donut-validation';

export class PolygonTransformController {
  private map: L.Map;
  private polygon: L.Polygon;
  private overlay: TransformOverlay;
  private state: TransformState;
  private normalizedLatLngs: L.LatLng[][][];
  private wasMapDraggingEnabled: boolean = false;
  private mode: 'scale' | 'rotate' | 'donut';
  private onExit?: (confirmed: boolean) => void;
  private rotateStartAngle: number | null = null;
  private rotateBaseRotation: number = 0;
  private originalTouchAction: string | null = null;
  private readonly mapDraggingHandler?: MapDraggingHandler;
  private readonly originalPolygonStyle: Partial<L.PathOptions>;
  private readonly donutDirection: DonutDirection;

  constructor(
    map: L.Map,
    featureGroup: L.FeatureGroup,
    mode: 'scale' | 'rotate' | 'donut' = 'scale',
    donutDirection: DonutDirection = DonutDirection.Both,
    onExit?: (confirmed: boolean) => void,
  ) {
    this.map = map;
    this.mode = mode;
    this.donutDirection = donutDirection;
    this.onExit = onExit;
    const polygon = featureGroup.getLayers().find((l) => l instanceof L.Polygon) as
      | L.Polygon
      | undefined;
    if (!polygon) throw new Error('FeatureGroup does not contain a polygon');
    this.polygon = polygon;
    this.originalPolygonStyle = {
      color: this.polygon.options.color,
      fillColor: this.polygon.options.fillColor,
      opacity: this.polygon.options.opacity,
      fillOpacity: this.polygon.options.fillOpacity,
    };

    const originalLatLngs = this.polygon.getLatLngs() as unknown as
      | L.LatLng[]
      | L.LatLng[][]
      | L.LatLng[][][];
    this.normalizedLatLngs = normalizeLatLngs(originalLatLngs);
    const proj = projectLatLngs(this.map, this.normalizedLatLngs);

    const bbox = getPixelBBox(proj.rings);
    const pivot = getPixelCentroid(bbox);

    this.state = {
      isActive: true,
      originalLatLngs,
      originalPixelRings: proj.rings,
      pivot,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      uniformScale: false,
      snapRotation: false,
      scaleFromPivot: false,
    };

    this.overlay = new TransformOverlay(
      this.map,
      {
        onStartHandleDrag: (type, start, e) => this.onStartDrag(type, start, e),
        onDragHandle: (type, current) => this.onDrag(type, current),
        onEndHandleDrag: () => {},
      },
      this.mode,
      () => this.handleCancel(),
      () => this.handleConfirm(),
    );

    this.updateOverlay();
    this.syncDonutValidation();
    this.map.on('zoom viewreset move', this.updateOverlay, this);

    // Disable map dragging during transform for consistent UX
    this.mapDraggingHandler = (this.map as { dragging?: MapDraggingHandler }).dragging;
    if (this.mapDraggingHandler) {
      // Leaflet v1 has dragging.enabled(); v2 similar
      if (typeof this.mapDraggingHandler.enabled === 'function') {
        this.wasMapDraggingEnabled = this.mapDraggingHandler.enabled();
      }
      this.mapDraggingHandler.disable?.();
    }
    const container = this.map.getContainer();
    this.originalTouchAction = container.style.touchAction || null;
    container.style.touchAction = 'none';

    // ESC to exit
    document.addEventListener('keydown', this.onKeyDown);
  }

  destroy(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    this.map.off('zoom viewreset move', this.updateOverlay, this);
    this.restorePolygonStyle();
    this.overlay.destroy();
    this.state.isActive = false;
    // Restore map dragging state
    if (this.mapDraggingHandler) {
      if (this.wasMapDraggingEnabled && typeof this.mapDraggingHandler.enable === 'function') {
        this.mapDraggingHandler.enable();
      }
    }
    const container = this.map.getContainer();
    if (this.originalTouchAction !== null) {
      container.style.touchAction = this.originalTouchAction;
    } else {
      container.style.touchAction = '';
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.handleCancel();
    }
  };

  private updateOverlay = (): void => {
    // Calculate bbox from original polygon (before rotation) so it stays constant size
    // Only apply scale, not rotation, so bbox size doesn't change during rotation
    const scaledRings = this.state.originalPixelRings.map((poly) =>
      poly.map((ring) =>
        ring.map((pt) =>
          scalePointAround(pt, this.state.pivot, this.state.scaleX, this.state.scaleY),
        ),
      ),
    );
    const bbox = getPixelBBox(scaledRings);
    this.overlay.update(bbox, this.state.pivot, this.state.rotation);
  };

  private onStartDrag(
    type: TransformHandleType,
    start: PixelPoint,
    evt: TransformHandleEvent,
  ): void {
    const isMac = navigator.userAgent.toLowerCase().includes('mac');
    const ctrlOrCmd = isMac ? evt.metaKey : evt.ctrlKey;
    this.state.uniformScale = !!evt.shiftKey;
    this.state.scaleFromPivot = !!evt.altKey;
    this.state.snapRotation = !!ctrlOrCmd;
    if (type === TransformHandleType.Rotate) {
      // Capture starting angle to avoid initial jump
      const c = this.state.scaleFromPivot
        ? this.state.pivot
        : getPixelCentroid(getPixelBBox(this.state.originalPixelRings));
      const startAngle = Math.atan2(start.y - c.y, start.x - c.x);
      this.rotateStartAngle = startAngle;
      this.rotateBaseRotation = this.state.rotation || 0;
    }
  }

  private onDrag(type: TransformHandleType, current: PixelPoint): void {
    const origBBox = getPixelBBox(this.state.originalPixelRings);

    switch (type) {
      case TransformHandleType.Rotate: {
        const rotationCenter = this.state.scaleFromPivot
          ? this.state.pivot
          : getPixelCentroid(origBBox);
        this.handleRotateDrag(current, rotationCenter);
        break;
      }
      case TransformHandleType.Pivot:
        this.handlePivotDrag(current);
        break;
      default: {
        const scaleCenter = this.state.scaleFromPivot
          ? this.state.pivot
          : getPixelCentroid(origBBox);
        this.handleScaleDrag(type, current, origBBox, scaleCenter);
        break;
      }
    }
    this.preview();
  }

  private handleRotateDrag(current: PixelPoint, center: PixelPoint): void {
    if (this.mode !== 'rotate') return;

    const angle = Math.atan2(current.y - center.y, current.x - center.x);
    let theta: number;
    if (this.rotateStartAngle != null) {
      const delta = angle - this.rotateStartAngle;
      theta = this.rotateBaseRotation + delta;
    } else {
      theta = angle;
    }
    this.state.rotation = this.state.snapRotation ? snapAngleRadians(theta, 15) : theta;
  }

  private handlePivotDrag(current: PixelPoint): void {
    this.state.pivot = current;
  }

  private handleScaleDrag(
    type: TransformHandleType,
    current: PixelPoint,
    origBBox: PixelBBox,
    center: PixelPoint,
  ): void {
    if (this.mode === 'rotate') return;

    const width = origBBox.maxX - origBBox.minX;
    const height = origBBox.maxY - origBBox.minY;
    let scaleX = this.state.scaleX;
    let scaleY = this.state.scaleY;

    switch (type) {
      case TransformHandleType.Left:
      case TransformHandleType.TopLeft:
      case TransformHandleType.BottomLeft:
        scaleX = (center.x - current.x) / (center.x - origBBox.minX || 1);
        break;
      case TransformHandleType.Right:
      case TransformHandleType.TopRight:
      case TransformHandleType.BottomRight:
        scaleX = (current.x - center.x) / (origBBox.maxX - center.x || 1);
        break;
    }

    switch (type) {
      case TransformHandleType.Top:
      case TransformHandleType.TopLeft:
      case TransformHandleType.TopRight:
        scaleY = (center.y - current.y) / (center.y - origBBox.minY || 1);
        break;
      case TransformHandleType.Bottom:
      case TransformHandleType.BottomLeft:
      case TransformHandleType.BottomRight:
        scaleY = (current.y - center.y) / (origBBox.maxY - center.y || 1);
        break;
    }

    if (type === TransformHandleType.Left || type === TransformHandleType.Right) {
      scaleY = this.state.scaleY;
    }
    if (type === TransformHandleType.Top || type === TransformHandleType.Bottom) {
      scaleX = this.state.scaleX;
    }

    if (this.state.uniformScale) {
      const uniform =
        Math.abs(width) > Math.abs(height)
          ? Math.sign(scaleX) * Math.abs(scaleX)
          : Math.sign(scaleY) * Math.abs(scaleY);
      scaleX = uniform;
      scaleY = uniform;
    }

    const hasValidScaleX = Number.isFinite(scaleX) && Math.abs(scaleX) > 0.001;
    const hasValidScaleY = Number.isFinite(scaleY) && Math.abs(scaleY) > 0.001;

    if (hasValidScaleX) {
      this.state.scaleX = scaleX;
    }
    if (hasValidScaleY) {
      this.state.scaleY = scaleY;
    }
  }

  private preview(): void {
    const transformed = applyTransform(
      this.state.originalPixelRings,
      this.state.pivot,
      this.state.scaleX,
      this.state.scaleY,
      this.state.rotation,
    );
    const ll = unprojectToLatLngs(this.map, transformed, this.normalizedLatLngs);
    if (this.mode === 'donut') {
      // Render as polygon-with-hole preview: original outer ring + transformed outer as an inner ring.
      const originalOuter = this.normalizedLatLngs[0]?.[0] ?? [];
      const transformedOuter = ll[0]?.[0] ?? [];
      this.polygon.setLatLngs([
        [originalOuter, transformedOuter],
      ] as unknown as L.LatLngExpression[]);
      this.syncDonutValidation();
    } else {
      this.polygon.setLatLngs(ll as unknown as L.LatLngExpression[]);
    }
    this.updateOverlay();
  }

  apply(): L.LatLng[][][] {
    const coords = this.polygon.getLatLngs() as unknown as L.LatLng[][][];
    return normalizeLatLngs(coords as unknown as L.LatLng[] | L.LatLng[][] | L.LatLng[][][]);
  }

  cancel(): void {
    this.restorePolygonStyle();
    this.polygon.setLatLngs(this.state.originalLatLngs as unknown as L.LatLngExpression[]);
  }

  getMode(): 'scale' | 'rotate' | 'donut' {
    return this.mode;
  }

  getOriginalOuterLatLngs(): L.LatLngLiteral[] {
    return this.normalizedLatLngs[0]?.[0] ?? [];
  }

  getScaledOuterLatLngs(): L.LatLngLiteral[] {
    const transformed = applyTransform(
      this.state.originalPixelRings,
      this.state.pivot,
      this.state.scaleX,
      this.state.scaleY,
      this.state.rotation,
    );
    const ll = unprojectToLatLngs(this.map, transformed, this.normalizedLatLngs);
    return ll[0]?.[0] ?? [];
  }

  getDonutValidation(): DonutValidationResult {
    return validateDonutCandidate(
      this.getOriginalOuterLatLngs(),
      this.getScaledOuterLatLngs(),
      this.state.scaleX,
      this.state.scaleY,
      this.donutDirection,
    );
  }

  private syncDonutValidation(): void {
    if (this.mode !== 'donut') {
      return;
    }

    const validation = this.getDonutValidation();
    const showWarning = validation.warning && validation.reason !== 'scale-required';
    this.overlay.setDonutValidation(validation, showWarning);

    if (showWarning) {
      this.polygon.setStyle({
        color: '#d97706',
        fillColor: '#f59e0b',
        opacity: Math.max(this.originalPolygonStyle.opacity ?? 0, 0.95),
        fillOpacity: Math.max(this.originalPolygonStyle.fillOpacity ?? 0, 0.2),
      });
      return;
    }

    this.restorePolygonStyle();
  }

  private restorePolygonStyle(): void {
    if (this.mode !== 'donut') {
      return;
    }

    this.polygon.setStyle({
      color: this.originalPolygonStyle.color,
      fillColor: this.originalPolygonStyle.fillColor,
      opacity: this.originalPolygonStyle.opacity,
      fillOpacity: this.originalPolygonStyle.fillOpacity,
    });
  }

  private handleCancel(): void {
    this.cancel();
    if (this.onExit) this.onExit(false);
    this.destroy();
  }

  private handleConfirm(): void {
    if (this.onExit) this.onExit(true);
    this.destroy();
  }
}
