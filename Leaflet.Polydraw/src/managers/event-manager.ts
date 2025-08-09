import { Feature, Polygon, MultiPolygon } from 'geojson';
import { DrawMode } from '../enums';
import { FeatureGroup, LatLngExpression } from 'leaflet';

export type PolydrawEventPayloads = {
  'polygon:add': { polygon: Feature<Polygon | MultiPolygon> };
  'polydraw:subtract': { subtractPolygon: Feature<Polygon | MultiPolygon> };
  drawCancelled: { mode?: DrawMode };
  polygonDeleted: undefined;
  polygonSubtracted: {
    subtractedPolygon: Feature<Polygon | MultiPolygon>;
    affectedFeatureGroups: FeatureGroup[];
    resultFeatureGroups: FeatureGroup[];
  };
  polygonOperationComplete: {
    operation: string;
    polygon: Feature<Polygon | MultiPolygon>;
    featureGroup?: FeatureGroup;
    resultFeatureGroups?: FeatureGroup[];
  };
  polygonAdded: {
    polygon: Feature<Polygon | MultiPolygon>;
    featureGroup: FeatureGroup;
  };
  polygonsUnioned: {
    originalPolygons: Feature<Polygon | MultiPolygon>[];
    resultPolygon: Feature<Polygon | MultiPolygon>;
    featureGroups?: FeatureGroup[];
  };
  'polygon:intersect': {
    polygon1: Feature<Polygon | MultiPolygon>;
    polygon2: Feature<Polygon | MultiPolygon>;
    callback: (intersects: boolean) => void;
  };
  'freehand:complete': { polygon: Feature<Polygon | MultiPolygon> };

  'polydraw:polygon:created': {
    polygon: Feature<Polygon | MultiPolygon>;
    isPointToPoint?: boolean;
    mode?: DrawMode;
  };
  'polydraw:polygon:updated': {
    polygon: Feature<Polygon | MultiPolygon>;
    operation?: string;
    allowMerge?: boolean;
    optimizationLevel?: number;
  };
  'polydraw:polygon:deleted': undefined;
  'polydraw:mode:change': { mode: DrawMode };
  'polydraw:draw:cancel': { mode?: DrawMode };
  'polydraw:menu:action': {
    action: string;
    latLngs?: LatLngExpression[];
    featureGroup?: FeatureGroup;
  };
  'polydraw:check:intersection': {
    polygon1: Feature<Polygon | MultiPolygon>;
    polygon2: Feature<Polygon | MultiPolygon>;
    callback: (intersects: boolean) => void;
  };
};

export type PolydrawEvent = keyof PolydrawEventPayloads;

export type PolydrawEventCallback<T extends PolydrawEvent = PolydrawEvent> = (
  data: PolydrawEventPayloads[T],
) => void;

export class EventManager {
  private eventListeners: Map<PolydrawEvent, PolydrawEventCallback[]> = new Map();

  /**
   * Register an event listener.
   * @param event - The event to listen for.
   * @param callback - The callback to execute when the event is emitted.
   */
  on<T extends PolydrawEvent>(event: T, callback: PolydrawEventCallback<T>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback as PolydrawEventCallback);
  }

  /**
   * Unregister an event listener.
   * @param event - The event to stop listening for.
   * @param callback - The specific callback to remove.
   */
  off<T extends PolydrawEvent>(event: T, callback: PolydrawEventCallback<T>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback as PolydrawEventCallback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event.
   * @param event - The event to emit.
   * @param data - The data to pass to the event listeners.
   */
  emit<T extends PolydrawEvent>(event: T, data: PolydrawEventPayloads[T]): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)?.forEach((callback) => {
        (callback as PolydrawEventCallback<T>)(data);
      });
    }
  }
}
