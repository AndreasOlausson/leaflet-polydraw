import * as L from 'leaflet';
import { MarkerPosition } from '../enums';
import { IconFactory } from '../icon-factory';
import { PolygonUtil } from '../polygon.util';
import { Compass, PolyDrawUtil, Perimeter, Area } from '../utils';
import type { ILatLng, PolydrawConfig } from '../types/polydraw-interfaces';
import { TurfHelper } from '../turf-helper';

/**
 * Manages marker creation, positioning, and optimization for polygons
 */
export class MarkerManager {
  private lastDragTime?: Map<string, number>;
  private isUpdatingPolygon = false;

  constructor(
    private config: PolydrawConfig,
    private turfHelper: TurfHelper,
    private map: L.Map,
  ) {}

  /**
   * Get marker index based on position configuration (used internally)
   */
  private getMarkerIndexInternal(latlngs: ILatLng[], position: MarkerPosition): number {
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
   * Generate coordinate info string for marker tooltips
   */
  getLatLngInfoString(latlng: ILatLng): string {
    return 'Latitude: ' + latlng.lat + ' Longitude: ' + latlng.lng;
  }

  /**
   * Add markers for polygon vertices with visual optimization and special markers
   */
  addMarker(
    latlngs: ILatLng[],
    featureGroup: L.FeatureGroup,
    visualOptimizationLevel: number = 0,
    onMarkerDrag?: (featureGroup: L.FeatureGroup) => void,
    onMarkerDragEnd?: (featureGroup: L.FeatureGroup) => void,
    onDeletePolygon?: (polygon: ILatLng[][]) => void,
    onSimplify?: (latlngs: ILatLng[]) => void,
    onBbox?: (latlngs: ILatLng[]) => void,
    onDoubleElbows?: (latlngs: ILatLng[]) => void,
    onBezier?: (latlngs: ILatLng[]) => void,
  ) {
    // Calculate which markers should be visually hidden
    const markerVisibility = this.calculateMarkerVisibility(latlngs, visualOptimizationLevel);

    let menuMarkerIdx = this.getMarkerIndexInternal(
      latlngs,
      this.config.markers.markerMenuIcon.position,
    );
    let deleteMarkerIdx = this.getMarkerIndexInternal(
      latlngs,
      this.config.markers.markerDeleteIcon.position,
    );
    let infoMarkerIdx = this.getMarkerIndexInternal(
      latlngs,
      this.config.markers.markerInfoIcon.position,
    );

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
      } else if (i === deleteMarkerIdx && this.config.markers.deleteMarker) {
        iconClasses = this.config.markers.markerDeleteIcon.styleClasses;
        isSpecialMarker = true;
      } else if (i === infoMarkerIdx && this.config.markers.infoMarker) {
        iconClasses = this.config.markers.markerInfoIcon.styleClasses;
        isSpecialMarker = true;
      }

      // Handle both array and string formats for iconClasses
      const processedClasses = Array.isArray(iconClasses) ? iconClasses : [iconClasses];

      const marker = new L.Marker(latlng, {
        icon: IconFactory.createDivIcon(processedClasses),
        draggable: this.config.modes.dragElbow,
        title: this.config.markers.coordsTitle ? this.getLatLngInfoString(latlng) : '',
        zIndexOffset:
          this.config.markers.markerIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
      });

      featureGroup.addLayer(marker).addTo(this.map);

      // Apply visual optimization (hide less important markers)
      if (!isSpecialMarker && !markerVisibility[i]) {
        // Use setTimeout to ensure the marker element is available in the DOM
        setTimeout(() => {
          this.hideMarkerVisually(marker);
        }, 0);
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
        marker.on('drag', (e) => {
          if (onMarkerDrag) onMarkerDrag(featureGroup);
        });
        marker.on('dragend', (e) => {
          if (onMarkerDragEnd) onMarkerDragEnd(featureGroup);
        });

        // Add hover events for hidden markers
        if (!isSpecialMarker && !markerVisibility[i]) {
          this.addHiddenMarkerHoverEvents(marker);
        }
      }

      // Add popup and click events for special markers
      if (i === menuMarkerIdx && this.config.markers.menuMarker) {
        const menuPopup = this.generateMenuMarkerPopup(
          latlngs,
          onSimplify,
          onBbox,
          onDoubleElbows,
          onBezier,
        );
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
        marker.on('click', (e) => {
          if (onDeletePolygon) onDeletePolygon([latlngs]);
        });
      }
    });
  }

  /**
   * Add a hole marker (red marker for polygon holes)
   */
  addHoleMarker(
    polyElement: ILatLng[],
    featureGroup: L.FeatureGroup,
    visualOptimizationLevel: number,
    onMarkerDrag: (featureGroup: L.FeatureGroup) => void,
    onMarkerDragEnd: (featureGroup: L.FeatureGroup) => void,
  ) {
    polyElement.forEach((latlng, index) => {
      if (this.shouldSkipMarker(index, polyElement.length, visualOptimizationLevel)) {
        return;
      }

      const marker = this.createMarker(latlng, MarkerPosition.Hole);
      this.setupMarkerDragEvents(marker, featureGroup, onMarkerDrag, onMarkerDragEnd);
      featureGroup.addLayer(marker);
    });
  }

  /**
   * Handle marker drag operations - update polygon coordinates based on marker positions
   */
  handleMarkerDrag(featureGroup: L.FeatureGroup) {
    if (this.isUpdatingPolygon) {
      return;
    }

    const featureGroupId = (featureGroup as any)._leaflet_id || 'unknown';
    const now = Date.now();

    if (!this.lastDragTime) {
      this.lastDragTime = new Map();
    }

    const lastUpdate = this.lastDragTime.get(featureGroupId) || 0;
    if (now - lastUpdate < 16) {
      // Throttle to ~60fps
      return;
    }
    this.lastDragTime.set(featureGroupId, now);

    const allLayers = featureGroup.getLayers() as L.Layer[];
    const polygon = allLayers.find((layer) => layer instanceof L.Polygon) as any;
    const markers = allLayers.filter((layer) => layer instanceof L.Marker);

    if (!polygon || markers.length === 0) {
      return;
    }

    try {
      this.isUpdatingPolygon = true;

      const originalStructure = (polygon as any)._polydrawOriginalStructure;
      const posarrays = polygon.getLatLngs();

      if (originalStructure && this.hasHoleStructure(originalStructure)) {
        const rebuiltCoords = this.rebuildCoordinatesFromMarkersWithOriginalStructure(
          originalStructure,
          markers,
        );
        if (rebuiltCoords && this.isValidLatLngsStructure(rebuiltCoords)) {
          (polygon as any).setLatLngs(rebuiltCoords);
        }

        // Update polylines for holes if they exist
        const polylines = allLayers.filter(
          (layer) => layer instanceof L.Polyline && !(layer instanceof L.Polygon),
        );

        if (
          polylines.length > 0 &&
          rebuiltCoords &&
          rebuiltCoords[0] &&
          rebuiltCoords[0].length > 1
        ) {
          let polylineIndex = 0;
          for (let ringIndex = 1; ringIndex < rebuiltCoords[0].length; ringIndex++) {
            if (polylineIndex < polylines.length && rebuiltCoords[0][ringIndex]) {
              (polylines[polylineIndex] as any).setLatLngs(rebuiltCoords[0][ringIndex]);
              polylineIndex++;
            }
          }
        }
      } else if (this.isSimplePolygonStructure(posarrays)) {
        // For simple polygons, just map markers directly to coordinates
        const newCoords = markers.map((marker) => marker.getLatLng());

        if (newCoords.length > 0 && this.isValidCoordinateArray(newCoords)) {
          (polygon as any).setLatLngs(newCoords);
        }
      } else {
        const rebuiltCoords = this.rebuildCoordinatesFromMarkers(polygon, markers);
        if (rebuiltCoords && this.isValidLatLngsStructure(rebuiltCoords)) {
          (polygon as any).setLatLngs(rebuiltCoords);
        }

        // Update polylines for holes if they exist
        const polylines = allLayers.filter(
          (layer) => layer instanceof L.Polyline && !(layer instanceof L.Polygon),
        );

        if (
          polylines.length > 0 &&
          rebuiltCoords &&
          rebuiltCoords[0] &&
          rebuiltCoords[0].length > 1
        ) {
          let polylineIndex = 0;
          for (let ringIndex = 1; ringIndex < rebuiltCoords[0].length; ringIndex++) {
            if (polylineIndex < polylines.length && rebuiltCoords[0][ringIndex]) {
              (polylines[polylineIndex] as any).setLatLngs(rebuiltCoords[0][ringIndex]);
              polylineIndex++;
            }
          }
        }
      }
    } catch (error) {
      console.error('handleMarkerDrag: Error updating polygon coordinates:', error);
    } finally {
      // 🎯 Ensure flag is reset even if setLatLngs triggers more events
      setTimeout(() => {
        this.isUpdatingPolygon = false;
      }, 50);
    }
  }

  /**
   * Handle marker drag end operations - process polygon after marker drag completion
   */
  handleMarkerDragEnd(
    featureGroup: L.FeatureGroup,
    onPolygonInfoDelete: () => void,
    onFeatureGroupRemove: (featureGroup: L.FeatureGroup) => void,
    onPolygonLayerAdd: (
      geoJSON: any,
      simplify: boolean,
      dynamicTolerance: boolean,
      optimizationLevel: number,
    ) => void,
    onPolygonInfoCreate: () => void,
    getArrayOfFeatureGroups?: () => any[],
    config?: any,
  ) {
    onPolygonInfoDelete();

    // Get polygon and markers from feature group
    const allLayers = featureGroup.getLayers() as any;
    const polygon = allLayers.find((layer) => layer instanceof L.Polygon);
    const markers = allLayers.filter((layer) => layer instanceof L.Marker);

    if (!polygon || markers.length === 0) {
      console.warn('handleMarkerDragEnd: No polygon or markers found');
      onPolygonInfoCreate();
      return;
    }

    // Retrieve optimization level from the original polygon before removing it
    let optimizationLevel = 0;
    if (polygon && (polygon as any)._polydrawOptimizationLevel !== undefined) {
      optimizationLevel = (polygon as any)._polydrawOptimizationLevel;
    }

    try {
      // 🎯 CRITICAL FIX: Preserve original structure before removal
      const originalLatLngs = (polygon as any)._polydrawOriginalStructure || polygon.getLatLngs();

      let feature: any;

      // Step 1: Remove the original polygon
      onFeatureGroupRemove(featureGroup);

      // Step 2: Build GeoJSON from current marker positions
      const markerCoordinates = markers.map((marker) => {
        const latlng = marker.getLatLng();
        return [latlng.lng, latlng.lat]; // GeoJSON format: [lng, lat]
      });

      // Step 3: Rebuild the polygon structure based on original structure
      let geoJSON: any;

      if (this.hasHoleStructure(originalLatLngs)) {
        geoJSON = this.buildPolygonWithHoles(originalLatLngs, markers);
      } else {
        // Ensure the polygon is closed
        if (markerCoordinates.length > 0) {
          const first = markerCoordinates[0];
          const last = markerCoordinates[markerCoordinates.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            markerCoordinates.push([first[0], first[1]]);
          }
        }

        geoJSON = {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'Polygon' as const,
            coordinates: [markerCoordinates], // Simple polygon: [[[lng, lat], ...]]
          },
        };

        // 🎯 CRITICAL FIX: Restore original structure to new GeoJSON
        if (originalLatLngs) {
          (geoJSON as any)._polydrawOriginalStructure = originalLatLngs;
        }
      }

      if (geoJSON) {
        // Step 4: Add the polygon using the same path as new polygons
        // Check for kinks and handle them
        if (this.turfHelper.hasKinks(geoJSON)) {
          const unkink = this.turfHelper.getKinks(geoJSON);
          unkink.forEach((unkinkedPolygon) => {
            onPolygonLayerAdd(
              this.turfHelper.getTurfPolygon(unkinkedPolygon),
              false,
              false,
              optimizationLevel,
            );
          });
        } else {
          onPolygonLayerAdd(geoJSON, false, false, optimizationLevel);
        }
      } else {
        // Simple polygon - build coordinates directly from markers
        const markerCoordinates = markers.map((marker) => {
          const latlng = marker.getLatLng();
          return [latlng.lng, latlng.lat]; // GeoJSON format: [lng, lat]
        });

        // Ensure the polygon is closed
        if (markerCoordinates.length > 0) {
          const first = markerCoordinates[0];
          const last = markerCoordinates[markerCoordinates.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            markerCoordinates.push([first[0], first[1]]);
          }
        }

        const feature = {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'Polygon' as const,
            coordinates: [markerCoordinates], // Simple polygon: [[[lng, lat], ...]]
          },
        };

        // Handle end of marker drag, check for kinks and update polygons
        onFeatureGroupRemove(featureGroup);

        // Check if the current polygon has kinks (self-intersections) after marker drag
        if (this.turfHelper.hasKinks(feature)) {
          const unkink = this.turfHelper.getKinks(feature);
          // Handle unkinked polygons - split kinked polygon into valid parts
          unkink.forEach((unkinkedPolygon) => {
            // 🎯 CRITICAL: Check if this polygon underwent hole traversal
            if ((unkinkedPolygon as any)._polydrawHoleTraversalOccurred) {
              console.log(
                'Polygon underwent hole traversal - adding as solid polygon (no hole structure)',
              );
              // Add as solid polygon without preserving any hole structure
              onPolygonLayerAdd(unkinkedPolygon, false, false, optimizationLevel);
            } else {
              // Normal polygon - preserve structure
              onPolygonLayerAdd(
                this.turfHelper.getTurfPolygon(unkinkedPolygon),
                false,
                false,
                optimizationLevel,
              );
            }
          });
        } else {
          // No interaction - just add the polygon normally
          onPolygonLayerAdd(feature, false, false, optimizationLevel);
        }
      }
    } catch (error) {
      console.error('handleMarkerDragEnd: Error processing polygon after drag:', error);

      // Fallback: try to recreate the polygon with current marker positions
      try {
        const fallbackCoords = markers.map((marker) => {
          const latlng = marker.getLatLng();
          return [latlng.lng, latlng.lat];
        });

        if (fallbackCoords.length >= 3) {
          // Ensure closed polygon
          const first = fallbackCoords[0];
          const last = fallbackCoords[fallbackCoords.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            fallbackCoords.push([first[0], first[1]]);
          }

          const fallbackFeature = {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [fallbackCoords],
            },
          };

          onPolygonLayerAdd(fallbackFeature, false, false, optimizationLevel);
        }
      } catch (fallbackError) {
        console.error('handleMarkerDragEnd: Fallback also failed:', fallbackError);
      }
    }

    // Updated feature groups after drag
    onPolygonInfoCreate();
  }

  /**
   * Helper method to determine if a marker should be skipped based on optimization
   */
  private shouldSkipMarker(
    index: number,
    totalMarkers: number,
    optimizationLevel: number,
  ): boolean {
    if (optimizationLevel === 0) return false;

    // Skip every nth marker based on optimization level
    const skipRatio = Math.min(optimizationLevel / 10, 0.8);
    const skipInterval = Math.max(1, Math.floor(1 / skipRatio));

    return index % skipInterval !== 0;
  }

  /**
   * Create a marker with the specified position type
   */
  private createMarker(latlng: ILatLng, position: MarkerPosition): L.Marker {
    const iconClasses =
      position === MarkerPosition.Hole
        ? this.config.markers.holeIcon.styleClasses
        : this.config.markers.markerIcon.styleClasses;

    const processedClasses = Array.isArray(iconClasses) ? iconClasses : [iconClasses];

    return new L.Marker(latlng, {
      icon: IconFactory.createDivIcon(processedClasses),
      draggable: true,
      title: this.getLatLngInfoString(latlng),
      zIndexOffset:
        position === MarkerPosition.Hole
          ? (this.config.markers.holeIcon.zIndexOffset ?? this.config.markers.zIndexOffset)
          : (this.config.markers.markerIcon.zIndexOffset ?? this.config.markers.zIndexOffset),
    });
  }

  /**
   * Setup drag events for a marker
   */
  private setupMarkerDragEvents(
    marker: L.Marker,
    featureGroup: L.FeatureGroup,
    onMarkerDrag: (featureGroup: L.FeatureGroup) => void,
    onMarkerDragEnd: (featureGroup: L.FeatureGroup) => void,
  ) {
    marker.on('drag', () => onMarkerDrag(featureGroup));
    marker.on('dragend', () => onMarkerDragEnd(featureGroup));
  }

  /**
   * Generate menu popup for marker interactions
   */
  generateMenuMarkerPopup(
    latLngs: ILatLng[],
    onSimplify?: (latlngs: ILatLng[]) => void,
    onBbox?: (latlngs: ILatLng[]) => void,
    onDoubleElbows?: (latlngs: ILatLng[]) => void,
    onBezier?: (latlngs: ILatLng[]) => void,
  ): HTMLDivElement {
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

    simplify.onclick = () => {
      if (onSimplify) onSimplify(latLngs);
    };
    bbox.onclick = () => {
      if (onBbox) onBbox(latLngs);
    };
    doubleElbows.onclick = () => {
      if (onDoubleElbows) onDoubleElbows(latLngs);
    };
    bezier.onclick = () => {
      if (onBezier) onBezier(latLngs);
    };

    return outerWrapper;
  }

  /**
   * Generate info popup showing area and perimeter
   */
  generateInfoMarkerPopup(area: number, perimeter: number): HTMLDivElement {
    const _perimeter = new Perimeter(perimeter, this.config as any);
    const _area = new Area(area, this.config as any);

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

  /**
   * Calculate which markers should be visible based on their importance
   */
  calculateMarkerVisibility(latlngs: ILatLng[], optimizationLevel: number): boolean[] {
    // For optimization level 0 or very few points, show all markers
    if (optimizationLevel === 0 || latlngs.length <= 3) {
      return new Array(latlngs.length).fill(true);
    }

    // For optimization levels 1-10, hide markers based on importance
    if (optimizationLevel > 0 && optimizationLevel <= 10) {
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

    // For any other case, show all markers
    return new Array(latlngs.length).fill(true);
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
      const prevIdx = (index - i + len) % len;
      const nextIdx = (index + i) % len;

      const prev = latlngs[prevIdx];
      const next = latlngs[nextIdx];

      minLat = Math.min(minLat, prev.lat, next.lat);
      maxLat = Math.max(maxLat, prev.lat, next.lat);
      minLng = Math.min(minLng, prev.lng, next.lng);
      maxLng = Math.max(maxLng, prev.lng, next.lng);
    }

    // Check if current point is at the extreme
    if (current.lat === minLat || current.lat === maxLat) importance += 1;
    if (current.lng === minLng || current.lng === maxLng) importance += 1;

    return importance;
  }

  /**
   * Calculate centroid of polygon
   */
  private calculateCentroid(latlngs: ILatLng[]): ILatLng {
    let lat = 0,
      lng = 0;
    latlngs.forEach((point) => {
      lat += point.lat;
      lng += point.lng;
    });
    return {
      lat: lat / latlngs.length,
      lng: lng / latlngs.length,
    };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(p1: ILatLng, p2: ILatLng): number {
    const dlat = p1.lat - p2.lat;
    const dlng = p1.lng - p2.lng;
    return Math.sqrt(dlat * dlat + dlng * dlng);
  }

  /**
   * Check if a point can be hidden without creating too large gaps
   */
  private canHidePoint(latlngs: ILatLng[], index: number, currentVisibility: boolean[]): boolean {
    return true;
    // // Don't hide if it would create a gap larger than 3 consecutive hidden points
    // const len = latlngs.length;
    // let consecutiveHidden = 0;

    // // Check backwards
    // for (let i = 1; i <= 3; i++) {
    //   const checkIdx = (index - i + len) % len;
    //   if (!currentVisibility[checkIdx]) {
    //     consecutiveHidden++;
    //   } else {
    //     break;
    //   }
    // }

    // // Check forwards
    // for (let i = 1; i <= 3; i++) {
    //   const checkIdx = (index + i) % len;
    //   if (!currentVisibility[checkIdx]) {
    //     consecutiveHidden++;
    //   } else {
    //     break;
    //   }
    // }

    // return consecutiveHidden < 2; // Allow hiding if it won't create 3+ consecutive hidden
  }

  /**
   * Hide marker visually while keeping it functional
   */
  private hideMarkerVisually(marker: L.Marker): void {
    const element = marker.getElement();
    if (element) {
      element.classList.add('polydraw-hidden-marker');
    }
  }

  /**
   * Show marker visually
   */
  private showMarkerVisually(marker: L.Marker): void {
    const element = marker.getElement();
    if (element) {
      element.classList.remove('polydraw-hidden-marker');
    }
  }

  /**
   * Add hover events for hidden markers
   */
  private addHiddenMarkerHoverEvents(marker: L.Marker): void {
    marker.on('mouseover', () => {
      this.showMarkerVisually(marker);
    });

    marker.on('mouseout', () => {
      this.hideMarkerVisually(marker);
    });

    marker.on('dragstart', () => {
      this.showMarkerVisually(marker);
    });

    marker.on('dragend', () => {
      this.hideMarkerVisually(marker);
    });
  }

  /**
   * Check if this is a simple polygon structure (flat coordinates from split operations)
   */
  private isSimplePolygonStructure(posarrays: any): boolean {
    // Check if it's a flat array of LatLng objects
    if (Array.isArray(posarrays) && posarrays.length > 0) {
      const first = posarrays[0];

      // If first element has lat/lng properties, it's a flat structure
      if (first && typeof first === 'object' && 'lat' in first && 'lng' in first) {
        return true;
      }

      // If it's a single-level nested structure [[LatLng, LatLng, ...]]
      if (Array.isArray(first) && first.length > 0 && first[0] && 'lat' in first[0]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate a simple coordinate array
   */
  private isValidCoordinateArray(coords: any[]): boolean {
    if (!Array.isArray(coords) || coords.length === 0) {
      return false;
    }

    for (const coord of coords) {
      if (
        !coord ||
        typeof coord !== 'object' ||
        typeof coord.lat !== 'number' ||
        typeof coord.lng !== 'number' ||
        isNaN(coord.lat) ||
        isNaN(coord.lng)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate LatLngs structure to prevent Leaflet errors
   */
  private isValidLatLngsStructure(latlngs: any): boolean {
    if (!Array.isArray(latlngs) || latlngs.length === 0) {
      console.warn('isValidLatLngsStructure: Invalid top-level structure:', latlngs);
      return false;
    }

    if (latlngs.length > 0 && latlngs[0] && typeof latlngs[0] === 'object' && 'lat' in latlngs[0]) {
      // This is a flat structure: [LatLng, LatLng, ...]
      for (const coord of latlngs) {
        if (
          !coord ||
          typeof coord !== 'object' ||
          typeof coord.lat !== 'number' ||
          typeof coord.lng !== 'number' ||
          isNaN(coord.lat) ||
          isNaN(coord.lng)
        ) {
          console.warn('isValidLatLngsStructure: Invalid coordinate in flat structure:', coord);
          return false;
        }
      }
      return true;
    }

    if (
      latlngs.length === 1 &&
      Array.isArray(latlngs[0]) &&
      latlngs[0].length > 0 &&
      latlngs[0][0] &&
      typeof latlngs[0][0] === 'object' &&
      'lat' in latlngs[0][0]
    ) {
      // This is a single-level nested structure: [[LatLng, LatLng, ...]]
      for (const coord of latlngs[0]) {
        if (
          !coord ||
          typeof coord !== 'object' ||
          typeof coord.lat !== 'number' ||
          typeof coord.lng !== 'number' ||
          isNaN(coord.lat) ||
          isNaN(coord.lng)
        ) {
          console.warn('isValidLatLngsStructure: Invalid coordinate in nested structure:', coord);
          return false;
        }
      }
      return true;
    }

    // Check if the structure contains valid coordinate arrays (nested structure)
    for (const ring of latlngs) {
      if (!Array.isArray(ring) || ring.length === 0) {
        console.warn('isValidLatLngsStructure: Invalid ring structure:', ring);
        return false;
      }

      for (const subRing of ring) {
        if (!Array.isArray(subRing) || subRing.length === 0) {
          console.warn('isValidLatLngsStructure: Invalid subRing structure:', subRing);
          return false;
        }

        // Check if coordinates are valid LatLng objects
        for (const coord of subRing) {
          if (
            !coord ||
            typeof coord !== 'object' ||
            typeof coord.lat !== 'number' ||
            typeof coord.lng !== 'number' ||
            isNaN(coord.lat) ||
            isNaN(coord.lng)
          ) {
            console.warn('isValidLatLngsStructure: Invalid coordinate:', coord);
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Rebuild coordinates from markers using the original structure to prevent menu marker connection issues
   */
  private rebuildCoordinatesFromMarkersWithOriginalStructure(
    originalStructure: any,
    markers: L.Marker[],
  ): any[] | null {
    try {
      const newPos = [];
      let testarray = [];
      let hole = [];
      const layerLength = markers;
      let markerOffset = 0;

      if (
        originalStructure.length === 1 &&
        Array.isArray(originalStructure[0]) &&
        originalStructure[0].length > 1
      ) {
        hole = [];

        for (let ringIndex = 0; ringIndex < originalStructure[0].length; ringIndex++) {
          testarray = [];
          const currentRing = originalStructure[0][ringIndex];

          // Map markers for this ring using the original structure
          for (let j = 0; j < currentRing.length; j++) {
            if (markerOffset + j < layerLength.length) {
              testarray.push(layerLength[markerOffset + j].getLatLng());
            }
          }

          if (testarray.length > 0) {
            hole.push(testarray);
          }

          // Move marker offset for next ring
          markerOffset += currentRing.length;
        }

        newPos.push(hole);
      } else {
        // Fallback to simple structure

        hole = [];
        testarray = [];

        // Simple flat polygon - just map all markers to one ring
        for (let j = 0; j < layerLength.length; j++) {
          testarray.push(layerLength[j].getLatLng());
        }

        if (testarray.length > 0) {
          hole.push(testarray);
          newPos.push(hole);
        }
      }

      return newPos.length > 0 ? newPos : null;
    } catch (error) {
      console.warn('rebuildCoordinatesFromMarkersWithOriginalStructure - Error:', error);
      return null;
    }
  }

  /**
   * Fix coordinate structure by rebuilding it properly from markers
   * Based on the working implementation from polydraw2 repo
   */
  private rebuildCoordinatesFromMarkers(polygon: any, markers: L.Marker[]): any[] | null {
    try {
      const posarrays = polygon.getLatLngs();

      const newPos = [];
      let testarray = [];
      let hole = [];
      const layerLength = markers; // In the old code, this was FeatureGroup.getLayers(), but we already have markers
      let length = 0;

      // Check for holes in the correct structure
      // The structure is [Array(2)] where Array(2) contains [ring1, ring2]
      if (posarrays.length === 1 && Array.isArray(posarrays[0]) && posarrays[0].length > 1) {
        // This is the hole structure: [[ring1, ring2, ...]]
        hole = [];
        let markerOffset = 0;

        for (let ringIndex = 0; ringIndex < posarrays[0].length; ringIndex++) {
          testarray = [];
          const currentRing = posarrays[0][ringIndex];
          // Map markers for this ring
          for (let j = 0; j < currentRing.length; j++) {
            if (markerOffset + j < layerLength.length) {
              testarray.push(layerLength[markerOffset + j].getLatLng());
            }
          }

          if (testarray.length > 0) {
            hole.push(testarray);
          }

          // Move marker offset for next ring
          markerOffset += currentRing.length;
        }

        newPos.push(hole);
      } else if (posarrays.length > 1) {
        // Multiple top-level rings (different structure)

        for (let index = 0; index < posarrays.length; index++) {
          testarray = [];
          hole = [];
          if (index === 0) {
            // First ring (outer ring)
            if (posarrays[0].length > 1) {
              for (let i = 0; i < posarrays[0].length; i++) {
                for (let j = 0; j < posarrays[0][i].length; j++) {
                  if (j < layerLength.length) {
                    testarray.push(layerLength[j].getLatLng());
                  }
                }
                hole.push(testarray);
              }
            } else {
              for (let j = 0; j < posarrays[0].length; j++) {
                if (j < layerLength.length) {
                  testarray.push(layerLength[j].getLatLng());
                }
              }
              hole.push(testarray);
            }

            newPos.push(hole);
          } else {
            // Subsequent rings (holes)
            length += posarrays[index - 1].length;

            for (let j = length; j < posarrays[index].length + length; j++) {
              if (j < layerLength.length) {
                testarray.push(layerLength[j].getLatLng());
              }
            }
            hole.push(testarray);
            newPos.push(hole);
          }
        }
      } else {
        // Simple flat structure

        hole = [];
        testarray = [];

        // Simple flat polygon - just map all markers to one ring
        for (let j = 0; j < layerLength.length; j++) {
          testarray.push(layerLength[j].getLatLng());
        }

        if (testarray.length > 0) {
          hole.push(testarray);
          newPos.push(hole);
        }
      }

      return newPos.length > 0 ? newPos : null;
    } catch (error) {
      console.warn('rebuildCoordinatesFromMarkers - Error:', error);
      return null;
    }
  }

  /**
   * Check for interactions between dragged polygon and existing polygons (for marker drag operations)
   */
  private checkMarkerDragInteractions(
    draggedPolygon: any,
    arrayOfFeatureGroups: any[],
    config: any,
  ) {
    const result = {
      shouldMerge: false,
      shouldCreateHole: false,
      intersectingFeatureGroups: [] as any[],
      containingFeatureGroup: null as any,
    };

    if (!config.dragPolygons?.autoMergeOnIntersect && !config.dragPolygons?.autoHoleOnContained) {
      return result;
    }

    // Check interactions with all other polygons
    for (const featureGroup of arrayOfFeatureGroups) {
      try {
        const featureCollection = featureGroup.toGeoJSON() as any;

        // Validate feature collection
        if (
          !featureCollection ||
          !featureCollection.features ||
          featureCollection.features.length === 0
        ) {
          continue;
        }

        const firstFeature = featureCollection.features[0];
        if (!firstFeature || !firstFeature.geometry) {
          continue;
        }

        const existingPolygon = this.turfHelper.getTurfPolygon(firstFeature);

        // Check if dragged polygon is completely contained within existing polygon
        if (config.dragPolygons.autoHoleOnContained) {
          try {
            const difference = this.turfHelper.polygonDifference(existingPolygon, draggedPolygon);
            if (
              difference &&
              difference.geometry.type === 'Polygon' &&
              difference.geometry.coordinates.length > 1
            ) {
              result.shouldCreateHole = true;
              result.containingFeatureGroup = featureGroup;
              break; // Hole takes precedence over merge
            }
          } catch (error) {
            // Continue with other checks
          }
        }

        // Check if polygons intersect (but dragged is not completely contained)
        if (config.dragPolygons.autoMergeOnIntersect) {
          let hasIntersection = false;

          try {
            // Method 1: Use the existing polygonIntersect method
            hasIntersection = this.turfHelper.polygonIntersect(draggedPolygon, existingPolygon);
          } catch (error) {
            // Method 1 failed, try alternative
          }

          if (!hasIntersection) {
            try {
              // Method 2: Use direct intersection check
              const intersection = this.turfHelper.getIntersection(draggedPolygon, existingPolygon);
              hasIntersection =
                intersection &&
                intersection.geometry &&
                (intersection.geometry.type === 'Polygon' ||
                  intersection.geometry.type === 'MultiPolygon');
            } catch (error) {
              // Method 2 failed, continue
            }
          }

          if (hasIntersection) {
            result.shouldMerge = true;
            result.intersectingFeatureGroups.push(featureGroup);
          }
        }
      } catch (error) {
        console.warn('Error checking marker drag interactions:', error.message);
        continue;
      }
    }

    return result;
  }

  /**
   * Perform merge operation when dragged polygon intersects with others (for marker drag operations)
   */
  private performMarkerDragMerge(
    draggedPolygon: any,
    intersectingFeatureGroups: any[],
    onPolygonLayerAdd: (
      geoJSON: any,
      simplify: boolean,
      dynamicTolerance: boolean,
      optimizationLevel: number,
    ) => void,
    optimizationLevel: number,
  ) {
    let mergedPolygon = draggedPolygon;

    // Merge with all intersecting polygons
    for (const featureGroup of intersectingFeatureGroups) {
      const featureCollection = featureGroup.toGeoJSON() as any;
      const existingPolygon = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

      // Perform union operation
      const unionResult = this.turfHelper.union(mergedPolygon, existingPolygon);
      if (unionResult) {
        mergedPolygon = unionResult;

        // Remove the merged feature group
        try {
          this.map.removeLayer(featureGroup);
        } catch (error) {
          // Silently handle layer removal errors
        }
      }
    }

    // Add the final merged polygon
    onPolygonLayerAdd(mergedPolygon, false, false, optimizationLevel);
  }

  /**
   * Perform hole creation when dragged polygon is completely within another (for marker drag operations)
   */
  private performMarkerDragHole(
    draggedPolygon: any,
    containingFeatureGroup: any,
    onPolygonLayerAdd: (
      geoJSON: any,
      simplify: boolean,
      dynamicTolerance: boolean,
      optimizationLevel: number,
    ) => void,
    optimizationLevel: number,
  ) {
    const featureCollection = containingFeatureGroup.toGeoJSON() as any;
    const containingPolygon = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

    // Perform difference operation (subtract dragged polygon from containing polygon)
    const differenceResult = this.turfHelper.polygonDifference(containingPolygon, draggedPolygon);

    if (differenceResult) {
      // Remove the original containing polygon
      try {
        this.map.removeLayer(containingFeatureGroup);
      } catch (error) {
        // Silently handle layer removal errors
      }

      // Add the polygon with the new hole
      onPolygonLayerAdd(differenceResult, false, false, optimizationLevel);
    } else {
      // Fallback: just add the dragged polygon normally
      onPolygonLayerAdd(draggedPolygon, false, false, optimizationLevel);
    }
  }

  /**
   * Check if the polygon structure has holes
   */
  private hasHoleStructure(latLngs: any): boolean {
    try {
      // Check for nested structure: [Array(2)] where Array(2) contains [ring1, ring2]
      if (
        Array.isArray(latLngs) &&
        latLngs.length === 1 &&
        Array.isArray(latLngs[0]) &&
        latLngs[0].length > 1
      ) {
        return true;
      }

      // Check for multiple rings structure: [ring1, ring2, ...]
      if (Array.isArray(latLngs) && latLngs.length >= 2) {
        // Check if we have multiple rings where each ring is an array of LatLng objects
        const firstRing = latLngs[0];
        const secondRing = latLngs[1];

        if (
          Array.isArray(firstRing) &&
          Array.isArray(secondRing) &&
          firstRing.length > 0 &&
          secondRing.length > 0 &&
          typeof firstRing[0] === 'object' &&
          'lat' in firstRing[0] &&
          typeof secondRing[0] === 'object' &&
          'lat' in secondRing[0]
        ) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.warn('MarkerManager.hasHoleStructure - Error:', error);
      return false;
    }
  }

  /**
   * Build polygon with holes from markers
   */
  private buildPolygonWithHoles(originalLatLngs: any, markers: L.Marker[]): any {
    try {
      // Map markers to coordinates
      const markerCoords = markers.map((marker) => {
        const latlng = marker.getLatLng();
        return [latlng.lng, latlng.lat]; // GeoJSON format: [lng, lat]
      });

      let markerIndex = 0;
      const rings: number[][][] = [];

      // Check if it's the nested structure: [Array(N)] where Array(N) contains multiple rings
      if (
        Array.isArray(originalLatLngs) &&
        originalLatLngs.length === 1 &&
        Array.isArray(originalLatLngs[0]) &&
        originalLatLngs[0].length > 1
      ) {
        // Process each ring from the nested structure
        const ringArray = originalLatLngs[0]; // This is [ring1, ring2, ...]

        for (let ringIdx = 0; ringIdx < ringArray.length; ringIdx++) {
          const originalRing = ringArray[ringIdx];

          if (Array.isArray(originalRing) && originalRing.length > 0) {
            const ringCoords: number[][] = [];

            // Take coordinates for this ring from markers
            for (let i = 0; i < originalRing.length && markerIndex < markerCoords.length; i++) {
              ringCoords.push(markerCoords[markerIndex]);
              markerIndex++;
            }

            // Ensure ring is closed
            if (ringCoords.length > 0) {
              const first = ringCoords[0];
              const last = ringCoords[ringCoords.length - 1];
              if (first[0] !== last[0] || first[1] !== last[1]) {
                ringCoords.push([first[0], first[1]]);
              }
              rings.push(ringCoords);
            }
          }
        }
      } else {
        for (let ringIdx = 0; ringIdx < originalLatLngs.length; ringIdx++) {
          const originalRing = originalLatLngs[ringIdx];

          if (Array.isArray(originalRing) && originalRing.length > 0) {
            const ringCoords: number[][] = [];

            // Take coordinates for this ring from markers
            for (let i = 0; i < originalRing.length && markerIndex < markerCoords.length; i++) {
              ringCoords.push(markerCoords[markerIndex]);
              markerIndex++;
            }

            // Ensure ring is closed
            if (ringCoords.length > 0) {
              const first = ringCoords[0];
              const last = ringCoords[ringCoords.length - 1];
              if (first[0] !== last[0] || first[1] !== last[1]) {
                ringCoords.push([first[0], first[1]]);
              }
              rings.push(ringCoords);
            }
          }
        }
      }

      if (rings.length === 0) {
        console.warn('MarkerManager.buildPolygonWithHoles - No rings created');
        return null;
      }

      // Ensure proper winding direction for GeoJSON compliance
      if (rings.length > 1) {
        for (let i = 0; i < rings.length; i++) {
          const ring = rings[i];
          const isClockwise = this.isClockwise(ring);

          if (i === 0) {
            // Outer ring should be counterclockwise
            if (isClockwise) {
              rings[i] = ring.reverse();
            }
          } else {
            // Hole rings should be clockwise
            if (!isClockwise) {
              rings[i] = ring.reverse();
            }
          }
        }
      }

      // Create GeoJSON feature
      const geoJSON = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Polygon' as const,
          coordinates: rings, // [outerRing, holeRing1, holeRing2, ...]
        },
      };

      (geoJSON as any)._polydrawOriginalStructure = originalLatLngs;

      return geoJSON;
    } catch (error) {
      console.error('MarkerManager.buildPolygonWithHoles - Error:', error);
      return null;
    }
  }

  /**
   * Check if a ring is wound clockwise using the shoelace formula
   */
  private isClockwise(ring: number[][]): boolean {
    if (ring.length < 3) return false;

    let sum = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const current = ring[i];
      const next = ring[i + 1];
      sum += (next[0] - current[0]) * (next[1] + current[1]);
    }

    // If sum > 0, the ring is clockwise
    // If sum < 0, the ring is counterclockwise
    // GeoJSON standard: outer ring counterclockwise, holes clockwise
    return sum > 0;
  }

  /**
   * Explode, update, and reconstruct approach for polygons with holes
   * 1. Explode polygon into separate parts (outer + inner)
   * 2. Update the dragged part with new coordinates
   * 3. Reconstruct a new polygon with hole using updated part + unchanged part
   */
  private explodeUpdateAndReconstruct(
    originalLatLngs: any,
    markers: L.Marker[],
    onPolygonLayerAdd: (
      geoJSON: any,
      simplify: boolean,
      dynamicTolerance: boolean,
      optimizationLevel: number,
    ) => void,
    optimizationLevel: number,
  ) {
    try {
      // Step 1: Explode the polygon into separate parts
      const explodedParts = this.explodePolygonIntoParts(originalLatLngs);

      // Step 2: Update the dragged part with new marker coordinates
      const updatedParts = this.updatePartsWithMarkers(explodedParts, markers);

      // Step 3: Reconstruct a new polygon with hole
      const reconstructedPolygon = this.reconstructPolygonWithHole(updatedParts);

      // Step 4: Add the final polygon
      if (reconstructedPolygon) {
        onPolygonLayerAdd(reconstructedPolygon, false, false, optimizationLevel);
      } else {
        console.error('explodeUpdateAndReconstruct - Failed to reconstruct polygon');
      }
    } catch (error) {
      console.error('explodeUpdateAndReconstruct - Error:', error);
    }
  }

  /**
   * Step 1: Explode polygon into separate parts
   */
  private explodePolygonIntoParts(originalLatLngs: any): any[] {
    const parts = [];

    if (Array.isArray(originalLatLngs) && originalLatLngs.length > 0) {
      // Check if it's a nested structure: [Array(2)] where Array(2) contains [ring1, ring2]
      if (Array.isArray(originalLatLngs[0]) && originalLatLngs[0].length > 0) {
        const firstElement = originalLatLngs[0][0];

        // If first element is an array of LatLng objects, it's nested structure
        if (Array.isArray(firstElement) && firstElement.length > 0 && 'lat' in firstElement[0]) {
          // Extract each ring as a separate part
          for (let ringIdx = 0; ringIdx < originalLatLngs[0].length; ringIdx++) {
            const ring = originalLatLngs[0][ringIdx];
            if (Array.isArray(ring)) {
              parts.push({
                ringIndex: ringIdx,
                isHole: ringIdx > 0,
                coordinates: ring.map((latlng: any) => [latlng.lng, latlng.lat]), // Convert to GeoJSON format
              });
            }
          }
        }
        // If first element is a LatLng object, check if it's a multi-ring flattened structure
        else if ('lat' in firstElement) {
          // Check if this is a multi-ring flattened structure [ring1, ring2, ...]
          if (originalLatLngs.length > 1) {
            // Process each ring separately
            for (let ringIdx = 0; ringIdx < originalLatLngs.length; ringIdx++) {
              const ring = originalLatLngs[ringIdx];
              if (Array.isArray(ring) && ring.length > 0) {
                parts.push({
                  ringIndex: ringIdx,
                  isHole: ringIdx > 0,
                  coordinates: ring.map((latlng: any) => [latlng.lng, latlng.lat]),
                });
              }
            }
          } else {
            // Single ring flattened structure
            parts.push({
              ringIndex: 0,
              isHole: false,
              coordinates: originalLatLngs[0].map((latlng: any) => [latlng.lng, latlng.lat]),
            });
          }
        }
      }
    }

    return parts;
  }

  /**
   * Step 2: Update parts with new marker coordinates
   */
  private updatePartsWithMarkers(parts: any[], markers: L.Marker[]): any[] {
    const markerCoords = markers.map((marker) => {
      const latlng = marker.getLatLng();
      return [latlng.lng, latlng.lat]; // GeoJSON format: [lng, lat]
    });

    let markerOffset = 0;
    const updatedParts = [];

    for (const part of parts) {
      const originalLength = part.coordinates.length;
      const updatedCoords: number[][] = [];

      // Take coordinates for this part from markers
      for (let i = 0; i < originalLength && markerOffset < markerCoords.length; i++) {
        updatedCoords.push(markerCoords[markerOffset]);
        markerOffset++;
      }

      // Ensure ring is closed
      if (updatedCoords.length > 0) {
        const first = updatedCoords[0];
        const last = updatedCoords[updatedCoords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          updatedCoords.push([first[0], first[1]]);
        }
      }

      updatedParts.push({
        ...part,
        coordinates: updatedCoords,
      });
    }

    return updatedParts;
  }

  /**
   * Step 3: Reconstruct polygon with hole using updated parts
   */
  private reconstructPolygonWithHole(parts: any[]): any {
    if (parts.length === 0) {
      return null;
    }

    const rings: number[][][] = [];

    // Sort parts by ring index to maintain order (outer ring first, then holes)
    const sortedParts = parts.sort((a, b) => a.ringIndex - b.ringIndex);

    for (const part of sortedParts) {
      let coords = part.coordinates;

      // Ensure proper winding direction for GeoJSON compliance
      const isClockwise = this.isClockwise(coords);

      if (part.isHole) {
        // Hole rings should be clockwise in GeoJSON
        if (!isClockwise) {
          coords = coords.reverse();
        }
      } else {
        // Outer ring should be counterclockwise in GeoJSON
        if (isClockwise) {
          coords = coords.reverse();
        }
      }

      rings.push(coords);
    }

    // Create GeoJSON feature with hole structure
    const geoJSON = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: rings, // [outerRing, holeRing1, holeRing2, ...]
      },
    };

    return geoJSON;
  }

  /**
   * Check if markers indicate that hole traversal occurred
   */
  private checkForHoleTraversalInMarkers(markers: L.Marker[], originalLatLngs: any): boolean {
    try {
      // Simple heuristic: if we have markers but the original structure had holes,
      // and the markers form a self-intersecting pattern, it might be hole traversal

      if (!this.hasHoleStructure(originalLatLngs)) {
        return false; // No holes to traverse
      }

      // Check if marker positions create a self-intersecting polygon
      const markerCoords = markers.map((marker) => {
        const latlng = marker.getLatLng();
        return [latlng.lng, latlng.lat];
      });

      // Ensure closed polygon for testing
      if (markerCoords.length > 0) {
        const first = markerCoords[0];
        const last = markerCoords[markerCoords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          markerCoords.push([first[0], first[1]]);
        }
      }

      const testPolygon = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Polygon' as const,
          coordinates: [markerCoords],
        },
      };

      // If the marker polygon has kinks, it might indicate hole traversal
      const hasKinks = this.turfHelper.hasKinks(testPolygon);

      if (hasKinks) {
        console.log('Markers form self-intersecting polygon - potential hole traversal');
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Error checking for hole traversal in markers:', error.message);
      return false;
    }
  }

  /**
   * Build a solid polygon from markers (no holes)
   */
  private buildSolidPolygonFromMarkers(markers: L.Marker[]): any {
    try {
      const markerCoords = markers.map((marker) => {
        const latlng = marker.getLatLng();
        return [latlng.lng, latlng.lat]; // GeoJSON format: [lng, lat]
      });

      // Ensure the polygon is closed
      if (markerCoords.length > 0) {
        const first = markerCoords[0];
        const last = markerCoords[markerCoords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          markerCoords.push([first[0], first[1]]);
        }
      }

      const geoJSON = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Polygon' as const,
          coordinates: [markerCoords], // Single ring - no holes
        },
      };

      console.log('Built solid polygon from markers - no holes preserved');
      return geoJSON;
    } catch (error) {
      console.error('Error building solid polygon from markers:', error);
      return null;
    }
  }
}
