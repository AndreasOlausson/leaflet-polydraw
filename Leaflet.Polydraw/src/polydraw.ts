/**
 * Polydraw is a Leaflet control for drawing, editing, and managing polygons on a map.
 * It provides tools for adding, subtracting, and modifying polygons with various features like simplification and merging.
 */
import * as L from 'leaflet';
import defaultConfig from './config.json';
import { DrawMode, MarkerPosition } from './enums';
import { TurfHelper } from './turf-helper';
import { createButtons } from './buttons';
import { PolygonInformationService } from './polygon-information.service';
import { MapStateService } from './map-state';
import type { ILatLng } from './polygon-helpers';
import { Compass, PolyDrawUtil, Perimeter, Area } from './utils';
import { IconFactory } from './icon-factory';
import { PolygonUtil } from './polygon.util';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import * as turf from '@turf/turf';
// @ts-ignore
import './styles/polydraw.css';

class Polydraw extends L.Control {
  private map: L.Map;
  private tracer: L.Polyline = {} as any;
  private arrayOfFeatureGroups: L.FeatureGroup<L.Layer>[] = [];
  private kinks: boolean;
  private mergePolygons: boolean;
  private drawMode: DrawMode = DrawMode.Off;
  private drawModeListeners: ((mode: DrawMode) => void)[] = [];
  private currentPolygonHasKinks: boolean = false;
  private turfHelper: TurfHelper;

  private subContainer?: HTMLElement;
  private config: any;

  private mapStateService: MapStateService;

  private polygonInformation: PolygonInformationService;

  // Drag state management
  private dragStartPosition: any = null;
  private isDragging: boolean = false;
  private currentDragPolygon: any = null;

  // Modifier key drag state management
  private isModifierKeyHeld: boolean = false;
  private currentModifierDragMode: boolean = false;

  constructor(options?: L.ControlOptions & { config?: any }) {
    super(options);
    this.config = { ...defaultConfig, ...(options?.config || {}) };
    this.mergePolygons = this.config.mergePolygons ?? true;
    this.kinks = this.config.kinks ?? false;
    this.turfHelper = new TurfHelper(this.config);
    this.mapStateService = new MapStateService();
    this.polygonInformation = new PolygonInformationService(this.mapStateService);
    this.polygonInformation.onPolygonInfoUpdated((k) => {
      // Handle polygon info update
    });
  }

  configurate(config: any) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Initializes the control when added to the map, setting up UI elements and event listeners.
   * @param _map The Leaflet map instance.
   * @returns The DOM element for the control.
   */
  onAdd(_map: L.Map): HTMLElement {
    this.map = _map;
    const style = document.createElement('style');
    style.innerHTML = `
      .leaflet-control a { background-color: #fff; color: #000; display: flex; align-items: center; justify-content: center; }
      .leaflet-control a:hover { background-color: #f4f4f4; }
      .leaflet-control a.active { background-color:rgb(128, 218, 255); color: #fff; }
      .crosshair-cursor-enabled { cursor: crosshair !important; }
      .crosshair-cursor-enabled * { cursor: crosshair !important; }

      `;
    document.head.appendChild(style);
    const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
    container.style.display = 'flex';
    container.style.flexDirection = 'column-reverse';

    this.subContainer = L.DomUtil.create('div', 'sub-buttons', container);
    this.subContainer.style.maxHeight = '0px';
    this.subContainer.style.overflow = 'hidden';
    this.subContainer.style.transition = 'max-height 0.3s ease';

    const onActivateToggle = () => {
      const activate = container.querySelector('.icon-activate') as HTMLElement;
      if (L.DomUtil.hasClass(activate, 'active')) {
        L.DomUtil.removeClass(activate, 'active');
        if (this.subContainer) {
          this.subContainer.style.maxHeight = '0px';
        }
      } else {
        L.DomUtil.addClass(activate, 'active');
        if (this.subContainer) {
          this.subContainer.style.maxHeight = '250px';
        }
      }
    };

    const onDrawClick = () => {
      // Set to add mode for drawing new polygons
      this.setDrawMode(DrawMode.Add);
      this.polygonInformation.saveCurrentState();
    };

    const onSubtractClick = () => {
      // Set to subtract mode for removing areas from existing polygons
      this.setDrawMode(DrawMode.Subtract);
      this.polygonInformation.saveCurrentState();
    };

    const onEraseClick = () => {
      // Clear all polygons
      this.removeAllFeatureGroups();
    };

    // const onStarClick = () => {
    //   // Add a predefined star-shaped polygon
    //   // const star: ILatLng[][][] = [[[
    //   //   { lat: 58.391747, lng: 15.613276 },
    //   //   { lat: 58.396747, lng: 15.617276 },
    //   //   { lat: 58.398747, lng: 15.609276 },
    //   //   { lat: 58.400747, lng: 15.617276 },
    //   //   { lat: 58.404747, lng: 15.613276 },
    //   //   { lat: 58.402747, lng: 15.621276 },
    //   //   { lat: 58.406747, lng: 15.625276 },
    //   //   { lat: 58.402747, lng: 15.629276 },
    //   //   { lat: 58.404747, lng: 15.637276 },
    //   //   { lat: 58.400747, lng: 15.633276 },
    //   //   { lat: 58.398747, lng: 15.641276 },
    //   //   { lat: 58.396747, lng: 15.633276 },
    //   //   { lat: 58.391747, lng: 15.637276 },
    //   //   { lat: 58.393747, lng: 15.629276 },
    //   //   { lat: 58.389747, lng: 15.625276 },
    //   //   { lat: 58.393747, lng: 15.621276 },
    //   //   { lat: 58.391747, lng: 15.613276 }
    //   // ]]];
    //   const star: ILatLng[][][] = [[[
    //     { lat: 0, lng: 0 },
    //     { lat: 0, lng: 20 },
    //     { lat: 20, lng: 20 },
    //     { lat: 20, lng: 0 },
    //     { lat: 0, lng: 0 }
    //   ]]];
    //   this.addAutoPolygon(star as any);
    // };

    // const onHoleClick = () => {
    //   // Add a predefined polygon with a hole
    //   const pn0254: ILatLng[][][] = [[
    //     [
    //       { lat: 58.402514, lng: 15.606188 },
    //       { lat: 58.400691, lng: 15.607462 },
    //       { lat: 58.400957, lng: 15.608783 },
    //       { lat: 58.400674, lng: 15.610521 },
    //       { lat: 58.401060, lng: 15.611603 },
    //       { lat: 58.400907, lng: 15.612135 },
    //       { lat: 58.400623, lng: 15.611772 },
    //       { lat: 58.400534, lng: 15.613026 },
    //       { lat: 58.401247, lng: 15.613070 },
    //       { lat: 58.401030, lng: 15.613723 },
    //       { lat: 58.401579, lng: 15.615028 },
    //       { lat: 58.401997, lng: 15.612879 },
    //       { lat: 58.402192, lng: 15.613048 },
    //       { lat: 58.402807, lng: 15.611604 },
    //       { lat: 58.403252, lng: 15.612538 },
    //       { lat: 58.403960, lng: 15.611810 },
    //       { lat: 58.403596, lng: 15.609680 },
    //       { lat: 58.403315, lng: 15.610102 },
    //       { lat: 58.402876, lng: 15.609084 },
    //       { lat: 58.403180, lng: 15.608155 },
    //       { lat: 58.403028, lng: 15.607659 },
    //       { lat: 58.402723, lng: 15.608029 },
    //       { lat: 58.402514, lng: 15.606188 }
    //     ],
    //     [
    //       { lat: 58.401980, lng: 15.611379 },
    //       { lat: 58.402183, lng: 15.610801 },
    //       { lat: 58.402351, lng: 15.611059 },
    //       { lat: 58.401779, lng: 15.612904 },
    //       { lat: 58.401219, lng: 15.612407 },
    //       { lat: 58.401301, lng: 15.611257 },
    //       { lat: 58.401980, lng: 15.611379 }
    //     ]
    //   ]];
    //   this.addAutoPolygon(pn0254 as any);
    // };

    createButtons(
      container,
      this.subContainer,
      onActivateToggle,
      onDrawClick,
      onSubtractClick,
      onEraseClick,
      null,
      null,
    );

    // Add listener to update button active states based on draw mode
    this.drawModeListeners.push((mode) => {
      const drawButton = container.querySelector('.icon-draw') as HTMLElement;
      const subtractButton = container.querySelector('.icon-subtract') as HTMLElement;
      if (drawButton) drawButton.classList.toggle('active', mode === DrawMode.Add);
      if (subtractButton) subtractButton.classList.toggle('active', mode === DrawMode.Subtract);
    });

    this.tracer = L.polyline([], this.config.polyLineOptions);
    try {
      this.tracer.addTo(this.map);
    } catch (error) {
      // Handle case where map renderer is not initialized (e.g., in test environment)
      console.warn('Could not add tracer to map:', error.message);
    }
    // this.tracer = L.polyline([], { color: 'red' }).addTo(_map);
    // this.markerLayer = L.layerGroup().addTo(_map);
    return container;
  }

  addAutoPolygon(geographicBorders: L.LatLng[][][]): void {
    geographicBorders.forEach((group) => {
      let featureGroup: L.FeatureGroup = new L.FeatureGroup();

      let polygon2 = this.turfHelper.getMultiPolygon(this.convertToCoords(group));
      // Processed polygon
      let polygon = this.getPolygon(polygon2);

      featureGroup.addLayer(polygon);
      let markerLatlngs = polygon.getLatLngs();
      // Marker positions
      markerLatlngs.forEach((polygon) => {
        polygon.forEach((polyElement, i) => {
          if (i === 0) {
            this.addMarker(polyElement, featureGroup);
          } else {
            this.addHoleMarker(polyElement, featureGroup);
            // Hole processed
          }
        });
        // this.addMarker(polygon[0], featureGroup);
        //TODO - If polygon.length >1, it have a hole: add explicit addMarker function
      });

      this.arrayOfFeatureGroups.push(featureGroup);
      this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
    });
  }

  setDrawMode(mode: DrawMode) {
    // Update the drawing mode and associated map behaviors
    this.drawMode = mode;
    this.emitDrawModeChanged();

    // Always stop any current drawing when changing modes
    this.stopDraw();

    if (!!this.map) {
      let isActiveDrawMode = true;
      switch (mode) {
        case DrawMode.Off:
          L.DomUtil.removeClass(this.map.getContainer(), 'crosshair-cursor-enabled');
          this.events(false);
          // Handle tracer setStyle errors in test environment
          try {
            this.tracer.setStyle({
              color: '',
            });
          } catch (error) {
            // Handle case where tracer renderer is not initialized (e.g., in test environment)
          }
          this.setLeafletMapEvents(true, true, true);
          isActiveDrawMode = false;
          break;
        case DrawMode.Add:
          L.DomUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
          this.events(true);
          // Handle tracer setStyle errors in test environment
          try {
            this.tracer.setStyle({
              color: defaultConfig.polyLineOptions.color,
            });
          } catch (error) {
            // Handle case where tracer renderer is not initialized (e.g., in test environment)
          }
          this.setLeafletMapEvents(false, false, false);
          break;
        case DrawMode.Subtract:
          L.DomUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
          this.events(true);
          // Handle tracer setStyle errors in test environment
          try {
            this.tracer.setStyle({
              color: '#D9460F',
            });
          } catch (error) {
            // Handle case where tracer renderer is not initialized (e.g., in test environment)
          }
          this.setLeafletMapEvents(false, false, false);
          break;
      }
    }
  }
  deletePolygon(polygon: ILatLng[][]) {
    // Delete a specific polygon from the map
    if (this.arrayOfFeatureGroups.length > 0) {
      this.arrayOfFeatureGroups.forEach((featureGroup) => {
        let layer = featureGroup.getLayers()[0] as any;
        let latlngs = layer.getLatLngs();
        let length = latlngs.length;
        //  = []
        latlngs.forEach((latlng, index) => {
          let polygon3;
          let test = [...latlng];

          // latlng
          if (latlng.length > 1) {
            if (latlng[0][0] !== latlng[0][latlng[0].length - 1]) {
              test[0].push(latlng[0][0]);
            }
            polygon3 = [test[0]];
          } else {
            if (latlng[0] !== latlng[latlng.length - 1]) {
              test.push(latlng[0]);
            }
            polygon3 = test;
          }

          // Test polygon3

          // polygon

          const equals = this.polygonArrayEquals(polygon3, polygon);
          // Check if polygons match for deletion
          if (equals && length === 1) {
            this.polygonInformation.deleteTrashcan(polygon);

            this.removeFeatureGroup(featureGroup);
            // featureGroup layers
          } else if (equals && length > 1) {
            this.polygonInformation.deleteTrashCanOnMulti([polygon]);
            latlngs.splice(index, 1);
            layer.setLatLngs(latlngs);
            this.removeFeatureGroup(featureGroup);
            this.addPolygonLayer(layer.toGeoJSON(), false);
          }
        });
      });
    }
  }

  removeAllFeatureGroups() {
    // Clear all feature groups and reset state
    this.arrayOfFeatureGroups.forEach((featureGroups) => {
      this.map.removeLayer(featureGroups);
    });

    this.arrayOfFeatureGroups = [];
    this.polygonInformation.deletePolygonInformationStorage();
    // this.polygonDrawStates.reset();
    this.polygonInformation.updatePolygons();
  }

  getDrawMode(): DrawMode {
    return this.drawMode;
  }

  private stopDraw() {
    // Stop the drawing process and reset tracers

    this.resetTracker();
    this.drawStartedEvents(false);
  }
  private setLeafletMapEvents(
    enableDragging: boolean,
    enableDoubleClickZoom: boolean,
    enableScrollWheelZoom: boolean,
  ) {
    // Toggle map interaction events based on drawing mode

    enableDragging ? this.map.dragging.enable() : this.map.dragging.disable();
    enableDoubleClickZoom ? this.map.doubleClickZoom.enable() : this.map.doubleClickZoom.disable();
    enableScrollWheelZoom ? this.map.scrollWheelZoom.enable() : this.map.scrollWheelZoom.disable();
  }
  private resetTracker() {
    // Reset tracer to empty coordinates instead of invalid single point
    this.tracer.setLatLngs([]);
  }
  private drawStartedEvents(onoff: boolean) {
    // Enable or disable events for drawing

    const onoroff = onoff ? 'on' : 'off';

    this.map[onoroff]('mousemove', this.mouseMove, this);
    this.map[onoroff]('mouseup', this.mouseUpLeave, this);
    if (onoff) {
      this.map.getContainer().addEventListener('touchmove', (e) => this.mouseMove(e));
      this.map.getContainer().addEventListener('touchend', (e) => this.mouseUpLeave(e));
    } else {
      this.map.getContainer().removeEventListener('touchmove', (e) => this.mouseMove(e), true);
      this.map.getContainer().removeEventListener('touchmove', (e) => this.mouseMove(e), true);
      this.map.getContainer().removeEventListener('touchend', (e) => this.mouseUpLeave(e), true);
    }
  }
  private mouseMove(event) {
    // Update the tracer line as the mouse moves
    if (event.originalEvent != null) {
      this.tracer.addLatLng(event.latlng);
    } else {
      const latlng = this.map.containerPointToLatLng([
        event.touches[0].clientX,
        event.touches[0].clientY,
      ]);

      this.tracer.addLatLng(latlng);
    }
  }
  private mouseUpLeave(event) {
    this.polygonInformation.deletePolygonInformationStorage();

    const tracerGeoJSON = this.tracer.toGeoJSON() as any;

    // Check if tracer has valid coordinates before processing
    if (
      !tracerGeoJSON ||
      !tracerGeoJSON.geometry ||
      !tracerGeoJSON.geometry.coordinates ||
      tracerGeoJSON.geometry.coordinates.length < 3
    ) {
      // Not enough points to form a valid polygon, just stop drawing
      this.stopDraw();
      return;
    }

    let geoPos: Feature<Polygon | MultiPolygon>;
    try {
      geoPos = this.turfHelper.turfConcaveman(tracerGeoJSON);
    } catch (error) {
      console.warn('Failed to create polygon from tracer:', error.message);
      this.stopDraw();
      return;
    }

    this.stopDraw();

    this.currentPolygonHasKinks = false;

    switch (this.getDrawMode()) {
      case DrawMode.Add:
        this.addPolygon(geoPos, true);
        break;
      case DrawMode.Subtract:
        this.subtractPolygon(geoPos);
        break;
      default:
        break;
    }
    this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
  }

  private subtractPolygon(latlngs: Feature<Polygon | MultiPolygon>) {
    this.subtract(latlngs);
  }
  //fine
  private addPolygon(
    latlngs: Feature<Polygon | MultiPolygon>,
    simplify: boolean,
    noMerge: boolean = false,
  ) {
    // Add a new polygon, potentially merging with existing ones
    // Use currentPolygonHasKinks for runtime state, fallback to global kinks config
    const hasKinks = this.currentPolygonHasKinks || this.kinks;

    if (this.mergePolygons && !noMerge && this.arrayOfFeatureGroups.length > 0 && !hasKinks) {
      this.merge(latlngs);
    } else {
      this.addPolygonLayer(latlngs, simplify);
    }
  }
  private subtract(latlngs: Feature<Polygon | MultiPolygon>) {
    let addHole = latlngs;
    let newPolygons = [];
    this.arrayOfFeatureGroups.forEach((featureGroup) => {
      let featureCollection = featureGroup.toGeoJSON() as any;
      const layer = featureCollection.features[0];
      let poly = this.getLatLngsFromJson(layer);
      let feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
      let newPolygon = this.turfHelper.polygonDifference(feature, addHole);
      if (newPolygon) {
        newPolygons.push(newPolygon);
      }
      this.deletePolygon(poly);
      this.removeFeatureGroupOnMerge(featureGroup);
    });
    // After subtracting from all, add the remaining polygons
    newPolygons.forEach((np) => {
      this.addPolygon(np, true, true);
    });
  }
  private getLatLngsFromJson(feature: Feature<Polygon | MultiPolygon>): ILatLng[][] {
    // Extract LatLng coordinates from GeoJSON feature
    let coord;
    if (feature) {
      if (feature.geometry.coordinates.length > 1 && feature.geometry.type === 'MultiPolygon') {
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]);
      } else if (
        feature.geometry.coordinates[0].length > 1 &&
        feature.geometry.type === 'Polygon'
      ) {
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0]);
      } else {
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]);
      }
    }

    return coord;
  }
  private removeFeatureGroupOnMerge(featureGroup: L.FeatureGroup) {
    // Remove a feature group during merge operations

    let newArray = [];
    if (featureGroup.getLayers()[0]) {
      let polygon = (featureGroup.getLayers()[0] as any).getLatLngs()[0];
      this.polygonInformation.polygonInformationStorage.forEach((v) => {
        if (
          v.polygon.toString() !== polygon[0].toString() &&
          v.polygon[0].toString() === polygon[0][0].toString()
        ) {
          v.polygon = polygon;
          newArray.push(v);
        }

        if (
          v.polygon.toString() !== polygon[0].toString() &&
          v.polygon[0].toString() !== polygon[0][0].toString()
        ) {
          newArray.push(v);
        }
      });
      featureGroup.clearLayers();
      this.arrayOfFeatureGroups = this.arrayOfFeatureGroups.filter(
        (featureGroups) => featureGroups !== featureGroup,
      );

      this.map.removeLayer(featureGroup);
    }
  }

  private removeFeatureGroup(featureGroup: L.FeatureGroup) {
    // Remove a feature group from the map

    featureGroup.clearLayers();
    this.arrayOfFeatureGroups = this.arrayOfFeatureGroups.filter(
      (featureGroups) => featureGroups !== featureGroup,
    );
    // this.updatePolygons();
    this.map.removeLayer(featureGroup);
  }

  private polygonArrayEqualsMerge(poly1: any[], poly2: any[]): boolean {
    return poly1.toString() === poly2.toString();
  }
  private polygonArrayEquals(poly1: any[], poly2: any[]): boolean {
    // Compare two polygon arrays for equality

    if (poly1[0][0]) {
      if (!poly1[0][0].equals(poly2[0][0])) return false;
    } else {
      if (!poly1[0].equals(poly2[0])) return false;
    }
    if (poly1.length !== poly2.length) return false;
    else {
      return true;
    }
  }
  private addPolygonLayer(
    latlngs: Feature<Polygon | MultiPolygon>,
    simplify: boolean,
    dynamicTolerance: boolean = false,
  ) {
    let featureGroup: L.FeatureGroup = new L.FeatureGroup();

    const latLngs = simplify ? this.turfHelper.getSimplified(latlngs, dynamicTolerance) : latlngs;
    // Create and add a new polygon layer
    let polygon = this.getPolygon(latLngs);
    featureGroup.addLayer(polygon);

    // Enable polygon dragging if configured
    if (this.config.modes.dragPolygons) {
      this.enablePolygonDragging(polygon, featureGroup, latLngs);
    }

    // Add red polylines for hole rings and markers
    let markerLatlngs = polygon.getLatLngs();

    markerLatlngs.forEach((polygonRings) => {
      polygonRings.forEach((polyElement: ILatLng[], i: number) => {
        // Ring 0 = outer ring (green markers, green lines)
        // Ring 1+ = holes (red markers, red lines)
        // For polygons with holes: ring 0 is outer, all other rings (1, 2, 3...) are holes
        const isHoleRing = i > 0; // All rings after the first are holes

        // Add red polyline overlay for hole rings
        if (isHoleRing) {
          const holePolyline = L.polyline(polyElement, {
            color: this.config.holeOptions.color,
            weight: this.config.holeOptions.weight || 2,
            opacity: this.config.holeOptions.opacity || 1,
          });
          featureGroup.addLayer(holePolyline);
        }

        // Add markers
        if (isHoleRing) {
          this.addHoleMarker(polyElement, featureGroup);
        } else {
          this.addMarker(polyElement, featureGroup);
        }
      });
    });

    this.arrayOfFeatureGroups.push(featureGroup);
    // Updated array of feature groups
    this.setDrawMode(DrawMode.Off);

    featureGroup.on('click', (e) => {
      this.polygonClicked(e, latLngs);
    });
  }
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
  private getLatLngInfoString(latlng: ILatLng): string {
    return 'Latitude: ' + latlng.lat + ' Longitude: ' + latlng.lng;
  }
  private addMarker(latlngs: ILatLng[], FeatureGroup: L.FeatureGroup) {
    // Add markers to the polygon for editing and info
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
      // Use normal green marker classes for outer rings and islands (even ring indices)
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
      const marker = new L.Marker(latlng, {
        icon: IconFactory.createDivIcon(iconClasses),
        draggable: this.config.modes.dragElbow,
        title: this.config.markers.coordsTitle ? this.getLatLngInfoString(latlng) : '',
        zIndexOffset:
          this.config.markers.markerIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
      });
      FeatureGroup.addLayer(marker).addTo(this.map);
      if (i === menuMarkerIdx || i === deleteMarkerIdx || i === infoMarkerIdx) {
        const element = marker.getElement();
        if (element) {
          element.style.zIndex = '10000';
        }
      }
      // FeatureGroup.addLayer(marker)
      // markers.addLayer(marker);
      // console.log("FeatureGroup: ", FeatureGroup);
      if (this.config.modes.dragElbow) {
        marker.on('drag', (e) => {
          this.markerDrag(FeatureGroup);
        });
        marker.on('dragend', (e) => {
          this.markerDragEnd(FeatureGroup);
        });
      }

      if (i === menuMarkerIdx && this.config.markers.menuMarker) {
        const menuPopup = this.generateMenuMarkerPopup(latlngs);
        marker.options.zIndexOffset =
          this.config.markers.markerMenuIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
        marker.bindPopup(menuPopup, { className: 'alter-marker' });
      }
      if (i === infoMarkerIdx && this.config.markers.infoMarker) {
        // Ensure the polygon is closed for accurate calculation
        let closedLatlngs = [...latlngs];
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
          this.deletePolygon([latlngs]);
        });
      }
    });
    //markers.addTo(this.map)
  }
  private generateMenuMarkerPopup(latLngs: ILatLng[]): any {
    const self = this;

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

    simplify.onclick = function () {
      self.convertToSimplifiedPolygon(latLngs);
      // do whatever else you want to do - open accordion etc
    };
    bbox.onclick = function () {
      self.convertToBoundsPolygon(latLngs);
      // do whatever else you want to do - open accordion etc
    };

    doubleElbows.onclick = function () {
      self.doubleElbows(latLngs);
      // do whatever else you want to do - open accordion etc
    };
    bezier.onclick = function () {
      self.bezierify(latLngs);
      // do whatever else you want to do - open accordion etc
    };

    return outerWrapper;
  }
  private convertToCoords(latlngs: ILatLng[][]) {
    let coords = [];
    // latlngs length
    if (latlngs.length > 1 && latlngs.length < 3) {
      let coordinates = [];
      // Coords of last polygon
      let within = this.turfHelper.isWithin(
        L.GeoJSON.latLngsToCoords(latlngs[latlngs.length - 1]),
        L.GeoJSON.latLngsToCoords(latlngs[0]),
      );
      if (within) {
        latlngs.forEach((polygon) => {
          coordinates.push(L.GeoJSON.latLngsToCoords(polygon));
        });
      } else {
        latlngs.forEach((polygon) => {
          coords.push([L.GeoJSON.latLngsToCoords(polygon)]);
        });
      }
      if (coordinates.length >= 1) {
        coords.push(coordinates);
      }
      // Within result
    } else if (latlngs.length > 2) {
      let coordinates = [];
      for (let index = 1; index < latlngs.length - 1; index++) {
        let within = this.turfHelper.isWithin(
          L.GeoJSON.latLngsToCoords(latlngs[index]),
          L.GeoJSON.latLngsToCoords(latlngs[0]),
        );
        if (within) {
          latlngs.forEach((polygon) => {
            coordinates.push(L.GeoJSON.latLngsToCoords(polygon));
          });
          coords.push(coordinates);
        } else {
          latlngs.forEach((polygon) => {
            coords.push([L.GeoJSON.latLngsToCoords(polygon)]);
          });
        }
      }
    } else {
      coords.push([L.GeoJSON.latLngsToCoords(latlngs[0])]);
    }
    // coords
    return coords;
  }
  private convertToBoundsPolygon(latlngs: ILatLng[]) {
    this.deletePolygon([latlngs]);
    let polygon = this.turfHelper.getMultiPolygon(this.convertToCoords([latlngs]));
    let newPolygon = this.turfHelper.convertToBoundingBoxPolygon(polygon);

    this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), false);
  }
  private convertToSimplifiedPolygon(latlngs: ILatLng[]) {
    this.deletePolygon([latlngs]);
    let newPolygon = this.turfHelper.getMultiPolygon(this.convertToCoords([latlngs]));
    this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), true, true);
  }
  private doubleElbows(latlngs: ILatLng[]) {
    this.deletePolygon([latlngs]);
    const doubleLatLngs: ILatLng[] = this.turfHelper.getDoubleElbowLatLngs(latlngs);
    let newPolygon = this.turfHelper.getMultiPolygon(this.convertToCoords([doubleLatLngs]));
    this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), false, false);
  }
  private bezierify(latlngs: ILatLng[]) {
    this.deletePolygon([latlngs]);
    let newPolygon = this.turfHelper.getBezierMultiPolygon(this.convertToCoords([latlngs]));
    this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), false, false);
  }
  private generateInfoMarkerPopup(area: number, perimeter: number): any {
    const _perimeter = new Perimeter(perimeter, this.config);
    const _area = new Area(area, this.config);
    const self = this;

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
    perimeterHeader.innerText = self.config.markers.markerInfoIcon.perimeterLabel;

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
    areaHeader.innerText = self.config.markers.markerInfoIcon.areaLabel;

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

    // const sup: HTMLElement = document.createElement("i");
    // sup.classList.add("sup");
    // sup.innerText = "2";

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
    // areaUnit.appendChild(sup);

    return outerWrapper;
  }
  private addHoleMarker(latlngs: ILatLng[], FeatureGroup: L.FeatureGroup) {
    latlngs.forEach((latlng, i) => {
      // Use hole-specific icon classes for markers on holes
      let iconClasses = this.config.markers.holeIcon.styleClasses;
      const marker = new L.Marker(latlng, {
        icon: IconFactory.createDivIcon(iconClasses),
        draggable: true,
        title: this.getLatLngInfoString(latlng),
        zIndexOffset: this.config.markers.holeIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
      });
      FeatureGroup.addLayer(marker).addTo(this.map);

      marker.on('drag', (e) => {
        this.markerDrag(FeatureGroup);
      });
      marker.on('dragend', (e) => {
        this.markerDragEnd(FeatureGroup);
      });
    });
  }
  private merge(latlngs: Feature<Polygon | MultiPolygon>) {
    // Merge the new polygon with existing ones if configured
    console.log('DEBUG: Starting merge process...');
    console.log('DEBUG: New polygon for merge:', JSON.stringify(latlngs.geometry.coordinates));
    console.log('DEBUG: Existing polygons count:', this.arrayOfFeatureGroups.length);

    let polygonFeature = [];
    const newArray: L.FeatureGroup[] = [];
    let polyIntersection: boolean = false;
    this.arrayOfFeatureGroups.forEach((featureGroup, index) => {
      let featureCollection = featureGroup.toGeoJSON() as any;
      console.log(
        `DEBUG: Checking intersection with polygon ${index}:`,
        JSON.stringify(featureCollection.features[0].geometry.coordinates),
      );

      if (featureCollection.features[0].geometry.coordinates.length > 1) {
        featureCollection.features[0].geometry.coordinates.forEach((element) => {
          let feature = this.turfHelper.getMultiPolygon([element]);
          polyIntersection = this.turfHelper.polygonIntersect(feature, latlngs);
          console.log(`DEBUG: MultiPolygon intersection result:`, polyIntersection);
          if (polyIntersection) {
            newArray.push(featureGroup);
            polygonFeature.push(feature);
          }
        });
      } else {
        let feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
        polyIntersection = this.turfHelper.polygonIntersect(feature, latlngs);
        console.log(`DEBUG: Polygon intersection result:`, polyIntersection);

        // WORKAROUND: If polygonIntersect fails, try using turf.intersect directly
        if (!polyIntersection) {
          try {
            const directIntersection = this.turfHelper.getIntersection(feature, latlngs);
            if (
              directIntersection &&
              directIntersection.geometry &&
              (directIntersection.geometry.type === 'Polygon' ||
                directIntersection.geometry.type === 'MultiPolygon')
            ) {
              console.log('DEBUG: Direct intersection found, overriding polygonIntersect result');
              polyIntersection = true;
            }
          } catch (error) {
            console.log('DEBUG: Direct intersection also failed:', error.message);
          }
        }
        if (polyIntersection) {
          newArray.push(featureGroup);
          polygonFeature.push(feature);
        }
      }
    });
    // Intersecting features
    console.log('DEBUG: Intersecting polygons found:', newArray.length);
    if (newArray.length > 0) {
      console.log('DEBUG: Calling unionPolygons...');
      this.unionPolygons(newArray, latlngs, polygonFeature);
    } else {
      console.log('DEBUG: No intersections found, adding polygon separately');
      this.addPolygonLayer(latlngs, true);
    }
  }
  private unionPolygons(layers, latlngs: Feature<Polygon | MultiPolygon>, polygonFeature) {
    // Enhanced union logic to handle complex merge scenarios including holes

    let resultPolygon = latlngs;
    const processedFeatureGroups: L.FeatureGroup[] = [];

    // Process each intersecting polygon
    layers.forEach((featureGroup, i) => {
      let featureCollection = featureGroup.toGeoJSON();
      const layer = featureCollection.features[0];
      let poly = this.getLatLngsFromJson(layer);
      const existingPolygon = polygonFeature[i];

      // Check the type of intersection to determine the correct operation
      const intersectionType = this.analyzeIntersectionType(resultPolygon, existingPolygon);

      if (intersectionType === 'should_create_holes') {
        // For complex cut-through scenarios, we actually want to MERGE (union) the polygons
        // The "should_create_holes" name is misleading - it means "complex intersection detected"
        const union = this.turfHelper.union(resultPolygon, existingPolygon);
        if (union) {
          resultPolygon = union;
        }
      } else {
        // Standard union operation for normal merges
        const union = this.turfHelper.union(resultPolygon, existingPolygon);
        if (union) {
          resultPolygon = union;
        }
      }

      // Mark for removal
      processedFeatureGroups.push(featureGroup);
      this.deletePolygonOnMerge(poly);
      this.removeFeatureGroup(featureGroup);
    });

    // Add the final result
    this.addPolygonLayer(resultPolygon, true);
  }

  /**
   * Analyze the type of intersection between two polygons to determine merge strategy
   */
  private analyzeIntersectionType(
    newPolygon: Feature<Polygon | MultiPolygon>,
    existingPolygon: Feature<Polygon | MultiPolygon>,
  ): string {
    try {
      // Check if the new polygon is completely contained within the existing polygon
      // This is the primary case where we want to create holes
      try {
        const difference = this.turfHelper.polygonDifference(existingPolygon, newPolygon);

        if (
          difference &&
          difference.geometry.type === 'Polygon' &&
          difference.geometry.coordinates.length > 1
        ) {
          // If difference creates a polygon with holes, the new polygon was likely contained
          console.log('DEBUG: New polygon is contained - should create holes');
          return 'should_create_holes';
        }
      } catch (error) {
        console.log('DEBUG: Difference operation failed:', error.message);
      }

      // Check if this is a complex cutting scenario using proper geometric analysis
      // instead of arbitrary vertex count
      try {
        // Method 1: Check convexity - complex shapes are usually non-convex
        const convexHull = turf.convex(turf.featureCollection([existingPolygon]));
        if (convexHull) {
          const convexArea = turf.area(convexHull);
          const actualArea = turf.area(existingPolygon);
          const convexityRatio = actualArea / convexArea;

          // If shape is significantly non-convex (< 0.7), it might be complex
          if (convexityRatio < 0.7) {
            const difference = this.turfHelper.polygonDifference(existingPolygon, newPolygon);
            if (difference && difference.geometry.type === 'MultiPolygon') {
              console.log(
                'DEBUG: Complex non-convex shape cut-through detected - should create holes',
              );
              return 'should_create_holes';
            }
          }
        }

        // Method 2: Check intersection complexity
        const intersection = this.turfHelper.getIntersection(newPolygon, existingPolygon);
        if (intersection && intersection.geometry.type === 'MultiPolygon') {
          // Multiple intersection areas = complex cut-through scenario
          console.log('DEBUG: Multiple intersection areas detected - should create holes');
          return 'should_create_holes';
        }

        // Method 3: Area ratio analysis for partial overlaps
        if (intersection) {
          const intersectionArea = turf.area(intersection);
          const newArea = turf.area(newPolygon);
          const existingArea = turf.area(existingPolygon);

          // Check if it's a significant but partial overlap (not full containment)
          const overlapRatioExisting = intersectionArea / existingArea;
          const overlapRatioNew = intersectionArea / newArea;

          if (
            overlapRatioExisting > 0.1 &&
            overlapRatioExisting < 0.9 &&
            overlapRatioNew > 0.1 &&
            overlapRatioNew < 0.9
          ) {
            // Significant partial overlap might indicate cut-through
            const difference = this.turfHelper.polygonDifference(existingPolygon, newPolygon);
            if (difference && difference.geometry.type === 'MultiPolygon') {
              console.log('DEBUG: Partial overlap cut-through detected - should create holes');
              return 'should_create_holes';
            }
          }
        }
      } catch (error) {
        console.log('DEBUG: Geometric analysis failed:', error.message);
      }

      // Default to standard union for normal merging cases
      return 'standard_union';
    } catch (error) {
      console.warn('Error analyzing intersection type:', error.message);
      return 'standard_union';
    }
  }

  private deletePolygonOnMerge(polygon) {
    // Delete polygon during merge
    let polygon2 = [];
    if (this.arrayOfFeatureGroups.length > 0) {
      this.arrayOfFeatureGroups.forEach((featureGroup) => {
        let layer = featureGroup.getLayers()[0] as any;
        let latlngs = layer.getLatLngs()[0];
        polygon2 = [...latlngs[0]];
        if (latlngs[0][0] !== latlngs[0][latlngs[0].length - 1]) {
          polygon2.push(latlngs[0][0]);
        }
        const equals = this.polygonArrayEqualsMerge(polygon2, polygon);

        if (equals) {
          // console.log("EQUALS", polygon);
          this.removeFeatureGroupOnMerge(featureGroup);
          this.deletePolygon(polygon);
          this.polygonInformation.deleteTrashcan(polygon);
          // this.updatePolygons();
        }
      });
    }
  }
  private getPolygon(latlngs: Feature<Polygon | MultiPolygon>) {
    // Create a Leaflet polygon from GeoJSON
    let polygon = L.GeoJSON.geometryToLayer(latlngs) as any;

    // Always use normal green polygon styling for the main polygon
    polygon.setStyle(this.config.polygonOptions);

    // Store hole information for later use in marker styling
    polygon._polydrawHasHoles = this.polygonHasHoles(latlngs);

    // Enable dragging by setting the draggable option
    // This is a workaround since GeoJSON layers don't have dragging by default
    if (polygon.setDraggable) {
      polygon.setDraggable(true);
    } else {
      // Alternative approach: add dragging capability manually
      polygon.options = polygon.options || {};
      polygon.options.draggable = true;

      // Initialize dragging if the method exists
      if (polygon._initInteraction) {
        polygon._initInteraction();
      }
    }

    return polygon;
  }

  /**
   * Check if a polygon has holes
   */
  private polygonHasHoles(feature: Feature<Polygon | MultiPolygon>): boolean {
    if (feature.geometry.type === 'Polygon') {
      // Polygon has holes if it has more than one ring (first ring is exterior, others are holes)
      return feature.geometry.coordinates.length > 1;
    } else if (feature.geometry.type === 'MultiPolygon') {
      // MultiPolygon has holes if any of its polygons have holes
      return feature.geometry.coordinates.some((polygon) => polygon.length > 1);
    }
    return false;
  }

  private polygonClicked(e: any, poly: Feature<Polygon | MultiPolygon>) {
    if (this.config.modes.attachElbow) {
      const newPoint = e.latlng;
      if (poly.geometry.type === 'MultiPolygon') {
        let newPolygon = this.turfHelper.injectPointToPolygon(poly, [newPoint.lng, newPoint.lat]);
        this.deletePolygon(this.getLatLngsFromJson(poly));
        this.addPolygonLayer(newPolygon, false);
      }
    }
  }
  // private polygonClicked(e: any, poly: Feature<Polygon | MultiPolygon>) {
  //   if (this.config.modes.attachElbow) {
  //     const newPoint = e.latlng;
  //     if (poly.geometry.type === "MultiPolygon") {
  //       let newPolygon = this.turfHelper.injectPointToPolygon(poly, [newPoint.lng, newPoint.lat]);
  //       this.deletePolygon(this.getLatLngsFromJson(poly));
  //       this.addPolygonLayer(newPolygon, false);
  //     }
  //   }
  // }
  // private unionPolygons(layers, latlngs: Feature<Polygon | MultiPolygon>, polygonFeature) {
  //   // console.log("unionPolygons", layers, latlngs, polygonFeature);

  //   let addNew = latlngs;
  //   layers.forEach((featureGroup, i) => {
  //     let featureCollection = featureGroup.toGeoJSON();
  //     const layer = featureCollection.features[0];
  //     let poly = this.getLatLngsFromJson(layer);
  //     const union = this.turfHelper.union(addNew, polygonFeature[i]); //Check for multipolygons
  //     //Needs a cleanup for the new version
  //     this.deletePolygonOnMerge(poly);
  //     this.removeFeatureGroup(featureGroup);

  //     addNew = union;
  //   });

  //   const newLatlngs: Feature<Polygon | MultiPolygon> = addNew; //Trenger kanskje this.turfHelper.getTurfPolygon( addNew);
  //   this.addPolygonLayer(newLatlngs, true);
  // }
  private events(onoff: boolean) {
    const onoroff = onoff ? 'on' : 'off';
    this.map[onoroff]('mousedown', this.mouseDown, this);
    if (onoff) {
      this.map.getContainer().addEventListener('touchstart', (e) => this.mouseDown(e));
    } else {
      this.map.getContainer().removeEventListener('touchstart', (e) => this.mouseDown(e), true);
    }
  }
  private mouseDown(event) {
    // Start drawing on mouse down
    let startLatLng;

    if (event.originalEvent != null) {
      startLatLng = event.latlng;
    } else {
      startLatLng = this.map.containerPointToLatLng([
        event.touches[0].clientX,
        event.touches[0].clientY,
      ]);
    }

    // Only set initial point if we have a valid latlng
    if (startLatLng && startLatLng.lat !== undefined && startLatLng.lng !== undefined) {
      this.tracer.setLatLngs([startLatLng]);
      this.startDraw();
    }
  }
  private startDraw() {
    // Initialize drawing process

    this.drawStartedEvents(true);
  }
  private markerDrag(FeatureGroup: L.FeatureGroup) {
    const newPos = [];
    let testarray = [];
    let hole = [];
    const allLayers = FeatureGroup.getLayers() as any;

    // Filter to get only polygon and markers (exclude polylines)
    const polygon = allLayers.find((layer) => layer instanceof L.Polygon);
    const markers = allLayers.filter((layer) => layer instanceof L.Marker);

    if (!polygon) return;

    let posarrays = polygon.getLatLngs();
    // position arrays
    let markerIndex = 0;

    if (posarrays.length > 1) {
      for (let index = 0; index < posarrays.length; index++) {
        testarray = [];
        hole = [];
        // Positions
        if (index === 0) {
          if (posarrays[0].length > 1) {
            for (let i = 0; i < posarrays[0].length; i++) {
              // Positions 2
              for (let j = 0; j < posarrays[0][i].length; j++) {
                if (markerIndex < markers.length) {
                  testarray.push(markers[markerIndex].getLatLng());
                  markerIndex++;
                }
              }
              hole.push(testarray);
            }
          } else {
            for (let j = 0; j < posarrays[0][0].length; j++) {
              if (markerIndex < markers.length) {
                testarray.push(markers[markerIndex].getLatLng());
                markerIndex++;
              }
            }
            hole.push(testarray);
          }
          // Hole
          newPos.push(hole);
        } else {
          // Start index for this ring
          for (let j = 0; j < posarrays[index][0].length; j++) {
            if (markerIndex < markers.length) {
              testarray.push(markers[markerIndex].getLatLng());
              markerIndex++;
            }
          }
          hole.push(testarray);
          newPos.push(hole);
        }
      }
    } else {
      // testarray = []
      hole = [];
      for (let index = 0; index < posarrays[0].length; index++) {
        testarray = [];
        // Polygon drag
        if (index === 0) {
          if (posarrays[0][index].length > 1) {
            for (let j = 0; j < posarrays[0][index].length; j++) {
              if (markerIndex < markers.length) {
                testarray.push(markers[markerIndex].getLatLng());
                markerIndex++;
              }
            }
          } else {
            for (let j = 0; j < posarrays[0][0].length; j++) {
              if (markerIndex < markers.length) {
                testarray.push(markers[markerIndex].getLatLng());
                markerIndex++;
              }
            }
          }
        } else {
          for (let j = 0; j < posarrays[0][index].length; j++) {
            if (markerIndex < markers.length) {
              testarray.push(markers[markerIndex].getLatLng());
              markerIndex++;
            }
          }
        }
        hole.push(testarray);
      }
      newPos.push(hole);
      // Hole 2
    }
    // Update positions during marker drag
    polygon.setLatLngs(newPos);

    // Also update any polyline overlays for hole rings
    const polylines = allLayers.filter(
      (layer) => layer instanceof L.Polyline && !(layer instanceof L.Polygon),
    );
    let polylineIndex = 0;

    for (let ringIndex = 0; ringIndex < newPos[0].length; ringIndex++) {
      const isHoleRing = ringIndex > 0; // All rings after the first are holes
      if (isHoleRing && polylineIndex < polylines.length) {
        polylines[polylineIndex].setLatLngs(newPos[0][ringIndex][0]);
        polylineIndex++;
      }
    }
  }
  // check this
  private markerDragEnd(FeatureGroup: L.FeatureGroup) {
    this.polygonInformation.deletePolygonInformationStorage();
    let featureCollection = FeatureGroup.toGeoJSON() as any;
    // Handle end of marker drag, check for kinks and update polygons
    this.removeFeatureGroup(FeatureGroup);

    if (featureCollection.features[0].geometry.coordinates.length > 1) {
      featureCollection.features[0].geometry.coordinates.forEach((element) => {
        let feature = this.turfHelper.getMultiPolygon([element]);

        // FIX: Use separate runtime state instead of overriding configuration
        // Check if the current polygon has kinks (self-intersections) after marker drag
        if (this.turfHelper.hasKinks(feature)) {
          // Set runtime state: current polygon has kinks
          this.currentPolygonHasKinks = true;
          let unkink = this.turfHelper.getKinks(feature);
          // Handle unkinked polygons - split kinked polygon into valid parts
          let testCoord = [];
          unkink.forEach((polygon) => {
            // Use addPolygon instead of direct addPolygonLayer to enable merging
            this.addPolygon(this.turfHelper.getTurfPolygon(polygon), false);
          });
        } else {
          // Set runtime state: current polygon is valid (no kinks)
          this.currentPolygonHasKinks = false;
          // Use addPolygon instead of direct call to enable merging
          this.addPolygon(feature, false);
        }
      });
    } else {
      let feature = this.turfHelper.getMultiPolygon(
        featureCollection.features[0].geometry.coordinates,
      );
      // Markerdragend
      if (this.turfHelper.hasKinks(feature)) {
        // FIX: Use separate runtime state instead of overriding configuration
        // Set runtime state: current polygon has kinks
        this.currentPolygonHasKinks = true;
        let unkink = this.turfHelper.getKinks(feature);
        // Unkink - split kinked polygon into valid parts
        let testCoord = [];
        unkink.forEach((polygon) => {
          // Use addPolygon instead of direct addPolygonLayer to enable merging
          this.addPolygon(this.turfHelper.getTurfPolygon(polygon), false);
        });
        // Test coordinates after processing
      } else {
        // FIX: Use separate runtime state instead of overriding configuration
        // Set runtime state: current polygon is valid (no kinks)
        this.currentPolygonHasKinks = false;
        // Use addPolygon instead of direct call to enable merging
        this.addPolygon(feature, false);
      }
    }
    // Updated feature groups after drag
    this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
  }

  private emitDrawModeChanged(): void {
    for (const cb of this.drawModeListeners) {
      cb(this.drawMode);
    }
  }

  /**
   * Enable polygon dragging functionality on a polygon layer
   */
  private enablePolygonDragging(
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
          this.drawMode === DrawMode.Off
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
        if (!polygon._polydrawDragData.isDragging && this.drawMode === DrawMode.Off) {
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
   * Note: Probobly need to detact modifier key state at the drag start? This might be a good place to control the color of the polygon when the modifier key is held?
   */
  private onPolygonMouseDown(e: any, polygon: any) {
    if (!this.config.modes.dragPolygons || this.drawMode !== DrawMode.Off) return;

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
   * Note: Probobly needs a check for modifier key changes during drag
   */
  private onPolygonMouseMove(e: any) {
    if (!this.currentDragPolygon || !this.currentDragPolygon._polydrawDragData.isDragging) return;

    const polygon = this.currentDragPolygon;
    const dragData = polygon._polydrawDragData;

    // Check for modifier key changes during drag
    const currentModifierState = this.detectModifierKey(e.originalEvent || e);
    if (currentModifierState !== this.currentModifierDragMode) {
      this.handleModifierToggleDuringDrag(e.originalEvent || e);
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
  private onPolygonMouseUp(e: any) {
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
   * Update polygon coordinates after drag
   *
   * Note: Likely needs to be extended to support modifier-based subtract behavior.
   */
  private updatePolygonCoordinates(
    polygon: any,
    featureGroup: L.FeatureGroup,
    originalLatLngs: Feature<Polygon | MultiPolygon>,
  ) {
    try {
      // Get new coordinates from dragged polygon
      const newLatLngs = polygon.getLatLngs();

      // Convert to GeoJSON format
      const newGeoJSON = polygon.toGeoJSON();

      // Find the index of this feature group
      const featureGroupIndex = this.arrayOfFeatureGroups.indexOf(featureGroup);
      if (featureGroupIndex === -1) {
        console.warn('Feature group not found in array');
        return;
      }

      // Remove the old feature group
      if (this.map && this.map.removeLayer) {
        this.map.removeLayer(featureGroup);
      }
      this.arrayOfFeatureGroups.splice(featureGroupIndex, 1);

      // Check if modifier key was held during drag
      if (this.isModifierDragActive()) {
        // Modifier key held - perform subtract operation
        const draggedPolygonFeature = this.turfHelper.getTurfPolygon(newGeoJSON);
        const intersectingFeatureGroups = this.findIntersectingPolygons(
          draggedPolygonFeature,
          featureGroup,
        );
        this.performModifierSubtract(draggedPolygonFeature, intersectingFeatureGroups);
      } else {
        // Normal drag behavior - check for auto-interactions
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
      if (this.polygonInformation && this.polygonInformation.createPolygonInformationStorage) {
        this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
      }
    } catch (error) {
      console.warn('Failed to update polygon coordinates:', error.message);

      // Fallback: revert to original position
      if (this.dragStartPosition && polygon.setLatLngs) {
        try {
          polygon.setLatLngs(this.dragStartPosition);
        } catch (revertError) {
          console.warn('Could not revert polygon position:', revertError.message);
        }
      }
    }
  }

  /**
   * Check for interactions between dragged polygon and existing polygons
   */
  private checkDragInteractions(
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
      if (
        this.config.dragPolygons.autoMergeOnIntersect &&
        this.turfHelper.polygonIntersect(draggedPolygon, existingPolygon)
      ) {
        result.shouldMerge = true;
        result.intersectingFeatureGroups.push(featureGroup);
      }
    }

    return result;
  }

  /**
   * Perform merge operation when dragged polygon intersects with others
   */
  private performDragMerge(
    draggedPolygon: Feature<Polygon | MultiPolygon>,
    intersectingFeatureGroups: L.FeatureGroup[],
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
        this.map.removeLayer(featureGroup);
        const index = this.arrayOfFeatureGroups.indexOf(featureGroup);
        if (index > -1) {
          this.arrayOfFeatureGroups.splice(index, 1);
        }
      }
    }

    // Add the final merged polygon
    this.addPolygonLayer(mergedPolygon, false);
  }

  /**
   * Perform hole creation when dragged polygon is completely within another
   */
  private performDragHole(
    draggedPolygon: Feature<Polygon | MultiPolygon>,
    containingFeatureGroup: L.FeatureGroup,
  ) {
    const featureCollection = containingFeatureGroup.toGeoJSON() as any;
    const containingPolygon = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

    // Perform difference operation (subtract dragged polygon from containing polygon)
    const differenceResult = this.turfHelper.polygonDifference(containingPolygon, draggedPolygon);

    if (differenceResult) {
      // Remove the original containing polygon
      this.map.removeLayer(containingFeatureGroup);
      const index = this.arrayOfFeatureGroups.indexOf(containingFeatureGroup);
      if (index > -1) {
        this.arrayOfFeatureGroups.splice(index, 1);
      }

      // Add the polygon with the new hole
      this.addPolygonLayer(differenceResult, false);
    } else {
      // Fallback: just add the dragged polygon normally
      this.addPolygonLayer(draggedPolygon, false);
    }
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
  public enablePolygonDraggingMode(enable: boolean = true) {
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
   * Modifier key drag functionality - Method stubs for TDD
   */

  /**
   * Detect if modifier key is pressed during drag operation
   */
  private detectModifierKey(event: MouseEvent): boolean {
    if (!this.config.dragPolygons.modifierSubtract.enabled) {
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
   * Perform subtract operation when modifier key is held during drag
   */
  private performModifierSubtract(
    draggedPolygon: Feature<Polygon | MultiPolygon>,
    intersectingPolygons: L.FeatureGroup[],
  ): void {
    if (intersectingPolygons.length === 0) {
      // No intersections - just move the polygon
      this.addPolygonLayer(draggedPolygon, false);
      return;
    }

    // Subtract the dragged polygon from all intersecting polygons
    intersectingPolygons.forEach((featureGroup) => {
      const featureCollection = featureGroup.toGeoJSON() as any;
      const existingPolygon = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

      // Perform difference operation (subtract dragged polygon from existing polygon)
      const differenceResult = this.turfHelper.polygonDifference(existingPolygon, draggedPolygon);

      // Remove the original polygon
      this.map.removeLayer(featureGroup);
      const index = this.arrayOfFeatureGroups.indexOf(featureGroup);
      if (index > -1) {
        this.arrayOfFeatureGroups.splice(index, 1);
      }

      // Add the result if it exists (polygon with hole or remaining parts)
      if (differenceResult) {
        this.addPolygonLayer(differenceResult, false);
      }
    });
  }

  /**
   * Check if modifier drag mode is currently active
   */
  private isModifierDragActive(): boolean {
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
  private findIntersectingPolygons(
    draggedPolygon: Feature<Polygon | MultiPolygon>,
    excludeFeatureGroup: L.FeatureGroup,
  ): L.FeatureGroup[] {
    const intersectingFeatureGroups: L.FeatureGroup[] = [];

    // Check interactions with all other polygons
    for (const featureGroup of this.arrayOfFeatureGroups) {
      if (featureGroup === excludeFeatureGroup) continue;

      try {
        const featureCollection = featureGroup.toGeoJSON() as any;
        const existingPolygon = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

        // Check if polygons intersect
        if (this.turfHelper.polygonIntersect(draggedPolygon, existingPolygon)) {
          intersectingFeatureGroups.push(featureGroup);
        }
      } catch (error) {
        console.warn('Error checking polygon intersection:', error.message);
      }
    }

    return intersectingFeatureGroups;
  }
}

(L.control as any).polydraw = function (options: L.ControlOptions) {
  return new Polydraw(options);
};

export default Polydraw;
