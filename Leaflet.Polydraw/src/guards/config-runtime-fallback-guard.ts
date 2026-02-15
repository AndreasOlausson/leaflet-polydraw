import { defaultConfig } from '../config';
import { MarkerPosition } from '../enums';
import type { PolydrawConfig } from '../types/polydraw-interfaces';

const VALID_COMPASS_MARKER_POSITIONS = new Set<number>([
  MarkerPosition.SouthWest,
  MarkerPosition.South,
  MarkerPosition.SouthEast,
  MarkerPosition.East,
  MarkerPosition.NorthEast,
  MarkerPosition.North,
  MarkerPosition.NorthWest,
  MarkerPosition.West,
]);

function normalizeCompassMarkerPosition(
  value: unknown,
  fallback: MarkerPosition,
  path: string,
): MarkerPosition {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (VALID_COMPASS_MARKER_POSITIONS.has(value)) {
      return value as MarkerPosition;
    }
  }

  console.warn(
    `[Leaflet.Polydraw] Invalid \`${path}\` value "${String(value)}". Using "${MarkerPosition[fallback]}" (${fallback}) as fallback.`,
  );
  return fallback;
}

export function applyRuntimeConfigFallbacks(config: PolydrawConfig): void {
  config.markers.markerInfoIcon.position = normalizeCompassMarkerPosition(
    config.markers.markerInfoIcon.position,
    defaultConfig.markers.markerInfoIcon.position,
    'markers.markerInfoIcon.position',
  );
  config.markers.markerMenuIcon.position = normalizeCompassMarkerPosition(
    config.markers.markerMenuIcon.position,
    defaultConfig.markers.markerMenuIcon.position,
    'markers.markerMenuIcon.position',
  );
  config.markers.markerDeleteIcon.position = normalizeCompassMarkerPosition(
    config.markers.markerDeleteIcon.position,
    defaultConfig.markers.markerDeleteIcon.position,
    'markers.markerDeleteIcon.position',
  );
}
