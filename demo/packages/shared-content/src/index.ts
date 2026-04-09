export type DemoRouteId = 'leaflet-v1' | 'leaflet-v2';
export type Coordinate = [number, number];
export type PolygonRings = Coordinate[][];
export type MapScenarioId =
  | 'layer-policies'
  | 'same-layer-merge'
  | 'cross-layer-isolation'
  | 'metadata-import'
  | 'feature-overrides';

export interface DemoTarget {
  id: DemoRouteId;
  title: string;
  badge: string;
  compatibility: string;
  summary: string;
  bullets: string[];
}

export interface MapScenario {
  id: MapScenarioId;
  title: string;
  summary: string;
  bullets: string[];
}

export const demoTargets: DemoTarget[] = [
  {
    id: 'leaflet-v1',
    title: 'Leaflet 1 Demo',
    badge: '1.9.x runtime',
    compatibility: 'For teams shipping the stable Leaflet 1 line.',
    summary: 'Shows the latest Polydraw package running against the classic Leaflet runtime.',
    bullets: [
      'Same scenario set as the v2 demo',
      'Focused on compatibility confidence',
      'Good fit for existing production maps'
    ]
  },
  {
    id: 'leaflet-v2',
    title: 'Leaflet 2 Demo',
    badge: '2.x runtime',
    compatibility: 'For teams already evaluating or adopting Leaflet 2.',
    summary: 'Shows the same public demo scenarios on the newer Leaflet runtime.',
    bullets: [
      'Same plugin package, different Leaflet runtime',
      'Matches the forward-looking compatibility target',
      'Best route for greenfield evaluation'
    ]
  }
];

export const showcaseScenarios: MapScenario[] = [
  {
    id: 'layer-policies',
    title: 'Layer Policies',
    summary: 'One load demonstrates editable, readonly, and static layers together.',
    bullets: [
      'Editable operator layer stays active for changes',
      'Readonly layer stays visible but non-mutable',
      'Static context layer stays informational only'
    ]
  },
  {
    id: 'same-layer-merge',
    title: 'Merge Within Layer',
    summary: 'Overlapping polygons in the same layer collapse into one feature group.',
    bullets: [
      'Highlights layer-scoped topology',
      'Uses the normal import flow',
      'Good sanity check for operational zoning'
    ]
  },
  {
    id: 'cross-layer-isolation',
    title: 'Cross-Layer Isolation',
    summary: 'Overlapping polygons in different layers remain separate.',
    bullets: [
      'Confirms cross-layer merge isolation',
      'Useful for hazard or overlay catalogs',
      'Shows parallel layers without side effects'
    ]
  },
  {
    id: 'metadata-import',
    title: 'Metadata Import',
    summary: 'GeoJSON properties hydrate feature metadata when explicit metadata is not supplied.',
    bullets: [
      'Demonstrates import-oriented API usage',
      'Shows readonly imported data',
      'Useful for GIS or API-driven loading'
    ]
  },
  {
    id: 'feature-overrides',
    title: 'Feature Overrides',
    summary: 'Per-feature overrides can block merge, lock interaction, and apply style deviations.',
    bullets: [
      'Uses the new override contract directly',
      'Interaction override wins at feature level',
      'Style override persists with history restore'
    ]
  }
];

export const defaultViewport = {
  center: [58.402514, 15.606188] as Coordinate,
  zoom: 13
};

export const operatorZone: PolygonRings = [[
  [58.4092, 15.5922],
  [58.4094, 15.6008],
  [58.4045, 15.6025],
  [58.4008, 15.5972],
  [58.4032, 15.5905],
  [58.4092, 15.5922]
]];

export const readonlyZone: PolygonRings = [[
  [58.4078, 15.6042],
  [58.4108, 15.6125],
  [58.4052, 15.6178],
  [58.4002, 15.6128],
  [58.4012, 15.6052],
  [58.4078, 15.6042]
]];

export const staticContextZone: PolygonRings = [[
  [58.3975, 15.5888],
  [58.4132, 15.5888],
  [58.4132, 15.6205],
  [58.3975, 15.6205],
  [58.3975, 15.5888]
]];

export const mergeLeftZone: PolygonRings = [[
  [58.4054, 15.5952],
  [58.4108, 15.5952],
  [58.4108, 15.6046],
  [58.4054, 15.6046],
  [58.4054, 15.5952]
]];

export const mergeRightZone: PolygonRings = [[
  [58.4036, 15.6001],
  [58.4092, 15.6001],
  [58.4092, 15.6098],
  [58.4036, 15.6098],
  [58.4036, 15.6001]
]];

export const overrideZone: PolygonRings = [[
  [58.3989, 15.6026],
  [58.4019, 15.6109],
  [58.3968, 15.6154],
  [58.3929, 15.6077],
  [58.3989, 15.6026]
]];

export const metadataGeoJson: GeoJSON.Feature<GeoJSON.Polygon>[] = [
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [15.5925, 58.3965],
        [15.6002, 58.3965],
        [15.6002, 58.4019],
        [15.5925, 58.4019],
        [15.5925, 58.3965]
      ]]
    },
    properties: {
      source: 'municipal-import',
      risk: 'medium',
      confidence: 0.91
    }
  }
];

export const toGeoborders = (rings: PolygonRings): unknown[][][] => [
  rings.map((ring) => ring.map(([lat, lng]) => ({ lat, lng })))
];
