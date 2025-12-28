/**
 * Orchestrates polygon Transform Mode: capture original geometry, apply scale/rotation in pixel space,
 * preview updates on the polygon, and support apply/cancel.
 */
import * as L from 'leaflet';
import { TransformOverlay } from './transform-overlay';
import {
  TransformState,
  TransformHandleType,
  type PixelPoint,
  type PixelBBox,
} from './transform-types';
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

export class PolygonTransformController {
  private map: L.Map;
  private polygon: L.Polygon;
  private overlay: TransformOverlay;
  private state: TransformState;
  private normalizedLatLngs: L.LatLng[][][];
  private wasMapDraggingEnabled: boolean = false;
  private mode: 'scale' | 'rotate';
  private onExit?: (confirmed: boolean) => void;
  private rotateStartAngle: number | null = null;
  private rotateBaseRotation: number = 0;
  private originalTouchAction: string | null = null;

  constructor(
    map: L.Map,
    featureGroup: L.FeatureGroup,
    mode: 'scale' | 'rotate' = 'scale',
    onExit?: (confirmed: boolean) => void,
  ) {
    this.map = map;
    this.mode = mode;
    this.onExit = onExit;
    const polygon = featureGroup.getLayers().find((l) => l instanceof L.Polygon) as
      | L.Polygon
      | undefined;
    if (!polygon) throw new Error('FeatureGroup does not contain a polygon');
    this.polygon = polygon;

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
        onDragHandle: (type, current, e) => this.onDrag(type, current, e),
        onEndHandleDrag: (_type, _end, _e) => {},
      },
      this.mode,
      () => this.handleCancel(),
      () => this.handleConfirm(),
    );

    this.updateOverlay();
    this.map.on('zoom viewreset move', this.updateOverlay, this);

    // Disable map dragging during transform for consistent UX
    if ((this.map as any).dragging) {
      // Leaflet v1 has dragging.enabled(); v2 similar
      const dragging = (this.map as any).dragging;
      if (typeof dragging.enabled === 'function') {
        this.wasMapDraggingEnabled = dragging.enabled();
      }
      dragging.disable();
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
    this.overlay.destroy();
    this.state.isActive = false;
    // Restore map dragging state
    if ((this.map as any).dragging) {
      const dragging = (this.map as any).dragging;
      if (this.wasMapDraggingEnabled && typeof dragging.enable === 'function') {
        dragging.enable();
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

  private onStartDrag(type: TransformHandleType, start: PixelPoint, evt: MouseEvent): void {
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

  private onDrag(type: TransformHandleType, current: PixelPoint, _evt: MouseEvent): void {
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
    if (this.mode !== 'scale') return;

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
    this.polygon.setLatLngs(ll as unknown as L.LatLngExpression[]);
    this.updateOverlay();
  }

  apply(): L.LatLng[][][] {
    const coords = this.polygon.getLatLngs() as unknown as L.LatLng[][][];
    return normalizeLatLngs(coords as unknown as L.LatLng[] | L.LatLng[][] | L.LatLng[][][]);
  }

  cancel(): void {
    this.polygon.setLatLngs(this.state.originalLatLngs as unknown as L.LatLngExpression[]);
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
