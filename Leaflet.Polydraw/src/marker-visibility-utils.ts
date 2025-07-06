/**
 * MarkerVisibilityUtils - Handles marker visibility optimization and importance calculations
 * This is a small, focused module for marker optimization logic
 */
import * as L from 'leaflet';
import type { ILatLng } from './types/polydraw-interfaces';
import { GeometryUtils } from './geometry-utils';

export class MarkerVisibilityUtils {
  /**
   * Calculate which markers should be visible based on their importance
   */
  static calculateMarkerVisibility(latlngs: ILatLng[], optimizationLevel: number): boolean[] {
    if (optimizationLevel === 0 || latlngs.length <= 3) {
      // No optimization or too few points - show all markers
      return new Array(latlngs.length).fill(true);
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
    for (let i = 0; i < pointsToHide && i < sortedIndices.length; i++) {
      const pointIndex = sortedIndices[i].index;
      // Don't hide if it would create too large gaps
      if (this.canHidePoint(latlngs, pointIndex, visibility)) {
        visibility[pointIndex] = false;
      }
    }

    return visibility;
  }

  /**
   * Calculate importance score for each point in the polygon
   */
  private static calculatePointImportance(latlngs: ILatLng[]): number[] {
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
      const angle = GeometryUtils.calculateAngle(prev, current, next);
      const angularImportance = Math.abs(Math.PI - angle); // Higher for sharper turns
      importance += angularImportance * 2;

      // 2. Distance from simplified line - points far from the line between neighbors are important
      const distanceImportance = GeometryUtils.calculateDistanceFromLine(prev, current, next);
      importance += distanceImportance * 1000; // Scale up distance importance

      // 3. Local extremes - points that are local maxima/minima in lat/lng are important
      const extremeImportance = this.calculateExtremeImportance(latlngs, i);
      importance += extremeImportance * 1.5;

      // 4. Distance to centroid - points far from center might be important features
      const centroid = GeometryUtils.calculateCentroid(latlngs);
      const distanceToCentroid = GeometryUtils.calculateDistance(current, centroid);
      const maxDistance = Math.max(
        ...latlngs.map((p) => GeometryUtils.calculateDistance(p, centroid)),
      );
      const centroidImportance = distanceToCentroid / maxDistance;
      importance += centroidImportance * 0.5;

      scores.push(importance);
    }

    return scores;
  }

  /**
   * Calculate importance based on being a local extreme
   */
  private static calculateExtremeImportance(latlngs: ILatLng[], index: number): number {
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
   * Check if a point can be hidden without creating too large visual gaps
   */
  private static canHidePoint(
    latlngs: ILatLng[],
    index: number,
    currentVisibility: boolean[],
  ): boolean {
    return true;
  }

  /**
   * Hide a marker visually while keeping it functional
   */
  static hideMarkerVisually(marker: L.Marker): void {
    const element = marker.getElement();
    if (element) {
      element.classList.add('polydraw-hidden-marker');
    }
  }

  /**
   * Show a hidden marker
   */
  static showMarkerVisually(marker: L.Marker): void {
    const element = marker.getElement();
    if (element) {
      element.classList.remove('polydraw-hidden-marker');
    }
  }

  /**
   * Add hover events to hidden markers to make them visible when needed
   */
  static addHiddenMarkerHoverEvents(marker: L.Marker): void {
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
}
