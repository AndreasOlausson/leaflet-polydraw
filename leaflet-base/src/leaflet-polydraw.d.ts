declare module "leaflet-polydraw" {
  import * as L from "leaflet";

  export default class Polydraw extends L.Control {
    constructor(options?: L.ControlOptions & { config?: any });
    addTo(map: L.Map): this;
    configurate(config: any): void;
    onAdd(map: L.Map): HTMLElement;
    addAutoPolygon(geographicBorders: L.LatLng[][][]): void;
    setDrawMode(mode: any): void;
    deletePolygon(polygon: any): void;
    removeAllFeatureGroups(): void;
    getDrawMode(): any;
    enablePolygonDraggingMode(enable?: boolean): void;
  }
}
