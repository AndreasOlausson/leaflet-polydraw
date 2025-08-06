import * as L from 'leaflet';
import { TurfHelper } from '../turf-helper';
import { PolygonInformationService } from '../polygon-information.service';
import { IconFactory } from '../icon-factory';
import { PolygonUtil } from '../polygon.util';
import { MarkerPosition } from '../enums';
import { Compass, PolyDrawUtil, Perimeter, Area } from '../utils';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type {
  PolydrawConfig,
  PolydrawPolygon,
  PolydrawEdgePolyline,
} from '../types/polydraw-interfaces';
import { ModeManager } from './mode-manager';
import { EventManager } from './event-manager';
import { isTouchDevice } from './../utils';

export interface InteractionResult {
  success: boolean;
  featureGroups?: L.FeatureGroup[];
  error?: string;
}

export interface PolygonInteractionManagerDependencies {
  turfHelper: TurfHelper;
  polygonInformation: PolygonInformationService;
  map: L.Map;
  config: PolydrawConfig;
  modeManager: ModeManager;
  eventManager: EventManager;
}

/**
 * PolygonInteractionManager handles all interactions with existing polygons.
 * This includes dragging polygons, dragging markers, edge interactions, and popup menus.
 */
export class PolygonInteractionManager {
  private markerFeatureGroupMap = new WeakMap<L.Marker, L.FeatureGroup>();
  private markerModifierHandlers = new WeakMap<L.Marker, (e: Event) => void>();
  private _activeMarker: L.Marker | null = null;
  private isDraggingMarker = false;
  private turfHelper: TurfHelper;
  private polygonInformation: PolygonInformationService;
  private map: L.Map;
  private config: PolydrawConfig;
  private modeManager: ModeManager;
  private eventManager: EventManager;

  // Polygon drag state
  private currentDragPolygon: PolydrawPolygon | null = null;
  private currentModifierDragMode: boolean = false;
  private isModifierKeyHeld: boolean = false;
  private _openMenuPopup: L.Popup | null = null;

  // Read-only access to feature groups
  private getFeatureGroups: () => L.FeatureGroup[];
  private addFeatureGroup: (fg: L.FeatureGroup) => void;
  private removeFeatureGroup: (fg: L.FeatureGroup) => void;

  constructor(
    dependencies: PolygonInteractionManagerDependencies,
    featureGroupAccess: {
      getFeatureGroups: () => L.FeatureGroup[];
      addFeatureGroup: (fg: L.FeatureGroup) => void;
      removeFeatureGroup: (fg: L.FeatureGroup) => void;
    },
  ) {
    // console.log('PolygonInteractionManager constructor');
    this.turfHelper = dependencies.turfHelper;
    this.polygonInformation = dependencies.polygonInformation;
    this.map = dependencies.map;
    this.config = dependencies.config;
    this.modeManager = dependencies.modeManager;
    this.eventManager = dependencies.eventManager;

    // Store feature group access methods
    this.getFeatureGroups = featureGroupAccess.getFeatureGroups;
    this.addFeatureGroup = featureGroupAccess.addFeatureGroup;
    this.removeFeatureGroup = featureGroupAccess.removeFeatureGroup;
  }

  /**
   * Add markers to a polygon feature group
   */
  addMarkers(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup): void {
    // console.log('PolygonInteractionManager addMarkers');
    // Get initial marker positions
    let menuMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerMenuIcon.position);
    let deleteMarkerIdx = this.getMarkerIndex(
      latlngs,
      this.config.markers.markerDeleteIcon.position,
    );
    let infoMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerInfoIcon.position);

    // Apply fallback separation logic to ensure markers don't overlap
    const separatedIndices = this.ensureMarkerSeparation(latlngs.length, {
      menu: { index: menuMarkerIdx, enabled: this.config.markers.menuMarker },
      delete: { index: deleteMarkerIdx, enabled: this.config.markers.deleteMarker },
      info: { index: infoMarkerIdx, enabled: this.config.markers.infoMarker },
    });

    // Update indices with separated values
    menuMarkerIdx = separatedIndices.menu;
    deleteMarkerIdx = separatedIndices.delete;
    infoMarkerIdx = separatedIndices.info;

    latlngs.forEach((latlng, i) => {
      let iconClasses = this.config.markers.markerIcon.styleClasses;
      if (i === menuMarkerIdx && this.config.markers.menuMarker) {
        iconClasses = this.config.markers.markerMenuIcon.styleClasses;
      }
      if (i === deleteMarkerIdx && this.config.markers.deleteMarker) {
        iconClasses = this.config.markers.markerDeleteIcon.styleClasses;
      }
      if (i === infoMarkerIdx && this.config.markers.infoMarker) {
        iconClasses = this.config.markers.markerInfoIcon.styleClasses;
      }

      const processedClasses = Array.isArray(iconClasses) ? iconClasses : [iconClasses];
      const isSpecialMarker =
        (i === menuMarkerIdx && this.config.markers.menuMarker) ||
        (i === deleteMarkerIdx && this.config.markers.deleteMarker) ||
        (i === infoMarkerIdx && this.config.markers.infoMarker);
      const marker = new L.Marker(latlng, {
        icon: this.createDivIcon(processedClasses),
        draggable: this.config.modes.dragElbow,
        title: this.config.markers.coordsTitle ? this.getLatLngInfoString(latlng) : '',
        zIndexOffset:
          this.config.markers.markerIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
      });

      featureGroup.addLayer(marker).addTo(this.map);

      // Attach reference to featureGroup for dragend/touchend logic
      this.markerFeatureGroupMap.set(marker, featureGroup);

      marker.on('add', () => {
        const el = marker.getElement();
        if (el) el.style.pointerEvents = 'auto';
      });

      marker.on('click', (e) => {
        if (this.isDraggingMarker) {
          e.originalEvent?.stopPropagation?.();
          L.DomEvent.stopPropagation(e);
        }
      });
      // Replace dragend binding to use _polydrawFeatureGroup and allow correct logic
      marker.on('dragstart', () => {
        this.isDraggingMarker = true;
        this._activeMarker = marker;
      });
      marker.on('dragend', (e: L.LeafletEvent) => {
        const fg = this.markerFeatureGroupMap.get(marker);
        if (this.modeManager.canPerformAction('markerDrag') && fg) {
          this.markerDragEnd(fg);
        }
        this._activeMarker = null;
        L.DomEvent.stopPropagation(e);
        setTimeout(() => {
          this.isDraggingMarker = false;
        }, 10);
      });
      // Patch: Add touchend event for menu/info markers to simulate click on iOS
      const el = marker.getElement();
      if (el) {
        el.addEventListener(
          'touchstart',
          (e) => {
            // console.log('marker touchstart');
            e.stopPropagation();
          },
          { passive: true },
        );
        el.addEventListener('touchend', (e) => {
          // console.log('marker touchend');
          e.preventDefault();
          e.stopPropagation();
          marker.fire('click');
          // Also fire drag end logic for touch devices
          if (this.isDraggingMarker && !isSpecialMarker) {
            const fg = this.markerFeatureGroupMap.get(marker);
            if (this.modeManager.canPerformAction('markerDrag') && fg) {
              this.markerDragEnd(fg);
            }
          }
          this._activeMarker = null;
        });
      }

      // Set high z-index for special markers to ensure they're always visible on top
      if (i === menuMarkerIdx || i === deleteMarkerIdx || i === infoMarkerIdx) {
        const element = marker.getElement();
        if (element) {
          element.style.zIndex = '10000';
        }
      }

      if (this.config.modes.dragElbow) {
        const createDragHandler = (fg: L.FeatureGroup) => () => {
          if (this.modeManager.canPerformAction('markerDrag')) {
            this.markerDrag(fg);
          }
        };
        marker.on('drag', createDragHandler(featureGroup));
        // dragend is already handled above with the _polydrawFeatureGroup logic
      }

      if (i === menuMarkerIdx && this.config.markers.menuMarker) {
        marker.options.zIndexOffset =
          this.config.markers.markerMenuIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
        marker.on('click', () => {
          const polygonGeoJSON = this.getPolygonGeoJSONFromFeatureGroup(featureGroup);
          const centerOfMass = PolygonUtil.getCenterOfMass(polygonGeoJSON);
          const menuPopup = this.generateMenuMarkerPopup(latlngs, featureGroup);

          menuPopup.setLatLng(centerOfMass).openOn(this.map);
        });
        // Patch: Adjust touchAction for map container on popup open/close
        marker.on('popupopen', (e) => {
          const popup = e.popup;
          const popupContent = popup.getElement();
          if (!popupContent) return;

          // Use a timeout to allow the popup to be fully rendered and positioned
          setTimeout(() => {
            const mapContainer = this.map.getContainer();
            const mapBounds = mapContainer.getBoundingClientRect();
            const popupBounds = popupContent.getBoundingClientRect();

            // Check if popup is out of bounds and adjust
            if (popupBounds.left < mapBounds.left) {
              popupContent.style.transform = `translateX(${mapBounds.left - popupBounds.left}px)`;
            } else if (popupBounds.right > mapBounds.right) {
              popupContent.style.transform = `translateX(${mapBounds.right - popupBounds.right}px)`;
            }
          }, 0);

          const container = this.map.getContainer();
          if (container) {
            container.style.touchAction = 'manipulation';
          }
        });
        marker.on('popupclose', () => {
          // console.log('popupclose, resetting touchAction');
          const container = this.map.getContainer();
          if (container) {
            container.style.touchAction = '';
          }
        });
      }
      if (i === infoMarkerIdx && this.config.markers.infoMarker) {
        // Get the complete polygon GeoJSON to properly handle holes
        const polygonGeoJSON = this.getPolygonGeoJSONFromFeatureGroup(featureGroup);
        const area = this.turfHelper.getPolygonArea(polygonGeoJSON);
        const perimeter = this.getTotalPolygonPerimeter(polygonGeoJSON);
        marker.options.zIndexOffset =
          this.config.markers.markerInfoIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
        marker.on('click', () => {
          const infoPopup = this.generateInfoMarkerPopup(area, perimeter);
          const centerOfMass = PolygonUtil.getCenterOfMass(polygonGeoJSON);
          infoPopup.setLatLng(centerOfMass).openOn(this.map);
        });
        // Patch: Adjust touchAction for map container on popup open/close
        marker.on('popupopen', (e) => {
          const popup = e.popup;
          const popupContent = popup.getElement();
          if (!popupContent) return;

          // Use a timeout to allow the popup to be fully rendered and positioned
          setTimeout(() => {
            const mapContainer = this.map.getContainer();
            const mapBounds = mapContainer.getBoundingClientRect();
            const popupBounds = popupContent.getBoundingClientRect();

            // Check if popup is out of bounds and adjust
            if (popupBounds.left < mapBounds.left) {
              popupContent.style.transform = `translateX(${mapBounds.left - popupBounds.left}px)`;
            } else if (popupBounds.right > mapBounds.right) {
              popupContent.style.transform = `translateX(${mapBounds.right - popupBounds.right}px)`;
            }
          }, 0);

          const container = this.map.getContainer();
          if (container) {
            container.style.touchAction = 'manipulation';
          }
        });
        marker.on('popupclose', () => {
          // console.log('popupclose, resetting touchAction');
          const container = this.map.getContainer();
          if (container) {
            container.style.touchAction = '';
          }
        });
      }

      // Forward mousedown events to the map when in drawing mode
      marker.on('mousedown', (e) => {
        if (!this.modeManager.isInOffMode()) {
          L.DomEvent.stopPropagation(e);
          this.map.fire('mousedown', e);
        }
        this._activeMarker = marker;
      });

      // Generic click handler for all markers
      marker.on('click', (e) => {
        // console.log('marker click');
        if (this.modeManager.isInOffMode()) {
          if (this.isModifierKeyPressed(e.originalEvent)) {
            const poly = (
              featureGroup.getLayers().find((layer) => layer instanceof L.Polygon) as L.Polygon
            )?.toGeoJSON();
            if (poly) {
              this.elbowClicked(e, poly);
            }
          } else {
            // Handle non-modifier clicks for special markers
            if (i === deleteMarkerIdx && this.config.markers.deleteMarker) {
              this.map.closePopup();
              this.removeFeatureGroup(featureGroup);
              this.polygonInformation.createPolygonInformationStorage(this.getFeatureGroups());
              this.eventManager.emit('polydraw:polygon:deleted', undefined);
            }
          }
        }
      });

      // Add hover listeners for edge deletion feedback
      marker.on('mouseover', () => this.onMarkerHoverForEdgeDeletion(marker, true));
      marker.on('mouseout', () => this.onMarkerHoverForEdgeDeletion(marker, false));
    });

    // Global fix for iOS: allow interaction with popups and markers
    const container = this.map.getContainer();
    if (container) {
      container.style.touchAction = 'manipulation';
    }
  }

  /**
   * Add hole markers to a polygon feature group
   */
  addHoleMarkers(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup): void {
    // console.log('PolygonInteractionManager addHoleMarkers');
    latlngs.forEach((latlng, i) => {
      // Use holeIcon styles instead of regular markerIcon styles
      const iconClasses = this.config.markers.holeIcon.styleClasses;
      const processedClasses = Array.isArray(iconClasses) ? iconClasses : [iconClasses];
      const marker = new L.Marker(latlng, {
        icon: this.createDivIcon(processedClasses),
        draggable: true,
        title: this.getLatLngInfoString(latlng),
        zIndexOffset: this.config.markers.holeIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
      });
      featureGroup.addLayer(marker).addTo(this.map);
      marker.on('add', () => {
        const el = marker.getElement();
        if (el) el.style.pointerEvents = 'auto';
      });

      marker.on('click', (e) => {
        e.originalEvent?.stopPropagation?.();
        L.DomEvent.stopPropagation(e);
      });

      marker.on('dragstart', () => {
        this.isDraggingMarker = true;
        this._activeMarker = marker;
      });

      marker.on('drag', () => {
        this.markerDrag(featureGroup);
      });

      marker.on('dragend', () => {
        this.markerDragEnd(featureGroup);
        this._activeMarker = null;
        setTimeout(() => {
          this.isDraggingMarker = false;
        }, 10);
      });
    });
  }

  /**
   * Add edge click listeners to a polygon
   */
  addEdgeClickListeners(polygon: L.Polygon, featureGroup: L.FeatureGroup): void {
    // console.log('PolygonInteractionManager addEdgeClickListeners');
    const rawLatLngs = polygon.getLatLngs();

    // Handle different polygon structures
    let processedRings: L.LatLngLiteral[][];

    if (Array.isArray(rawLatLngs) && rawLatLngs.length > 0) {
      if (Array.isArray(rawLatLngs[0])) {
        if (Array.isArray(rawLatLngs[0][0]) && rawLatLngs[0][0].length > 0) {
          const firstCoord = rawLatLngs[0][0][0];
          if (firstCoord && typeof firstCoord === 'object' && 'lat' in firstCoord) {
            processedRings = rawLatLngs[0] as L.LatLngLiteral[][];
          } else {
            processedRings = rawLatLngs[0] as L.LatLngLiteral[][];
          }
        } else if (
          rawLatLngs[0][0] &&
          typeof rawLatLngs[0][0] === 'object' &&
          'lat' in rawLatLngs[0][0]
        ) {
          processedRings = rawLatLngs as L.LatLngLiteral[][];
        } else {
          processedRings = rawLatLngs[0] as L.LatLngLiteral[][];
        }
      } else if (rawLatLngs[0] && typeof rawLatLngs[0] === 'object' && 'lat' in rawLatLngs[0]) {
        processedRings = [rawLatLngs as L.LatLngLiteral[]];
      } else {
        processedRings = [rawLatLngs as L.LatLngLiteral[]];
      }
    } else {
      return;
    }

    processedRings.forEach((ring, ringIndex) => {
      for (let i = 0; i < ring.length; i++) {
        const edgeStart = ring[i];
        const edgeEnd = ring[(i + 1) % ring.length];

        if (edgeStart.lat === edgeEnd.lat && edgeStart.lng === edgeEnd.lng) {
          continue;
        }

        const edgePolyline = L.polyline([edgeStart, edgeEnd], {
          color: 'transparent',
          weight: 10,
          opacity: 0,
          interactive: true,
        });

        (edgePolyline as PolydrawEdgePolyline)._polydrawEdgeInfo = {
          ringIndex,
          edgeIndex: i,
          startPoint: edgeStart,
          endPoint: edgeEnd,
          parentPolygon: polygon,
          parentFeatureGroup: featureGroup,
        };

        edgePolyline.on('click', (e: L.LeafletMouseEvent) => {
          this.onEdgeClick(e, edgePolyline);
        });

        edgePolyline.on('mouseover', () => {
          this.highlightEdgeOnHover(edgePolyline, true);
        });

        edgePolyline.on('mouseout', () => {
          this.highlightEdgeOnHover(edgePolyline, false);
        });

        featureGroup.addLayer(edgePolyline);
      }
    });
  }

  /**
   * Enable polygon dragging functionality
   */
  enablePolygonDragging(polygon: PolydrawPolygon, latlngs: Feature<Polygon | MultiPolygon>): void {
    // console.log('PolygonInteractionManager enablePolygonDragging');
    if (!this.config.modes.dragPolygons) return;

    polygon._polydrawOriginalLatLngs = latlngs;
    polygon._polydrawDragData = {
      isDragging: false,
      startPosition: null,
      startLatLngs: null,
    };

    polygon.on('mousedown', (e: L.LeafletMouseEvent) => {
      // console.log('polygon mousedown');
      // If not in off mode, it's a drawing click. Forward to map and stop.
      if (!this.modeManager.isInOffMode()) {
        // Stop this event from becoming a drag, but fire it on the map for drawing.
        L.DomEvent.stopPropagation(e);
        this.map.fire('mousedown', e);
        return;
      }

      if (!this.modeManager.canPerformAction('polygonDrag')) {
        return;
      }
      L.DomEvent.stopPropagation(e.originalEvent);
      L.DomEvent.preventDefault(e.originalEvent);

      const isModifierPressed = this.detectModifierKey(e.originalEvent);
      this.currentModifierDragMode = isModifierPressed;
      this.isModifierKeyHeld = isModifierPressed;

      polygon._polydrawDragData.isDragging = true;
      polygon._polydrawDragData.startPosition = e.latlng;
      polygon._polydrawDragData.startLatLngs = polygon.getLatLngs();

      if (this.map.dragging) {
        this.map.dragging.disable();
      }

      this.setSubtractVisualMode(polygon, isModifierPressed);

      try {
        const container = this.map.getContainer();
        container.style.cursor = this.config.dragPolygons.dragCursor || 'move';
      } catch (error) {
        // Handle DOM errors
      }

      this.map.on('mousemove', this.onPolygonMouseMove, this);
      this.map.on('mouseup', this.onPolygonMouseUp, this);

      this.currentDragPolygon = polygon;
    });

    polygon.on('mouseover', () => {
      if (!polygon._polydrawDragData.isDragging) {
        try {
          const container = this.map.getContainer();
          container.style.cursor = this.config.dragPolygons.hoverCursor || 'grab';
        } catch (error) {
          // Handle DOM errors
        }
      }
    });

    polygon.on('mouseout', () => {
      if (!polygon._polydrawDragData.isDragging) {
        try {
          const container = this.map.getContainer();
          container.style.cursor = '';
        } catch (error) {
          // Handle DOM errors
        }
      }
    });
  }

  /**
   * Update marker draggable state based on current mode
   */
  updateMarkerDraggableState(): void {
    // console.log('PolygonInteractionManager updateMarkerDraggableState');
    const shouldBeDraggable = this.modeManager.canPerformAction('markerDrag');

    this.getFeatureGroups().forEach((featureGroup) => {
      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const marker = layer as L.Marker;
          try {
            // Update the draggable option
            marker.options.draggable = shouldBeDraggable;

            // If the marker has dragging capability, update its state
            if (marker.dragging) {
              if (shouldBeDraggable) {
                marker.dragging.enable();
              } else {
                marker.dragging.disable();
              }
            }
          } catch (error) {
            // Handle any errors in updating marker state
          }
        }
      });
    });
  }

  /**
   * Update all markers for edge deletion visual feedback
   */
  updateAllMarkersForEdgeDeletion(showFeedback: boolean): void {
    // console.log('PolygonInteractionManager updateAllMarkersForEdgeDeletion');
    this.getFeatureGroups().forEach((featureGroup) => {
      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          this.updateMarkerForEdgeDeletion(layer, showFeedback);
        }
      });
    });
  }

  /**
   * Update individual marker for edge deletion visual feedback
   */
  updateMarkerForEdgeDeletion(marker: L.Marker, showFeedback: boolean): void {
    // console.log('PolygonInteractionManager updateMarkerForEdgeDeletion');
    const element = marker.getElement();
    if (!element) return;

    if (showFeedback) {
      // Add hover listeners for edge deletion feedback
      element.addEventListener('mouseenter', this.onMarkerHoverForEdgeDeletionEvent);
      element.addEventListener('mouseleave', this.onMarkerLeaveForEdgeDeletionEvent);
    } else {
      // Remove hover listeners and reset style
      element.removeEventListener('mouseenter', this.onMarkerHoverForEdgeDeletionEvent);
      element.removeEventListener('mouseleave', this.onMarkerLeaveForEdgeDeletionEvent);
      element.style.backgroundColor = '';
      element.style.borderColor = '';
    }
  }

  /**
   * Set modifier key held state
   */
  setModifierKeyHeld(isHeld: boolean): void {
    // console.log('PolygonInteractionManager setModifierKeyHeld');
    this.isModifierKeyHeld = isHeld;
  }

  // Private methods

  private onEdgeClick(e: L.LeafletMouseEvent, edgePolyline: L.Polyline): void {
    // console.log('onEdgeClick');
    // console.log('PolygonInteractionManager onEdgeClick');
    // Enforce the configuration setting for attaching elbows.
    if (!this.config.modes.attachElbow) {
      return;
    }
    if (!this.modeManager.isInOffMode()) {
      return;
    }
    const edgeInfo = (edgePolyline as PolydrawEdgePolyline)._polydrawEdgeInfo;
    if (!edgeInfo) return;
    const newPoint = e.latlng;
    const parentPolygon = edgeInfo.parentPolygon;
    const parentFeatureGroup = edgeInfo.parentFeatureGroup;
    if (parentPolygon && parentFeatureGroup) {
      try {
        if (typeof parentPolygon.toGeoJSON !== 'function') {
          return;
        }
        const poly = parentPolygon.toGeoJSON();
        if (poly.geometry.type === 'MultiPolygon' || poly.geometry.type === 'Polygon') {
          const newPolygon = this.turfHelper.injectPointToPolygon(poly, [
            newPoint.lng,
            newPoint.lat,
          ]);
          if (newPolygon) {
            const polydrawPolygon = parentPolygon as PolydrawPolygon;
            const optimizationLevel = polydrawPolygon._polydrawOptimizationLevel || 0;
            this.removeFeatureGroup(parentFeatureGroup);
            this.eventManager.emit('polydraw:polygon:updated', {
              operation: 'addVertex',
              polygon: newPolygon,
              optimizationLevel,
            });
          }
        }
      } catch (error) {
        // Handle errors
      }
    }
    L.DomEvent.stopPropagation(e);
  }

  private highlightEdgeOnHover(edgePolyline: L.Polyline, isHovering: boolean): void {
    // console.log('PolygonInteractionManager highlightEdgeOnHover');
    if (isHovering) {
      edgePolyline.setStyle({
        color: '#7a9441',
        weight: 4,
        opacity: 1,
      });
    } else {
      edgePolyline.setStyle({
        color: 'transparent',
        weight: 10,
        opacity: 0,
      });
    }
  }

  private elbowClicked(e: L.LeafletMouseEvent, poly: Feature<Polygon | MultiPolygon>): void {
    // console.log('elbowClicked');
    // console.log('PolygonInteractionManager elbowClicked');
    // Enforce the configuration setting for edge deletion.
    if (!this.config.modes.edgeDeletion) {
      return;
    }
    if (!this.isModifierKeyPressed(e.originalEvent)) {
      return;
    }

    const clickedLatLng = e.latlng;
    const allRings = poly.geometry.coordinates[0];

    let targetRingIndex = -1;
    let targetVertexIndex = -1;

    for (let ringIndex = 0; ringIndex < allRings.length; ringIndex++) {
      const ring = allRings[ringIndex];
      const vertexIndex = ring.findIndex(
        (coord) =>
          Math.abs(coord[1] - clickedLatLng.lat) < 0.0001 &&
          Math.abs(coord[0] - clickedLatLng.lng) < 0.0001,
      );

      if (vertexIndex !== -1) {
        targetRingIndex = ringIndex;
        targetVertexIndex = vertexIndex;
        break;
      }
    }

    if (targetRingIndex === -1 || targetVertexIndex === -1) {
      return;
    }

    const targetRing = allRings[targetRingIndex];
    if (targetRing.length <= 4) {
      return;
    }

    const newAllRings = allRings.map((ring, ringIndex) => {
      if (ringIndex === targetRingIndex) {
        const newRing = [...ring];
        newRing.splice(targetVertexIndex, 1);
        return newRing;
      } else {
        return [...ring];
      }
    });

    const currentFeatureGroup = this.findFeatureGroupForPoly(poly);
    if (currentFeatureGroup) {
      this.removeFeatureGroup(currentFeatureGroup);
    }

    const newPolygon = this.turfHelper.getMultiPolygon([newAllRings]);
    this.eventManager.emit('polydraw:polygon:updated', {
      operation: 'removeVertex',
      polygon: newPolygon,
    });
  }

  private findFeatureGroupForPoly(poly: Feature<Polygon | MultiPolygon>): L.FeatureGroup | null {
    // console.log('PolygonInteractionManager findFeatureGroupForPoly');
    for (const featureGroup of this.getFeatureGroups()) {
      const featureCollection = featureGroup.toGeoJSON() as any;
      if (featureCollection && featureCollection.features && featureCollection.features[0]) {
        const feature = featureCollection.features[0];
        if (
          JSON.stringify(feature.geometry.coordinates) === JSON.stringify(poly.geometry.coordinates)
        ) {
          return featureGroup;
        }
      }
    }
    return null;
  }

  private markerDrag(featureGroup: L.FeatureGroup): void {
    if (!this._activeMarker) {
      console.warn('No active marker set for dragging.');
      return;
    }
    // console.log('PolygonInteractionManager markerDrag', featureGroup);
    const newPos = [];
    let testarray = [];
    let hole = [];
    const layerLength = featureGroup.getLayers() as any;
    const posarrays = layerLength[0].getLatLngs();
    let length = 0;

    // Filter out only markers from the layers (exclude polylines for holes)
    const markers = layerLength.filter((layer: any) => layer instanceof L.Marker);

    if (posarrays.length > 1) {
      for (let index = 0; index < posarrays.length; index++) {
        testarray = [];
        hole = [];
        if (index === 0) {
          if (posarrays[0].length > 1) {
            for (let i = 0; i < posarrays[0].length; i++) {
              for (let j = 0; j < posarrays[0][i].length; j++) {
                if (markers[j]) {
                  testarray.push(markers[j].getLatLng());
                }
              }
              hole.push(testarray);
            }
          } else {
            for (let j = 0; j < posarrays[0][0].length; j++) {
              if (markers[j]) {
                testarray.push(markers[j].getLatLng());
              }
            }
            hole.push(testarray);
          }
          newPos.push(hole);
        } else {
          length += posarrays[index - 1][0].length;
          for (let j = length; j < posarrays[index][0].length + length; j++) {
            if (markers[j]) {
              testarray.push(markers[j].getLatLng());
            }
          }
          hole.push(testarray);
          newPos.push(hole);
        }
      }
    } else {
      hole = [];
      let length2 = 0;
      for (let index = 0; index < posarrays[0].length; index++) {
        testarray = [];
        if (index === 0) {
          if (posarrays[0][index].length > 1) {
            for (let j = 0; j < posarrays[0][index].length; j++) {
              if (markers[j]) {
                testarray.push(markers[j].getLatLng());
              }
            }
          } else {
            for (let j = 0; j < posarrays[0][0].length; j++) {
              if (markers[j]) {
                testarray.push(markers[j].getLatLng());
              }
            }
          }
        } else {
          length2 += posarrays[0][index - 1].length;
          for (let j = length2; j < posarrays[0][index].length + length2; j++) {
            if (markers[j]) {
              testarray.push(markers[j].getLatLng());
            }
          }
        }
        hole.push(testarray);
      }
      newPos.push(hole);
    }
    layerLength[0].setLatLngs(newPos);
  }

  private async markerDragEnd(featureGroup: L.FeatureGroup): Promise<void> {
    // console.log('PolygonInteractionManager markerDragEnd');
    this.polygonInformation.deletePolygonInformationStorage();
    const featureCollection = featureGroup.toGeoJSON() as any;

    if (!featureCollection.features || featureCollection.features.length === 0) {
      return;
    }

    // Remove the current feature group first to avoid duplication
    this.removeFeatureGroup(featureGroup);

    if (featureCollection.features[0].geometry.coordinates.length > 1) {
      for (const element of featureCollection.features[0].geometry.coordinates) {
        const feature = this.turfHelper.getMultiPolygon([element]);

        if (this.turfHelper.hasKinks(feature)) {
          const unkink = this.turfHelper.getKinks(feature);
          for (const polygon of unkink) {
            // Allow merging after marker drag - this enables polygon merging when dragged into each other
            this.eventManager.emit('polydraw:polygon:updated', {
              operation: 'markerDrag',
              polygon: this.turfHelper.getTurfPolygon(polygon),
              allowMerge: true,
            });
          }
        } else {
          // Allow merging after marker drag - this enables polygon merging when dragged into each other
          this.eventManager.emit('polydraw:polygon:updated', {
            operation: 'markerDrag',
            polygon: feature,
            allowMerge: true,
          });
        }
      }
    } else {
      const feature = this.turfHelper.getMultiPolygon(
        featureCollection.features[0].geometry.coordinates,
      );

      if (this.turfHelper.hasKinks(feature)) {
        const unkink = this.turfHelper.getKinks(feature);
        for (const polygon of unkink) {
          // Allow merging after marker drag - this enables polygon merging when dragged into each other
          this.eventManager.emit('polydraw:polygon:updated', {
            operation: 'markerDrag',
            polygon: this.turfHelper.getTurfPolygon(polygon),
            allowMerge: true,
          });
          // Allow merging after marker drag - this enables polygon merging when dragged into each other
          this.eventManager.emit('polydraw:polygon:updated', {
            operation: 'markerDrag',
            polygon: this.turfHelper.getTurfPolygon(polygon),
            allowMerge: true,
          });
        }
      } else {
        // Allow merging after marker drag - this enables polygon merging when dragged into each other
        this.eventManager.emit('polydraw:polygon:updated', {
          operation: 'markerDrag',
          polygon: feature,
          allowMerge: true,
        });
        // Allow merging after marker drag - this enables polygon merging when dragged into each other
        this.eventManager.emit('polydraw:polygon:updated', {
          operation: 'markerDrag',
          polygon: feature,
          allowMerge: true,
        });
      }
    }
    this.polygonInformation.createPolygonInformationStorage(this.getFeatureGroups());
  }

  // Polygon dragging methods
  private onPolygonMouseMove = (e: L.LeafletMouseEvent) => {
    // console.log('PolygonInteractionManager onPolygonMouseMove');
    if (!this.currentDragPolygon || !this.currentDragPolygon._polydrawDragData.isDragging) return;

    const polygon = this.currentDragPolygon;
    const dragData = polygon._polydrawDragData;

    const eventToCheck = e.originalEvent && 'metaKey' in e.originalEvent ? e.originalEvent : e;
    const currentModifierState = this.detectModifierKey(eventToCheck as MouseEvent);
    if (currentModifierState !== this.currentModifierDragMode) {
      this.handleModifierToggleDuringDrag(eventToCheck as MouseEvent);
    }

    const startPos = dragData.startPosition;
    const currentPos = e.latlng;
    const offsetLat = currentPos.lat - startPos.lat;
    const offsetLng = currentPos.lng - startPos.lng;

    const newLatLngs = this.offsetPolygonCoordinates(dragData.startLatLngs, offsetLat, offsetLng);
    polygon.setLatLngs(newLatLngs);

    this.updateMarkersAndHoleLinesDuringDrag(polygon, offsetLat, offsetLng);
  };

  private onPolygonMouseUp = (e: L.LeafletMouseEvent) => {
    // console.log('PolygonInteractionManager onPolygonMouseUp');
    if (!this.currentDragPolygon || !this.currentDragPolygon._polydrawDragData.isDragging) return;

    const polygon = this.currentDragPolygon;
    const dragData = polygon._polydrawDragData;

    dragData.isDragging = false;

    this.map.off('mousemove', this.onPolygonMouseMove, this);
    this.map.off('mouseup', this.onPolygonMouseUp, this);

    if (this.map.dragging) {
      this.map.dragging.enable();
    }

    try {
      const container = this.map.getContainer();
      container.style.cursor = '';
    } catch (error) {
      // Handle DOM errors
    }

    this.updatePolygonAfterDrag(polygon);

    if (polygon._polydrawOriginalMarkerPositions) {
      polygon._polydrawOriginalMarkerPositions.clear();
      delete polygon._polydrawOriginalMarkerPositions;
    }
    if (polygon._polydrawOriginalHoleLinePositions) {
      polygon._polydrawOriginalHoleLinePositions.clear();
      delete polygon._polydrawOriginalHoleLinePositions;
    }
    if (polygon._polydrawCurrentDragSession) {
      delete polygon._polydrawCurrentDragSession;
    }

    this.currentDragPolygon = null;
  };

  private offsetPolygonCoordinates(latLngs: any, offsetLat: number, offsetLng: number): any {
    // console.log('PolygonInteractionManager offsetPolygonCoordinates');
    if (!latLngs) return latLngs;

    if (Array.isArray(latLngs[0])) {
      return latLngs.map((ring: any) => this.offsetPolygonCoordinates(ring, offsetLat, offsetLng));
    } else if (latLngs.lat !== undefined && latLngs.lng !== undefined) {
      return {
        lat: latLngs.lat + offsetLat,
        lng: latLngs.lng + offsetLng,
      };
    } else {
      return latLngs.map((coord: any) =>
        this.offsetPolygonCoordinates(coord, offsetLat, offsetLng),
      );
    }
  }

  private updateMarkersAndHoleLinesDuringDrag(
    polygon: any,
    offsetLat: number,
    offsetLng: number,
  ): void {
    // console.log('PolygonInteractionManager updateMarkersAndHoleLinesDuringDrag');
    try {
      let featureGroup: L.FeatureGroup | null = null;

      // Find the specific feature group that contains this exact polygon
      for (const fg of this.getFeatureGroups()) {
        let foundPolygon = false;
        fg.eachLayer((layer) => {
          if (layer === polygon) {
            foundPolygon = true;
          }
        });
        if (foundPolygon) {
          featureGroup = fg;
          break;
        }
      }

      if (!featureGroup) {
        return;
      }

      // Ensure this drag session is unique to this specific polygon
      const dragSessionKey = '_polydrawDragSession_' + Date.now() + '_' + L.Util.stamp(polygon);
      if (!polygon._polydrawCurrentDragSession) {
        polygon._polydrawCurrentDragSession = dragSessionKey;
        polygon._polydrawOriginalMarkerPositions = new Map();
        polygon._polydrawOriginalHoleLinePositions = new Map();

        // Only store markers and lines that belong to THIS specific feature group
        featureGroup.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            polygon._polydrawOriginalMarkerPositions.set(layer, layer.getLatLng());
          } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            polygon._polydrawOriginalHoleLinePositions.set(layer, layer.getLatLngs());
          }
        });
      }

      // Only update markers and lines that belong to THIS specific feature group
      // and that were stored in the original positions map
      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const originalPos = polygon._polydrawOriginalMarkerPositions.get(layer);
          if (originalPos) {
            const newLatLng = {
              lat: originalPos.lat + offsetLat,
              lng: originalPos.lng + offsetLng,
            };
            layer.setLatLng(newLatLng);
          }
        } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
          const originalPositions = polygon._polydrawOriginalHoleLinePositions.get(layer);
          if (originalPositions) {
            const newLatLngs = originalPositions.map((latlng: L.LatLng) => ({
              lat: latlng.lat + offsetLat,
              lng: latlng.lng + offsetLng,
            }));
            layer.setLatLngs(newLatLngs);
          }
        }
      });
    } catch (error) {
      // Silently handle errors
      console.warn('Error updating markers during drag:', error);
    }
  }

  private async updatePolygonAfterDrag(polygon: PolydrawPolygon): Promise<void> {
    // console.log('PolygonInteractionManager updatePolygonAfterDrag');
    try {
      let featureGroup: L.FeatureGroup | null = null;

      for (const fg of this.getFeatureGroups()) {
        fg.eachLayer((layer) => {
          if (layer === polygon) {
            featureGroup = fg;
          }
        });
        if (featureGroup) break;
      }

      if (!featureGroup) {
        return;
      }

      const newGeoJSON = polygon.toGeoJSON();

      if (this.isModifierDragActive()) {
        this.performModifierSubtract(newGeoJSON, featureGroup);
        this.currentModifierDragMode = false;
        this.isModifierKeyHeld = false;
        return;
      }

      this.removeFeatureGroup(featureGroup);

      const feature = this.turfHelper.getTurfPolygon(newGeoJSON);
      this.eventManager.emit('polydraw:polygon:updated', {
        operation: 'polygonDrag',
        polygon: feature,
        allowMerge: true,
      });

      this.polygonInformation.createPolygonInformationStorage(this.getFeatureGroups());
    } catch (error) {
      // Handle errors
    }
  }

  private detectModifierKey(event: MouseEvent | KeyboardEvent): boolean {
    // console.log('PolygonInteractionManager detectModifierKey');
    if (!this.config.dragPolygons?.modifierSubtract?.enabled) {
      return false;
    }
    if (isTouchDevice()) {
      return false;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = userAgent.includes('mac');

    if (isMac) {
      return event.metaKey;
    } else {
      return event.ctrlKey;
    }
  }

  private setSubtractVisualMode(polygon: any, enabled: boolean): void {
    // console.log('PolygonInteractionManager setSubtractVisualMode');
    if (!polygon || !polygon.setStyle) {
      return;
    }

    try {
      if (enabled) {
        polygon.setStyle({
          color: this.config.dragPolygons.modifierSubtract.subtractColor,
        });
      } else {
        polygon.setStyle({
          color: this.config.polygonOptions.color,
        });
      }
      this.updateMarkerColorsForSubtractMode(polygon, enabled);
    } catch (error) {
      // Handle DOM errors
    }
  }

  private updateMarkerColorsForSubtractMode(polygon: any, subtractMode: boolean): void {
    // console.log('PolygonInteractionManager updateMarkerColorsForSubtractMode');
    try {
      let featureGroup: L.FeatureGroup | null = null;

      for (const fg of this.getFeatureGroups()) {
        fg.eachLayer((layer) => {
          if (layer === polygon) {
            featureGroup = fg;
          }
        });
        if (featureGroup) break;
      }

      if (!featureGroup) {
        return;
      }

      const hideMarkersOnDrag =
        this.config.dragPolygons?.modifierSubtract?.hideMarkersOnDrag ?? false;

      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const marker = layer as L.Marker;
          const element = marker.getElement();

          if (element) {
            if (subtractMode) {
              if (hideMarkersOnDrag) {
                element.style.display = 'none';
                element.classList.add('subtract-mode-hidden');
              } else {
                element.style.backgroundColor =
                  this.config.dragPolygons.modifierSubtract.subtractColor;
                element.style.borderColor = this.config.dragPolygons.modifierSubtract.subtractColor;
                element.classList.add('subtract-mode');
              }
            } else {
              if (hideMarkersOnDrag) {
                element.style.display = '';
                element.classList.remove('subtract-mode-hidden');
              } else {
                element.style.backgroundColor = '';
                element.style.borderColor = '';
                element.classList.remove('subtract-mode');
              }
            }
          }
        }
      });
    } catch (error) {
      // Handle errors
    }
  }

  private handleModifierToggleDuringDrag(event: MouseEvent): void {
    // console.log('PolygonInteractionManager handleModifierToggleDuringDrag');
    const isModifierPressed = this.detectModifierKey(event);

    this.currentModifierDragMode = isModifierPressed;
    this.isModifierKeyHeld = isModifierPressed;

    if (this.currentDragPolygon) {
      this.setSubtractVisualMode(this.currentDragPolygon, isModifierPressed);
    }
  }

  private isModifierDragActive(): boolean {
    // console.log('PolygonInteractionManager isModifierDragActive');
    return this.currentModifierDragMode;
  }

  private performModifierSubtract(draggedGeoJSON: any, originalFeatureGroup: L.FeatureGroup): void {
    // console.log('PolygonInteractionManager performModifierSubtract');
    try {
      const draggedPolygon = this.turfHelper.getTurfPolygon(draggedGeoJSON);
      const intersectingFeatureGroups: L.FeatureGroup[] = [];

      // Find all feature groups that intersect with the dragged polygon
      this.getFeatureGroups().forEach((featureGroup) => {
        if (featureGroup === originalFeatureGroup) {
          return;
        }

        try {
          const featureCollection = featureGroup.toGeoJSON() as any;
          if (!featureCollection || !featureCollection.features || !featureCollection.features[0]) {
            return;
          }

          const firstFeature = featureCollection.features[0];
          if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
            return;
          }

          const existingPolygon = this.turfHelper.getTurfPolygon(firstFeature);

          // Check intersection directly using geometry operations
          try {
            const intersection = this.turfHelper.getIntersection(existingPolygon, draggedPolygon);
            if (
              intersection &&
              intersection.geometry &&
              intersection.geometry.coordinates.length > 0
            ) {
              intersectingFeatureGroups.push(featureGroup);
            }
          } catch (intersectError) {
            // If intersection fails, try the polygonIntersect method
            try {
              const hasIntersection = this.turfHelper.polygonIntersect(
                existingPolygon,
                draggedPolygon,
              );
              if (hasIntersection) {
                intersectingFeatureGroups.push(featureGroup);
              }
            } catch (polygonIntersectError) {
              // Continue with other polygons
            }
          }
        } catch (error) {
          // Handle errors
        }
      });

      // Remove the original dragged polygon first
      this.removeFeatureGroup(originalFeatureGroup);

      // For each intersecting polygon, subtract the dragged polygon from it
      // This creates the "bite taken" effect
      intersectingFeatureGroups.forEach((featureGroup) => {
        try {
          const featureCollection = featureGroup.toGeoJSON() as any;
          const existingPolygon = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

          // Remove the existing polygon before creating the result
          this.removeFeatureGroup(featureGroup);

          // Perform the subtraction: existing polygon - dragged polygon
          try {
            const difference = this.turfHelper.polygonDifference(existingPolygon, draggedPolygon);

            if (difference && difference.geometry) {
              // Use the same approach as regular subtract: create separate polygons for each result
              // Get the coordinates and create individual polygons
              const coords = this.turfHelper.getCoords(difference);

              // Create separate polygons for each coordinate set (like regular subtract does)
              for (const coordSet of coords) {
                const individualPolygon = this.turfHelper.getMultiPolygon([coordSet]);

                // Emit each result polygon separately to ensure they get separate feature groups
                this.eventManager.emit('polydraw:polygon:updated', {
                  operation: 'modifierSubtract',
                  polygon: this.turfHelper.getTurfPolygon(individualPolygon),
                  allowMerge: false, // Don't merge the result of subtract operations
                });
              }
            }
          } catch (differenceError) {
            console.warn('Failed to perform difference operation:', differenceError);
            // If difference fails, try to add the original polygon back
            this.eventManager.emit('polydraw:polygon:updated', {
              operation: 'modifierSubtractFallback',
              polygon: existingPolygon,
              allowMerge: false,
            });
          }
        } catch (error) {
          console.warn('Error in modifier subtract operation:', error);
        }
      });

      // Update polygon information after the operation
      this.polygonInformation.createPolygonInformationStorage(this.getFeatureGroups());
    } catch (error) {
      console.warn('Error in performModifierSubtract:', error);
    }
  }

  /**
   * Check if two bounding boxes overlap
   */
  private boundingBoxesOverlap(bbox1: number[], bbox2: number[]): boolean {
    // bbox format: [minX, minY, maxX, maxY]
    return !(
      bbox1[2] < bbox2[0] ||
      bbox2[2] < bbox1[0] ||
      bbox1[3] < bbox2[1] ||
      bbox2[3] < bbox1[1]
    );
  }

  private isModifierKeyPressed(event: MouseEvent): boolean {
    // console.log('PolygonInteractionManager isModifierKeyPressed');
    if (isTouchDevice()) {
      return false;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = userAgent.includes('mac');

    if (isMac) {
      return event.metaKey;
    } else {
      return event.ctrlKey;
    }
  }

  private onMarkerHoverForEdgeDeletion(marker: L.Marker, isHovering: boolean): void {
    // console.log('PolygonInteractionManager onMarkerHoverForEdgeDeletion');
    const element = marker.getElement();
    if (!element) return;

    if (isHovering) {
      // Add event listeners to detect modifier key state in real-time
      const checkModifierAndUpdate = (e: KeyboardEvent | MouseEvent) => {
        const isModifierPressed = this.detectModifierKey(e);
        if (isModifierPressed) {
          element.style.backgroundColor =
            this.config.dragPolygons?.modifierSubtract?.subtractColor || '#D9460F';
          element.style.borderColor =
            this.config.dragPolygons?.modifierSubtract?.subtractColor || '#D9460F';
          element.classList.add('edge-deletion-hover');
          // Set cursor to pointer when modifier key is held over marker
          try {
            const container = this.map.getContainer();
            container.style.cursor = 'pointer';
          } catch (error) {
            // Handle DOM errors
          }
        } else {
          element.style.backgroundColor = '';
          element.style.borderColor = '';
          element.classList.remove('edge-deletion-hover');
          // Reset cursor when no modifier key
          try {
            const container = this.map.getContainer();
            container.style.cursor = '';
          } catch (error) {
            // Handle DOM errors
          }
        }
      };

      // Check initial state
      const initialEvent = new MouseEvent('mouseover');
      checkModifierAndUpdate(initialEvent);

      // Store the handler for cleanup in WeakMap
      this.markerModifierHandlers.set(marker, checkModifierAndUpdate);

      // Listen for keyboard events to update in real-time
      document.addEventListener('keydown', checkModifierAndUpdate);
      document.addEventListener('keyup', checkModifierAndUpdate);
      element.addEventListener('mousemove', checkModifierAndUpdate);
    } else {
      // Clean up when not hovering
      element.style.backgroundColor = '';
      element.style.borderColor = '';
      element.classList.remove('edge-deletion-hover');

      // Reset cursor
      try {
        const container = this.map.getContainer();
        container.style.cursor = '';
      } catch (error) {
        // Handle DOM errors
      }

      // Remove event listeners
      const handler = this.markerModifierHandlers.get(marker);
      if (handler) {
        document.removeEventListener('keydown', handler);
        document.removeEventListener('keyup', handler);
        element.removeEventListener('mousemove', handler);
        this.markerModifierHandlers.delete(marker);
      }
    }
  }

  private onMarkerHoverForEdgeDeletionEvent = (e: Event) => {
    // console.log('PolygonInteractionManager onMarkerHoverForEdgeDeletionEvent');
    if (!this.isModifierKeyHeld) return;

    const element = e.target as HTMLElement;
    if (element) {
      element.style.backgroundColor = '#D9460F';
      element.style.borderColor = '#D9460F';
      element.classList.add('edge-deletion-hover');
    }
  };

  private onMarkerLeaveForEdgeDeletionEvent = (e: Event) => {
    // console.log('PolygonInteractionManager onMarkerLeaveForEdgeDeletionEvent');
    const element = e.target as HTMLElement;
    if (element) {
      element.style.backgroundColor = '';
      element.style.borderColor = '';
      element.classList.remove('edge-deletion-hover');
    }
  };

  // Helper methods
  private getMarkerIndex(latlngs: L.LatLngLiteral[], position: MarkerPosition): number {
    // console.log('PolygonInteractionManager getMarkerIndex');
    const bounds: L.LatLngBounds = PolyDrawUtil.getBounds(latlngs, Math.sqrt(2) / 2);
    const compass = new Compass(
      bounds.getSouth(),
      bounds.getWest(),
      bounds.getNorth(),
      bounds.getEast(),
    );
    const compassDirection = compass.getDirection(position);
    const latLngPoint: L.LatLngLiteral = {
      lat: compassDirection.lat,
      lng: compassDirection.lng,
    };
    const targetPoint = this.turfHelper.getCoord(latLngPoint);
    const fc = this.turfHelper.getFeaturePointCollection(latlngs);
    const nearestPointIdx = this.turfHelper.getNearestPointIndex(targetPoint, fc as any);
    return nearestPointIdx;
  }

  private ensureMarkerSeparation(
    polygonLength: number,
    markers: {
      menu: { index: number; enabled: boolean };
      delete: { index: number; enabled: boolean };
      info: { index: number; enabled: boolean };
    },
  ): { menu: number; delete: number; info: number } {
    // console.log('PolygonInteractionManager ensureMarkerSeparation');
    // Get list of enabled markers with their indices
    const enabledMarkers: Array<{ type: string; index: number }> = [];

    if (markers.menu.enabled) {
      enabledMarkers.push({ type: 'menu', index: markers.menu.index });
    }
    if (markers.delete.enabled) {
      enabledMarkers.push({ type: 'delete', index: markers.delete.index });
    }
    if (markers.info.enabled) {
      enabledMarkers.push({ type: 'info', index: markers.info.index });
    }

    // If less than 2 markers enabled, no overlap possible
    if (enabledMarkers.length < 2) {
      return {
        menu: markers.menu.index,
        delete: markers.delete.index,
        info: markers.info.index,
      };
    }

    // Check for overlaps and resolve them
    const resolvedIndices = { ...markers };
    const usedIndices = new Set<number>();

    // Process markers in priority order: info, delete, menu
    const processingOrder = ['info', 'delete', 'menu'];

    for (const markerType of processingOrder) {
      const marker = resolvedIndices[markerType as keyof typeof resolvedIndices];

      if (!marker.enabled) continue;

      // If this index is already used, find a new one
      if (usedIndices.has(marker.index)) {
        const newIndex = this.findAlternativeMarkerPosition(
          polygonLength,
          marker.index,
          usedIndices,
        );
        resolvedIndices[markerType as keyof typeof resolvedIndices].index = newIndex;
        usedIndices.add(newIndex);
      } else {
        usedIndices.add(marker.index);
      }
    }

    return {
      menu: resolvedIndices.menu.index,
      delete: resolvedIndices.delete.index,
      info: resolvedIndices.info.index,
    };
  }

  private findAlternativeMarkerPosition(
    polygonLength: number,
    originalIndex: number,
    usedIndices: Set<number>,
  ): number {
    // console.log('PolygonInteractionManager findAlternativeMarkerPosition');
    // Strategy: Try positions at regular intervals around the polygon
    // Start with positions that are far from the original
    const maxAttempts = polygonLength;
    const step = Math.max(1, Math.floor(polygonLength / 8)); // Try every 1/8th of polygon

    // Try positions moving away from the original index
    for (let attempt = 1; attempt < maxAttempts; attempt++) {
      // Try both directions from original position
      const candidates = [
        (originalIndex + attempt * step) % polygonLength,
        (originalIndex - attempt * step + polygonLength) % polygonLength,
      ];

      for (const candidate of candidates) {
        if (!usedIndices.has(candidate)) {
          return candidate;
        }
      }
    }

    // Fallback: find any unused index
    for (let i = 0; i < polygonLength; i++) {
      if (!usedIndices.has(i)) {
        return i;
      }
    }

    // Ultimate fallback: return original index (shouldn't happen in practice)
    return originalIndex;
  }

  private createDivIcon(processedClasses: string[]): L.DivIcon {
    // console.log('PolygonInteractionManager createDivIcon');
    return IconFactory.createDivIcon(processedClasses);
  }

  private getLatLngInfoString(latlng: L.LatLngLiteral): string {
    // console.log('PolygonInteractionManager getLatLngInfoString');
    return 'Latitude: ' + latlng.lat + ' Longitude: ' + latlng.lng;
  }

  private generateMenuMarkerPopup(
    latLngs: L.LatLngLiteral[],
    featureGroup: L.FeatureGroup,
  ): L.Popup {
    const outerWrapper: HTMLDivElement = document.createElement('div');
    outerWrapper.classList.add('alter-marker-outer-wrapper');
    const wrapper: HTMLDivElement = document.createElement('div');
    wrapper.classList.add('alter-marker-wrapper');
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

    // Add alpha banner for bezier button
    const alphaBanner: HTMLSpanElement = document.createElement('span');
    alphaBanner.classList.add('alpha-banner');
    alphaBanner.textContent = 'ALPHA';
    bezier.appendChild(alphaBanner);

    const separator: HTMLDivElement = document.createElement('div');
    separator.classList.add('separator');

    outerWrapper.appendChild(wrapper);
    wrapper.appendChild(markerContent);
    markerContent.appendChild(markerContentWrapper);
    markerContentWrapper.appendChild(simplify);
    markerContentWrapper.appendChild(separator.cloneNode());
    markerContentWrapper.appendChild(doubleElbows);
    markerContentWrapper.appendChild(separator.cloneNode());
    markerContentWrapper.appendChild(bbox);
    markerContentWrapper.appendChild(separator.cloneNode());
    markerContentWrapper.appendChild(bezier);

    const closePopupIfOpen = () => {
      if (this._openMenuPopup) {
        this.map.closePopup(this._openMenuPopup);
        this._openMenuPopup = null;
      }
    };

    simplify.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.eventManager.emit('polydraw:menu:action', {
        action: 'simplify',
        latLngs,
        featureGroup,
      });
      closePopupIfOpen();
    });
    simplify.onclick = () => {
      this.eventManager.emit('polydraw:menu:action', {
        action: 'simplify',
        latLngs,
        featureGroup,
      });
      closePopupIfOpen();
    };

    bbox.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.eventManager.emit('polydraw:menu:action', {
        action: 'bbox',
        latLngs,
        featureGroup,
      });
      closePopupIfOpen();
    });
    bbox.onclick = () => {
      this.eventManager.emit('polydraw:menu:action', {
        action: 'bbox',
        latLngs,
        featureGroup,
      });
      closePopupIfOpen();
    };

    doubleElbows.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.eventManager.emit('polydraw:menu:action', {
        action: 'doubleElbows',
        latLngs,
        featureGroup,
      });
      closePopupIfOpen();
    });
    doubleElbows.onclick = () => {
      this.eventManager.emit('polydraw:menu:action', {
        action: 'doubleElbows',
        latLngs,
        featureGroup,
      });
      closePopupIfOpen();
    };

    bezier.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.eventManager.emit('polydraw:menu:action', {
        action: 'bezier',
        latLngs,
        featureGroup,
      });
      closePopupIfOpen();
    });
    bezier.onclick = () => {
      this.eventManager.emit('polydraw:menu:action', {
        action: 'bezier',
        latLngs,
        featureGroup,
      });
      closePopupIfOpen();
    };

    L.DomEvent.disableClickPropagation(outerWrapper);
    outerWrapper.style.pointerEvents = 'auto';

    outerWrapper.querySelectorAll('.marker-menu-button').forEach((btn) => {
      (btn as HTMLElement).style.pointerEvents = 'auto';
      btn.addEventListener('click', (e) => e.stopPropagation());
    });

    const isMobile = window.innerWidth <= 600;
    const popup = L.popup({
      closeButton: true,
      autoClose: true,
      className: `menu-popup${isMobile ? ' mobile-popup' : ''}`,
    }).setContent(outerWrapper);

    this._openMenuPopup = popup;
    return popup;
  }

  private getPolygonGeoJSONFromFeatureGroup(
    featureGroup: L.FeatureGroup,
  ): Feature<Polygon | MultiPolygon> {
    // console.log('PolygonInteractionManager getPolygonGeoJSONFromFeatureGroup');
    try {
      // Find the polygon layer in the feature group
      let polygon: L.Polygon | null = null;
      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          polygon = layer;
        }
      });

      if (!polygon) {
        // Fallback: create a simple polygon from the first ring
        throw new Error('No polygon found in feature group');
      }

      // Get the complete GeoJSON including holes
      return polygon.toGeoJSON() as Feature<Polygon | MultiPolygon>;
    } catch (error) {
      console.warn('Error getting polygon GeoJSON from feature group:', error.message);
      // Fallback: return a simple polygon
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
        properties: {},
      };
    }
  }

  private getTotalPolygonPerimeter(polygonGeoJSON: Feature<Polygon | MultiPolygon>): number {
    // console.log('PolygonInteractionManager getTotalPolygonPerimeter');
    try {
      if (!polygonGeoJSON || !polygonGeoJSON.geometry) {
        return 0;
      }

      let totalPerimeter = 0;

      if (polygonGeoJSON.geometry.type === 'Polygon') {
        // For a single polygon, sum all ring perimeters
        const coordinates = polygonGeoJSON.geometry.coordinates;

        for (const ring of coordinates) {
          // Create a temporary polygon for each ring to calculate its perimeter
          const ringPolygon: Feature<Polygon> = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [ring],
            },
            properties: {},
          };

          const ringPerimeter = this.turfHelper.getPolygonPerimeter(ringPolygon);
          totalPerimeter += ringPerimeter;
        }
      } else if (polygonGeoJSON.geometry.type === 'MultiPolygon') {
        // For multipolygon, sum all polygons' total perimeters
        const coordinates = polygonGeoJSON.geometry.coordinates;

        for (const polygonCoords of coordinates) {
          for (const ring of polygonCoords) {
            const ringPolygon: Feature<Polygon> = {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [ring],
              },
              properties: {},
            };

            const ringPerimeter = this.turfHelper.getPolygonPerimeter(ringPolygon);
            totalPerimeter += ringPerimeter;
          }
        }
      }

      // Convert from kilometers to meters to match original behavior
      return totalPerimeter * 1000;
    } catch (error) {
      console.warn('Error calculating total polygon perimeter:', error.message);
      // Fallback to turf helper calculation
      return this.turfHelper.getPolygonPerimeter(polygonGeoJSON) * 1000;
    }
  }

  private generateInfoMarkerPopup(area: number, perimeter: number): L.Popup {
    const _perimeter = new Perimeter(perimeter, this.config as any);
    const _area = new Area(area, this.config as any);

    const outerWrapper: HTMLDivElement = document.createElement('div');
    outerWrapper.classList.add('info-marker-outer-wrapper');
    const wrapper: HTMLDivElement = document.createElement('div');
    wrapper.classList.add('info-marker-wrapper');
    const markerContent: HTMLDivElement = document.createElement('div');
    markerContent.classList.add('content');

    const infoContentWrapper: HTMLDivElement = document.createElement('div');
    infoContentWrapper.classList.add('info-marker-content');

    const areaDiv: HTMLDivElement = document.createElement('div');
    areaDiv.classList.add('info-item', 'area');
    areaDiv.innerHTML = `<strong>Area:</strong> ${_area.metricArea} ${_area.metricUnit}`;

    const perimeterDiv: HTMLDivElement = document.createElement('div');
    perimeterDiv.classList.add('info-item', 'perimeter');
    perimeterDiv.innerHTML = `<strong>Perimeter:</strong> ${_perimeter.metricLength} ${_perimeter.metricUnit}`;

    infoContentWrapper.appendChild(areaDiv);
    infoContentWrapper.appendChild(perimeterDiv);
    markerContent.appendChild(infoContentWrapper);

    outerWrapper.appendChild(wrapper);
    wrapper.appendChild(markerContent);

    L.DomEvent.disableClickPropagation(outerWrapper);
    outerWrapper.style.pointerEvents = 'auto';

    outerWrapper.querySelectorAll('button').forEach((btn) => {
      (btn as HTMLElement).style.pointerEvents = 'auto';
      btn.addEventListener('click', (e) => e.stopPropagation());
    });

    const isMobile = window.innerWidth <= 600;
    const popup = L.popup({
      closeButton: true,
      autoClose: true,
      className: `info-popup${isMobile ? ' mobile-popup' : ''}`,
    }).setContent(outerWrapper);

    return popup;
  }
}
