import { PolygonUtil } from "./polygon.util";

/**
 * Class to hold information about a polygon, including area, perimeter, and trashcan point.
 */
export class PolygonInfo {
    polygon: ILatLng[][][] = [];
    trashcanPoint: ILatLng[] = [];
    sqmArea: number[] = [];
    perimeter: number[] = [];
    constructor(polygon) {
        // Process each polygon
        polygon.forEach((polygons, i) => { 
            this.trashcanPoint[i] = this.getTrashcanPoint(polygons[0]);
            this.sqmArea[i] = this.calculatePolygonArea(polygons[0]);
            this.perimeter[i] = this.calculatePolygonPerimeter(polygons[0]);
            this.polygon[i] = polygons
        })
    }
    setSqmArea(area: number): void {
        this.sqmArea[0] = area;
    }
    private getTrashcanPoint(polygon: ILatLng[]): ILatLng {

        const res = Math.max.apply(Math, polygon.map(o => o.lat));
        const idx = polygon.findIndex(o => o.lat === res);

        let previousPoint: ILatLng;
        let nextPoint: ILatLng;

        if (idx > 0) {
            previousPoint = polygon[idx - 1];
            if (idx < polygon.length - 1) {
                nextPoint = polygon[idx + 1];
            } else {
                nextPoint = polygon[0];
            }
        } else {
            previousPoint = polygon[polygon.length - 1];
            nextPoint = polygon[idx + 1];
        }

        const secondPoint = (previousPoint.lng < nextPoint.lng) ? previousPoint : nextPoint;

        const midpoint = PolygonUtil.getMidPoint(polygon[idx], secondPoint);

        return midpoint;
    }
    private calculatePolygonArea(polygon: ILatLng[]): number {
        const area = PolygonUtil.getSqmArea((polygon) as any);
        return area;
    }
    private calculatePolygonPerimeter(polygon: ILatLng[]): number {
        const perimeter = PolygonUtil.getPerimeter((polygon) as any);
        return perimeter;
    }
    
}

/**
 * Class to manage the state of polygon drawing.
 */
export class PolygonDrawStates {
    isActivated: boolean;
    isFreeDrawMode: boolean;
    isMoveMode: boolean;
    canRevert: boolean;
    isAuto: boolean;
    hasPolygons: boolean;
    canUsePolyDraw: boolean;


    constructor() {
        this.canUsePolyDraw = false;
        this.reset();
    }

    activate(): void {
        this.reset();
        this.isActivated = true;
    }

    reset(): void {
        this.isActivated = false;
        this.hasPolygons = false;
        this.canRevert = false;
        this.isAuto = false;

        this.resetDrawModes();
    }

    resetDrawModes(): void {
        this.isFreeDrawMode = false;
        this.isMoveMode = false;
    }

    setFreeDrawMode(isAuto: boolean = false): void {
        if (isAuto) {
            this.isActivated = true;
        }
        if (this.isActivated) {
            this.resetDrawModes();
            this.isFreeDrawMode = true;
            if (isAuto) {
                this.isAuto = true;
            }
        }
    }

    setMoveMode(): void {
        if (this.isActivated) {
            this.resetDrawModes();
            this.isMoveMode = true;
        }
    }

    forceCanUseFreeDraw(): void {
        this.canUsePolyDraw = true;
    }
}

/**
 * Interface for latitude and longitude.
 */
export interface ILatLng {
    lat: number, 
    lng: number;
}
