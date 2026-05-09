import 'leaflet/dist/leaflet.css';
import 'leaflet-polydraw/leaflet-polydraw.css';
import * as L from 'leaflet';
import Polydraw, { leafletAdapter } from 'leaflet-polydraw';
import type { Feature, Polygon } from 'geojson';
import {
  defaultViewport,
  metadataGeoJson,
  mergeLeftZone,
  mergeRightZone,
  operatorZone,
  overrideZone,
  readonlyZone,
  showcaseScenarios,
  staticContextZone,
  toGeoborders,
  type MapScenarioId
} from '@polydraw-demo/shared-content';
import {
  closeFeatureInspectionDialog,
  type FeatureInspectionDialogEntry,
  type FeatureInspectionListEntry,
  mountSharedStyles,
  renderFeatureInspectionList,
  renderMapDemoPage,
  showFeatureInspectionDialog
} from '@polydraw-demo/shared-ui';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Missing app root');
}

mountSharedStyles('#8a4d24');
const isDevelopment = import.meta.env.DEV;
const isLocalSource = import.meta.env.MODE === 'workspace';
document.title = `Polydraw Demo • Leaflet 2 • ${isLocalSource ? 'Local' : 'Public'}`;

const homeHref = import.meta.env.DEV ? 'http://localhost:4173/' : '/';
const getSubtitle = () => {
  if (!isDevelopment) {
    return 'Evaluation route for teams exploring the Leaflet 2 path.';
  }

  return isLocalSource
    ? 'Development preview wired to the local plugin source.'
    : 'Development preview against the published package.';
};

app.innerHTML = renderMapDemoPage({
  runtimeLabel: `Leaflet ${L.version}`,
  sourceLabel: isLocalSource ? 'Workspace source' : undefined,
  subtitle: getSubtitle(),
  homeHref,
  homeLabel: 'Back to compatibility hub',
  scenarios: showcaseScenarios
});

const map = leafletAdapter.createMap('demo-map').setView(defaultViewport.center as [number, number], defaultViewport.zoom);
leafletAdapter
  .createTileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  })
  .addTo(map);

type PolygonMenuActionContext = {
  bounds: L.LatLngBounds;
};

const demoMenuActions = [
  {
    id: 'makeTriangle',
    label: 'Injected custom',
    className: ['menu-action-custom', 'make-triangle'],
    apply: ({ bounds }: PolygonMenuActionContext): Feature<Polygon> => {
      const nw = bounds.getNorthWest();
      const ne = bounds.getNorthEast();
      const south = bounds.getSouth();
      const centerLng = (bounds.getWest() + bounds.getEast()) / 2;

      return {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [nw.lng, nw.lat],
              [ne.lng, ne.lat],
              [centerLng, south],
              [nw.lng, nw.lat],
            ],
          ],
        },
      };
    },
  },
];

type PolydrawConfigInput = NonNullable<ConstructorParameters<typeof Polydraw>[0]>['config'];

const polydrawConfig = {
  interaction: {
    drag: {
      markerBehavior: 'fade',
    },
  },
  markers: {
    markerIcon: {
      styleClasses: ['polygon-marker', 'demo-edit-handle'],
    },
    holeIcon: {
      styleClasses: ['polygon-marker', 'hole', 'demo-edit-handle'],
    },
  },
  polygonTools: {
    menuActions: demoMenuActions,
  },
};

const polydraw = new Polydraw({
  config: polydrawConfig as unknown as PolydrawConfigInput,
});
polydraw.addTo(map as any);

const featureCountEl = document.querySelector<HTMLElement>('[data-state="feature-count"]');
const layerCountEl = document.querySelector<HTMLElement>('[data-state="layer-count"]');
const activeLayerEl = document.querySelector<HTMLElement>('[data-state="active-layer"]');
const scenarioTitleEl = document.querySelector<HTMLElement>('[data-state="scenario-title"]');
const scenarioSummaryEl = document.querySelector<HTMLElement>('[data-state="scenario-summary"]');
const scenarioLabelEl = document.querySelector<HTMLElement>('[data-state="scenario-label"]');
const scenarioDrawerEl = document.querySelector<HTMLDetailsElement>('.demo-route-scenario-drawer');
const featureDrawerEl = document.querySelector<HTMLDetailsElement>('.demo-feature-drawer');
const featureListEl = document.querySelector<HTMLElement>('[data-state="feature-list"]');

type InspectableFeature = {
  featureGroup: L.FeatureGroup;
  featureIndex: number;
  polygon: L.Polygon;
};

let inspectableFeatures = new Map<string, InspectableFeature>();
let featureInspectionEntries: FeatureInspectionListEntry[] = [];
let featureDialogEntries: FeatureInspectionDialogEntry[] = [];
let selectedFeatureId: string | undefined;

const roundNumber = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

const getLayerDisplayName = (layerId: string) => {
  const layer = polydraw.getAllLayers().find((entry) => entry.id === layerId);
  const label = layer?.label?.trim();
  return label && label.length > 0 ? label : layerId;
};

const normalizeRings = (value: unknown): L.LatLng[][] => {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  if (value[0] instanceof L.LatLng) {
    return [value as L.LatLng[]];
  }

  if (Array.isArray(value[0]) && value[0].length > 0 && value[0][0] instanceof L.LatLng) {
    return value as L.LatLng[][];
  }

  if (Array.isArray(value[0]) && Array.isArray(value[0][0])) {
    return normalizeRings(value[0]);
  }

  return [];
};

const countVertices = (ring: L.LatLng[]) => {
  if (!Array.isArray(ring) || ring.length === 0) {
    return 0;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed = first.equals(last, 1e-9);
  return Math.max(ring.length - (isClosed ? 1 : 0), 0);
};

const toRoundedTree = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => toRoundedTree(entry));
  }

  if (typeof value === 'number') {
    return roundNumber(value);
  }

  if (
    value &&
    typeof value === 'object' &&
    'lat' in value &&
    'lng' in value &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number'
  ) {
    return [roundNumber(value.lat), roundNumber(value.lng)];
  }

  return value;
};

const pulsePolygon = (polygon: L.Polygon) => {
  const baseWeight = typeof polygon.options.weight === 'number' ? polygon.options.weight : 3;
  polygon.setStyle({ weight: baseWeight + 2 });
  globalThis.setTimeout(() => {
    if (map.hasLayer(polygon)) {
      polygon.setStyle({ weight: baseWeight });
    }
  }, 900);
};

const openFeatureInspection = (featureId?: string) => {
  const nextSelectedId = featureId && inspectableFeatures.has(featureId) ? featureId : selectedFeatureId;
  if (!nextSelectedId || featureDialogEntries.length === 0) {
    return;
  }

  selectedFeatureId = nextSelectedId;
  const selectedFeature = inspectableFeatures.get(nextSelectedId);
  if (selectedFeature) {
    pulsePolygon(selectedFeature.polygon);
  }

  showFeatureInspectionDialog({
    entries: featureDialogEntries,
    selectedFeatureId: nextSelectedId,
  });
};

const syncFeatureList = () => {
  if (!featureListEl) {
    return;
  }

  const nextFeatures = new Map<string, InspectableFeature>();
  const nextDialogEntries: FeatureInspectionDialogEntry[] = [];
  const entries = polydraw.getFeatureGroups().flatMap((featureGroup, featureIndex) => {
    const polygon = featureGroup.getLayers().find((layer): layer is L.Polygon => layer instanceof L.Polygon);
    if (!polygon) {
      return [];
    }

    const featureId = String(featureIndex);
    const layerId = polydraw.getLayerManager().getLayerForFeatureGroup(featureGroup) || 'default';
    const layerName = getLayerDisplayName(layerId);
    const rings = normalizeRings(polygon.getLatLngs());
    const outerVertices = countVertices(rings[0] ?? []);
    const holeCount = Math.max(rings.length - 1, 0);
    const holeSuffix = holeCount === 1 ? '' : 's';
    const summary =
      holeCount > 0
        ? `Polygon with ${outerVertices} outer vertices and ${holeCount} hole${holeSuffix}.`
        : `Polygon with ${outerVertices} outer vertices.`;

    nextFeatures.set(featureId, {
      featureGroup,
      featureIndex,
      polygon
    });

    const geometry = polygon.toGeoJSON() as {
      geometry?: {
        type?: string;
        coordinates?: unknown;
      };
    };

    nextDialogEntries.push({
      id: featureId,
      label: `${layerName} • Feature ${featureIndex + 1}`,
      title: `Feature ${featureIndex + 1}`,
      layerId: layerName,
      geometryType: geometry.geometry?.type || 'Polygon',
      latLngs: toRoundedTree(polygon.getLatLngs()),
      geoJsonCoordinates: toRoundedTree(geometry.geometry?.coordinates ?? []),
      metadata: polydraw.getFeatureMetadata(featureGroup),
    });

    return [{
      id: featureId,
      title: layerName,
      summary,
      actionLabel: 'Open inspector'
    }];
  });

  inspectableFeatures = nextFeatures;
  featureInspectionEntries = entries;
  featureDialogEntries = nextDialogEntries;

  if (!selectedFeatureId || !nextFeatures.has(selectedFeatureId)) {
    selectedFeatureId = entries[0]?.id;
  }

  featureListEl.innerHTML = renderFeatureInspectionList(featureInspectionEntries);
};

featureListEl?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest<HTMLButtonElement>('[data-action="open-feature-dialog"]');
  if (!button) {
    return;
  }

  featureDrawerEl?.removeAttribute('open');
  openFeatureInspection(selectedFeatureId);
});

document.addEventListener('polydraw:feature-dialog-select', (event) => {
  const customEvent = event as CustomEvent<{ featureId?: string }>;
  const featureId = customEvent.detail?.featureId;
  if (!featureId) {
    return;
  }

  selectedFeatureId = featureId;
  const feature = inspectableFeatures.get(featureId);
  if (feature) {
    pulsePolygon(feature.polygon);
  }
});

const syncStatus = () => {
  if (featureCountEl) featureCountEl.textContent = String(polydraw.getFeatureGroups().length);
  if (layerCountEl) layerCountEl.textContent = String(polydraw.getAllLayers().length);
  if (activeLayerEl) {
    const activeLayerId = polydraw.getLayerManager().getActiveLayerId();
    activeLayerEl.textContent = getLayerDisplayName(activeLayerId);
  }
  syncFeatureList();
};

const scheduleMapSync = () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      map.invalidateSize();
      syncStatus();
    });
  });
};

const setScenarioCopy = (scenarioId?: MapScenarioId) => {
  const scenario = showcaseScenarios.find((entry) => entry.id === scenarioId);
  if (!scenario) {
    if (scenarioTitleEl) scenarioTitleEl.textContent = 'Waiting for scenario';
    if (scenarioLabelEl) scenarioLabelEl.textContent = 'Load scenario';
    if (scenarioSummaryEl) {
      scenarioSummaryEl.textContent =
        'Choose a scenario to load a curated Polydraw workflow against the Leaflet 2 runtime.';
    }
    return;
  }
  if (scenarioTitleEl) scenarioTitleEl.textContent = scenario.title;
  if (scenarioLabelEl) scenarioLabelEl.textContent = scenario.title;
  if (scenarioSummaryEl) scenarioSummaryEl.textContent = scenario.summary;
};

const resetMap = () => {
  closeFeatureInspectionDialog();
  featureDrawerEl?.removeAttribute('open');
  selectedFeatureId = undefined;
  polydraw.removeAllFeatureGroups();
  map.setView(defaultViewport.center as [number, number], defaultViewport.zoom);
  setScenarioCopy();
  syncStatus();
  scheduleMapSync();
};

const withBatch = async (callback: () => Promise<void>) => {
  polydraw.beginBatch();
  try {
    await callback();
  } finally {
    polydraw.endBatch();
  }
};

const loadScenario = async (scenarioId: MapScenarioId) => {
  resetMap();
  switch (scenarioId) {
    case 'layer-policies':
      await polydraw.addPredefinedPolygonGroups([
        {
          layer: {
            id: 'Operator Zone',
            label: 'Operator Zone',
            color: '#cf6a45',
            interaction: 'editable',
            panel: 'visible',
            metadata: { owner: 'operations' }
          },
          polygons: [toGeoborders(operatorZone)],
          options: {
            metadata: { source: 'ops-seed' },
            overrides: {
              style: {
                fillColor: '#f2c4b2',
                fillOpacity: 0.42,
                weight: 3,
              },
            },
          }
        },
        {
          layer: {
            id: 'Inspection Overlay',
            label: 'Inspection Overlay',
            color: '#2f7e79',
            interaction: 'readonly',
            panel: 'visible'
          },
          polygons: [toGeoborders(readonlyZone)],
          options: {
            metadata: { source: 'inspection-round-14' },
            overrides: {
              style: {
                fillColor: '#c4e4e0',
                fillOpacity: 0.18,
                weight: 2,
              },
            },
          }
        },
        {
          layer: {
            id: 'Context',
            label: 'Context',
            color: '#7a6d3b',
            interaction: 'static',
            panel: 'visible',
          },
          polygons: [toGeoborders(staticContextZone)],
          options: {
            metadata: { source: 'planning-context' },
            overrides: {
              style: {
                fillColor: '#dfd7b6',
                fillOpacity: 0.1,
                weight: 2,
              },
            },
          }
        }
      ]);
      polydraw.setActiveLayer('Operator Zone');
      break;
    case 'same-layer-merge':
      await withBatch(async () => {
        await polydraw.addPredefinedPolygon(toGeoborders(mergeLeftZone), {
          layer: {
            id: 'Merge Zone',
            label: 'Merge Zone',
            color: '#c55f3d',
            interaction: 'editable'
          }
        });
        await polydraw.addPredefinedPolygon(toGeoborders(mergeRightZone), {
          layer: 'Merge Zone'
        });
      });
      break;
    case 'cross-layer-isolation':
      await withBatch(async () => {
        await polydraw.addPredefinedPolygon(toGeoborders(mergeLeftZone), {
          layer: {
            id: 'Layer Alpha',
            label: 'Layer Alpha',
            color: '#8a4d24',
            interaction: 'editable'
          }
        });
        await polydraw.addPredefinedPolygon(toGeoborders(mergeRightZone), {
          layer: {
            id: 'Layer Beta',
            label: 'Layer Beta',
            color: '#9c5a2a',
            interaction: 'editable'
          }
        });
      });
      break;
    case 'metadata-import':
      await polydraw.addPredefinedGeoJSONs(metadataGeoJson, {
        layer: {
          id: 'Imported Survey',
          label: 'Imported Survey',
          color: '#486f91',
          interaction: 'readonly',
          panel: 'visible'
        }
      });
      break;
    case 'feature-overrides':
      await withBatch(async () => {
        await polydraw.addPredefinedPolygon(toGeoborders(operatorZone), {
          layer: {
            id: 'Dispatch Layer',
            label: 'Dispatch Layer',
            color: '#1f6a55',
            interaction: 'editable'
          },
          metadata: { source: 'dispatch-default' }
        });
        await polydraw.addPredefinedPolygon(toGeoborders(overrideZone), {
          layer: 'Dispatch Layer',
          metadata: { source: 'manual-override', priority: 'high' },
          overrides: {
            interaction: 'readonly',
            merge: 'block',
            style: {
              color: '#aa4d2f',
              fillColor: '#f0cfb0',
              fillOpacity: 0.42,
              weight: 4
            }
          }
        });
      });
      break;
  }
  setScenarioCopy(scenarioId);
  syncStatus();
  scheduleMapSync();
};

for (const eventName of [
  'polygonAdded',
  'polygonDeleted',
  'polygonOperationComplete',
  'polydraw:history:undo',
  'polydraw:history:redo',
  'polydraw:layer:activated',
  'polydraw:layer:visibility'
] as const) {
  polydraw.on(eventName as any, syncStatus as any);
}

if (typeof ResizeObserver !== 'undefined') {
  const resizeObserver = new ResizeObserver(() => {
    scheduleMapSync();
  });
  resizeObserver.observe(map.getContainer());
  globalThis.addEventListener(
    'beforeunload',
    () => {
      resizeObserver.disconnect();
    },
    { once: true }
  );
}

globalThis.addEventListener('resize', scheduleMapSync);
map.whenReady(() => {
  scheduleMapSync();
});

document.querySelector('[data-action="reset"]')?.addEventListener('click', resetMap);

document.querySelectorAll<HTMLButtonElement>('[data-scenario-id]').forEach((button) => {
  button.addEventListener('click', () => {
    const scenarioId = button.dataset.scenarioId as MapScenarioId | undefined;
    if (!scenarioId) return;
    scenarioDrawerEl?.removeAttribute('open');
    void loadScenario(scenarioId);
  });
});

setScenarioCopy();
syncStatus();
scheduleMapSync();
