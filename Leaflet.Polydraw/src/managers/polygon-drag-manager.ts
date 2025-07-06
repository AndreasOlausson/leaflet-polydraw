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
}
