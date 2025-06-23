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
import type { ILatLng } from "./polygon-helpers";
import { Compass, PolyDrawUtil, Perimeter, Area } from "./utils";
import { IconFactory } from "./icon-factory";
import { PolygonUtil } from "./polygon.util";
import type { Feature, Polygon, MultiPolygon } from 'geojson';
// @ts-ignore
import './styles/polydraw.css';

class Polydraw extends L.Control {

  private map: L.Map;
  private tracer: L.Polyline = {} as any;
  private arrayOfFeatureGroups: L.FeatureGroup<L.Layer>[] = [];
  private kinks: boolean;
  private mergePolygons: boolean;
  
  // FIX: Separate runtime state from configuration
  // This tracks whether the current polygon being processed has kinks (self-intersections)
  // Used during polygon validation and processing operations
  private currentPolygonHasKinks: boolean = false;


  private drawMode: DrawMode = DrawMode.Off;
  private drawModeListeners: ((mode: DrawMode) => void)[] = [];

  private turfHelper: TurfHelper;


  private subContainer?: HTMLElement;
  private config: any;

  private mapStateService: MapStateService;

  private polygonInformation: PolygonInformationService;

  // Drag state management
  private dragStartPosition: any = null;
  private isDragging: boolean = false;
  private currentDragPolygon: any = null;

  constructor(options?: L.ControlOptions & { config?: any }) {
    super(options);
    this.config = { ...defaultConfig, ...options?.config || {} };
    this.mergePolygons = this.config.mergePolygons;
    
    // FIX: Ensure kinks is always properly initialized from configuration
    // The tests expect this.kinks to be false (from config.json), not undefined
    this.kinks = this.config.kinks !== undefined ? this.config.kinks : false;
    
    this.turfHelper = new TurfHelper(this.config);
    this.mapStateService = new MapStateService();
    this.polygonInformation = new PolygonInformationService(this.mapStateService);
    this.polygonInformation.onPolygonInfoUpdated(k => {
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

    createButtons(container, this.subContainer, onActivateToggle, onDrawClick, onSubtractClick, onEraseClick, null, null);

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
    geographicBorders.forEach(group => {
      let featureGroup: L.FeatureGroup = new L.FeatureGroup();

      let polygon2 = this.turfHelper.getMultiPolygon(this.convertToCoords(group));
      // Processed polygon
      let polygon = this.getPolygon(polygon2);

      featureGroup.addLayer(polygon);
      let markerLatlngs = polygon.getLatLngs();
      // Marker positions
      markerLatlngs.forEach(polygon => {
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
    if (!!this.map) {
      let isActiveDrawMode = true;
      switch (mode) {
        case DrawMode.Off:
          L.DomUtil.removeClass(this.map.getContainer(), "crosshair-cursor-enabled");
          this.events(false);
          this.stopDraw();
          // FIX: Handle tracer setStyle errors in test environment
          try {
            this.tracer.setStyle({
              color: ""
            });
          } catch (error) {
            // Handle case where tracer renderer is not initialized (e.g., in test environment)
            console.warn('Could not set tracer style:', error.message);
          }
          this.setLeafletMapEvents(true, true, true);
          isActiveDrawMode = false;
          break;
        case DrawMode.Add:
          L.DomUtil.addClass(this.map.getContainer(), "crosshair-cursor-enabled");
          this.events(true);
          // FIX: Handle tracer setStyle errors in test environment
          try {
            this.tracer.setStyle({
              color: defaultConfig.polyLineOptions.color
            });
          } catch (error) {
            // Handle case where tracer renderer is not initialized (e.g., in test environment)
            console.warn('Could not set tracer style:', error.message);
          }
          this.setLeafletMapEvents(false, false, false);
          break;
        case DrawMode.Subtract:
          L.DomUtil.addClass(this.map.getContainer(), "crosshair-cursor-enabled");
          this.events(true);
          // FIX: Handle tracer setStyle errors in test environment
          try {
            this.tracer.setStyle({
              color: "#D9460F"
            });
          } catch (error) {
            // Handle case where tracer renderer is not initialized (e.g., in test environment)
            console.warn('Could not set tracer style:', error.message);
          }
          this.setLeafletMapEvents(false, false, false);
          break;
      }
    }
  }
  private stopDraw() {
    // Stop the drawing process and reset tracers

    this.resetTracker();
    this.drawStartedEvents(false);
  }
  private setLeafletMapEvents(enableDragging: boolean, enableDoubleClickZoom: boolean, enableScrollWheelZoom: boolean) {
    // Toggle map interaction events based on drawing mode

    enableDragging ? this.map.dragging.enable() : this.map.dragging.disable();
    enableDoubleClickZoom ? this.map.doubleClickZoom.enable() : this.map.doubleClickZoom.disable();
    enableScrollWheelZoom ? this.map.scrollWheelZoom.enable() : this.map.scrollWheelZoom.disable();
  }
  private resetTracker() {
    this.tracer.setLatLngs([[0, 0]]);
  }
  private drawStartedEvents(onoff: boolean) {
    // Enable or disable events for drawing

    const onoroff = onoff ? "on" : "off";

    this.map[onoroff]("mousemove", this.mouseMove, this);
    this.map[onoroff]("mouseup", this.mouseUpLeave, this);
    if (onoff) {

      this.map.getContainer().addEventListener("touchmove", e => this.mouseMove(e));
      this.map.getContainer().addEventListener("touchend", e => this.mouseUpLeave(e));
    }
    else {
      this.map.getContainer().removeEventListener("touchmove", e => this.mouseMove(e), true);
      this.map.getContainer().removeEventListener("touchmove", e => this.mouseMove(e), true);
      this.map.getContainer().removeEventListener("touchend", e => this.mouseUpLeave(e), true);
    }

  }
  private mouseMove(event) {
    // Update the tracer line as the mouse moves
    if (event.originalEvent != null) {
      this.tracer.addLatLng(event.latlng);
    } else {
      const latlng = this.map.containerPointToLatLng([event.touches[0].clientX, event.touches[0].clientY]);

      this.tracer.addLatLng(latlng);

    }
  }
  private mouseUpLeave(event) {
    // Finalize the drawn shape on mouse up
    this.polygonInformation.deletePolygonInformationStorage();
    //console.log("------------------------------Delete trashcans", null);
    let geoPos: Feature<Polygon | MultiPolygon> = this.turfHelper.turfConcaveman(this.tracer.toGeoJSON() as any);
    // Drawn geometry
    this.stopDraw();
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
    //console.log("------------------------------create trashcans", null);
  }

  private subtractPolygon(latlngs: Feature<Polygon | MultiPolygon>) {
    this.subtract(latlngs);
  }
  //fine
  private addPolygon(latlngs: Feature<Polygon | MultiPolygon>, simplify: boolean, noMerge: boolean = false) {
    // Add a new polygon, potentially merging with existing ones

    if (this.mergePolygons && !noMerge && this.arrayOfFeatureGroups.length > 0 && !this.kinks) {
      this.merge(latlngs);
    } else {
      this.addPolygonLayer(latlngs, simplify);
    }
  }
  private subtract(latlngs: Feature<Polygon | MultiPolygon>) {
    let addHole = latlngs;
    let newPolygons = [];
    this.arrayOfFeatureGroups.forEach(featureGroup => {
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
    newPolygons.forEach(np => {
      this.addPolygon(np, false, true);
    });
  }
  private getLatLngsFromJson(feature: Feature<Polygon | MultiPolygon>): ILatLng[][] {
    // Extract LatLng coordinates from GeoJSON feature
    let coord;
    if (feature) {
      if (feature.geometry.coordinates.length > 1 && feature.geometry.type === "MultiPolygon") {
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]);
      } else if (feature.geometry.coordinates[0].length > 1 && feature.geometry.type === "Polygon") {
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
      this.polygonInformation.polygonInformationStorage.forEach(v => {
        if (v.polygon.toString() !== polygon[0].toString() && v.polygon[0].toString() === polygon[0][0].toString()) {
          v.polygon = polygon;
          newArray.push(v);
        }

        if (v.polygon.toString() !== polygon[0].toString() && v.polygon[0].toString() !== polygon[0][0].toString()) {
          newArray.push(v);
        }
      });
      featureGroup.clearLayers();
      this.arrayOfFeatureGroups = this.arrayOfFeatureGroups.filter(featureGroups => featureGroups !== featureGroup);

      this.map.removeLayer(featureGroup);
    }
  }
  deletePolygon(polygon: ILatLng[][]) {
    // Delete a specific polygon from the map
    if (this.arrayOfFeatureGroups.length > 0) {
      this.arrayOfFeatureGroups.forEach(featureGroup => {
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
  private removeFeatureGroup(featureGroup: L.FeatureGroup) {
    // Remove a feature group from the map

    featureGroup.clearLayers();
    this.arrayOfFeatureGroups = this.arrayOfFeatureGroups.filter(featureGroups => featureGroups !== featureGroup);
    // this.updatePolygons();
    this.map.removeLayer(featureGroup);
  }
  removeAllFeatureGroups() {
    // Clear all feature groups and reset state
    this.arrayOfFeatureGroups.forEach(featureGroups => {
      this.map.removeLayer(featureGroups);
    });

    this.arrayOfFeatureGroups = [];
    this.polygonInformation.deletePolygonInformationStorage();
    // this.polygonDrawStates.reset();
    this.polygonInformation.updatePolygons();
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
  private addPolygonLayer(latlngs: Feature<Polygon | MultiPolygon>, simplify: boolean, dynamicTolerance: boolean = false) {
    let featureGroup: L.FeatureGroup = new L.FeatureGroup();

    const latLngs = simplify ? this.turfHelper.getSimplified(latlngs, dynamicTolerance) : latlngs;
    // Create and add a new polygon layer
    let polygon = this.getPolygon(latLngs);
    featureGroup.addLayer(polygon);

    // Enable polygon dragging if configured
    if (this.config.modes.dragPolygons) {
      this.enablePolygonDragging(polygon, featureGroup, latLngs);
    }

    // Polygon added
    let markerLatlngs = polygon.getLatLngs();
    markerLatlngs.forEach(polygon => {
      polygon.forEach((polyElement: ILatLng[], i: number) => {
        if (i === 0) {
          this.addMarker(polyElement, featureGroup);
        } else {
          this.addHoleMarker(polyElement, featureGroup);
          // Hole
        }
      });
      // TODO: Add area info icon
      // this.addMarker(polygon[0], featureGroup);
      //TODO - Hvis polygon.length >1, så har den hull: egen addMarker funksjon
    });

    this.arrayOfFeatureGroups.push(featureGroup);
    // Updated array of feature groups
    this.setDrawMode(DrawMode.Off);

    featureGroup.on("click", e => {
      this.polygonClicked(e, latLngs);
    });
  }
  private getMarkerIndex(latlngs: ILatLng[], position: MarkerPosition): number {
    const bounds: L.LatLngBounds = PolyDrawUtil.getBounds(latlngs, Math.sqrt(2) / 2);
    const compass = new Compass(bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast());
    const compassDirection = compass.getDirection(position);
    const latLngPoint: ILatLng = {
      lat: compassDirection.lat,
      lng: compassDirection.lng
    };
    const targetPoint = this.turfHelper.getCoord(latLngPoint);
    const fc = this.turfHelper.getFeaturePointCollection(latlngs);
    const nearestPointIdx = this.turfHelper.getNearestPointIndex(targetPoint, fc as any);

    return nearestPointIdx;
  }
  private getLatLngInfoString(latlng: ILatLng): string {
    return "Latitude: " + latlng.lat + " Longitude: " + latlng.lng;
  }
  private addMarker(latlngs: ILatLng[], FeatureGroup: L.FeatureGroup) {
    // Add markers to the polygon for editing and info
    let menuMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerMenuIcon.position);
    let deleteMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerDeleteIcon.position);
    let infoMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerInfoIcon.position);

    // Fallback for small polygons
    if (latlngs.length <= 5) {
      menuMarkerIdx = 0;
      deleteMarkerIdx = Math.floor(latlngs.length / 2);
      infoMarkerIdx = latlngs.length - 1;
    }
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
      const marker = new L.Marker(latlng, {
        icon: IconFactory.createDivIcon(iconClasses),
        draggable: this.config.modes.dragElbow,
        title: (this.config.markers.coordsTitle ? this.getLatLngInfoString(latlng) : ""),
        zIndexOffset: this.config.markers.markerIcon.zIndexOffset ?? this.config.markers.zIndexOffset
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
        marker.on("drag", e => {
          this.markerDrag(FeatureGroup);
        });
        marker.on("dragend", e => {
          this.markerDragEnd(FeatureGroup);
        });
      }

      if (i === menuMarkerIdx && this.config.markers.menuMarker) {
        const menuPopup = this.generateMenuMarkerPopup(latlngs);
        marker.options.zIndexOffset = this.config.markers.markerMenuIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
        marker.bindPopup(menuPopup, { className: "alter-marker" });
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
        marker.options.zIndexOffset = this.config.markers.markerInfoIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
        marker.bindPopup(infoPopup, { className: "info-marker" });
      }
      if (i === deleteMarkerIdx && this.config.markers.deleteMarker) {
        marker.options.zIndexOffset = this.config.markers.markerInfoIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
        marker.on("click", e => {
          this.deletePolygon([latlngs]);
        });
      }
    });
    //markers.addTo(this.map)
  }
  private generateMenuMarkerPopup(latLngs: ILatLng[]): any {
    const self = this;

    const outerWrapper: HTMLDivElement = document.createElement("div");
    outerWrapper.classList.add("alter-marker-outer-wrapper");

    const wrapper: HTMLDivElement = document.createElement("div");
    wrapper.classList.add("alter-marker-wrapper");

    const invertedCorner: HTMLElement = document.createElement("i");
    invertedCorner.classList.add("inverted-corner");

    const markerContent: HTMLDivElement = document.createElement("div");
    markerContent.classList.add("content");

    const markerContentWrapper: HTMLDivElement = document.createElement("div");
    markerContentWrapper.classList.add("marker-menu-content");

    const simplify: HTMLDivElement = document.createElement("div");
    simplify.classList.add("marker-menu-button", "simplify");
    simplify.title = "Simplify";

    const doubleElbows: HTMLDivElement = document.createElement("div");
    doubleElbows.classList.add("marker-menu-button", "double-elbows");
    doubleElbows.title = "DoubleElbows";

    const bbox: HTMLDivElement = document.createElement("div");
    bbox.classList.add("marker-menu-button", "bbox");
    bbox.title = "Bounding box";

    const bezier: HTMLDivElement = document.createElement("div");
    bezier.classList.add("marker-menu-button", "bezier");
    bezier.title = "Curve";

    const separator: HTMLDivElement = document.createElement("div");
    separator.classList.add("separator");

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
      let within = this.turfHelper.isWithin(L.GeoJSON.latLngsToCoords(latlngs[latlngs.length - 1]), L.GeoJSON.latLngsToCoords(latlngs[0]));
      if (within) {
        latlngs.forEach(polygon => {
          coordinates.push(L.GeoJSON.latLngsToCoords(polygon));
        });
      } else {
        latlngs.forEach(polygon => {
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
        let within = this.turfHelper.isWithin(L.GeoJSON.latLngsToCoords(latlngs[index]), L.GeoJSON.latLngsToCoords(latlngs[0]));
        if (within) {
          latlngs.forEach(polygon => {
            coordinates.push(L.GeoJSON.latLngsToCoords(polygon));
          });
          coords.push(coordinates);
        } else {
          latlngs.forEach(polygon => {
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

    const outerWrapper: HTMLDivElement = document.createElement("div");
    outerWrapper.classList.add("info-marker-outer-wrapper");

    const wrapper: HTMLDivElement = document.createElement("div");
    wrapper.classList.add("info-marker-wrapper");

    const invertedCorner: HTMLElement = document.createElement("i");
    invertedCorner.classList.add("inverted-corner");

    const markerContent: HTMLDivElement = document.createElement("div");
    markerContent.classList.add("content");

    const rowWithSeparator: HTMLDivElement = document.createElement("div");
    rowWithSeparator.classList.add("row", "bottom-separator");

    const perimeterHeader: HTMLDivElement = document.createElement("div");
    perimeterHeader.classList.add("header")
    perimeterHeader.innerText = self.config.markers.markerInfoIcon.perimeterLabel;

    const emptyDiv: HTMLDivElement = document.createElement("div");

    const perimeterArea: HTMLSpanElement = document.createElement("span");
    perimeterArea.classList.add("area");
    perimeterArea.innerText = this.config.markers.markerInfoIcon.useMetrics ? _perimeter.metricLength : _perimeter.imperialLength;
    const perimeterUnit: HTMLSpanElement = document.createElement("span");
    perimeterUnit.classList.add("unit");
    perimeterUnit.innerText = " " + (this.config.markers.markerInfoIcon.useMetrics ? _perimeter.metricUnit : _perimeter.imperialUnit);

    const row: HTMLDivElement = document.createElement("div");
    row.classList.add("row");

    const areaHeader: HTMLDivElement = document.createElement("div");
    areaHeader.classList.add("header")
    areaHeader.innerText = self.config.markers.markerInfoIcon.areaLabel;

    const rightRow: HTMLDivElement = document.createElement("div");
    row.classList.add("right-margin");

    const areaArea: HTMLSpanElement = document.createElement("span");
    areaArea.classList.add("area");
    areaArea.innerText = this.config.markers.markerInfoIcon.useMetrics ? _area.metricArea : _area.imperialArea;
    const areaUnit: HTMLSpanElement = document.createElement("span");
    areaUnit.classList.add("unit");
    areaUnit.innerText = " " + (this.config.markers.markerInfoIcon.useMetrics ? _area.metricUnit : _area.imperialUnit);

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
      let iconClasses = this.config.markers.markerIcon.styleClasses;
      const marker = new L.Marker(latlng, {
        icon: IconFactory.createDivIcon(iconClasses),
        draggable: true,
        title: this.getLatLngInfoString(latlng),
        zIndexOffset: this.config.markers.holeIcon.zIndexOffset ?? this.config.markers.zIndexOffset
      });
      FeatureGroup.addLayer(marker).addTo(this.map);

      marker.on("drag", e => {
        this.markerDrag(FeatureGroup);
      });
      marker.on("dragend", e => {
        this.markerDragEnd(FeatureGroup);
      });
    });
  }
  private merge(latlngs: Feature<Polygon | MultiPolygon>) {
    // Merge the new polygon with existing ones if configured
    let polygonFeature = [];
    const newArray: L.FeatureGroup[] = [];
    let polyIntersection: boolean = false;
    this.arrayOfFeatureGroups.forEach(featureGroup => {
      let featureCollection = featureGroup.toGeoJSON() as any;
      if (featureCollection.features[0].geometry.coordinates.length > 1) {
        featureCollection.features[0].geometry.coordinates.forEach(element => {
          let feature = this.turfHelper.getMultiPolygon([element]);
          polyIntersection = this.turfHelper.polygonIntersect(feature, latlngs);
          if (polyIntersection) {
            newArray.push(featureGroup);
            polygonFeature.push(feature);
          }
        });
      } else {
        let feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
        polyIntersection = this.turfHelper.polygonIntersect(feature, latlngs);
        if (polyIntersection) {
          newArray.push(featureGroup);
          polygonFeature.push(feature);
        }
      }
    });
    // Intersecting features
    if (newArray.length > 0) {
      this.unionPolygons(newArray, latlngs, polygonFeature);
    } else {
      this.addPolygonLayer(latlngs, true);
    }
  }
  private unionPolygons(layers, latlngs: Feature<Polygon | MultiPolygon>, polygonFeature) {
    // Union multiple polygons

    let addNew = latlngs;
    layers.forEach((featureGroup, i) => {
      let featureCollection = featureGroup.toGeoJSON();
      const layer = featureCollection.features[0];
      let poly = this.getLatLngsFromJson(layer);
      const union = this.turfHelper.union(addNew, polygonFeature[i]); //Check for multipolygons
      //Needs a cleanup for the new version
      this.deletePolygonOnMerge(poly);
      this.removeFeatureGroup(featureGroup);

      addNew = union;
    });

    const newLatlngs: Feature<Polygon | MultiPolygon> = addNew; //Might need this.turfHelper.getTurfPolygon( addNew);
    this.addPolygonLayer(newLatlngs, true);
  }
  private deletePolygonOnMerge(polygon) {
    // Delete polygon during merge
    let polygon2 = [];
    if (this.arrayOfFeatureGroups.length > 0) {
      this.arrayOfFeatureGroups.forEach(featureGroup => {
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

    polygon.setStyle(this.config.polygonOptions);
    
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
  private polygonClicked(e: any, poly: Feature<Polygon | MultiPolygon>) {
    if (this.config.modes.attachElbow) {
      const newPoint = e.latlng;
      if (poly.geometry.type === "MultiPolygon") {
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
    const onoroff = onoff ? "on" : "off";
    this.map[onoroff]("mousedown", this.mouseDown, this);
    if (onoff) {

      this.map.getContainer().addEventListener("touchstart", e => this.mouseDown(e));
    }
    else {
      this.map.getContainer().removeEventListener("touchstart", e => this.mouseDown(e), true);
      ;
    }
  }
  private mouseDown(event) {
    // Start drawing on mouse down

    if (event.originalEvent != null) {
      this.tracer.setLatLngs([event.latlng]);
    } else {
      const latlng = this.map.containerPointToLatLng([event.touches[0].clientX, event.touches[0].clientY]);

      this.tracer.setLatLngs([latlng]);

    }
    // tracer latlngs
    this.startDraw();
  }
  private startDraw() {
    // Initialize drawing process

    this.drawStartedEvents(true);
  }
  private markerDrag(FeatureGroup: L.FeatureGroup) {
    const newPos = [];
    let testarray = [];
    let hole = [];
    const layerLength = FeatureGroup.getLayers() as any;
    let posarrays = layerLength[0].getLatLngs();
    // position arrays
    let length = 0;
    if (posarrays.length > 1) {
      for (let index = 0; index < posarrays.length; index++) {
        testarray = [];
        hole = [];
        // Positions
        if (index === 0) {
          if (posarrays[0].length > 1) {
            for (let i = 0; index < posarrays[0].length; i++) {
              // Positions 2

              for (let j = 0; j < posarrays[0][i].length; j++) {
                testarray.push(layerLength[j + 1].getLatLng());
              }
              hole.push(testarray);
            }
          } else {
            for (let j = 0; j < posarrays[0][0].length; j++) {
              testarray.push(layerLength[j + 1].getLatLng());
            }
            hole.push(testarray);
          }
          // Hole
          newPos.push(hole);
        } else {
          length += posarrays[index - 1][0].length;
          // Start index
          for (let j = length; j < posarrays[index][0].length + length; j++) {
            testarray.push((layerLength[j + 1] as any).getLatLng());
          }
          hole.push(testarray);
          newPos.push(hole);
        }
      }
    } else {
      // testarray = []
      hole = [];
      let length2 = 0;
      for (let index = 0; index < posarrays[0].length; index++) {
        testarray = [];
        // Polygon drag
        if (index === 0) {
          if (posarrays[0][index].length > 1) {
            for (let j = 0; j < posarrays[0][index].length; j++) {
              testarray.push(layerLength[j + 1].getLatLng());
            }
          } else {
            for (let j = 0; j < posarrays[0][0].length; j++) {
              testarray.push(layerLength[j + 1].getLatLng());
            }
          }
        } else {
          length2 += posarrays[0][index - 1].length;

          for (let j = length2; j < posarrays[0][index].length + length2; j++) {
            testarray.push(layerLength[j + 1].getLatLng());
          }
        }
        hole.push(testarray);
      }
      newPos.push(hole);
      // Hole 2
    }
    // Update positions during marker drag
    layerLength[0].setLatLngs(newPos);
  }
  // check this
  private markerDragEnd(FeatureGroup: L.FeatureGroup) {
    this.polygonInformation.deletePolygonInformationStorage();
    let featureCollection = FeatureGroup.toGeoJSON() as any;
    // Handle end of marker drag, check for kinks and update polygons
    this.removeFeatureGroup(FeatureGroup);
    
    if (featureCollection.features[0].geometry.coordinates.length > 1) {
      featureCollection.features[0].geometry.coordinates.forEach(element => {
        let feature = this.turfHelper.getMultiPolygon([element]);

        // FIX: Use separate runtime state instead of overriding configuration
        // Check if the current polygon has kinks (self-intersections) after marker drag
        if (this.turfHelper.hasKinks(feature)) {
          // Set runtime state: current polygon has kinks
          this.currentPolygonHasKinks = true;
          let unkink = this.turfHelper.getKinks(feature);
          // Handle unkinked polygons - split kinked polygon into valid parts
          let testCoord = [];
          unkink.forEach(polygon => {
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
      let feature = this.turfHelper.getMultiPolygon(featureCollection.features[0].geometry.coordinates);
      // Markerdragend
      if (this.turfHelper.hasKinks(feature)) {
        // FIX: Use separate runtime state instead of overriding configuration
        // Set runtime state: current polygon has kinks
        this.currentPolygonHasKinks = true;
        let unkink = this.turfHelper.getKinks(feature);
        // Unkink - split kinked polygon into valid parts
        let testCoord = [];
        unkink.forEach(polygon => {
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
  private enablePolygonDragging(polygon: any, featureGroup: L.FeatureGroup, latLngs: Feature<Polygon | MultiPolygon>) {
    try {
      // Store references for drag handling
      polygon._polydrawFeatureGroup = featureGroup;
      polygon._polydrawLatLngs = latLngs;
      polygon._polydrawDragData = {
        isDragging: false,
        startPosition: null,
        startLatLngs: null
      };

      // Add custom mouse event handlers for dragging
      polygon.on('mousedown', (e: any) => this.onPolygonMouseDown(e, polygon));
      
      // Set cursor to indicate draggable (only when not in draw/subtract mode)
      polygon.on('mouseover', () => {
        if (!polygon._polydrawDragData.isDragging && 
            this.config.dragPolygons.hoverCursor && 
            this.drawMode === DrawMode.Off) {
          const container = this.map.getContainer();
          container.style.cursor = this.config.dragPolygons.hoverCursor;
          // Also set on the polygon element itself
          if (polygon.getElement) {
            const element = polygon.getElement();
            if (element) {
              element.style.cursor = this.config.dragPolygons.hoverCursor;
            }
          }
        }
      });
      
      polygon.on('mouseout', () => {
        if (!polygon._polydrawDragData.isDragging && this.drawMode === DrawMode.Off) {
          const container = this.map.getContainer();
          container.style.cursor = '';
          // Also reset on the polygon element itself
          if (polygon.getElement) {
            const element = polygon.getElement();
            if (element) {
              element.style.cursor = '';
            }
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
    if (!this.config.modes.dragPolygons || this.drawMode !== DrawMode.Off) return;
    
    // Prevent event bubbling to map
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    
    // Initialize drag
    polygon._polydrawDragData.isDragging = true;
    polygon._polydrawDragData.startPosition = e.latlng;
    polygon._polydrawDragData.startLatLngs = polygon.getLatLngs();
    
    // Disable map dragging
    if (this.map.dragging) {
      this.map.dragging.disable();
    }
    
    // Visual feedback
    if (this.config.dragPolygons.opacity < 1) {
      polygon.setStyle({ opacity: this.config.dragPolygons.opacity });
    }
    
    // Set drag cursor
    if (this.config.dragPolygons.dragCursor) {
      const container = this.map.getContainer();
      container.style.cursor = this.config.dragPolygons.dragCursor;
      // Also set on the polygon element itself
      if (polygon.getElement) {
        const element = polygon.getElement();
        if (element) {
          element.style.cursor = this.config.dragPolygons.dragCursor;
        }
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
      originalLatLngs: polygon._polydrawLatLngs 
    });
  }

  /**
   * Handle mouse move during polygon drag
   */
  private onPolygonMouseMove(e: any) {
    if (!this.currentDragPolygon || !this.currentDragPolygon._polydrawDragData.isDragging) return;
    
    const polygon = this.currentDragPolygon;
    const dragData = polygon._polydrawDragData;
    
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
      featureGroup: polygon._polydrawFeatureGroup 
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
    this.map.fire('polygon:dragend', { 
      polygon: polygon,
      featureGroup: polygon._polydrawFeatureGroup,
      oldPosition: dragData.startLatLngs,
      newPosition: polygon.getLatLngs()
    });
    
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
        lng: latLngs.lng + offsetLng
      };
    } else {
      // Array of coordinates
      return latLngs.map((coord: any) => this.offsetPolygonCoordinates(coord, offsetLat, offsetLng));
    }
  }

  /**
   * Handle polygon drag start event
   */
  private onPolygonDragStart(e: any, featureGroup: L.FeatureGroup, latLngs: Feature<Polygon | MultiPolygon>) {
    // Store original position for potential undo
    this.dragStartPosition = e.target.getLatLngs();
    this.isDragging = true;
    
    // Disable map dragging during polygon drag
    if (this.map.dragging) {
      this.map.dragging.disable();
    }
    
    // Visual feedback - reduce opacity
    if (this.config.dragPolygons.opacity < 1) {
      e.target.setStyle({ opacity: this.config.dragPolygons.opacity });
    }
    
    // Set cursor style
    if (this.config.dragPolygons.dragCursor) {
      const container = this.map.getContainer();
      container.style.cursor = this.config.dragPolygons.dragCursor;
    }
    
    // Emit custom event
    this.map.fire('polygon:dragstart', { 
      polygon: e.target, 
      featureGroup: featureGroup,
      originalLatLngs: latLngs 
    });
  }

  /**
   * Handle polygon drag event (during dragging)
   */
  private onPolygonDrag(e: any, featureGroup: L.FeatureGroup, latLngs: Feature<Polygon | MultiPolygon>) {
    // Optional: Real-time coordinate updates
    if (this.config.dragPolygons.realTimeUpdate) {
      this.updatePolygonCoordinates(e.target, featureGroup, latLngs);
    }
    
    // Emit custom event
    this.map.fire('polygon:drag', { 
      polygon: e.target, 
      featureGroup: featureGroup 
    });
  }

  /**
   * Handle polygon drag end event
   */
  private onPolygonDragEnd(e: any, featureGroup: L.FeatureGroup, latLngs: Feature<Polygon | MultiPolygon>) {
    this.isDragging = false;
    
    // Re-enable map dragging
    if (this.map.dragging) {
      this.map.dragging.enable();
    }
    
    // Reset visual feedback
    e.target.setStyle({ opacity: 1.0 });
    
    // Reset cursor
    const container = this.map.getContainer();
    container.style.cursor = '';
    
    // Update internal coordinates
    this.updatePolygonCoordinates(e.target, featureGroup, latLngs);
    
    // Emit custom event
    this.map.fire('polygon:dragend', { 
      polygon: e.target,
      featureGroup: featureGroup,
      oldPosition: this.dragStartPosition,
      newPosition: e.target.getLatLngs()
    });
    
    // Clear drag state
    this.dragStartPosition = null;
  }

  /**
   * Update polygon coordinates after drag
   */
  private updatePolygonCoordinates(polygon: any, featureGroup: L.FeatureGroup, originalLatLngs: Feature<Polygon | MultiPolygon>) {
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
      
      // Check for drag interactions with other polygons
      const draggedPolygonFeature = this.turfHelper.getTurfPolygon(newGeoJSON);
      const interactionResult = this.checkDragInteractions(draggedPolygonFeature, featureGroup);
      
      // Remove the old feature group
      this.map.removeLayer(featureGroup);
      this.arrayOfFeatureGroups.splice(featureGroupIndex, 1);
      
      if (interactionResult.shouldMerge) {
        // Merge with intersecting polygons
        this.performDragMerge(draggedPolygonFeature, interactionResult.intersectingFeatureGroups);
      } else if (interactionResult.shouldCreateHole) {
        // Create hole in containing polygon
        this.performDragHole(draggedPolygonFeature, interactionResult.containingFeatureGroup);
      } else {
        // No interaction - just update position
        this.addPolygonLayer(newGeoJSON, false);
      }
      
      // Update polygon information storage
      this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
      
    } catch (error) {
      console.warn('Failed to update polygon coordinates:', error.message);
      
      // Fallback: revert to original position
      if (this.dragStartPosition) {
        polygon.setLatLngs(this.dragStartPosition);
      }
    }
  }

  /**
   * Check for interactions between dragged polygon and existing polygons
   */
  private checkDragInteractions(draggedPolygon: Feature<Polygon | MultiPolygon>, excludeFeatureGroup: L.FeatureGroup) {
    const result = {
      shouldMerge: false,
      shouldCreateHole: false,
      intersectingFeatureGroups: [] as L.FeatureGroup[],
      containingFeatureGroup: null as L.FeatureGroup | null
    };

    if (!this.config.dragPolygons.autoMergeOnIntersect && !this.config.dragPolygons.autoHoleOnContained) {
      return result;
    }

    // Check interactions with all other polygons
    for (const featureGroup of this.arrayOfFeatureGroups) {
      if (featureGroup === excludeFeatureGroup) continue;

      const featureCollection = featureGroup.toGeoJSON() as any;
      const existingPolygon = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

      // Check if dragged polygon is completely contained within existing polygon
      if (this.config.dragPolygons.autoHoleOnContained && 
          this.turfHelper.isPolygonCompletelyWithin(draggedPolygon, existingPolygon)) {
        result.shouldCreateHole = true;
        result.containingFeatureGroup = featureGroup;
        break; // Hole takes precedence over merge
      }

      // Check if polygons intersect (but dragged is not completely contained)
      if (this.config.dragPolygons.autoMergeOnIntersect && 
          this.turfHelper.polygonIntersect(draggedPolygon, existingPolygon)) {
        result.shouldMerge = true;
        result.intersectingFeatureGroups.push(featureGroup);
      }
    }

    return result;
  }

  /**
   * Perform merge operation when dragged polygon intersects with others
   */
  private performDragMerge(draggedPolygon: Feature<Polygon | MultiPolygon>, intersectingFeatureGroups: L.FeatureGroup[]) {
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
  private performDragHole(draggedPolygon: Feature<Polygon | MultiPolygon>, containingFeatureGroup: L.FeatureGroup) {
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
   * Handle marker behavior during polygon drag
   */
  private handleMarkersDuringDrag(featureGroup: L.FeatureGroup, phase: 'start' | 'end') {
    if (!featureGroup) return;
    
    const markerBehavior = this.config.dragPolygons.markerBehavior;
    const animationDuration = this.config.dragPolygons.markerAnimationDuration;
    
    featureGroup.eachLayer(layer => {
      // Skip the polygon itself, only handle markers
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
    });
  }

  /**
   * Public method to enable/disable polygon dragging
   */
  public enablePolygonDraggingMode(enable: boolean = true) {
    this.config.modes.dragPolygons = enable;
    
    // Update existing polygons
    this.arrayOfFeatureGroups.forEach(featureGroup => {
      featureGroup.eachLayer(layer => {
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






































  getDrawMode(): DrawMode {
    return this.drawMode;
  }


}

(L.control as any).polydraw = function (options: L.ControlOptions) {
  return new Polydraw(options);
};

export default Polydraw;
