import 'reflect-metadata';
import { injectable, container } from 'tsyringe';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { Observable, BehaviorSubject, Subject, config } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Feature, Polygon, MultiPolygon } from '@turf/turf';
import { MapStateService } from './map-state';
import { PolygonInformationService } from './polygon-information';
import defaultConfig from './config.json';
import { ILatLng } from './polygon-helpers';
import { Compass, PolyDrawUtil, Perimeter, Area } from './utils';
import { MarkerPosition, DrawMode } from './enums';
import { TurfHelper } from './turf-helper';
import { PolygonUtil } from './polygon.util';
import { IconFactory } from './icon-factory';

@injectable()
export class PolyDrawService {
  //DrawModes, determine UI buttons etc...
  drawModeSubject: BehaviorSubject<DrawMode> = new BehaviorSubject<DrawMode>(DrawMode.Off);
  drawMode$: Observable<DrawMode> = this.drawModeSubject.asObservable();

  private map: L.Map;

  private mergePolygons: boolean;
  private kinks: boolean;
  //add to config
  private arrayOfFeatureGroups: L.FeatureGroup<L.Layer>[] = [];
  private tracer: L.Polyline = {} as any;
  private readonly polygonDrawStates = null;
  //end add to config

  private ngUnsubscribe = new Subject();
  private config: typeof defaultConfig = null;
  private turfHelper: TurfHelper = null;
  private mapState: MapStateService = container.resolve(MapStateService);
  constructor(
    //private turfHelper: TurfHelperService,
    private polygonInformation: PolygonInformationService,
  ) {
    console.log(this.mapState);

    this.mapState.map$.pipe(filter((m) => m !== null)).subscribe((map: L.Map) => {
      console.log('HER');
      this.map = map;
      this.config = defaultConfig;
      this.configurate({});
      this.tracer = L.polyline([[0, 0]], this.config.polyLineOptions);
      this.turfHelper = new TurfHelper(this.config);
      this.initPolyDraw();
    });

    this.polygonInformation.polygonInformation$.subscribe((k) => {
      console.log('PolyInfo start: ', k);
    });

    //TODO - lage en config observable i mapState og oppdater this.config med den
  }
  //new
  configurate(config: Object): void {
    //TODO if config is path...
    console.log('before', this.config);
    this.config = { ...defaultConfig, ...config };
    console.log('before', this.config, config);
    this.mergePolygons = this.config.mergePolygons;
    this.kinks = this.config.kinks;
  }

  //fine
  closeAndReset(): void {
    //console.log("closeAndReset");
    this.setDrawMode(DrawMode.Off);
    this.removeAllFeatureGroups();
  }

  //make readable
  deletePolygon(polygon: ILatLng[][]) {
    console.log('deletePolygon: ', polygon);
    if (this.arrayOfFeatureGroups.length > 0) {
      this.arrayOfFeatureGroups.forEach((featureGroup) => {
        const layer = featureGroup.getLayers()[0] as any;
        const latlngs = layer.getLatLngs();
        const length = latlngs.length;
        //  = []
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
  //fine
  removeAllFeatureGroups() {
    //console.log("removeAllFeatureGroups", null);
    this.arrayOfFeatureGroups.forEach((featureGroups) => {
      this.map.removeLayer(featureGroups);
    });

    this.arrayOfFeatureGroups = [];
    this.polygonInformation.deletePolygonInformationStorage();
    // this.polygonDrawStates.reset();
    this.polygonInformation.updatePolygons();
  }
  //fine
  getDrawMode(): DrawMode {
    //console.log("getDrawMode", null);
    return this.drawModeSubject.value;
  }

  addViken(polygon) {
    this.addPolygonLayer(polygon, true);
  }

  //check this
  addAutoPolygon(geographicBorders: L.LatLng[][][]): void {
    geographicBorders.forEach((group) => {
      const featureGroup: L.FeatureGroup = new L.FeatureGroup();

      const polygon2 = this.turfHelper.getMultiPolygon(this.convertToCoords(group));
      console.log(polygon2);
      const polygon = this.getPolygon(polygon2);

      featureGroup.addLayer(polygon);
      const markerLatlngs = polygon.getLatLngs();
      console.log('markers: ', markerLatlngs);
      markerLatlngs.forEach((polygon) => {
        polygon.forEach((polyElement, i) => {
          if (i === 0) {
            this.addMarker(polyElement, featureGroup);
          } else {
            this.addHoleMarker(polyElement, featureGroup);
            console.log('Hull: ', polyElement);
          }
        });
        // this.addMarker(polygon[0], featureGroup);
        //TODO - Hvis polygon.length >1, så har den hull: egen addMarker funksjon
      });

      this.arrayOfFeatureGroups.push(featureGroup);
      this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
    });
  }

  //innehåll i if'ar flytta till egna metoder
  private convertToCoords(latlngs: ILatLng[][]) {
    const coords = [];
    console.log(latlngs.length, latlngs);
    if (latlngs.length > 1 && latlngs.length < 3) {
      const coordinates = [];
      console.log(
        L.GeoJSON.latLngsToCoords(latlngs[latlngs.length - 1]),
        latlngs[latlngs.length - 1].length,
      );
      const within = this.turfHelper.isWithin(
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
      console.log('Within1 ', within);
    } else if (latlngs.length > 2) {
      const coordinates = [];
      for (let index = 1; index < latlngs.length - 1; index++) {
        const within = this.turfHelper.isWithin(
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
    console.log(coords);
    return coords;
  }

  //fine
  private initPolyDraw() {
    //console.log("initPolyDraw", null);

    const container: HTMLElement = this.map.getContainer();
    const drawMode = this.getDrawMode();
    if (this.config.touchSupport) {
      container.addEventListener('touchstart', (e) => {
        if (drawMode !== DrawMode.Off) {
          console.log(e);
          this.mouseDown(e);
        }
      });

      container.addEventListener('touchend', (e) => {
        if (drawMode !== DrawMode.Off) {
          this.mouseUpLeave(e);
        }
      });

      container.addEventListener('touchmove', (e) => {
        if (drawMode !== DrawMode.Off) {
          this.mouseMove(e);
        }
      });
    }

    this.map.addLayer(this.tracer);
    this.setDrawMode(DrawMode.Off);
  }
  //Test L.MouseEvent
  private mouseDown(event) {
    console.log('mouseDown', event);

    if (event.originalEvent != null) {
      this.tracer.setLatLngs([event.latlng]);
    } else {
      const latlng = this.map.containerPointToLatLng([
        event.touches[0].clientX,
        event.touches[0].clientY,
      ]);

      this.tracer.setLatLngs([latlng]);
    }
    console.log(this.tracer.getLatLngs());
    this.startDraw();
  }

  //TODO event type, create containerPointToLatLng-method
  private mouseMove(event) {
    console.log('mouseMove', event);
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

  //fine
  private mouseUpLeave(event) {
    console.log('mouseUpLeave', this.tracer.toGeoJSON());
    this.polygonInformation.deletePolygonInformationStorage();
    //console.log("------------------------------Delete trashcans", null);
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
    //console.log("------------------------------create trashcans", null);
  }
  //fine
  private startDraw() {
    //console.log("startDraw", null);

    this.drawStartedEvents(true);
  }
  //fine
  private stopDraw() {
    //console.log("stopDraw", null);

    this.resetTracker();
    this.drawStartedEvents(false);
  }
  //fine
  private drawStartedEvents(onoff: boolean) {
    console.log('drawStartedEvents', onoff);

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
  //On hold
  private subtractPolygon(latlngs: Feature<Polygon | MultiPolygon>) {
    this.subtract(latlngs);
  }
  //fine
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
  //fine
  private addPolygonLayer(
    latlngs: Feature<Polygon | MultiPolygon>,
    simplify: boolean,
    dynamicTolerance: boolean = false,
  ) {
    const featureGroup: L.FeatureGroup = new L.FeatureGroup();

    const latLngs = simplify ? this.turfHelper.getSimplified(latlngs, dynamicTolerance) : latlngs;
    console.log('AddPolygonLayer: ', latLngs);
    const polygon = this.getPolygon(latLngs);
    featureGroup.addLayer(polygon);
    console.log(polygon);
    const markerLatlngs = polygon.getLatLngs();
    markerLatlngs.forEach((polygon) => {
      polygon.forEach((polyElement: ILatLng[], i: number) => {
        if (i === 0) {
          this.addMarker(polyElement, featureGroup);
        } else {
          this.addHoleMarker(polyElement, featureGroup);
          console.log('Hull: ', polyElement);
        }
      });
      console.log('This is a good place to add area info icon');
      // this.addMarker(polygon[0], featureGroup);
      //TODO - Hvis polygon.length >1, så har den hull: egen addMarker funksjon
    });

    this.arrayOfFeatureGroups.push(featureGroup);
    console.log('Array: ', this.arrayOfFeatureGroups);
    this.setDrawMode(DrawMode.Off);

    featureGroup.on('click', (e) => {
      this.polygonClicked(e, latLngs);
    });
  }
  //fine
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
  //fine
  private getPolygon(latlngs: Feature<Polygon | MultiPolygon>) {
    console.log('getPolygons: ', latlngs);
    const polygon = L.GeoJSON.geometryToLayer(latlngs) as any;

    polygon.setStyle(this.config.polygonOptions);
    return polygon;
  }
  //fine
  private merge(latlngs: Feature<Polygon | MultiPolygon>) {
    console.log('merge', latlngs);
    const polygonFeature = [];
    const newArray: L.FeatureGroup[] = [];
    let polyIntersection: boolean = false;
    this.arrayOfFeatureGroups.forEach((featureGroup) => {
      const featureCollection = featureGroup.toGeoJSON() as any;
      if (featureCollection.features[0].geometry.coordinates.length > 1) {
        featureCollection.features[0].geometry.coordinates.forEach((element) => {
          const feature = this.turfHelper.getMultiPolygon([element]);
          polyIntersection = this.turfHelper.polygonIntersect(feature, latlngs);
          if (polyIntersection) {
            newArray.push(featureGroup);
            polygonFeature.push(feature);
          }
        });
      } else {
        const feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
        polyIntersection = this.turfHelper.polygonIntersect(feature, latlngs);
        if (polyIntersection) {
          newArray.push(featureGroup);
          polygonFeature.push(feature);
        }
      }
    });
    console.log(newArray);
    if (newArray.length > 0) {
      this.unionPolygons(newArray, latlngs, polygonFeature);
    } else {
      this.addPolygonLayer(latlngs, true);
    }
  }
  //next
  private subtract(latlngs: Feature<Polygon | MultiPolygon>) {
    let addHole = latlngs;
    this.arrayOfFeatureGroups.forEach((featureGroup) => {
      const featureCollection = featureGroup.toGeoJSON() as any;
      const layer = featureCollection.features[0];
      const poly = this.getLatLngsFromJson(layer);
      const feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
      const newPolygon = this.turfHelper.polygonDifference(feature, addHole);
      this.deletePolygon(poly);
      this.removeFeatureGroupOnMerge(featureGroup);
      addHole = newPolygon;
    });

    const newLatlngs: Feature<Polygon | MultiPolygon> = addHole;
    const coords = this.turfHelper.getCoords(newLatlngs);
    coords.forEach((value) => {
      this.addPolygonLayer(this.turfHelper.getMultiPolygon([value]), true);
    });
  }
  //fine
  private events(onoff: boolean) {
    const onoroff = onoff ? 'on' : 'off';
    this.map[onoroff]('mousedown', this.mouseDown, this);
    if (onoff) {
      this.map.getContainer().addEventListener('touchstart', (e) => this.mouseDown(e));
    } else {
      this.map.getContainer().removeEventListener('touchstart', (e) => this.mouseDown(e), true);
    }
  }
  //fine, TODO: if special markers
  private addMarker(latlngs: ILatLng[], FeatureGroup: L.FeatureGroup) {
    const menuMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerMenuIcon.position);
    const deleteMarkerIdx = this.getMarkerIndex(
      latlngs,
      this.config.markers.markerDeleteIcon.position,
    );
    const infoMarkerIdx = this.getMarkerIndex(latlngs, this.config.markers.markerInfoIcon.position);
    //var markers = (L as any).markerClusterGroup();
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
        title: this.config.markers.coordsTitle ? this.getLatLngInfoString(latlng) : '',
        zIndexOffset:
          this.config.markers.markerIcon.zIndexOffset ?? this.config.markers.zIndexOffset,
      });
      FeatureGroup.addLayer(marker).addTo(this.map);
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
    //markers.addTo(this.map)
  }

  private addHoleMarker(latlngs: ILatLng[], FeatureGroup: L.FeatureGroup) {
    latlngs.forEach((latlng, i) => {
      const iconClasses = this.config.markers.markerIcon.styleClasses;
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
  // private createDivIcon(classNames: string[]): L.DivIcon {
  //   const classes = classNames.join(" ");
  //   const icon = L.divIcon({ className: classes });
  //   return icon;
  // }
  //TODO: Cleanup
  private markerDrag(FeatureGroup: L.FeatureGroup) {
    const newPos = [];
    let testarray = [];
    let hole = [];
    const layerLength = FeatureGroup.getLayers() as any;
    const posarrays = layerLength[0].getLatLngs();
    console.log(posarrays);
    let length = 0;
    if (posarrays.length > 1) {
      for (let index = 0; index < posarrays.length; index++) {
        testarray = [];
        hole = [];
        console.log('Posisjoner: ', posarrays[index]);
        if (index === 0) {
          if (posarrays[0].length > 1) {
            for (let i = 0; index < posarrays[0].length; i++) {
              console.log('Posisjoner 2: ', posarrays[index][i]);

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
          console.log('Hole: ', hole);
          newPos.push(hole);
        } else {
          length += posarrays[index - 1][0].length;
          console.log('STart index: ', length);
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
        console.log('Polygon drag: ', posarrays[0][index]);
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
      console.log('Hole 2: ', hole);
    }
    console.log('Nye posisjoner: ', newPos);
    layerLength[0].setLatLngs(newPos);
  }
  // check this
  private markerDragEnd(FeatureGroup: L.FeatureGroup) {
    this.polygonInformation.deletePolygonInformationStorage();
    const featureCollection = FeatureGroup.toGeoJSON() as any;
    console.log('Markerdragend polygon: ', featureCollection.features[0].geometry.coordinates);
    if (featureCollection.features[0].geometry.coordinates.length > 1) {
      featureCollection.features[0].geometry.coordinates.forEach((element) => {
        const feature = this.turfHelper.getMultiPolygon([element]);

        console.log('Markerdragend: ', feature);
        if (this.turfHelper.hasKinks(feature)) {
          this.kinks = true;
          const unkink = this.turfHelper.getKinks(feature);
          // this.deletePolygon(this.getLatLngsFromJson(feature));
          this.removeFeatureGroup(FeatureGroup);
          console.log('Unkink: ', unkink);
          const testCoord = [];
          unkink.forEach((polygon) => {
            // testCoord.push(polygon.geometry.coordinates)
            this.addPolygon(this.turfHelper.getTurfPolygon(polygon), false);
          });
          // this.addPolygon(this.turfHelper.getMultiPolygon(testCoord), false, true);
        } else {
          this.kinks = false;
          this.addPolygon(feature, false);
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
        // this.deletePolygon(this.getLatLngsFromJson(feature));
        this.removeFeatureGroup(FeatureGroup);
        console.log('Unkink: ', unkink);
        // console.log("TEST");
        const testCoord = [];
        unkink.forEach((polygon) => {
          // testCoord.push(polygon.geometry.coordinates)
          this.addPolygon(this.turfHelper.getTurfPolygon(polygon), false);
        });
        console.log('TEST ', testCoord);
        // console.log("TESTMulti: ", this.turfHelper.getMultiPolygon(testCoord));
        // this.addPolygon(this.turfHelper.getMultiPolygon(testCoord), false, true);
      } else {
        // this.deletePolygon(this.getLatLngsFromJson(feature));
        this.kinks = false;
        this.addPolygon(feature, false);
      }
    }
    console.log(this.arrayOfFeatureGroups);
    this.polygonInformation.createPolygonInformationStorage(this.arrayOfFeatureGroups);
  }
  //fine, check the returned type
  private getLatLngsFromJson(feature: Feature<Polygon | MultiPolygon>): ILatLng[][] {
    // console.log("getLatLngsFromJson: ", feature);
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

  //fine
  private unionPolygons(layers, latlngs: Feature<Polygon | MultiPolygon>, polygonFeature) {
    // console.log("unionPolygons", layers, latlngs, polygonFeature);

    let addNew = latlngs;
    layers.forEach((featureGroup, i) => {
      const featureCollection = featureGroup.toGeoJSON();
      const layer = featureCollection.features[0];
      const poly = this.getLatLngsFromJson(layer);
      const union = this.turfHelper.union(addNew, polygonFeature[i]); //Check for multipolygons
      //Needs a cleanup for the new version
      this.deletePolygonOnMerge(poly);
      this.removeFeatureGroup(featureGroup);

      addNew = union;
    });

    const newLatlngs: Feature<Polygon | MultiPolygon> = addNew; //Trenger kanskje this.turfHelper.getTurfPolygon( addNew);
    this.addPolygonLayer(newLatlngs, true);
  }
  //fine
  private removeFeatureGroup(featureGroup: L.FeatureGroup) {
    // console.log("removeFeatureGroup", featureGroup);

    featureGroup.clearLayers();
    this.arrayOfFeatureGroups = this.arrayOfFeatureGroups.filter(
      (featureGroups) => featureGroups !== featureGroup,
    );
    // this.updatePolygons();
    this.map.removeLayer(featureGroup);
  }
  //fine until refactoring
  private removeFeatureGroupOnMerge(featureGroup: L.FeatureGroup) {
    // console.log("removeFeatureGroupOnMerge", featureGroup);

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
  //fine until refactoring
  private deletePolygonOnMerge(polygon) {
    // console.log("deletePolygonOnMerge", polygon);
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
          // console.log("EQUALS", polygon);
          this.removeFeatureGroupOnMerge(featureGroup);
          this.deletePolygon(polygon);
          this.polygonInformation.deleteTrashcan(polygon);
          // this.updatePolygons();
        }
      });
    }
  }

  //TODO - legge et annet sted
  private polygonArrayEqualsMerge(poly1: any[], poly2: any[]): boolean {
    return poly1.toString() === poly2.toString();
  }
  //TODO - legge et annet sted
  private polygonArrayEquals(poly1: any[], poly2: any[]): boolean {
    // console.log("polygonArrayEquals", poly1, poly2);

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
  //fine
  private setLeafletMapEvents(
    enableDragging: boolean,
    enableDoubleClickZoom: boolean,
    enableScrollWheelZoom: boolean,
  ) {
    //console.log("setLeafletMapEvents", enableDragging, enableDoubleClickZoom, enableScrollWheelZoom);

    enableDragging ? this.map.dragging.enable() : this.map.dragging.disable();
    enableDoubleClickZoom ? this.map.doubleClickZoom.enable() : this.map.doubleClickZoom.disable();
    enableScrollWheelZoom ? this.map.scrollWheelZoom.enable() : this.map.scrollWheelZoom.disable();
  }
  //fine
  setDrawMode(mode: DrawMode) {
    console.log('setDrawMode', this.map);
    this.drawModeSubject.next(mode);
    if (this.map) {
      let isActiveDrawMode = true;
      switch (mode) {
        case DrawMode.Off:
          L.DomUtil.removeClass(this.map.getContainer(), 'crosshair-cursor-enabled');
          this.events(false);
          this.stopDraw();
          this.tracer.setStyle({
            color: '',
          });
          this.setLeafletMapEvents(true, true, true);
          isActiveDrawMode = false;
          break;
        case DrawMode.Add:
          L.DomUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
          this.events(true);
          this.tracer.setStyle({
            color: defaultConfig.polyLineOptions.color,
          });
          this.setLeafletMapEvents(false, false, false);
          break;
        case DrawMode.Subtract:
          L.DomUtil.addClass(this.map.getContainer(), 'crosshair-cursor-enabled');
          this.events(true);
          this.tracer.setStyle({
            color: '#D9460F',
          });
          this.setLeafletMapEvents(false, false, false);
          break;
      }
    }
  }

  modeChange(mode: DrawMode): void {
    this.setDrawMode(mode);
    this.polygonInformation.saveCurrentState();
  }
  //remove, use modeChange
  drawModeClick(): void {
    this.setDrawMode(DrawMode.Add);
    this.polygonInformation.saveCurrentState();
  }
  //remove, use modeChange
  freedrawMenuClick(): void {
    this.setDrawMode(DrawMode.Add);
    this.polygonInformation.saveCurrentState();
  }

  //remove, use modeChange
  subtractClick(): void {
    this.setDrawMode(DrawMode.Subtract);
    this.polygonInformation.saveCurrentState();
  }
  //fine
  private resetTracker() {
    this.tracer.setLatLngs([[0, 0]]);
  }

  toggleMarkerMenu(): void {
    alert('open menu');
  }
  private convertToBoundsPolygon(latlngs: ILatLng[]) {
    this.deletePolygon([latlngs]);
    const polygon = this.turfHelper.getMultiPolygon(this.convertToCoords([latlngs]));
    const newPolygon = this.turfHelper.convertToBoundingBoxPolygon(polygon);

    this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), false);
  }
  private convertToSimplifiedPolygon(latlngs: ILatLng[]) {
    this.deletePolygon([latlngs]);
    const newPolygon = this.turfHelper.getMultiPolygon(this.convertToCoords([latlngs]));
    this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), true, true);
  }
  private doubleElbows(latlngs: ILatLng[]) {
    this.deletePolygon([latlngs]);
    const doubleLatLngs: ILatLng[] = this.turfHelper.getDoubleElbowLatLngs(latlngs);
    const newPolygon = this.turfHelper.getMultiPolygon(this.convertToCoords([doubleLatLngs]));
    this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), false, false);
  }
  private bezierify(latlngs: ILatLng[]) {
    this.deletePolygon([latlngs]);
    const newPolygon = this.turfHelper.getBezierMultiPolygon(this.convertToCoords([latlngs]));
    this.addPolygonLayer(this.turfHelper.getTurfPolygon(newPolygon), false, false);
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
  private getLatLngInfoString(latlng: ILatLng): string {
    return 'Latitude: ' + latlng.lat + ' Longitude: ' + latlng.lng;
  }
}
//flytt til enum.ts
/* export enum DrawMode {
  Off = 0,
  AddPolygon = 1,
  EditPolygon = 2,
  SubtractPolygon = 3,
  LoadPolygon = 4
} */
