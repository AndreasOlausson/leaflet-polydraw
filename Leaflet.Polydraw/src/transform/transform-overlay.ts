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
} from './transform-types';

export class TransformOverlay {
  private map: L.Map;
  private pane: HTMLElement;
  private root: HTMLDivElement;
  private draggingHandle: TransformHandleType | null = null;
  private callbacks: TransformOverlayCallbacks;
  private rafId: number | null = null;
  private mode: 'scale' | 'rotate';
  private onCancel?: () => void;
  private onConfirm?: () => void;
  private cancelBtn: HTMLDivElement | null = null;
  private confirmBtn: HTMLDivElement | null = null;
  private currentBBox: PixelBBox | null = null;
  private currentRotation: number = 0;

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
    let pane = (this.map as any).getPane ? (this.map as any).getPane(paneName) : undefined;
    if (!pane) pane = this.map.createPane(paneName);
    pane.style.zIndex = '650';
    pane.style.pointerEvents = 'none';
    this.pane = pane;

    this.root = document.createElement('div');
    this.root.className = 'polydraw-transform-root';
    this.root.style.position = 'absolute';
    this.root.style.left = '0px';
    this.root.style.top = '0px';
    this.pane.appendChild(this.root);
  }

  destroy(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.root.remove();
  }

  update(bbox: PixelBBox, pivot: PixelPoint, rotation: number = 0): void {
    if (this.rafId != null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.render(bbox, pivot, rotation);
      // Update button positions if buttons exist (they'll be hidden during rotation drag)
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
      } as Partial<CSSStyleDeclaration>);
      L.DomEvent.on(h, 'mousedown', (e: Event) => this.startDrag(type, { x: rotX, y: rotY }, e));
      L.DomEvent.on(h, 'touchstart', (e: Event) => this.startDrag(type, { x: rotX, y: rotY }, e));
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
    (evt as any).stopPropagation?.();
    (evt as any).preventDefault?.();
    this.draggingHandle = type;

    // Hide buttons while dragging rotation handles
    if (type === TransformHandleType.Rotate && this.mode === 'rotate') {
      this.hideButtons();
    }

    const onMove = (e: Event) => this.onDrag(e as any);
    const onUp = (e: Event) => this.endDrag(e as any);
    L.DomEvent.on(document as unknown as HTMLElement, 'mousemove', onMove as any);
    L.DomEvent.on(document as unknown as HTMLElement, 'mouseup', onUp as any);
    L.DomEvent.on(document as unknown as HTMLElement, 'touchmove', onMove as any);
    L.DomEvent.on(document as unknown as HTMLElement, 'touchend', onUp as any);
    this.callbacks.onStartHandleDrag(type, start, evt as unknown as MouseEvent);
  }

  private onDrag(evt: Event): void {
    if (this.draggingHandle == null) return;
    const pos = this.getMouseLayerPoint(evt as unknown as MouseEvent);
    this.callbacks.onDragHandle(this.draggingHandle, pos, evt as unknown as MouseEvent);
  }

  private endDrag(evt: Event): void {
    if (this.draggingHandle == null) return;
    const type = this.draggingHandle;
    const wasRotateDrag = type === TransformHandleType.Rotate && this.mode === 'rotate';
    this.draggingHandle = null;
    const pos = this.getMouseLayerPoint(evt as unknown as MouseEvent);
    this.callbacks.onEndHandleDrag(type, pos, evt as unknown as MouseEvent);

    // Show buttons and reposition near top-right handle after rotation drag
    if (wasRotateDrag && this.currentBBox) {
      this.updateButtonPositions(this.currentBBox, this.currentRotation);
      this.showButtons();
    }

    L.DomEvent.off(document as unknown as HTMLElement, 'mousemove', this.onDrag as any);
    L.DomEvent.off(document as unknown as HTMLElement, 'touchmove', this.onDrag as any);
  }

  private getMouseLayerPoint(evt: MouseEvent): PixelPoint {
    const containerPoint = (this.map as any).mouseEventToContainerPoint
      ? (this.map as any).mouseEventToContainerPoint(evt)
      : leafletAdapter.domEvent.getMousePosition(evt, this.map.getContainer());
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

    const cancelSvg =
      '<svg width="24" height="24" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path id="Shape" fill="#000000" fill-rule="evenodd" stroke="none" d="M 259 492.50885 C 246.074997 492.706177 232.493088 492.45282 228.817978 491.945801 C 225.142868 491.438782 216.142868 489.857574 208.817978 488.432007 C 201.493088 487.006409 190.610367 484.261627 184.634155 482.332489 C 178.657944 480.40332 169.003983 476.828857 163.180893 474.389191 C 157.357803 471.949524 148.29744 467.643341 143.046738 464.819885 C 137.796036 461.996399 129.449997 456.99115 124.5 453.697052 C 119.550003 450.402954 111.293777 444.34903 106.15284 440.243896 C 101.011902 436.138794 92.623894 428.598267 87.512817 423.487183 C 82.401749 418.376099 74.850319 409.988098 70.731857 404.847168 C 66.613396 399.706238 60.084385 390.688568 56.222939 384.807922 C 52.361488 378.927277 46.457199 368.577271 43.102295 361.807922 C 39.747387 355.038574 35.229752 344.765381 33.063103 338.978607 C 30.896452 333.191833 28.021513 324.641846 26.674347 319.978607 C 25.327181 315.315369 22.936838 304.524994 21.362476 296 C 18.712168 281.648865 18.5 278.684052 18.5 256 C 18.5 233.315948 18.712168 230.351135 21.362476 216 C 22.936838 207.475006 25.327181 196.684631 26.674347 192.021393 C 28.021513 187.358154 30.896452 178.808167 33.063103 173.021393 C 35.229752 167.234619 39.747387 156.961426 43.102295 150.192078 C 46.457199 143.422729 52.361488 133.072723 56.222939 127.192078 C 60.084385 121.311432 66.613396 112.293793 70.731857 107.152832 C 74.850319 102.011902 82.401749 93.623901 87.512817 88.512817 C 92.623894 83.401733 101.011902 75.850311 106.15284 71.731842 C 111.293777 67.613403 120.311432 61.084381 126.192078 57.222931 C 132.072723 53.361481 142.422714 47.457214 149.192078 44.102295 C 155.961441 40.747375 166.234619 36.229767 172.021393 34.06311 C 177.808151 31.896454 186.358154 29.021515 191.021393 27.674347 C 195.684631 26.327179 206.475006 23.936829 215 22.362488 C 229.351135 19.712158 232.315948 19.5 255 19.5 C 277.684052 19.5 280.648865 19.712158 295 22.362488 C 303.524994 23.936829 314.315369 26.327179 318.978607 27.674347 C 323.641846 29.021515 332.191833 31.896454 337.978607 34.06311 C 343.765381 36.229767 354.038574 40.747375 360.807922 44.102295 C 367.577271 47.457214 377.927277 53.361481 383.807922 57.222931 C 389.688568 61.084381 398.706207 67.613403 403.847168 71.731842 C 408.988098 75.850311 417.376099 83.401733 422.487183 88.512817 C 427.598267 93.623901 435.149689 102.011902 439.268158 107.152832 C 443.386597 112.293793 449.915619 121.311432 453.777069 127.192078 C 457.638519 133.072723 463.542786 143.422729 466.897705 150.192078 C 470.252625 156.961426 474.770233 167.234619 476.93689 173.021393 C 479.103546 178.808167 481.978485 187.358154 483.325653 192.021393 C 484.672821 196.684631 487.063171 207.475006 488.637512 216 C 491.287842 230.351135 491.5 233.315948 491.5 256 C 491.5 278.684052 491.287842 281.648865 488.637512 296 C 487.063171 304.524994 484.672821 315.315369 483.325653 319.978607 C 481.978485 324.641846 479.103546 333.191833 476.93689 338.978607 C 474.770233 344.765381 470.252625 355.038574 466.897705 361.807922 C 463.542786 368.577271 457.638519 378.927277 453.777069 384.807922 C 449.915619 390.688568 443.386597 399.706238 439.268158 404.847168 C 435.149689 409.988098 427.598267 418.376099 422.487183 423.487183 C 417.376099 428.598267 408.988098 436.149689 403.847168 440.268127 C 398.706207 444.386597 389.688568 450.915619 383.807922 454.777069 C 377.927277 458.638519 367.577271 464.542786 360.807922 467.897705 C 354.038574 471.252625 343.719879 475.787384 337.877502 477.975006 C 332.035126 480.162598 323.260132 483.081421 318.377502 484.461243 C 313.494873 485.841064 303.424988 488.135529 296 489.560028 C 284.417877 491.782104 279.161438 492.201019 259 492.50885 Z M 254 446.897247 C 267.611481 446.957642 277.86026 446.482086 284.5 445.481995 C 290 444.653595 299.674988 442.599243 306 440.916809 C 312.325012 439.234406 322.899994 435.599365 329.5 432.838959 C 336.100006 430.078583 346.074432 425.104797 351.665375 421.786163 C 357.256348 418.467529 365.806335 412.784119 370.665375 409.156372 C 375.524414 405.528625 384.463593 397.596863 390.530212 391.530212 C 396.596863 385.463593 404.528595 376.524414 408.156372 371.665375 C 411.784119 366.806335 417.467529 358.256348 420.786163 352.665375 C 424.104828 347.074402 429.078583 337.100006 431.838959 330.5 C 434.599365 323.899994 438.234406 313.325012 439.91684 307 C 441.599243 300.674988 443.653595 291 444.481995 285.5 C 445.430237 279.204468 445.98822 268.276276 445.98822 256 C 445.98822 243.723724 445.430237 232.795532 444.481995 226.5 C 443.653595 221 441.599243 211.325012 439.91684 205 C 438.234406 198.674988 434.599365 188.100006 431.838959 181.5 C 429.078583 174.899994 424.104828 164.925568 420.786163 159.334625 C 417.467529 153.743652 411.784119 145.193665 408.156372 140.334625 C 404.528595 135.475586 396.596863 126.536407 390.530212 120.469788 C 384.463593 114.403137 375.524414 106.471405 370.665375 102.843628 C 365.806335 99.215881 357.256348 93.532471 351.665375 90.213837 C 346.074432 86.895172 336.100006 81.921417 329.5 79.161041 C 322.899994 76.400635 312.325012 72.765594 306 71.08316 C 299.674988 69.400757 290 67.346405 284.5 66.518005 C 278.204468 65.569763 267.276276 65.01178 255 65.01178 C 242.723724 65.01178 231.795532 65.569763 225.5 66.518005 C 220 67.346405 210.324997 69.400757 204 71.08316 C 197.675003 72.765594 187.100006 76.400635 180.5 79.161041 C 173.899994 81.921417 163.925583 86.895172 158.334625 90.213837 C 152.743668 93.532471 144.193665 99.215881 139.334625 102.843628 C 134.475586 106.471405 125.5364 114.403137 119.469772 120.469788 C 113.403152 126.536407 105.47139 135.475586 101.843643 140.334625 C 98.215889 145.193665 92.532478 153.743652 89.213829 159.334625 C 85.895187 164.925568 80.921425 174.899994 78.161034 181.5 C 75.400642 188.100006 71.765602 198.674988 70.083176 205 C 68.400742 211.325012 66.346413 221 65.517998 226.5 C 64.569763 232.795532 64.011787 243.723724 64.011787 256 C 64.011787 268.276276 64.569763 279.204468 65.517998 285.5 C 66.346413 291 68.400742 300.674988 70.083176 307 C 71.765602 313.325012 75.400642 323.899994 78.161034 330.5 C 80.921425 337.100006 85.895187 347.074402 89.213829 352.665375 C 92.532478 358.256348 98.215889 366.806335 101.843643 371.665375 C 105.47139 376.524414 113.403152 385.463593 119.469772 391.530212 C 125.5364 397.596863 134.475586 405.528625 139.334625 409.156372 C 144.193665 412.784119 152.743668 418.467529 158.334625 421.786163 C 163.925583 425.104797 173.899994 430.078583 180.5 432.838959 C 187.100006 435.599365 197.734085 439.25061 204.131302 440.952881 C 210.528503 442.655151 219.75351 444.668549 224.631302 445.427094 C 229.817871 446.233673 242.011246 446.844055 254 446.897247 Z"/><path id="path2" fill="#800000" fill-rule="evenodd" stroke="none" d="M 156 373.906311 C 140.875 373.871002 127.9375 373.615112 127.25 373.337708 C 126.5625 373.060303 126 372.072937 126 371.143555 C 126 370.214203 146.628433 343.53772 171.840973 311.862488 C 197.053513 280.187286 217.991867 253.463562 218.370667 252.47644 C 218.806335 251.341125 218.221786 249.464233 216.779678 247.368073 C 215.525864 245.545563 196.612503 221.361847 174.75 193.626465 C 152.887497 165.891052 135 142.531311 135 141.715881 C 135 140.900421 136.012497 139.961914 137.25 139.63028 C 138.487503 139.298645 152.408203 139.021179 168.184906 139.013641 C 184.588272 139.005859 197.976456 139.420746 199.454529 139.982727 C 201.182831 140.639801 210.486664 152.319733 227.533463 175.232727 C 241.555283 194.079712 253.994949 210.166199 255.177185 210.980438 C 257.208252 212.379272 257.562622 212.186401 261.607452 207.480438 C 263.961853 204.74118 276.052643 189 288.47583 172.5 C 300.899048 156 312.286682 141.714874 313.781738 140.75528 C 316.198669 139.203949 319.554993 139.009949 344.058868 139.00528 C 366.27774 139.001007 371.993561 139.274811 373.557343 140.418274 C 375.458923 141.808746 375.448914 141.90155 373.046875 145.150452 C 371.699341 146.973114 352.828827 170.746307 331.112396 197.979767 C 309.395966 225.213257 291.465973 248.396271 291.267914 249.497589 C 291.012512 250.91803 304.435944 268.61731 337.453918 310.395416 C 363.05426 342.787903 384 370.077271 384 371.038422 C 384 371.999603 383.288208 373.059174 382.418213 373.393005 C 381.548218 373.726868 367.485718 373.993347 351.168213 373.98526 C 329.591888 373.974548 320.854309 373.633606 319.132629 372.73526 C 317.830597 372.055847 302.980591 353.049988 286.132629 330.5 C 260.059052 295.602051 255.12793 289.5 253 289.5 C 250.878326 289.5 245.808807 295.701355 219.5 330.479431 C 202.449997 353.018127 187.375 372.023987 186 372.714691 C 184.165009 373.636475 176.184906 373.95343 156 373.906311 Z"/></svg>';

    const confirmSvg =
      '<svg width="24" height="24" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path id="Shape" fill="#000000" fill-rule="evenodd" stroke="none" d="M 259 492.50885 C 246.074997 492.706177 232.493088 492.45282 228.817978 491.945801 C 225.142868 491.438782 216.142868 489.857574 208.817978 488.432007 C 201.493088 487.006409 190.610367 484.261627 184.634155 482.332489 C 178.657944 480.40332 169.003983 476.828857 163.180893 474.389191 C 157.357803 471.949524 148.29744 467.643341 143.046738 464.819885 C 137.796036 461.996399 129.449997 456.99115 124.5 453.697052 C 119.550003 450.402954 111.293777 444.34903 106.15284 440.243896 C 101.011902 436.138794 92.623894 428.598267 87.512817 423.487183 C 82.401749 418.376099 74.850319 409.988098 70.731857 404.847168 C 66.613396 399.706238 60.084385 390.688568 56.222939 384.807922 C 52.361488 378.927277 46.457199 368.577271 43.102295 361.807922 C 39.747387 355.038574 35.229752 344.765381 33.063103 338.978607 C 30.896452 333.191833 28.021513 324.641846 26.674347 319.978607 C 25.327181 315.315369 22.936838 304.524994 21.362476 296 C 18.712168 281.648865 18.5 278.684052 18.5 256 C 18.5 233.315948 18.712168 230.351135 21.362476 216 C 22.936838 207.475006 25.327181 196.684631 26.674347 192.021393 C 28.021513 187.358154 30.896452 178.808167 33.063103 173.021393 C 35.229752 167.234619 39.747387 156.961426 43.102295 150.192078 C 46.457199 143.422729 52.361488 133.072723 56.222939 127.192078 C 60.084385 121.311432 66.613396 112.293793 70.731857 107.152832 C 74.850319 102.011902 82.401749 93.623901 87.512817 88.512817 C 92.623894 83.401733 101.011902 75.850311 106.15284 71.731842 C 111.293777 67.613403 120.311432 61.084381 126.192078 57.222931 C 132.072723 53.361481 142.422714 47.457214 149.192078 44.102295 C 155.961441 40.747375 166.234619 36.229767 172.021393 34.06311 C 177.808151 31.896454 186.358154 29.021515 191.021393 27.674347 C 195.684631 26.327179 206.475006 23.936829 215 22.362488 C 229.351135 19.712158 232.315948 19.5 255 19.5 C 277.684052 19.5 280.648865 19.712158 295 22.362488 C 303.524994 23.936829 314.315369 26.327179 318.978607 27.674347 C 323.641846 29.021515 332.191833 31.896454 337.978607 34.06311 C 343.765381 36.229767 354.038574 40.747375 360.807922 44.102295 C 367.577271 47.457214 377.927277 53.361481 383.807922 57.222931 C 389.688568 61.084381 398.706207 67.613403 403.847168 71.731842 C 408.988098 75.850311 417.376099 83.401733 422.487183 88.512817 C 427.598267 93.623901 435.149689 102.011902 439.268158 107.152832 C 443.386597 112.293793 449.915619 121.311432 453.777069 127.192078 C 457.638519 133.072723 463.542786 143.422729 466.897705 150.192078 C 470.252625 156.961426 474.770233 167.234619 476.93689 173.021393 C 479.103546 178.808167 481.978485 187.358154 483.325653 192.021393 C 484.672821 196.684631 487.063171 207.475006 488.637512 216 C 491.287842 230.351135 491.5 233.315948 491.5 256 C 491.5 278.684052 491.287842 281.648865 488.637512 296 C 487.063171 304.524994 484.672821 315.315369 483.325653 319.978607 C 481.978485 324.641846 479.103546 333.191833 476.93689 338.978607 C 474.770233 344.765381 470.252625 355.038574 466.897705 361.807922 C 463.542786 368.577271 457.638519 378.927277 453.777069 384.807922 C 449.915619 390.688568 443.386597 399.706238 439.268158 404.847168 C 435.149689 409.988098 427.598267 418.376099 422.487183 423.487183 C 417.376099 428.598267 408.988098 436.149689 403.847168 440.268127 C 398.706207 444.386597 389.688568 450.915619 383.807922 454.777069 C 377.927277 458.638519 367.577271 464.542786 360.807922 467.897705 C 354.038574 471.252625 343.719879 475.787384 337.877502 477.975006 C 332.035126 480.162598 323.260132 483.081421 318.377502 484.461243 C 313.494873 485.841064 303.424988 488.135529 296 489.560028 C 284.417877 491.782104 279.161438 492.201019 259 492.50885 Z M 254 446.897247 C 267.611481 446.957642 277.86026 446.482086 284.5 445.481995 C 290 444.653595 299.674988 442.599243 306 440.916809 C 312.325012 439.234406 322.899994 435.599365 329.5 432.838959 C 336.100006 430.078583 346.074432 425.104797 351.665375 421.786163 C 357.256348 418.467529 365.806335 412.784119 370.665375 409.156372 C 375.524414 405.528625 384.463593 397.596863 390.530212 391.530212 C 396.596863 385.463593 404.528595 376.524414 408.156372 371.665375 C 411.784119 366.806335 417.467529 358.256348 420.786163 352.665375 C 424.104828 347.074402 429.078583 337.100006 431.838959 330.5 C 434.599365 323.899994 438.234406 313.325012 439.91684 307 C 441.599243 300.674988 443.653595 291 444.481995 285.5 C 445.430237 279.204468 445.98822 268.276276 445.98822 256 C 445.98822 243.723724 445.430237 232.795532 444.481995 226.5 C 443.653595 221 441.599243 211.325012 439.91684 205 C 438.234406 198.674988 434.599365 188.100006 431.838959 181.5 C 429.078583 174.899994 424.104828 164.925568 420.786163 159.334625 C 417.467529 153.743652 411.784119 145.193665 408.156372 140.334625 C 404.528595 135.475586 396.596863 126.536407 390.530212 120.469788 C 384.463593 114.403137 375.524414 106.471405 370.665375 102.843628 C 365.806335 99.215881 357.256348 93.532471 351.665375 90.213837 C 346.074432 86.895172 336.100006 81.921417 329.5 79.161041 C 322.899994 76.400635 312.325012 72.765594 306 71.08316 C 299.674988 69.400757 290 67.346405 284.5 66.518005 C 278.204468 65.569763 267.276276 65.01178 255 65.01178 C 242.723724 65.01178 231.795532 65.569763 225.5 66.518005 C 220 67.346405 210.324997 69.400757 204 71.08316 C 197.675003 72.765594 187.100006 76.400635 180.5 79.161041 C 173.899994 81.921417 163.925583 86.895172 158.334625 90.213837 C 152.743668 93.532471 144.193665 99.215881 139.334625 102.843628 C 134.475586 106.471405 125.5364 114.403137 119.469772 120.469788 C 113.403152 126.536407 105.47139 135.475586 101.843643 140.334625 C 98.215889 145.193665 92.532478 153.743652 89.213829 159.334625 C 85.895187 164.925568 80.921425 174.899994 78.161034 181.5 C 75.400642 188.100006 71.765602 198.674988 70.083176 205 C 68.400742 211.325012 66.346413 221 65.517998 226.5 C 64.569763 232.795532 64.011787 243.723724 64.011787 256 C 64.011787 268.276276 64.569763 279.204468 65.517998 285.5 C 66.346413 291 68.400742 300.674988 70.083176 307 C 71.765602 313.325012 75.400642 323.899994 78.161034 330.5 C 80.921425 337.100006 85.895187 347.074402 89.213829 352.665375 C 92.532478 358.256348 98.215889 366.806335 101.843643 371.665375 C 105.47139 376.524414 113.403152 385.463593 119.469772 391.530212 C 125.5364 397.596863 134.475586 405.528625 139.334625 409.156372 C 144.193665 412.784119 152.743668 418.467529 158.334625 421.786163 C 163.925583 425.104797 173.899994 430.078583 180.5 432.838959 C 187.100006 435.599365 197.734085 439.25061 204.131302 440.952881 C 210.528503 442.655151 219.75351 444.668549 224.631302 445.427094 C 229.817871 446.233673 242.011246 446.844055 254 446.897247 Z"/><path id="path1" fill="#008000" fill-rule="evenodd" stroke="none" d="M 223.844696 360 C 222.79425 360 204.506973 341.170593 178.987274 313.812744 C 144.992401 277.369232 135.966232 267.145691 136.201645 265.351257 C 136.396179 263.868408 143.092361 257.073425 155.444672 245.824249 C 166.363129 235.880859 175.214264 228.571442 176.336426 228.571442 C 177.515594 228.571442 181.716553 232.304138 186.987961 238.035706 C 191.775406 243.241058 201.629044 254.024994 208.884933 262 C 216.140823 269.975006 222.682266 276.635315 223.421478 276.80072 C 224.16246 276.966553 247.742722 250.494751 275.976837 217.800751 C 304.143097 185.185333 328.050385 157.879608 329.104156 157.121368 C 330.785767 155.911316 331.44046 156.0336 334.457672 158.121368 C 336.348328 159.429626 345.368622 167.190216 354.502747 175.367126 C 367.688812 187.171356 371.047394 190.689819 370.805115 192.445557 C 370.635864 193.67218 338.242889 231.469543 298.059082 277.32843 C 253.148834 328.581238 224.944153 360 223.844696 360 Z"/></svg>';

    if (this.onCancel && !this.cancelBtn) {
      this.cancelBtn = document.createElement('div');
      this.cancelBtn.className = 'polydraw-transform-cancel';
      this.cancelBtn.innerHTML = cancelSvg;
      L.DomEvent.on(this.cancelBtn, 'mousedown', (e: Event) => {
        (e as any).stopPropagation?.();
        (e as any).preventDefault?.();
        this.onCancel && this.onCancel();
      });
      L.DomEvent.on(this.cancelBtn, 'touchstart', (e: Event) => {
        (e as any).stopPropagation?.();
        (e as any).preventDefault?.();
        this.onCancel && this.onCancel();
      });
      this.root.appendChild(this.cancelBtn);
    }

    if (this.onConfirm && !this.confirmBtn) {
      this.confirmBtn = document.createElement('div');
      this.confirmBtn.className = 'polydraw-transform-confirm';
      this.confirmBtn.innerHTML = confirmSvg;
      L.DomEvent.on(this.confirmBtn, 'mousedown', (e: Event) => {
        (e as any).stopPropagation?.();
        (e as any).preventDefault?.();
        this.onConfirm && this.onConfirm();
      });
      L.DomEvent.on(this.confirmBtn, 'touchstart', (e: Event) => {
        (e as any).stopPropagation?.();
        (e as any).preventDefault?.();
        this.onConfirm && this.onConfirm();
      });
      this.root.appendChild(this.confirmBtn);
    }

    if (this.cancelBtn) {
      Object.assign(this.cancelBtn.style, {
        position: 'absolute',
        left: `${cancelX}px`,
        top: `${buttonY}px`,
      } as Partial<CSSStyleDeclaration>);
    }

    if (this.confirmBtn) {
      Object.assign(this.confirmBtn.style, {
        position: 'absolute',
        left: `${confirmX}px`,
        top: `${buttonY}px`,
      } as Partial<CSSStyleDeclaration>);
    }
  }

  private hideButtons(): void {
    if (this.cancelBtn) this.cancelBtn.style.display = 'none';
    if (this.confirmBtn) this.confirmBtn.style.display = 'none';
  }

  private showButtons(): void {
    if (this.cancelBtn) this.cancelBtn.style.display = '';
    if (this.confirmBtn) this.confirmBtn.style.display = '';
  }
}
