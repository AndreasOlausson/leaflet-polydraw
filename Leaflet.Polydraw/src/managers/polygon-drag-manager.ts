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
    private addPolygonLayerCallback?: (geoJSON: any, simplify: boolean) => void,
    private updatePolygonInformationCallback?: () => void,
  ) {}

  /**
   * Enable polygon dragging functionality on a polygon layer
   *
   * TODO - FUTURE IMPROVEMENTS:
   * 1. Split into smaller methods:
   *    - initializePolygonDragData() - data setup (5 lines)
   *    - registerPolygonDragEvents() - event registration (1 line)
   *    - setupPolygonCursorManagement() - cursor logic (40 lines)
   * 2. Extract cursor management into reusable utility
   * 3. Separate condition logic for better testability
   * 4. Centralize DOM error handling
   * 5. Consider using WeakMap for polygon metadata instead of direct properties
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
   *
   * TODO - FUTURE IMPROVEMENTS:
   * 1. Split into smaller methods:
   *    - initializeDragState() - setup drag data (10 lines)
   *    - handleModifierDetection() - modifier key logic (5 lines)
   *    - setupDragVisualFeedback() - visual changes (15 lines)
   *    - registerDragEventHandlers() - event registration (5 lines)
   * 2. Extract modifier key detection into utility function
   * 3. Separate visual feedback logic for better testability
   * 4. Add drag state validation
   * 5. Improve error handling for DOM operations
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
   *
   * TODO - FUTURE IMPROVEMENTS:
   * 1. Extract offset calculation into utility method
   * 2. Separate modifier key checking logic
   * 3. Add drag boundary validation
   * 4. Optimize coordinate transformation
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
   *
   * TODO - FUTURE IMPROVEMENTS:
   * 1. Split into smaller methods:
   *    - cleanupDragState() - state cleanup (10 lines)
   *    - restoreMapInteraction() - map state restoration (5 lines)
   *    - finalizePolygonPosition() - coordinate updates (10 lines)
   * 2. Extract event emission logic
   * 3. Improve error handling for coordinate updates
   * 4. Add drag completion validation
   */
  private onPolygonMouseUp(e: L.LeafletMouseEvent) {
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
    this.updatePolygonCoordinates(polygon, polygon._polydrawFeatureGroup, polygon._polydrawLatLngs);

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
   * Detect if modifier key is pressed during drag operation
   *
   * TODO - FUTURE IMPROVEMENTS:
   * 1. Extract platform detection into utility
   * 2. Add support for configurable modifier keys
   * 3. Improve cross-browser compatibility
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
   *
   * TODO - FUTURE IMPROVEMENTS:
   * 1. Extract color management into theme utility
   * 2. Add animation transitions for visual changes
   * 3. Support custom visual feedback modes
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
   * Handle marker and polyline behavior during polygon drag
   *
   * TODO - FUTURE IMPROVEMENTS:
   * 1. Extract animation logic into utility
   * 2. Support different marker behaviors (fade, hide, scale)
   * 3. Add configurable animation timing
   * 4. Optimize DOM manipulation performance
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
   * Apply offset to polygon coordinates
   *
   * TODO - FUTURE IMPROVEMENTS:
   * 1. Add coordinate validation
   * 2. Support different coordinate systems
   * 3. Optimize for large polygons
   * 4. Add boundary checking
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
   * Handle modifier key toggle during active drag operation
   *
   * TODO - FUTURE IMPROVEMENTS:
   * 1. Add smooth visual transitions
   * 2. Support multiple modifier keys
   * 3. Add modifier key state persistence
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
   * Update polygon coordinates after drag
   *
   * TODO - FUTURE IMPROVEMENTS:
   * 1. Split into smaller methods:
   *    - handleModifierDragLogic() - modifier-based operations (50 lines)
   *    - handleNormalDragLogic() - standard drag operations (80 lines)
   *    - processInteractionResults() - interaction handling (40 lines)
   *    - updatePolygonInformation() - info storage updates (10 lines)
   * 2. Extract intersection detection into utility
   * 3. Separate merge/hole logic into dedicated handlers
   * 4. Add comprehensive error recovery
   * 5. Optimize performance for large polygon operations
   */
  private updatePolygonCoordinates(
    polygon: any,
    featureGroup: L.FeatureGroup,
    originalLatLngs: Feature<Polygon | MultiPolygon>,
  ): void {
    try {
      // Get new coordinates from dragged polygon
      const newLatLngs = polygon.getLatLngs();

      // Convert to GeoJSON format
      const newGeoJSON = polygon.toGeoJSON();

      // Check if modifier key was held during drag FIRST (before removing from array)
      if (this.isModifierDragActive()) {
        // Modifier key held - perform subtract operation
        let draggedPolygonFeature;
        try {
          draggedPolygonFeature = this.turfHelper.getTurfPolygon(newGeoJSON);
        } catch (error) {
          console.error('Error creating dragged polygon feature:', error);
          // Fallback: just add the polygon normally
          this.addPolygonLayer(newGeoJSON, false);
          return;
        }

        let intersectingFeatureGroups;
        try {
          intersectingFeatureGroups = this.findIntersectingPolygons(
            draggedPolygonFeature,
            featureGroup,
          );
        } catch (error) {
          console.error('Error in findIntersectingPolygons:', error);
          return;
        }

        // NOW remove the old feature group
        if (this.map && this.map.removeLayer) {
          this.map.removeLayer(featureGroup);
        }
        const featureGroupIndex = this.arrayOfFeatureGroups.indexOf(featureGroup);
        if (featureGroupIndex !== -1) {
          this.arrayOfFeatureGroups.splice(featureGroupIndex, 1);
        }

        this.performModifierSubtract(draggedPolygonFeature, intersectingFeatureGroups);

        // Reset modifier state after operation
        this.currentModifierDragMode = false;
        this.isModifierKeyHeld = false;
        return; // Exit early - don't do normal merge logic
      } else {
        // Normal drag behavior - remove the old feature group first
        if (this.map && this.map.removeLayer) {
          this.map.removeLayer(featureGroup);
        }
        const featureGroupIndex = this.arrayOfFeatureGroups.indexOf(featureGroup);
        if (featureGroupIndex !== -1) {
          this.arrayOfFeatureGroups.splice(featureGroupIndex, 1);
        }

        // Check for auto-interactions
        let interactionResult = {
          shouldMerge: false,
          shouldCreateHole: false,
          intersectingFeatureGroups: [] as L.FeatureGroup[],
          containingFeatureGroup: null as L.FeatureGroup | null,
        };

        try {
          const draggedPolygonFeature = this.turfHelper.getTurfPolygon(newGeoJSON);
          interactionResult = this.checkDragInteractions(draggedPolygonFeature, featureGroup);
        } catch (turfError) {
          console.warn('Turf operations not available:', turfError.message);
        }

        if (interactionResult.shouldMerge) {
          // Merge with intersecting polygons
          this.performDragMerge(
            this.turfHelper.getTurfPolygon(newGeoJSON),
            interactionResult.intersectingFeatureGroups,
          );
        } else if (interactionResult.shouldCreateHole) {
          // Create hole in containing polygon
          this.performDragHole(
            this.turfHelper.getTurfPolygon(newGeoJSON),
            interactionResult.containingFeatureGroup,
          );
        } else {
          // No interaction - just update position
          this.addPolygonLayer(newGeoJSON, false);
        }
      }

      // Update polygon information storage
      this.updatePolygonInformation();
    } catch (error) {
      console.warn('Failed to update polygon coordinates:', error.message);

      // Fallback: revert to original position
      try {
        polygon.setLatLngs(originalLatLngs);
      } catch (revertError) {
        console.warn('Could not revert polygon position:', revertError.message);
      }
    }
  }

  // TODO: Add remaining supporting methods
  private isModifierDragActive(): boolean {
    return this.currentModifierDragMode;
  }

  private findIntersectingPolygons(
    draggedPolygon: any,
    excludeFeatureGroup: L.FeatureGroup,
  ): L.FeatureGroup[] {
    // Placeholder - will be implemented next
    return [];
  }

  private performModifierSubtract(
    draggedPolygon: any,
    intersectingFeatureGroups: L.FeatureGroup[],
  ): void {
    // Placeholder - will be implemented next
  }

  private checkDragInteractions(draggedPolygon: any, excludeFeatureGroup: L.FeatureGroup): any {
    // Placeholder - will be implemented next
    return {
      shouldMerge: false,
      shouldCreateHole: false,
      intersectingFeatureGroups: [],
      containingFeatureGroup: null,
    };
  }

  private performDragMerge(draggedPolygon: any, intersectingFeatureGroups: L.FeatureGroup[]): void {
    // Placeholder - will be implemented next
  }

  private performDragHole(draggedPolygon: any, containingFeatureGroup: L.FeatureGroup): void {
    // Placeholder - will be implemented next
  }

  private addPolygonLayer(geoJSON: any, simplify: boolean): void {
    if (this.addPolygonLayerCallback) {
      this.addPolygonLayerCallback(geoJSON, simplify);
    } else {
      console.warn('addPolygonLayerCallback not provided');
    }
  }

  private updatePolygonInformation(): void {
    if (this.updatePolygonInformationCallback) {
      this.updatePolygonInformationCallback();
    }
  }
}
