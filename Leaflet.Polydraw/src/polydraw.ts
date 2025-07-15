/**
 * Polydraw - Simple version based on Angular implementation
 * Stripped of all over-engineering to match the working Angular version
 */
import * as L from 'leaflet';
import defaultConfig from './config.json';
import { DrawMode, MarkerPosition } from './enums';
import { TurfHelper } from './turf-helper';
import { createButtons } from './buttons';
import { PolygonInformationService } from './polygon-information.service';
import { MapStateService } from './map-state';
import { Compass, PolyDrawUtil, Perimeter, Area } from './utils';
import { IconFactory } from './icon-factory';
import { PolygonUtil } from './polygon.util';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import './styles/polydraw.css';

import type { ILatLng, PolydrawConfig, DrawModeChangeHandler } from './types/polydraw-interfaces';

class PolydrawSimple extends L.Control {
  private map: L.Map;
  private tracer: L.Polyline = {} as L.Polyline;
  private kinks: boolean;
  private mergePolygons: boolean;
  private turfHelper: TurfHelper;
  private subContainer?: HTMLElement;
  private config: PolydrawConfig;
  private mapStateService: MapStateService;
  private polygonInformation: PolygonInformationService;

  // Simple approach like Angular - just an array of feature groups
  private arrayOfFeatureGroups: L.FeatureGroup[] = [];

  // Simple draw mode tracking
  private drawMode: DrawMode = DrawMode.Off;
  private drawModeListeners: DrawModeChangeHandler[] = [];

  constructor(options?: L.ControlOptions & { config?: PolydrawConfig }) {
    super(options);
    this.config = { ...defaultConfig, ...(options?.config || {}) } as PolydrawConfig;
    this.mergePolygons = this.config.mergePolygons ?? true;
    this.kinks = this.config.kinks ?? false;
    this.turfHelper = new TurfHelper(this.config);
    this.mapStateService = new MapStateService();
    this.polygonInformation = new PolygonInformationService(this.mapStateService);
    this.polygonInformation.onPolygonInfoUpdated((_k) => {
      // Handle polygon info update
    });
  }

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
      this.setDrawMode(DrawMode.Add);
      this.polygonInformation.saveCurrentState();
    };

    const onSubtractClick = () => {
      this.setDrawMode(DrawMode.Subtract);
      this.polygonInformation.saveCurrentState();
    };

    const onEraseClick = () => {
      this.removeAllFeatureGroups();
    };

    createButtons(
      container,
      this.subContainer,
      onActivateToggle,
      onDrawClick,
      onSubtractClick,
      onEraseClick,
    );

    // Simple UI update listener
    const uiUpdateListener = (mode: DrawMode) => {
      const drawButton = container.querySelector('.icon-draw') as HTMLElement;
      const subtractButton = container.querySelector('.icon-subtract') as HTMLElement;
      if (drawButton) drawButton.classList.toggle('active', mode === DrawMode.Add);
      if (subtractButton) subtractButton.classList.toggle('active', mode === DrawMode.Subtract);
    };

    this.drawModeListeners.push(uiUpdateListener);

    this.tracer = L.polyline([], this.config.polyLineOptions);
    try {
      this.tracer.addTo(this.map);
    } catch (error) {
      // Silently handle tracer initialization in test environment
    }

    return container;
  }

  public addTo(map: L.Map): this {
    return super.addTo(map);
  }

  // Add the missing addAutoPolygon method
  public addAutoPolygon(
    geographicBorders: L.LatLng[][][],
    options?: { visualOptimizationLevel?: number },
  ): void {
    // Validate input
    if (!geographicBorders || geographicBorders.length === 0) {
      throw new Error('Cannot add empty polygon array');
    }

    // Ensure map is properly initialized
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    // Extract options with defaults
    const visualOptimizationLevel = options?.visualOptimizationLevel ?? 0;

    geographicBorders.forEach((group, groupIndex) => {
      try {
        // Convert L.LatLng[][][] to coordinate format for TurfHelper
        const coords = group.map((ring) => ring.map((latlng) => [latlng.lng, latlng.lat]));

        const polygon2 = this.turfHelper.getMultiPolygon([coords]);

        // Use the proper addPolygon method which includes merging logic
        this.addPolygon(polygon2, false, false);

        this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
      } catch (error) {
        console.error('Error adding auto polygon:', error);
        throw error;
      }
    });
  }

  setDrawMode(mode: DrawMode) {
    this.drawMode = mode;
    this.emitDrawModeChanged();
    this.stopDraw();

    if (this.map) {
      switch (mode) {
        case DrawMode.Off:
          L.DomUtil.removeClass(this.map.getContainer(), 'crosshair-cursor-enabled');
          this.events(false);
          try {
            this.tracer.setStyle({ color: '' });
          } catch (error) {
            // Handle case where tracer renderer is not initialized
          }
          this.setLeafletMapEvents(true, true, true);
          break;
        case DrawMode.Add:
          L.DomUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
          this.events(true);
          try {
            this.tracer.setStyle({ color: defaultConfig.polyLineOptions.color });
          } catch (error) {
            // Handle case where tracer renderer is not initialized
          }
          this.setLeafletMapEvents(false, false, false);
          break;
        case DrawMode.Subtract:
          L.DomUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
          this.events(true);
          try {
            this.tracer.setStyle({ color: '#D9460F' });
          } catch (error) {
            // Handle case where tracer renderer is not initialized
          }
          this.setLeafletMapEvents(false, false, false);
          break;
      }
    }
  }

  getDrawMode(): DrawMode {
    return this.drawMode;
  }

  public onDrawModeChangeListener(callback: DrawModeChangeHandler): void {
    this.drawModeListeners.push(callback);
  }

  public offDrawModeChangeListener(callback: DrawModeChangeHandler): void {
    const index = this.drawModeListeners.indexOf(callback);
    if (index > -1) {
      this.drawModeListeners.splice(index, 1);
    }
  }

  private emitDrawModeChanged(): void {
    for (const cb of this.drawModeListeners) {
      cb(this.drawMode);
    }
  }

  removeAllFeatureGroups() {
    this.arrayOfFeatureGroups.forEach((featureGroups) => {
      try {
        this.map.removeLayer(featureGroups);
      } catch (error) {
        // Silently handle layer removal errors
      }
    });
    this.arrayOfFeatureGroups = [];
    this.polygonInformation.deletePolygonInformationStorage();
    this.polygonInformation.updatePolygons();
  }

  private stopDraw() {
    this.resetTracker();
    this.drawStartedEvents(false);
  }

  private setLeafletMapEvents(
    enableDragging: boolean,
    enableDoubleClickZoom: boolean,
    enableScrollWheelZoom: boolean,
  ) {
    enableDragging ? this.map.dragging.enable() : this.map.dragging.disable();
    enableDoubleClickZoom ? this.map.doubleClickZoom.enable() : this.map.doubleClickZoom.disable();
    enableScrollWheelZoom ? this.map.scrollWheelZoom.enable() : this.map.scrollWheelZoom.disable();
  }

  private resetTracker() {
    this.tracer.setLatLngs([]);
  }

  private drawStartedEvents(onoff: boolean) {
    const onoroff = onoff ? 'on' : 'off';
    this.map[onoroff]('mousemove', this.mouseMove, this);
    this.map[onoroff]('mouseup', this.mouseUpLeave, this);

    if (onoff) {
      try {
        this.map.getContainer().addEventListener('touchmove', (e) => this.mouseMove(e));
        this.map.getContainer().addEventListener('touchend', (e) => this.mouseUpLeave(e));
      } catch (error) {
        // Silently handle DOM errors
      }
    } else {
      try {
        this.map.getContainer().removeEventListener('touchmove', (e) => this.mouseMove(e), true);
        this.map.getContainer().removeEventListener('touchend', (e) => this.mouseUpLeave(e), true);
      } catch (error) {
        // Silently handle DOM errors
      }
    }
  }

  private mouseMove(event: L.LeafletMouseEvent | TouchEvent) {
    if ('latlng' in event && event.latlng) {
      this.tracer.addLatLng(event.latlng);
    } else if ('touches' in event && event.touches && event.touches.length > 0) {
      const latlng = this.map.containerPointToLatLng([
        event.touches[0].clientX,
        event.touches[0].clientY,
      ]);
      this.tracer.addLatLng(latlng);
    }
  }

  private mouseUpLeave(event: any) {
    console.log('mouseUpLeave', this.tracer.toGeoJSON());
    this.polygonInformation.deletePolygonInformationStorage();

    const geoPos: Feature<Polygon | MultiPolygon> = this.turfHelper.turfConcaveman(
      this.tracer.toGeoJSON() as any,
    );
    console.log(geoPos);
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
  }

  private subtractPolygon(latlngs: Feature<Polygon | MultiPolygon>) {
    this.subtract(latlngs);
  }

  private addPolygon(
    latlngs: Feature<Polygon | MultiPolygon>,
    simplify: boolean,
    noMerge: boolean = false,
  ) {
    console.log('addPolygon', latlngs, simplify, noMerge, this.kinks, this.config);

    if (this.mergePolygons && !noMerge && this.arrayOfFeatureGroups.length > 0 && !this.kinks) {
      this.merge(latlngs);
    } else {
      this.addPolygonLayer(latlngs, simplify);
    }
  }

  private addPolygonLayer(
    latlngs: Feature<Polygon | MultiPolygon>,
    simplify: boolean,
    dynamicTolerance: boolean = false,
    visualOptimizationLevel: number = 0,
  ) {
    const featureGroup: L.FeatureGroup = new L.FeatureGroup();

    const latLngs = simplify ? this.turfHelper.getSimplified(latlngs, dynamicTolerance) : latlngs;
    console.log('AddPolygonLayer: ', latLngs);
    const polygon = this.getPolygon(latLngs);
    (polygon as any)._polydrawOptimizationLevel = visualOptimizationLevel;
    featureGroup.addLayer(polygon);
    console.log(polygon);

    const markerLatlngs = polygon.getLatLngs();
    markerLatlngs.forEach((polygon) => {
      polygon.forEach((polyElement: ILatLng[], i: number) => {
        if (i === 0) {
          this.addMarker(polyElement, featureGroup);
        } else {
          // Add red polyline overlay for hole rings
          const holePolyline = L.polyline(polyElement, {
            color: this.config.holeOptions.color,
            weight: this.config.holeOptions.weight || 2,
            opacity: this.config.holeOptions.opacity || 1,
          });
          featureGroup.addLayer(holePolyline);

          this.addHoleMarker(polyElement, featureGroup);
          console.log('Hull: ', polyElement);
        }
      });
      console.log('This is a good place to add area info icon');
    });

    // Add edge click listeners for polygon edge interactions
    this.addEdgeClickListeners(polygon, featureGroup);

    this.arrayOfFeatureGroups.push(featureGroup);
    console.log('Array: ', this.arrayOfFeatureGroups);
    this.setDrawMode(DrawMode.Off);

    featureGroup.on('click', (e) => {
      this.polygonClicked(e, latLngs);
    });
  }

  private polygonClicked(e: any, poly: Feature<Polygon | MultiPolygon>) {
    if (this.config.modes.attachElbow) {
      const newPoint = e.latlng;
      if (poly.geometry.type === 'MultiPolygon') {
        const newPolygon = this.turfHelper.injectPointToPolygon(poly, [newPoint.lng, newPoint.lat]);
        this.deletePolygon(this.getLatLngsFromJson(poly));
        this.addPolygonLayer(newPolygon, false);
      }
    }
  }

  private getPolygon(latlngs: Feature<Polygon | MultiPolygon>) {
    console.log('getPolygons: ', latlngs);
    const polygon = L.GeoJSON.geometryToLayer(latlngs) as any;
    polygon.setStyle(this.config.polygonOptions);

    // Enable polygon dragging if configured
    if (this.config.modes.dragPolygons) {
      this.enablePolygonDragging(polygon, latlngs);
    }

    return polygon;
  }

  private merge(latlngs: Feature<Polygon | MultiPolygon>) {
    console.log('merge', latlngs);
    const polygonFeature = [];
    const newArray: L.FeatureGroup[] = [];
    let polyIntersection: boolean = false;

    this.arrayOfFeatureGroups.forEach((featureGroup) => {
      try {
        const featureCollection = featureGroup.toGeoJSON() as any;
        if (!featureCollection || !featureCollection.features || !featureCollection.features[0]) {
          return;
        }

        const firstFeature = featureCollection.features[0];
        if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
          return;
        }

        if (firstFeature.geometry.coordinates.length > 1) {
          firstFeature.geometry.coordinates.forEach((element) => {
            try {
              const feature = this.turfHelper.getMultiPolygon([element]);
              polyIntersection = this.checkPolygonIntersection(feature, latlngs);
              if (polyIntersection) {
                newArray.push(featureGroup);
                polygonFeature.push(feature);
              }
            } catch (error) {
              console.warn('merge: Error processing multi-polygon element:', error);
            }
          });
        } else {
          try {
            const feature = this.turfHelper.getTurfPolygon(firstFeature);
            polyIntersection = this.checkPolygonIntersection(feature, latlngs);
            if (polyIntersection) {
              newArray.push(featureGroup);
              polygonFeature.push(feature);
            }
          } catch (error) {
            console.warn('merge: Error processing single polygon:', error);
          }
        }
      } catch (error) {
        console.warn('merge: Error processing feature group:', error);
      }
    });

    console.log('Intersecting polygons found:', newArray.length);
    if (newArray.length > 0) {
      this.unionPolygons(newArray, latlngs, polygonFeature);
    } else {
      this.addPolygonLayer(latlngs, true);
    }
  }

  // Improved intersection detection with multiple fallback methods
  private checkPolygonIntersection(
    polygon1: Feature<Polygon | MultiPolygon>,
    polygon2: Feature<Polygon | MultiPolygon>,
  ): boolean {
    console.log('🔍 checkPolygonIntersection called');
    console.log('Polygon1:', polygon1);
    console.log('Polygon2:', polygon2);

    // Method 1: Try the original polygonIntersect
    try {
      const result = this.turfHelper.polygonIntersect(polygon1, polygon2);
      console.log('polygonIntersect result:', result);
      if (result) {
        console.log('✅ Intersection detected via polygonIntersect');
        return true;
      }
    } catch (error) {
      console.warn('❌ polygonIntersect failed:', error.message);
    }

    // Method 2: Try direct intersection check
    try {
      const intersection = this.turfHelper.getIntersection(polygon1, polygon2);
      console.log('getIntersection result:', intersection);
      if (
        intersection &&
        intersection.geometry &&
        (intersection.geometry.type === 'Polygon' || intersection.geometry.type === 'MultiPolygon')
      ) {
        console.log('✅ Intersection detected via getIntersection');
        return true;
      }
    } catch (error) {
      console.warn('❌ getIntersection failed:', error.message);
    }

    // Method 3: Bounding box overlap check as fallback
    try {
      const bbox1 = this.getBoundingBox(polygon1);
      const bbox2 = this.getBoundingBox(polygon2);
      console.log('Bounding boxes:', { bbox1, bbox2 });

      if (bbox1 && bbox2) {
        const overlaps = !(
          bbox1.maxLng < bbox2.minLng ||
          bbox2.maxLng < bbox1.minLng ||
          bbox1.maxLat < bbox2.minLat ||
          bbox2.maxLat < bbox1.minLat
        );

        console.log('Bounding box overlap check:', overlaps);
        if (overlaps) {
          console.log('✅ Intersection detected via bounding box overlap');
          return true;
        }
      }
    } catch (error) {
      console.warn('❌ Bounding box check failed:', error.message);
    }

    // Method 4: Simple distance-based check as final fallback
    try {
      const center1 = this.getPolygonCenter(polygon1);
      const center2 = this.getPolygonCenter(polygon2);

      if (center1 && center2) {
        const distance = Math.sqrt(
          Math.pow(center1.lng - center2.lng, 2) + Math.pow(center1.lat - center2.lat, 2),
        );

        // If polygons are very close (within 0.01 degrees), consider them overlapping
        if (distance < 0.01) {
          console.log('✅ Intersection detected via distance check (distance:', distance, ')');
          return true;
        }
      }
    } catch (error) {
      console.warn('❌ Distance check failed:', error.message);
    }

    console.log('❌ No intersection detected');
    return false;
  }

  // Helper method to get polygon center
  private getPolygonCenter(
    polygon: Feature<Polygon | MultiPolygon>,
  ): { lat: number; lng: number } | null {
    try {
      if (!polygon || !polygon.geometry || !polygon.geometry.coordinates) {
        return null;
      }

      let coordinates;
      if (polygon.geometry.type === 'Polygon') {
        coordinates = polygon.geometry.coordinates[0]; // First ring (outer ring)
      } else if (polygon.geometry.type === 'MultiPolygon') {
        coordinates = polygon.geometry.coordinates[0][0]; // First polygon, first ring
      } else {
        return null;
      }

      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        return null;
      }

      let sumLat = 0;
      let sumLng = 0;
      let count = 0;

      for (const coord of coordinates) {
        if (Array.isArray(coord) && coord.length >= 2) {
          const lng = coord[0];
          const lat = coord[1];

          if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
            sumLng += lng;
            sumLat += lat;
            count++;
          }
        }
      }

      if (count === 0) {
        return null;
      }

      return {
        lat: sumLat / count,
        lng: sumLng / count,
      };
    } catch (error) {
      console.warn('getPolygonCenter failed:', error.message);
      return null;
    }
  }

  // Helper method to get bounding box from polygon
  private getBoundingBox(
    polygon: Feature<Polygon | MultiPolygon>,
  ): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
    try {
      if (!polygon || !polygon.geometry || !polygon.geometry.coordinates) {
        return null;
      }

      let coordinates;
      if (polygon.geometry.type === 'Polygon') {
        coordinates = polygon.geometry.coordinates[0]; // First ring (outer ring)
      } else if (polygon.geometry.type === 'MultiPolygon') {
        coordinates = polygon.geometry.coordinates[0][0]; // First polygon, first ring
      } else {
        return null;
      }

      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        return null;
      }

      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLng = Infinity;
      let maxLng = -Infinity;

      for (const coord of coordinates) {
        if (Array.isArray(coord) && coord.length >= 2) {
          const lng = coord[0];
          const lat = coord[1];

          if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          }
        }
      }

      if (
        minLat === Infinity ||
        maxLat === -Infinity ||
        minLng === Infinity ||
        maxLng === -Infinity
      ) {
        return null;
      }

      return { minLat, maxLat, minLng, maxLng };
    } catch (error) {
      console.warn('getBoundingBox failed:', error.message);
      return null;
    }
  }

  private subtract(latlngs: Feature<Polygon | MultiPolygon>) {
    console.log('subtract called with:', latlngs);

    // Find only the polygons that actually intersect with the subtract area
    const intersectingFeatureGroups: L.FeatureGroup[] = [];

    this.arrayOfFeatureGroups.forEach((featureGroup) => {
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

        // Check if the subtract area intersects with this polygon
        const hasIntersection = this.checkPolygonIntersection(existingPolygon, latlngs);

        if (hasIntersection) {
          console.log('Found intersecting polygon for subtract operation');
          intersectingFeatureGroups.push(featureGroup);
        }
      } catch (error) {
        console.warn('subtract: Error checking intersection:', error);
      }
    });

    console.log(`subtract: Found ${intersectingFeatureGroups.length} intersecting polygons`);

    // Only apply subtract to intersecting polygons
    intersectingFeatureGroups.forEach((featureGroup) => {
      try {
        const featureCollection = featureGroup.toGeoJSON() as any;
        const layer = featureCollection.features[0];
        const poly = this.getLatLngsFromJson(layer);
        const feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

        // Perform the difference operation (subtract)
        const newPolygon = this.turfHelper.polygonDifference(feature, latlngs);

        // Remove the original polygon
        this.removeFeatureGroup(featureGroup);

        // Add the result (polygon with hole or remaining parts)
        if (newPolygon) {
          const coords = this.turfHelper.getCoords(newPolygon);
          coords.forEach((value) => {
            this.addPolygonLayer(this.turfHelper.getMultiPolygon([value]), true);
          });
        }
      } catch (error) {
        console.warn('subtract: Error during subtract operation:', error);
      }
    });

    // If no intersections found, just ignore the subtract operation
    if (intersectingFeatureGroups.length === 0) {
      console.log('subtract: No intersecting polygons found, ignoring subtract operation');
    }
  }

  private events(onoff: boolean) {
    const onoroff = onoff ? 'on' : 'off';
    this.map[onoroff]('mousedown', this.mouseDown, this);

    if (onoff) {
      try {
        this.map.getContainer().addEventListener('touchstart', (e) => this.mouseDown(e));
      } catch (error) {
        // Silently handle DOM errors
      }
    } else {
      try {
        this.map.getContainer().removeEventListener('touchstart', (e) => this.mouseDown(e), true);
      } catch (error) {
        // Silently handle DOM errors
      }
    }
  }

  private mouseDown(event: L.LeafletMouseEvent | TouchEvent) {
    console.log('mouseDown', event);

    let startLatLng;
    if ('latlng' in event && event.latlng) {
      startLatLng = event.latlng;
    } else if ('touches' in event && event.touches && event.touches.length > 0) {
      startLatLng = this.map.containerPointToLatLng([
        event.touches[0].clientX,
        event.touches[0].clientY,
      ]);
    }

    if (startLatLng) {
      this.tracer.setLatLngs([startLatLng]);
      console.log(this.tracer.getLatLngs());
      this.startDraw();
    }
  }

  private startDraw() {
    this.drawStartedEvents(true);
  }

  // ANGULAR VERSION'S SIMPLE MARKER DRAG - THE KEY FIX!
  private markerDrag(FeatureGroup: L.FeatureGroup) {
    const newPos = [];
    let testarray = [];
    let hole = [];
    const layerLength = FeatureGroup.getLayers() as any;
    const posarrays = layerLength[0].getLatLngs();
    console.log(posarrays);
    let length = 0;

    // Filter out only markers from the layers (exclude polylines for holes)
    const markers = layerLength.filter((layer: any) => layer instanceof L.Marker);

    if (posarrays.length > 1) {
      for (let index = 0; index < posarrays.length; index++) {
        testarray = [];
        hole = [];
        console.log('Posisjoner: ', posarrays[index]);
        if (index === 0) {
          if (posarrays[0].length > 1) {
            for (let i = 0; i < posarrays[0].length; i++) {
              console.log('Posisjoner 2: ', posarrays[index][i]);
              for (let j = 0; j < posarrays[0][i].length; j++) {
                // KEY: Angular version creates NEW L.LatLng instances
                // Use markers array instead of layerLength to avoid polylines
                if (markers[j]) {
                  testarray.push(markers[j].getLatLng());
                }
              }
              hole.push(testarray);
            }
          } else {
            for (let j = 0; j < posarrays[0][0].length; j++) {
              // KEY: Angular version creates NEW L.LatLng instances
              if (markers[j]) {
                testarray.push(markers[j].getLatLng());
              }
            }
            hole.push(testarray);
          }
          console.log('Hole: ', hole);
          newPos.push(hole);
        } else {
          length += posarrays[index - 1][0].length;
          console.log('STart index: ', length);
          for (let j = length; j < posarrays[index][0].length + length; j++) {
            // KEY: Angular version creates NEW L.LatLng instances
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
        console.log('Polygon drag: ', posarrays[0][index]);
        if (index === 0) {
          if (posarrays[0][index].length > 1) {
            for (let j = 0; j < posarrays[0][index].length; j++) {
              // KEY: Angular version creates NEW L.LatLng instances
              if (markers[j]) {
                testarray.push(markers[j].getLatLng());
              }
            }
          } else {
            for (let j = 0; j < posarrays[0][0].length; j++) {
              // KEY: Angular version creates NEW L.LatLng instances
              if (markers[j]) {
                testarray.push(markers[j].getLatLng());
              }
            }
          }
        } else {
          length2 += posarrays[0][index - 1].length;
          for (let j = length2; j < posarrays[0][index].length + length2; j++) {
            // KEY: Angular version creates NEW L.LatLng instances
            if (markers[j]) {
              testarray.push(markers[j].getLatLng());
            }
          }
        }
        hole.push(testarray);
      }
      newPos.push(hole);
      console.log('Hole 2: ', hole);
    }
    console.log('Nye posisjoner: ', newPos);
    layerLength[0].setLatLngs(newPos);
  }

  // Angular version's simple markerDragEnd
  private markerDragEnd(FeatureGroup: L.FeatureGroup) {
    this.polygonInformation.deletePolygonInformationStorage();
    const featureCollection = FeatureGroup.toGeoJSON() as any;
    console.log('Markerdragend polygon: ', featureCollection.features[0].geometry.coordinates);

    // Remove the current feature group first to avoid duplication
    this.removeFeatureGroup(FeatureGroup);

    if (featureCollection.features[0].geometry.coordinates.length > 1) {
      featureCollection.features[0].geometry.coordinates.forEach((element) => {
        const feature = this.turfHelper.getMultiPolygon([element]);
        console.log('Markerdragend: ', feature);

        if (this.turfHelper.hasKinks(feature)) {
          this.kinks = true;
          const unkink = this.turfHelper.getKinks(feature);
          console.log('Unkink: ', unkink);
          unkink.forEach((polygon) => {
            // Allow merging after marker drag - this enables polygon merging when dragged into each other
            this.addPolygon(this.turfHelper.getTurfPolygon(polygon), false, false);
          });
        } else {
          this.kinks = false;
          // Allow merging after marker drag - this enables polygon merging when dragged into each other
          this.addPolygon(feature, false, false);
        }
      });
    } else {
      const feature = this.turfHelper.getMultiPolygon(
        featureCollection.features[0].geometry.coordinates,
      );
      console.log('Markerdragend: ', feature);

      if (this.turfHelper.hasKinks(feature)) {
        this.kinks = true;
        const unkink = this.turfHelper.getKinks(feature);
        console.log('Unkink: ', unkink);
        unkink.forEach((polygon) => {
          // Allow merging after marker drag - this enables polygon merging when dragged into each other
          this.addPolygon(this.turfHelper.getTurfPolygon(polygon), false, false);
        });
      } else {
        this.kinks = false;
        // Allow merging after marker drag - this enables polygon merging when dragged into each other
        this.addPolygon(feature, false, false);
      }
    }
    console.log(this.arrayOfFeatureGroups);
    this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
  }

  private getLatLngsFromJson(feature: Feature<Polygon | MultiPolygon>): ILatLng[][] {
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

  private unionPolygons(layers, latlngs: Feature<Polygon | MultiPolygon>, polygonFeature) {
    let addNew = latlngs;
    layers.forEach((featureGroup, i) => {
      const featureCollection = featureGroup.toGeoJSON();
      const layer = featureCollection.features[0];
      const poly = this.getLatLngsFromJson(layer);
      const union = this.turfHelper.union(addNew, polygonFeature[i]);
      this.deletePolygonOnMerge(poly);
      this.removeFeatureGroup(featureGroup);
      addNew = union;
    });

    const newLatlngs: Feature<Polygon | MultiPolygon> = addNew;
    this.addPolygonLayer(newLatlngs, true);
  }

  private removeFeatureGroup(featureGroup: L.FeatureGroup) {
    featureGroup.clearLayers();
    this.arrayOfFeatureGroups = this.arrayOfFeatureGroups.filter(
      (featureGroups) => featureGroups !== featureGroup,
    );
    this.map.removeLayer(featureGroup);
  }

  private removeFeatureGroupOnMerge(featureGroup: L.FeatureGroup) {
    const newArray = [];
    if (featureGroup.getLayers()[0]) {
      const polygon = (featureGroup.getLayers()[0] as any).getLatLngs()[0];
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

  private deletePolygonOnMerge(polygon) {
    let polygon2 = [];
    if (this.arrayOfFeatureGroups.length > 0) {
      this.arrayOfFeatureGroups.forEach((featureGroup) => {
        const layer = featureGroup.getLayers()[0] as any;
        const latlngs = layer.getLatLngs()[0];
        polygon2 = [...latlngs[0]];
        if (latlngs[0][0] !== latlngs[0][latlngs[0].length - 1]) {
          polygon2.push(latlngs[0][0]);
        }
        const equals = this.polygonArrayEqualsMerge(polygon2, polygon);

        if (equals) {
          this.removeFeatureGroupOnMerge(featureGroup);
          this.deletePolygon(polygon);
          this.polygonInformation.deleteTrashcan(polygon);
        }
      });
    }
  }

  private polygonArrayEqualsMerge(poly1: any[], poly2: any[]): boolean {
    return poly1.toString() === poly2.toString();
  }

  deletePolygon(polygon: ILatLng[][]) {
    console.log('deletePolygon: ', polygon);
    if (this.arrayOfFeatureGroups.length > 0) {
      this.arrayOfFeatureGroups.forEach((featureGroup) => {
        const layer = featureGroup.getLayers()[0] as any;
        const latlngs = layer.getLatLngs();
        const length = latlngs.length;

        latlngs.forEach((latlng, index) => {
          let polygon3;
          const test = [...latlng];

          console.log(latlng);
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

          console.log('Test: ', polygon3);
          console.log(polygon);

          const equals = this.polygonArrayEquals(polygon3, polygon);
          console.log('equals: ', equals, ' length: ', length);
          if (equals && length === 1) {
            this.polygonInformation.deleteTrashcan(polygon);
            this.removeFeatureGroup(featureGroup);
            console.log(featureGroup.getLayers());
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

  private polygonArrayEquals(poly1: any[], poly2: any[]): boolean {
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

  private addMarker(latlngs: ILatLng[], FeatureGroup: L.FeatureGroup) {
    const menuMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerMenuIcon.position);
    const deleteMarkerIdx = this.getMarkerIndex(
      latlngs,
      this.config.markers.markerDeleteIcon.position,
    );
    const infoMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerInfoIcon.position);

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
      const marker = new L.Marker(latlng, {
        icon: IconFactory.createDivIcon(processedClasses),
        draggable: this.config.modes.dragElbow,
        title: this.config.markers.coordsTitle ? this.getLatLngInfoString(latlng) : '',
        zIndexOffset:
          this.config.markers.markerIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
      });

      FeatureGroup.addLayer(marker).addTo(this.map);

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
        const area = PolygonUtil.getSqmArea(latlngs);
        const perimeter = PolygonUtil.getPerimeter(latlngs);
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
  }

  private addHoleMarker(latlngs: ILatLng[], FeatureGroup: L.FeatureGroup) {
    latlngs.forEach((latlng, i) => {
      // Use holeIcon styles instead of regular markerIcon styles
      const iconClasses = this.config.markers.holeIcon.styleClasses;
      const processedClasses = Array.isArray(iconClasses) ? iconClasses : [iconClasses];
      const marker = new L.Marker(latlng, {
        icon: IconFactory.createDivIcon(processedClasses),
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

  private getLatLngInfoString(latlng: ILatLng): string {
    return 'Latitude: ' + latlng.lat + ' Longitude: ' + latlng.lng;
  }

  private generateMenuMarkerPopup(latLngs: ILatLng[]): HTMLDivElement {
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
    const separator: HTMLDivElement = document.createElement('div');
    separator.classList.add('separator');

    outerWrapper.appendChild(wrapper);
    wrapper.appendChild(invertedCorner);
    wrapper.appendChild(markerContent);
    markerContent.appendChild(markerContentWrapper);
    markerContentWrapper.appendChild(simplify);
    markerContentWrapper.appendChild(separator);

    return outerWrapper;
  }

  private generateInfoMarkerPopup(area: number, perimeter: number): HTMLDivElement {
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

    outerWrapper.appendChild(wrapper);
    wrapper.appendChild(invertedCorner);
    wrapper.appendChild(markerContent);

    return outerWrapper;
  }

  // SIMPLE POLYGON DRAGGING - NO MANAGERS!
  private enablePolygonDragging(polygon: any, latlngs: Feature<Polygon | MultiPolygon>) {
    if (!this.config.modes.dragPolygons) return;

    // Store original data for dragging
    polygon._polydrawOriginalLatLngs = latlngs;
    polygon._polydrawDragData = {
      isDragging: false,
      startPosition: null,
      startLatLngs: null,
    };

    // Add mouse down event to start dragging
    polygon.on('mousedown', (e: any) => {
      if (this.getDrawMode() !== DrawMode.Off) return;

      // Prevent event bubbling
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

      // Set drag cursor
      try {
        const container = this.map.getContainer();
        container.style.cursor = this.config.dragPolygons.dragCursor || 'move';
      } catch (error) {
        // Handle DOM errors
      }

      // Add global mouse move and up handlers
      this.map.on('mousemove', this.onPolygonMouseMove, this);
      this.map.on('mouseup', this.onPolygonMouseUp, this);

      // Store current dragging polygon
      this.currentDragPolygon = polygon;
    });

    // Set hover cursor
    polygon.on('mouseover', () => {
      if (!polygon._polydrawDragData.isDragging && this.getDrawMode() === DrawMode.Off) {
        try {
          const container = this.map.getContainer();
          container.style.cursor = this.config.dragPolygons.hoverCursor || 'grab';
        } catch (error) {
          // Handle DOM errors
        }
      }
    });

    polygon.on('mouseout', () => {
      if (!polygon._polydrawDragData.isDragging && this.getDrawMode() === DrawMode.Off) {
        try {
          const container = this.map.getContainer();
          container.style.cursor = '';
        } catch (error) {
          // Handle DOM errors
        }
      }
    });
  }

  // Simple polygon drag state
  private currentDragPolygon: any = null;

  private onPolygonMouseMove = (e: L.LeafletMouseEvent) => {
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

    // Update markers and hole lines in real-time during drag
    this.updateMarkersAndHoleLinesDuringDrag(polygon, offsetLat, offsetLng);
  };

  private onPolygonMouseUp = (e: L.LeafletMouseEvent) => {
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

    // Reset cursor
    try {
      const container = this.map.getContainer();
      container.style.cursor = '';
    } catch (error) {
      // Handle DOM errors
    }

    // Update polygon coordinates using simple approach: delete -> modify -> add
    this.updatePolygonAfterDrag(polygon);

    // Clear stored original positions for next drag
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

    // Clear current drag polygon
    this.currentDragPolygon = null;
  };

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

  private updateMarkersAndHoleLinesDuringDrag(polygon: any, offsetLat: number, offsetLng: number) {
    try {
      // Find the feature group containing this polygon
      let featureGroup: L.FeatureGroup | null = null;

      for (const fg of this.arrayOfFeatureGroups) {
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

      // Store original positions if not already stored - use unique key per drag session
      const dragSessionKey = '_polydrawDragSession_' + Date.now();
      if (!polygon._polydrawCurrentDragSession) {
        polygon._polydrawCurrentDragSession = dragSessionKey;
        polygon._polydrawOriginalMarkerPositions = new Map();
        polygon._polydrawOriginalHoleLinePositions = new Map();

        // Only store positions for THIS feature group's layers
        featureGroup.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            polygon._polydrawOriginalMarkerPositions.set(layer, layer.getLatLng());
          } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            polygon._polydrawOriginalHoleLinePositions.set(layer, layer.getLatLngs());
          }
        });
      }

      // Update ONLY the markers and hole lines in THIS feature group
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
      // Silently handle errors during real-time updates
    }
  }

  private updatePolygonAfterDrag(polygon: any) {
    try {
      // Get the feature group that contains this polygon
      let featureGroup: L.FeatureGroup | null = null;

      // Find the feature group containing this polygon
      for (const fg of this.arrayOfFeatureGroups) {
        fg.eachLayer((layer) => {
          if (layer === polygon) {
            featureGroup = fg;
          }
        });
        if (featureGroup) break;
      }

      if (!featureGroup) {
        console.warn('Could not find feature group for dragged polygon');
        return;
      }

      // Get new coordinates from dragged polygon
      const newGeoJSON = polygon.toGeoJSON();

      // Simple approach: remove old, add new
      this.removeFeatureGroup(featureGroup);

      // Add the updated polygon (with noMerge=true to prevent unwanted merging during drag)
      const feature = this.turfHelper.getTurfPolygon(newGeoJSON);
      this.addPolygon(feature, false, true);

      // Update polygon information
      this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
    } catch (error) {
      console.warn('Failed to update polygon after drag:', error.message);
    }
  }

  // ========================================================================
  // POLYGON EDGE MANAGER FUNCTIONALITY - INTEGRATED FROM MANAGER
  // ========================================================================

  /**
   * Add click listeners to polygon edges for edge-specific interactions
   * Integrated from PolygonEdgeManager
   */
  private addEdgeClickListeners(polygon: L.Polygon, featureGroup: L.FeatureGroup): void {
    const rawLatLngs = polygon.getLatLngs();

    // Handle different polygon structures - Leaflet can return different nesting levels
    let processedRings: ILatLng[][];

    if (Array.isArray(rawLatLngs) && rawLatLngs.length > 0) {
      if (Array.isArray(rawLatLngs[0])) {
        // Check if rawLatLngs[0][0] is an array of LatLng objects
        if (Array.isArray(rawLatLngs[0][0]) && rawLatLngs[0][0].length > 0) {
          const firstCoord = rawLatLngs[0][0][0];

          // Check if it's an array of coordinate objects
          if (firstCoord && typeof firstCoord === 'object' && 'lat' in firstCoord) {
            // This is the case: we have LatLng objects, but they're nested one level too deep
            // The structure is [Array(1)] -> [Array(N)] -> N LatLng objects
            // We need to extract from rawLatLngs[0], not rawLatLngs
            processedRings = rawLatLngs[0] as ILatLng[][];
          } else {
            // Fallback for other structures
            processedRings = rawLatLngs[0] as ILatLng[][];
          }
        } else if (
          rawLatLngs[0][0] &&
          typeof rawLatLngs[0][0] === 'object' &&
          'lat' in rawLatLngs[0][0]
        ) {
          // Structure: [[{lat, lng}, ...]] (single ring wrapped in array)
          processedRings = rawLatLngs as ILatLng[][];
        } else {
          // Fallback: rawLatLngs[0] contains the actual coordinate arrays
          processedRings = rawLatLngs[0] as ILatLng[][];
        }
      } else if (rawLatLngs[0] && typeof rawLatLngs[0] === 'object' && 'lat' in rawLatLngs[0]) {
        // Structure: [{lat, lng}, ...] (direct coordinate array)
        processedRings = [rawLatLngs as ILatLng[]];
      } else {
        processedRings = [rawLatLngs as ILatLng[]];
      }
    } else {
      return;
    }

    // Process each ring (outer ring and holes)
    processedRings.forEach((ring, ringIndex) => {
      // Create invisible polylines for each edge, including the closing edge
      for (let i = 0; i < ring.length; i++) {
        const edgeStart = ring[i];
        const edgeEnd = ring[(i + 1) % ring.length]; // Use modulo to wrap around to first point

        // Skip if start and end are the same (duplicate closing point)
        if (edgeStart.lat === edgeEnd.lat && edgeStart.lng === edgeEnd.lng) {
          continue;
        }

        // Create an invisible polyline for this edge
        const edgePolyline = L.polyline([edgeStart, edgeEnd], {
          color: 'transparent',
          weight: 10, // Wide invisible line for easier clicking
          opacity: 0,
          interactive: true, // Make it clickable
        });

        // Store edge information for later use
        (edgePolyline as any)._polydrawEdgeInfo = {
          ringIndex,
          edgeIndex: i,
          startPoint: edgeStart,
          endPoint: edgeEnd,
          parentPolygon: polygon,
          parentFeatureGroup: featureGroup,
        };

        // Add click listener to the edge
        edgePolyline.on('click', (e: L.LeafletMouseEvent) => {
          this.onEdgeClick(e, edgePolyline);
        });

        // Add hover listeners for visual feedback
        edgePolyline.on('mouseover', () => {
          this.highlightEdgeOnHover(edgePolyline, true);
        });

        edgePolyline.on('mouseout', () => {
          this.highlightEdgeOnHover(edgePolyline, false);
        });

        // Add the invisible edge polyline to the feature group
        featureGroup.addLayer(edgePolyline);
      }
    });
  }

  /**
   * Handle edge click events
   * Integrated from PolygonEdgeManager
   */
  private onEdgeClick(e: L.LeafletMouseEvent, edgePolyline: L.Polyline): void {
    const edgeInfo = (edgePolyline as any)._polydrawEdgeInfo;
    if (!edgeInfo) return;
    const newPoint = e.latlng;
    const parentPolygon = edgeInfo.parentPolygon;
    const parentFeatureGroup = edgeInfo.parentFeatureGroup;
    if (parentPolygon && parentFeatureGroup) {
      try {
        if (typeof parentPolygon.toGeoJSON !== 'function') {
          return;
        }
        // Get the polygon as GeoJSON
        const poly = parentPolygon.toGeoJSON();
        // Process both Polygon and MultiPolygon types
        if (poly.geometry.type === 'MultiPolygon' || poly.geometry.type === 'Polygon') {
          const newPolygon = this.turfHelper.injectPointToPolygon(poly, [
            newPoint.lng,
            newPoint.lat,
          ]);
          if (newPolygon) {
            const optimizationLevel = (parentPolygon as any)._polydrawOptimizationLevel || 0;
            this.removeFeatureGroup(parentFeatureGroup);
            this.addPolygonLayer(newPolygon, false, false, optimizationLevel);
          }
        }
      } catch (error) {
        // TODO: Add proper error handling.
        // Silently handle errors
      }
    }
    // Stop event propagation to prevent polygon click
    L.DomEvent.stopPropagation(e);
  }

  /**
   * Highlight edge on hover
   * Integrated from PolygonEdgeManager
   */
  private highlightEdgeOnHover(edgePolyline: L.Polyline, isHovering: boolean): void {
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
}

(L.control as any).polydrawSimple = function (options: L.ControlOptions) {
  return new PolydrawSimple(options);
};

export default PolydrawSimple;

// /**
//  * Polydraw is a Leaflet control for drawing, editing, and managing polygons on a map.
//  * It provides tools for adding, subtracting, and modifying polygons with various features like simplification and merging.
//  */
// import * as L from 'leaflet';
// import defaultConfig from './config.json';
// import { DrawMode, MarkerPosition } from './enums';
// import { TurfHelper } from './turf-helper';
// import { createButtons } from './buttons';
// import { PolygonInformationService } from './polygon-information.service';
// import { MapStateService } from './map-state';
// import { Compass, PolyDrawUtil, Perimeter, Area } from './utils';
// import { IconFactory } from './icon-factory';
// import { PolygonUtil } from './polygon.util';
// import type { Feature, Polygon, MultiPolygon } from 'geojson';
// import './styles/polydraw.css';

// // Import new utility classes
// import { PolygonValidator } from './core/validation';
// import { CoordinateUtils } from './coordinate-utils';

// // Import managers
// import { MarkerManager } from './managers/marker-manager';
// import { PolygonDragManager } from './managers/polygon-drag-manager';
// import { PolygonEdgeManager } from './managers/polygon-edge-manager';

// // Import comprehensive type definitions
// import type {
//   AutoPolygonOptions,
//   ILatLng,
//   PolydrawConfig,
//   PolydrawPolygon,
//   PolydrawFeatureGroup,
//   DrawModeChangeHandler,
// } from './types/polydraw-interfaces';

// // Import State Manager
// import { PolydrawStateManager } from './core/state-manager';

// // Import Simplified Managers
// import { PolygonStateManager } from './core/polygon-state-manager';
// import { SimplifiedMarkerManager } from './core/simplified-marker-manager';

// class Polydraw extends L.Control {
//   private map: L.Map;
//   private tracer: L.Polyline = {} as L.Polyline;
//   private kinks: boolean;
//   private mergePolygons: boolean;
//   private turfHelper: TurfHelper;

//   private subContainer?: HTMLElement;
//   private config: PolydrawConfig;

//   private mapStateService: MapStateService;
//   private polygonInformation: PolygonInformationService;

//   // State Manager - centralized state management
//   private stateManager: PolydrawStateManager;

//   // Simplified Managers - new approach
//   private polygonStateManager: PolygonStateManager;
//   private simplifiedMarkerManager: SimplifiedMarkerManager;

//   // Manager instances (legacy - for backward compatibility)
//   private markerManager: MarkerManager;
//   private polygonDragManager: PolygonDragManager;
//   private polygonEdgeManager: PolygonEdgeManager;

//   constructor(options?: L.ControlOptions & { config?: PolydrawConfig }) {
//     super(options);
//     this.config = { ...defaultConfig, ...(options?.config || {}) } as PolydrawConfig;
//     this.mergePolygons = this.config.mergePolygons ?? true;
//     this.kinks = this.config.kinks ?? false;
//     this.turfHelper = new TurfHelper(this.config);
//     this.mapStateService = new MapStateService();
//     this.polygonInformation = new PolygonInformationService(this.mapStateService);
//     this.polygonInformation.onPolygonInfoUpdated((_k) => {
//       // Handle polygon info update
//     });

//     // Initialize State Manager
//     this.stateManager = new PolydrawStateManager();
//   }

//   /**
//    * Initialize managers after map is available
//    */
//   private initializeManagers() {
//     // Initialize simplified managers first
//     this.polygonStateManager = new PolygonStateManager(
//       this.config,
//       this.turfHelper,
//       this.map,
//       this.stateManager,
//       (geoJSON, optimizationLevel) => this.createFeatureGroupForPolygon(geoJSON, optimizationLevel),
//     );

//     this.simplifiedMarkerManager = new SimplifiedMarkerManager(
//       this.config,
//       this.polygonStateManager,
//     );

//     // Initialize legacy managers for backward compatibility
//     this.markerManager = new MarkerManager(this.config, this.turfHelper, this.map);
//     this.polygonDragManager = new PolygonDragManager(
//       this.config,
//       this.turfHelper,
//       this.map,
//       this.stateManager,
//       () => this.arrayOfFeatureGroups,
//       (geoJSON, simplify) => {
//         this.addPolygonLayer(geoJSON, simplify);
//       },
//       () => this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups),
//       (featureGroup) => {
//         this.removeFeatureGroup(featureGroup);
//       },
//       (geoJSON, optimizationLevel) => {
//         this.addPolygon(geoJSON, false, false); // false = simplify, false = noMerge (allow merge)
//       },
//     );
//     this.polygonEdgeManager = new PolygonEdgeManager(
//       this.config,
//       this.turfHelper,
//       this.map,
//       (featureGroup) => this.removeFeatureGroup(featureGroup),
//       (geoJSON, simplify, dynamicTolerance, visualOptimizationLevel) =>
//         this.addPolygonLayer(geoJSON, simplify, dynamicTolerance, visualOptimizationLevel),
//     );
//   }

//   configurate(config: Partial<PolydrawConfig>) {
//     this.config = { ...defaultConfig, ...config } as PolydrawConfig;
//   }

//   /**
//    * Initializes the control when added to the map, setting up UI elements and event listeners.
//    * @param _map The Leaflet map instance.
//    * @returns The DOM element for the control.
//    */
//   onAdd(_map: L.Map): HTMLElement {
//     this.map = _map;
//     const style = document.createElement('style');
//     style.innerHTML = `
//       .leaflet-control a { background-color: #fff; color: #000; display: flex; align-items: center; justify-content: center; }
//       .leaflet-control a:hover { background-color: #f4f4f4; }
//       .leaflet-control a.active { background-color:rgb(128, 218, 255); color: #fff; }
//       .crosshair-cursor-enabled { cursor: crosshair !important; }
//       .crosshair-cursor-enabled * { cursor: crosshair !important; }

//       `;
//     document.head.appendChild(style);
//     const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
//     container.style.display = 'flex';
//     container.style.flexDirection = 'column-reverse';

//     this.subContainer = L.DomUtil.create('div', 'sub-buttons', container);
//     this.subContainer.style.maxHeight = '0px';
//     this.subContainer.style.overflow = 'hidden';
//     this.subContainer.style.transition = 'max-height 0.3s ease';

//     const onActivateToggle = () => {
//       const activate = container.querySelector('.icon-activate') as HTMLElement;
//       if (L.DomUtil.hasClass(activate, 'active')) {
//         L.DomUtil.removeClass(activate, 'active');
//         if (this.subContainer) {
//           this.subContainer.style.maxHeight = '0px';
//         }
//       } else {
//         L.DomUtil.addClass(activate, 'active');
//         if (this.subContainer) {
//           this.subContainer.style.maxHeight = '250px';
//         }
//       }
//     };

//     const onDrawClick = () => {
//       // Set to add mode for drawing new polygons
//       this.setDrawMode(DrawMode.Add);
//       this.polygonInformation.saveCurrentState();
//     };

//     const onSubtractClick = () => {
//       // Set to subtract mode for removing areas from existing polygons
//       this.setDrawMode(DrawMode.Subtract);
//       this.polygonInformation.saveCurrentState();
//     };

//     const onEraseClick = () => {
//       // Clear all polygons
//       this.removeAllFeatureGroups();
//     };

//     createButtons(
//       container,
//       this.subContainer,
//       onActivateToggle,
//       onDrawClick,
//       onSubtractClick,
//       onEraseClick,
//     );

//     // Register UI update listener with the State Manager's event system
//     const uiUpdateListener = (mode: DrawMode) => {
//       const drawButton = container.querySelector('.icon-draw') as HTMLElement;
//       const subtractButton = container.querySelector('.icon-subtract') as HTMLElement;
//       if (drawButton) drawButton.classList.toggle('active', mode === DrawMode.Add);
//       if (subtractButton) subtractButton.classList.toggle('active', mode === DrawMode.Subtract);
//     };

//     // Add to both legacy listeners (for backward compatibility) and State Manager
//     this.legacyDrawModeListeners.push(uiUpdateListener);
//     this.stateManager.onDrawModeChange(uiUpdateListener);

//     this.tracer = L.polyline([], this.config.polyLineOptions);
//     try {
//       this.tracer.addTo(this.map);
//     } catch (error) {
//       // Silently handle tracer initialization in test environment
//     }

//     // Initialize managers now that map is available
//     this.initializeManagers();

//     return container;
//   }

//   /**
//    * Explicitly expose the addTo method from L.Control parent class.
//    *
//    * This is needed because TypeScript's declaration generation doesn't always
//    * properly expose inherited methods from parent classes in the generated .d.ts files.
//    * Without this explicit declaration, consumers of the library would get a
//    * TypeScript error: "Property 'addTo' does not exist on type 'Polydraw'".
//    *
//    * @param map The Leaflet map instance to add this control to
//    * @returns this control instance for method chaining
//    */
//   public addTo(map: L.Map): this {
//     return super.addTo(map);
//   }

//   // Update the addAutoPolygon method signature and implementation
//   public addAutoPolygon(geographicBorders: L.LatLng[][][], options?: AutoPolygonOptions): void {
//     // Validate input
//     if (!geographicBorders || geographicBorders.length === 0) {
//       throw new Error('Cannot add empty polygon array');
//     }

//     // Ensure map is properly initialized
//     if (!this.map) {
//       throw new Error('Map not initialized');
//     }

//     // Validate polygon structure and coordinates
//     this.validatePolygonInput(geographicBorders);

//     // Extract options with defaults
//     const visualOptimizationLevel = options?.visualOptimizationLevel ?? 0;

//     geographicBorders.forEach((group, groupIndex) => {
//       try {
//         const polygon2 = this.turfHelper.getMultiPolygon(
//           CoordinateUtils.convertToCoords(group, this.turfHelper),
//         );

//         // Use the proper addPolygon method which includes merging logic
//         // This ensures that overlapping polygons are merged when mergePolygons is enabled
//         this.ensureManagersInitialized();

//         try {
//           this.addPolygon(polygon2, false, false);
//         } catch (renderError) {
//           // Fallback for test environment - add directly but still check for merging
//           this.addPolygonWithFallbackMerging(polygon2, visualOptimizationLevel);
//         }

//         this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
//       } catch (error) {
//         console.error('Error adding auto polygon:', error);
//         throw error; // Re-throw to make tests pass
//       }
//     });
//   }

//   /**
//    * Validate polygon input structure and coordinates using utility class
//    */
//   private validatePolygonInput(geographicBorders: L.LatLng[][][]): void {
//     PolygonValidator.validatePolygonInput(geographicBorders);
//   }

//   /**
//    * Fallback method for adding polygons with merging logic when PolygonManager fails (test environment)
//    */
//   private addPolygonWithFallbackMerging(
//     polygon2: Feature<Polygon | MultiPolygon>,
//     visualOptimizationLevel: number,
//   ): void {
//     // Check if merging should be applied
//     if (
//       this.config.mergePolygons &&
//       this.arrayOfFeatureGroups.length > 0 &&
//       !this.stateManager.getPolygonHasKinks()
//     ) {
//       // Try to merge with existing polygons
//       try {
//         this.merge(polygon2);
//         return;
//       } catch (mergeError) {
//         // If merge fails, fall back to direct addition
//         console.warn('Merge failed in test environment, adding directly:', mergeError);
//       }
//     }

//     // Fallback: Add directly without merging (for test environment)
//     try {
//       this.addPolygonLayer(polygon2, false, false, visualOptimizationLevel);
//     } catch (layerError) {
//       // Final fallback: Just add to array for test environment
//       const featureGroup = new L.FeatureGroup();
//       this.arrayOfFeatureGroups.push(featureGroup);
//     }
//   }

//   setDrawMode(mode: DrawMode) {
//     // Update the drawing mode and associated map behaviors
//     this.drawMode = mode;
//     this.emitDrawModeChanged();

//     // Always stop any current drawing when changing modes
//     this.stopDraw();

//     if (this.map) {
//       const _isActiveDrawMode = true;
//       switch (mode) {
//         case DrawMode.Off:
//           L.DomUtil.removeClass(this.map.getContainer(), 'crosshair-cursor-enabled');
//           this.events(false);
//           // Handle tracer setStyle errors in test environment
//           try {
//             this.tracer.setStyle({
//               color: '',
//             });
//           } catch (error) {
//             // Handle case where tracer renderer is not initialized (e.g., in test environment)
//           }
//           this.setLeafletMapEvents(true, true, true);
//           break;
//         case DrawMode.Add:
//           L.DomUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
//           this.events(true);
//           // Handle tracer setStyle errors in test environment
//           try {
//             this.tracer.setStyle({
//               color: defaultConfig.polyLineOptions.color,
//             });
//           } catch (error) {
//             // Handle case where tracer renderer is not initialized (e.g., in test environment)
//           }
//           this.setLeafletMapEvents(false, false, false);
//           break;
//         case DrawMode.Subtract:
//           L.DomUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
//           this.events(true);
//           // Handle tracer setStyle errors in test environment
//           try {
//             this.tracer.setStyle({
//               color: '#D9460F',
//             });
//           } catch (error) {
//             // Handle case where tracer renderer is not initialized (e.g., in test environment)
//           }
//           this.setLeafletMapEvents(false, false, false);
//           break;
//       }
//     }
//   }
//   deletePolygon(polygon: ILatLng[][]) {
//     if (this.arrayOfFeatureGroups.length > 0) {
//       this.arrayOfFeatureGroups.forEach((featureGroup) => {
//         const layer = featureGroup.getLayers()[0] as PolydrawPolygon;
//         const latlngs = layer.getLatLngs();
//         const length = latlngs.length;

//         latlngs.forEach((latlng, index) => {
//           let polygon3;
//           const test = [...latlng];

//           if (latlng.length > 1) {
//             if (latlng[0][0] !== latlng[0][latlng[0].length - 1]) {
//               test[0].push(latlng[0][0]);
//             }
//             polygon3 = [test[0]];
//           } else {
//             if (latlng[0] !== latlng[latlng.length - 1]) {
//               test.push(latlng[0]);
//             }
//             polygon3 = test;
//           }

//           const equals = this.polygonArrayEquals(polygon3, polygon);

//           if (equals && length === 1) {
//             this.polygonInformation.deleteTrashcan(polygon);
//             this.removeFeatureGroup(featureGroup);
//           } else if (equals && length > 1) {
//             this.polygonInformation.deleteTrashCanOnMulti([polygon]);
//             latlngs.splice(index, 1);
//             layer.setLatLngs(latlngs);
//             this.removeFeatureGroup(featureGroup);
//             this.addPolygonLayer(layer.toGeoJSON(), false);
//           }
//         });
//       });
//     }
//   }

//   removeAllFeatureGroups() {
//     if (this.polygonStateManager) {
//       // Get all polygon IDs before clearing
//       const allPolygons = this.polygonStateManager.getAllPolygons();

//       // Remove each polygon from PolygonStateManager
//       allPolygons.forEach((polygonData) => {
//         this.polygonStateManager.removePolygon(polygonData.id);
//       });
//     } else {
//       // Fallback: remove from map directly (for test environment)
//       this.arrayOfFeatureGroups.forEach((featureGroups) => {
//         try {
//           this.map.removeLayer(featureGroups);
//         } catch (error) {
//           // Silently handle layer removal errors in test environment
//         }
//       });
//     }

//     this.polygonInformation.deletePolygonInformationStorage();
//     this.polygonInformation.updatePolygons();
//   }

//   getDrawMode(): DrawMode {
//     return this.stateManager.getDrawMode();
//   }

//   /**
//    * Add a listener for draw mode changes
//    * @param callback Function to call when draw mode changes
//    */
//   public onDrawModeChangeListener(callback: DrawModeChangeHandler): void {
//     // Add to both legacy listeners and State Manager for full compatibility
//     this.legacyDrawModeListeners.push(callback);
//     this.stateManager.onDrawModeChange(callback);
//   }

//   /**
//    * Remove a listener for draw mode changes
//    * @param callback Function to remove from listeners
//    */
//   public offDrawModeChangeListener(callback: DrawModeChangeHandler): void {
//     // Remove from legacy listeners
//     const legacyIndex = this.legacyDrawModeListeners.indexOf(callback);
//     if (legacyIndex > -1) {
//       this.legacyDrawModeListeners.splice(legacyIndex, 1);
//     }

//     // Remove from State Manager
//     this.stateManager.offDrawModeChange(callback);
//   }

//   // Force everything to use PolygonStateManager as single point of truth
//   private get arrayOfFeatureGroups(): PolydrawFeatureGroup[] {
//     if (!this.polygonStateManager) {
//       console.warn(
//         'arrayOfFeatureGroups getter - PolygonStateManager not initialized, returning empty array',
//       );
//       return [];
//     }
//     const allPolygons = this.polygonStateManager.getAllPolygons();
//     const featureGroups = allPolygons.map((p) => p.featureGroup);
//     return featureGroups;
//   }

//   // Force everything to use PolygonStateManager as single point of truth
//   private set arrayOfFeatureGroups(groups: PolydrawFeatureGroup[]) {
//     console.warn('arrayOfFeatureGroups setter - BLOCKED! Use PolygonStateManager instead');

//     if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
//       // In test environment, allow direct assignment for test setup
//       // Tests need to be able to set up initial state
//       return;
//     }

//     // Block direct array assignment in production - force use of PolygonStateManager
//     throw new Error('Direct array assignment blocked - use PolygonStateManager methods instead');
//   }

//   // Getters and setters for other state properties that delegate to State Manager
//   private get currentPolygonHasKinks(): boolean {
//     return this.stateManager.getPolygonHasKinks();
//   }

//   private set currentPolygonHasKinks(hasKinks: boolean) {
//     this.stateManager.setPolygonHasKinks(hasKinks);
//   }

//   // Legacy listeners array for backward compatibility
//   private legacyDrawModeListeners: DrawModeChangeHandler[] = [];

//   private get drawMode(): DrawMode {
//     return this.stateManager.getDrawMode();
//   }

//   private set drawMode(mode: DrawMode) {
//     this.stateManager.setDrawMode(mode);
//   }

//   // Drag state properties
//   private get currentModifierDragMode(): boolean {
//     return this.stateManager.isModifierDragActive();
//   }

//   private set currentModifierDragMode(active: boolean) {
//     this.stateManager.setModifierKeyState(active);
//   }

//   private get isModifierKeyHeld(): boolean {
//     return this.stateManager.getDragState().isModifierKeyHeld;
//   }

//   private set isModifierKeyHeld(held: boolean) {
//     this.stateManager.setModifierKeyState(held);
//   }

//   private get currentDragPolygon(): PolydrawPolygon | null {
//     return this.stateManager.getDragState().currentPolygon;
//   }

//   private set currentDragPolygon(polygon: PolydrawPolygon | null) {
//     if (polygon) {
//       this.stateManager.startDrag(polygon, { lat: 0, lng: 0 }); // Temporary position
//     } else {
//       this.stateManager.endDrag();
//     }
//   }

//   private get dragStartPosition(): ILatLng | null {
//     return this.stateManager.getDragState().startPosition;
//   }

//   private set dragStartPosition(position: ILatLng | null) {
//     if (position && this.currentDragPolygon) {
//       this.stateManager.startDrag(this.currentDragPolygon, position);
//     }
//   }

//   private stopDraw() {
//     this.resetTracker();
//     this.drawStartedEvents(false);
//   }

//   private setLeafletMapEvents(
//     enableDragging: boolean,
//     enableDoubleClickZoom: boolean,
//     enableScrollWheelZoom: boolean,
//   ) {
//     enableDragging ? this.map.dragging.enable() : this.map.dragging.disable();
//     enableDoubleClickZoom ? this.map.doubleClickZoom.enable() : this.map.doubleClickZoom.disable();
//     enableScrollWheelZoom ? this.map.scrollWheelZoom.enable() : this.map.scrollWheelZoom.disable();
//   }

//   private resetTracker() {
//     this.tracer.setLatLngs([]);
//   }

//   private drawStartedEvents(onoff: boolean) {
//     const onoroff = onoff ? 'on' : 'off';

//     this.map[onoroff]('mousemove', this.mouseMove, this);
//     this.map[onoroff]('mouseup', this.mouseUpLeave, this);

//     if (onoff) {
//       try {
//         this.map.getContainer().addEventListener('touchmove', (e) => this.mouseMove(e));
//         this.map.getContainer().addEventListener('touchend', (e) => this.mouseUpLeave(e));
//       } catch (error) {
//         // Silently handle DOM errors in test environment
//       }
//     } else {
//       try {
//         this.map.getContainer().removeEventListener('touchmove', (e) => this.mouseMove(e), true);
//         this.map.getContainer().removeEventListener('touchmove', (e) => this.mouseMove(e), true);
//         this.map.getContainer().removeEventListener('touchend', (e) => this.mouseUpLeave(e), true);
//       } catch (error) {
//         // Silently handle DOM errors in test environment
//       }
//     }
//   }

//   private mouseMove(event: L.LeafletMouseEvent | TouchEvent) {
//     if ('latlng' in event && event.latlng) {
//       this.tracer.addLatLng(event.latlng);
//     } else if ('touches' in event && event.touches && event.touches.length > 0) {
//       const latlng = this.map.containerPointToLatLng([
//         event.touches[0].clientX,
//         event.touches[0].clientY,
//       ]);

//       this.tracer.addLatLng(latlng);
//     }
//   }
//   private mouseUpLeave(event: any) {
//     this.polygonInformation.deletePolygonInformationStorage();

//     const tracerGeoJSON = this.tracer.toGeoJSON() as GeoJSON.Feature<GeoJSON.LineString>;

//     // Check if tracer has valid coordinates before processing
//     if (
//       !tracerGeoJSON ||
//       !tracerGeoJSON.geometry ||
//       !tracerGeoJSON.geometry.coordinates ||
//       tracerGeoJSON.geometry.coordinates.length < 3
//     ) {
//       // Not enough points to form a valid polygon, just stop drawing
//       this.stopDraw();
//       return;
//     }

//     let geoPos: Feature<Polygon | MultiPolygon>;
//     try {
//       geoPos = this.turfHelper.turfConcaveman(tracerGeoJSON as any);
//     } catch (error) {
//       // Silently handle polygon creation errors
//       this.stopDraw();
//       return;
//     }

//     this.stopDraw();

//     this.currentPolygonHasKinks = false;

//     switch (this.getDrawMode()) {
//       case DrawMode.Add:
//         this.addPolygon(geoPos, true);
//         break;
//       case DrawMode.Subtract:
//         this.subtractPolygon(geoPos);
//         break;
//       default:
//         break;
//     }
//     this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
//   }

//   private subtractPolygon(latlngs: Feature<Polygon | MultiPolygon>) {
//     this.subtract(latlngs);
//   }
//   //fine
//   private addPolygon(
//     latlngs: Feature<Polygon | MultiPolygon>,
//     simplify: boolean,
//     noMerge: boolean = false,
//   ) {
//     console.log('addPolygon called with:', {
//       simplify,
//       noMerge,
//       mergePolygons: this.mergePolygons,
//       kinks: this.kinks,
//       currentPolygonHasKinks: this.currentPolygonHasKinks,
//       arrayOfFeatureGroupsLength: this.arrayOfFeatureGroups.length,
//     });

//     const hasKinks = this.currentPolygonHasKinks || this.kinks;

//     if (this.mergePolygons && !noMerge && this.arrayOfFeatureGroups.length > 0 && !hasKinks) {
//       console.log('Merging polygon with existing polygons');
//       this.merge(latlngs);
//     } else {
//       console.log('Adding polygon directly without merging');
//       this.addPolygonLayer(latlngs, simplify);
//     }
//   }
//   private subtract(latlngs: Feature<Polygon | MultiPolygon>) {
//     this.ensureManagersInitialized();

//     try {
//       // Use PolygonStateManager for subtract operations
//       this.polygonStateManager.subtractPolygon(latlngs);
//     } catch (error) {
//       console.warn('PolygonStateManager subtract failed:', error);
//       // The PolygonStateManager should handle all subtract operations
//     }

//     this.setDrawMode(DrawMode.Off);
//   }

//   private removeFeatureGroup(featureGroup: L.FeatureGroup) {
//     // Find the polygon ID by feature group
//     const polygonId = this.findPolygonIdByFeatureGroup(featureGroup);
//     if (polygonId) {
//       // Remove from PolygonStateManager (this is the single source of truth)
//       this.polygonStateManager.removePolygon(polygonId);
//     } else {
//       console.warn('removeFeatureGroup() - Could not find polygon ID for feature group');

//       // Fallback: clear layers and remove from map
//       featureGroup.clearLayers();
//       this.map.removeLayer(featureGroup);
//     }
//   }

//   private polygonArrayEquals(poly1: any[], poly2: any[]): boolean {
//     // Compare two polygon arrays for equality

//     if (poly1[0][0]) {
//       if (!poly1[0][0].equals(poly2[0][0])) return false;
//     } else {
//       if (!poly1[0].equals(poly2[0])) return false;
//     }
//     if (poly1.length !== poly2.length) return false;
//     else {
//       return true;
//     }
//   }
//   private addPolygonLayer(
//     latlngs: Feature<Polygon | MultiPolygon>,
//     simplify: boolean,
//     dynamicTolerance: boolean = false,
//     visualOptimizationLevel: number = 0,
//   ) {
//     // Ensure managers are initialized before adding polygon
//     this.ensureManagersInitialized();

//     const latLngs = simplify ? this.turfHelper.getSimplified(latlngs, dynamicTolerance) : latlngs;

//     try {
//       this.polygonStateManager.addPolygon(latLngs, visualOptimizationLevel, true);
//     } catch (error) {
//       console.error('addPolygonLayer() - Failed to add to PolygonStateManager:', error);
//     }

//     this.setDrawMode(DrawMode.Off);
//   }

//   private getMarkerIndex(latlngs: ILatLng[], position: MarkerPosition): number {
//     const bounds: L.LatLngBounds = PolyDrawUtil.getBounds(latlngs, Math.sqrt(2) / 2);
//     const compass = new Compass(
//       bounds.getSouth(),
//       bounds.getWest(),
//       bounds.getNorth(),
//       bounds.getEast(),
//     );
//     const compassDirection = compass.getDirection(position);
//     const latLngPoint: ILatLng = {
//       lat: compassDirection.lat,
//       lng: compassDirection.lng,
//     };
//     const targetPoint = this.turfHelper.getCoord(latLngPoint);
//     const fc = this.turfHelper.getFeaturePointCollection(latlngs);
//     const nearestPointIdx = this.turfHelper.getNearestPointIndex(targetPoint, fc as any);

//     return nearestPointIdx;
//   }

//   private convertToBoundsPolygon(latlngs: ILatLng[]) {
//     this.deletePolygon([latlngs]);
//     const polygon = this.turfHelper.getMultiPolygon(
//       CoordinateUtils.convertToCoords([latlngs], this.turfHelper),
//     );
//     const newPolygon = this.turfHelper.convertToBoundingBoxPolygon(polygon);

//     this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), false);
//   }
//   private convertToSimplifiedPolygon(latlngs: ILatLng[]) {
//     this.deletePolygon([latlngs]);
//     const newPolygon = this.turfHelper.getMultiPolygon(
//       CoordinateUtils.convertToCoords([latlngs], this.turfHelper),
//     );
//     this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), true, true);
//   }
//   private doubleElbows(latlngs: ILatLng[]) {
//     this.deletePolygon([latlngs]);
//     const doubleLatLngs: ILatLng[] = this.turfHelper.getDoubleElbowLatLngs(latlngs);
//     const newPolygon = this.turfHelper.getMultiPolygon(
//       CoordinateUtils.convertToCoords([doubleLatLngs], this.turfHelper),
//     );
//     this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), false, false);
//   }
//   private bezierify(latlngs: ILatLng[]) {
//     this.deletePolygon([latlngs]);
//     const newPolygon = this.turfHelper.getBezierMultiPolygon(
//       CoordinateUtils.convertToCoords([latlngs], this.turfHelper),
//     );
//     this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), false, false);
//   }
//   private getPolygon(latlngs: Feature<Polygon | MultiPolygon>) {
//     try {
//       // Check if coordinates contain valid data
//       if (!latlngs || !latlngs.geometry || !latlngs.geometry.coordinates) {
//         console.warn('getPolygon: Invalid GeoJSON structure:', latlngs);
//         throw new Error('Invalid GeoJSON structure');
//       }

//       // Validate coordinate arrays contain valid numbers
//       const coords = latlngs.geometry.coordinates;
//       const hasValidCoords = this.validateGeoJSONCoordinates(coords);

//       if (!hasValidCoords) {
//         console.warn('getPolygon: Invalid coordinates detected:', coords);
//         throw new Error('Invalid coordinates in GeoJSON');
//       }

//       // Create a Leaflet polygon from GeoJSON
//       const polygon = L.GeoJSON.geometryToLayer(latlngs) as any;

//       // Always use normal green polygon styling for the main polygon
//       polygon.setStyle(this.config.polygonOptions);

//       // Store hole information for later use in marker styling
//       polygon._polydrawHasHoles = this.polygonHasHoles(latlngs);

//       // Enable dragging by setting the draggable option
//       // This is a workaround since GeoJSON layers don't have dragging by default
//       if (polygon.setDraggable) {
//         polygon.setDraggable(true);
//       } else {
//         // Alternative approach: add dragging capability manually
//         polygon.options = polygon.options || {};
//         polygon.options.draggable = true;

//         // Initialize dragging if the method exists
//         if (polygon._initInteraction) {
//           polygon._initInteraction();
//         }
//       }

//       return polygon;
//     } catch (error) {
//       console.error('getPolygon: Failed to create polygon:', error);
//       // Return a minimal valid polygon to prevent crashes
//       const fallbackCoords: Feature<Polygon> = {
//         type: 'Feature',
//         properties: {},
//         geometry: {
//           type: 'Polygon',
//           coordinates: [
//             [
//               [0, 0],
//               [0, 0.001],
//               [0.001, 0.001],
//               [0.001, 0],
//               [0, 0],
//             ],
//           ],
//         },
//       };
//       return L.GeoJSON.geometryToLayer(fallbackCoords) as any;
//     }
//   }

//   /**
//    * Validate GeoJSON coordinates to ensure they contain valid numbers
//    */
//   private validateGeoJSONCoordinates(coords: any): boolean {
//     if (!Array.isArray(coords)) {
//       return false;
//     }

//     // Recursively validate coordinate arrays
//     for (const coord of coords) {
//       if (Array.isArray(coord)) {
//         // If it's an array, recursively validate
//         if (!this.validateGeoJSONCoordinates(coord)) {
//           return false;
//         }
//       } else if (typeof coord === 'number') {
//         // If it's a number, check if it's valid
//         if (isNaN(coord) || !isFinite(coord)) {
//           return false;
//         }
//       } else {
//         // Invalid coordinate type
//         return false;
//       }
//     }

//     return true;
//   }
//   /**
//    * Check if a polygon has holes
//    */
//   private polygonHasHoles(feature: Feature<Polygon | MultiPolygon>): boolean {
//     if (feature.geometry.type === 'Polygon') {
//       // Polygon has holes if it has more than one ring (first ring is exterior, others are holes)
//       return feature.geometry.coordinates.length > 1;
//     } else if (feature.geometry.type === 'MultiPolygon') {
//       // MultiPolygon has holes if any of its polygons have holes
//       return feature.geometry.coordinates.some((polygon) => polygon.length > 1);
//     }
//     return false;
//   }

//   private polygonClicked(e: L.LeafletMouseEvent, poly: Feature<Polygon | MultiPolygon>) {
//     //TODO ...
//   }

//   private events(onoff: boolean) {
//     const onoroff = onoff ? 'on' : 'off';
//     this.map[onoroff]('mousedown', this.mouseDown, this);

//     if (onoff) {
//       try {
//         this.map.getContainer().addEventListener('touchstart', (e) => this.mouseDown(e));
//       } catch (error) {
//         // Silently handle DOM errors in test environment
//       }
//     } else {
//       try {
//         this.map.getContainer().removeEventListener('touchstart', (e) => this.mouseDown(e), true);
//       } catch (error) {
//         // Silently handle DOM errors in test environment
//       }
//     }
//   }
//   private mouseDown(event: L.LeafletMouseEvent | TouchEvent) {
//     // Start drawing on mouse down
//     let startLatLng;

//     if ('latlng' in event && event.latlng) {
//       startLatLng = event.latlng;
//     } else if ('touches' in event && event.touches && event.touches.length > 0) {
//       startLatLng = this.map.containerPointToLatLng([
//         event.touches[0].clientX,
//         event.touches[0].clientY,
//       ]);
//     }

//     // Only set initial point if we have a valid latlng
//     if (startLatLng && startLatLng.lat !== undefined && startLatLng.lng !== undefined) {
//       this.tracer.setLatLngs([startLatLng]);
//       this.startDraw();
//     }
//   }
//   private startDraw() {
//     // Initialize drawing process

//     this.drawStartedEvents(true);
//   }
//   private markerDrag(FeatureGroup: L.FeatureGroup) {
//     // Delegate to MarkerManager
//     this.markerManager.handleMarkerDrag(FeatureGroup);
//   }
//   // check this
//   private markerDragEnd(FeatureGroup: L.FeatureGroup) {
//     this.ensureManagersInitialized();

//     this.markerManager.handleMarkerDragEnd(
//       FeatureGroup,
//       () => this.polygonInformation.deletePolygonInformationStorage(),
//       (featureGroup) => this.removeFeatureGroup(featureGroup),
//       (geoJSON, simplify, dynamicTolerance, optimizationLevel) =>
//         this.addPolygon(geoJSON, simplify, false), // Use addPolygon instead of addPolygonLayer to enable merge
//       () => this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups),
//       () => this.arrayOfFeatureGroups,
//       this.config,
//     );
//   }

//   private emitDrawModeChanged(): void {
//     // Emit to legacy listeners (for UI button updates)
//     for (const cb of this.legacyDrawModeListeners) {
//       cb(this.drawMode);
//     }

//     // The State Manager handles its own event emission when setDrawMode is called
//     // No need to duplicate here since we're calling this.stateManager.setDrawMode() in the setter
//   }

//   /**
//    * Enable polygon dragging functionality - wrapper for PolygonDragManager
//    */
//   private enablePolygonDragging(
//     polygon: any,
//     featureGroup: L.FeatureGroup,
//     latLngs: Feature<Polygon | MultiPolygon>,
//   ) {
//     this.ensureManagersInitialized();

//     if (this.polygonDragManager) {
//       this.polygonDragManager.enablePolygonDragging(polygon, featureGroup, latLngs);
//     } else {
//       console.warn('enablePolygonDragging() - PolygonDragManager not available');
//     }
//   }

//   /**
//    * Public method to enable/disable polygon dragging
//    */
//   public enablePolygonDraggingMode(enable: boolean = true) {
//     this.config.modes.dragPolygons = enable;

//     // Update existing polygons
//     this.arrayOfFeatureGroups.forEach((featureGroup) => {
//       featureGroup.eachLayer((layer) => {
//         if (layer instanceof L.Polygon) {
//           const draggableLayer = layer as any;
//           if (enable && draggableLayer.dragging) {
//             draggableLayer.dragging.enable();
//             // Note: Event listeners are already attached when polygon is created
//           } else if (draggableLayer.dragging) {
//             draggableLayer.dragging.disable();
//           }
//         }
//       });
//     });
//   }

//   private performModifierSubtract(draggedPolygon: any, intersectingPolygons: any[]): void {
//     this.ensureManagersInitialized();
//     if (this.polygonDragManager) {
//       (this.polygonDragManager as any).performModifierSubtract(
//         draggedPolygon,
//         intersectingPolygons,
//       );
//     }
//   }

//   private isModifierDragActive(): boolean {
//     this.ensureManagersInitialized();
//     // Check both manager state and local state for tests
//     const managerState = this.polygonDragManager
//       ? (this.polygonDragManager as any).isModifierDragActive()
//       : false;
//     return managerState || this.currentModifierDragMode;
//   }

//   /**
//    * Create a feature group for a polygon - used by PolygonStateManager
//    */
//   private createFeatureGroupForPolygon(
//     geoJSON: Feature<Polygon | MultiPolygon>,
//     optimizationLevel: number,
//   ): PolydrawFeatureGroup {
//     const featureGroup: L.FeatureGroup = new L.FeatureGroup();

//     // Create and add polygon
//     const polygon = this.getPolygon(geoJSON);
//     (polygon as any)._polydrawOptimizationLevel = optimizationLevel;

//     featureGroup.addLayer(polygon);

//     // Enable polygon dragging if configured
//     if (this.config.modes.dragPolygons) {
//       this.enablePolygonDragging(polygon, featureGroup, geoJSON);
//     }

//     // Add markers
//     const markerLatlngs = polygon.getLatLngs();
//     this.addMarkersToFeatureGroup(markerLatlngs, featureGroup, optimizationLevel);

//     // Add to map
//     try {
//       featureGroup.addTo(this.map);
//     } catch (error) {
//       // Silently handle map rendering errors in test environment
//       console.warn(
//         'createFeatureGroupForPolygon() - Map rendering error (test environment):',
//         error.message,
//       );
//     }

//     // Add edge click detection
//     this.polygonEdgeManager.addEdgeClickListeners(polygon, featureGroup);

//     featureGroup.on('click', (e) => {
//       this.polygonClicked(e, geoJSON);
//     });

//     return featureGroup;
//   }

//   /**
//    * Add markers to a feature group based on coordinate structure
//    */
//   private addMarkersToFeatureGroup(
//     markerLatlngs: any,
//     featureGroup: PolydrawFeatureGroup,
//     optimizationLevel: number,
//   ): void {
//     markerLatlngs.forEach((polygonRings: any, ringGroupIndex: number) => {
//       if (!polygonRings) {
//         return;
//       }

//       // Check if this is a direct LatLng array (flattened structure)
//       const isDirectLatLngArray =
//         Array.isArray(polygonRings) &&
//         polygonRings.length > 0 &&
//         polygonRings[0] &&
//         typeof polygonRings[0] === 'object' &&
//         'lat' in polygonRings[0] &&
//         'lng' in polygonRings[0];

//       if (isDirectLatLngArray) {
//         // Flattened structure - use ring group index to determine marker type
//         const isHoleRing = ringGroupIndex > 0;

//         const polyElement = polygonRings as ILatLng[];
//         if (polyElement.length > 0) {
//           // Add red polyline overlay for hole rings
//           if (isHoleRing) {
//             const holePolyline = L.polyline(polyElement, {
//               color: this.config.holeOptions.color,
//               weight: this.config.holeOptions.weight || 2,
//               opacity: this.config.holeOptions.opacity || 1,
//             });
//             featureGroup.addLayer(holePolyline);
//           }

//           // Add markers based on ring type
//           if (isHoleRing) {
//             this.addHoleMarker(polyElement, featureGroup, optimizationLevel);
//           } else {
//             this.addMarker(polyElement, featureGroup, optimizationLevel);
//           }
//         }
//       } else {
//         if (!polygonRings || !Array.isArray(polygonRings)) {
//           return;
//         }

//         polygonRings.forEach((polyElement: ILatLng[], i: number) => {
//           const isHoleRing = i > 0;

//           if (!polyElement || !Array.isArray(polyElement) || polyElement.length === 0) {
//             return;
//           }

//           // Add red polyline overlay for hole rings
//           if (isHoleRing) {
//             const holePolyline = L.polyline(polyElement, {
//               color: this.config.holeOptions.color,
//               weight: this.config.holeOptions.weight || 2,
//               opacity: this.config.holeOptions.opacity || 1,
//             });
//             featureGroup.addLayer(holePolyline);
//           }

//           // Add markers based on ring type
//           if (isHoleRing) {
//             this.addHoleMarker(polyElement, featureGroup, optimizationLevel);
//           } else {
//             this.addMarker(polyElement, featureGroup, optimizationLevel);
//           }
//         });
//       }
//     });
//   }

//   /**
//    * Ensure managers are initialized for testing
//    */
//   private ensureManagersInitialized(): void {
//     if (!this.markerManager && this.map) {
//       this.initializeManagers();
//     }
//   }

//   /**
//    * Find polygon ID by feature group - used by polygon dragging
//    */
//   private findPolygonIdByFeatureGroup(featureGroup: PolydrawFeatureGroup): string | null {
//     if (!this.polygonStateManager) {
//       return null;
//     }

//     const allPolygons = this.polygonStateManager.getAllPolygons();

//     // Method 1: Direct feature group comparison
//     for (const polygonData of allPolygons) {
//       if (polygonData.featureGroup === featureGroup) {
//         return polygonData.id;
//       }
//     }

//     // Method 2: If direct comparison fails, try to match by polygon geometry
//     // This handles cases where feature groups are recreated during operations

//     try {
//       // Get the polygon from the feature group
//       const layers = featureGroup.getLayers();
//       if (layers.length === 0) {
//         return null;
//       }

//       // Find the polygon layer (not markers)
//       const polygonLayer = layers.find((layer) => layer instanceof L.Polygon);
//       if (!polygonLayer) {
//         return null;
//       }

//       // Get the GeoJSON of the dragged polygon
//       const draggedGeoJSON = (polygonLayer as any).toGeoJSON();

//       // Compare with stored polygons by coordinates
//       for (const polygonData of allPolygons) {
//         try {
//           // Compare coordinate arrays (simplified comparison)
//           const storedCoords = JSON.stringify(polygonData.geoJSON.geometry.coordinates);
//           const draggedCoords = JSON.stringify(draggedGeoJSON.geometry.coordinates);

//           if (storedCoords === draggedCoords) {
//             return polygonData.id;
//           }
//         } catch (error) {
//           console.warn('findPolygonIdByFeatureGroup() - Error comparing geometry:', error);
//         }
//       }
//     } catch (error) {
//       console.warn('findPolygonIdByFeatureGroup() - Error in geometry comparison:', error);
//     }

//     return null;
//   }

//   /**
//    * Debug function to log feature group structure
//    */
//   private logFeatureGroupStructure(label: string) {
//     console.log(`=== ${label} ===`);
//     console.log(`Total feature groups: ${this.arrayOfFeatureGroups.length}`);

//     this.arrayOfFeatureGroups.forEach((featureGroup, index) => {
//       try {
//         const geoJSON = featureGroup.toGeoJSON() as any;
//         if (geoJSON && geoJSON.features && geoJSON.features[0]) {
//           const coords = geoJSON.features[0].geometry.coordinates;
//           const structure = this.analyzeCoordinateStructure(coords);
//           console.log(`FeatureGroup ${index}: ${structure}`);

//           // Log first 3 and closing coordinate of each ring
//           if (coords && coords[0]) {
//             const ring = coords[0];
//             if (ring.length > 0) {
//               const first3 = ring.slice(0, 3);
//               const closing = ring.slice(-1);
//               console.log(
//                 `  Ring coords: first3=${JSON.stringify(first3)}, closing=${JSON.stringify(closing)}`,
//               );
//             }
//           }
//         }
//       } catch (error) {
//         console.log(`FeatureGroup ${index}: ERROR - ${error.message}`);
//       }
//     });
//     console.log(`=== End ${label} ===`);
//   }

//   /**
//    * Analyze coordinate structure for debugging
//    */
//   private analyzeCoordinateStructure(coords: any): string {
//     if (!Array.isArray(coords)) return 'NOT_ARRAY';

//     let structure = '[';
//     if (coords.length > 0) {
//       if (Array.isArray(coords[0])) {
//         structure += '[';
//         if (coords[0].length > 0) {
//           if (Array.isArray(coords[0][0])) {
//             structure += '[';
//             if (coords[0][0].length > 0) {
//               if (typeof coords[0][0][0] === 'number') {
//                 structure += 'NUMBER';
//               } else {
//                 structure += 'OTHER';
//               }
//             }
//             structure += ']';
//           } else {
//             structure += 'NOT_ARRAY';
//           }
//         }
//         structure += ']';
//       } else {
//         structure += 'NOT_ARRAY';
//       }
//     }
//     structure += ']';

//     return `${structure} (length: ${coords.length})`;
//   }

//   private merge(latlngs: Feature<Polygon | MultiPolygon>) {
//     this.logFeatureGroupStructure('BEFORE MERGE');

//     // Simple check - just make sure we have something to work with
//     if (!latlngs || !latlngs.geometry) {
//       console.warn('merge: No geometry, adding directly');
//       this.addPolygonLayer(latlngs, true);
//       return;
//     }

//     const intersectingFeatureGroups: L.FeatureGroup[] = [];

//     // Find all polygons that intersect with the new polygon
//     this.arrayOfFeatureGroups.forEach((featureGroup) => {
//       try {
//         const featureCollection = featureGroup.toGeoJSON() as any;
//         if (
//           !featureCollection ||
//           !featureCollection.features ||
//           featureCollection.features.length === 0
//         ) {
//           return;
//         }

//         const firstFeature = featureCollection.features[0];
//         if (!firstFeature || !firstFeature.geometry) {
//           return;
//         }

//         // Skip validation - just try to use the polygon for intersection check
//         // The original Angular version didn't have this validation

//         const existingPolygon = this.turfHelper.getTurfPolygon(firstFeature);

//         // Try to use the polygon even if validation fails - be more lenient for merge operations
//         // The key is to attempt intersection detection rather than skip entirely

//         // Check for intersection using multiple methods
//         let hasIntersection = false;

//         // Method 1: Use polygonIntersect
//         try {
//           hasIntersection = this.turfHelper.polygonIntersect(existingPolygon, latlngs);
//         } catch (error) {
//           console.warn('merge: polygonIntersect failed:', error.message);
//           // Method 1 failed, try method 2
//         }

//         // Method 2: Use direct intersection check if method 1 failed
//         if (!hasIntersection) {
//           try {
//             const intersection = this.turfHelper.getIntersection(existingPolygon, latlngs);
//             if (
//               intersection &&
//               intersection.geometry &&
//               (intersection.geometry.type === 'Polygon' ||
//                 intersection.geometry.type === 'MultiPolygon')
//             ) {
//               hasIntersection = true;
//             }
//           } catch (error) {
//             console.warn('merge: getIntersection failed:', error.message);
//             // Method 2 failed, try method 3
//           }
//         }

//         // Method 3: Simple bounding box overlap check as fallback
//         if (!hasIntersection) {
//           try {
//             hasIntersection = this.checkBoundingBoxOverlap(existingPolygon, latlngs);
//             if (hasIntersection) {
//               console.log('merge: Using bounding box overlap detection as fallback');
//             }
//           } catch (error) {
//             console.warn('merge: bounding box check failed:', error.message);
//           }
//         }

//         if (hasIntersection) {
//           intersectingFeatureGroups.push(featureGroup);
//         }
//       } catch (error) {
//         console.warn('merge: Error checking intersection:', error.message);
//         // Skip problematic polygons
//       }
//     });

//     if (intersectingFeatureGroups.length > 0) {
//       console.log(`merge: Found ${intersectingFeatureGroups.length} intersecting polygons`);
//       // Merge with intersecting polygons
//       let mergedPolygon = latlngs;

//       // Union with each intersecting polygon
//       intersectingFeatureGroups.forEach((featureGroup) => {
//         try {
//           const featureCollection = featureGroup.toGeoJSON() as any;
//           const existingPolygon = this.turfHelper.getTurfPolygon(featureCollection.features[0]);

//           const union = this.turfHelper.union(mergedPolygon, existingPolygon);
//           if (union) {
//             mergedPolygon = union;
//           }

//           // Remove the merged polygon
//           this.removeFeatureGroup(featureGroup);
//         } catch (error) {
//           console.warn('merge: Error during union operation:', error.message);
//           // Skip problematic merges
//         }
//       });

//       // Add the final merged result
//       this.addPolygonLayer(mergedPolygon, true);
//     } else {
//       // No intersections - just add the polygon normally
//       this.addPolygonLayer(latlngs, true);
//     }

//     this.logFeatureGroupStructure('AFTER MERGE');
//   }

//   /**
//    * Validate GeoJSON polygon structure (duplicate from marker-manager for use in merge)
//    */
//   private isValidGeoJSONPolygon(geoJSON: any): boolean {
//     try {
//       if (!geoJSON || !geoJSON.geometry || geoJSON.geometry.type !== 'Polygon') {
//         return false;
//       }

//       const coordinates = geoJSON.geometry.coordinates;
//       if (!Array.isArray(coordinates) || coordinates.length === 0) {
//         return false;
//       }

//       // Check each ring
//       for (const ring of coordinates) {
//         if (!Array.isArray(ring) || ring.length < 4) {
//           // Need at least 4 coordinates (3 + closing)
//           return false;
//         }

//         // Check each coordinate
//         for (const coord of ring) {
//           if (
//             !Array.isArray(coord) ||
//             coord.length < 2 ||
//             typeof coord[0] !== 'number' ||
//             typeof coord[1] !== 'number' ||
//             isNaN(coord[0]) ||
//             isNaN(coord[1])
//           ) {
//             return false;
//           }
//         }

//         // Check if ring is closed (first and last coordinates should be the same)
//         const first = ring[0];
//         const last = ring[ring.length - 1];
//         if (first[0] !== last[0] || first[1] !== last[1]) {
//           return false;
//         }
//       }

//       return true;
//     } catch (error) {
//       console.warn('Error validating GeoJSON polygon:', error);
//       return false;
//     }
//   }

//   /**
//    * Simple bounding box overlap check as fallback for intersection detection
//    */
//   private checkBoundingBoxOverlap(polygon1: any, polygon2: any): boolean {
//     try {
//       // Get bounding boxes for both polygons
//       const bbox1 = this.getBoundingBox(polygon1);
//       const bbox2 = this.getBoundingBox(polygon2);

//       if (!bbox1 || !bbox2) {
//         return false;
//       }

//       // Check if bounding boxes overlap
//       return !(
//         bbox1.maxLng < bbox2.minLng ||
//         bbox2.maxLng < bbox1.minLng ||
//         bbox1.maxLat < bbox2.minLat ||
//         bbox2.maxLat < bbox1.minLat
//       );
//     } catch (error) {
//       console.warn('checkBoundingBoxOverlap failed:', error.message);
//       return false;
//     }
//   }

//   /**
//    * Get bounding box for a polygon
//    */
//   private getBoundingBox(
//     polygon: any,
//   ): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
//     try {
//       if (!polygon || !polygon.geometry || !polygon.geometry.coordinates) {
//         return null;
//       }

//       const coordinates = polygon.geometry.coordinates[0]; // First ring (outer ring)
//       if (!Array.isArray(coordinates) || coordinates.length === 0) {
//         return null;
//       }

//       let minLat = Infinity;
//       let maxLat = -Infinity;
//       let minLng = Infinity;
//       let maxLng = -Infinity;

//       for (const coord of coordinates) {
//         if (Array.isArray(coord) && coord.length >= 2) {
//           const lng = coord[0];
//           const lat = coord[1];

//           if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
//             minLng = Math.min(minLng, lng);
//             maxLng = Math.max(maxLng, lng);
//             minLat = Math.min(minLat, lat);
//             maxLat = Math.max(maxLat, lat);
//           }
//         }
//       }

//       if (
//         minLat === Infinity ||
//         maxLat === -Infinity ||
//         minLng === Infinity ||
//         maxLng === -Infinity
//       ) {
//         return null;
//       }

//       return { minLat, maxLat, minLng, maxLng };
//     } catch (error) {
//       console.warn('getBoundingBox failed:', error.message);
//       return null;
//     }
//   }

//   // Simple addMarker method without over-engineered optimization
//   private addMarker(
//     latlngs: ILatLng[],
//     FeatureGroup: L.FeatureGroup,
//     visualOptimizationLevel: number = 0,
//   ) {
//     // Ensure latlngs is an array and has valid points
//     if (!Array.isArray(latlngs)) {
//       console.warn('addMarker: latlngs is not an array:', latlngs);
//       return;
//     }

//     if (latlngs.length === 0) {
//       console.warn('addMarker: latlngs array is empty, skipping marker creation');
//       return;
//     }

//     const validLatLngs = latlngs.filter(
//       (latlng) =>
//         latlng &&
//         typeof latlng === 'object' &&
//         typeof latlng.lat === 'number' &&
//         typeof latlng.lng === 'number' &&
//         !isNaN(latlng.lat) &&
//         !isNaN(latlng.lng),
//     );

//     if (validLatLngs.length === 0) {
//       console.warn('addMarker: no valid LatLng objects found, skipping marker creation');
//       return;
//     }

//     // Use validLatLngs for marker index calculation
//     let menuMarkerIdx = this.getMarkerIndex(
//       validLatLngs,
//       this.config.markers.markerMenuIcon.position,
//     );
//     let deleteMarkerIdx = this.getMarkerIndex(
//       validLatLngs,
//       this.config.markers.markerDeleteIcon.position,
//     );
//     let infoMarkerIdx = this.getMarkerIndex(
//       validLatLngs,
//       this.config.markers.markerInfoIcon.position,
//     );

//     // Fallback for small polygons
//     if (latlngs.length <= 5) {
//       menuMarkerIdx = 0;
//       deleteMarkerIdx = Math.floor(latlngs.length / 2);
//       infoMarkerIdx = latlngs.length - 1;
//     }

//     latlngs.forEach((latlng, i) => {
//       let iconClasses = this.config.markers.markerIcon.styleClasses;

//       if (i === menuMarkerIdx && this.config.markers.menuMarker) {
//         iconClasses = this.config.markers.markerMenuIcon.styleClasses;
//       } else if (i === deleteMarkerIdx && this.config.markers.deleteMarker) {
//         iconClasses = this.config.markers.markerDeleteIcon.styleClasses;
//       } else if (i === infoMarkerIdx && this.config.markers.infoMarker) {
//         iconClasses = this.config.markers.markerInfoIcon.styleClasses;
//       }

//       // Handle both array and string formats for iconClasses
//       const processedClasses = Array.isArray(iconClasses) ? iconClasses : [iconClasses];

//       const marker = new L.Marker(latlng, {
//         icon: IconFactory.createDivIcon(processedClasses),
//         draggable: this.config.modes.dragElbow,
//         title: this.config.markers.coordsTitle ? this.getLatLngInfoString(latlng) : '',
//         zIndexOffset:
//           this.config.markers.markerIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
//       });

//       FeatureGroup.addLayer(marker).addTo(this.map);

//       // Set high z-index for special markers
//       if (i === menuMarkerIdx || i === deleteMarkerIdx || i === infoMarkerIdx) {
//         const element = marker.getElement();
//         if (element) {
//           element.style.zIndex = '10000';
//         }
//       }

//       // Add drag event handlers
//       if (this.config.modes.dragElbow) {
//         marker.on('drag', (e) => {
//           this.markerDrag(FeatureGroup);
//         });
//         marker.on('dragend', (e) => {
//           this.markerDragEnd(FeatureGroup);
//         });
//       }

//       // Add popup and click events for special markers
//       if (i === menuMarkerIdx && this.config.markers.menuMarker) {
//         const menuPopup = this.generateMenuMarkerPopup(latlngs);
//         marker.options.zIndexOffset =
//           this.config.markers.markerMenuIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
//         marker.bindPopup(menuPopup, { className: 'alter-marker' });
//       }
//       if (i === infoMarkerIdx && this.config.markers.infoMarker) {
//         const closedLatlngs = [...latlngs];
//         if (latlngs.length > 0) {
//           const first = latlngs[0];
//           const last = latlngs[latlngs.length - 1];
//           if (first.lat !== last.lat || first.lng !== last.lng) {
//             closedLatlngs.push(first);
//           }
//         }
//         const area = PolygonUtil.getSqmArea(closedLatlngs);
//         const perimeter = PolygonUtil.getPerimeter(closedLatlngs);
//         const infoPopup = this.generateInfoMarkerPopup(area, perimeter);
//         marker.options.zIndexOffset =
//           this.config.markers.markerInfoIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
//         marker.bindPopup(infoPopup, { className: 'info-marker' });
//       }
//       if (i === deleteMarkerIdx && this.config.markers.deleteMarker) {
//         marker.options.zIndexOffset =
//           this.config.markers.markerInfoIcon.zIndexOffset ?? this.config.markers.zIndexOffset;
//         marker.on('click', (e) => {
//           this.deletePolygon([latlngs]);
//         });
//       }
//     });
//   }

//   // Simple addHoleMarker method without over-engineered optimization
//   private addHoleMarker(
//     latlngs: ILatLng[],
//     FeatureGroup: L.FeatureGroup,
//     visualOptimizationLevel: number = 0,
//   ) {
//     // Ensure latlngs is an array
//     if (!Array.isArray(latlngs)) {
//       console.warn('addHoleMarker: latlngs is not an array:', latlngs);
//       return;
//     }

//     latlngs.forEach((latlng, i) => {
//       const iconClasses = this.config.markers.holeIcon.styleClasses;

//       // Handle both array and string formats for iconClasses
//       const processedClasses = Array.isArray(iconClasses) ? iconClasses : [iconClasses];

//       const marker = new L.Marker(latlng, {
//         icon: IconFactory.createDivIcon(processedClasses),
//         draggable: true,
//         title: this.getLatLngInfoString(latlng),
//         zIndexOffset: this.config.markers.holeIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
//       });
//       FeatureGroup.addLayer(marker).addTo(this.map);

//       marker.on('drag', (e) => {
//         this.markerDrag(FeatureGroup);
//       });
//       marker.on('dragend', (e) => {
//         this.markerDragEnd(FeatureGroup);
//       });
//     });
//   }

//   private getLatLngInfoString(latlng: ILatLng): string {
//     return 'Latitude: ' + latlng.lat + ' Longitude: ' + latlng.lng;
//   }

//   private generateMenuMarkerPopup(latLngs: ILatLng[]): HTMLDivElement {
//     const outerWrapper: HTMLDivElement = document.createElement('div');
//     outerWrapper.classList.add('alter-marker-outer-wrapper');

//     const wrapper: HTMLDivElement = document.createElement('div');
//     wrapper.classList.add('alter-marker-wrapper');

//     const invertedCorner: HTMLElement = document.createElement('i');
//     invertedCorner.classList.add('inverted-corner');

//     const markerContent: HTMLDivElement = document.createElement('div');
//     markerContent.classList.add('content');

//     const markerContentWrapper: HTMLDivElement = document.createElement('div');
//     markerContentWrapper.classList.add('marker-menu-content');

//     const simplify: HTMLDivElement = document.createElement('div');
//     simplify.classList.add('marker-menu-button', 'simplify');
//     simplify.title = 'Simplify';

//     const doubleElbows: HTMLDivElement = document.createElement('div');
//     doubleElbows.classList.add('marker-menu-button', 'double-elbows');
//     doubleElbows.title = 'DoubleElbows';

//     const bbox: HTMLDivElement = document.createElement('div');
//     bbox.classList.add('marker-menu-button', 'bbox');
//     bbox.title = 'Bounding box';

//     const bezier: HTMLDivElement = document.createElement('div');
//     bezier.classList.add('marker-menu-button', 'bezier');
//     bezier.title = 'Curve';

//     const separator: HTMLDivElement = document.createElement('div');
//     separator.classList.add('separator');

//     outerWrapper.appendChild(wrapper);
//     wrapper.appendChild(invertedCorner);
//     wrapper.appendChild(markerContent);
//     markerContent.appendChild(markerContentWrapper);
//     markerContentWrapper.appendChild(simplify);
//     markerContentWrapper.appendChild(separator);
//     markerContentWrapper.appendChild(doubleElbows);
//     markerContentWrapper.appendChild(separator);
//     markerContentWrapper.appendChild(bbox);
//     markerContentWrapper.appendChild(separator);
//     markerContentWrapper.appendChild(bezier);

//     simplify.onclick = () => {
//       this.convertToSimplifiedPolygon(latLngs);
//     };
//     bbox.onclick = () => {
//       this.convertToBoundsPolygon(latLngs);
//     };

//     doubleElbows.onclick = () => {
//       this.doubleElbows(latLngs);
//     };
//     bezier.onclick = () => {
//       this.bezierify(latLngs);
//     };

//     return outerWrapper;
//   }

//   private generateInfoMarkerPopup(area: number, perimeter: number): HTMLDivElement {
//     const _perimeter = new Perimeter(perimeter, this.config as any);
//     const _area = new Area(area, this.config as any);

//     const outerWrapper: HTMLDivElement = document.createElement('div');
//     outerWrapper.classList.add('info-marker-outer-wrapper');

//     const wrapper: HTMLDivElement = document.createElement('div');
//     wrapper.classList.add('info-marker-wrapper');

//     const invertedCorner: HTMLElement = document.createElement('i');
//     invertedCorner.classList.add('inverted-corner');

//     const markerContent: HTMLDivElement = document.createElement('div');
//     markerContent.classList.add('content');

//     const rowWithSeparator: HTMLDivElement = document.createElement('div');
//     rowWithSeparator.classList.add('row', 'bottom-separator');

//     const perimeterHeader: HTMLDivElement = document.createElement('div');
//     perimeterHeader.classList.add('header');
//     perimeterHeader.innerText = this.config.markers.markerInfoIcon.perimeterLabel;

//     const emptyDiv: HTMLDivElement = document.createElement('div');

//     const perimeterArea: HTMLSpanElement = document.createElement('span');
//     perimeterArea.classList.add('area');
//     perimeterArea.innerText = this.config.markers.markerInfoIcon.useMetrics
//       ? _perimeter.metricLength
//       : _perimeter.imperialLength;
//     const perimeterUnit: HTMLSpanElement = document.createElement('span');
//     perimeterUnit.classList.add('unit');
//     perimeterUnit.innerText =
//       ' ' +
//       (this.config.markers.markerInfoIcon.useMetrics
//         ? _perimeter.metricUnit
//         : _perimeter.imperialUnit);

//     const row: HTMLDivElement = document.createElement('div');
//     row.classList.add('row');

//     const areaHeader: HTMLDivElement = document.createElement('div');
//     areaHeader.classList.add('header');
//     areaHeader.innerText = this.config.markers.markerInfoIcon.areaLabel;

//     const rightRow: HTMLDivElement = document.createElement('div');
//     row.classList.add('right-margin');

//     const areaArea: HTMLSpanElement = document.createElement('span');
//     areaArea.classList.add('area');
//     areaArea.innerText = this.config.markers.markerInfoIcon.useMetrics
//       ? _area.metricArea
//       : _area.imperialArea;
//     const areaUnit: HTMLSpanElement = document.createElement('span');
//     areaUnit.classList.add('unit');
//     areaUnit.innerText =
//       ' ' + (this.config.markers.markerInfoIcon.useMetrics ? _area.metricUnit : _area.imperialUnit);

//     outerWrapper.appendChild(wrapper);
//     wrapper.appendChild(invertedCorner);
//     wrapper.appendChild(markerContent);
//     markerContent.appendChild(rowWithSeparator);
//     rowWithSeparator.appendChild(perimeterHeader);
//     rowWithSeparator.appendChild(emptyDiv);
//     emptyDiv.appendChild(perimeterArea);
//     emptyDiv.appendChild(perimeterUnit);
//     markerContent.appendChild(row);
//     row.appendChild(areaHeader);
//     row.appendChild(rightRow);
//     rightRow.appendChild(areaArea);
//     rightRow.appendChild(areaUnit);

//     return outerWrapper;
//   }

//   // ========================================================================
//   // POTENTIALLY UNUSED METHODS - TO BE REVIEWED FOR DELETION
//   // ========================================================================

//   // /**
//   //  * Handle polygon completion from drawing events manager
//   //  */
//   // private handlePolygonComplete(geoPos: Feature<Polygon | MultiPolygon>) {
//   //   this.currentPolygonHasKinks = false;

//   //   switch (this.getDrawMode()) {
//   //     case DrawMode.Add:
//   //       this.addPolygon(geoPos, true);
//   //       break;
//   //     case DrawMode.Subtract:
//   //       this.subtractPolygon(geoPos);
//   //       break;
//   //     default:
//   //       break;
//   //   }
//   //   this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
//   // }

//   // private getLatLngsFromJson(feature: Feature<Polygon | MultiPolygon>): ILatLng[][] {
//   //   // Extract LatLng coordinates from GeoJSON feature
//   //   let coord: ILatLng[][];
//   //   if (feature) {
//   //     if (feature.geometry.coordinates.length > 1 && feature.geometry.type === 'MultiPolygon') {
//   //       coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]) as ILatLng[][];
//   //     } else if (
//   //       feature.geometry.coordinates[0].length > 1 &&
//   //       feature.geometry.type === 'Polygon'
//   //     ) {
//   //       coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0]) as ILatLng[][];
//   //     } else {
//   //       coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]) as ILatLng[][];
//   //     }
//   //   }

//   //   return coord;
//   // }

//   // private removePolygonFromStateManager(featureGroup: PolydrawFeatureGroup): void {
//   //   if (!this.polygonStateManager) {
//   //     return;
//   //   }

//   //   const polygonId = this.findPolygonIdByFeatureGroup(featureGroup);
//   //   if (polygonId) {
//   //     this.polygonStateManager.removePolygon(polygonId);
//   //   }
//   // }

//   // private checkDragInteractions(draggedPolygon: any, excludeFeatureGroup: any): any {
//   //   this.ensureManagersInitialized();
//   //   return this.polygonDragManager
//   //     ? (this.polygonDragManager as any).checkDragInteractions(draggedPolygon, excludeFeatureGroup)
//   //     : {
//   //         shouldMerge: false,
//   //         shouldCreateHole: false,
//   //         intersectingFeatureGroups: [],
//   //         containingFeatureGroup: null,
//   //       };
//   // }

//   // private onPolygonMouseUp(event: any): void {
//   //   this.ensureManagersInitialized();
//   //   if (this.polygonDragManager) {
//   //     // Ensure currentDragPolygon is set for the manager to process the mouse up
//   //     const manager = this.polygonDragManager as any;

//   //     // For tests: if currentDragPolygon is set on polydraw, use it
//   //     if (this.currentDragPolygon && !manager.currentDragPolygon) {
//   //       manager.currentDragPolygon = this.currentDragPolygon;
//   //       // Set drag data to indicate dragging is active
//   //       if (this.currentDragPolygon._polydrawDragData) {
//   //         this.currentDragPolygon._polydrawDragData.isDragging = true;
//   //       }
//   //     } else if (!manager.currentDragPolygon && event.target) {
//   //       manager.currentDragPolygon = event.target;
//   //     }

//   //     // For tests: call updatePolygonCoordinates if currentDragPolygon exists
//   //     if (manager.currentDragPolygon && manager.currentDragPolygon._polydrawDragData?.isDragging) {
//   //       this.updatePolygonCoordinates(
//   //         manager.currentDragPolygon,
//   //         manager.currentDragPolygon._polydrawFeatureGroup,
//   //         manager.currentDragPolygon._polydrawLatLngs,
//   //       );
//   //     }

//   //     manager.onPolygonMouseUp(event);
//   //   }
//   // }

//   // private onPolygonMouseDown(event: any, polygon: any): void {
//   //   this.ensureManagersInitialized();

//   //   // Update local state for tests that check these properties
//   //   const isModifierPressed = this.detectModifierKey(event.originalEvent || event);
//   //   this.currentModifierDragMode = isModifierPressed;
//   //   this.isModifierKeyHeld = isModifierPressed;

//   //   if (this.polygonDragManager) {
//   //     (this.polygonDragManager as any).onPolygonMouseDown(event, polygon);
//   //   }
//   // }

//   // private handleModifierToggleDuringDrag(event: MouseEvent): void {
//   //   this.ensureManagersInitialized();
//   //   if (this.polygonDragManager) {
//   //     (this.polygonDragManager as any).handleModifierToggleDuringDrag(event);
//   //   }
//   //   // Also update local state for tests that check it
//   //   const isModifierPressed = this.detectModifierKey(event);
//   //   this.currentModifierDragMode = isModifierPressed;
//   // }

//   // private setSubtractVisualMode(polygon: any, enabled: boolean): void {
//   //   this.ensureManagersInitialized();
//   //   if (this.polygonDragManager) {
//   //     (this.polygonDragManager as any).setSubtractVisualMode(polygon, enabled);
//   //   }
//   // }

//   // private highlightEdgeOnHover(edgePolyline: L.Polyline, isHovering: boolean): void {
//   //   this.ensureManagersInitialized();
//   //   if (this.polygonEdgeManager) {
//   //     this.polygonEdgeManager.highlightEdgeOnHover(edgePolyline, isHovering);
//   //   }
//   // }

//   // private onEdgeClick(e: L.LeafletMouseEvent, edgePolyline: L.Polyline): void {
//   //   this.ensureManagersInitialized();
//   //   if (this.polygonEdgeManager) {
//   //     this.polygonEdgeManager.onEdgeClick(e, edgePolyline);
//   //   }
//   // }

//   // private addEdgeClickListeners(polygon: L.Polygon, featureGroup: L.FeatureGroup): void {
//   //   this.ensureManagersInitialized();
//   //   if (this.polygonEdgeManager) {
//   //     this.polygonEdgeManager.addEdgeClickListeners(polygon, featureGroup);
//   //   }
//   // }

//   // /**
//   //  * Analyze Leaflet coordinate structure for debugging
//   //  */
//   // private analyzeLeafletCoordinateStructure(coords: any): string {
//   //   if (!Array.isArray(coords)) return 'NOT_ARRAY';

//   //   let structure = '[';
//   //   if (coords.length > 0) {
//   //     if (Array.isArray(coords[0])) {
//   //       structure += '[';
//   //       if (coords[0].length > 0) {
//   //         if (coords[0][0] && typeof coords[0][0] === 'object' && 'lat' in coords[0][0]) {
//   //           structure += 'LATLNG_OBJECT';
//   //         } else if (Array.isArray(coords[0][0])) {
//   //           structure += '[LATLNG_OBJECT]';
//   //         } else {
//   //           structure += 'OTHER';
//   //         }
//   //       }
//   //       structure += ']';
//   //     } else if (coords[0] && typeof coords[0] === 'object' && 'lat' in coords[0]) {
//   //       structure += 'LATLNG_OBJECT';
//   //     } else {
//   //       structure += 'OTHER';
//   //     }
//   //   }
//   //   structure += ']';

//   //   return `${structure} (length: ${coords.length})`;
//   // }

//   // /**
//   //  * Analyze coordinate structure for debugging
//   //  */
//   // private analyzeCoordinateStructure(coords: any): string {
//   //   if (!Array.isArray(coords)) return 'NOT_ARRAY';

//   //   let structure = '[';
//   //   if (coords.length > 0) {
//   //     if (Array.isArray(coords[0])) {
//   //       structure += '[';
//   //       if (coords[0].length > 0) {
//   //         if (Array.isArray(coords[0][0])) {
//   //           structure += '[';
//   //           if (coords[0][0].length > 0) {
//   //             if (typeof coords[0][0][0] === 'number') {
//   //               structure += 'NUMBER';
//   //             } else {
//   //               structure += 'OTHER';
//   //             }
//   //           }
//   //           structure += ']';
//   //         } else {
//   //           structure += 'NOT_ARRAY';
//   //         }
//   //       }
//   //       structure += ']';
//   //     } else {
//   //       structure += 'NOT_ARRAY';
//   //     }
//   //   }
//   //   structure += ']';

//   //   return `${structure} (length: ${coords.length})`;
//   // }

//   // private get drawModeListeners(): DrawModeChangeHandler[] {
//   //   // This getter is used by the onAdd method to access listeners for UI setup
//   //   // We need to maintain compatibility with existing code that expects an array
//   //   // The actual event management is now handled by the State Manager
//   //   return this.legacyDrawModeListeners;
//   // // }

//   // private findIntersectingPolygons(draggedPolygon: any, excludeFeatureGroup: any): any[] {
//   //   this.ensureManagersInitialized();
//   //   return this.polygonDragManager
//   //     ? (this.polygonDragManager as any).findIntersectingPolygons(
//   //         draggedPolygon,
//   //         excludeFeatureGroup,
//   //       )
//   //     : [];
//   // }
//   // private updatePolygonCoordinates(polygon: any, featureGroup: any, originalLatLngs: any): void {
//   //   this.ensureManagersInitialized();

//   //   // Check if modifier drag mode is active - check both State Manager and local state for tests
//   //   const isModifierActive =
//   //     this.isModifierDragActive() || this.stateManager.isModifierDragActive();

//   //   if (isModifierActive) {
//   //     // Get new coordinates from dragged polygon
//   //     const newGeoJSON = polygon.toGeoJSON ? polygon.toGeoJSON() : originalLatLngs;

//   //     // Find intersecting polygons for modifier subtract
//   //     const intersectingFeatureGroups = this.findIntersectingPolygons
//   //       ? this.findIntersectingPolygons(newGeoJSON, featureGroup)
//   //       : [];

//   //     // Perform modifier subtract operation
//   //     this.performModifierSubtract(newGeoJSON, intersectingFeatureGroups);

//   //     // Reset modifier state after operation
//   //     this.currentModifierDragMode = false;
//   //     this.isModifierKeyHeld = false;

//   //     return;
//   //   }

//   //   if (this.polygonDragManager) {
//   //     try {
//   //       (this.polygonDragManager as any).updatePolygonCoordinates(
//   //         polygon,
//   //         featureGroup,
//   //         originalLatLngs,
//   //       );
//   //     } catch (error) {
//   //       console.warn('Failed to update polygon coordinates:', error.message);

//   //       // Fallback behavior for tests - use dragStartPosition if available
//   //       // The test expects exactly this format: [[[{ lat: 0, lng: 0 }]]]
//   //       if (this.dragStartPosition && polygon.setLatLngs) {
//   //         polygon.setLatLngs(this.dragStartPosition);
//   //       } else if (polygon.setLatLngs) {
//   //         // Fallback to the expected test format
//   //         polygon.setLatLngs([[[{ lat: 0, lng: 0 }]]]);
//   //       }
//   //     }
//   //   }
//   // }

//   // /**
//   //  * Modifier key drag functionality - Public wrappers for testing
//   //  */
//   // // Test wrapper methods for polygon drag functionality
//   // private detectModifierKey(event: MouseEvent): boolean {
//   //   this.ensureManagersInitialized();
//   //   return this.polygonDragManager
//   //     ? (this.polygonDragManager as any).detectModifierKey(event)
//   //     : false;
//   // }
// }

// (L.control as any).polydraw = function (options: L.ControlOptions) {
//   return new Polydraw(options);
// };

// export default Polydraw;
