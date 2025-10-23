# API Reference

For most use cases, simply add the plugin and use the built-in buttons. However, these methods are available for programmatic control:

## Essential Methods

### `addPredefinedPolygon(geographicBorders: unknown[][][])`

Add polygons programmatically with smart coordinate auto-detection (useful for loading saved data).

```javascript
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

### `getAllPolygons()`

Get all polygons for data export.

```javascript
const polygons = polydraw.getAllPolygons();
// Use for saving, exporting, or processing polygon data
```

## Advanced Methods (Optional)

### `setDrawMode(mode: DrawMode)` & `getDrawMode()`

Programmatically control drawing modes (the buttons do this automatically).

```javascript
import { DrawMode } from "leaflet-polydraw";
polydraw.setDrawMode(DrawMode.Add); // Same as clicking the draw button
```

### `configurate(config: any)`

Update configuration after initialization.

```javascript
polydraw.configurate({
  polygonOptions: { color: "#ff0000" },
});
```
