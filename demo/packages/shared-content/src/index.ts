export type DemoRouteId = 'leaflet-v1' | 'leaflet-v2';
export type Coordinate = [number, number];
export type PolygonRings = Coordinate[][];
export type MapScenarioId =
  | 'editable-work-layers'
  | 'color-opacity-grid'
  | 'layer-policies'
  | 'same-layer-merge'
  | 'cross-layer-isolation'
  | 'metadata-import'
  | 'feature-overrides'
  | 'stangan-flood-risk';

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
    id: 'stangan-flood-risk',
    title: 'Stangan Flood Risk',
    summary: 'Real-world flood extents for a river corridor, loaded as risk-coded GeoJSON layers.',
    bullets: [
      'Imports simplified but realistic multipolygon data',
      'Uses separate worst-case, 200-year, and 100-year layers',
      'Shows how Polydraw behaves with real GIS boundaries'
    ]
  },
  {
    id: 'editable-work-layers',
    title: 'Editable Work Layers',
    summary: 'Separated editable work areas use distinct layer colors with protected reference geometry beside them.',
    bullets: [
      'Blue field work starts as two separated editable polygons',
      'Amber reference boundaries stay readonly',
      'Violet review areas show a second editable work stream'
    ]
  },
  {
    id: 'color-opacity-grid',
    title: 'Color Opacity Grid',
    summary: 'Rainbow color columns compare fill opacity from 0% through 100%.',
    bullets: [
      'Uses ROYGBIV color columns',
      'Shows opacity in 10% steps',
      'Keeps every swatch as protected readonly geometry'
    ]
  },
  {
    id: 'layer-policies',
    title: 'Layer Roles',
    summary: 'Readonly operation and inspection layers sit over a faint green static context boundary.',
    bullets: [
      'Operations geometry stays inspectable',
      'Inspection data remains protected',
      'Static context frames the work area underneath'
    ]
  },
  {
    id: 'same-layer-merge',
    title: 'Parcel Archive',
    summary: 'Two imported parcels share one protected layer with consistent archive styling.',
    bullets: [
      'Shows multiple polygons in one readonly layer',
      'Keeps imported features locked',
      'Good baseline for browsing parcel data'
    ]
  },
  {
    id: 'cross-layer-isolation',
    title: 'Overlapping Layers',
    summary: 'Translucent blue and yellow overlays stay independent while their overlap visibly blends.',
    bullets: [
      'Blue and yellow layers overlap without merging',
      'Layer ownership stays visible',
      'Useful for competing overlays or visual blend checks'
    ]
  },
  {
    id: 'metadata-import',
    title: 'GeoJSON Metadata',
    summary: 'Survey SVY-2048 loads from GeoJSON with its source properties preserved as Polydraw metadata.',
    bullets: [
      'Demonstrates API-driven GeoJSON loading',
      'Preserves properties such as risk, confidence, and surveyId',
      'Keeps imported GIS data readonly'
    ]
  },
  {
    id: 'feature-overrides',
    title: 'Feature Overrides',
    summary: 'One feature in a normal layer carries its own styling and locked behavior.',
    bullets: [
      'Default dispatch geometry uses layer styling',
      'Priority geometry overrides style and merge behavior',
      'Feature-level settings survive history restore'
    ]
  }
];

export const defaultViewport = {
  center: [58.402514, 15.606188] as Coordinate,
  zoom: 13
};

export const rainbowOpacityViewport = {
  center: [58.4022, 15.606] as Coordinate,
  zoom: 13
};

export const rainbowOpacityColors = [
  { key: 'red', label: 'Red', color: '#ef4444' },
  { key: 'orange', label: 'Orange', color: '#f97316' },
  { key: 'yellow', label: 'Yellow', color: '#eab308' },
  { key: 'green', label: 'Green', color: '#22c55e' },
  { key: 'blue', label: 'Blue', color: '#3b82f6' },
  { key: 'indigo', label: 'Indigo', color: '#4f46e5' },
  { key: 'violet', label: 'Violet', color: '#8b5cf6' },
] as const;

export const rainbowOpacitySteps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] as const;

const createBbox = (
  north: number,
  west: number,
  south: number,
  east: number,
): PolygonRings => [[
  [north, west],
  [north, east],
  [south, east],
  [south, west],
  [north, west],
]];

export const rainbowOpacityGridCells = rainbowOpacityColors.flatMap((colorEntry, colorIndex) =>
  rainbowOpacitySteps.map((fillOpacity, opacityIndex) => {
    const north = 58.417 - opacityIndex * 0.0027;
    const south = north - 0.0022;
    const west = 15.579 + colorIndex * 0.0078;
    const east = west + 0.0068;
    const percent = Math.round(fillOpacity * 100);

    return {
      id: `${colorEntry.key}-${percent}`,
      layerId: colorEntry.label,
      label: `${colorEntry.label} ${percent}%`,
      color: colorEntry.color,
      fillColor: colorEntry.color,
      fillOpacity,
      polygon: createBbox(north, west, south, east),
    };
  }),
);

export const operatorZone: PolygonRings = [[
  [58.4112, 15.5917],
  [58.4141, 15.5991],
  [58.4116, 15.6075],
  [58.4052, 15.6102],
  [58.4004, 15.6049],
  [58.4011, 15.5961],
  [58.4056, 15.5902],
  [58.4112, 15.5917]
]];

export const readonlyZone: PolygonRings = [[
  [58.4097, 15.6035],
  [58.4124, 15.6124],
  [58.4076, 15.6197],
  [58.4005, 15.6171],
  [58.3979, 15.6086],
  [58.4021, 15.6018],
  [58.4097, 15.6035]
]];

export const staticContextZone: PolygonRings = [[
  [58.4166, 15.5852],
  [58.4184, 15.6008],
  [58.4148, 15.6229],
  [58.4051, 15.6264],
  [58.3958, 15.6186],
  [58.3939, 15.5974],
  [58.4014, 15.5837],
  [58.4166, 15.5852]
]];

export const mergeLeftZone: PolygonRings = [[
  [58.4104, 15.5928],
  [58.4136, 15.5992],
  [58.4112, 15.6079],
  [58.4053, 15.6106],
  [58.4017, 15.6044],
  [58.4037, 15.5961],
  [58.4104, 15.5928]
]];

export const mergeRightZone: PolygonRings = [[
  [58.4082, 15.6011],
  [58.4134, 15.6061],
  [58.4111, 15.6157],
  [58.4039, 15.6174],
  [58.3998, 15.6105],
  [58.4027, 15.6027],
  [58.4082, 15.6011]
]];

export const overrideZone: PolygonRings = [[
  [58.3986, 15.5997],
  [58.4038, 15.6067],
  [58.4019, 15.6158],
  [58.3957, 15.6184],
  [58.3908, 15.6114],
  [58.3927, 15.6018],
  [58.3986, 15.5997]
]];

export const metadataGeoJson: GeoJSON.Feature<GeoJSON.Polygon>[] = [
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [15.5898, 58.3974],
        [15.5967, 58.3948],
        [15.6041, 58.3972],
        [15.6062, 58.4035],
        [15.6018, 58.4084],
        [15.5937, 58.4072],
        [15.5889, 58.4021],
        [15.5898, 58.3974]
      ]]
    },
    properties: {
      source: 'municipal-import',
      risk: 'medium',
      confidence: 0.91,
      surveyId: 'SVY-2048'
    }
  }
];

export const editableLayerOneNorth: PolygonRings = [[
  [58.4138, 15.5839],
  [58.4174, 15.5915],
  [58.4158, 15.6002],
  [58.4093, 15.6018],
  [58.4059, 15.5954],
  [58.4075, 15.5866],
  [58.4138, 15.5839]
]];

export const editableLayerOneSouth: PolygonRings = [[
  [58.3962, 15.5877],
  [58.4008, 15.5949],
  [58.3985, 15.6042],
  [58.3917, 15.6055],
  [58.3879, 15.5971],
  [58.3908, 15.5896],
  [58.3962, 15.5877]
]];

export const readonlyReferenceNorth: PolygonRings = [[
  [58.4148, 15.6076],
  [58.4187, 15.6161],
  [58.4151, 15.6254],
  [58.4084, 15.6222],
  [58.4062, 15.6124],
  [58.4148, 15.6076]
]];

export const readonlyReferenceSouth: PolygonRings = [[
  [58.3992, 15.6115],
  [58.4035, 15.6196],
  [58.3995, 15.6284],
  [58.3924, 15.6259],
  [58.3905, 15.6162],
  [58.3992, 15.6115]
]];

export const editableLayerThreeWest: PolygonRings = [[
  [58.4064, 15.5702],
  [58.4108, 15.5758],
  [58.4091, 15.5826],
  [58.4028, 15.5832],
  [58.3999, 15.5769],
  [58.4025, 15.5711],
  [58.4064, 15.5702]
]];

export const editableLayerThreeEast: PolygonRings = [[
  [58.4068, 15.6317],
  [58.4115, 15.6384],
  [58.4089, 15.6465],
  [58.4021, 15.6452],
  [58.3996, 15.6366],
  [58.4068, 15.6317]
]];

export const toGeoborders = (rings: PolygonRings): unknown[][][] => [
  rings.map((ring) => ring.map(([lat, lng]) => ({ lat, lng })))
];

export {
  stanganFloodRiskGeoJson,
  stanganFloodRiskLayers,
  stanganFloodRiskViewport,
} from './demo-polygons/stangan-flood';
