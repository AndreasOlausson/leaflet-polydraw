# API Reference

For most use cases, simply add the plugin and use the built-in buttons. However, these methods are available for programmatic control:

## Essential Methods

### `addPredefinedPolygon(geographicBorders: unknown[][][])`

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
polydraw.addPredefinedPolygon(polygon);
```

**Supported Coordinate Formats:**

- Objects: `{lat, lng}`, `{latitude, longitude}`, `{longitude, latitude}`
- Arrays: `[lat, lng]`, `[lng, lat]` (with smart detection)
- Strings: `"lat,lng"`, `"59°54'N 10°43'E"` (DMS), `"N59 E10"` (N/E format)

### `addPredefinedGeoJSONs(geojsonFeatures: GeoJSON.Feature<Polygon | MultiPolygon>[], options?)`

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

### Visual Optimization

[![Visual Optimization](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/gifs/vo.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/mp4/vo.mp4)

Visual optimization reduces elbow marker density on complex polygons while preserving shape. Set `visualOptimizationLevel` when adding polygons (predefined or GeoJSON), and use the Visual Optimization toggle in the polygon menu tools to show or hide the pruned markers.

**Supported GeoJSON Types:**

- `Feature<Polygon>`: Single polygon with optional holes
- `Feature<MultiPolygon>`: Multiple polygons (all polygons are processed)
- Automatically converts GeoJSON `[lng, lat]` to Leaflet `[lat, lng]` format
- Preserves polygon holes (inner rings)

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
  polygonOptions: { color: "#ff0000" },
});
```
