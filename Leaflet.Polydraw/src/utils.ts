import { MarkerPosition } from "./enums";
import * as L from "leaflet";
import defaultConfig from "./config.json";
import type { ILatLng } from "./polygon-helpers";

/**
 * Utility for polygon bounds.
 */

// For ICompass, from interface, but for now, define
type ICompass = {
    East: ILatLng;
    North: ILatLng;
    NorthEast: ILatLng;
    NorthWest: ILatLng;
    South: ILatLng;
    SouthEast: ILatLng;
    SouthWest: ILatLng;
    West: ILatLng;
};

export class PolyDrawUtil {
    /**
     * Gets the bounds of the polygon with optional padding.
     * @param polygon Array of LatLng points.
     * @param padding Padding factor.
     * @returns The LatLngBounds.
     */
    static getBounds(polygon: ILatLng[], padding: number = 0): L.LatLngBounds {
        const tmpLatLng: L.LatLng[] = [];
        polygon.forEach(ll => {
            if (isNaN(ll.lat) || isNaN(ll.lng)) {
            }
            tmpLatLng.push(ll as L.LatLng);
        });
        const polyLine: L.Polyline = new L.Polyline(tmpLatLng);
        const bounds = polyLine.getBounds();
        if (padding !== 0) {
            return bounds.pad(padding);
        }
        return bounds;
    }
}

/**
 * Class for compass directions based on bounds.
 */
export class Compass {
    public direction: ICompass = {
        East: new L.LatLng(0, 0),
        North: new L.LatLng(0, 0),
        NorthEast: new L.LatLng(0, 0),
        NorthWest: new L.LatLng(0, 0),
        South: new L.LatLng(0, 0),
        SouthEast: new L.LatLng(0, 0),
        SouthWest: new L.LatLng(0, 0),
        West: new L.LatLng(0, 0)
    };
    constructor(minLat: number = 0, minLng: number = 0, maxLat: number = 0, maxLng: number = 0) {
        this.direction.North = new L.LatLng(maxLat, (minLng + maxLng) / 2);
        this.direction.NorthEast = new L.LatLng(maxLat, maxLng);
        this.direction.East = new L.LatLng((minLat + maxLat) / 2, maxLng);
        this.direction.SouthEast = new L.LatLng(minLat, maxLng);
        this.direction.South = new L.LatLng(minLat, (minLng + maxLng) / 2);
        this.direction.SouthWest = new L.LatLng(minLat, minLng);
        this.direction.West = new L.LatLng((minLat + maxLat) / 2, minLng);
        this.direction.NorthWest = new L.LatLng(maxLat, minLng);
    }
    getDirection(direction: MarkerPosition) {
        switch (direction) {
            case MarkerPosition.SouthWest:
                return this.direction.SouthWest;
            case MarkerPosition.West:
                return this.direction.West;
            case MarkerPosition.NorthWest:
                return this.direction.NorthWest;
            case MarkerPosition.North:
                return this.direction.North;
            case MarkerPosition.NorthEast:
                return this.direction.NorthEast;
            case MarkerPosition.East:
                return this.direction.East;
            case MarkerPosition.SouthEast:
                return this.direction.SouthEast;
            case MarkerPosition.South:
                return this.direction.South;
            default:
                throw new Error;
        }
    }
    getPositions(startPosition: MarkerPosition = MarkerPosition.SouthWest, clockwise: boolean = false, addClosingNode: boolean = true): number[][] {
        let positions: number[][] = [];
        const posArray = this.getPositionAsArray(startPosition, clockwise);
        posArray.forEach(v => {
            positions.push([v.lng, v.lat]);
        });
        if (addClosingNode) {
            positions.push([posArray[0].lng, posArray[0].lat]);
        }
        return positions;
    }
    private getPositionAsArray(startPosition: MarkerPosition = MarkerPosition.NorthEast, clockwise: boolean = false): ILatLng[] {
        const positions: ILatLng[] = [];
        if (clockwise) {
            positions.push(this.direction.SouthWest);
            positions.push(this.direction.West);
            positions.push(this.direction.NorthWest);
            positions.push(this.direction.North);
            positions.push(this.direction.NorthEast);
            positions.push(this.direction.East);
            positions.push(this.direction.SouthEast);
            positions.push(this.direction.South);
        } else {
            positions.push(this.direction.SouthWest);
            positions.push(this.direction.South);
            positions.push(this.direction.SouthEast);
            positions.push(this.direction.East);
            positions.push(this.direction.NorthEast);
            positions.push(this.direction.North);
            positions.push(this.direction.NorthWest);
            positions.push(this.direction.West);
        }
        if (startPosition !== MarkerPosition.SouthWest) {
            var chunk = positions.splice(0, startPosition);
            chunk.forEach((v, i) => {
                positions.splice(startPosition + i, 0, v);
            })
        }
        return positions;
    }
}

/**
 * Class for calculating perimeter in different units.
 */
export class Perimeter {
    public metricLength: string = "";
    public metricUnit: string = "";
    public imperialLength: string = "";
    public imperialUnit: string = "";

    constructor(length: number, config: typeof defaultConfig) {
        if (length !== null || length !== undefined) {
            if (length === 0) {
                if (config.markers.markerInfoIcon.usePerimeterMinValue) {
                    this.metricLength = config.markers.markerInfoIcon.values.min.metric;
                    this.metricUnit = config.markers.markerInfoIcon.units.metric.perimeter.m;
                    this.imperialLength = config.markers.markerInfoIcon.values.min.imperial;
                    this.imperialUnit = config.markers.markerInfoIcon.units.imperial.perimeter.feet;
                } else {
                    this.metricLength = config.markers.markerInfoIcon.values.unknown.metric;
                    this.metricUnit = config.markers.markerInfoIcon.units.unknownUnit;
                    this.imperialLength = config.markers.markerInfoIcon.values.unknown.imperial;
                    this.imperialUnit = config.markers.markerInfoIcon.units.unknownUnit;
                }
            } else if (length < 100) {
                this.metricLength = (Math.ceil(length / 10) * 10).toString();
                this.metricUnit = config.markers.markerInfoIcon.units.metric.perimeter.m;
            } else if (length < 500) {
                this.metricLength = (Math.ceil(length / 50) * 50).toString();
                this.metricUnit = config.markers.markerInfoIcon.units.metric.perimeter.m;
            } else if (length < 1000) {
                this.metricLength = (Math.ceil(length / 100) * 100).toString();
                this.metricUnit = config.markers.markerInfoIcon.units.metric.perimeter.m;
            } else if (length < 10000) {
                this.metricLength = ((Math.ceil(length / 100) * 100) / 1000).toFixed(1);
                this.metricUnit = config.markers.markerInfoIcon.units.metric.perimeter.km;
            } else {
                this.metricLength = ((Math.ceil(length / 1000) * 1000) / 1000).toString();
                this.metricUnit = config.markers.markerInfoIcon.units.metric.perimeter.km;
            }
            //Imperial
            const inch = length / 0.0254;
            const feet = inch / 12;
            const yards = feet / 3;
            const miles = yards / 1760;

            if (length < (1000 / 2.54)) {
                this.imperialLength = (Math.ceil(feet / 10) * 10).toString();
                this.imperialUnit = config.markers.markerInfoIcon.units.imperial.perimeter.feet;
            } else if (length < (1000 / 2.54) * 3) {
                this.imperialLength = (Math.ceil(yards / 10) * 10).toString();
                this.imperialUnit = config.markers.markerInfoIcon.units.imperial.perimeter.yards;
            } else if (length < 1609) {
                this.imperialLength = miles.toFixed(2);
                this.imperialUnit = config.markers.markerInfoIcon.units.imperial.perimeter.miles;
            } else if (length < 16093) {
                this.imperialLength = miles.toFixed(1);
                this.imperialUnit = config.markers.markerInfoIcon.units.imperial.perimeter.miles;
            } else {
                this.imperialLength = miles.toFixed(0);
                this.imperialUnit = config.markers.markerInfoIcon.units.imperial.perimeter.miles;
            }
        }
    }
}

/**
 * Class for calculating area in different units.
 */
export class Area {
    public metricArea: string = "";
    public metricUnit: string = "";
    public imperialArea: string = "";
    public imperialUnit: string = "";

    constructor(sqrMeterArea: number, config: typeof defaultConfig) {
        const area = sqrMeterArea;
        const onlyMetrics = config.markers.markerInfoIcon.units.metric.onlyMetrics;
        if (area !== null || area !== undefined) {
            if (area === 0) {
                this.metricArea = "-";
                this.metricUnit = config.markers.markerInfoIcon.units.unknownUnit;
                this.imperialArea = "-";
                this.imperialUnit = config.markers.markerInfoIcon.units.unknownUnit;
            } else if (area < 10000) {
                this.metricArea = Math.round(area).toString();
                this.metricUnit = config.markers.markerInfoIcon.units.metric.area.m2;
            } else if (area < 100000) {
                if (onlyMetrics) {
                    this.metricArea = (area / 1000000).toFixed(2);
                    this.metricUnit = config.markers.markerInfoIcon.units.metric.area.km2;
                } else {
                    this.metricArea = (area / 1000).toFixed(1);
                    this.metricUnit = config.markers.markerInfoIcon.units.metric.area.daa;
                }
            }
            else if (area < 10000000) {
                if (onlyMetrics) {
                    this.metricArea = (area / 1000000).toFixed(2);
                    this.metricUnit = config.markers.markerInfoIcon.units.metric.area.km2;
                } else {
                    this.metricArea = Math.round(area / 1000).toString();
                    this.metricUnit = config.markers.markerInfoIcon.units.metric.area.daa;
                }
            }
            else if (area < 100000000) {
                if (onlyMetrics) {
                    this.metricArea = (area / 1000000).toFixed(1);
                    this.metricUnit = config.markers.markerInfoIcon.units.metric.area.km2;
                } else {
                    this.metricArea = Math.round(area / 10000).toString();
                    this.metricUnit = config.markers.markerInfoIcon.units.metric.area.ha;
                }
            }
            else {
                this.metricArea = Math.round(area / 1000000).toString();
                this.metricUnit = config.markers.markerInfoIcon.units.metric.area.km2;
            }

            //Imperial
            const inch2 = area * 1550.0;
            const feet2 = inch2 * 0.0069444;
            const yards2 = feet2 * 0.11111;
            const acres = yards2 * 0.00020661;
            const miles2 = yards2 * 0.00000032283;

            if (area < 92.9) {
                this.imperialArea = Math.round(feet2).toString();
                this.imperialUnit = config.markers.markerInfoIcon.units.imperial.area.feet2;
            } else if (area < 836.14) {
                this.imperialArea = yards2.toFixed(0);
                this.imperialUnit = config.markers.markerInfoIcon.units.imperial.area.yards2;
            } else if (area < 40469.6) {
                this.imperialArea = acres.toFixed(2);
                this.imperialUnit = config.markers.markerInfoIcon.units.imperial.area.acres;
            } else if (area < 404696) {
                this.imperialArea = acres.toFixed(1);
                this.imperialUnit = config.markers.markerInfoIcon.units.imperial.area.acres;
            } else if (area < 4046960) {
                this.imperialArea = acres.toFixed(0);
                this.imperialUnit = config.markers.markerInfoIcon.units.imperial.area.acres;
            } else if (area < 25900404) {
                this.imperialArea = miles2.toFixed(2);
                this.imperialUnit = config.markers.markerInfoIcon.units.imperial.area.miles2;
            } else if (area < 259004040) {
                this.imperialArea = miles2.toFixed(1);
                this.imperialUnit = config.markers.markerInfoIcon.units.imperial.area.miles2;
            } else {
                this.imperialArea = miles2.toFixed(0);
                this.imperialUnit = config.markers.markerInfoIcon.units.imperial.area.miles2;
            }
        }
    }
}
