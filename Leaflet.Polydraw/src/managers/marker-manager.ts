import * as L from 'leaflet';
import { MarkerPosition } from '../enums';
import { Compass, PolyDrawUtil, Perimeter, Area } from '../utils';
import { IconFactory } from '../icon-factory';
import { PolygonUtil } from '../polygon.util';
import { TurfHelper } from '../turf-helper';
import type { ILatLng } from '../polygon-helpers';
import type { MarkerVisibilityResult, PointImportance } from '../core/polydraw-types';

/**
 * Manages all marker-related functionality including creation, optimization, and interactions
 */
export class MarkerManager {
  private map: L.Map;
  private config: any;
  private turfHelper: TurfHelper;

  constructor(map: L.Map, config: any, turfHelper: TurfHelper) {
    this.map = map;
    this.config = config;
    this.turfHelper = turfHelper;
  }

  /**
   * Add markers to a polygon with visual optimization
   */
  addMarker(
    latlngs: ILatLng[],
    featureGroup: L.FeatureGroup,
    visualOptimizationLevel: number = 0,
  ): void {
    // Calculate which markers should be visually hidden
    const markerVisibility = this.calculateMarkerVisibility(latlngs, visualOptimizationLevel);

    let menuMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerMenuIcon.position);
    let deleteMarkerIdx = this.getMarkerIndex(
      latlngs,
      this.config.markers.markerDeleteIcon.position,
    );
    let infoMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerInfoIcon.position);

    // Fallback for small polygons
    if (latlngs.length <= 5) {
      menuMarkerIdx = 0;
      deleteMarkerIdx = Math.floor(latlngs.length / 2);
      infoMarkerIdx = latlngs.length - 1;
    }

    latlngs.forEach((latlng, i) => {
      let iconClasses = this.config.markers.markerIcon.styleClasses;
      let isSpecialMarker = false;

      if (i === menuMarkerIdx && this.config.markers.menuMarker) {
        iconClasses = this.config.markers.markerMenuIcon.styleClasses;
        isSpecialMarker = true;
      }
      if (i === deleteMarkerIdx && this.config.markers.deleteMarker) {
        iconClasses = this.config.markers.markerDeleteIcon.styleClasses;
        isSpecialMarker = true;
      }
      if (i === infoMarkerIdx && this.config.markers.infoMarker) {
        iconClasses = this.config.markers.markerInfoIcon.styleClasses;
        isSpecialMarker = true;
      }

      const marker = new L.Marker(latlng, {
        icon: IconFactory.createDivIcon(iconClasses),
        draggable: this.config.modes.dragElbow,
        title: this.config.markers.coordsTitle ? this.getLatLngInfoString(latlng) : '',
        zIndexOffset:
          this.config.markers.markerIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
      });

      featureGroup.addLayer(marker).addTo(this.map);

      // Apply visual optimization (hide less important markers)
      if (!isSpecialMarker && !markerVisibility.visibility[i]) {
        this.hideMarkerVisually(marker);
      }

      // Set high z-index for special markers
      if (i === menuMarkerIdx || i === deleteMarkerIdx || i === infoMarkerIdx) {
        const element = marker.getElement();
        if (element) {
          element.style.zIndex = '10000';
        }
      }

      // Add drag event handlers
      if (this.config.modes.dragElbow) {
        // These will be handled by external drag handlers
        // marker.on('drag', (e) => this.markerDrag(featureGroup));
        // marker.on('dragend', (e) => this.markerDragEnd(featureGroup));

        // Add hover events for hidden markers
        if (!isSpecialMarker && !markerVisibility.visibility[i]) {
          this.addHiddenMarkerHoverEvents(marker);
        }
      }

      // Add popup and click events for special markers
      if (i === menuMarkerIdx && this.config.markers.menuMarker) {
        const menuPopup = this.generateMenuMarkerPopup(latlngs);
        marker.options.zIndexOffset =
          this.config.markers.markerMenuIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
        marker.bindPopup(menuPopup, { className: 'alter-marker' });
      }
      if (i === infoMarkerIdx && this.config.markers.infoMarker) {
        const closedLatlngs = [...latlngs];
        if (latlngs.length > 0) {
          const first = latlngs[0];
          const last = latlngs[latlngs.length - 1];
          if (first.lat !== last.lat || first.lng !== last.lng) {
            closedLatlngs.push(first);
          }
        }
        const area = PolygonUtil.getSqmArea(closedLatlngs);
        const perimeter = PolygonUtil.getPerimeter(closedLatlngs);
        const infoPopup = this.generateInfoMarkerPopup(area, perimeter);
        marker.options.zIndexOffset =
          this.config.markers.markerInfoIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
        marker.bindPopup(infoPopup, { className: 'info-marker' });
      }
      if (i === deleteMarkerIdx && this.config.markers.deleteMarker) {
        marker.options.zIndexOffset =
          this.config.markers.markerInfoIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
        // Delete click handler will be attached externally
      }
    });
  }

  /**
   * Add hole markers with visual optimization
   */
  addHoleMarker(
    latlngs: ILatLng[],
    featureGroup: L.FeatureGroup,
    visualOptimizationLevel: number = 0,
  ): void {
    const markerVisibility = this.calculateMarkerVisibility(latlngs, visualOptimizationLevel);

    latlngs.forEach((latlng, i) => {
      const iconClasses = this.config.markers.holeIcon.styleClasses;
      const marker = new L.Marker(latlng, {
        icon: IconFactory.createDivIcon(iconClasses),
        draggable: true,
        title: this.getLatLngInfoString(latlng),
        zIndexOffset: this.config.markers.holeIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
      });
      featureGroup.addLayer(marker).addTo(this.map);

      // Apply visual optimization for hole markers
      if (!markerVisibility.visibility[i]) {
        this.hideMarkerVisually(marker);
        this.addHiddenMarkerHoverEvents(marker);
      }

      // Drag handlers will be attached externally
    });
  }

  /**
   * Calculate which markers should be visible based on their importance
   */
  private calculateMarkerVisibility(
    latlngs: ILatLng[],
    optimizationLevel: number,
  ): MarkerVisibilityResult {
    if (optimizationLevel === 0 || latlngs.length <= 3) {
      // No optimization or too few points - show all markers
      const visibility = new Array(latlngs.length).fill(true);
      return {
        visibility,
        hiddenCount: 0,
        totalCount: latlngs.length,
      };
    }

    // Calculate importance scores for each point
    const importanceScores = this.calculatePointImportance(latlngs);

    // Determine how many points to hide based on optimization level
    const hideRatio = Math.min(optimizationLevel / 10, 0.8); // Max 80% can be hidden
    const pointsToHide = Math.floor(latlngs.length * hideRatio);

    // Sort points by importance (lowest first)
    const sortedIndices = importanceScores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => a.score - b.score);

    // Create visibility array - start with all visible
    const visibility = new Array(latlngs.length).fill(true);

    // Hide the least important points
    let hiddenCount = 0;
    for (let i = 0; i < pointsToHide && i < sortedIndices.length; i++) {
      const pointIndex = sortedIndices[i].index;
      // Don't hide if it would create too large gaps
      if (this.canHidePoint(latlngs, pointIndex, visibility)) {
        visibility[pointIndex] = false;
        hiddenCount++;
      }
    }

    return {
      visibility,
      hiddenCount,
      totalCount: latlngs.length,
    };
  }

  /**
   * Calculate importance score for each point in the polygon
   */
  private calculatePointImportance(latlngs: ILatLng[]): number[] {
    const scores: number[] = [];
    const len = latlngs.length;

    for (let i = 0; i < len; i++) {
      let importance = 0;

      // Get neighboring points (handle wrapping)
      const prevIndex = (i - 1 + len) % len;
      const nextIndex = (i + 1) % len;
      const prev = latlngs[prevIndex];
      const current = latlngs[i];
      const next = latlngs[nextIndex];

      // 1. Angular deviation - points that create sharp turns are more important
      const angle = this.calculateAngle(prev, current, next);
      const angularImportance = Math.abs(Math.PI - angle); // Higher for sharper turns
      importance += angularImportance * 2;

      // 2. Distance from simplified line - points far from the line between neighbors are important
      const distanceImportance = this.calculateDistanceFromLine(prev, current, next);
      importance += distanceImportance * 1000; // Scale up distance importance

      // 3. Local extremes - points that are local maxima/minima in lat/lng are important
      const extremeImportance = this.calculateExtremeImportance(latlngs, i);
      importance += extremeImportance * 1.5;

      // 4. Distance to centroid - points far from center might be important features
      const centroid = this.calculateCentroid(latlngs);
      const distanceToCentroid = this.calculateDistance(current, centroid);
      const maxDistance = Math.max(...latlngs.map((p) => this.calculateDistance(p, centroid)));
      const centroidImportance = distanceToCentroid / maxDistance;
      importance += centroidImportance * 0.5;

      scores.push(importance);
    }

    return scores;
  }

  /**
   * Calculate angle between three points
   */
  private calculateAngle(p1: ILatLng, p2: ILatLng, p3: ILatLng): number {
    const v1 = { x: p1.lng - p2.lng, y: p1.lat - p2.lat };
    const v2 = { x: p3.lng - p2.lng, y: p3.lat - p2.lat };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosAngle = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  }

  /**
   * Calculate distance from point to line between two other points
   */
  private calculateDistanceFromLine(p1: ILatLng, point: ILatLng, p2: ILatLng): number {
    const A = point.lng - p1.lng;
    const B = point.lat - p1.lat;
    const C = p2.lng - p1.lng;
    const D = p2.lat - p1.lat;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    const param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = p1.lng;
      yy = p1.lat;
    } else if (param > 1) {
      xx = p2.lng;
      yy = p2.lat;
    } else {
      xx = p1.lng + param * C;
      yy = p1.lat + param * D;
    }

    const dx = point.lng - xx;
    const dy = point.lat - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate importance based on being a local extreme
   */
  private calculateExtremeImportance(latlngs: ILatLng[], index: number): number {
    const len = latlngs.length;
    const windowSize = Math.min(5, Math.floor(len / 4)); // Look at nearby points
    let importance = 0;

    const current = latlngs[index];

    // Check if this point is extreme in latitude or longitude within the window
    let minLat = current.lat,
      maxLat = current.lat;
    let minLng = current.lng,
      maxLng = current.lng;

    for (let i = 1; i <= windowSize; i++) {
      const prevIndex = (index - i + len) % len;
      const nextIndex = (index + i) % len;

      const prev = latlngs[prevIndex];
      const next = latlngs[nextIndex];

      minLat = Math.min(minLat, prev.lat, next.lat);
      maxLat = Math.max(maxLat, prev.lat, next.lat);
      minLng = Math.min(minLng, prev.lng, next.lng);
      maxLng = Math.max(maxLng, prev.lng, next.lng);
    }

    // If current point is at the extreme, it's important
    if (current.lat === minLat || current.lat === maxLat) importance += 1;
    if (current.lng === minLng || current.lng === maxLng) importance += 1;

    return importance;
  }

  /**
   * Calculate centroid of polygon
   */
  private calculateCentroid(latlngs: ILatLng[]): ILatLng {
    let sumLat = 0,
      sumLng = 0;
    for (const point of latlngs) {
      sumLat += point.lat;
      sumLng += point.lng;
    }
    return {
      lat: sumLat / latlngs.length,
      lng: sumLng / latlngs.length,
    };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(p1: ILatLng, p2: ILatLng): number {
    const dx = p1.lng - p2.lng;
    const dy = p1.lat - p2.lat;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if a point can be hidden without creating too large visual gaps
   */
  private canHidePoint(latlngs: ILatLng[], index: number, currentVisibility: boolean[]): boolean {
    return true; // Simplified for now - could add more sophisticated logic
  }

  /**
   * Hide a marker visually while keeping it functional
   */
  private hideMarkerVisually(marker: L.Marker): void {
    const element = marker.getElement();
    if (element) {
      element.classList.add('polydraw-hidden-marker');
    }
  }

  /**
   * Show a hidden marker
   */
  private showMarkerVisually(marker: L.Marker): void {
    const element = marker.getElement();
    if (element) {
      element.classList.remove('polydraw-hidden-marker');
    }
  }

  /**
   * Add hover events to hidden markers to make them visible when needed
   */
  private addHiddenMarkerHoverEvents(marker: L.Marker): void {
    marker.on('mouseover', () => {
      this.showMarkerVisually(marker);
    });

    marker.on('mouseout', () => {
      // Only hide again if not currently being dragged
      if (!marker.dragging || !(marker.dragging as any)._dragging) {
        this.hideMarkerVisually(marker);
      }
    });

    marker.on('dragstart', () => {
      this.showMarkerVisually(marker);
    });

    marker.on('dragend', () => {
      // Hide again after a short delay
      setTimeout(() => {
        this.hideMarkerVisually(marker);
      }, 1000);
    });
  }

  /**
   * Get marker index based on position
   */
  private getMarkerIndex(latlngs: ILatLng[], position: MarkerPosition): number {
    const bounds: L.LatLngBounds = PolyDrawUtil.getBounds(latlngs, Math.sqrt(2) / 2);
    const compass = new Compass(
      bounds.getSouth(),
      bounds.getWest(),
      bounds.getNorth(),
      bounds.getEast(),
    );
    const compassDirection = compass.getDirection(position);
    const latLngPoint: ILatLng = {
      lat: compassDirection.lat,
      lng: compassDirection.lng,
    };
    const targetPoint = this.turfHelper.getCoord(latLngPoint);
    const fc = this.turfHelper.getFeaturePointCollection(latlngs);
    const nearestPointIdx = this.turfHelper.getNearestPointIndex(targetPoint, fc as any);

    return nearestPointIdx;
  }

  /**
   * Get lat/lng info string for marker title
   */
  private getLatLngInfoString(latlng: ILatLng): string {
    return 'Latitude: ' + latlng.lat + ' Longitude: ' + latlng.lng;
  }

  /**
   * Generate menu marker popup
   */
  private generateMenuMarkerPopup(latLngs: ILatLng[]): HTMLElement {
    const outerWrapper: HTMLDivElement = document.createElement('div');
    outerWrapper.classList.add('alter-marker-outer-wrapper');

    const wrapper: HTMLDivElement = document.createElement('div');
    wrapper.classList.add('alter-marker-wrapper');

    const invertedCorner: HTMLElement = document.createElement('i');
    invertedCorner.classList.add('inverted-corner');

    const markerContent: HTMLDivElement = document.createElement('div');
    markerContent.classList.add('content');

    const markerContentWrapper: HTMLDivElement = document.createElement('div');
    markerContentWrapper.classList.add('marker-menu-content');

    const simplify: HTMLDivElement = document.createElement('div');
    simplify.classList.add('marker-menu-button', 'simplify');
    simplify.title = 'Simplify';

    const doubleElbows: HTMLDivElement = document.createElement('div');
    doubleElbows.classList.add('marker-menu-button', 'double-elbows');
    doubleElbows.title = 'DoubleElbows';

    const bbox: HTMLDivElement = document.createElement('div');
    bbox.classList.add('marker-menu-button', 'bbox');
    bbox.title = 'Bounding box';

    const bezier: HTMLDivElement = document.createElement('div');
    bezier.classList.add('marker-menu-button', 'bezier');
    bezier.title = 'Curve';

    const separator: HTMLDivElement = document.createElement('div');
    separator.classList.add('separator');

    outerWrapper.appendChild(wrapper);
    wrapper.appendChild(invertedCorner);
    wrapper.appendChild(markerContent);
    markerContent.appendChild(markerContentWrapper);
    markerContentWrapper.appendChild(simplify);
    markerContentWrapper.appendChild(separator);
    markerContentWrapper.appendChild(doubleElbows);
    markerContentWrapper.appendChild(separator);
    markerContentWrapper.appendChild(bbox);
    markerContentWrapper.appendChild(separator);
    markerContentWrapper.appendChild(bezier);

    // Event handlers will be attached externally
    // simplify.onclick = () => this.convertToSimplifiedPolygon(latLngs);
    // bbox.onclick = () => this.convertToBoundsPolygon(latLngs);
    // doubleElbows.onclick = () => this.doubleElbows(latLngs);
    // bezier.onclick = () => this.bezierify(latLngs);

    return outerWrapper;
  }

  /**
   * Generate info marker popup
   */
  private generateInfoMarkerPopup(area: number, perimeter: number): HTMLElement {
    const _perimeter = new Perimeter(perimeter, this.config);
    const _area = new Area(area, this.config);

    const outerWrapper: HTMLDivElement = document.createElement('div');
    outerWrapper.classList.add('info-marker-outer-wrapper');

    const wrapper: HTMLDivElement = document.createElement('div');
    wrapper.classList.add('info-marker-wrapper');

    const invertedCorner: HTMLElement = document.createElement('i');
    invertedCorner.classList.add('inverted-corner');

    const markerContent: HTMLDivElement = document.createElement('div');
    markerContent.classList.add('content');

    const rowWithSeparator: HTMLDivElement = document.createElement('div');
    rowWithSeparator.classList.add('row', 'bottom-separator');

    const perimeterHeader: HTMLDivElement = document.createElement('div');
    perimeterHeader.classList.add('header');
    perimeterHeader.innerText = this.config.markers.markerInfoIcon.perimeterLabel;

    const emptyDiv: HTMLDivElement = document.createElement('div');

    const perimeterArea: HTMLSpanElement = document.createElement('span');
    perimeterArea.classList.add('area');
    perimeterArea.innerText = this.config.markers.markerInfoIcon.useMetrics
      ? _perimeter.metricLength
      : _perimeter.imperialLength;
    const perimeterUnit: HTMLSpanElement = document.createElement('span');
    perimeterUnit.classList.add('unit');
    perimeterUnit.innerText =
      ' ' +
      (this.config.markers.markerInfoIcon.useMetrics
        ? _perimeter.metricUnit
        : _perimeter.imperialUnit);

    const row: HTMLDivElement = document.createElement('div');
    row.classList.add('row');

    const areaHeader: HTMLDivElement = document.createElement('div');
    areaHeader.classList.add('header');
    areaHeader.innerText = this.config.markers.markerInfoIcon.areaLabel;

    const rightRow: HTMLDivElement = document.createElement('div');
    row.classList.add('right-margin');

    const areaArea: HTMLSpanElement = document.createElement('span');
    areaArea.classList.add('area');
    areaArea.innerText = this.config.markers.markerInfoIcon.useMetrics
      ? _area.metricArea
      : _area.imperialArea;
    const areaUnit: HTMLSpanElement = document.createElement('span');
    areaUnit.classList.add('unit');
    areaUnit.innerText =
      ' ' + (this.config.markers.markerInfoIcon.useMetrics ? _area.metricUnit : _area.imperialUnit);

    outerWrapper.appendChild(wrapper);
    wrapper.appendChild(invertedCorner);
    wrapper.appendChild(markerContent);
    markerContent.appendChild(rowWithSeparator);
    rowWithSeparator.appendChild(perimeterHeader);
    rowWithSeparator.appendChild(emptyDiv);
    emptyDiv.appendChild(perimeterArea);
    emptyDiv.appendChild(perimeterUnit);
    markerContent.appendChild(row);
    row.appendChild(areaHeader);
    row.appendChild(rightRow);
    rightRow.appendChild(areaArea);
    rightRow.appendChild(areaUnit);

    return outerWrapper;
  }
}
