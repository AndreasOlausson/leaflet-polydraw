/**
 * Renders the transform overlay (bbox, 8 scale handles, rotate handle, pivot) in a dedicated Leaflet pane.
 * Delegates drag events to callbacks. Uses Leaflet APIs and works across v1/v2.
 */
import * as L from 'leaflet';
import { leafletAdapter } from '../compatibility/leaflet-adapter';
import {
  TransformHandleType,
  type TransformOverlayCallbacks,
  type PixelBBox,
  type PixelPoint,
  type TransformHandleEvent,
} from './transform-types';
import cancelIconSvg from '../icons/icon-cancel.svg?raw';
import confirmIconSvg from '../icons/icon-confirm.svg?raw';

export class TransformOverlay {
  private map: L.Map;
  private pane: HTMLElement;
  private root: HTMLDivElement;
  private draggingHandle: TransformHandleType | null = null;
  private documentMoveHandler: ((e: Event) => void) | null = null;
  private documentUpHandler: ((e: Event) => void) | null = null;
  private pointerCaptureTarget: HTMLElement | null = null;
  private activePointerId: number | null = null;
  private callbacks: TransformOverlayCallbacks;
  private rafId: number | null = null;
  private mode: 'scale' | 'rotate';
  private onCancel?: () => void;
  private onConfirm?: () => void;
  private cancelBtn: HTMLDivElement | null = null;
  private confirmBtn: HTMLDivElement | null = null;
  private currentBBox: PixelBBox | null = null;
  private currentRotation: number = 0;
  private buttonsHidden: boolean = false;
  private destroyed: boolean = false;
  private readonly supportsPointerEvents: boolean =
    typeof window !== 'undefined' && 'PointerEvent' in window;

  constructor(
    map: L.Map,
    callbacks: TransformOverlayCallbacks,
    mode: 'scale' | 'rotate',
    onCancel?: () => void,
    onConfirm?: () => void,
  ) {
    this.map = map;
    this.callbacks = callbacks;
    this.mode = mode;
    this.onCancel = onCancel;
    this.onConfirm = onConfirm;
    const paneName = 'polydraw-transform';
    const mapWithPane = this.map as L.Map & { getPane?: (name: string) => HTMLElement | undefined };
    let pane = mapWithPane.getPane?.(paneName);
    if (!pane) pane = this.map.createPane(paneName);
    pane.style.zIndex = '650';
    pane.style.pointerEvents = 'auto';
    this.pane = pane;

    this.root = document.createElement('div');
    this.root.className = 'polydraw-transform-root';
    this.root.style.position = 'absolute';
    this.root.style.left = '0px';
    this.root.style.top = '0px';
    this.root.style.pointerEvents = 'none';
    this.pane.appendChild(this.root);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.draggingHandle = null;
    this.detachDocumentDragHandlers();
    this.root.remove();
  }

  update(bbox: PixelBBox, pivot: PixelPoint, rotation: number = 0): void {
    if (this.destroyed) return;
    if (this.rafId != null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (this.destroyed) return;
      this.render(bbox, pivot, rotation);
      // Update button positions if buttons exist (they'll stay hidden while dragging)
      if (this.cancelBtn || this.confirmBtn) {
        const isRotateDrag =
          this.draggingHandle === TransformHandleType.Rotate && this.mode === 'rotate';
        if (!isRotateDrag) {
          this.updateButtonPositions(bbox, rotation);
        }
      }
    });
  }

  private render(bbox: PixelBBox, _pivot: PixelPoint, rotation: number = 0): void {
    // Store button elements before clearing
    const cancelBtn = this.cancelBtn;
    const confirmBtn = this.confirmBtn;

    this.root.innerHTML = '';
    this.currentBBox = bbox;
    this.currentRotation = rotation;

    // Restore button references
    this.cancelBtn = cancelBtn;
    this.confirmBtn = confirmBtn;

    const width = bbox.maxX - bbox.minX;
    const height = bbox.maxY - bbox.minY;
    const centerX = bbox.minX + width / 2;
    const centerY = bbox.minY + height / 2;

    const box = document.createElement('div');
    box.className = 'polydraw-transform-box';
    Object.assign(box.style, {
      position: 'absolute',
      left: `${centerX}px`,
      top: `${centerY}px`,
      width: `${width}px`,
      height: `${height}px`,
      marginLeft: `${-width / 2}px`,
      marginTop: `${-height / 2}px`,
      border: '1px dashed #2b90d9',
      pointerEvents: 'none',
      transformOrigin: 'center center',
      transform: `rotate(${(rotation * 180) / Math.PI}deg)`,
    } as Partial<CSSStyleDeclaration>);
    this.root.appendChild(box);

    const makeHandle = (type: TransformHandleType, x: number, y: number) => {
      // Rotate handle position around bbox center
      const dx = x - centerX;
      const dy = y - centerY;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rotX = centerX + dx * cos - dy * sin;
      const rotY = centerY + dx * sin + dy * cos;

      const h = document.createElement('div');
      h.className = `polydraw-transform-handle handle-${type}`;
      Object.assign(h.style, {
        position: 'absolute',
        left: `${rotX - 5}px`,
        top: `${rotY - 5}px`,
        width: '10px',
        height: '10px',
        borderRadius: '2px',
        background: '#2b90d9',
        boxShadow: '0 0 0 1px #fff',
        cursor: this.cursorForHandle(type),
        pointerEvents: 'auto',
        touchAction: 'none',
      } as Partial<CSSStyleDeclaration>);
      if (this.supportsPointerEvents) {
        L.DomEvent.on(
          h,
          'pointerdown',
          (e: Event) => this.startDrag(type, { x: rotX, y: rotY }, e),
          this,
        );
      } else {
        L.DomEvent.on(
          h,
          'mousedown',
          (e: Event) => this.startDrag(type, { x: rotX, y: rotY }, e),
          this,
        );
        L.DomEvent.on(
          h,
          'touchstart',
          (e: Event) => this.startDrag(type, { x: rotX, y: rotY }, e),
          this,
        );
      }
      this.root.appendChild(h);
    };

    if (this.mode === 'scale') {
      // Corners
      makeHandle(TransformHandleType.TopLeft, bbox.minX, bbox.minY);
      makeHandle(TransformHandleType.TopRight, bbox.maxX, bbox.minY);
      makeHandle(TransformHandleType.BottomRight, bbox.maxX, bbox.maxY);
      makeHandle(TransformHandleType.BottomLeft, bbox.minX, bbox.maxY);
      // Mid-edges
      makeHandle(TransformHandleType.Top, centerX, bbox.minY);
      makeHandle(TransformHandleType.Right, bbox.maxX, centerY);
      makeHandle(TransformHandleType.Bottom, centerX, bbox.maxY);
      makeHandle(TransformHandleType.Left, bbox.minX, centerY);
    } else {
      // Rotation handles at corners
      makeHandle(TransformHandleType.Rotate, bbox.minX, bbox.minY);
      makeHandle(TransformHandleType.Rotate, bbox.maxX, bbox.minY);
      makeHandle(TransformHandleType.Rotate, bbox.maxX, bbox.maxY);
      makeHandle(TransformHandleType.Rotate, bbox.minX, bbox.maxY);
    }

    // Pivot marker is hidden in rotate mode

    // Cancel and Confirm controls (positioned near top-right handle)
    // Only create buttons if they don't exist yet
    if (!this.cancelBtn && !this.confirmBtn) {
      this.updateButtonPositions(bbox, rotation);
    } else {
      // If buttons exist, update their positions
      this.updateButtonPositions(bbox, rotation);
      if (this.cancelBtn) this.root.appendChild(this.cancelBtn);
      if (this.confirmBtn) this.root.appendChild(this.confirmBtn);
    }
  }

  private cursorForHandle(type: TransformHandleType): string {
    switch (type) {
      case TransformHandleType.Top:
      case TransformHandleType.Bottom:
        return 'ns-resize';
      case TransformHandleType.Left:
      case TransformHandleType.Right:
        return 'ew-resize';
      case TransformHandleType.TopLeft:
      case TransformHandleType.BottomRight:
        return 'nwse-resize';
      case TransformHandleType.TopRight:
      case TransformHandleType.BottomLeft:
        return 'nesw-resize';
      case TransformHandleType.Rotate:
        return 'grab';
      case TransformHandleType.Pivot:
        return 'move';
      default:
        return 'default';
    }
  }

  private startDrag(type: TransformHandleType, start: PixelPoint, evt: Event): void {
    if (this.destroyed) return;
    L.DomEvent.stop(evt);
    this.draggingHandle = type;

    // Hide buttons while dragging to avoid inadvertent taps
    this.hideButtons();

    this.documentMoveHandler = (e: Event) => this.onDrag(e);
    this.documentUpHandler = (e: Event) => this.endDrag(e);
    const doc = document as unknown as HTMLElement;
    const moveHandler = this.documentMoveHandler as (e: Event) => void;
    const upHandler = this.documentUpHandler as (e: Event) => void;
    if (this.supportsPointerEvents && evt instanceof PointerEvent) {
      this.activePointerId = evt.pointerId;
      this.pointerCaptureTarget = this.map.getContainer();
      try {
        this.pointerCaptureTarget?.setPointerCapture?.(evt.pointerId);
      } catch {
        // Pointer capture may fail for synthetic events; continue without it.
      }
      L.DomEvent.on(doc, 'pointermove', moveHandler);
      L.DomEvent.on(doc, 'pointerup', upHandler);
      L.DomEvent.on(doc, 'pointercancel', upHandler);
    } else {
      L.DomEvent.on(doc, 'mousemove', moveHandler);
      L.DomEvent.on(doc, 'mouseup', upHandler);
      L.DomEvent.on(doc, 'touchmove', moveHandler);
      L.DomEvent.on(doc, 'touchend', upHandler);
      L.DomEvent.on(doc, 'touchcancel', upHandler);
    }
    this.callbacks.onStartHandleDrag(type, start, evt as TransformHandleEvent);
  }

  private onDrag(evt: Event): void {
    if (this.draggingHandle == null) return;
    const pos = this.getMouseLayerPoint(evt);
    this.callbacks.onDragHandle(this.draggingHandle, pos, evt as TransformHandleEvent);
  }

  private endDrag(evt: Event): void {
    if (this.draggingHandle == null) return;
    const type = this.draggingHandle;
    this.draggingHandle = null;
    try {
      const pos = this.getMouseLayerPoint(evt);
      this.callbacks.onEndHandleDrag(type, pos, evt as TransformHandleEvent);

      // Restore buttons near top-right handle when drag completes
      if (this.currentBBox) {
        this.updateButtonPositions(this.currentBBox, this.currentRotation);
      }
      this.showButtons();
    } finally {
      this.detachDocumentDragHandlers();
    }
  }

  private detachDocumentDragHandlers(): void {
    if (!this.documentMoveHandler && !this.documentUpHandler && !this.pointerCaptureTarget) {
      return;
    }

    const doc = document as unknown as HTMLElement;
    if (this.supportsPointerEvents && this.pointerCaptureTarget) {
      if (this.activePointerId != null) {
        try {
          this.pointerCaptureTarget.releasePointerCapture?.(this.activePointerId);
        } catch {
          // Ignore release failures; drag cleanup still proceeds.
        }
      }
      if (this.documentMoveHandler) {
        const moveHandler = this.documentMoveHandler as (e: Event) => void;
        L.DomEvent.off(doc, 'pointermove', moveHandler);
      }
      if (this.documentUpHandler) {
        const upHandler = this.documentUpHandler as (e: Event) => void;
        L.DomEvent.off(doc, 'pointerup', upHandler);
        L.DomEvent.off(doc, 'pointercancel', upHandler);
      }
      this.pointerCaptureTarget = null;
      this.activePointerId = null;
    } else {
      if (this.documentMoveHandler) {
        const moveHandler = this.documentMoveHandler as (e: Event) => void;
        L.DomEvent.off(doc, 'mousemove', moveHandler);
        L.DomEvent.off(doc, 'touchmove', moveHandler);
      }
      if (this.documentUpHandler) {
        const upHandler = this.documentUpHandler as (e: Event) => void;
        L.DomEvent.off(doc, 'mouseup', upHandler);
        L.DomEvent.off(doc, 'touchend', upHandler);
        L.DomEvent.off(doc, 'touchcancel', upHandler);
      }
    }
    this.documentMoveHandler = null;
    this.documentUpHandler = null;
  }

  private getMouseLayerPoint(evt: Event): PixelPoint {
    const container = this.map.getContainer();
    let clientX: number | null = null;
    let clientY: number | null = null;

    if ((evt as TouchEvent).touches && (evt as TouchEvent).touches.length > 0) {
      const touch = (evt as TouchEvent).touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else if (
      (evt as TouchEvent).changedTouches &&
      (evt as TouchEvent).changedTouches.length > 0
    ) {
      const touch = (evt as TouchEvent).changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else if ((evt as MouseEvent).clientX != null) {
      clientX = (evt as MouseEvent).clientX;
      clientY = (evt as MouseEvent).clientY;
    }

    if (clientX == null || clientY == null) {
      clientX = 0;
      clientY = 0;
    }

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const containerPoint = leafletAdapter.createPoint(x, y);
    const layerPoint = this.map.containerPointToLayerPoint(containerPoint);
    return { x: layerPoint.x, y: layerPoint.y };
  }

  private updateButtonPositions(bbox: PixelBBox, rotation: number): void {
    // Calculate all corner positions and find which one is actually top-right after rotation
    const width = bbox.maxX - bbox.minX;
    const height = bbox.maxY - bbox.minY;
    const centerX = bbox.minX + width / 2;
    const centerY = bbox.minY + height / 2;

    // All four corners
    const corners = [
      { x: bbox.minX, y: bbox.minY }, // top-left
      { x: bbox.maxX, y: bbox.minY }, // top-right
      { x: bbox.maxX, y: bbox.maxY }, // bottom-right
      { x: bbox.minX, y: bbox.maxY }, // bottom-left
    ];

    // Rotate all corners and find the one that's actually top-right (prioritize top/min y, then right/max x)
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    let topRightCorner = { x: 0, y: Infinity };
    let minY = Infinity;

    for (const corner of corners) {
      const dx = corner.x - centerX;
      const dy = corner.y - centerY;
      const rotX = centerX + dx * cos - dy * sin;
      const rotY = centerY + dx * sin + dy * cos;

      // Top-right means: prioritize top (lowest y), then right (highest x among ties)
      const isHigher = rotY < minY;
      const isSameHeight = Math.abs(rotY - minY) < 1;
      const isMoreRight = rotX > topRightCorner.x;

      if (isHigher || (isSameHeight && isMoreRight)) {
        minY = rotY;
        topRightCorner = { x: rotX, y: rotY };
      }
    }

    // Use the actual top-right corner after rotation
    const rotTopRightX = topRightCorner.x;
    const rotTopRightY = topRightCorner.y;

    // Position buttons near top-right handle
    const buttonY = rotTopRightY - 28;
    const confirmX = rotTopRightX + 5;
    const cancelX = rotTopRightX - 29; // Adjusted for 24px icon width

    const cancelSvg = cancelIconSvg;

    const confirmSvg = confirmIconSvg;

    if (this.onCancel && !this.cancelBtn) {
      this.cancelBtn = document.createElement('div');
      this.cancelBtn.className = 'polydraw-transform-cancel';
      this.cancelBtn.innerHTML = cancelSvg;
      L.DomEvent.on(this.cancelBtn, 'mousedown', (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onCancel) this.onCancel();
      });
      L.DomEvent.on(this.cancelBtn, 'touchstart', (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onCancel) this.onCancel();
      });
      L.DomEvent.on(this.cancelBtn, 'pointerdown', (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onCancel) this.onCancel();
      });
      this.root.appendChild(this.cancelBtn);
    }

    if (this.onConfirm && !this.confirmBtn) {
      this.confirmBtn = document.createElement('div');
      this.confirmBtn.className = 'polydraw-transform-confirm';
      this.confirmBtn.innerHTML = confirmSvg;
      L.DomEvent.on(this.confirmBtn, 'mousedown', (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onConfirm) this.onConfirm();
      });
      L.DomEvent.on(this.confirmBtn, 'touchstart', (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onConfirm) this.onConfirm();
      });
      L.DomEvent.on(this.confirmBtn, 'pointerdown', (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onConfirm) this.onConfirm();
      });
      this.root.appendChild(this.confirmBtn);
    }

    if (this.cancelBtn) {
      Object.assign(this.cancelBtn.style, {
        position: 'absolute',
        left: `${cancelX}px`,
        top: `${buttonY}px`,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'auto',
        width: '28px',
        height: '28px',
      } as Partial<CSSStyleDeclaration>);
      const svg = this.cancelBtn.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
      }
      this.cancelBtn.style.display = this.buttonsHidden ? 'none' : 'grid';
    }

    if (this.confirmBtn) {
      Object.assign(this.confirmBtn.style, {
        position: 'absolute',
        left: `${confirmX}px`,
        top: `${buttonY}px`,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'auto',
        width: '28px',
        height: '28px',
      } as Partial<CSSStyleDeclaration>);
      const svg = this.confirmBtn.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
      }
      this.confirmBtn.style.display = this.buttonsHidden ? 'none' : 'grid';
    }
  }

  private hideButtons(): void {
    this.buttonsHidden = true;
    if (this.cancelBtn) this.cancelBtn.style.display = 'none';
    if (this.confirmBtn) this.confirmBtn.style.display = 'none';
  }

  private showButtons(): void {
    this.buttonsHidden = false;
    if (this.cancelBtn) this.cancelBtn.style.display = 'grid';
    if (this.confirmBtn) this.confirmBtn.style.display = 'grid';
  }
}
