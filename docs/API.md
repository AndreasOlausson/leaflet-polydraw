# API Reference

For most use cases, simply add the plugin and use the built-in buttons. However, these methods are available for programmatic control:

## Essential Methods

git sta### `addPredefinedPolygon(geographicBorders: unknown[][][], options?: PredefinedPolygonOptions)`

Add polygons programmatically with smart coordinate auto-detection (useful for loading saved data).

```typescript
// Supports multiple coordinate formats automatically
const polygon = [
  [
    [
      { lat: 59.903, lng: 10.724 }, // Object format
      [59.908, 10.728], // Array format
      "59.91,10.72", // String format
      "59°54'N 10°43'E", // DMS format
      { latitude: 59.903, longitude: 10.724 }, // Alternative object format
    ],
  ],
];
await polydraw.addPredefinedPolygon(polygon);
```

**Supported Coordinate Formats:**

- Objects: `{lat, lng}`, `{latitude, longitude}`, `{longitude, latitude}`
- Arrays: `[lat, lng]`, `[lng, lat]` (with smart detection)
- Strings: `"lat,lng"`, `"59°54'N 10°43'E"` (DMS), `"N59 E10"` (N/E format)

### `addPredefinedGeoJSONs(geojsonFeatures: GeoJSON.Feature<Polygon | MultiPolygon>[], options?: PredefinedPolygonOptions)`

Add polygons from GeoJSON format (useful for loading data from APIs, files, or GIS systems).

```typescript
// Single Polygon
const polygonFeature = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [10.724, 59.903],
        [10.728, 59.908],
        [10.72, 59.91],
        [10.724, 59.903],
      ],
    ],
  },
  properties: {},
};

await polydraw.addPredefinedGeoJSONs([polygonFeature]);

// MultiPolygon (all polygons are added, not just the first)
const multiPolygonFeature = {
  type: "Feature",
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      // First polygon
      [
        [
          [10.72, 59.9],
          [10.73, 59.9],
          [10.73, 59.91],
          [10.72, 59.91],
          [10.72, 59.9],
        ],
      ],
      // Second polygon
      [
        [
          [10.75, 59.92],
          [10.76, 59.92],
          [10.76, 59.93],
          [10.75, 59.93],
          [10.75, 59.92],
        ],
      ],
    ],
  },
  properties: {},
};

await polydraw.addPredefinedGeoJSONs([multiPolygonFeature]);

// With visual optimization
await polydraw.addPredefinedGeoJSONs([polygonFeature], {
  visualOptimizationLevel: 2,
});
```

### `addPredefinedPolygonGroups(groups: PolygonGroupInput[])`

Add multiple polygon groups where each group declares a layer and one or more polygons.

```typescript
await polydraw.addPredefinedPolygonGroups([
  {
    layer: {
      id: "Hazard",
      color: "#d32f2f",
      interaction: "readonly",
      panel: "visible",
    },
    polygons: [hazardPolygonA, hazardPolygonB],
    options: {
      visualOptimizationLevel: 4,
      metadata: { source: "import-batch-7" },
    },
  },
]);
```

### Visual Optimization

[![Visual Optimization](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/gifs/vo.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/mp4/vo.mp4)

Visual optimization reduces elbow marker density on complex polygons while preserving shape. Set `visualOptimizationLevel` when adding polygons (predefined or GeoJSON), and use the Visual Optimization toggle in the polygon menu tools to show or hide the pruned markers.

**Supported GeoJSON Types:**

- `Feature<Polygon>`: Single polygon with optional holes
- `Feature<MultiPolygon>`: Multiple polygons (all polygons are processed)
- Automatically converts GeoJSON `[lng, lat]` to Leaflet `[lat, lng]` format
- Preserves polygon holes (inner rings)

## Option Contracts (v2)

This section is the runtime contract for import/layer option objects.

### `PredefinedPolygonOptions`

| Property | Type | Behavior |
| --- | --- | --- |
| `visualOptimizationLevel` | `number` | Optimization level stored on created polygons. Default: `0`. |
| `layer` | `string | PolygonLayerDescriptorInput` | Selects (or creates) target layer. String is treated as layer id. Descriptor can create/update layer fields (`label`, `color`, `visibility`, `interaction`, `panel`, `metadata`) before polygon add. Empty/blank id throws. |
| `layerColor` | `string` | Color precedence: if `layer` is provided, this overrides descriptor color and updates that layer color; if `layer` is omitted, it only colors polygons being added (no layer creation/update). Invalid hex values fall back to layer/default color normalization. |
| `metadata` | `Record<string, unknown>` | Feature metadata payload for each added polygon feature group (stored as a shallow clone). |
| `overrides` | `{ interaction?: 'inherit' \| 'editable' \| 'readonly' \| 'static'; merge?: 'inherit' \| 'allow' \| 'block'; style?: { color?; fillColor?; fillOpacity?; weight? } }` | Runtime per-feature overrides for interaction, merge, and style; also forwarded through group imports. |

### `PolygonGroupInput`

| Property | Type | Behavior |
| --- | --- | --- |
| `layer` | `string | PolygonLayerDescriptorInput` | Required. Resolved once per group, layer ensured first, then all polygons in group are added to that layer. |
| `polygons` | `unknown[][][][]` | Required. Each item is passed to `addPredefinedPolygon`. |
| `options` | `Omit<PredefinedPolygonOptions, 'layer' \| 'layerColor'>` | Optional per-group options forwarded to each polygon add in the group. |

### `PolygonLayerDescriptorInput`

| Property | Type | Behavior |
| --- | --- | --- |
| `id` | `string` | Required non-empty layer id (trimmed). |
| `label` | `string` | Optional display label in panel. Empty/whitespace is normalized to unset. |
| `color` | `string` | Layer stroke color. Applied to existing layer polygons when changed. Hex normalization supports `#rgb` / `#rrggbb` forms. |
| `visibility` | `boolean` | Layer visibility policy (`true` by default for new layers). |
| `interaction` | `'editable' \| 'readonly' \| 'static'` | `editable`: full edit interactions. `readonly`: visible/selectable but no edit handles/drag. `static`: non-editable and defaults panel to hidden unless `panel` is explicitly set. |
| `panel` | `'visible' \| 'hidden'` | Controls layer panel visibility for this layer. |
| `metadata` | `Record<string, unknown>` | Replaces layer metadata object (shallow clone). |

### `LayerUpdateInput`

| Property | Type | Behavior |
| --- | --- | --- |
| `label` | `string` | Updates/clears label (`""` or whitespace clears). |
| `color` | `string` | Updates layer color and restyles polygons in that layer. |
| `visibility` | `boolean` | Shows/hides layer. Active layer cannot be hidden if no visible fallback layer exists. |
| `interaction` | `'editable' \| 'readonly' \| 'static'` | Updates interaction policy. If set to `static` and `panel` omitted, panel is auto-set to `hidden`. |
| `panel` | `'visible' \| 'hidden'` | Explicit panel policy override. |
| `metadata` | `Record<string, unknown>` | Replaces layer metadata object. |

### Precedence and Defaults

- If both `layer.color` and top-level `layerColor` are set in `addPredefinedPolygon`, `layerColor` wins.
- For `addPredefinedGeoJSONs`, metadata precedence is: `options.metadata` first, otherwise GeoJSON `feature.properties`.
- Adding to non-editable target layers (`readonly` or `static`) disables merge-on-add by default (`merge: inherit`).
- `overrides.merge: block` always disables merge-on-add for the incoming polygon.
- `overrides.merge: allow` forces merge attempts for the incoming polygon, including against non-editable polygons in the target layer.
- `overrides.interaction` applies per-feature editability, independent of the layer interaction policy.
- `overrides.style` is persisted per feature and reapplied across history restore operations.
- `static` without explicit `panel` is normalized to `panel: 'hidden'`.

### `getAllPolygons()`

Get all polygons for data export.

```typescript
const polygons = polydraw.getAllPolygons();
// Use for saving, exporting, or processing polygon data
```

## Advanced Methods (Optional)

### `setDrawMode(mode: DrawMode)` & `getDrawMode()`

Programmatically control drawing modes (the buttons do this automatically).

```typescript
import { DrawMode } from "leaflet-polydraw";
polydraw.setDrawMode(DrawMode.Add); // Same as clicking the draw button
```

### `configurate(config: any)`

Update configuration after initialization.

```typescript
polydraw.configurate({
  styles: {
    polygon: { color: "#ff0000" },
  },
});
```

## Layer and Metadata Examples (v2)

### Add predefined polygon with metadata

```typescript
await polydraw.addPredefinedPolygon(geoborders, {
  metadata: {
    risk: "high",
    source: "survey-2026",
    confidence: 0.92,
  },
});
```

### Add GeoJSON and use properties as metadata fallback

```typescript
await polydraw.addPredefinedGeoJSONs([
  {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [15.597, 58.397],
          [15.603, 58.397],
          [15.603, 58.403],
          [15.597, 58.403],
          [15.597, 58.397],
        ],
      ],
    },
    properties: {
      risk: "medium",
      source: "imported-geojson",
    },
  },
]);
```

### Read and update feature metadata

```typescript
const featureGroup = polydraw.getFeatureGroups()[0];

const current = polydraw.getFeatureMetadata(featureGroup);
// -> { risk: "high", source: "survey-2026", confidence: 0.92 }

polydraw.patchFeatureMetadata(featureGroup, {
  reviewedBy: "analyst-a",
  confidence: 0.95,
});

polydraw.setFeatureMetadata(featureGroup, {
  risk: "low",
  source: "manual-review",
});
```

### Create and update layer policy

```typescript
polydraw.createLayer({
  id: "Hazard",
  label: "Hazard Zones",
  color: "#d32f2f",
  interaction: "readonly",
  panel: "visible",
  metadata: { owner: "gis-team" },
});

polydraw.updateLayer("Hazard", {
  interaction: "static",
  panel: "hidden",
  visibility: true,
});
```
