import * as L from 'leaflet';
import { TurfHelper } from '../turf-helper';
import { PolygonInformationService } from '../polygon-information.service';
import { IconFactory } from '../icon-factory';
import { PolygonUtil } from '../polygon.util';
import { DrawMode, MarkerPosition } from '../enums';
import { Compass, PolyDrawUtil, Perimeter, Area } from '../utils';
import { leafletAdapter } from '../compatibility/leaflet-adapter';
import { LeafletVersionDetector } from '../compatibility/version-detector';
import { EventAdapter } from '../compatibility/event-adapter';
import type { Feature, Polygon, MultiPolygon, FeatureCollection, Point } from 'geojson';
import type {
  PolydrawConfig,
  PolydrawPolygon,
  PolydrawEdgePolyline,
  PolygonUpdatedEventData,
  HistoryAction,
} from '../types/polydraw-interfaces';
import { ModeManager } from './mode-manager';
import { EventManager } from './event-manager';
import { isTouchDevice } from './../utils';
import { isTestEnvironment } from '../utils';
import { PolygonTransformController } from '../transform/polygon-transform-controller';
import { PopupFactory } from '../popup-factory';

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
  saveHistoryState?: (action: HistoryAction) => void;
}

interface MarkerImportanceOptions {
  menuIndex: number;
  deleteIndex: number;
  infoIndex: number;
  optimizationLevel: number;
}

/**
 * PolygonInteractionManager handles all interactions with existing polygons.
 * This includes dragging polygons, dragging markers, edge interactions, and popup menus.
 */
export class PolygonInteractionManager {
  private markerFeatureGroupMap = new WeakMap<L.Marker, L.FeatureGroup>();
  private markerModifierHandlers = new WeakMap<L.Marker, (e: Event) => void>();
  private markerTouchListeners = new WeakMap<
    L.Marker,
    { touchstart: (e: Event) => void; touchend: (e: Event) => void }
  >();
  private markerEdgeDeletionListeners = new WeakMap<
    L.Marker,
    { mouseenter: (e: Event) => void; mouseleave: (e: Event) => void }
  >();
  private _activeMarker: L.Marker | null = null;
  private isDraggingMarker = false;
  private turfHelper: TurfHelper;
  private polygonInformation: PolygonInformationService;
  private map: L.Map;
  private config: PolydrawConfig;
  private modeManager: ModeManager;
  private eventManager: EventManager;
  private saveHistoryState?: (action: HistoryAction) => void;

  // Polygon drag state
  private currentDragPolygon: PolydrawPolygon | null = null;
  private currentDragIsClone: boolean = false;
  private currentModifierDragMode: boolean = false;
  private isModifierKeyHeld: boolean = false;
  private currentCloneGhost: L.Polygon | null = null;
  private dragCancelHandlersAttached: boolean = false;
  private _boundDragTouchMove: ((e: TouchEvent) => void) | null = null;
  private _boundDragTouchEnd: ((e: TouchEvent) => void) | null = null;
  private polygonTouchStartListeners = new WeakMap<L.Polygon, (e: TouchEvent) => void>();
  private _openMenuPopup: L.Popup | null = null;
  private transformModeActive: boolean = false;
  private transformControllers = new WeakMap<L.FeatureGroup, PolygonTransformController>();
  private deleteMarkerSuppressUntil = 0;
  /**
   * Strongly typed helper to emit polygon updated events without casts.
   * Also saves history state before emitting (except for drag operations which save on dragstart).
   */
  private emitPolygonUpdated(data: PolygonUpdatedEventData): void {
    // Save history state before modification for all operations except drag operations
    // (markerDrag and polygonDrag already save state on dragstart)
    const historyAction = this.getHistoryActionForOperation(data.operation);
    if (historyAction && this.saveHistoryState) {
      this.saveHistoryState(historyAction);
    }
    this.eventManager.emit('polydraw:polygon:updated', data);
  }

  private getHistoryActionForOperation(operation: string): HistoryAction | null {
    switch (operation) {
      case 'addVertex':
      case 'removeVertex':
      case 'removeHole':
      case 'toggleOptimization':
        return operation;
      case 'modifierSubtract':
      case 'modifierSubtractFallback':
        return 'modifierSubtract';
      default:
        return null;
    }
  }

  // Read-only access to feature groups
  private getFeatureGroups: () => L.FeatureGroup[];
  private removeFeatureGroup: (fg: L.FeatureGroup) => void;

  constructor(
    dependencies: PolygonInteractionManagerDependencies,
    featureGroupAccess: {
      getFeatureGroups: () => L.FeatureGroup[];
      addFeatureGroup: (fg: L.FeatureGroup) => void;
      removeFeatureGroup: (fg: L.FeatureGroup) => void;
    },
  ) {
    this.turfHelper = dependencies.turfHelper;
    this.polygonInformation = dependencies.polygonInformation;
    this.map = dependencies.map;
    this.config = dependencies.config;
    this.modeManager = dependencies.modeManager;
    this.eventManager = dependencies.eventManager;
    this.saveHistoryState = dependencies.saveHistoryState;

    // Store feature group access methods
    this.getFeatureGroups = featureGroupAccess.getFeatureGroups;
    this.removeFeatureGroup = featureGroupAccess.removeFeatureGroup;

    this.eventManager.on('polydraw:mode:change', () => {
      if (this.currentCloneGhost || this.isPolygonDragActive()) {
        this.cancelActivePolygonDrag();
      }
    });
  }

  private getTimestamp(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }

  private shouldSuppressDeleteMarkerClick(): boolean {
    return this.getTimestamp() < this.deleteMarkerSuppressUntil;
  }

  public suppressDeleteMarkerClicks(durationMs: number): void {
    this.deleteMarkerSuppressUntil = this.getTimestamp() + Math.max(0, durationMs);
  }

  /**
   * Add markers to a polygon feature group
   */
  addMarkers(
    latlngs: L.LatLngLiteral[],
    featureGroup: L.FeatureGroup,
    options: { optimizationLevel?: number; originalOptimizationLevel?: number } = {},
  ): void {
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

    const optimizationLevel = options.optimizationLevel ?? 0;
    const importantIndices = this.deriveImportantMarkerIndices(latlngs, {
      menuIndex: menuMarkerIdx,
      deleteIndex: deleteMarkerIdx,
      infoIndex: infoMarkerIdx,
      optimizationLevel,
    });
    const hasClosingPoint =
      latlngs.length > 2 && this.latLngEquals(latlngs[0], latlngs[latlngs.length - 1]);

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
      const normalizedIndex = this.normalizeMarkerIndex(i, latlngs.length, hasClosingPoint);
      const isImportant =
        optimizationLevel <= 0 ||
        normalizedIndex === null ||
        importantIndices.has(normalizedIndex) ||
        isSpecialMarker;
      const classesForIcon = [...processedClasses];
      if (!isImportant) {
        classesForIcon.push('polygon-marker-faded');
      }
      const marker = new L.Marker(latlng, {
        icon: this.createDivIcon(classesForIcon),
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
        // Save history state before dragging
        if (this.saveHistoryState) {
          this.saveHistoryState('markerDrag');
        }
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
        const touchstartHandler = (e: Event) => {
          e.stopPropagation();
        };
        const touchendHandler = (e: Event) => {
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
        };

        el.addEventListener('touchstart', touchstartHandler, { passive: true });
        el.addEventListener('touchend', touchendHandler);

        // Store handlers for cleanup
        this.markerTouchListeners.set(marker, {
          touchstart: touchstartHandler,
          touchend: touchendHandler,
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
          const centerOfMass = PolygonUtil.getCenterOfPolygonByIndexWithOffsetFromCenterOfMass(
            polygonGeoJSON,
            menuMarkerIdx,
          );
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
            const popupBounds = popupContent.getBoundingClientRect();

            // Re-measure bounds after repositioning and check if popup is out of bounds
            const mapBounds = mapContainer.getBoundingClientRect();
            let adjustX = 0;
            let adjustY = 0;

            if (popupBounds.left < mapBounds.left) {
              adjustX = mapBounds.left - popupBounds.left;
            } else if (popupBounds.right > mapBounds.right) {
              adjustX = mapBounds.right - popupBounds.right;
            }

            if (popupBounds.top < mapBounds.top) {
              adjustY = mapBounds.top - popupBounds.top;
            } else if (popupBounds.bottom > mapBounds.bottom) {
              adjustY = mapBounds.bottom - popupBounds.bottom;
            }

            if (adjustX !== 0 || adjustY !== 0) {
              popupContent.style.transform = `translate(${adjustX}px, ${adjustY}px)`;
            }
          }, 0);

          const container = this.map.getContainer();
          if (container) {
            container.style.touchAction = 'manipulation';
          }
        });
        marker.on('popupclose', () => {
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
          const centerOfMass = PolygonUtil.getCenterOfPolygonByIndexWithOffsetFromCenterOfMass(
            polygonGeoJSON,
            infoMarkerIdx,
          );
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
        if (this.modeManager.isInOffMode()) {
          if (this.isEdgeDeletionModifierKeyPressed(e.originalEvent)) {
            const polygonLayer = featureGroup
              .getLayers()
              .find((layer) => layer instanceof L.Polygon) as L.Polygon | undefined;
            if (polygonLayer) {
              this.elbowClicked(e, polygonLayer, marker.getLatLng());
            }
          } else {
            // Handle non-modifier clicks for special markers
            if (i === deleteMarkerIdx && this.config.markers.deleteMarker) {
              if (this.shouldSuppressDeleteMarkerClick()) {
                const original = e.originalEvent as Event | undefined;
                original?.preventDefault?.();
                original?.stopPropagation?.();
                return;
              }
              this.map.closePopup();
              // Save state before deleting polygon
              if (this.saveHistoryState) {
                this.saveHistoryState('deletePolygon');
              }
              this.cleanupFeatureGroup(featureGroup);
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
   * Add hole markers to a polygon feature group, with configurable special markers.
   */
  addHoleMarkers(latlngs: L.LatLngLiteral[], featureGroup: L.FeatureGroup): void {
    // Determine if special markers for holes are enabled
    const holeMenuEnabled = this.config.markers.holeMarkers?.menuMarker ?? false;
    const holeDeleteEnabled = this.config.markers.holeMarkers?.deleteMarker ?? false;
    const holeInfoEnabled = this.config.markers.holeMarkers?.infoMarker ?? false;

    // Get initial marker positions
    let menuMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerMenuIcon.position);
    let deleteMarkerIdx = this.getMarkerIndex(
      latlngs,
      this.config.markers.markerDeleteIcon.position,
    );
    let infoMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerInfoIcon.position);

    // Apply fallback separation logic to ensure markers don't overlap
    const separatedIndices = this.ensureMarkerSeparation(latlngs.length, {
      menu: { index: menuMarkerIdx, enabled: holeMenuEnabled },
      delete: { index: deleteMarkerIdx, enabled: holeDeleteEnabled },
      info: { index: infoMarkerIdx, enabled: holeInfoEnabled },
    });

    // Update indices with separated values
    menuMarkerIdx = separatedIndices.menu;
    deleteMarkerIdx = separatedIndices.delete;
    infoMarkerIdx = separatedIndices.info;

    latlngs.forEach((latlng, i) => {
      let iconClasses = this.config.markers.holeIcon.styleClasses;
      if (i === menuMarkerIdx && holeMenuEnabled) {
        iconClasses = this.config.markers.markerMenuIcon.styleClasses;
      }
      if (i === deleteMarkerIdx && holeDeleteEnabled) {
        iconClasses = this.config.markers.markerDeleteIcon.styleClasses;
      }
      if (i === infoMarkerIdx && holeInfoEnabled) {
        iconClasses = this.config.markers.markerInfoIcon.styleClasses;
      }

      const processedClasses = Array.isArray(iconClasses) ? iconClasses : [iconClasses];
      const isSpecialMarker =
        (i === menuMarkerIdx && holeMenuEnabled) ||
        (i === deleteMarkerIdx && holeDeleteEnabled) ||
        (i === infoMarkerIdx && holeInfoEnabled);

      const marker = new L.Marker(latlng, {
        icon: this.createDivIcon(processedClasses),
        draggable: this.config.modes.dragElbow,
        title: this.config.markers.coordsTitle ? this.getLatLngInfoString(latlng) : '',
        zIndexOffset: this.config.markers.holeIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
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

      marker.on('dragstart', () => {
        if (this.saveHistoryState) {
          this.saveHistoryState('markerDrag');
        }
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

      const el = marker.getElement();
      if (el) {
        const touchstartHandler = (e: Event) => {
          e.stopPropagation();
        };
        const touchendHandler = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          marker.fire('click');
          if (this.isDraggingMarker && !isSpecialMarker) {
            const fg = this.markerFeatureGroupMap.get(marker);
            if (this.modeManager.canPerformAction('markerDrag') && fg) {
              this.markerDragEnd(fg);
            }
          }
          this._activeMarker = null;
        };

        el.addEventListener('touchstart', touchstartHandler, { passive: true });
        el.addEventListener('touchend', touchendHandler);

        // Store handlers for cleanup
        this.markerTouchListeners.set(marker, {
          touchstart: touchstartHandler,
          touchend: touchendHandler,
        });
      }

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
      }

      // --- Special Marker Logic for Holes ---

      if (i === menuMarkerIdx && holeMenuEnabled) {
        marker.options.zIndexOffset =
          this.config.markers.markerMenuIcon.zIndexOffset ?? this.config.markers.zIndexOffset;

        marker.on('click', () => {
          // Build a minimal GeoJSON for this hole ring to compute center-of-mass
          const ring = latlngs.map((pt) => [pt.lng, pt.lat]);
          ring.push(ring[0]); // close ring

          const holePolygon: Feature<Polygon> = {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [ring],
            },
          };

          const centerOfMass = PolygonUtil.getCenterOfMass(holePolygon);
          const menuPopup = this.generateMenuMarkerPopup(latlngs, featureGroup);

          menuPopup.setLatLng(centerOfMass).openOn(this.map);
        });

        // Keep popup positioning/touch behaviour consistent with outer ring menu
        marker.on('popupopen', (e) => {
          const popup = e.popup;
          const popupContent = popup.getElement();
          if (!popupContent) return;
          setTimeout(() => {
            const mapContainer = this.map.getContainer();
            const mapBounds = mapContainer.getBoundingClientRect();
            const popupBounds = popupContent.getBoundingClientRect();
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
          const container = this.map.getContainer();
          if (container) {
            container.style.touchAction = '';
          }
        });
      }

      if (i === infoMarkerIdx && holeInfoEnabled) {
        const ring = latlngs.map((latlng) => [latlng.lng, latlng.lat]);
        ring.push(ring[0]); // Close the ring

        const holePolygon: Feature<Polygon> = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [ring],
          },
        };
        const area = this.turfHelper.getPolygonArea(holePolygon);
        const perimeter = this.turfHelper.getPolygonPerimeter(holePolygon) * 1000; // to meters

        marker.options.zIndexOffset =
          this.config.markers.markerInfoIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
        marker.on('click', () => {
          const infoPopup = this.generateInfoMarkerPopup(area, perimeter);
          infoPopup.setLatLng(latlng).openOn(this.map);
        });
      }

      marker.on('mousedown', (e) => {
        if (!this.modeManager.isInOffMode()) {
          L.DomEvent.stopPropagation(e);
          this.map.fire('mousedown', e);
        }
        this._activeMarker = marker;
      });

      marker.on('click', (e) => {
        if (this.modeManager.isInOffMode()) {
          if (this.isEdgeDeletionModifierKeyPressed(e.originalEvent)) {
            const polygonLayer = featureGroup
              .getLayers()
              .find((layer) => layer instanceof L.Polygon) as L.Polygon | undefined;
            if (polygonLayer) {
              this.elbowClicked(e, polygonLayer, marker.getLatLng());
            }
          } else {
            if (i === deleteMarkerIdx && holeDeleteEnabled) {
              this.map.closePopup();
              // Delete the entire hole by matching against Leaflet lat/lngs
              const parentPolygon = featureGroup
                .getLayers()
                .find((layer) => layer instanceof L.Polygon) as L.Polygon;
              if (parentPolygon) {
                // Normalize Leaflet polygon latlngs to an array of rings: L.LatLng[][]
                const rawLatLngs = parentPolygon.getLatLngs();
                let rings: L.LatLng[][] = [];
                if (Array.isArray(rawLatLngs) && rawLatLngs.length > 0) {
                  if (Array.isArray(rawLatLngs[0])) {
                    const first = (rawLatLngs as unknown[])[0];
                    if (Array.isArray(first) && Array.isArray((first as unknown[])[0])) {
                      // MultiPolygon-like structure: [ [ [LatLng] ] ] – flatten first level
                      rings = (
                        rawLatLngs as unknown as L.LatLng[][][]
                      )[0] as unknown as L.LatLng[][];
                    } else {
                      // Polygon with holes: [ [LatLng] , [LatLng] ... ]
                      rings = rawLatLngs as L.LatLng[][];
                    }
                  } else {
                    // Single ring provided as LatLng[]
                    rings = [rawLatLngs as unknown as L.LatLng[]];
                  }
                }

                // Identify which ring is the hole containing this delete marker
                const target = marker.getLatLng();
                let holeIndex = -1;
                for (let r = 1; r < rings.length; r++) {
                  // start at 1 to skip outer ring
                  if (rings[r].some((p) => p.lat === target.lat && p.lng === target.lng)) {
                    holeIndex = r;
                    break;
                  }
                }

                if (holeIndex > 0) {
                  // Build new rings without the hole
                  const newRings: L.LatLng[][] = rings.filter((_, idx) => idx !== holeIndex);

                  // Convert to GeoJSON coordinates and ensure closure of each ring
                  const coords = newRings.map((ring) => {
                    const arr = ring.map((ll) => [ll.lng, ll.lat]);
                    if (arr.length > 0) {
                      const firstPt = arr[0];
                      const lastPt = arr[arr.length - 1];
                      if (firstPt[0] !== lastPt[0] || firstPt[1] !== lastPt[1]) {
                        arr.push([firstPt[0], firstPt[1]]);
                      }
                    }
                    return arr;
                  });

                  const { level: optimizationLevel, original: originalOptimizationLevel } =
                    this.getOptimizationMetadataFromFeatureGroup(featureGroup);
                  const newPolygon = this.turfHelper.getMultiPolygon([coords]);
                  this.cleanupFeatureGroup(featureGroup);
                  this.removeFeatureGroup(featureGroup);
                  this.emitPolygonUpdated({
                    operation: 'removeHole',
                    polygon: newPolygon,
                    optimizationLevel,
                    originalOptimizationLevel,
                  });
                }
              }
            }
          }
        }
      });

      marker.on('mouseover', () => this.onMarkerHoverForEdgeDeletion(marker, true));
      marker.on('mouseout', () => this.onMarkerHoverForEdgeDeletion(marker, false));
    });
  }

  /**
   * Add edge click listeners to a polygon
   */
  addEdgeClickListeners(polygon: L.Polygon, featureGroup: L.FeatureGroup): void {
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

        const edgePolyline = leafletAdapter.createPolyline(
          [edgeStart as L.LatLng, edgeEnd as L.LatLng],
          {
            color: 'transparent',
            weight: 10,
            opacity: 0,
            interactive: true,
          },
        );

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
   * Check whether polygon dragging is allowed for the current mode.
   */
  private isPolygonDragModeActive(): boolean {
    const mode = this.modeManager.getCurrentMode();
    return mode === DrawMode.Off || mode === DrawMode.Clone;
  }

  private isPolygonDragActive(): boolean {
    return !!(
      this.currentDragPolygon &&
      this.currentDragPolygon._polydrawDragData &&
      this.currentDragPolygon._polydrawDragData.isDragging
    );
  }

  /**
   * Enable polygon dragging functionality
   */
  enablePolygonDragging(polygon: PolydrawPolygon, latlngs: Feature<Polygon | MultiPolygon>): void {
    if (!this.config.modes.dragPolygons && !this.config.tools.clone) return;

    polygon._polydrawOriginalLatLngs = latlngs;
    polygon._polydrawDragData = {
      isDragging: false,
      startPosition: null,
      startLatLngs: null,
      originalOpacity: polygon.options.fillOpacity,
    };

    polygon.on('mousedown', (e: L.LeafletMouseEvent) => {
      if (!this.isPolygonDragModeActive()) {
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

      const isCloneMode = this.modeManager.getCurrentMode() === DrawMode.Clone;
      const isModifierPressed = isCloneMode
        ? false
        : this.detectDragSubtractModifierKey(e.originalEvent);
      this.currentDragIsClone = isCloneMode;
      this.currentModifierDragMode = isModifierPressed;
      this.isModifierKeyHeld = isModifierPressed;

      // Save state before polygon drag
      if (this.saveHistoryState) {
        this.saveHistoryState(isCloneMode ? 'polygonClone' : 'polygonDrag');
      }

      polygon._polydrawDragData!.isDragging = true;
      polygon._polydrawDragData!.startPosition = e.latlng;
      polygon._polydrawDragData!.startLatLngs = polygon.getLatLngs();
      polygon.setStyle({ fillOpacity: this.config.dragPolygons.opacity });
      if (isCloneMode) {
        this.showCloneGhost(
          polygon._polydrawDragData!.startLatLngs as L.LatLng[] | L.LatLng[][] | L.LatLng[][][],
        );
      } else {
        this.clearCloneGhost();
      }

      if (this.map.dragging) {
        this.map.dragging.disable();
      }

      this.setSubtractVisualMode(polygon, isModifierPressed);
      this.setMarkerVisibility(polygon, false);

      try {
        const container = this.map.getContainer();
        container.style.cursor = this.config.dragPolygons.dragCursor || 'move';
      } catch {
        // Handle DOM errors
      }

      this.map.on('mousemove', this.onPolygonMouseMove, this);
      this.map.on('mouseup', this.onPolygonMouseUp, this);
      // Also register pointer events (Leaflet v2)
      (this.map as L.Evented).on(
        'pointermove',
        this.onPolygonMouseMove as L.LeafletEventHandlerFn,
        this,
      );
      (this.map as L.Evented).on(
        'pointerup',
        this.onPolygonMouseUp as L.LeafletEventHandlerFn,
        this,
      );
      this.attachDragCancelHandlers();

      this.currentDragPolygon = polygon;
    });

    // Support pointer events (Leaflet v2) in addition to mousedown
    (polygon as L.Evented).on('pointerdown', ((event: L.LeafletEvent) => {
      const e = event as L.LeafletMouseEvent;
      if (this.transformModeActive) {
        return;
      }
      // If not in off mode, it's a drawing click. Forward to map and stop.
      if (!this.isPolygonDragModeActive()) {
        const originalEvent = (e.originalEvent ?? e) as Event;
        L.DomEvent.stopPropagation(originalEvent);
        (this.map as L.Evented).fire('pointerdown', e);
        return;
      }

      if (!this.modeManager.canPerformAction('polygonDrag')) {
        return;
      }
      // Normalize originalEvent presence
      const orig = (e.originalEvent ?? e) as Event;
      L.DomEvent.stopPropagation(orig);
      L.DomEvent.preventDefault(orig);

      const isCloneMode = this.modeManager.getCurrentMode() === DrawMode.Clone;
      const isModifierPressed = isCloneMode
        ? false
        : this.detectDragSubtractModifierKey(orig as MouseEvent | PointerEvent);
      this.currentDragIsClone = isCloneMode;
      this.currentModifierDragMode = isModifierPressed;
      this.isModifierKeyHeld = isModifierPressed;

      // Save state before polygon drag
      if (this.saveHistoryState) {
        this.saveHistoryState(isCloneMode ? 'polygonClone' : 'polygonDrag');
      }

      polygon._polydrawDragData!.isDragging = true;
      polygon._polydrawDragData!.startPosition = e.latlng;
      polygon._polydrawDragData!.startLatLngs = polygon.getLatLngs();
      polygon.setStyle({ fillOpacity: this.config.dragPolygons.opacity });
      if (isCloneMode) {
        this.showCloneGhost(
          polygon._polydrawDragData!.startLatLngs as L.LatLng[] | L.LatLng[][] | L.LatLng[][][],
        );
      } else {
        this.clearCloneGhost();
      }

      if (this.map.dragging) {
        this.map.dragging.disable();
      }

      this.setSubtractVisualMode(polygon, isModifierPressed);
      this.setMarkerVisibility(polygon, false);

      try {
        const container = this.map.getContainer();
        container.style.cursor = this.config.dragPolygons.dragCursor || 'move';
      } catch {
        // Handle DOM errors
      }

      this.map.on('mousemove', this.onPolygonMouseMove, this);
      this.map.on('mouseup', this.onPolygonMouseUp, this);
      (this.map as L.Evented).on(
        'pointermove',
        this.onPolygonMouseMove as L.LeafletEventHandlerFn,
        this,
      );
      (this.map as L.Evented).on(
        'pointerup',
        this.onPolygonMouseUp as L.LeafletEventHandlerFn,
        this,
      );
      this.attachDragCancelHandlers();

      this.currentDragPolygon = polygon;
    }) as L.LeafletEventHandlerFn);

    // Touch support for Leaflet v1 (v1 does not synthesize mouse/pointer events from touch on SVG)
    if (LeafletVersionDetector.isV1()) {
      const onTouchStart = (e: TouchEvent) => {
        if (this.transformModeActive) return;

        if (!this.isPolygonDragModeActive()) {
          return;
        }

        if (!this.modeManager.canPerformAction('polygonDrag')) {
          return;
        }

        e.stopPropagation();
        e.preventDefault();

        const latlng = EventAdapter.extractCoordinates(
          e as unknown as Record<string, unknown>,
          this.map,
        );
        if (!latlng) return;

        const isCloneMode = this.modeManager.getCurrentMode() === DrawMode.Clone;
        this.currentDragIsClone = isCloneMode;
        this.currentModifierDragMode = false;
        this.isModifierKeyHeld = false;

        if (this.saveHistoryState) {
          this.saveHistoryState(isCloneMode ? 'polygonClone' : 'polygonDrag');
        }

        polygon._polydrawDragData!.isDragging = true;
        polygon._polydrawDragData!.startPosition = latlng;
        polygon._polydrawDragData!.startLatLngs = polygon.getLatLngs();
        polygon.setStyle({ fillOpacity: this.config.dragPolygons.opacity });
        if (isCloneMode) {
          this.showCloneGhost(
            polygon._polydrawDragData!.startLatLngs as L.LatLng[] | L.LatLng[][] | L.LatLng[][][],
          );
        } else {
          this.clearCloneGhost();
        }

        if (this.map.dragging) {
          this.map.dragging.disable();
        }

        this.setSubtractVisualMode(polygon, false);
        this.setMarkerVisibility(polygon, false);

        try {
          const container = this.map.getContainer();
          container.style.cursor = this.config.dragPolygons.dragCursor || 'move';
        } catch {
          // Handle DOM errors
        }

        this.map.on('mousemove', this.onPolygonMouseMove, this);
        this.map.on('mouseup', this.onPolygonMouseUp, this);

        // Attach native touch listeners on the map container for move/end
        this.attachDragTouchListeners();
        this.attachDragCancelHandlers();

        this.currentDragPolygon = polygon;
      };

      this.polygonTouchStartListeners.set(polygon, onTouchStart);

      // Defer attachment until the SVG element exists on the map
      const attachTouch = () => {
        const el = (polygon as unknown as { _path?: SVGElement })._path;
        if (el) {
          el.addEventListener('touchstart', onTouchStart as unknown as (e: Event) => void, {
            passive: false,
          });
        }
      };

      // If already on the map, attach now; otherwise wait for 'add' event
      if ((polygon as unknown as { _path?: SVGElement })._path) {
        attachTouch();
      } else {
        polygon.once('add', attachTouch);
      }
    }

    polygon.on('mouseover', () => {
      if (!polygon._polydrawDragData || !polygon._polydrawDragData.isDragging) {
        try {
          const container = this.map.getContainer();
          container.style.cursor = this.config.dragPolygons.hoverCursor || 'grab';
        } catch {
          // Handle DOM errors
        }
      }
    });

    polygon.on('mouseout', () => {
      if (!polygon._polydrawDragData || !polygon._polydrawDragData.isDragging) {
        try {
          const container = this.map.getContainer();
          container.style.cursor = '';
        } catch {
          // Handle DOM errors
        }
      }
    });
  }

  /**
   * Update marker draggable state based on current mode
   */
  updateMarkerDraggableState(): void {
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
          } catch {
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
    const element = marker.getElement();
    if (!element) return;

    if (showFeedback) {
      // Add hover listeners for edge deletion feedback
      element.addEventListener('mouseenter', this.onMarkerHoverForEdgeDeletionEvent);
      element.addEventListener('mouseleave', this.onMarkerLeaveForEdgeDeletionEvent);

      // Store handlers for cleanup
      this.markerEdgeDeletionListeners.set(marker, {
        mouseenter: this.onMarkerHoverForEdgeDeletionEvent,
        mouseleave: this.onMarkerLeaveForEdgeDeletionEvent,
      });
    } else {
      // Remove hover listeners and reset style
      element.removeEventListener('mouseenter', this.onMarkerHoverForEdgeDeletionEvent);
      element.removeEventListener('mouseleave', this.onMarkerLeaveForEdgeDeletionEvent);
      element.style.backgroundColor = '';
      element.style.borderColor = '';

      // Clean up stored handlers
      this.markerEdgeDeletionListeners.delete(marker);
    }
  }

  /**
   * Set modifier key held state
   */
  setModifierKeyHeld(isHeld: boolean): void {
    this.isModifierKeyHeld = isHeld;
  }

  /**
   * Clean up all resources associated with a marker
   * This method ensures proper cleanup of event listeners and WeakMap entries
   */
  cleanupMarker(marker: L.Marker): void {
    const element = marker.getElement();

    // Always clean up document-level listeners first (DOM-optional)
    const modifierHandler = this.markerModifierHandlers.get(marker);
    if (modifierHandler) {
      document.removeEventListener('keydown', modifierHandler);
      document.removeEventListener('keyup', modifierHandler);
      if (element) {
        element.removeEventListener('mousemove', modifierHandler);
      }
      this.markerModifierHandlers.delete(marker);
    }

    // Clean up touch event listeners (remove from element if present, always delete mapping)
    const touchListeners = this.markerTouchListeners.get(marker);
    if (touchListeners) {
      if (element) {
        element.removeEventListener('touchstart', touchListeners.touchstart);
        element.removeEventListener('touchend', touchListeners.touchend);
      }
      this.markerTouchListeners.delete(marker);
    }

    // Clean up edge deletion event listeners (remove from element if present, always delete mapping)
    const edgeDeletionListeners = this.markerEdgeDeletionListeners.get(marker);
    if (edgeDeletionListeners) {
      if (element) {
        element.removeEventListener('mouseenter', edgeDeletionListeners.mouseenter);
        element.removeEventListener('mouseleave', edgeDeletionListeners.mouseleave);
      }
      this.markerEdgeDeletionListeners.delete(marker);
    }

    // Clean up feature group mapping last
    this.markerFeatureGroupMap.delete(marker);
  }

  /**
   * Clean up all resources associated with a feature group
   * This method ensures proper cleanup of all markers and associated resources
   */
  cleanupFeatureGroup(featureGroup: L.FeatureGroup): void {
    // Clean up all markers and polygon touch listeners in the feature group
    featureGroup.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        this.cleanupMarker(layer as L.Marker);
      } else if (layer instanceof L.Polygon) {
        this.detachPolygonTouchStart(layer);
      }
    });

    this.destroyTransformController(featureGroup);
  }

  // Private methods

  private destroyTransformController(featureGroup: L.FeatureGroup): void {
    const transformController = this.transformControllers.get(featureGroup);
    if (!transformController) {
      return;
    }
    transformController.destroy();
    this.transformControllers.delete(featureGroup);
    this.transformModeActive = false;
  }

  private onEdgeClick(e: L.LeafletMouseEvent, edgePolyline: L.Polyline): void {
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
          const newPolygon = this.turfHelper.injectPointToPolygon(
            poly,
            [newPoint.lng, newPoint.lat],
            edgeInfo.ringIndex,
          );
          if (newPolygon) {
            const polydrawPolygon = parentPolygon as PolydrawPolygon;
            const optimizationLevel = polydrawPolygon._polydrawOptimizationLevel || 0;
            const originalOptimizationLevel =
              polydrawPolygon._polydrawOptimizationOriginalLevel || optimizationLevel;
            this.cleanupFeatureGroup(parentFeatureGroup);
            this.removeFeatureGroup(parentFeatureGroup);
            this.emitPolygonUpdated({
              operation: 'addVertex',
              polygon: newPolygon,
              optimizationLevel,
              originalOptimizationLevel,
            });
          }
        }
      } catch {
        // Handle errors
      }
    }
    L.DomEvent.stopPropagation(e);
  }

  private highlightEdgeOnHover(edgePolyline: L.Polyline, isHovering: boolean): void {
    if (isHovering) {
      edgePolyline.setStyle({
        color: this.config.colors.edgeHover,
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

  private deriveImportantMarkerIndices(
    latlngs: L.LatLngLiteral[],
    options: MarkerImportanceOptions,
  ): Set<number> {
    const important = new Set<number>();
    if (!latlngs || latlngs.length === 0) {
      return important;
    }

    const normalizedLevel = Math.min(Math.max(options.optimizationLevel ?? 0, 0), 10);
    const hasClosingPoint =
      latlngs.length > 2 && this.latLngEquals(latlngs[0], latlngs[latlngs.length - 1]);
    const ring = hasClosingPoint ? latlngs.slice(0, -1) : [...latlngs];
    const vertexCount = ring.length;

    const addIndex = (idx?: number) => {
      if (idx === undefined || idx === null || idx < 0) {
        return;
      }
      let normalized = idx;
      if (hasClosingPoint && idx === latlngs.length - 1) {
        normalized = 0;
      }
      if (normalized >= vertexCount) {
        normalized = vertexCount > 0 ? normalized % vertexCount : 0;
      }
      if (normalized >= 0 && normalized < vertexCount) {
        important.add(normalized);
      }
    };

    addIndex(0);
    addIndex(options.menuIndex);
    addIndex(options.deleteIndex);
    addIndex(options.infoIndex);

    if (vertexCount === 0 || normalizedLevel <= 0 || vertexCount <= 3) {
      for (let i = 0; i < vertexCount; i++) {
        important.add(i);
      }
      return important;
    }

    const tolerance = this.getToleranceForOptimizationLevel(normalizedLevel);
    let simplifiedVertices =
      tolerance > 0 ? this.turfHelper.simplifyLatLngRing(ring, tolerance, true) : [...ring];

    if (
      simplifiedVertices.length > 1 &&
      this.latLngEquals(simplifiedVertices[0], simplifiedVertices[simplifiedVertices.length - 1])
    ) {
      simplifiedVertices = simplifiedVertices.slice(0, -1);
    }

    if (!simplifiedVertices || simplifiedVertices.length === 0) {
      for (let i = 0; i < vertexCount; i++) {
        important.add(i);
      }
      return important;
    }

    simplifiedVertices.forEach((vertex) => {
      const closestIndex = this.findClosestVertexIndex(vertex, ring);
      if (closestIndex !== null) {
        important.add(closestIndex);
      }
    });

    if (important.size === 0) {
      for (let i = 0; i < vertexCount; i++) {
        important.add(i);
      }
    }

    return important;
  }

  private normalizeMarkerIndex(
    index: number,
    length: number,
    hasClosingPoint: boolean,
  ): number | null {
    if (index === undefined || index === null || index < 0) {
      return null;
    }
    if (hasClosingPoint) {
      const uniqueLength = Math.max(1, length - 1);
      if (index === length - 1) {
        return 0;
      }
      if (index >= uniqueLength) {
        return index % uniqueLength;
      }
      return index;
    }
    if (index >= length) {
      return length > 0 ? length - 1 : null;
    }
    return index;
  }

  private latLngEquals(a: L.LatLngLiteral, b: L.LatLngLiteral): boolean {
    if (!a || !b) return false;
    return Math.abs(a.lat - b.lat) < 1e-9 && Math.abs(a.lng - b.lng) < 1e-9;
  }

  private isLatLngLiteral(value: unknown): value is L.LatLngLiteral {
    return (
      !!value &&
      typeof value === 'object' &&
      'lat' in value &&
      'lng' in value &&
      typeof (value as L.LatLngLiteral).lat === 'number' &&
      typeof (value as L.LatLngLiteral).lng === 'number'
    );
  }

  private getOrderedMarkers(featureGroup: L.FeatureGroup): L.Marker[] {
    const markers: L.Marker[] = [];
    featureGroup.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        markers.push(layer);
      }
    });
    return markers.sort(
      (a, b) =>
        leafletAdapter.util.stamp(a as unknown as L.Layer) -
        leafletAdapter.util.stamp(b as unknown as L.Layer),
    );
  }

  private countLatLngNodes(latlngs: unknown): number {
    if (!Array.isArray(latlngs)) return 0;
    if (latlngs.length === 0) return 0;

    if (this.isLatLngLiteral(latlngs[0])) {
      return latlngs.length;
    }

    return latlngs.reduce((sum, item) => sum + this.countLatLngNodes(item), 0);
  }

  private rebuildLatLngStructure<T>(
    original: T,
    markerPositions: L.LatLng[],
    markerIndex: { value: number },
  ): T {
    if (!Array.isArray(original)) {
      return original;
    }

    if (original.length > 0 && this.isLatLngLiteral(original[0])) {
      const ring = original as unknown as L.LatLngLiteral[];
      const hasClosingPoint = ring.length > 1 && this.latLngEquals(ring[0], ring[ring.length - 1]);
      const updated = ring.map((_pt, idx) => {
        const pos = markerPositions[markerIndex.value] ?? ring[idx];
        markerIndex.value += 1;
        return leafletAdapter.createLatLng(pos.lat, pos.lng);
      });

      if (hasClosingPoint && updated.length > 1) {
        updated[updated.length - 1] = updated[0];
      }

      return updated as unknown as T;
    }

    return (original as unknown as unknown[]).map((child) =>
      this.rebuildLatLngStructure(child, markerPositions, markerIndex),
    ) as unknown as T;
  }

  private getOptimizationMetadataFromFeatureGroup(featureGroup: L.FeatureGroup): {
    level: number;
    original: number;
  } {
    let level = 0;
    let original = 0;
    featureGroup.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        const poly = layer as PolydrawPolygon;
        if (typeof poly._polydrawOptimizationLevel === 'number') {
          level = poly._polydrawOptimizationLevel || 0;
        }
        if (typeof poly._polydrawOptimizationOriginalLevel === 'number') {
          original = poly._polydrawOptimizationOriginalLevel || 0;
        }
      }
    });
    if (!original && level > 0) {
      original = level;
    }
    return { level, original };
  }

  private getOptimizationMetadataFromPolygonLayer(polygon?: L.Polygon): {
    level: number;
    original: number;
  } {
    if (!polygon) {
      return { level: 0, original: 0 };
    }
    const polydrawPolygon = polygon as PolydrawPolygon;
    const level = polydrawPolygon._polydrawOptimizationLevel || 0;
    const original = polydrawPolygon._polydrawOptimizationOriginalLevel || (level > 0 ? level : 0);
    return { level, original };
  }

  private getDistanceMeters(a: L.LatLngLiteral, b: L.LatLngLiteral): number {
    try {
      const pointA = leafletAdapter.createLatLng(a.lat, a.lng);
      const pointB = leafletAdapter.createLatLng(b.lat, b.lng);
      if (typeof pointA.distanceTo === 'function') {
        return pointA.distanceTo(pointB);
      }
    } catch {
      // Fallback to haversine below
    }

    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  }

  private findClosestVertexIndex(
    target: L.LatLngLiteral,
    vertices: L.LatLngLiteral[],
  ): number | null {
    if (!vertices || vertices.length === 0) {
      return null;
    }
    let closestIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < vertices.length; i++) {
      const dist = this.getDistanceMeters(target, vertices[i]);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
        if (dist === 0) {
          break;
        }
      }
    }
    return closestIndex;
  }

  private getToleranceForOptimizationLevel(level: number): number {
    const normalized = Math.min(Math.max(level, 0), 10) / 10;
    const visConfig = this.config.markers.visualOptimization ?? {};
    const minTolerance = Math.max(visConfig.toleranceMin ?? 0.000005, 0);
    const maxTolerance = Math.max(visConfig.toleranceMax ?? 0.005, minTolerance);
    const curvePower = visConfig.curve ?? 1.35;
    const curved = Math.pow(normalized, curvePower);
    return minTolerance + (maxTolerance - minTolerance) * curved;
  }

  private elbowClicked(
    e: L.LeafletMouseEvent,
    polygonLayer: L.Polygon,
    forcedLatLng: L.LatLng,
  ): void {
    // Enforce settings
    if (!this.config.modes.edgeDeletion) return;
    if (!this.isEdgeDeletionModifierKeyPressed(e.originalEvent)) return;

    const clickedLatLng = forcedLatLng ?? e.latlng;

    // Normalize Leaflet polygon latlngs to an array of rings: L.LatLng[][]
    const rawLatLngs = polygonLayer.getLatLngs();
    let rings: L.LatLng[][] = [];
    if (Array.isArray(rawLatLngs) && rawLatLngs.length > 0) {
      if (Array.isArray(rawLatLngs[0])) {
        const first = (rawLatLngs as unknown[])[0];
        if (Array.isArray(first) && Array.isArray((first as unknown[])[0])) {
          // MultiPolygon-like structure: [ [ [LatLng] ] ] – flatten first level
          rings = (rawLatLngs as unknown as L.LatLng[][][])[0] as unknown as L.LatLng[][];
        } else {
          // Polygon with holes: [ [LatLng] , [LatLng] ... ]
          rings = rawLatLngs as L.LatLng[][];
        }
      } else {
        // Single ring provided as LatLng[]
        rings = [rawLatLngs as unknown as L.LatLng[]];
      }
    } else {
      return;
    }

    // Find exact matching vertex by equality on lat/lng
    let targetRingIndex = -1;
    let targetVertexIndex = -1;
    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r];
      for (let v = 0; v < ring.length; v++) {
        const p = ring[v];
        if (p.lat === clickedLatLng.lat && p.lng === clickedLatLng.lng) {
          targetRingIndex = r;
          targetVertexIndex = v;
          break;
        }
      }
      if (targetRingIndex !== -1) break;
    }

    if (targetRingIndex === -1 || targetVertexIndex === -1) {
      return;
    }

    const targetRing = rings[targetRingIndex];
    // Require at least 4 points (3 corners + close) – in Leaflet rings are usually open, so use 4 as minimum vertices
    if (targetRing.length <= this.config.edgeDeletion.minVertices) {
      return;
    }

    // Build new rings with the vertex removed
    const newRings: L.LatLng[][] = rings.map((ring, idx) => {
      if (idx !== targetRingIndex) return ring.slice();
      const nr = ring.slice();
      nr.splice(targetVertexIndex, 1);
      return nr;
    });

    // Convert to GeoJSON coordinates and ensure closure of each ring
    const coords = newRings.map((ring) => {
      const arr = ring.map((ll) => [ll.lng, ll.lat]);
      if (arr.length > 0) {
        const first = arr[0];
        const last = arr[arr.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          arr.push([first[0], first[1]]);
        }
      }
      return arr;
    });

    // Remove the current feature group for this polygon
    let currentFeatureGroup: L.FeatureGroup | null = null;
    for (const fg of this.getFeatureGroups()) {
      let found = false;
      fg.eachLayer((layer) => {
        if (layer === polygonLayer) found = true;
      });
      if (found) {
        currentFeatureGroup = fg;
        break;
      }
    }
    const metadata = currentFeatureGroup
      ? this.getOptimizationMetadataFromFeatureGroup(currentFeatureGroup)
      : this.getOptimizationMetadataFromPolygonLayer(polygonLayer);
    const { level: optimizationLevel, original: originalOptimizationLevel } = metadata;

    if (currentFeatureGroup) {
      this.removeFeatureGroup(currentFeatureGroup);
    }

    const newPolygon = this.turfHelper.getMultiPolygon([coords]);
    this.emitPolygonUpdated({
      operation: 'removeVertex',
      polygon: newPolygon,
      optimizationLevel,
      originalOptimizationLevel,
    });
  }

  private markerDrag(featureGroup: L.FeatureGroup): void {
    if (!this._activeMarker) {
      if (!isTestEnvironment()) {
        console.warn('No active marker set for dragging.');
      }
      return;
    }
    const polygonLayer = featureGroup.getLayers().find((l) => l instanceof L.Polygon) as
      | L.Polygon
      | undefined;

    if (!polygonLayer) {
      if (!isTestEnvironment()) {
        console.warn('No polygon found in feature group for marker drag.');
      }
      return;
    }

    const markers = this.getOrderedMarkers(featureGroup);
    if (markers.length === 0) {
      return;
    }

    const markerPositions = markers.map((m) => m.getLatLng());
    const expectedVertices = this.countLatLngNodes(polygonLayer.getLatLngs());
    if (markerPositions.length < expectedVertices) {
      if (!isTestEnvironment()) {
        console.warn(
          'Not enough markers to rebuild polygon during drag. Expected:',
          expectedVertices,
          'got:',
          markerPositions.length,
        );
      }
      return;
    }

    const markerIndex = { value: 0 };
    const updatedLatLngs = this.rebuildLatLngStructure(
      polygonLayer.getLatLngs(),
      markerPositions,
      markerIndex,
    );

    polygonLayer.setLatLngs(updatedLatLngs as unknown as L.LatLng[][] | L.LatLng[][][]);
  }

  private async markerDragEnd(featureGroup: L.FeatureGroup): Promise<void> {
    this.polygonInformation.deletePolygonInformationStorage();
    const featureCollection = featureGroup.toGeoJSON() as FeatureCollection<Polygon | MultiPolygon>;

    if (!featureCollection.features || featureCollection.features.length === 0) {
      return;
    }

    // const optimizationLevel = this.getOptimizationLevelFromFeatureGroup(featureGroup);

    const { level: optimizationLevel, original: originalOptimizationLevel } =
      this.getOptimizationMetadataFromFeatureGroup(featureGroup);

    // Remove the current feature group first to avoid duplication
    this.cleanupFeatureGroup(featureGroup);
    this.removeFeatureGroup(featureGroup);

    const emitCleanedPolygon = (
      polygon: Feature<Polygon | MultiPolygon>,
      allowMerge: boolean,
      opts: { optimizationLevel: number; originalOptimizationLevel: number },
    ) => {
      const cleaned = this.turfHelper.removeDuplicateVertices(polygon);
      const parts: Feature<Polygon | MultiPolygon>[] = [];

      if (!this.config.kinks) {
        try {
          const split = this.turfHelper.getKinks(cleaned);
          if (split && split.length > 0) {
            parts.push(...split);
          }
        } catch {
          // ignore and fall back
        }
      }

      if (parts.length === 0) {
        if (cleaned.geometry.type === 'MultiPolygon') {
          cleaned.geometry.coordinates.forEach((coords) =>
            parts.push(this.turfHelper.getMultiPolygon([coords])),
          );
        } else {
          parts.push(cleaned);
        }
      }

      parts.forEach((part) => {
        this.emitPolygonUpdated({
          operation: 'markerDrag',
          polygon: part,
          allowMerge,
          optimizationLevel: opts.optimizationLevel,
          originalOptimizationLevel: opts.originalOptimizationLevel,
        });
      });
    };

    if (featureCollection.features[0].geometry.type === 'MultiPolygon') {
      for (const element of featureCollection.features[0].geometry.coordinates) {
        const feature = this.turfHelper.getMultiPolygon([element]);
        // INTELLIGENT MERGING: Allow merging when polygon intersects with existing structures
        emitCleanedPolygon(feature, true, {
          optimizationLevel,
          originalOptimizationLevel,
        });
      }
    } else {
      const feature = this.turfHelper.getMultiPolygon([
        featureCollection.features[0].geometry.coordinates,
      ]);

      // CRITICAL FIX: Don't allow merging for marker drag operations
      emitCleanedPolygon(feature, false, {
        optimizationLevel,
        originalOptimizationLevel,
      });
    }
    this.polygonInformation.createPolygonInformationStorage(this.getFeatureGroups());
  }

  // Polygon dragging methods
  private onPolygonMouseMove = (e: L.LeafletMouseEvent) => {
    if (
      !this.currentDragPolygon ||
      !this.currentDragPolygon._polydrawDragData ||
      !this.currentDragPolygon._polydrawDragData.isDragging
    )
      return;

    const polygon = this.currentDragPolygon;
    const dragData = polygon._polydrawDragData;

    if (!this.currentDragIsClone) {
      const eventToCheck = e.originalEvent && 'metaKey' in e.originalEvent ? e.originalEvent : e;
      const currentModifierState = this.detectDragSubtractModifierKey(eventToCheck as MouseEvent);
      if (currentModifierState !== this.currentModifierDragMode) {
        this.handleModifierToggleDuringDrag(eventToCheck as MouseEvent);
      }
    }

    const startPos = dragData!.startPosition;
    const currentPos = e.latlng;
    const offsetLat = currentPos.lat - startPos!.lat;
    const offsetLng = currentPos.lng - startPos!.lng;

    const newLatLngs = this.offsetPolygonCoordinates(dragData!.startLatLngs, offsetLat, offsetLng);
    polygon.setLatLngs(newLatLngs);

    this.updateMarkersAndHoleLinesDuringDrag(polygon, offsetLat, offsetLng);
  };

  private onPolygonMouseUp = (e: L.LeafletMouseEvent) => {
    void e; // mark parameter as used to satisfy ESLint while keeping the name
    if (
      !this.currentDragPolygon ||
      !this.currentDragPolygon._polydrawDragData ||
      !this.currentDragPolygon._polydrawDragData.isDragging
    )
      return;

    const polygon = this.currentDragPolygon;
    const dragData = polygon._polydrawDragData;

    dragData!.isDragging = false;

    this.map.off('mousemove', this.onPolygonMouseMove, this);
    this.map.off('mouseup', this.onPolygonMouseUp, this);
    // Also remove pointer listeners (Leaflet v2)
    (this.map as L.Evented).off(
      'pointermove',
      this.onPolygonMouseMove as L.LeafletEventHandlerFn,
      this,
    );
    (this.map as L.Evented).off(
      'pointerup',
      this.onPolygonMouseUp as L.LeafletEventHandlerFn,
      this,
    );

    if (this.map.dragging) {
      this.map.dragging.enable();
    }

    // Restore original opacity
    if (polygon._polydrawDragData && polygon._polydrawDragData.originalOpacity != null) {
      polygon.setStyle({ fillOpacity: polygon._polydrawDragData.originalOpacity });
    }

    this.setMarkerVisibility(polygon, true);

    try {
      const container = this.map.getContainer();
      container.style.cursor = '';
    } catch {
      // Handle DOM errors
    }

    this.clearCloneGhost();
    this.detachDragTouchListeners();
    this.detachDragCancelHandlers();

    const wasCloneDrag = this.currentDragIsClone;
    this.currentDragIsClone = false;
    if (wasCloneDrag) {
      this.updatePolygonAfterCloneDrag(polygon, dragData);
    } else {
      this.updatePolygonAfterDrag(polygon);
    }

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

  private onPolygonDragCancel = () => {
    this.cancelActivePolygonDrag();
  };

  private onPolygonDragKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    this.cancelActivePolygonDrag();
  };

  private onDragTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const latlng = EventAdapter.extractCoordinates(
      e as unknown as Record<string, unknown>,
      this.map,
    );
    if (!latlng) return;
    this.onPolygonMouseMove({ latlng } as L.LeafletMouseEvent);
  };

  private onDragTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    this.onPolygonMouseUp({ latlng: null } as unknown as L.LeafletMouseEvent);
  };

  private attachDragTouchListeners(): void {
    this.detachDragTouchListeners();
    this._boundDragTouchMove = this.onDragTouchMove;
    this._boundDragTouchEnd = this.onDragTouchEnd;
    const container = this.map.getContainer();
    container.addEventListener('touchmove', this._boundDragTouchMove, { passive: false });
    container.addEventListener('touchend', this._boundDragTouchEnd, { passive: false });
  }

  private detachDragTouchListeners(): void {
    const container = this.map.getContainer();
    if (this._boundDragTouchMove) {
      container.removeEventListener('touchmove', this._boundDragTouchMove);
      this._boundDragTouchMove = null;
    }
    if (this._boundDragTouchEnd) {
      container.removeEventListener('touchend', this._boundDragTouchEnd);
      this._boundDragTouchEnd = null;
    }
  }

  private detachPolygonTouchStart(polygon: L.Polygon): void {
    const listener = this.polygonTouchStartListeners.get(polygon);
    if (!listener) return;
    const el = (polygon as unknown as { _path?: SVGElement })._path;
    if (el) {
      el.removeEventListener('touchstart', listener as unknown as (e: Event) => void);
    }
    this.polygonTouchStartListeners.delete(polygon);
  }

  private attachDragCancelHandlers(): void {
    if (this.dragCancelHandlersAttached) return;
    this.dragCancelHandlersAttached = true;
    document.addEventListener('keydown', this.onPolygonDragKeyDown);
    (this.map as L.Evented).on(
      'pointercancel',
      this.onPolygonDragCancel as L.LeafletEventHandlerFn,
      this,
    );
    (this.map as L.Evented).on(
      'touchcancel',
      this.onPolygonDragCancel as L.LeafletEventHandlerFn,
      this,
    );
  }

  private detachDragCancelHandlers(): void {
    if (!this.dragCancelHandlersAttached) return;
    this.dragCancelHandlersAttached = false;
    document.removeEventListener('keydown', this.onPolygonDragKeyDown);
    (this.map as L.Evented).off(
      'pointercancel',
      this.onPolygonDragCancel as L.LeafletEventHandlerFn,
      this,
    );
    (this.map as L.Evented).off(
      'touchcancel',
      this.onPolygonDragCancel as L.LeafletEventHandlerFn,
      this,
    );
  }

  private cancelActivePolygonDrag(): void {
    if (!this.currentDragPolygon || !this.currentDragPolygon._polydrawDragData) {
      this.clearCloneGhost();
      return;
    }

    const polygon = this.currentDragPolygon;
    const dragData = polygon._polydrawDragData;
    if (!dragData) {
      this.clearCloneGhost();
      return;
    }
    if (!dragData.isDragging) {
      this.clearCloneGhost();
      return;
    }

    dragData.isDragging = false;

    this.map.off('mousemove', this.onPolygonMouseMove, this);
    this.map.off('mouseup', this.onPolygonMouseUp, this);
    (this.map as L.Evented).off(
      'pointermove',
      this.onPolygonMouseMove as L.LeafletEventHandlerFn,
      this,
    );
    (this.map as L.Evented).off(
      'pointerup',
      this.onPolygonMouseUp as L.LeafletEventHandlerFn,
      this,
    );

    if (this.map.dragging) {
      this.map.dragging.enable();
    }

    if (dragData.startLatLngs) {
      polygon.setLatLngs(dragData.startLatLngs);
    }

    if (polygon._polydrawOriginalMarkerPositions) {
      polygon._polydrawOriginalMarkerPositions.forEach((pos, marker) => {
        marker.setLatLng(pos);
      });
      polygon._polydrawOriginalMarkerPositions.clear();
      delete polygon._polydrawOriginalMarkerPositions;
    }

    if (polygon._polydrawOriginalHoleLinePositions) {
      polygon._polydrawOriginalHoleLinePositions.forEach((positions, line) => {
        line.setLatLngs(positions);
      });
      polygon._polydrawOriginalHoleLinePositions.clear();
      delete polygon._polydrawOriginalHoleLinePositions;
    }

    if (polygon._polydrawCurrentDragSession) {
      delete polygon._polydrawCurrentDragSession;
    }

    if (dragData.originalOpacity != null) {
      polygon.setStyle({ fillOpacity: dragData.originalOpacity });
    }

    this.setSubtractVisualMode(polygon, false);
    this.setMarkerVisibility(polygon, true);

    try {
      const container = this.map.getContainer();
      container.style.cursor = '';
    } catch {
      // Handle DOM errors
    }

    this.clearCloneGhost();
    this.detachDragTouchListeners();
    this.detachDragCancelHandlers();
    this.currentDragIsClone = false;
    this.currentModifierDragMode = false;
    this.isModifierKeyHeld = false;
    this.currentDragPolygon = null;
  }

  private offsetPolygonCoordinates(
    latLngs: L.LatLng[] | L.LatLng[][] | L.LatLng[][][],
    offsetLat: number,
    offsetLng: number,
  ): L.LatLng[] | L.LatLng[][] | L.LatLng[][][] {
    if (!latLngs) return latLngs as unknown as L.LatLng[] | L.LatLng[][] | L.LatLng[][][];

    // If nested arrays, recurse until we reach arrays of LatLng
    if (Array.isArray((latLngs as unknown as unknown[])[0])) {
      return (latLngs as unknown as (L.LatLng[] | L.LatLng[][])[]).map((ring) =>
        this.offsetPolygonCoordinates(ring as L.LatLng[] | L.LatLng[][], offsetLat, offsetLng),
      ) as L.LatLng[][] | L.LatLng[][][];
    }

    // Base case: array of LatLng -> return array of shifted LatLng
    return (latLngs as L.LatLng[]).map((p) =>
      leafletAdapter.createLatLng(p.lat + offsetLat, p.lng + offsetLng),
    );
  }

  private updateMarkersAndHoleLinesDuringDrag(
    polygon: PolydrawPolygon,
    offsetLat: number,
    offsetLng: number,
  ): void {
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
      const dragSessionKey =
        '_polydrawDragSession_' + Date.now() + '_' + leafletAdapter.util.stamp(polygon);
      if (!polygon._polydrawCurrentDragSession) {
        polygon._polydrawCurrentDragSession = dragSessionKey;
        polygon._polydrawOriginalMarkerPositions = new Map();
        polygon._polydrawOriginalHoleLinePositions = new Map();

        // Only store markers and lines that belong to THIS specific feature group
        featureGroup.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            polygon._polydrawOriginalMarkerPositions!.set(layer, layer.getLatLng());
          } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            const latLngs = layer.getLatLngs() as unknown as L.LatLng[];
            polygon._polydrawOriginalHoleLinePositions!.set(layer, latLngs);
          }
        });
      }

      // Only update markers and lines that belong to THIS specific feature group
      // and that were stored in the original positions map
      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const originalPos = polygon._polydrawOriginalMarkerPositions!.get(layer);
          if (originalPos) {
            const newLatLng = {
              lat: originalPos.lat + offsetLat,
              lng: originalPos.lng + offsetLng,
            };
            layer.setLatLng(newLatLng);
          }
        } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
          const originalPositions = polygon._polydrawOriginalHoleLinePositions!.get(layer) as
            | L.LatLng[]
            | L.LatLng[][]
            | undefined;
          if (originalPositions) {
            let newLatLngs: L.LatLng[] | L.LatLng[][];

            if (Array.isArray((originalPositions as unknown as unknown[])[0])) {
              // MultiPolyline: LatLng[][]
              newLatLngs = (originalPositions as L.LatLng[][]).map((ring) =>
                ring.map((latlng) =>
                  leafletAdapter.createLatLng(latlng.lat + offsetLat, latlng.lng + offsetLng),
                ),
              );
            } else {
              // Simple Polyline: LatLng[]
              newLatLngs = (originalPositions as L.LatLng[]).map((latlng) =>
                leafletAdapter.createLatLng(latlng.lat + offsetLat, latlng.lng + offsetLng),
              );
            }

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

      const { level: optimizationLevel, original: originalOptimizationLevel } =
        this.getOptimizationMetadataFromFeatureGroup(featureGroup);
      this.cleanupFeatureGroup(featureGroup);
      this.removeFeatureGroup(featureGroup);

      const feature = this.turfHelper.getTurfPolygon(newGeoJSON);
      this.emitPolygonUpdated({
        operation: 'polygonDrag',
        polygon: feature,
        allowMerge: true,
        optimizationLevel,
        originalOptimizationLevel,
      });

      this.polygonInformation.createPolygonInformationStorage(this.getFeatureGroups());
    } catch {
      // Handle errors
    }
  }

  private updatePolygonAfterCloneDrag(
    polygon: PolydrawPolygon,
    dragData: PolydrawPolygon['_polydrawDragData'],
  ): void {
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

      const newGeoJSON = polygon.toGeoJSON() as Feature<Polygon | MultiPolygon>;
      const originalLatLngs = (dragData?.startLatLngs ?? null) as
        | L.LatLng[]
        | L.LatLng[][]
        | L.LatLng[][][]
        | null;
      const originalGeoJSON = originalLatLngs
        ? this.createPolygonFeatureFromLatLngs(originalLatLngs)
        : null;

      const { level: optimizationLevel, original: originalOptimizationLevel } =
        this.getOptimizationMetadataFromFeatureGroup(featureGroup);

      this.cleanupFeatureGroup(featureGroup);
      this.removeFeatureGroup(featureGroup);

      const movedFeature = this.turfHelper.getTurfPolygon(newGeoJSON);
      this.emitPolygonUpdated({
        operation: 'polygonDrag',
        polygon: movedFeature,
        allowMerge: true,
        optimizationLevel,
        originalOptimizationLevel,
      });

      if (originalGeoJSON) {
        const originalFeature = this.turfHelper.getTurfPolygon(originalGeoJSON);
        this.emitPolygonUpdated({
          operation: 'polygonClone',
          polygon: originalFeature,
          allowMerge: true,
          optimizationLevel,
          originalOptimizationLevel,
        });
      }

      this.polygonInformation.createPolygonInformationStorage(this.getFeatureGroups());
    } catch {
      // Handle errors
    } finally {
      this.currentModifierDragMode = false;
      this.isModifierKeyHeld = false;
    }
  }

  private showCloneGhost(latLngs: L.LatLng[] | L.LatLng[][] | L.LatLng[][][] | null): void {
    this.clearCloneGhost();
    if (!latLngs) return;

    try {
      const ghost = leafletAdapter.createPolygon(latLngs, {
        color: this.config.colors.polygon.border,
        weight: this.config.polygonOptions.weight,
        opacity: 0.9,
        fill: false,
        fillOpacity: 0,
        dashArray: '4,6',
        interactive: false,
      });
      ghost.addTo(this.map);
      this.currentCloneGhost = ghost;
    } catch {
      // Handle ghost creation errors
    }
  }

  private clearCloneGhost(): void {
    if (!this.currentCloneGhost) return;
    try {
      this.map.removeLayer(this.currentCloneGhost);
    } catch {
      // Ignore removal errors
    }
    this.currentCloneGhost = null;
  }

  private createPolygonFeatureFromLatLngs(
    latLngs: L.LatLng[] | L.LatLng[][] | L.LatLng[][][],
  ): Feature<Polygon | MultiPolygon> | null {
    try {
      const polygon = leafletAdapter.createPolygon(latLngs);
      return polygon.toGeoJSON() as Feature<Polygon | MultiPolygon>;
    } catch {
      return null;
    }
  }

  private getDragSubtractModifierKey(): string {
    const { keys } = this.config.dragPolygons.modifierSubtract;
    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = userAgent.includes('mac');
    const isWindows = userAgent.includes('windows');

    if (isMac && keys.mac) return keys.mac;
    if (isWindows && keys.windows) return keys.windows;
    if (keys.linux) return keys.linux;

    return isMac ? 'metaKey' : 'ctrlKey';
  }

  private detectDragSubtractModifierKey(event: MouseEvent | KeyboardEvent | PointerEvent): boolean {
    if (isTouchDevice()) {
      return false;
    }

    const modifierKey = this.getDragSubtractModifierKey();
    // Type-guarded check for both MouseEvent and KeyboardEvent
    return (
      ((event as MouseEvent | KeyboardEvent | PointerEvent)[
        modifierKey as keyof (MouseEvent | KeyboardEvent | PointerEvent)
      ] as boolean) || false
    );
  }

  private setSubtractVisualMode(polygon: L.Polygon, enabled: boolean): void {
    if (!polygon || !polygon.setStyle) {
      return;
    }

    try {
      if (enabled) {
        polygon.setStyle({
          color: this.config.colors.dragPolygons.subtract,
        });
      } else {
        polygon.setStyle({
          color: this.config.colors.polygon.border,
        });
      }
      this.updateMarkerColorsForSubtractMode(polygon, enabled);
    } catch {
      // Handle DOM errors
    }
  }

  private updateMarkerColorsForSubtractMode(polygon: L.Polygon, subtractMode: boolean): void {
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

      if (!featureGroup) return;
      const fg: L.FeatureGroup = featureGroup;

      const hideMarkersOnDrag = this.config.dragPolygons.modifierSubtract.hideMarkersOnDrag;

      fg.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const marker = layer as L.Marker;
          const element = marker.getElement();

          if (element) {
            if (subtractMode) {
              if (hideMarkersOnDrag) {
                element.style.display = 'none';
                element.classList.add('subtract-mode-hidden');
              } else {
                element.style.backgroundColor = this.config.colors.dragPolygons.subtract;
                element.style.borderColor = this.config.colors.dragPolygons.subtract;
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
    } catch {
      // Handle errors
    }
  }

  private handleModifierToggleDuringDrag(event: MouseEvent): void {
    const isModifierPressed = this.detectDragSubtractModifierKey(event);

    this.currentModifierDragMode = isModifierPressed;
    this.isModifierKeyHeld = isModifierPressed;

    if (this.currentDragPolygon) {
      this.setSubtractVisualMode(this.currentDragPolygon, isModifierPressed);
    }
  }

  private isModifierDragActive(): boolean {
    return this.currentModifierDragMode;
  }

  private performModifierSubtract(
    draggedGeoJSON: Feature<Polygon | MultiPolygon>,
    originalFeatureGroup: L.FeatureGroup,
  ): void {
    try {
      const draggedPolygon = this.turfHelper.getTurfPolygon(draggedGeoJSON);
      const intersectingFeatureGroups: L.FeatureGroup[] = [];

      // Find all feature groups that intersect with the dragged polygon
      this.getFeatureGroups().forEach((featureGroup) => {
        if (featureGroup === originalFeatureGroup) {
          return;
        }

        try {
          const featureCollection = featureGroup.toGeoJSON() as FeatureCollection<
            Polygon | MultiPolygon
          >;
          if (!featureCollection || !featureCollection.features || !featureCollection.features[0]) {
            return;
          }

          const firstFeature = featureCollection.features[0] as Feature<Polygon | MultiPolygon>;
          if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
            return;
          }

          const existingPolygon = this.turfHelper.getTurfPolygon(firstFeature);

          // Check intersection directly using geometry operations
          try {
            const intersection = this.turfHelper.getIntersection(existingPolygon, draggedPolygon);
            if (intersection && intersection.geometry && 'coordinates' in intersection.geometry) {
              const coords = (intersection.geometry as Polygon | MultiPolygon).coordinates;
              if (coords.length > 0) {
                intersectingFeatureGroups.push(featureGroup);
              }
            }
          } catch {
            // If intersection fails, try the polygonIntersect method
            try {
              const hasIntersection = this.turfHelper.polygonIntersect(
                existingPolygon,
                draggedPolygon,
              );
              if (hasIntersection) {
                intersectingFeatureGroups.push(featureGroup);
              }
            } catch {
              // Continue with other polygons
            }
          }
        } catch {
          // Handle errors
        }
      });

      // Remove the original dragged polygon first
      this.removeFeatureGroup(originalFeatureGroup);

      // For each intersecting polygon, subtract the dragged polygon from it
      // This creates the "bite taken" effect
      intersectingFeatureGroups.forEach((featureGroup) => {
        try {
          const featureCollection = featureGroup.toGeoJSON() as FeatureCollection<
            Polygon | MultiPolygon
          >;
          const existingPolygon = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
          const { level: optimizationLevel, original: originalOptimizationLevel } =
            this.getOptimizationMetadataFromFeatureGroup(featureGroup);

          // Remove the existing polygon before creating the result
          this.cleanupFeatureGroup(featureGroup);
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
                this.emitPolygonUpdated({
                  operation: 'modifierSubtract',
                  polygon: this.turfHelper.getTurfPolygon(individualPolygon),
                  allowMerge: false, // Don't merge the result of subtract operations
                  optimizationLevel,
                  originalOptimizationLevel,
                });
              }
            }
          } catch (differenceError) {
            if (!isTestEnvironment()) {
              console.warn('Failed to perform difference operation:', differenceError);
            }
            // If difference fails, try to add the original polygon back
            this.emitPolygonUpdated({
              operation: 'modifierSubtractFallback',
              polygon: existingPolygon,
              allowMerge: false,
              optimizationLevel,
              originalOptimizationLevel,
            });
          }
        } catch (error) {
          if (!isTestEnvironment()) {
            console.warn('Error in modifier subtract operation:', error);
          }
        }
      });

      // Update polygon information after the operation
      this.polygonInformation.createPolygonInformationStorage(this.getFeatureGroups());
    } catch (error) {
      if (!isTestEnvironment()) {
        console.warn('Error in performModifierSubtract:', error);
      }
    }
  }

  private getEdgeDeletionModifierKey(): string {
    const { keys } = this.config.edgeDeletion;
    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = userAgent.includes('mac');
    const isWindows = userAgent.includes('windows');

    if (isMac && keys.mac) return keys.mac;
    if (isWindows && keys.windows) return keys.windows;
    if (keys.linux) return keys.linux;

    return isMac ? 'metaKey' : 'ctrlKey';
  }

  private isEdgeDeletionModifierKeyPressed(event: MouseEvent): boolean {
    if (isTouchDevice()) {
      return false;
    }
    const modifierKey = this.getEdgeDeletionModifierKey();
    return !!event[modifierKey as keyof MouseEvent];
  }

  private onMarkerHoverForEdgeDeletion(marker: L.Marker, isHovering: boolean): void {
    const element = marker.getElement();
    if (!element) return;

    if (isHovering) {
      // Add event listeners to detect modifier key state in real-time
      const checkModifierAndUpdate = (e: Event) => {
        const isModifierPressed = this.isEdgeDeletionModifierKeyPressed(e as MouseEvent);
        if (isModifierPressed) {
          element.style.backgroundColor = this.config.colors.edgeDeletion.hover;
          element.style.borderColor = this.config.colors.edgeDeletion.hover;
          element.classList.add('edge-deletion-hover');
          // Set cursor to pointer when modifier key is held over marker
          try {
            const container = this.map.getContainer();
            container.style.cursor = 'pointer';
          } catch {
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
          } catch {
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
      } catch {
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
    if (!this.isModifierKeyHeld) return;

    const element = e.target as HTMLElement;
    if (element) {
      element.style.backgroundColor = this.config.colors.edgeDeletion.hover;
      element.style.borderColor = this.config.colors.edgeDeletion.hover;
      element.classList.add('edge-deletion-hover');
    }
  };

  private onMarkerLeaveForEdgeDeletionEvent = (e: Event) => {
    const element = e.target as HTMLElement;
    if (element) {
      element.style.backgroundColor = '';
      element.style.borderColor = '';
      element.classList.remove('edge-deletion-hover');
    }
  };

  // Helper methods
  private getMarkerIndex(latlngs: L.LatLngLiteral[], position: MarkerPosition): number {
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
    const nearestPointIdx = this.turfHelper.getNearestPointIndex(
      targetPoint,
      fc as FeatureCollection<Point>,
    );
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
    return IconFactory.createDivIcon(processedClasses);
  }

  private getLatLngInfoString(latlng: L.LatLngLiteral): string {
    return 'Latitude: ' + latlng.lat + ' Longitude: ' + latlng.lng;
  }

  private setMarkerVisibility(polygon: PolydrawPolygon, visible: boolean): void {
    const featureGroup = this.getFeatureGroups().find((fg) => fg.hasLayer(polygon));
    if (!featureGroup) return;

    featureGroup.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        const marker = layer as L.Marker;
        const element = marker.getElement();
        if (element) {
          const behavior = this.config.dragPolygons.markerBehavior;
          const duration = this.config.dragPolygons.markerAnimationDuration;

          if (behavior === 'hide') {
            element.style.display = visible ? '' : 'none';
          } else if (behavior === 'fade') {
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = visible ? '1' : '0';
          }
        }
      }
    });
  }

  private generateMenuMarkerPopup(
    latLngs: L.LatLngLiteral[],
    featureGroup: L.FeatureGroup,
  ): L.Popup {
    // Build buttons based on config
    const buttons: HTMLDivElement[] = [];
    const menuOps = this.config.menuOperations;

    // Simplify button
    if (menuOps.simplify.enabled) {
      buttons.push(PopupFactory.createMenuButton('simplify', 'Simplify', ['simplify']));
    }

    // Double Elbows button
    if (menuOps.doubleElbows.enabled) {
      buttons.push(
        PopupFactory.createMenuButton('doubleElbows', 'DoubleElbows', ['double-elbows']),
      );
    }

    // Bounding Box button
    if (menuOps.bbox.enabled) {
      buttons.push(PopupFactory.createMenuButton('bbox', 'Bounding box', ['bbox']));
    }

    // Bezier button
    if (menuOps.bezier.enabled) {
      buttons.push(PopupFactory.createMenuButton('bezier', 'Curve', ['bezier']));
    }

    // Scale button
    if (menuOps.scale.enabled) {
      buttons.push(PopupFactory.createMenuButton('scale', 'Scale', ['transform-scale']));
    }

    // Rotate button
    if (menuOps.rotate.enabled) {
      buttons.push(PopupFactory.createMenuButton('rotate', 'Rotate', ['transform-rotate']));
    }
    if (menuOps.visualOptimizationToggle?.enabled) {
      const { level, original } = this.getOptimizationMetadataFromFeatureGroup(featureGroup);
      const hasOptimization = original > 0 || level > 0;
      if (hasOptimization) {
        const isOptimized = typeof level === 'number' && level > 0;
        const toggleClasses = [
          'toggle-visual-optimization',
          isOptimized ? 'visual-optimization-state-hidden' : 'visual-optimization-state-visible',
        ];
        const toggleTitle = isOptimized ? 'Show all markers' : 'Hide extra markers';
        buttons.push(
          PopupFactory.createMenuButton('toggleOptimization', toggleTitle, toggleClasses),
        );
      }
    }

    // Build popup structure using factory
    const outerWrapper = PopupFactory.buildMenuPopup(buttons);

    const closeBtn = outerWrapper.querySelector('.marker-menu-close');
    if (closeBtn) {
      const handleClose = (event: Event) => {
        event.stopPropagation();
        event.preventDefault();
        if (this._openMenuPopup) {
          this.map.closePopup(this._openMenuPopup);
          this._openMenuPopup = null;
        } else {
          this.map.closePopup();
        }
      };
      closeBtn.addEventListener('click', handleClose);
      closeBtn.addEventListener('touchend', handleClose, { passive: false });
    }

    const closePopupIfOpen = () => {
      if (this._openMenuPopup) {
        this.map.closePopup(this._openMenuPopup);
        this._openMenuPopup = null;
      }
    };

    // Wire up event handlers for all buttons
    const attachMenuActionHandler = (
      button: HTMLDivElement,
      action: 'simplify' | 'doubleElbows' | 'bbox' | 'bezier',
    ) => {
      button.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.eventManager.emit('polydraw:menu:action', {
          action,
          latLngs,
          featureGroup,
        });
        closePopupIfOpen();
      });
      button.onclick = () => {
        this.eventManager.emit('polydraw:menu:action', {
          action,
          latLngs,
          featureGroup,
        });
        closePopupIfOpen();
      };
    };

    const startTransform = (mode: 'scale' | 'rotate') => {
      const existing = this.transformControllers.get(featureGroup);
      if (existing) {
        existing.cancel();
        existing.destroy();
        this.transformControllers.delete(featureGroup);
      }
      try {
        const controller = new PolygonTransformController(
          this.map,
          featureGroup,
          mode,
          (confirmed) => {
            if (this.transformControllers.get(featureGroup) === controller) {
              this.transformControllers.delete(featureGroup);
            }
            this.transformModeActive = false;

            const polygonLayer = featureGroup.getLayers().find((l) => l instanceof L.Polygon) as
              | L.Polygon
              | undefined;
            if (!polygonLayer) {
              return;
            }

            if (!confirmed) {
              this.setMarkerVisibility(polygonLayer as unknown as PolydrawPolygon, true);
              return;
            }

            if (this.saveHistoryState) {
              this.saveHistoryState(mode);
            }
            const newGeoJSON = polygonLayer.toGeoJSON();
            const { level: optimizationLevel, original: originalOptimizationLevel } =
              this.getOptimizationMetadataFromFeatureGroup(featureGroup);
            this.cleanupFeatureGroup(featureGroup);
            this.removeFeatureGroup(featureGroup);
            this.emitPolygonUpdated({
              operation: 'transform',
              polygon: this.turfHelper.getTurfPolygon(newGeoJSON),
              allowMerge: true,
              optimizationLevel,
              originalOptimizationLevel,
            });
          },
        );
        this.transformControllers.set(featureGroup, controller);
        const polyLayer = featureGroup.getLayers().find((l) => l instanceof L.Polygon) as
          | L.Polygon
          | undefined;
        if (polyLayer) this.setMarkerVisibility(polyLayer as unknown as PolydrawPolygon, false);
        this.transformModeActive = true;
      } catch {
        // ignore
      }
    };

    const attachTransformHandler = (button: HTMLDivElement, mode: 'scale' | 'rotate') => {
      button.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransform(mode);
        closePopupIfOpen();
      });
      button.onclick = () => {
        startTransform(mode);
        closePopupIfOpen();
      };
    };

    const attachOptimizationToggleHandler = (button: HTMLDivElement) => {
      const handler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleOptimizationVisibility(featureGroup);
        closePopupIfOpen();
      };
      button.addEventListener('touchend', handler, { passive: false });
      button.onclick = handler;
    };

    // Attach handlers based on button IDs
    buttons.forEach((button) => {
      const actionId = button.getAttribute('data-action-id');
      switch (actionId) {
        case 'simplify':
          attachMenuActionHandler(button, 'simplify');
          break;
        case 'doubleElbows':
          attachMenuActionHandler(button, 'doubleElbows');
          break;
        case 'bbox':
          attachMenuActionHandler(button, 'bbox');
          break;
        case 'bezier':
          attachMenuActionHandler(button, 'bezier');
          break;
        case 'scale':
          attachTransformHandler(button, 'scale');
          break;
        case 'rotate':
          attachTransformHandler(button, 'rotate');
          break;
        case 'toggleOptimization':
          attachOptimizationToggleHandler(button);
          break;
      }
    });

    L.DomEvent.disableClickPropagation(outerWrapper);
    outerWrapper.style.pointerEvents = 'auto';

    outerWrapper.querySelectorAll('.marker-menu-button').forEach((btn) => {
      (btn as HTMLElement).style.pointerEvents = 'auto';
      btn.addEventListener('click', (e) => e.stopPropagation());
    });

    const isMobile = window.innerWidth <= 600;
    const versionClass = LeafletVersionDetector.isV1() ? ' leaflet-v1' : ' leaflet-v2';
    const popup = leafletAdapter
      .createPopup({
        closeButton: false,
        autoClose: true,
        className: `menu-popup${isMobile ? ' mobile-popup' : ''}${versionClass}`,
      })
      .setContent(outerWrapper);

    this._openMenuPopup = popup;
    return popup;
  }

  private toggleOptimizationVisibility(featureGroup: L.FeatureGroup): void {
    const polygonLayer = featureGroup.getLayers().find((l) => l instanceof L.Polygon) as
      | L.Polygon
      | undefined;
    if (!polygonLayer) {
      return;
    }
    const metadata = this.getOptimizationMetadataFromFeatureGroup(featureGroup);
    if (!metadata.original && !metadata.level) {
      return;
    }
    const targetLevel =
      metadata.level > 0 ? 0 : metadata.original > 0 ? metadata.original : metadata.level;
    if (targetLevel === metadata.level) {
      return;
    }
    const newGeoJSON = polygonLayer.toGeoJSON();
    this.cleanupFeatureGroup(featureGroup);
    this.removeFeatureGroup(featureGroup);
    this.emitPolygonUpdated({
      operation: 'toggleOptimization',
      polygon: this.turfHelper.getTurfPolygon(newGeoJSON),
      allowMerge: true,
      optimizationLevel: targetLevel,
      originalOptimizationLevel: metadata.original || targetLevel,
    });
  }

  private getPolygonGeoJSONFromFeatureGroup(
    featureGroup: L.FeatureGroup,
  ): Feature<Polygon | MultiPolygon> {
    try {
      // Find the polygon layer in the feature group (use getLayers + find for clearer typing)
      const polygonLayer = featureGroup.getLayers().find((layer) => layer instanceof L.Polygon) as
        | L.Polygon
        | undefined;

      if (!polygonLayer) {
        throw new Error('No polygon found in feature group');
      }

      // Get the complete GeoJSON including holes
      return polygonLayer.toGeoJSON() as Feature<Polygon | MultiPolygon>;
    } catch (error) {
      if (!isTestEnvironment()) {
        if (error instanceof Error) {
          console.warn('Error getting polygon GeoJSON from feature group:', error.message);
        } else {
          console.warn('Error getting polygon GeoJSON from feature group:', error);
        }
      }
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
      if (!isTestEnvironment()) {
        if (error instanceof Error) {
          console.warn('Error calculating total polygon perimeter:', error.message);
        } else {
          console.warn('Error calculating total polygon perimeter:', error);
        }
      }
      // Fallback to turf helper calculation
      return this.turfHelper.getPolygonPerimeter(polygonGeoJSON) * 1000;
    }
  }

  private generateInfoMarkerPopup(area: number, perimeter: number): L.Popup {
    type PerimeterConfig = ConstructorParameters<typeof Perimeter>[1];
    type AreaConfig = ConstructorParameters<typeof Area>[1];
    const _perimeter = new Perimeter(perimeter, this.config as unknown as PerimeterConfig);
    const _area = new Area(area, this.config as unknown as AreaConfig);
    const infoConfig = this.config.markers.markerInfoIcon ?? {};
    const showArea = infoConfig.showArea !== false;
    const showPerimeter = infoConfig.showPerimeter !== false;
    const useMetricUnits = infoConfig.useMetrics !== false;
    const areaLabel = infoConfig.areaLabel?.trim();
    const perimeterLabel = infoConfig.perimeterLabel?.trim();

    const outerWrapper: HTMLDivElement = document.createElement('div');
    outerWrapper.classList.add('info-marker-outer-wrapper');
    const wrapper: HTMLDivElement = document.createElement('div');
    wrapper.classList.add('info-marker-wrapper');
    const markerContent: HTMLDivElement = document.createElement('div');
    markerContent.classList.add('content');

    const infoContentWrapper: HTMLDivElement = document.createElement('div');
    infoContentWrapper.classList.add('info-marker-content');

    if (showArea) {
      const areaValue = useMetricUnits
        ? `${_area.metricArea} ${_area.metricUnit}`
        : `${_area.imperialArea} ${_area.imperialUnit}`;
      const areaDiv: HTMLDivElement = document.createElement('div');
      areaDiv.classList.add('info-item', 'area');
      areaDiv.innerHTML =
        areaLabel && areaLabel.length > 0
          ? `<strong>${areaLabel}:</strong> ${areaValue}`
          : areaValue;
      infoContentWrapper.appendChild(areaDiv);
    }

    if (showPerimeter) {
      const perimeterValue = useMetricUnits
        ? `${_perimeter.metricLength} ${_perimeter.metricUnit}`
        : `${_perimeter.imperialLength} ${_perimeter.imperialUnit}`;
      const perimeterDiv: HTMLDivElement = document.createElement('div');
      perimeterDiv.classList.add('info-item', 'perimeter');
      perimeterDiv.innerHTML =
        perimeterLabel && perimeterLabel.length > 0
          ? `<strong>${perimeterLabel}:</strong> ${perimeterValue}`
          : perimeterValue;
      infoContentWrapper.appendChild(perimeterDiv);
    }

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
    const popup = leafletAdapter
      .createPopup({
        closeButton: true,
        autoClose: true,
        className: `info-popup${isMobile ? ' mobile-popup' : ''}`,
      })
      .setContent(outerWrapper);

    return popup;
  }
}
