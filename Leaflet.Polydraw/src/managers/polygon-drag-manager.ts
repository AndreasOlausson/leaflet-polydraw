import * as L from 'leaflet';
import { DrawMode } from '../enums';
import { TurfHelper } from '../turf-helper';
import type {
  ILatLng,
  PolydrawConfig,
  PolydrawPolygon,
  PolydrawFeatureGroup,
} from '../types/polydraw-interfaces';
import type { Feature, Polygon, MultiPolygon } from 'geojson';

/**
 * Manages polygon dragging functionality including modifier-based subtract operations
 */
export class PolygonDragManager {
  // Drag state management
  private currentDragPolygon: PolydrawPolygon | null = null;
  private isModifierKeyHeld: boolean = false;
  private currentModifierDragMode: boolean = false;

  constructor(
    private config: PolydrawConfig,
    private turfHelper: TurfHelper,
    private map: L.Map,
    private getDrawMode: () => DrawMode,
    private arrayOfFeatureGroups: PolydrawFeatureGroup[],
  ) {}

  /**
   * Enable polygon dragging functionality on a polygon layer
   */
  enablePolygonDragging(
    polygon: any,
    featureGroup: L.FeatureGroup,
    latLngs: Feature<Polygon | MultiPolygon>,
  ) {
    try {
      // Store references for drag handling
      polygon._polydrawFeatureGroup = featureGroup;
      polygon._polydrawLatLngs = latLngs;
      polygon._polydrawDragData = {
        isDragging: false,
        startPosition: null,
        startLatLngs: null,
      };

      // Add custom mouse event handlers for dragging
      polygon.on('mousedown', (e: any) => this.onPolygonMouseDown(e, polygon));

      // Set cursor to indicate draggable (only when not in draw/subtract mode)
      polygon.on('mouseover', () => {
        if (
          !polygon._polydrawDragData.isDragging &&
          this.config.dragPolygons.hoverCursor &&
          this.getDrawMode() === DrawMode.Off
        ) {
          try {
            const container = this.map.getContainer();
            container.style.cursor = this.config.dragPolygons.hoverCursor;
            // Also set on the polygon element itself
            if (polygon.getElement) {
              const element = polygon.getElement();
              if (element) {
                element.style.cursor = this.config.dragPolygons.hoverCursor;
              }
            }
          } catch (domError) {
            // Handle DOM errors in test environment
          }
        }
      });

      polygon.on('mouseout', () => {
        if (!polygon._polydrawDragData.isDragging && this.getDrawMode() === DrawMode.Off) {
          try {
            const container = this.map.getContainer();
            container.style.cursor = '';
            // Also reset on the polygon element itself
            if (polygon.getElement) {
              const element = polygon.getElement();
              if (element) {
                element.style.cursor = '';
              }
            }
          } catch (domError) {
            // Handle DOM errors in test environment
          }
        }
      });
    } catch (error) {
      console.warn('Could not enable polygon dragging:', error.message);
    }
  }

  /**
   * Handle mouse down on polygon to start dragging
   */
  private onPolygonMouseDown(e: any, polygon: any) {
    if (!this.config.modes.dragPolygons || this.getDrawMode() !== DrawMode.Off) return;

    // Prevent event bubbling to map
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);

    // Detect modifier key state at drag start
    const isModifierPressed = this.detectModifierKey(e.originalEvent || e);
    this.currentModifierDragMode = isModifierPressed;
    this.isModifierKeyHeld = isModifierPressed;

    // Initialize drag
    polygon._polydrawDragData.isDragging = true;
    polygon._polydrawDragData.startPosition = e.latlng;
    polygon._polydrawDragData.startLatLngs = polygon.getLatLngs();

    // Disable map dragging
    if (this.map.dragging) {
      this.map.dragging.disable();
    }

    // Visual feedback - use subtract color if modifier is held
    if (this.config.dragPolygons.opacity < 1) {
      polygon.setStyle({ opacity: this.config.dragPolygons.opacity });
    }

    // Apply modifier visual feedback
    this.setSubtractVisualMode(polygon, isModifierPressed);

    // Set drag cursor
    if (this.config.dragPolygons.dragCursor) {
      try {
        const container = this.map.getContainer();
        container.style.cursor = this.config.dragPolygons.dragCursor;
        // Also set on the polygon element itself
        if (polygon.getElement) {
          const element = polygon.getElement();
          if (element) {
            element.style.cursor = this.config.dragPolygons.dragCursor;
          }
        }
      } catch (domError) {
        // Handle DOM errors in test environment
      }
    }

    // Add global mouse move and up handlers
    this.map.on('mousemove', this.onPolygonMouseMove, this);
    this.map.on('mouseup', this.onPolygonMouseUp, this);

    // Store current polygon being dragged
    this.currentDragPolygon = polygon;

    // Handle marker behavior during drag
    this.handleMarkersDuringDrag(polygon._polydrawFeatureGroup, 'start');

    // Emit custom event
    this.map.fire('polygon:dragstart', {
      polygon: polygon,
      featureGroup: polygon._polydrawFeatureGroup,
      originalLatLngs: polygon._polydrawLatLngs,
    });
  }

  /**
   * Handle mouse move during polygon drag
   */
  private onPolygonMouseMove(e: L.LeafletMouseEvent) {
    if (!this.currentDragPolygon || !this.currentDragPolygon._polydrawDragData.isDragging) return;

    const polygon = this.currentDragPolygon;
    const dragData = polygon._polydrawDragData;

    // Check for modifier key changes during drag
    const eventToCheck = e.originalEvent && 'metaKey' in e.originalEvent ? e.originalEvent : e;
    const currentModifierState = this.detectModifierKey(eventToCheck as MouseEvent);
    if (currentModifierState !== this.currentModifierDragMode) {
      this.handleModifierToggleDuringDrag(eventToCheck as MouseEvent);
    }

    // Calculate offset
    const startPos = dragData.startPosition;
    const currentPos = e.latlng;
    const offsetLat = currentPos.lat - startPos.lat;
    const offsetLng = currentPos.lng - startPos.lng;

    // Apply offset to all polygon coordinates
    const newLatLngs = this.offsetPolygonCoordinates(dragData.startLatLngs, offsetLat, offsetLng);
    polygon.setLatLngs(newLatLngs);

    // Emit drag event
    this.map.fire('polygon:drag', {
      polygon: polygon,
      featureGroup: polygon._polydrawFeatureGroup,
    });
  }

  /**
   * Handle mouse up to end polygon drag
   */
  private onPolygonMouseUp(
    e: L.LeafletMouseEvent,
    onUpdatePolygonCoordinates?: (
      polygon: any,
      featureGroup: L.FeatureGroup,
      originalLatLngs: Feature<Polygon | MultiPolygon>,
    ) => void,
  ) {
    if (!this.currentDragPolygon || !this.currentDragPolygon._polydrawDragData.isDragging) return;

    const polygon = this.currentDragPolygon;
    const dragData = polygon._polydrawDragData;

    // Clean up drag state
    dragData.isDragging = false;

    // Remove global handlers
    this.map.off('mousemove', this.onPolygonMouseMove, this);
    this.map.off('mouseup', this.onPolygonMouseUp, this);

    // Re-enable map dragging
    if (this.map.dragging) {
      this.map.dragging.enable();
    }

    // Reset visual feedback
    polygon.setStyle({ opacity: 1.0 });

    // Reset cursor
    const container = this.map.getContainer();
    container.style.cursor = '';

    // Update internal coordinates
    if (onUpdatePolygonCoordinates) {
      onUpdatePolygonCoordinates(polygon, polygon._polydrawFeatureGroup, polygon._polydrawLatLngs);
    }

    // Handle marker behavior during drag end
    this.handleMarkersDuringDrag(polygon._polydrawFeatureGroup, 'end');

    // Emit custom event
    try {
      let newPosition;
      try {
        newPosition = polygon.getLatLngs();
      } catch (latLngError) {
        newPosition = dragData.startLatLngs; // Fallback
      }

      this.map.fire('polygon:dragend', {
        polygon: polygon,
        featureGroup: polygon._polydrawFeatureGroup,
        oldPosition: dragData.startLatLngs,
        newPosition: newPosition,
      });
    } catch (fireError) {
      // Handle DOM errors in test environment
    }

    // Clear current drag polygon
    this.currentDragPolygon = null;
  }

  /**
   * Apply offset to polygon coordinates
   */
  private offsetPolygonCoordinates(latLngs: any, offsetLat: number, offsetLng: number): any {
    if (!latLngs) return latLngs;

    if (Array.isArray(latLngs[0])) {
      // Multi-dimensional array (polygon with holes or multipolygon)
      return latLngs.map((ring: any) => this.offsetPolygonCoordinates(ring, offsetLat, offsetLng));
    } else if (latLngs.lat !== undefined && latLngs.lng !== undefined) {
      // Single coordinate
      return {
        lat: latLngs.lat + offsetLat,
        lng: latLngs.lng + offsetLng,
      };
    } else {
      // Array of coordinates
      return latLngs.map((coord: any) =>
        this.offsetPolygonCoordinates(coord, offsetLat, offsetLng),
      );
    }
  }

  /**
   * Check for interactions between dragged polygon and existing polygons
   */
  checkDragInteractions(
    draggedPolygon: Feature<Polygon | MultiPolygon>,
    excludeFeatureGroup: L.FeatureGroup,
  ) {
    const result = {
      shouldMerge: false,
      shouldCreateHole: false,
      intersectingFeatureGroups: [] as L.FeatureGroup[],
      containingFeatureGroup: null as L.FeatureGroup | null,
    };

    if (
      !this.config.dragPolygons.autoMergeOnIntersect &&
      !this.config.dragPolygons.autoHoleOnContained
    ) {
      return result;
    }

    // Check interactions with all other polygons
    for (const featureGroup of this.arrayOfFeatureGroups) {
      if (featureGroup === excludeFeatureGroup) continue;

      try {
        const featureCollection = featureGroup.toGeoJSON() as any;
        const existingPolygon = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

        // Check if dragged polygon is completely contained within existing polygon
        // Use difference operation to check containment
        if (this.config.dragPolygons.autoHoleOnContained) {
          try {
            const difference = this.turfHelper.polygonDifference(existingPolygon, draggedPolygon);
            if (
              difference &&
              difference.geometry.type === 'Polygon' &&
              difference.geometry.coordinates.length > 1
            ) {
              // If difference creates a polygon with holes, the dragged polygon was likely contained
              result.shouldCreateHole = true;
              result.containingFeatureGroup = featureGroup;
              break; // Hole takes precedence over merge
            }
          } catch (error) {
            // Continue with other checks
          }
        }

        // Check if polygons intersect (but dragged is not completely contained)
        if (this.config.dragPolygons.autoMergeOnIntersect) {
          // Use multiple intersection detection methods for better reliability
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
        console.warn('Error checking drag interactions:', error.message);
        continue;
      }
    }

    return result;
  }

  /**
   * Handle marker and polyline behavior during polygon drag
   */
  private handleMarkersDuringDrag(featureGroup: L.FeatureGroup, phase: 'start' | 'end') {
    if (!featureGroup) return;

    const markerBehavior = this.config.dragPolygons.markerBehavior;
    const animationDuration = this.config.dragPolygons.markerAnimationDuration;

    featureGroup.eachLayer((layer) => {
      // Handle markers
      if (layer instanceof L.Marker) {
        const marker = layer as L.Marker;
        const element = marker.getElement();

        if (element) {
          if (phase === 'start') {
            // Handle drag start - hide or prepare markers
            if (markerBehavior === 'hide') {
              // Animate markers to fade out
              element.style.transition = `opacity ${animationDuration}ms ease`;
              element.style.opacity = '0';

              // Optionally disable pointer events during drag
              element.style.pointerEvents = 'none';
            }
          } else if (phase === 'end') {
            // Handle drag end - restore markers
            if (markerBehavior === 'hide') {
              // Animate markers back to visible
              element.style.transition = `opacity ${animationDuration}ms ease`;
              element.style.opacity = '1';

              // Re-enable pointer events
              element.style.pointerEvents = 'auto';
            }
          }
        }
      }
      // Handle polylines (hole lines) - exclude the main polygon
      else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        const polyline = layer as L.Polyline;
        const element = polyline.getElement() as HTMLElement;

        if (element) {
          if (phase === 'start') {
            // Handle drag start - hide polylines
            if (markerBehavior === 'hide') {
              // Animate polylines to fade out
              element.style.transition = `opacity ${animationDuration}ms ease`;
              element.style.opacity = '0';

              // Optionally disable pointer events during drag
              element.style.pointerEvents = 'none';
            }
          } else if (phase === 'end') {
            // Handle drag end - restore polylines
            if (markerBehavior === 'hide') {
              // Animate polylines back to visible
              element.style.transition = `opacity ${animationDuration}ms ease`;
              element.style.opacity = '1';

              // Re-enable pointer events
              element.style.pointerEvents = 'auto';
            }
          }
        }
      }
    });
  }

  /**
   * Public method to enable/disable polygon dragging
   */
  enablePolygonDraggingMode(enable: boolean = true) {
    this.config.modes.dragPolygons = enable;

    // Update existing polygons
    this.arrayOfFeatureGroups.forEach((featureGroup) => {
      featureGroup.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          const draggableLayer = layer as any;
          if (enable && draggableLayer.dragging) {
            draggableLayer.dragging.enable();
            // Note: Event listeners are already attached when polygon is created
          } else if (draggableLayer.dragging) {
            draggableLayer.dragging.disable();
          }
        }
      });
    });
  }

  /**
   * Detect if modifier key is pressed during drag operation
   */
  private detectModifierKey(event: MouseEvent): boolean {
    if (!this.config.dragPolygons?.modifierSubtract?.enabled) {
      return false;
    }

    // Detect platform and check appropriate modifier key
    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = userAgent.includes('mac');

    if (isMac) {
      // Mac: Use Cmd key (metaKey)
      return event.metaKey;
    } else {
      // Windows/Linux: Use Ctrl key (ctrlKey)
      return event.ctrlKey;
    }
  }

  /**
   * Set visual feedback for subtract mode during drag
   */
  private setSubtractVisualMode(polygon: any, enabled: boolean): void {
    if (!polygon || !polygon.setStyle) {
      return;
    }

    try {
      if (enabled) {
        // Change to subtract color when modifier is held
        polygon.setStyle({
          color: this.config.dragPolygons.modifierSubtract.subtractColor,
        });
      } else {
        // Restore normal polygon color
        polygon.setStyle({
          color: this.config.polygonOptions.color,
        });
      }
    } catch (error) {
      // Handle DOM errors in test environment
      console.warn('Could not set polygon visual mode:', error.message);
    }
  }

  /**
   * Check if modifier drag mode is currently active
   */
  isModifierDragActive(): boolean {
    return this.currentModifierDragMode;
  }

  /**
   * Handle modifier key toggle during active drag operation
   */
  private handleModifierToggleDuringDrag(event: MouseEvent): void {
    const isModifierPressed = this.detectModifierKey(event);

    // Update the modifier drag mode state
    this.currentModifierDragMode = isModifierPressed;
    this.isModifierKeyHeld = isModifierPressed;

    // If we have a current drag polygon, update its visual feedback
    if (this.currentDragPolygon) {
      this.setSubtractVisualMode(this.currentDragPolygon, isModifierPressed);
    }
  }

  /**
   * Find all polygons that intersect with the dragged polygon
   */
  findIntersectingPolygons(
    draggedPolygon: Feature<Polygon | MultiPolygon>,
    excludeFeatureGroup: L.FeatureGroup,
  ): L.FeatureGroup[] {
    const intersectingFeatureGroups: L.FeatureGroup[] = [];

    // Check interactions with all other polygons
    for (const featureGroup of this.arrayOfFeatureGroups) {
      if (featureGroup === excludeFeatureGroup) {
        continue;
      }

      try {
        const featureCollection = featureGroup.toGeoJSON() as any;
        const existingPolygon = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

        // Check if polygons intersect OR if one is contained within the other
        let intersects = this.turfHelper.polygonIntersect(draggedPolygon, existingPolygon);

        // If no intersection detected, check for containment (one polygon inside another)
        if (!intersects) {
          try {
            // Check if dragged polygon is completely inside existing polygon
            // Handle both Polygon and MultiPolygon coordinate structures
            const draggedCoords =
              draggedPolygon.geometry.type === 'Polygon'
                ? (draggedPolygon.geometry.coordinates[0] as any[])
                : (draggedPolygon.geometry.coordinates[0][0] as any[]);
            const existingCoords =
              existingPolygon.geometry.type === 'Polygon'
                ? (existingPolygon.geometry.coordinates[0] as any[])
                : (existingPolygon.geometry.coordinates[0][0] as any[]);

            const draggedInside = this.turfHelper.isWithin(draggedCoords, existingCoords);

            // Check if existing polygon is completely inside dragged polygon
            const existingInside = this.turfHelper.isWithin(existingCoords, draggedCoords);

            intersects = draggedInside || existingInside;
          } catch (error) {
            console.warn('Error checking containment:', error.message);
          }
        }

        if (intersects) {
          intersectingFeatureGroups.push(featureGroup);
        }
      } catch (error) {
        console.warn('Error checking polygon intersection:', error.message);
      }
    }

    return intersectingFeatureGroups;
  }

  /**
   * Reset modifier drag state
   */
  resetModifierDragState(): void {
    this.currentModifierDragMode = false;
    this.isModifierKeyHeld = false;
  }
}
